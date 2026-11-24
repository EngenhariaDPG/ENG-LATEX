//! Histórico de versões do projeto.
//!
//! Cada versão é uma cópia dos arquivos de TEXTO do projeto (.tex, .bib,
//! .sty, ...) mais a configuração (com a tabela de variáveis), guardada em:
//!
//! ```text
//! <projeto>\.historico\<numero>\        arquivos da versão
//! <projeto>\.historico\<numero>.json    data, nome, se foi automática
//! ```
//!
//! - **Versões automáticas**: criadas ao compilar, no máximo uma a cada
//!   5 minutos e só se algo mudou. Ficam as 200 mais recentes.
//! - **Versões com nome** ("Rev. 01 enviada ao cliente"): criadas pelo
//!   usuário e nunca apagadas automaticamente.
//! - Antes de restaurar, o estado atual vira uma versão automática, então
//!   uma restauração sempre pode ser desfeita.
//!
//! Imagens e outros binários não entram no histórico (deixariam a pasta
//! enorme); como raramente mudam, isso não costuma fazer falta.

use crate::projetos::{self, Resultado};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// Pasta do histórico dentro do projeto (oculta na árvore de arquivos).
pub const PASTA_HISTORICO: &str = ".historico";
/// Intervalo mínimo entre versões automáticas, em segundos.
const INTERVALO_AUTOMATICO: u64 = 5 * 60;
/// Quantidade máxima de versões automáticas guardadas.
const MAX_AUTOMATICAS: usize = 200;
/// Arquivos de texto maiores que isso (bytes) não entram no histórico.
const TAMANHO_MAXIMO: u64 = 5_000_000;

/// Extensões consideradas "texto do projeto".
const EXTENSOES: &[&str] = &[
    "tex", "bib", "sty", "cls", "bst", "txt", "md", "csv", "dat", "ltx", "dtx", "def", "cfg",
    "clo", "lua", "tikz", "pgf", "bbx", "cbx", "ist", "json", "xml", "yaml", "yml",
];

/// Dados de uma versão (gravados no .json ao lado da pasta).
#[derive(Serialize, Deserialize, Clone)]
pub struct Versao {
    /// Número sequencial da versão (1, 2, 3...).
    pub numero: u64,
    /// Momento da criação (segundos desde 1970).
    pub data: u64,
    /// Nome dado pelo usuário (vazio nas automáticas).
    #[serde(default)]
    pub nome: String,
    /// Criada automaticamente (ao compilar ou antes de restaurar)?
    pub automatica: bool,
    /// Motivo, para exibição ("compilação", "antes de restaurar", "manual").
    #[serde(default)]
    pub motivo: String,
    /// Assinatura do conteúdo (detecta se algo mudou desde a versão anterior).
    #[serde(default)]
    pub assinatura: u64,
    /// Quantidade de arquivos na versão.
    #[serde(default)]
    pub arquivos: usize,
}

/// Arquivo de uma versão, comparado com o projeto atual.
#[derive(Serialize)]
pub struct ArquivoVersao {
    pub caminho: String,
    /// "igual", "alterado", "removido" (existe na versão mas não no projeto) ou
    /// "novo" (existe no projeto mas não na versão).
    pub situacao: String,
}

fn agora() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

fn pasta(raiz: &Path) -> PathBuf {
    raiz.join(PASTA_HISTORICO)
}

/// Lê os arquivos de texto atuais do projeto: caminho relativo -> conteúdo.
/// Inclui a configuração do projeto (tabela de variáveis).
fn arquivos_atuais(raiz: &Path) -> BTreeMap<String, Vec<u8>> {
    let mut mapa = BTreeMap::new();
    for item in projetos::listar_arvore(raiz) {
        if item.pasta || item.tamanho > TAMANHO_MAXIMO {
            continue;
        }
        let ext = item.caminho.rsplit('.').next().unwrap_or("").to_lowercase();
        if !EXTENSOES.contains(&ext.as_str()) {
            continue;
        }
        if let Ok(dados) = std::fs::read(raiz.join(&item.caminho)) {
            mapa.insert(item.caminho, dados);
        }
    }
    if let Ok(cfg) = std::fs::read(raiz.join(projetos::ARQUIVO_CONFIG)) {
        mapa.insert(projetos::ARQUIVO_CONFIG.to_string(), cfg);
    }
    mapa
}

/// Assinatura simples (FNV-1a) do conjunto de arquivos.
fn assinatura(arquivos: &BTreeMap<String, Vec<u8>>) -> u64 {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    let mut misturar = |b: &[u8]| {
        for x in b {
            h ^= *x as u64;
            h = h.wrapping_mul(0x0100_0000_01b3);
        }
    };
    for (c, d) in arquivos {
        misturar(c.as_bytes());
        misturar(&[0]);
        misturar(d);
        misturar(&[0xff]);
    }
    h
}

/// Lista as versões, da mais nova para a mais antiga.
pub fn listar(raiz: &Path) -> Vec<Versao> {
    let mut v: Vec<Versao> = std::fs::read_dir(pasta(raiz))
        .map(|rd| {
            rd.flatten()
                .filter(|e| e.path().extension().map(|x| x == "json").unwrap_or(false))
                .filter_map(|e| std::fs::read_to_string(e.path()).ok())
                .filter_map(|t| serde_json::from_str::<Versao>(&t).ok())
                .collect()
        })
        .unwrap_or_default();
    v.sort_by(|a, b| b.numero.cmp(&a.numero));
    v
}

/// Cria uma versão. Devolve None se nada mudou desde a última versão
/// (exceto quando `forcar` é verdadeiro, usado nas versões com nome).
pub fn criar(raiz: &Path, nome: &str, automatica: bool, motivo: &str, forcar: bool) -> Resultado<Option<Versao>> {
    let arquivos = arquivos_atuais(raiz);
    if arquivos.is_empty() {
        return Ok(None);
    }
    let sig = assinatura(&arquivos);
    let versoes = listar(raiz);
    if let Some(ultima) = versoes.first() {
        if !forcar && ultima.assinatura == sig {
            return Ok(None); // nada mudou
        }
        // Mesmo conteúdo da última e é só para dar nome: renomeia a última em vez de duplicar.
        if forcar && ultima.assinatura == sig && !nome.is_empty() {
            return renomear(raiz, ultima.numero, nome).map(Some);
        }
    }
    let numero = versoes.first().map(|v| v.numero + 1).unwrap_or(1);
    let destino = pasta(raiz).join(numero.to_string());
    std::fs::create_dir_all(&destino).map_err(|e| e.to_string())?;
    for (rel, dados) in &arquivos {
        let alvo = destino.join(rel);
        if let Some(pai) = alvo.parent() {
            std::fs::create_dir_all(pai).map_err(|e| e.to_string())?;
        }
        std::fs::write(alvo, dados).map_err(|e| e.to_string())?;
    }
    let versao = Versao {
        numero,
        data: agora(),
        nome: nome.trim().to_string(),
        automatica,
        motivo: motivo.into(),
        assinatura: sig,
        arquivos: arquivos.len(),
    };
    gravar_meta(raiz, &versao)?;
    limpar_antigas(raiz);
    Ok(Some(versao))
}

fn gravar_meta(raiz: &Path, v: &Versao) -> Resultado<()> {
    let txt = serde_json::to_string_pretty(v).unwrap_or_default();
    std::fs::write(pasta(raiz).join(format!("{}.json", v.numero)), txt).map_err(|e| e.to_string())
}

/// Versão automática ao compilar: só se passou o intervalo mínimo desde a última.
pub fn automatica_ao_compilar(raiz: &Path) {
    let versoes = listar(raiz);
    if let Some(ultima) = versoes.first() {
        if agora().saturating_sub(ultima.data) < INTERVALO_AUTOMATICO {
            return;
        }
    }
    let _ = criar(raiz, "", true, "compilação", false);
}

/// Apaga versões automáticas antigas além do limite (as com nome ficam sempre).
fn limpar_antigas(raiz: &Path) {
    let automaticas: Vec<Versao> = listar(raiz).into_iter().filter(|v| v.automatica && v.nome.is_empty()).collect();
    for v in automaticas.iter().skip(MAX_AUTOMATICAS) {
        let _ = excluir(raiz, v.numero);
    }
}

/// Dá (ou troca) o nome de uma versão. Versões com nome não são apagadas automaticamente.
pub fn renomear(raiz: &Path, numero: u64, nome: &str) -> Resultado<Versao> {
    let mut v = listar(raiz)
        .into_iter()
        .find(|v| v.numero == numero)
        .ok_or("Versão não encontrada.")?;
    v.nome = nome.trim().to_string();
    gravar_meta(raiz, &v)?;
    Ok(v)
}

pub fn excluir(raiz: &Path, numero: u64) -> Resultado<()> {
    let p = pasta(raiz);
    let _ = std::fs::remove_dir_all(p.join(numero.to_string()));
    std::fs::remove_file(p.join(format!("{numero}.json"))).map_err(|e| e.to_string())
}

/// Lista os arquivos de uma versão e compara cada um com o projeto atual.
pub fn arquivos(raiz: &Path, numero: u64) -> Resultado<Vec<ArquivoVersao>> {
    let base = pasta(raiz).join(numero.to_string());
    if !base.is_dir() {
        return Err("Versão não encontrada.".into());
    }
    let atuais = arquivos_atuais(raiz);
    let mut da_versao = BTreeMap::new();
    for item in projetos::listar_arvore(&base) {
        if !item.pasta {
            if let Ok(d) = std::fs::read(base.join(&item.caminho)) {
                da_versao.insert(item.caminho, d);
            }
        }
    }
    // A configuração (oculta na listagem) também faz parte da versão.
    if let Ok(cfg) = std::fs::read(base.join(projetos::ARQUIVO_CONFIG)) {
        da_versao.insert(projetos::ARQUIVO_CONFIG.to_string(), cfg);
    }
    let mut saida = Vec::new();
    for (c, d) in &da_versao {
        let situacao = match atuais.get(c) {
            Some(a) if a == d => "igual",
            Some(_) => "alterado",
            None => "removido",
        };
        saida.push(ArquivoVersao { caminho: c.clone(), situacao: situacao.into() });
    }
    for c in atuais.keys() {
        if !da_versao.contains_key(c) && c != projetos::ARQUIVO_CONFIG {
            saida.push(ArquivoVersao { caminho: c.clone(), situacao: "novo".into() });
        }
    }
    // Alterados primeiro, depois removidos, novos e iguais.
    saida.sort_by_key(|a| {
        (match a.situacao.as_str() { "alterado" => 0, "removido" => 1, "novo" => 2, _ => 3 }, a.caminho.clone())
    });
    // A configuração interna aparece só se mudou (mostra mudanças nas variáveis).
    saida.retain(|a| a.caminho != projetos::ARQUIVO_CONFIG || a.situacao == "alterado");
    Ok(saida)
}

/// Conteúdo de um arquivo numa versão.
pub fn ler_arquivo(raiz: &Path, numero: u64, rel: &str) -> Resultado<Vec<u8>> {
    let rel = projetos::validar_relativo(rel)?;
    std::fs::read(pasta(raiz).join(numero.to_string()).join(rel)).map_err(|_| "Arquivo não existe nesta versão.".into())
}

/// Restaura um arquivo (ou o projeto todo, se `rel` for None) para a versão indicada.
/// Antes, o estado atual é guardado como versão automática.
pub fn restaurar(raiz: &Path, numero: u64, rel: Option<&str>) -> Resultado<()> {
    let base = pasta(raiz).join(numero.to_string());
    if !base.is_dir() {
        return Err("Versão não encontrada.".into());
    }
    criar(raiz, "", true, "antes de restaurar", false)?;

    let copiar = |r: &str| -> Resultado<()> {
        let origem = base.join(projetos::validar_relativo(r)?);
        let destino = raiz.join(projetos::validar_relativo(r)?);
        if let Some(pai) = destino.parent() {
            std::fs::create_dir_all(pai).map_err(|e| e.to_string())?;
        }
        std::fs::copy(&origem, &destino).map(|_| ()).map_err(|e| e.to_string())
    };

    match rel {
        Some(r) => copiar(r)?,
        None => {
            // Projeto inteiro: copia os arquivos da versão e remove os arquivos de
            // texto que não existiam nela (imagens e outros binários ficam intactos).
            let da_versao: Vec<String> = projetos::listar_arvore(&base)
                .into_iter()
                .filter(|i| !i.pasta)
                .map(|i| i.caminho)
                .collect();
            for c in &da_versao {
                copiar(c)?;
            }
            // .englatex.json fica oculto na listagem: copia separado.
            if base.join(projetos::ARQUIVO_CONFIG).is_file() {
                copiar(projetos::ARQUIVO_CONFIG)?;
            }
            for c in arquivos_atuais(raiz).keys() {
                if c != projetos::ARQUIVO_CONFIG && !da_versao.contains(c) {
                    let _ = std::fs::remove_file(raiz.join(c));
                }
            }
        }
    }
    projetos::gerar_variaveis(raiz)
}
