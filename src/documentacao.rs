//! Documentação técnica: documentos com várias revisões (versões).
//!
//! Na engenharia um mesmo documento (memorial, laudo, procedimento, plano de
//! rigging...) é emitido várias vezes: Rev. 00, Rev. 01, Rev. 02... Cada
//! revisão precisa continuar existindo do jeito que foi entregue ao cliente,
//! enquanto a seguinte é preparada. Esta aba organiza isso.
//!
//! ## Como fica no disco
//!
//! ```text
//! Documentos\EngLaTeX\Documentacao\
//!   MC-001 Memorial ponte rolante\          <- um documento (pasta)
//!     .documento.json                       <- dados do documento e lista de revisões
//!     Rev. 00\                              <- cada revisão é um projeto LaTeX completo
//!     Rev. 01\
//! ```
//!
//! Cada pasta de revisão é um projeto comum (tem `.englatex.json`, `.saida\`,
//! `.historico\`...), então ela abre no mesmo editor dos projetos. Para o editor
//! e para a API, o "id de projeto" de uma revisão é
//! `doc:<pasta do documento>:<pasta da revisão>` (veja [`id_versao`]). O `:` é
//! proibido em nomes de pasta no Windows, então esse id nunca se confunde com
//! o de um projeto normal. A tradução do id para a pasta é feita em
//! `projetos::pasta_projeto`, de modo que todas as rotas `/api/p/:id/...`
//! (compilar, PDF, histórico, variáveis...) funcionam sem mudança.
//!
//! ## Variáveis de revisão
//!
//! Ao criar ou editar uma revisão, o programa grava na tabela de variáveis da
//! revisão (botão "Variáveis" do editor):
//!
//! | variável              | conteúdo                                         |
//! |-----------------------|--------------------------------------------------|
//! | `revisao`             | código da revisão (ex.: `01`)                    |
//! | `data_revisao`        | data da revisão (dd/mm/aaaa)                     |
//! | `descricao_revisao`   | o que mudou nesta revisão                        |
//! | `responsavel_revisao` | quem elaborou                                    |
//! | `status_revisao`      | Em elaboração, Emitida, Aprovada...              |
//! | `tabela_revisoes`     | tabela LaTeX pronta com todas as revisões até esta |
//!
//! Assim basta usar `\var{revisao}` no cabeçalho e `\var{tabela_revisoes}` na
//! folha de controle de revisões; nada precisa ser digitado à mão. O modelo
//! "Memorial de cálculo" já usa `\var{revisao}` no cabeçalho.

use crate::projetos::{self, limpar_nome, Resultado, Variavel};
use crate::EstadoRef;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// Nome da pasta (dentro de Documentos\EngLaTeX) onde ficam os documentos.
pub const PASTA_DOCUMENTACAO: &str = "Documentacao";
/// Arquivo com os dados do documento e a lista de revisões (dentro da pasta do documento).
pub const ARQUIVO_DOCUMENTO: &str = ".documento.json";
/// Prefixo do id de projeto de uma revisão (`doc:<documento>:<revisão>`).
pub const PREFIXO_ID: &str = "doc:";

/// Situações possíveis de uma revisão: (chave gravada no JSON, texto para o usuário).
/// A chave nunca muda (fica gravada nos arquivos); o texto pode mudar à vontade.
pub const SITUACOES: &[(&str, &str)] = &[
    ("elaboracao", "Em elaboração"),
    ("verificacao", "Em verificação"),
    ("emitida", "Emitida"),
    ("aprovada", "Aprovada"),
    ("cancelada", "Cancelada"),
];

// ---------------------------------------------------------------------------
// Estruturas gravadas no .documento.json
// ---------------------------------------------------------------------------

/// Um documento técnico e suas revisões.
#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Documento {
    /// Nome do documento como o usuário digitou (ex.: "MC-001 Memorial ponte rolante").
    /// A pasta usa a versão "limpa" desse nome.
    pub nome: String,
    /// Cliente (opcional, só para organização e busca).
    pub cliente: String,
    /// Observações gerais sobre o documento (opcional).
    pub descricao: String,
    /// Quando o documento foi criado (segundos desde 1970).
    pub criado: u64,
    /// Revisões, na ordem em que foram criadas (a última é a mais recente).
    pub versoes: Vec<Versao>,
}

/// Uma revisão do documento.
#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Versao {
    /// Código da revisão (ex.: "00", "01", "A"). Aparece como "Rev. 00".
    pub revisao: String,
    /// Nome da pasta da revisão dentro da pasta do documento (ex.: "Rev. 00").
    pub pasta: String,
    /// O que mudou nesta revisão (ex.: "Emissão inicial", "Atende comentários do cliente").
    pub descricao: String,
    /// Situação: uma das chaves de [`SITUACOES`].
    pub status: String,
    /// Data da revisão no formato aaaa-mm-dd (o mesmo do campo de data da interface).
    pub data: String,
    /// Quem elaborou a revisão.
    pub responsavel: String,
    /// Quando a revisão foi criada (segundos desde 1970).
    pub criada: u64,
    /// Pasta da revisão usada como ponto de partida ("" = criada a partir de um modelo).
    pub origem: String,
}

// ---------------------------------------------------------------------------
// Respostas para a interface
// ---------------------------------------------------------------------------

/// Resumo de um documento para a lista da aba "Documentação técnica".
#[derive(Serialize)]
pub struct InfoDocumento {
    /// Nome da pasta do documento (usado nas rotas).
    pub id: String,
    pub nome: String,
    pub cliente: String,
    pub descricao: String,
    /// Quantidade de revisões.
    pub quantidade: usize,
    /// Código da revisão mais recente (ex.: "02").
    pub ultima_revisao: String,
    /// Situação da revisão mais recente.
    pub ultima_status: String,
    /// Id de projeto da revisão mais recente (para abrir direto no editor).
    pub ultima_id: String,
    /// Última modificação em qualquer revisão (segundos desde 1970).
    pub modificado: u64,
}

/// Uma revisão com os dados que a interface precisa para a tabela.
#[derive(Serialize)]
pub struct InfoVersao {
    #[serde(flatten)]
    pub versao: Versao,
    /// Id de projeto para abrir no editor (`doc:...:...`).
    pub id: String,
    /// Última modificação dos arquivos da revisão.
    pub modificado: u64,
    /// Já existe PDF compilado?
    pub tem_pdf: bool,
}

/// Documento completo (tela de detalhes).
#[derive(Serialize)]
pub struct DetalheDocumento {
    pub id: String,
    pub nome: String,
    pub cliente: String,
    pub descricao: String,
    pub versoes: Vec<InfoVersao>,
    /// Código sugerido para a próxima revisão (ex.: "03").
    pub proxima_revisao: String,
    /// Lista de situações [(chave, texto)] para montar os seletores.
    pub situacoes: Vec<(String, String)>,
}

// ---------------------------------------------------------------------------
// Ids e pastas
// ---------------------------------------------------------------------------

/// Pasta raiz da documentação técnica (cria se não existir).
pub fn pasta_raiz(estado: &EstadoRef) -> PathBuf {
    let p = estado.pasta_dados.join(PASTA_DOCUMENTACAO);
    let _ = std::fs::create_dir_all(&p);
    p
}

/// Monta o id de projeto de uma revisão.
pub fn id_versao(documento: &str, pasta_versao: &str) -> String {
    format!("{PREFIXO_ID}{documento}:{pasta_versao}")
}

/// Separa um id `doc:<documento>:<revisão>` em (documento, revisão).
/// Devolve `None` se o id não for de uma revisão.
pub fn separar_id(id: &str) -> Option<(&str, &str)> {
    id.strip_prefix(PREFIXO_ID)?.split_once(':')
}

/// O id é de uma revisão de documento técnico?
pub fn eh_id_versao(id: &str) -> bool {
    separar_id(id).is_some()
}

/// Nome amigável para títulos e nomes de arquivo:
/// "MC-001 Memorial - Rev. 01" para revisões, o próprio id para projetos.
pub fn nome_exibicao(id: &str) -> String {
    match separar_id(id) {
        Some((doc, ver)) => format!("{doc} - {ver}"),
        None => id.to_string(),
    }
}

/// Confere que um nome vindo da interface é um nome de pasta válido (sem `..`, `/`, `:`...).
fn validar_nome(nome: &str, oque: &str) -> Resultado<()> {
    if nome.is_empty() || nome != limpar_nome(nome) {
        return Err(format!("{oque} inválido."));
    }
    Ok(())
}

/// Pasta de um documento, conferindo que o nome é válido e que ela existe.
pub fn pasta_documento(estado: &EstadoRef, documento: &str) -> Resultado<PathBuf> {
    validar_nome(documento, "Documento")?;
    let p = pasta_raiz(estado).join(documento);
    if p.join(ARQUIVO_DOCUMENTO).is_file() {
        Ok(p)
    } else {
        Err(format!("O documento \"{documento}\" não existe mais."))
    }
}

/// Pasta de uma revisão (usada por `projetos::pasta_projeto` para ids `doc:...`).
pub fn pasta_versao(estado: &EstadoRef, documento: &str, versao: &str) -> Resultado<PathBuf> {
    validar_nome(versao, "Revisão")?;
    let p = pasta_documento(estado, documento)?.join(versao);
    if p.is_dir() {
        Ok(p)
    } else {
        Err(format!("A revisão \"{versao}\" do documento \"{documento}\" não existe mais."))
    }
}

// ---------------------------------------------------------------------------
// Leitura e gravação do .documento.json
// ---------------------------------------------------------------------------

fn ler(pasta_doc: &Path) -> Resultado<Documento> {
    let txt = std::fs::read_to_string(pasta_doc.join(ARQUIVO_DOCUMENTO))
        .map_err(|_| "Não foi possível ler os dados do documento.".to_string())?;
    serde_json::from_str(&txt).map_err(|e| format!("Os dados do documento estão corrompidos ({e})."))
}

/// Grava o .documento.json de forma segura (temporário + renomear).
fn gravar(pasta_doc: &Path, doc: &Documento) -> Resultado<()> {
    let txt = serde_json::to_string_pretty(doc).map_err(|e| e.to_string())?;
    let destino = pasta_doc.join(ARQUIVO_DOCUMENTO);
    let temp = pasta_doc.join(".documento.json.tmp");
    std::fs::write(&temp, txt).map_err(|e| e.to_string())?;
    std::fs::rename(&temp, &destino).map_err(|e| {
        let _ = std::fs::remove_file(&temp);
        e.to_string()
    })
}

// ---------------------------------------------------------------------------
// Datas e códigos de revisão
// ---------------------------------------------------------------------------

fn agora() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

/// Data de hoje (UTC) no formato aaaa-mm-dd. Usada só quando a interface não
/// manda a data (a interface manda a data local do Windows).
fn hoje() -> String {
    // Conversão de dias desde 1970 para data civil (algoritmo de Howard Hinnant),
    // para não depender de biblioteca de datas.
    let dias = (agora() / 86_400) as i64 + 719_468;
    let era = dias.div_euclid(146_097);
    let doe = dias.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let dia = doy - (153 * mp + 2) / 5 + 1;
    let mes = if mp < 10 { mp + 3 } else { mp - 9 };
    let ano = yoe + era * 400 + if mes <= 2 { 1 } else { 0 };
    format!("{ano:04}-{mes:02}-{dia:02}")
}

/// "2026-11-25" -> "25/11/2026". Se não estiver nesse formato, devolve como veio.
pub fn data_br(iso: &str) -> String {
    let p: Vec<&str> = iso.split('-').collect();
    if p.len() == 3 && p[0].len() == 4 {
        format!("{}/{}/{}", p[2], p[1], p[0])
    } else {
        iso.to_string()
    }
}

/// Limpa o código da revisão digitado: tira espaços e um "Rev." / "Rev" / "R"
/// que o usuário tenha digitado na frente ("Rev. 01" -> "01").
pub fn limpar_codigo(codigo: &str) -> String {
    let c = codigo.trim();
    let minusculo = c.to_lowercase();
    for prefixo in ["revisão", "revisao", "rev.", "rev", "r."] {
        if minusculo.starts_with(prefixo) {
            let resto = c[prefixo.len()..].trim_start_matches(['.', ' ', '-', '_']).trim();
            if !resto.is_empty() {
                return resto.to_string();
            }
        }
    }
    c.to_string()
}

/// Sugere o código da próxima revisão a partir do último:
/// - termina em número: soma 1 mantendo os zeros ("00" -> "01", "09" -> "10", "1.2" -> "1.3");
/// - é uma ou duas letras: próxima letra ("A" -> "B", "Z" -> "AA");
/// - outros casos: acrescenta "-1".
pub fn proxima_revisao(ultima: &str) -> String {
    let ultima = ultima.trim();
    if ultima.is_empty() {
        return "00".into();
    }
    // Número no final (mantém o prefixo e a quantidade de dígitos).
    let digitos: String = ultima.chars().rev().take_while(|c| c.is_ascii_digit()).collect::<Vec<_>>().into_iter().rev().collect();
    if !digitos.is_empty() {
        let prefixo = &ultima[..ultima.len() - digitos.len()];
        if let Ok(n) = digitos.parse::<u64>() {
            return format!("{prefixo}{:0largura$}", n + 1, largura = digitos.len());
        }
    }
    // Uma ou duas letras (A, B, ..., Z, AA...): conta como num sistema de base 26.
    // Palavras maiores ("final") não são códigos de letra: caem no último caso.
    if ultima.len() <= 2 && ultima.chars().all(|c| c.is_ascii_alphabetic()) {
        let maiuscula = ultima.chars().all(|c| c.is_ascii_uppercase());
        let mut letras: Vec<u8> = ultima.to_ascii_uppercase().into_bytes();
        let mut i = letras.len();
        loop {
            if i == 0 {
                letras.insert(0, b'A');
                break;
            }
            i -= 1;
            if letras[i] == b'Z' {
                letras[i] = b'A';
            } else {
                letras[i] += 1;
                break;
            }
        }
        let s = String::from_utf8(letras).unwrap_or_default();
        return if maiuscula { s } else { s.to_lowercase() };
    }
    format!("{ultima}-1")
}

/// Nome da pasta de uma revisão a partir do código ("01" -> "Rev. 01").
fn pasta_da_revisao(codigo: &str) -> String {
    limpar_nome(&format!("Rev. {codigo}"))
}

/// Texto da situação para o usuário ("emitida" -> "Emitida").
fn texto_situacao(chave: &str) -> &'static str {
    SITUACOES.iter().find(|(k, _)| *k == chave).map(|(_, t)| *t).unwrap_or("Em elaboração")
}

/// Confere a situação vinda da interface (vazio = "elaboracao").
fn validar_situacao(s: &str) -> Resultado<String> {
    if s.is_empty() {
        return Ok("elaboracao".into());
    }
    if SITUACOES.iter().any(|(k, _)| *k == s) {
        Ok(s.to_string())
    } else {
        Err(format!("Situação desconhecida: \"{s}\"."))
    }
}

// ---------------------------------------------------------------------------
// Variáveis de revisão (gravadas na tabela de variáveis de cada revisão)
// ---------------------------------------------------------------------------

/// Gera a tabela LaTeX de controle de revisões com as revisões `versoes`.
/// Usa só LaTeX básico (tabular + \hline), para funcionar em qualquer modelo.
pub fn tabela_revisoes(versoes: &[Versao]) -> String {
    let mut t = String::from(
        "{\\small\\renewcommand{\\arraystretch}{1.3}%\n\
         \\begin{tabular}{|c|c|p{0.45\\linewidth}|p{0.22\\linewidth}|}\n\\hline\n\
         \\textbf{Rev.} & \\textbf{Data} & \\textbf{Descrição} & \\textbf{Elaborado por} \\\\\n\\hline\n",
    );
    for v in versoes {
        t.push_str(&format!(
            "{} & {} & {} & {} \\\\\n\\hline\n",
            projetos::escapar_latex(&v.revisao),
            projetos::escapar_latex(&data_br(&v.data)),
            projetos::escapar_latex(&v.descricao),
            projetos::escapar_latex(&v.responsavel),
        ));
    }
    t.push_str("\\end{tabular}}");
    t
}

/// Inclui ou atualiza uma variável na lista (mantém a descrição que o usuário tiver escrito).
fn definir_variavel(lista: &mut Vec<Variavel>, nome: &str, valor: String, tipo: &str, descricao: &str) {
    match lista.iter_mut().find(|v| v.nome == nome) {
        Some(v) => {
            v.valor = valor;
            v.tipo = tipo.into();
        }
        None => lista.push(Variavel { nome: nome.into(), valor, descricao: descricao.into(), tipo: tipo.into() }),
    }
}

/// Grava as variáveis de revisão na revisão de índice `indice` e gera o variaveis.tex.
fn atualizar_variaveis(pasta_doc: &Path, doc: &Documento, indice: usize) -> Resultado<()> {
    let v = &doc.versoes[indice];
    let pasta = pasta_doc.join(&v.pasta);
    let mut cfg = projetos::ler_config(&pasta);
    let lista = &mut cfg.variaveis;
    definir_variavel(lista, "revisao", v.revisao.clone(), "texto", "Revisão do documento (preenchida pela aba Documentação técnica)");
    definir_variavel(lista, "data_revisao", data_br(&v.data), "texto", "Data da revisão (automática)");
    definir_variavel(lista, "descricao_revisao", v.descricao.clone(), "texto", "O que mudou nesta revisão (automática)");
    definir_variavel(lista, "responsavel_revisao", v.responsavel.clone(), "texto", "Quem elaborou a revisão (automática)");
    definir_variavel(lista, "status_revisao", texto_situacao(&v.status).to_string(), "texto", "Situação da revisão (automática)");
    definir_variavel(lista, "tabela_revisoes", tabela_revisoes(&doc.versoes[..=indice]), "latex", "Tabela de controle de revisões até esta (automática)");
    projetos::gravar_config(&pasta, &cfg)?;
    projetos::gerar_variaveis(&pasta)
}

/// Atualiza as variáveis da revisão `indice` e das revisões ainda "em elaboração"
/// ou "em verificação" (a tabela delas inclui as anteriores). Revisões emitidas,
/// aprovadas ou canceladas não são tocadas: ficam como foram entregues.
fn atualizar_variaveis_abertas(pasta_doc: &Path, doc: &Documento, indice: usize) -> Resultado<()> {
    for i in 0..doc.versoes.len() {
        let aberta = matches!(doc.versoes[i].status.as_str(), "elaboracao" | "verificacao" | "");
        if i == indice || (i > indice && aberta) {
            atualizar_variaveis(pasta_doc, doc, i)?;
        }
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Listagem
// ---------------------------------------------------------------------------

/// Data de modificação mais recente dos arquivos de uma pasta de revisão.
fn modificado(pasta: &Path) -> u64 {
    let seg = |p: &Path| {
        std::fs::metadata(p)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0)
    };
    projetos::listar_arvore(pasta)
        .iter()
        .map(|i| seg(&pasta.join(&i.caminho)))
        .fold(seg(pasta), u64::max)
}

/// Existe PDF compilado na revisão?
fn tem_pdf(pasta: &Path) -> bool {
    std::fs::read_dir(pasta.join(projetos::PASTA_SAIDA))
        .map(|rd| rd.flatten().any(|f| f.path().extension().map(|x| x == "pdf").unwrap_or(false)))
        .unwrap_or(false)
}

/// Lista os documentos, do modificado mais recentemente para o mais antigo.
pub fn listar(estado: &EstadoRef) -> Vec<InfoDocumento> {
    let mut lista = Vec::new();
    let Ok(rd) = std::fs::read_dir(pasta_raiz(estado)) else { return lista };
    for e in rd.flatten() {
        let pasta = e.path();
        let id = e.file_name().to_string_lossy().to_string();
        if id.starts_with('.') || !pasta.join(ARQUIVO_DOCUMENTO).is_file() {
            continue;
        }
        let Ok(doc) = ler(&pasta) else { continue };
        let ultima = doc.versoes.last();
        let modif = doc.versoes.iter().map(|v| modificado(&pasta.join(&v.pasta))).max().unwrap_or(doc.criado);
        lista.push(InfoDocumento {
            ultima_revisao: ultima.map(|v| v.revisao.clone()).unwrap_or_default(),
            ultima_status: ultima.map(|v| v.status.clone()).unwrap_or_default(),
            ultima_id: ultima.map(|v| id_versao(&id, &v.pasta)).unwrap_or_default(),
            quantidade: doc.versoes.len(),
            nome: if doc.nome.is_empty() { id.clone() } else { doc.nome },
            cliente: doc.cliente,
            descricao: doc.descricao,
            modificado: modif,
            id,
        });
    }
    lista.sort_by(|a, b| b.modificado.cmp(&a.modificado));
    lista
}

/// Dados completos de um documento, com todas as revisões.
pub fn detalhar(estado: &EstadoRef, documento: &str) -> Resultado<DetalheDocumento> {
    let pasta = pasta_documento(estado, documento)?;
    let doc = ler(&pasta)?;
    let versoes = doc
        .versoes
        .iter()
        .map(|v| {
            let p = pasta.join(&v.pasta);
            InfoVersao { id: id_versao(documento, &v.pasta), modificado: modificado(&p), tem_pdf: tem_pdf(&p), versao: v.clone() }
        })
        .collect();
    Ok(DetalheDocumento {
        id: documento.to_string(),
        proxima_revisao: proxima_revisao(doc.versoes.last().map(|v| v.revisao.as_str()).unwrap_or("")),
        nome: if doc.nome.is_empty() { documento.to_string() } else { doc.nome },
        cliente: doc.cliente,
        descricao: doc.descricao,
        versoes,
        situacoes: SITUACOES.iter().map(|(k, t)| (k.to_string(), t.to_string())).collect(),
    })
}

// ---------------------------------------------------------------------------
// Criação
// ---------------------------------------------------------------------------

/// Pedido de criação de um documento (vem da janela "Novo documento").
#[derive(Deserialize, Default)]
#[serde(default)]
pub struct NovoDocumento {
    pub nome: String,
    pub cliente: String,
    pub descricao: String,
    /// Modelo da primeira revisão (mesmos valores de "Novo projeto": "memorial", "usuario:Nome"...).
    pub modelo: String,
    /// Dados da primeira revisão.
    pub versao: DadosVersao,
}

/// Dados de uma revisão vindos da interface (criar ou editar).
#[derive(Deserialize, Default, Clone)]
#[serde(default)]
pub struct DadosVersao {
    pub revisao: String,
    pub descricao: String,
    pub status: String,
    pub data: String,
    pub responsavel: String,
    /// Só na criação: pasta da revisão usada como ponto de partida.
    pub origem: String,
}

/// Cria um documento e a primeira revisão. Devolve (id do documento, id da revisão).
pub fn criar(estado: &EstadoRef, n: NovoDocumento) -> Resultado<(String, String)> {
    let nome = n.nome.trim();
    if nome.is_empty() {
        return Err("Informe o nome do documento.".into());
    }
    let id = limpar_nome(nome);
    let pasta_doc = pasta_raiz(estado).join(&id);
    if pasta_doc.exists() {
        return Err(format!("Já existe um documento chamado \"{id}\"."));
    }

    let codigo = limpar_codigo(if n.versao.revisao.trim().is_empty() { "00" } else { &n.versao.revisao });
    let versao = Versao {
        pasta: pasta_da_revisao(&codigo),
        revisao: codigo,
        descricao: if n.versao.descricao.trim().is_empty() { "Emissão inicial".into() } else { n.versao.descricao.trim().into() },
        status: validar_situacao(&n.versao.status)?,
        data: if n.versao.data.is_empty() { hoje() } else { n.versao.data.clone() },
        responsavel: n.versao.responsavel.trim().into(),
        criada: agora(),
        origem: String::new(),
    };

    // A primeira revisão é criada com o mesmo código de "Novo projeto",
    // direto dentro da pasta do documento.
    std::fs::create_dir_all(&pasta_doc).map_err(|e| e.to_string())?;
    let pasta_versao = pasta_doc.join(&versao.pasta);
    if let Err(e) = projetos::criar_projeto_em(&pasta_versao, nome, if n.modelo.is_empty() { "vazio" } else { &n.modelo }, estado) {
        // Não deixa um documento "pela metade" para trás.
        let _ = std::fs::remove_dir_all(&pasta_doc);
        return Err(e);
    }

    let doc = Documento { nome: nome.into(), cliente: n.cliente.trim().into(), descricao: n.descricao.trim().into(), criado: agora(), versoes: vec![versao] };
    gravar(&pasta_doc, &doc)?;
    atualizar_variaveis(&pasta_doc, &doc, 0)?;
    let id_rev = id_versao(&id, &doc.versoes[0].pasta);
    Ok((id, id_rev))
}

/// Cria uma nova revisão copiando uma revisão existente (`dados.origem`, ou a
/// mais recente se vazio). A revisão de origem não é alterada. Devolve o id da nova revisão.
pub fn criar_versao(estado: &EstadoRef, documento: &str, dados: DadosVersao) -> Resultado<String> {
    let pasta_doc = pasta_documento(estado, documento)?;
    let mut doc = ler(&pasta_doc)?;

    let origem = if dados.origem.is_empty() {
        doc.versoes.last().map(|v| v.pasta.clone()).ok_or("O documento não tem nenhuma revisão para copiar.")?
    } else {
        dados.origem.clone()
    };
    let base = doc.versoes.iter().find(|v| v.pasta == origem).cloned().ok_or("A revisão de origem não existe mais.")?;

    let ultima = doc.versoes.last().map(|v| v.revisao.as_str()).unwrap_or("");
    let sugestao = proxima_revisao(ultima);
    let codigo = limpar_codigo(if dados.revisao.trim().is_empty() { &sugestao } else { &dados.revisao });
    let pasta_nova = pasta_da_revisao(&codigo);
    if doc.versoes.iter().any(|v| v.pasta == pasta_nova) || pasta_doc.join(&pasta_nova).exists() {
        return Err(format!("Já existe a revisão \"{codigo}\" neste documento."));
    }

    // Copia os arquivos (sem PDF/aux e sem o histórico: a revisão nova começa limpa).
    projetos::copiar_pasta(&pasta_doc.join(&base.pasta), &pasta_doc.join(&pasta_nova)).map_err(|e| format!("Não foi possível copiar a revisão {}: {e}", base.revisao))?;

    doc.versoes.push(Versao {
        revisao: codigo,
        pasta: pasta_nova.clone(),
        descricao: dados.descricao.trim().into(),
        status: validar_situacao(&dados.status)?,
        data: if dados.data.is_empty() { hoje() } else { dados.data },
        responsavel: if dados.responsavel.trim().is_empty() { base.responsavel.clone() } else { dados.responsavel.trim().into() },
        criada: agora(),
        origem: base.pasta,
    });
    gravar(&pasta_doc, &doc)?;
    atualizar_variaveis(&pasta_doc, &doc, doc.versoes.len() - 1)?;
    Ok(id_versao(documento, &pasta_nova))
}

// ---------------------------------------------------------------------------
// Edição e exclusão
// ---------------------------------------------------------------------------

/// Altera nome, cliente e descrição do documento. Mudar o nome renomeia a pasta.
/// Devolve o id (nome da pasta) atualizado.
pub fn editar(estado: &EstadoRef, documento: &str, nome: &str, cliente: &str, descricao: &str) -> Resultado<String> {
    let mut pasta_doc = pasta_documento(estado, documento)?;
    let mut doc = ler(&pasta_doc)?;
    let nome = nome.trim();
    if nome.is_empty() {
        return Err("Informe o nome do documento.".into());
    }
    let novo_id = limpar_nome(nome);
    if novo_id != documento {
        let destino = pasta_raiz(estado).join(&novo_id);
        if destino.exists() {
            return Err(format!("Já existe um documento chamado \"{novo_id}\"."));
        }
        std::fs::rename(&pasta_doc, &destino).map_err(|e| format!("Não foi possível renomear (algum arquivo está aberto?): {e}"))?;
        pasta_doc = destino;
    }
    doc.nome = nome.into();
    doc.cliente = cliente.trim().into();
    doc.descricao = descricao.trim().into();
    gravar(&pasta_doc, &doc)?;
    Ok(novo_id)
}

/// Altera os dados de uma revisão. Se o código mudar, a pasta é renomeada.
/// Devolve o id de projeto atualizado da revisão.
pub fn editar_versao(estado: &EstadoRef, documento: &str, pasta_versao: &str, dados: DadosVersao) -> Resultado<String> {
    let pasta_doc = pasta_documento(estado, documento)?;
    let mut doc = ler(&pasta_doc)?;
    let indice = doc.versoes.iter().position(|v| v.pasta == pasta_versao).ok_or("Essa revisão não existe mais.")?;

    let codigo = limpar_codigo(&dados.revisao);
    if codigo.is_empty() {
        return Err("Informe o código da revisão (ex.: 01).".into());
    }
    let nova_pasta = pasta_da_revisao(&codigo);
    if nova_pasta != pasta_versao {
        if doc.versoes.iter().any(|v| v.pasta == nova_pasta) || pasta_doc.join(&nova_pasta).exists() {
            return Err(format!("Já existe a revisão \"{codigo}\" neste documento."));
        }
        std::fs::rename(pasta_doc.join(pasta_versao), pasta_doc.join(&nova_pasta))
            .map_err(|e| format!("Não foi possível renomear a pasta da revisão (algum arquivo está aberto?): {e}"))?;
        // Outras revisões que apontam para esta como origem.
        for v in doc.versoes.iter_mut() {
            if v.origem == pasta_versao {
                v.origem = nova_pasta.clone();
            }
        }
    }

    let v = &mut doc.versoes[indice];
    v.revisao = codigo;
    v.pasta = nova_pasta.clone();
    v.descricao = dados.descricao.trim().into();
    v.status = validar_situacao(&dados.status)?;
    if !dados.data.is_empty() {
        v.data = dados.data;
    }
    v.responsavel = dados.responsavel.trim().into();
    gravar(&pasta_doc, &doc)?;
    atualizar_variaveis_abertas(&pasta_doc, &doc, indice)?;
    Ok(id_versao(documento, &nova_pasta))
}

/// Move uma pasta para `Documentos\EngLaTeX\Lixeira` com um nome livre.
fn para_lixeira(estado: &EstadoRef, origem: &Path, nome: &str) -> Resultado<()> {
    let lixeira = estado.pasta_dados.join("Lixeira");
    std::fs::create_dir_all(&lixeira).map_err(|e| e.to_string())?;
    let nome = limpar_nome(nome);
    let mut destino = lixeira.join(&nome);
    let mut n = 2;
    while destino.exists() {
        destino = lixeira.join(format!("{nome} ({n})"));
        n += 1;
    }
    std::fs::rename(origem, destino).map_err(|e| format!("Não foi possível mover para a Lixeira (algum arquivo está aberto?): {e}"))
}

/// Exclui o documento inteiro (vai para a Lixeira, com todas as revisões).
pub fn excluir(estado: &EstadoRef, documento: &str) -> Resultado<()> {
    let pasta_doc = pasta_documento(estado, documento)?;
    para_lixeira(estado, &pasta_doc, &format!("Documento - {documento}"))
}

/// Exclui uma revisão (vai para a Lixeira). A única revisão não pode ser
/// excluída: nesse caso exclua o documento.
pub fn excluir_versao(estado: &EstadoRef, documento: &str, pasta_versao: &str) -> Resultado<()> {
    let pasta_doc = pasta_documento(estado, documento)?;
    let mut doc = ler(&pasta_doc)?;
    let indice = doc.versoes.iter().position(|v| v.pasta == pasta_versao).ok_or("Essa revisão não existe mais.")?;
    if doc.versoes.len() == 1 {
        return Err("Esta é a única revisão do documento. Para apagá-la, exclua o documento inteiro.".into());
    }
    para_lixeira(estado, &pasta_doc.join(pasta_versao), &format!("{documento} - {pasta_versao}"))?;
    doc.versoes.remove(indice);
    gravar(&pasta_doc, &doc)
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

#[cfg(test)]
mod testes {
    use super::*;

    #[test]
    fn proxima_revisao_numeros_e_letras() {
        assert_eq!(proxima_revisao(""), "00");
        assert_eq!(proxima_revisao("00"), "01");
        assert_eq!(proxima_revisao("09"), "10");
        assert_eq!(proxima_revisao("9"), "10");
        assert_eq!(proxima_revisao("R3"), "R4");
        assert_eq!(proxima_revisao("1.2"), "1.3");
        assert_eq!(proxima_revisao("A"), "B");
        assert_eq!(proxima_revisao("Z"), "AA");
        assert_eq!(proxima_revisao("b"), "c");
        assert_eq!(proxima_revisao("final"), "final-1");
        assert_eq!(proxima_revisao("x-"), "x--1");
    }

    #[test]
    fn limpa_prefixo_rev() {
        assert_eq!(limpar_codigo("Rev. 01"), "01");
        assert_eq!(limpar_codigo("rev 2"), "2");
        assert_eq!(limpar_codigo("Revisão A"), "A");
        assert_eq!(limpar_codigo(" 03 "), "03");
        assert_eq!(limpar_codigo("Rev"), "Rev");
    }

    #[test]
    fn ids_de_revisao() {
        let id = id_versao("MC-001 Memorial", "Rev. 01");
        assert_eq!(id, "doc:MC-001 Memorial:Rev. 01");
        assert_eq!(separar_id(&id), Some(("MC-001 Memorial", "Rev. 01")));
        assert!(separar_id("Projeto qualquer").is_none());
        assert_eq!(nome_exibicao(&id), "MC-001 Memorial - Rev. 01");
    }

    #[test]
    fn datas() {
        assert_eq!(data_br("2026-11-25"), "25/11/2026");
        assert_eq!(data_br("ontem"), "ontem");
        assert_eq!(hoje().len(), 10);
    }

    #[test]
    fn tabela_escapa_texto() {
        let v = Versao { revisao: "01".into(), data: "2026-01-02".into(), descricao: "Ajuste de 10% & notas".into(), responsavel: "Eng. X".into(), ..Default::default() };
        let t = tabela_revisoes(&[v]);
        assert!(t.contains("01 & 02/01/2026 & Ajuste de 10\\% \\& notas & Eng. X"));
    }
}
