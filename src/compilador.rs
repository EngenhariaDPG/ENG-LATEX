//! Compilação dos projetos LaTeX.
//!
//! Três formas de compilar (escolhidas em Configurações):
//! - **tectonic**: compilador embutido (tectonic.exe ao lado do EngLaTeX.exe).
//!   Baixa sozinho os pacotes que faltam na primeira vez e guarda em cache,
//!   depois funciona offline. Sempre usa o motor XeLaTeX.
//! - **latexmk**: usa o latexmk do MiKTeX/TeX Live (roda bibtex/biber e repete
//!   as passadas sozinho, igual ao Overleaf). No MiKTeX exige o Perl instalado.
//! - **direto**: chama pdflatex/xelatex/lualatex diretamente, roda bibtex ou
//!   biber se necessário e repete até as referências estabilizarem.
//! - **auto**: latexmk se existir (com Perl), senão direto se o motor existir,
//!   senão tectonic.
//!
//! Depois de compilar, o log é lido e convertido numa lista de erros/avisos
//! com arquivo e linha, para a interface mostrar e permitir clicar.

use crate::projetos::{self, PASTA_SAIDA};
use crate::{janela, EstadoRef};
use regex::Regex;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::OnceLock;
use std::time::{Duration, Instant};

/// Tempo máximo de cada execução do compilador (evita travar em loop infinito).
const TEMPO_LIMITE: Duration = Duration::from_secs(180);

/// Um problema encontrado no log (erro, aviso ou caixa cheia/vazia).
#[derive(Serialize, Clone, PartialEq)]
pub struct Problema {
    /// "erro", "aviso" ou "caixa" (Overfull/Underfull).
    pub tipo: String,
    /// Arquivo relativo ao projeto (pode estar vazio se não for possível descobrir).
    pub arquivo: String,
    /// Linha no arquivo (se conhecida).
    pub linha: Option<u32>,
    /// Mensagem principal.
    pub mensagem: String,
    /// Trecho do log ao redor do problema (para dar contexto).
    pub contexto: String,
}

/// Resposta da compilação para a interface.
#[derive(Serialize)]
pub struct ResultadoCompilacao {
    /// Se gerou um PDF (pode ter gerado mesmo com erros, como no Overleaf).
    pub pdf: bool,
    /// Nome do PDF dentro da pasta de saída.
    pub arquivo_pdf: String,
    /// Log completo (do LaTeX + saída do compilador).
    pub log: String,
    pub problemas: Vec<Problema>,
    /// Tempo gasto, em milissegundos.
    pub duracao_ms: u128,
    /// Descrição do compilador usado (ex.: "Tectonic (XeLaTeX)").
    pub compilador: String,
    /// Mensagem de erro geral (compilador não encontrado, tempo esgotado...).
    pub falha: Option<String>,
}

/// Informações sobre os compiladores disponíveis (mostradas em Configurações).
#[derive(Serialize)]
pub struct Disponiveis {
    pub tectonic: Option<String>,
    pub latexmk: Option<String>,
    pub perl: Option<String>,
    pub pdflatex: Option<String>,
    pub xelatex: Option<String>,
    pub lualatex: Option<String>,
    pub bibtex: Option<String>,
    pub biber: Option<String>,
    pub cache_tectonic: String,
}

// ---------------------------------------------------------------------------
// Localização dos executáveis
// ---------------------------------------------------------------------------

/// Pastas onde MiKTeX e TeX Live costumam ser instalados no Windows.
fn pastas_tex_conhecidas(pasta_extra: &str) -> Vec<PathBuf> {
    let mut v = Vec::new();
    if !pasta_extra.trim().is_empty() {
        v.push(PathBuf::from(pasta_extra.trim()));
    }
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        v.push(PathBuf::from(&local).join(r"Programs\MiKTeX\miktex\bin\x64"));
    }
    for var in ["ProgramFiles", "ProgramFiles(x86)"] {
        if let Ok(pf) = std::env::var(var) {
            v.push(PathBuf::from(&pf).join(r"MiKTeX\miktex\bin\x64"));
            v.push(PathBuf::from(&pf).join(r"MiKTeX\miktex\bin"));
        }
    }
    // TeX Live: C:\texlive\2026\bin\windows (ano mais recente primeiro).
    if let Ok(rd) = std::fs::read_dir(r"C:\texlive") {
        let mut anos: Vec<PathBuf> = rd.flatten().map(|e| e.path()).collect();
        anos.sort();
        anos.reverse();
        for a in anos {
            v.push(a.join(r"bin\windows"));
            v.push(a.join(r"bin\win64"));
            v.push(a.join(r"bin\win32"));
        }
    }
    // Perl do Strawberry (necessário para o latexmk no MiKTeX).
    v.push(PathBuf::from(r"C:\Strawberry\perl\bin"));
    v
}

/// Procura um executável: primeiro nas pastas indicadas, depois no PATH.
fn localizar(nome: &str, extras: &[PathBuf]) -> Option<PathBuf> {
    let arquivo = if cfg!(windows) { format!("{nome}.exe") } else { nome.to_string() };
    let mut pastas: Vec<PathBuf> = extras.to_vec();
    if let Some(path) = std::env::var_os("PATH") {
        pastas.extend(std::env::split_paths(&path));
    }
    pastas.into_iter().map(|p| p.join(&arquivo)).find(|c| c.is_file())
}

/// Caminho do tectonic: o da variável ENGLATEX_TECTONIC (app Android, onde o
/// tectonic fica na pasta de bibliotecas do app), ao lado do .exe ou no PATH.
fn localizar_tectonic(estado: &EstadoRef) -> Option<PathBuf> {
    if let Some(p) = std::env::var_os("ENGLATEX_TECTONIC").map(PathBuf::from) {
        if p.is_file() {
            return Some(p);
        }
    }
    localizar("tectonic", &[estado.pasta_app.clone(), estado.pasta_app.join("tectonic")])
}

/// Pasta de cache do Tectonic. Se existir a pasta `tectonic-cache` ao lado do
/// .exe (já com os pacotes mais usados), usamos ela, para funcionar offline
/// desde a primeira vez. Se ela não puder ser gravada (ex.: Arquivos de
/// Programas), usamos uma pasta dentro de Documentos\EngLaTeX.
pub fn pasta_cache_tectonic(estado: &EstadoRef) -> PathBuf {
    let ao_lado = estado.pasta_app.join("tectonic-cache");
    if ao_lado.is_dir() {
        let teste = ao_lado.join(".teste-gravacao");
        if std::fs::write(&teste, b"ok").is_ok() {
            let _ = std::fs::remove_file(teste);
            return ao_lado;
        }
        // Não dá para gravar ao lado do .exe: copia o cache para a pasta de dados (uma vez só).
        let destino = estado.pasta_dados.join("tectonic-cache");
        if !destino.exists() {
            let _ = copiar_recursivo(&ao_lado, &destino);
        }
        return destino;
    }
    estado.pasta_dados.join("tectonic-cache")
}

fn copiar_recursivo(de: &Path, para: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(para)?;
    for e in std::fs::read_dir(de)?.flatten() {
        let p = e.path();
        if p.is_dir() {
            copiar_recursivo(&p, &para.join(e.file_name()))?;
        } else {
            std::fs::copy(&p, para.join(e.file_name()))?;
        }
    }
    Ok(())
}

pub async fn disponiveis(estado: &EstadoRef) -> Disponiveis {
    let pasta_extra = estado.config.lock().await.pasta_tex.clone();
    let extras = pastas_tex_conhecidas(&pasta_extra);
    let s = |p: Option<PathBuf>| p.map(|p| p.display().to_string());
    Disponiveis {
        tectonic: s(localizar_tectonic(estado)),
        latexmk: s(localizar("latexmk", &extras)),
        perl: s(localizar("perl", &extras)),
        pdflatex: s(localizar("pdflatex", &extras)),
        xelatex: s(localizar("xelatex", &extras)),
        lualatex: s(localizar("lualatex", &extras)),
        bibtex: s(localizar("bibtex", &extras)),
        biber: s(localizar("biber", &extras)),
        cache_tectonic: pasta_cache_tectonic(estado).display().to_string(),
    }
}

// ---------------------------------------------------------------------------
// Execução de processos
// ---------------------------------------------------------------------------

/// Saída de uma execução de processo.
struct Execucao {
    sucesso: bool,
    saida: String,
}

/// Executa um programa com tempo limite, sem abrir janela de console no Windows.
async fn executar(
    programa: &Path,
    args: &[String],
    pasta: &Path,
    env: &[(String, String)],
) -> Result<Execucao, String> {
    let mut cmd = tokio::process::Command::new(programa);
    cmd.args(args)
        .current_dir(pasta)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    for (k, v) in env {
        cmd.env(k, v);
    }
    // MiKTeX: instala pacotes faltantes sem perguntar (se tiver internet).
    cmd.env("MIKTEX_INSTALL_ON_THE_FLY", "1");
    #[cfg(windows)]
    {
        // CREATE_NO_WINDOW: impede que apareça uma janela preta a cada compilação.
        cmd.creation_flags(0x0800_0000);
    }
    let filho = cmd
        .spawn()
        .map_err(|e| format!("Não foi possível executar {}: {e}", programa.display()))?;
    match tokio::time::timeout(TEMPO_LIMITE, filho.wait_with_output()).await {
        Ok(Ok(out)) => {
            let mut saida = String::from_utf8_lossy(&out.stdout).to_string();
            let erro = String::from_utf8_lossy(&out.stderr);
            if !erro.trim().is_empty() {
                saida.push('\n');
                saida.push_str(&erro);
            }
            Ok(Execucao { sucesso: out.status.success(), saida })
        }
        Ok(Err(e)) => Err(e.to_string()),
        Err(_) => Err(format!(
            "A compilação passou de {} segundos e foi interrompida. Verifique se há um laço infinito no documento.",
            TEMPO_LIMITE.as_secs()
        )),
    }
}

/// Cria dentro de `.saida` as mesmas subpastas do projeto. Sem isso, o LaTeX
/// falha ao usar `\include{capitulos/cap1}` com pasta de saída separada.
fn espelhar_pastas(raiz: &Path, saida: &Path) {
    for item in projetos::listar_arvore(raiz) {
        if item.pasta {
            let _ = std::fs::create_dir_all(saida.join(&item.caminho));
        }
    }
}

// ---------------------------------------------------------------------------
// Compilação
// ---------------------------------------------------------------------------

/// Compila o projeto `id`. Garante que o mesmo projeto não compile duas vezes ao mesmo tempo.
pub async fn compilar(estado: &EstadoRef, id: &str) -> Result<ResultadoCompilacao, String> {
    {
        let mut em_andamento = estado.compilando.lock().await;
        if !em_andamento.insert(id.to_string()) {
            return Err("Este projeto já está compilando.".into());
        }
    }
    let r = compilar_interno(estado, id).await;
    estado.compilando.lock().await.remove(id);
    r
}

async fn compilar_interno(estado: &EstadoRef, id: &str) -> Result<ResultadoCompilacao, String> {
    let inicio = Instant::now();
    let raiz = projetos::pasta_projeto(estado, id)?;
    let principal = projetos::arquivo_principal(&raiz)
        .ok_or("O projeto não tem nenhum arquivo .tex para compilar.")?;
    let cfg_proj = projetos::ler_config(&raiz);
    let cfg = estado.config.lock().await.clone();
    // Atualiza o variaveis.tex com os valores atuais da tabela de variáveis.
    projetos::gerar_variaveis(&raiz)?;

    // Configuração do projeto tem prioridade sobre a global.
    let escolha = if cfg_proj.compilador.is_empty() { cfg.compilador_padrao.clone() } else { cfg_proj.compilador.clone() };
    let motor = if cfg_proj.motor.is_empty() { cfg.motor_padrao.clone() } else { cfg_proj.motor.clone() };
    let motor = match motor.as_str() {
        "xelatex" | "lualatex" => motor,
        _ => "pdflatex".to_string(),
    };

    let saida = raiz.join(PASTA_SAIDA);
    std::fs::create_dir_all(&saida).map_err(|e| e.to_string())?;
    espelhar_pastas(&raiz, &saida);

    // Nome base do PDF: "capitulos/tese.tex" -> "tese".
    let base = Path::new(&principal)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "main".into());
    let pdf = saida.join(format!("{base}.pdf"));
    let log_tex = saida.join(format!("{base}.log"));

    // Guarda a data do PDF antigo para saber se um PDF novo foi gerado.
    let data_pdf_antigo = std::fs::metadata(&pdf).and_then(|m| m.modified()).ok();

    let extras = pastas_tex_conhecidas(&cfg.pasta_tex);
    let tectonic = localizar_tectonic(estado);
    let latexmk = localizar("latexmk", &extras);
    let perl = localizar("perl", &extras);
    let exe_motor = localizar(&motor, &extras);

    // Decide qual compilador usar.
    let modo = match escolha.as_str() {
        "tectonic" | "latexmk" | "direto" => escolha.clone(),
        _ => {
            if latexmk.is_some() && (perl.is_some() || !cfg!(windows)) && exe_motor.is_some() {
                "latexmk".into()
            } else if exe_motor.is_some() {
                "direto".into()
            } else {
                "tectonic".into()
            }
        }
    };

    let mut log_compilador = String::new();
    let mut falha: Option<String> = None;
    let descricao: String;

    // Variável de ambiente para o LaTeX achar arquivos (imagens, .bib, .sty)
    // na pasta do projeto mesmo quando o .tex principal está numa subpasta.
    let sep = if cfg!(windows) { ";" } else { ":" };
    let raiz_str = raiz.display().to_string();
    let env_busca: Vec<(String, String)> = ["TEXINPUTS", "BIBINPUTS", "BSTINPUTS"]
        .iter()
        .map(|v| (v.to_string(), format!(".{sep}{raiz_str}//{sep}")))
        .collect();

    match modo.as_str() {
        // ------------------------------------------------------------------
        "tectonic" => {
            descricao = "Tectonic (XeLaTeX)".into();
            let Some(exe) = tectonic else {
                return Ok(sem_compilador(inicio, "Nenhum compilador encontrado. Coloque o tectonic.exe na mesma pasta do EngLaTeX.exe ou instale o MiKTeX."));
            };
            let cache = pasta_cache_tectonic(estado);
            let env = vec![("TECTONIC_CACHE_DIR".to_string(), cache.display().to_string())];
            let mut args: Vec<String> = vec![
                principal.clone(),
                "--outdir".into(), PASTA_SAIDA.into(),
                "--keep-logs".into(),
                "--keep-intermediates".into(),
                "--synctex".into(),
            ];
            match executar(&exe, &args, &raiz, &env).await {
                Ok(ex) => {
                    log_compilador = ex.saida.clone();
                    // Sem internet: tenta de novo usando só os pacotes já guardados no cache.
                    if !ex.sucesso && parece_sem_internet(&ex.saida) {
                        args.push("--only-cached".into());
                        if let Ok(ex2) = executar(&exe, &args, &raiz, &env).await {
                            log_compilador = format!(
                                "(Sem internet: compilando apenas com os pacotes do cache)\n{}",
                                ex2.saida
                            );
                        }
                    }
                }
                Err(e) => falha = Some(e),
            }
        }
        // ------------------------------------------------------------------
        "latexmk" => {
            descricao = format!("latexmk ({motor})");
            let Some(exe) = latexmk else {
                return Ok(sem_compilador(inicio, "latexmk não encontrado. Instale o MiKTeX ou o TeX Live, ou escolha o Tectonic em Configurações."));
            };
            let flag_motor = match motor.as_str() {
                "xelatex" => "-xelatex",
                "lualatex" => "-lualatex",
                _ => "-pdf",
            };
            let args: Vec<String> = vec![
                flag_motor.into(),
                "-f".into(), // continua mesmo com erros (gera o PDF possível, como o Overleaf)
                "-g".into(), // força ao menos uma passada
                "-interaction=nonstopmode".into(),
                "-file-line-error".into(),
                "-synctex=1".into(),
                format!("-outdir={PASTA_SAIDA}"),
                principal.clone(),
            ];
            match executar(&exe, &args, &raiz, &env_busca).await {
                Ok(ex) => log_compilador = ex.saida,
                Err(e) => falha = Some(e),
            }
        }
        // ------------------------------------------------------------------
        _ => {
            descricao = format!("{motor} (direto)");
            let Some(exe) = exe_motor else {
                return Ok(sem_compilador(inicio, &format!("{motor} não encontrado. Instale o MiKTeX ou o TeX Live, ou escolha o Tectonic em Configurações.")));
            };
            let args: Vec<String> = vec![
                "-interaction=nonstopmode".into(),
                "-file-line-error".into(),
                "-synctex=1".into(),
                format!("-output-directory={PASTA_SAIDA}"),
                principal.clone(),
            ];
            // Até 4 passadas: 1ª gera o .aux; bibliografia; mais passadas para referências.
            let mut bib_feita = false;
            for passada in 1..=4 {
                match executar(&exe, &args, &raiz, &env_busca).await {
                    Ok(ex) => log_compilador = ex.saida,
                    Err(e) => {
                        falha = Some(e);
                        break;
                    }
                }
                let log = ler_texto(&log_tex);
                // Erro fatal: não adianta repetir.
                if log.contains("Fatal error") || log.contains("Emergency stop") {
                    break;
                }
                // Bibliografia (uma vez, depois da 1ª passada).
                if passada == 1 && !bib_feita {
                    bib_feita = true;
                    let rel_base = Path::new(&principal).with_extension("");
                    let bcf = saida.join(rel_base.with_extension("bcf"));
                    let aux = saida.join(rel_base.with_extension("aux"));
                    if bcf.is_file() {
                        if let Some(biber) = localizar("biber", &extras) {
                            let a = vec![
                                format!("--input-directory={PASTA_SAIDA}"),
                                format!("--output-directory={PASTA_SAIDA}"),
                                rel_base.display().to_string(),
                            ];
                            if let Ok(ex) = executar(&biber, &a, &raiz, &env_busca).await {
                                log_compilador.push_str(&format!("\n--- biber ---\n{}", ex.saida));
                            }
                        }
                        continue;
                    } else if ler_texto(&aux).contains("\\bibdata") {
                        if let Some(bibtex) = localizar("bibtex", &extras) {
                            // O bibtex roda dentro de .saida; BIBINPUTS aponta para o projeto.
                            let a = vec![rel_base.display().to_string()];
                            if let Ok(ex) = executar(&bibtex, &a, &saida, &env_busca).await {
                                log_compilador.push_str(&format!("\n--- bibtex ---\n{}", ex.saida));
                            }
                        }
                        continue;
                    }
                }
                let pede_rerun = log.contains("Rerun to get")
                    || log.contains("Label(s) may have changed")
                    || log.contains("Please rerun")
                    || log.contains("Rerun LaTeX");
                if !pede_rerun {
                    break;
                }
            }
        }
    }

    // ----------------------------------------------------------------------
    // Resultado
    // ----------------------------------------------------------------------
    let log_latex = ler_texto(&log_tex);
    let mut problemas = analisar_log(&log_latex, &principal);
    // Erros que só aparecem na saída do compilador (ex.: Tectonic, pacote não encontrado).
    // No latexmk/direto a saída repete o texto de TODAS as passadas (inclusive avisos
    // já resolvidos nas passadas seguintes), então só a usamos se não houver log do LaTeX.
    if modo == "tectonic" || log_latex.is_empty() {
        let sem_ponto = |s: &str| s.trim().trim_end_matches('.').to_string();
        for p in analisar_log(&log_compilador, &principal) {
            if !problemas.iter().any(|q| sem_ponto(&q.mensagem) == sem_ponto(&p.mensagem) && q.linha == p.linha) {
                problemas.push(p);
            }
        }
    }
    // Erros primeiro, depois avisos, depois caixas.
    problemas.sort_by_key(|p| match p.tipo.as_str() { "erro" => 0, "aviso" => 1, _ => 2 });

    let data_pdf_novo = std::fs::metadata(&pdf).and_then(|m| m.modified()).ok();
    let pdf_gerado = data_pdf_novo.is_some() && data_pdf_novo != data_pdf_antigo;
    let tem_pdf = data_pdf_novo.is_some();

    if !pdf_gerado && falha.is_none() && !problemas.iter().any(|p| p.tipo == "erro") {
        // Não gerou PDF e não achamos o motivo no log: mostra a saída bruta como erro.
        problemas.insert(0, Problema {
            tipo: "erro".into(),
            arquivo: String::new(),
            linha: None,
            mensagem: "A compilação não gerou um PDF novo. Veja o log completo.".into(),
            contexto: ultimas_linhas(&log_compilador, 15),
        });
    }

    let log = if log_latex.is_empty() {
        log_compilador.clone()
    } else {
        format!("{log_latex}\n\n===== Saída do compilador =====\n{log_compilador}")
    };

    // Guarda uma versão automática no histórico (no máximo uma a cada 5 minutos).
    if tem_pdf {
        crate::historico::automatica_ao_compilar(&raiz);
    }

    janela::registrar(&format!(
        "Compilado \"{id}\" com {descricao} em {} ms, {} problema(s)",
        inicio.elapsed().as_millis(),
        problemas.len()
    ));

    Ok(ResultadoCompilacao {
        pdf: tem_pdf,
        arquivo_pdf: format!("{base}.pdf"),
        log,
        problemas,
        duracao_ms: inicio.elapsed().as_millis(),
        compilador: descricao,
        falha,
    })
}

/// Resposta padrão quando nenhum compilador foi encontrado.
fn sem_compilador(inicio: Instant, msg: &str) -> ResultadoCompilacao {
    ResultadoCompilacao {
        pdf: false,
        arquivo_pdf: String::new(),
        log: msg.into(),
        problemas: vec![Problema {
            tipo: "erro".into(),
            arquivo: String::new(),
            linha: None,
            mensagem: msg.into(),
            contexto: String::new(),
        }],
        duracao_ms: inicio.elapsed().as_millis(),
        compilador: "nenhum".into(),
        falha: Some(msg.into()),
    }
}

/// Lê um arquivo de texto aceitando qualquer codificação (o log do LaTeX nem sempre é UTF-8).
fn ler_texto(p: &Path) -> String {
    std::fs::read(p).map(|b| String::from_utf8_lossy(&b).to_string()).unwrap_or_default()
}

fn ultimas_linhas(t: &str, n: usize) -> String {
    let linhas: Vec<&str> = t.lines().collect();
    linhas[linhas.len().saturating_sub(n)..].join("\n")
}

/// Detecta mensagens do Tectonic indicando falta de conexão com a internet.
fn parece_sem_internet(saida: &str) -> bool {
    let s = saida.to_lowercase();
    ["error sending request", "dns error", "failed to lookup", "connection refused",
     "tcp connect error", "network", "could not resolve", "timed out", "failed to open bundle",
     "error trying to connect"]
        .iter()
        .any(|k| s.contains(k))
}

// ---------------------------------------------------------------------------
// Leitura do log
// ---------------------------------------------------------------------------

/// Expressões regulares compiladas uma única vez.
struct Padroes {
    /// `./main.tex:12: Undefined control sequence.` (com -file-line-error)
    arquivo_linha: Regex,
    /// `l.12 \comando`
    linha_l: Regex,
    /// `... on input line 23.`
    input_line: Regex,
    /// `Overfull \hbox (12.3pt too wide) in paragraph at lines 10--12`
    caixa: Regex,
}

fn padroes() -> &'static Padroes {
    static P: OnceLock<Padroes> = OnceLock::new();
    P.get_or_init(|| Padroes {
        arquivo_linha: Regex::new(
            r"^(?:error: |warning: )?(?:\./)?((?:[A-Za-z]:)?[^:\n]*?\.(?:tex|sty|cls|bib|ltx|def|cfg|clo|bbl|dtx)):(\d+): (.*)$",
        ).unwrap(),
        linha_l: Regex::new(r"^l\.(\d+)").unwrap(),
        input_line: Regex::new(r"(?i)on input line (\d+)").unwrap(),
        caixa: Regex::new(r"^((?:Over|Under)full \\[hv]box.*?)(?: (?:in paragraph|in alignment|detected) at lines? (\d+)(?:--\d+)?)?$").unwrap(),
    })
}

/// Normaliza o nome de arquivo do log para o caminho relativo do projeto.
fn normalizar_arquivo(arq: &str) -> String {
    let a = arq.replace('\\', "/");
    let a = a.trim_start_matches("./");
    // Caminhos absolutos dentro do projeto: mantém só a parte relativa, se possível.
    if let Some(pos) = a.find("/Projetos/") {
        let resto = &a[pos + "/Projetos/".len()..];
        if let Some(barra) = resto.find('/') {
            return resto[barra + 1..].to_string();
        }
    }
    a.to_string()
}

/// Converte o texto do log em uma lista de problemas.
pub fn analisar_log(log: &str, principal: &str) -> Vec<Problema> {
    let p = padroes();
    let linhas: Vec<&str> = log.lines().collect();
    let mut problemas: Vec<Problema> = Vec::new();
    let mut i = 0;

    // Junta linhas seguintes até uma linha vazia (mensagens longas são quebradas em várias linhas).
    let juntar = |inicio: usize, max: usize| -> (String, usize) {
        let mut txt = String::new();
        let mut j = inicio;
        while j < linhas.len() && j < inicio + max {
            let l = linhas[j].trim_end();
            if l.is_empty() && j > inicio {
                break;
            }
            if !txt.is_empty() {
                txt.push(' ');
            }
            txt.push_str(l.trim_start());
            j += 1;
        }
        (txt, j)
    };

    while i < linhas.len() {
        let linha = linhas[i];

        // 1) Formato arquivo:linha:mensagem
        if let Some(c) = p.arquivo_linha.captures(linha) {
            let eh_aviso = linha.starts_with("warning:");
            let mut msg = c[3].trim().to_string();
            // O pdfTeX quebra as linhas do log em 79 caracteres: junta as continuações.
            let mut fim = i;
            while linhas[fim].chars().count() >= 79 && fim + 1 < linhas.len() {
                fim += 1;
                msg.push_str(linhas[fim].trim_end());
            }
            if msg.trim().is_empty() {
                i = fim + 1;
                continue; // linha sem mensagem (acontece em avisos do Tectonic)
            }
            // Contexto: as próximas linhas até "l.N" (mostram onde o erro aconteceu).
            let mut ctx = Vec::new();
            for l in linhas.iter().skip(fim + 1).take(6) {
                ctx.push(*l);
                if p.linha_l.is_match(l) {
                    break;
                }
            }
            problemas.push(Problema {
                tipo: if eh_aviso { "aviso" } else { "erro" }.into(),
                arquivo: normalizar_arquivo(&c[1]),
                linha: c[2].parse().ok(),
                mensagem: msg,
                contexto: ctx.join("\n"),
            });
            i = fim + 1;
            continue;
        }

        // 2) Formato clássico "! Mensagem" seguido de "l.N"
        if let Some(msg) = linha.strip_prefix("! ") {
            let mut num = None;
            let mut ctx = Vec::new();
            for l in linhas.iter().skip(i + 1).take(12) {
                ctx.push(*l);
                if let Some(c) = p.linha_l.captures(l) {
                    num = c[1].parse().ok();
                    break;
                }
            }
            let (msg_completa, _) = juntar(i, 3);
            let msg_final = if msg_completa.len() > msg.len() && !msg.ends_with('.') {
                msg_completa.trim_start_matches("! ").to_string()
            } else {
                msg.to_string()
            };
            // Evita duplicar o mesmo erro já capturado no formato arquivo:linha.
            if !problemas.iter().any(|q| q.tipo == "erro" && q.linha == num && msg_final.starts_with(q.mensagem.trim_end_matches('.'))) {
                problemas.push(Problema {
                    tipo: "erro".into(),
                    arquivo: principal.into(),
                    linha: num,
                    mensagem: msg_final,
                    contexto: ctx.join("\n"),
                });
            }
            i += 1;
            continue;
        }

        // 3) Avisos do LaTeX e de pacotes
        if linha.contains("LaTeX Warning:") || linha.contains("Package") && linha.contains("Warning:")
            || linha.starts_with("Class") && linha.contains("Warning:")
        {
            // Junta as linhas da mensagem até a linha vazia. As linhas de continuação
            // dos pacotes começam com "(nomedopacote)" + espaços: esse prefixo é removido.
            let mut txt = linha.trim_end().to_string();
            let mut fim = i + 1;
            while fim < linhas.len() && fim < i + 8 && !linhas[fim].trim().is_empty() {
                let cont = linhas[fim].trim();
                let cont = match (cont.starts_with('('), cont.find(')')) {
                    (true, Some(f)) if cont[1..f].chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_')
                        && cont[f + 1..].starts_with("  ") => cont[f + 1..].trim(),
                    _ => cont,
                };
                // Linha quebrada em 79 colunas: continua a palavra sem espaço.
                if linhas[fim - 1].chars().count() < 79 {
                    txt.push(' ');
                }
                txt.push_str(cont);
                fim += 1;
            }
            let msg = txt.splitn(2, "Warning:").nth(1).unwrap_or(&txt).trim().to_string();
            let origem = txt.split("Warning:").next().unwrap_or("").trim().to_string();
            let num = p.input_line.captures(&msg).and_then(|c| c[1].parse().ok());
            let prefixo = if origem.starts_with("Package") || origem.starts_with("Class") {
                format!("[{}] ", origem.replace("Package ", "").replace("Class ", ""))
            } else {
                String::new()
            };
            problemas.push(Problema {
                tipo: "aviso".into(),
                arquivo: principal.into(),
                linha: num,
                mensagem: format!("{prefixo}{msg}"),
                contexto: String::new(),
            });
            i = fim.max(i + 1);
            continue;
        }

        // 4) Caixas Overfull/Underfull
        if let Some(c) = p.caixa.captures(linha) {
            problemas.push(Problema {
                tipo: "caixa".into(),
                arquivo: principal.into(),
                linha: c.get(2).and_then(|m| m.as_str().parse().ok()),
                mensagem: c[1].to_string(),
                contexto: linhas.get(i + 1).unwrap_or(&"").to_string(),
            });
        }
        i += 1;
    }

    // Remove duplicados exatos (o LaTeX repete alguns avisos a cada passada).
    let mut unicos: Vec<Problema> = Vec::new();
    for pr in problemas {
        if !unicos.iter().any(|u| u.tipo == pr.tipo && u.linha == pr.linha && u.mensagem == pr.mensagem) {
            unicos.push(pr);
        }
    }
    unicos
}

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn le_erro_com_arquivo_e_linha() {
        let log = "./main.tex:12: Undefined control sequence.\nl.12 \\foo\n";
        let p = analisar_log(log, "main.tex");
        assert_eq!(p.len(), 1);
        assert_eq!(p[0].tipo, "erro");
        assert_eq!(p[0].arquivo, "main.tex");
        assert_eq!(p[0].linha, Some(12));
    }

    #[test]
    fn le_erro_classico_e_aviso() {
        let log = "! Undefined control sequence.\nl.7 \\foo\n\nLaTeX Warning: Reference `x' on page 1 undefined on input line 9.\n\n";
        let p = analisar_log(log, "main.tex");
        assert_eq!(p.len(), 2);
        assert_eq!(p[0].linha, Some(7));
        assert_eq!(p[1].tipo, "aviso");
        assert_eq!(p[1].linha, Some(9));
    }

    #[test]
    fn le_caixa() {
        let log = "Overfull \\hbox (15.0pt too wide) in paragraph at lines 20--22\n";
        let p = analisar_log(log, "main.tex");
        assert_eq!(p[0].tipo, "caixa");
        assert_eq!(p[0].linha, Some(20));
    }
}
