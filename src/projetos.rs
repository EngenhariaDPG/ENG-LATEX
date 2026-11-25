//! Projetos e arquivos.
//!
//! Cada projeto é simplesmente uma pasta dentro de `Documentos\EngLaTeX\Projetos`.
//! O nome da pasta é o nome do projeto. Assim você pode abrir, copiar ou fazer
//! backup dos projetos pelo Explorer normalmente, sem depender do programa.
//!
//! Dentro de cada projeto:
//! - `.englatex.json`  configurações do projeto (arquivo principal, compilador)
//! - `.saida\`         arquivos gerados na compilação (PDF, log, aux...)
//!
//! Itens que começam com ponto ficam ocultos na árvore de arquivos.

use crate::{documentacao, modelos, EstadoRef};
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};
use std::time::UNIX_EPOCH;

/// Nome da pasta de saída da compilação (dentro de cada projeto).
pub const PASTA_SAIDA: &str = ".saida";
/// Nome do arquivo de configurações do projeto.
pub const ARQUIVO_CONFIG: &str = ".englatex.json";

/// Erro simples com mensagem em português, que vai direto para a interface.
pub type Resultado<T> = Result<T, String>;

/// Configurações de um projeto.
#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct ConfigProjeto {
    /// Arquivo .tex principal (o que tem `\documentclass`). Vazio = detectar.
    pub arquivo_principal: String,
    /// Compilador deste projeto. Vazio = usar o padrão global.
    pub compilador: String,
    /// Motor TeX deste projeto. Vazio = usar o padrão global.
    pub motor: String,
    /// Idioma do corretor ortográfico deste projeto (ex.: "pt_BR"). Vazio = padrão global.
    pub idioma: String,
    /// Idiomas aceitos além do principal em todo o documento (ex.: ["en_US"]):
    /// uma palavra é aceita se existir em qualquer um deles.
    pub idiomas_extras: Vec<String>,
    /// Variáveis do documento (tabela "Variáveis"), usadas no texto como \var{nome}.
    pub variaveis: Vec<Variavel>,
}

/// Uma variável do documento.
#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Variavel {
    /// Nome usado no texto: \var{nome}. Só letras sem acento, números, "_" e "-".
    pub nome: String,
    /// Valor que será impresso no PDF.
    pub valor: String,
    /// Descrição para quem for preencher a tabela.
    pub descricao: String,
    /// "texto" (caracteres especiais como & % $ são tratados automaticamente)
    /// ou "latex" (o valor é usado como código LaTeX, ex.: $\sigma$).
    pub tipo: String,
}

/// Resumo de um projeto para a lista da tela inicial.
#[derive(Serialize)]
pub struct InfoProjeto {
    pub id: String,
    pub nome: String,
    /// Última modificação (segundos desde 1970).
    pub modificado: u64,
    /// Já existe um PDF compilado?
    pub tem_pdf: bool,
}

/// Item da árvore de arquivos.
#[derive(Serialize)]
pub struct ItemArvore {
    /// Caminho relativo à raiz do projeto, sempre com `/`.
    pub caminho: String,
    pub pasta: bool,
    pub tamanho: u64,
}

// ---------------------------------------------------------------------------
// Segurança de caminhos
// ---------------------------------------------------------------------------

/// Limpa um nome de projeto para poder ser usado como nome de pasta no Windows.
pub fn limpar_nome(nome: &str) -> String {
    let proibidos = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    let limpo: String = nome
        .chars()
        .map(|c| if proibidos.contains(&c) || c.is_control() { '-' } else { c })
        .collect();
    // O Windows não aceita nomes terminando em ponto ou espaço.
    let limpo = limpo.trim().trim_end_matches('.').trim().to_string();
    if limpo.is_empty() || limpo.starts_with('.') {
        "Projeto sem nome".into()
    } else {
        limpo.chars().take(100).collect()
    }
}

/// Valida um caminho relativo vindo da interface (impede `..`, caminhos absolutos etc.).
/// Retorna o caminho relativo normalizado.
pub fn validar_relativo(rel: &str) -> Resultado<PathBuf> {
    let rel = rel.replace('\\', "/");
    let rel = rel.trim_matches('/');
    if rel.is_empty() {
        return Ok(PathBuf::new());
    }
    let mut saida = PathBuf::new();
    for comp in Path::new(rel).components() {
        match comp {
            Component::Normal(p) => {
                let s = p.to_string_lossy();
                if s.contains(':') {
                    return Err("Caminho inválido.".into());
                }
                saida.push(p)
            }
            Component::CurDir => {}
            _ => return Err("Caminho inválido.".into()),
        }
    }
    Ok(saida)
}

/// Pasta de um projeto, conferindo que o id é válido e que a pasta existe.
///
/// Ids no formato `doc:<documento>:<revisão>` são revisões da aba
/// "Documentação técnica" e ficam em `Documentos\EngLaTeX\Documentacao`
/// (veja o módulo `documentacao`). Todo o resto do programa trata essas
/// revisões como projetos comuns.
pub fn pasta_projeto(estado: &EstadoRef, id: &str) -> Resultado<PathBuf> {
    if let Some((documento, versao)) = documentacao::separar_id(id) {
        return documentacao::pasta_versao(estado, documento, versao);
    }
    if id.is_empty() || id != limpar_nome(id) {
        return Err("Projeto inválido.".into());
    }
    let p = estado.pasta_projetos.join(id);
    if p.is_dir() {
        Ok(p)
    } else {
        Err(format!("O projeto \"{id}\" não existe mais."))
    }
}

/// Caminho absoluto de um arquivo dentro de um projeto.
pub fn caminho_arquivo(estado: &EstadoRef, id: &str, rel: &str) -> Resultado<PathBuf> {
    Ok(pasta_projeto(estado, id)?.join(validar_relativo(rel)?))
}

// ---------------------------------------------------------------------------
// Configuração do projeto
// ---------------------------------------------------------------------------

pub fn ler_config(pasta: &Path) -> ConfigProjeto {
    std::fs::read_to_string(pasta.join(ARQUIVO_CONFIG))
        .ok()
        .and_then(|t| serde_json::from_str(&t).ok())
        .unwrap_or_default()
}

pub fn gravar_config(pasta: &Path, cfg: &ConfigProjeto) -> Resultado<()> {
    let txt = serde_json::to_string_pretty(cfg).unwrap_or_default();
    std::fs::write(pasta.join(ARQUIVO_CONFIG), txt).map_err(|e| e.to_string())
}

/// Descobre o arquivo principal: o configurado, senão `main.tex`, senão o
/// primeiro .tex que tiver `\documentclass`.
pub fn arquivo_principal(pasta: &Path) -> Option<String> {
    let cfg = ler_config(pasta);
    if !cfg.arquivo_principal.is_empty() && pasta.join(&cfg.arquivo_principal).is_file() {
        return Some(cfg.arquivo_principal);
    }
    if pasta.join("main.tex").is_file() {
        return Some("main.tex".into());
    }
    let mut candidatos: Vec<String> = listar_arvore(pasta)
        .into_iter()
        .filter(|i| !i.pasta && i.caminho.to_lowercase().ends_with(".tex"))
        .map(|i| i.caminho)
        .collect();
    // Prefere arquivos na raiz (menos barras no caminho).
    candidatos.sort_by_key(|c| (c.matches('/').count(), c.clone()));
    candidatos
        .iter()
        .find(|c| {
            std::fs::read(pasta.join(c))
                .map(|b| String::from_utf8_lossy(&b).contains("\\documentclass"))
                .unwrap_or(false)
        })
        .or(candidatos.first())
        .cloned()
}

// ---------------------------------------------------------------------------
// Listagem
// ---------------------------------------------------------------------------

fn segundos(t: std::io::Result<std::time::SystemTime>) -> u64 {
    t.ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Lista os projetos, do mais recente para o mais antigo.
pub fn listar_projetos(estado: &EstadoRef) -> Vec<InfoProjeto> {
    let mut lista = Vec::new();
    let Ok(entradas) = std::fs::read_dir(&estado.pasta_projetos) else {
        return lista;
    };
    for e in entradas.flatten() {
        let p = e.path();
        if !p.is_dir() {
            continue;
        }
        let nome = e.file_name().to_string_lossy().to_string();
        if nome.starts_with('.') {
            continue;
        }
        // Data de modificação = arquivo mais recente do projeto (fora a pasta de saída).
        let mut modificado = segundos(e.metadata().and_then(|m| m.modified()));
        for item in listar_arvore(&p) {
            let m = segundos(std::fs::metadata(p.join(&item.caminho)).and_then(|m| m.modified()));
            modificado = modificado.max(m);
        }
        let tem_pdf = std::fs::read_dir(p.join(PASTA_SAIDA))
            .map(|rd| rd.flatten().any(|f| f.path().extension().map(|x| x == "pdf").unwrap_or(false)))
            .unwrap_or(false);
        lista.push(InfoProjeto { id: nome.clone(), nome, modificado, tem_pdf });
    }
    lista.sort_by(|a, b| b.modificado.cmp(&a.modificado));
    lista
}

/// Lista recursivamente os arquivos e pastas de um projeto (sem os itens ocultos).
pub fn listar_arvore(pasta: &Path) -> Vec<ItemArvore> {
    fn visitar(base: &Path, atual: &Path, saida: &mut Vec<ItemArvore>, profundidade: usize) {
        if profundidade > 20 {
            return; // proteção contra atalhos circulares
        }
        let Ok(rd) = std::fs::read_dir(atual) else { return };
        let mut entradas: Vec<_> = rd.flatten().collect();
        entradas.sort_by_key(|e| e.file_name().to_string_lossy().to_lowercase());
        for e in entradas {
            let nome = e.file_name().to_string_lossy().to_string();
            if nome.starts_with('.') {
                continue;
            }
            let p = e.path();
            let rel = p
                .strip_prefix(base)
                .unwrap_or(&p)
                .to_string_lossy()
                .replace('\\', "/");
            let meta = e.metadata().ok();
            let eh_pasta = meta.as_ref().map(|m| m.is_dir()).unwrap_or(false);
            saida.push(ItemArvore {
                caminho: rel,
                pasta: eh_pasta,
                tamanho: meta.map(|m| m.len()).unwrap_or(0),
            });
            if eh_pasta {
                visitar(base, &p, saida, profundidade + 1);
            }
        }
    }
    let mut saida = Vec::new();
    visitar(pasta, pasta, &mut saida, 0);
    saida
}

// ---------------------------------------------------------------------------
// Criação, renomeação, exclusão
// ---------------------------------------------------------------------------

/// Gera um nome de projeto que ainda não existe ("Nome", "Nome (2)", "Nome (3)"...).
fn nome_livre(estado: &EstadoRef, base: &str) -> String {
    let base = limpar_nome(base);
    if !estado.pasta_projetos.join(&base).exists() {
        return base;
    }
    (2..)
        .map(|n| format!("{base} ({n})"))
        .find(|n| !estado.pasta_projetos.join(n).exists())
        .unwrap()
}

/// Cria um projeto novo a partir de um modelo. Retorna o id (nome da pasta).
/// `modelo` pode ser um modelo pronto ("memorial", "laudo"...) ou um modelo
/// do usuário ("usuario:Nome do modelo").
pub fn criar_projeto(estado: &EstadoRef, nome: &str, modelo: &str) -> Resultado<String> {
    let id = nome_livre(estado, nome);
    criar_projeto_em(&estado.pasta_projetos.join(&id), &id, modelo, estado)?;
    Ok(id)
}

/// Cria os arquivos de um projeto novo na pasta `pasta` (que ainda não pode existir).
/// `titulo` vai para o título do documento nos modelos prontos.
/// Usada por "Novo projeto" e pela primeira revisão de um documento técnico.
pub fn criar_projeto_em(pasta: &Path, titulo: &str, modelo: &str, estado: &EstadoRef) -> Resultado<()> {
    if let Some(nome_modelo) = modelo.strip_prefix("usuario:") {
        let origem = estado.pasta_modelos.join(limpar_nome(nome_modelo));
        if !origem.is_dir() {
            return Err("Modelo não encontrado.".into());
        }
        copiar_pasta(&origem, pasta).map_err(|e| e.to_string())?;
        return gerar_variaveis(pasta);
    }

    std::fs::create_dir_all(pasta).map_err(|e| e.to_string())?;
    let (arquivos, variaveis) = modelos::arquivos(modelo, titulo);
    for (rel, conteudo) in arquivos {
        let destino = pasta.join(rel);
        if let Some(pai) = destino.parent() {
            let _ = std::fs::create_dir_all(pai);
        }
        std::fs::write(destino, conteudo).map_err(|e| e.to_string())?;
    }
    let cfg = ConfigProjeto { arquivo_principal: "main.tex".into(), variaveis, ..Default::default() };
    gravar_config(pasta, &cfg)?;
    gerar_variaveis(pasta)
}

/// Na primeira execução (sem nenhum projeto), cria um projeto de demonstração.
pub fn criar_exemplo_se_vazio(estado: &EstadoRef) {
    if listar_projetos(estado).is_empty() {
        let _ = criar_projeto(estado, "Exemplo - Memorial de cálculo", "memorial");
    }
}

pub fn renomear_projeto(estado: &EstadoRef, id: &str, novo: &str) -> Resultado<String> {
    if documentacao::eh_id_versao(id) {
        return Err("Esta é uma revisão de um documento técnico. Para mudar o nome ou o código da revisão, use a aba Documentação técnica.".into());
    }
    let origem = pasta_projeto(estado, id)?;
    let novo_id = limpar_nome(novo);
    if novo_id == id {
        return Ok(novo_id);
    }
    if estado.pasta_projetos.join(&novo_id).exists() {
        return Err(format!("Já existe um projeto chamado \"{novo_id}\"."));
    }
    std::fs::rename(origem, estado.pasta_projetos.join(&novo_id)).map_err(|e| e.to_string())?;
    Ok(novo_id)
}

/// Exclui um projeto. Para evitar perdas, ele é movido para a pasta
/// `Documentos\EngLaTeX\Lixeira` em vez de ser apagado de vez.
pub fn excluir_projeto(estado: &EstadoRef, id: &str) -> Resultado<()> {
    if documentacao::eh_id_versao(id) {
        return Err("Esta é uma revisão de um documento técnico. Exclua-a pela aba Documentação técnica.".into());
    }
    let origem = pasta_projeto(estado, id)?;
    let lixeira = estado.pasta_dados.join("Lixeira");
    std::fs::create_dir_all(&lixeira).map_err(|e| e.to_string())?;
    let mut destino = lixeira.join(id);
    let mut n = 2;
    while destino.exists() {
        destino = lixeira.join(format!("{id} ({n})"));
        n += 1;
    }
    std::fs::rename(origem, destino).map_err(|e| e.to_string())
}

/// Copia uma pasta inteira (usada para duplicar projetos e criar modelos).
/// Ignora a pasta de saída e o histórico de versões (a cópia começa "limpa").
/// Também usada para criar uma nova revisão de documento técnico.
pub fn copiar_pasta(origem: &Path, destino: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(destino)?;
    for e in std::fs::read_dir(origem)?.flatten() {
        let nome = e.file_name();
        if nome == PASTA_SAIDA || nome == crate::historico::PASTA_HISTORICO {
            continue;
        }
        let p = e.path();
        if p.is_dir() {
            copiar_pasta(&p, &destino.join(&nome))?;
        } else {
            std::fs::copy(&p, destino.join(&nome))?;
        }
    }
    Ok(())
}

pub fn duplicar_projeto(estado: &EstadoRef, id: &str) -> Resultado<String> {
    let origem = pasta_projeto(estado, id)?;
    // Duplicar uma revisão de documento técnico gera um projeto comum
    // chamado "Documento - Rev. 01 - cópia".
    let novo = nome_livre(estado, &format!("{} - cópia", documentacao::nome_exibicao(id)));
    copiar_pasta(&origem, &estado.pasta_projetos.join(&novo)).map_err(|e| e.to_string())?;
    Ok(novo)
}

/// Cria um arquivo vazio ou uma pasta dentro do projeto.
pub fn criar_item(estado: &EstadoRef, id: &str, rel: &str, pasta: bool) -> Resultado<()> {
    let destino = caminho_arquivo(estado, id, rel)?;
    if destino.exists() {
        return Err("Já existe um item com esse nome.".into());
    }
    if pasta {
        std::fs::create_dir_all(&destino).map_err(|e| e.to_string())
    } else {
        if let Some(pai) = destino.parent() {
            std::fs::create_dir_all(pai).map_err(|e| e.to_string())?;
        }
        std::fs::write(&destino, b"").map_err(|e| e.to_string())
    }
}

/// Renomeia ou move um arquivo/pasta dentro do projeto.
pub fn mover_item(estado: &EstadoRef, id: &str, de: &str, para: &str) -> Resultado<()> {
    let origem = caminho_arquivo(estado, id, de)?;
    let destino = caminho_arquivo(estado, id, para)?;
    if !origem.exists() {
        return Err("O item não existe.".into());
    }
    if destino.exists() {
        return Err("Já existe um item com esse nome.".into());
    }
    if destino.starts_with(&origem) {
        return Err("Não é possível mover uma pasta para dentro dela mesma.".into());
    }
    if let Some(pai) = destino.parent() {
        std::fs::create_dir_all(pai).map_err(|e| e.to_string())?;
    }
    std::fs::rename(&origem, &destino).map_err(|e| e.to_string())?;

    // Se o arquivo principal foi renomeado, atualiza a configuração do projeto.
    let raiz = pasta_projeto(estado, id)?;
    let mut cfg = ler_config(&raiz);
    let de_norm = validar_relativo(de)?.to_string_lossy().replace('\\', "/");
    if cfg.arquivo_principal == de_norm {
        cfg.arquivo_principal = validar_relativo(para)?.to_string_lossy().replace('\\', "/");
        gravar_config(&raiz, &cfg)?;
    }
    Ok(())
}

pub fn excluir_item(estado: &EstadoRef, id: &str, rel: &str) -> Resultado<()> {
    if validar_relativo(rel)?.as_os_str().is_empty() {
        return Err("Não é possível excluir a raiz do projeto.".into());
    }
    let alvo = caminho_arquivo(estado, id, rel)?;
    if alvo.is_dir() {
        std::fs::remove_dir_all(alvo).map_err(|e| e.to_string())
    } else {
        std::fs::remove_file(alvo).map_err(|e| e.to_string())
    }
}

/// Grava um arquivo (texto ou binário, como imagens enviadas pela interface).
pub fn gravar_arquivo(estado: &EstadoRef, id: &str, rel: &str, dados: &[u8]) -> Resultado<()> {
    if validar_relativo(rel)?.as_os_str().is_empty() {
        return Err("Nome de arquivo vazio.".into());
    }
    let destino = caminho_arquivo(estado, id, rel)?;
    if let Some(pai) = destino.parent() {
        std::fs::create_dir_all(pai).map_err(|e| e.to_string())?;
    }
    // Grava num arquivo temporário e depois renomeia: se faltar energia no meio
    // da gravação, o arquivo original não fica corrompido.
    let temp = destino.with_extension("englatex-tmp");
    std::fs::write(&temp, dados).map_err(|e| e.to_string())?;
    std::fs::rename(&temp, &destino).map_err(|e| {
        let _ = std::fs::remove_file(&temp);
        e.to_string()
    })
}

// ---------------------------------------------------------------------------
// Referências (para o autocompletar de \ref{} e \cite{})
// ---------------------------------------------------------------------------

#[derive(Serialize)]
pub struct Referencias {
    /// Rótulos encontrados em `\label{...}` de todos os .tex do projeto.
    pub rotulos: Vec<String>,
    /// Chaves das entradas dos arquivos .bib (`@article{chave, ...`).
    pub citacoes: Vec<String>,
}

pub fn referencias(pasta: &Path) -> Referencias {
    let re_label = regex::Regex::new(r"\\label\{([^}]+)\}").unwrap();
    let re_bib = regex::Regex::new(r"@\w+\s*\{\s*([^,\s]+)\s*,").unwrap();
    let mut rotulos = Vec::new();
    let mut citacoes = Vec::new();
    for item in listar_arvore(pasta) {
        let c = item.caminho.to_lowercase();
        if item.pasta || item.tamanho > 5_000_000 {
            continue;
        }
        if c.ends_with(".tex") {
            if let Ok(b) = std::fs::read(pasta.join(&item.caminho)) {
                let t = String::from_utf8_lossy(&b);
                rotulos.extend(re_label.captures_iter(&t).map(|m| m[1].to_string()));
            }
        } else if c.ends_with(".bib") {
            if let Ok(b) = std::fs::read(pasta.join(&item.caminho)) {
                let t = String::from_utf8_lossy(&b);
                citacoes.extend(re_bib.captures_iter(&t).map(|m| m[1].to_string()));
            }
        }
    }
    rotulos.sort();
    rotulos.dedup();
    citacoes.sort();
    citacoes.dedup();
    Referencias { rotulos, citacoes }
}

// ---------------------------------------------------------------------------
// ZIP (importar/exportar, compatível com o "Download source" do Overleaf)
// ---------------------------------------------------------------------------

/// Gera um .zip do projeto (sem a pasta de saída e sem a configuração interna).
pub fn exportar_zip(pasta: &Path) -> Resultado<Vec<u8>> {
    let mut buffer = std::io::Cursor::new(Vec::new());
    {
        let mut zip = zip::ZipWriter::new(&mut buffer);
        let opcoes = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);
        for item in listar_arvore(pasta) {
            if item.pasta {
                zip.add_directory(format!("{}/", item.caminho), opcoes).map_err(|e| e.to_string())?;
            } else {
                zip.start_file(item.caminho.clone(), opcoes).map_err(|e| e.to_string())?;
                let dados = std::fs::read(pasta.join(&item.caminho)).map_err(|e| e.to_string())?;
                zip.write_all(&dados).map_err(|e| e.to_string())?;
            }
        }
        zip.finish().map_err(|e| e.to_string())?;
    }
    Ok(buffer.into_inner())
}

/// Cria um projeto a partir de um .zip (por exemplo, baixado do Overleaf).
/// Se todo o conteúdo estiver dentro de uma única pasta, essa pasta vira a raiz.
pub fn importar_zip(estado: &EstadoRef, nome: &str, dados: Vec<u8>) -> Resultado<String> {
    let mut arquivo = zip::ZipArchive::new(std::io::Cursor::new(dados))
        .map_err(|_| "O arquivo enviado não é um .zip válido.".to_string())?;

    // Lê os nomes válidos (ignorando lixo do macOS e caminhos perigosos).
    let mut nomes: Vec<(usize, PathBuf, bool)> = Vec::new();
    for i in 0..arquivo.len() {
        let f = arquivo.by_index(i).map_err(|e| e.to_string())?;
        let Some(caminho) = f.enclosed_name() else { continue };
        let s = caminho.to_string_lossy();
        if s.starts_with("__MACOSX") || s.ends_with(".DS_Store") {
            continue;
        }
        nomes.push((i, caminho.to_path_buf(), f.is_dir()));
    }
    if nomes.is_empty() {
        return Err("O .zip está vazio.".into());
    }

    // Detecta uma pasta única envolvendo tudo.
    let primeiro: Option<PathBuf> = nomes[0].1.components().next().map(|c| PathBuf::from(c.as_os_str()));
    let prefixo = primeiro.filter(|p| {
        nomes.iter().all(|(_, n, eh_pasta)| n.starts_with(p) && (n != p || *eh_pasta))
            && nomes.iter().any(|(_, n, _)| n != p)
    });

    let id = nome_livre(estado, nome);
    let raiz = estado.pasta_projetos.join(&id);
    std::fs::create_dir_all(&raiz).map_err(|e| e.to_string())?;
    for (i, caminho, eh_pasta) in nomes {
        let rel = match &prefixo {
            Some(p) => caminho.strip_prefix(p).unwrap_or(&caminho).to_path_buf(),
            None => caminho,
        };
        if rel.as_os_str().is_empty() {
            continue;
        }
        let destino = raiz.join(&rel);
        if eh_pasta {
            let _ = std::fs::create_dir_all(&destino);
            continue;
        }
        if let Some(pai) = destino.parent() {
            let _ = std::fs::create_dir_all(pai);
        }
        let mut f = arquivo.by_index(i).map_err(|e| e.to_string())?;
        let mut conteudo = Vec::new();
        f.read_to_end(&mut conteudo).map_err(|e| e.to_string())?;
        std::fs::write(&destino, conteudo).map_err(|e| e.to_string())?;
    }
    Ok(id)
}

// ---------------------------------------------------------------------------
// Variáveis do documento
// ---------------------------------------------------------------------------
//
// As variáveis ficam na configuração do projeto. A cada alteração (e antes de
// cada compilação) é gerado o arquivo `variaveis.tex`, que define o comando
// \var{nome}. O documento só precisa ter `\input{variaveis}` no preâmbulo.
// Como o variaveis.tex é um arquivo LaTeX comum, o projeto continua
// compilando em qualquer lugar (inclusive no Overleaf).

/// Nome do arquivo gerado com as variáveis.
pub const ARQUIVO_VARIAVEIS: &str = "variaveis.tex";

/// Confere se o nome da variável é válido.
pub fn nome_variavel_valido(nome: &str) -> bool {
    !nome.is_empty() && nome.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

/// Escapa um texto comum para LaTeX (& % $ # _ { } ~ ^ \ e quebras de linha).
pub fn escapar_latex(texto: &str) -> String {
    let mut s = String::with_capacity(texto.len() + 16);
    for c in texto.replace("\r\n", "\n").chars() {
        match c {
            '\\' => s.push_str("\\textbackslash{}"),
            '&' | '%' | '$' | '#' | '_' | '{' | '}' => {
                s.push('\\');
                s.push(c);
            }
            '~' => s.push_str("\\textasciitilde{}"),
            '^' => s.push_str("\\textasciicircum{}"),
            _ => s.push(c),
        }
    }
    // Linha em branco = novo parágrafo; quebra simples = nova linha.
    let paragrafos: Vec<String> = s
        .split("\n\n")
        .map(|p| {
            p.lines()
                .map(|l| l.trim_end())
                .filter(|l| !l.is_empty())
                .collect::<Vec<_>>()
                .join("\\\\\n")
        })
        .filter(|p| !p.is_empty())
        .collect();
    paragrafos.join("\n\\par\n")
}

/// Gera o conteúdo do arquivo variaveis.tex.
pub fn conteudo_variaveis(variaveis: &[Variavel]) -> String {
    let mut t = String::from(
        "% ================================================================\n\
         % ARQUIVO GERADO AUTOMATICAMENTE PELO ENG LATEX - NAO EDITE AQUI.\n\
         % Altere os valores pelo botao \"Variaveis\" do editor.\n\
         % Uso no documento: \\var{nome}\n\
         % ================================================================\n\
         \\makeatletter\n\
         % \\var{nome}: imprime o valor; se a variavel nao existir, imprime [nome?] e avisa no log.\n\
         \\def\\englatex@var#1{\\ifcsname englatex@v@#1\\endcsname\\csname englatex@v@#1\\endcsname\n\
         \\else\\@latex@warning{Variavel `#1' nao definida}\\textbf{[\\detokenize{#1}?]}\\fi}\n\
         \\def\\var{\\englatex@var}\n",
    );
    for v in variaveis {
        if !nome_variavel_valido(&v.nome) {
            continue;
        }
        let valor = if v.tipo == "latex" { v.valor.clone() } else { escapar_latex(&v.valor) };
        if !v.descricao.trim().is_empty() {
            // Descrição como comentário (sem quebras de linha).
            t.push_str(&format!("% {}: {}\n", v.nome, v.descricao.replace('\n', " ")));
        }
        t.push_str(&format!(
            "\\expandafter\\long\\expandafter\\def\\csname englatex@v@{}\\endcsname{{{}}}\n",
            v.nome, valor
        ));
    }
    t.push_str("\\makeatother\n");
    t
}

/// Grava o variaveis.tex do projeto (só se houver variáveis ou se o arquivo já existir).
pub fn gerar_variaveis(pasta: &Path) -> Resultado<()> {
    let cfg = ler_config(pasta);
    let destino = pasta.join(ARQUIVO_VARIAVEIS);
    if cfg.variaveis.is_empty() && !destino.exists() {
        return Ok(());
    }
    let novo = conteudo_variaveis(&cfg.variaveis);
    // Só grava se mudou (não altera a data do arquivo à toa).
    if std::fs::read_to_string(&destino).ok().as_deref() != Some(novo.as_str()) {
        std::fs::write(&destino, novo).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// O arquivo principal já carrega o variaveis.tex?
pub fn variaveis_incluidas(pasta: &Path) -> bool {
    let Some(principal) = arquivo_principal(pasta) else { return false };
    let texto = std::fs::read_to_string(pasta.join(principal)).unwrap_or_default();
    regex::Regex::new(r"(?m)^[^%\n]*\\(input|include)\s*\{\s*variaveis(\.tex)?\s*\}")
        .map(|r| r.is_match(&texto))
        .unwrap_or(false)
}

/// Insere `\input{variaveis}` logo depois do `\documentclass` do arquivo principal.
pub fn incluir_variaveis(pasta: &Path) -> Resultado<()> {
    if variaveis_incluidas(pasta) {
        return Ok(());
    }
    let principal = arquivo_principal(pasta).ok_or("O projeto não tem arquivo principal.")?;
    let caminho = pasta.join(&principal);
    let texto = std::fs::read_to_string(&caminho).map_err(|e| e.to_string())?;
    let re = regex::Regex::new(r"\\documentclass\s*(\[[^\]]*\])?\s*\{[^}]*\}[^\n]*\n?").unwrap();
    let linha = "\\input{variaveis} % tabela de variáveis do Eng LaTeX (\\var{nome})\n";
    let novo = match re.find(&texto) {
        Some(m) => {
            let fim = m.end();
            if !texto[..fim].ends_with('\n') {
                // \documentclass na última linha do arquivo (documento incompleto)
                return Err("Não foi possível localizar o fim da linha do \\documentclass.".into());
            }
            format!("{}{}{}", &texto[..fim], linha, &texto[fim..])
        }
        None => return Err("Não encontrei o \\documentclass no arquivo principal.".into()),
    };
    std::fs::write(caminho, novo).map_err(|e| e.to_string())
}

/// Grava a tabela de variáveis e gera o variaveis.tex.
pub fn gravar_variaveis(pasta: &Path, variaveis: Vec<Variavel>) -> Resultado<()> {
    for v in &variaveis {
        if !nome_variavel_valido(&v.nome) {
            return Err(format!(
                "Nome de variável inválido: \"{}\". Use só letras sem acento, números, _ e -.",
                v.nome
            ));
        }
    }
    let mut nomes = std::collections::HashSet::new();
    for v in &variaveis {
        if !nomes.insert(v.nome.clone()) {
            return Err(format!("A variável \"{}\" aparece duas vezes.", v.nome));
        }
    }
    let mut cfg = ler_config(pasta);
    cfg.variaveis = variaveis;
    gravar_config(pasta, &cfg)?;
    gerar_variaveis(pasta)
}

// ---------------------------------------------------------------------------
// Modelos do usuário
// ---------------------------------------------------------------------------
//
// Qualquer projeto pode ser salvo como modelo (cópia em Documentos\EngLaTeX\Modelos).
// Ao criar um projeto a partir dele, todos os arquivos e a tabela de variáveis
// são copiados; basta preencher os valores e compilar.

#[derive(Serialize)]
pub struct InfoModeloUsuario {
    pub id: String,
    pub nome: String,
    pub variaveis: usize,
}

pub fn listar_modelos_usuario(estado: &EstadoRef) -> Vec<InfoModeloUsuario> {
    let mut v: Vec<InfoModeloUsuario> = std::fs::read_dir(&estado.pasta_modelos)
        .map(|rd| {
            rd.flatten()
                .filter(|e| e.path().is_dir())
                .map(|e| {
                    let nome = e.file_name().to_string_lossy().to_string();
                    InfoModeloUsuario {
                        id: format!("usuario:{nome}"),
                        variaveis: ler_config(&e.path()).variaveis.len(),
                        nome,
                    }
                })
                .collect()
        })
        .unwrap_or_default();
    v.sort_by(|a, b| a.nome.to_lowercase().cmp(&b.nome.to_lowercase()));
    v
}

/// Salva uma cópia do projeto como modelo (substitui um modelo com o mesmo nome).
pub fn salvar_como_modelo(estado: &EstadoRef, id: &str, nome: &str) -> Resultado<String> {
    let origem = pasta_projeto(estado, id)?;
    let nome = limpar_nome(nome);
    let destino = estado.pasta_modelos.join(&nome);
    if destino.exists() {
        std::fs::remove_dir_all(&destino).map_err(|e| e.to_string())?;
    }
    copiar_pasta(&origem, &destino).map_err(|e| e.to_string())?;
    Ok(nome)
}

pub fn excluir_modelo_usuario(estado: &EstadoRef, nome: &str) -> Resultado<()> {
    let nome = limpar_nome(nome);
    let pasta = estado.pasta_modelos.join(&nome);
    if !pasta.is_dir() {
        return Err("Modelo não encontrado.".into());
    }
    std::fs::remove_dir_all(pasta).map_err(|e| e.to_string())
}
