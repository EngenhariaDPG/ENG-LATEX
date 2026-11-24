//! Corretor ortográfico.
//!
//! Usa dicionários no formato Hunspell (.aff + .dic), o mesmo do LibreOffice,
//! do Firefox e do próprio Overleaf. A verificação é feita pela biblioteca
//! `spellbook` (implementação em Rust compatível com o Hunspell).
//!
//! Onde ficam os dicionários:
//! - `dicionarios\` ao lado do EngLaTeX.exe: os que vêm com o programa (pt_BR e en_US);
//! - `Documentos\EngLaTeX\dicionarios\`: os baixados pelo programa (outros idiomas).
//!
//! Dicionário pessoal: `Documentos\EngLaTeX\dicionario-pessoal.txt`
//! (uma palavra por linha; pode ser editado à mão).

use serde::Serialize;
use spellbook::Dictionary;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

/// Monta o endereço de um arquivo do repositório de dicionários do LibreOffice.
macro_rules! libreoffice {
    ($c:literal) => {
        concat!("https://raw.githubusercontent.com/LibreOffice/dictionaries/master/", $c)
    };
}
/// Monta o endereço de um arquivo da coleção "wooorm/dictionaries".
macro_rules! wooorm {
    ($c:literal) => {
        concat!("https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/", $c)
    };
}

/// Um idioma conhecido pelo programa e de onde baixar o dicionário.
pub struct Idioma {
    pub id: &'static str,
    pub nome: &'static str,
    pub url_aff: &'static str,
    pub url_dic: &'static str,
}

/// Catálogo de idiomas. Fontes: repositório oficial de dicionários do
/// LibreOffice e a coleção "wooorm/dictionaries" (ambos públicos no GitHub).
/// Para acrescentar um idioma, basta incluir uma linha aqui.
pub const CATALOGO: &[Idioma] = &[
    Idioma { id: "pt_BR", nome: "Português (Brasil)", url_aff: libreoffice!("pt_BR/pt_BR.aff"), url_dic: libreoffice!("pt_BR/pt_BR.dic") },
    Idioma { id: "en_US", nome: "Inglês (EUA)", url_aff: libreoffice!("en/en_US.aff"), url_dic: libreoffice!("en/en_US.dic") },
    Idioma { id: "pt_PT", nome: "Português (Portugal)", url_aff: libreoffice!("pt_PT/pt_PT.aff"), url_dic: libreoffice!("pt_PT/pt_PT.dic") },
    Idioma { id: "en_GB", nome: "Inglês (Reino Unido)", url_aff: libreoffice!("en/en_GB.aff"), url_dic: libreoffice!("en/en_GB.dic") },
    Idioma { id: "es_ES", nome: "Espanhol", url_aff: libreoffice!("es/es_ES.aff"), url_dic: libreoffice!("es/es_ES.dic") },
    Idioma { id: "fr_FR", nome: "Francês", url_aff: wooorm!("fr/index.aff"), url_dic: wooorm!("fr/index.dic") },
    Idioma { id: "de_DE", nome: "Alemão", url_aff: libreoffice!("de/de_DE_frami.aff"), url_dic: libreoffice!("de/de_DE_frami.dic") },
    Idioma { id: "it_IT", nome: "Italiano", url_aff: libreoffice!("it_IT/it_IT.aff"), url_dic: libreoffice!("it_IT/it_IT.dic") },
];

/// Situação de um idioma para a tela de configurações.
#[derive(Serialize)]
pub struct InfoIdioma {
    pub id: String,
    pub nome: String,
    pub instalado: bool,
}

/// Gerenciador dos dicionários.
pub struct Ortografia {
    /// Pastas onde procurar dicionários (a do programa primeiro).
    pastas: Vec<PathBuf>,
    /// Pasta onde gravar dicionários baixados.
    pasta_download: PathBuf,
    /// Dicionários já carregados na memória (carregar o pt_BR leva ~0,5 s).
    carregados: Mutex<HashMap<String, Arc<Dictionary>>>,
    /// Palavras do dicionário pessoal (em minúsculas).
    pessoal: Mutex<HashSet<String>>,
    arquivo_pessoal: PathBuf,
}

impl Ortografia {
    pub fn new(pasta_app: &Path, pasta_dados: &Path) -> Self {
        let arquivo_pessoal = pasta_dados.join("dicionario-pessoal.txt");
        let pessoal = std::fs::read_to_string(&arquivo_pessoal)
            .unwrap_or_default()
            .lines()
            .map(|l| l.trim().to_lowercase())
            .filter(|l| !l.is_empty())
            .collect();
        Self {
            pastas: vec![pasta_app.join("dicionarios"), pasta_dados.join("dicionarios")],
            pasta_download: pasta_dados.join("dicionarios"),
            carregados: Mutex::new(HashMap::new()),
            pessoal: Mutex::new(pessoal),
            arquivo_pessoal,
        }
    }

    /// Procura os arquivos .aff e .dic de um idioma.
    fn localizar(&self, id: &str) -> Option<(PathBuf, PathBuf)> {
        self.pastas.iter().find_map(|p| {
            let aff = p.join(format!("{id}.aff"));
            let dic = p.join(format!("{id}.dic"));
            (aff.is_file() && dic.is_file()).then_some((aff, dic))
        })
    }

    /// Lista os idiomas do catálogo e se já estão instalados.
    pub fn idiomas(&self) -> Vec<InfoIdioma> {
        CATALOGO
            .iter()
            .map(|i| InfoIdioma { id: i.id.into(), nome: i.nome.into(), instalado: self.localizar(i.id).is_some() })
            .collect()
    }

    /// Carrega (ou devolve do cache) o dicionário de um idioma.
    fn dicionario(&self, id: &str) -> Result<Arc<Dictionary>, String> {
        if let Some(d) = self.carregados.lock().unwrap().get(id) {
            return Ok(d.clone());
        }
        let (aff, dic) = self
            .localizar(id)
            .ok_or_else(|| format!("Dicionário \"{id}\" não instalado. Baixe-o em Configurações."))?;
        let aff = std::fs::read(aff).map_err(|e| e.to_string())?;
        let dic = std::fs::read(dic).map_err(|e| e.to_string())?;
        let (aff, dic) = converter_para_utf8(&aff, &dic);
        let d = Dictionary::new(&aff, &dic).map_err(|e| format!("Dicionário \"{id}\" inválido: {e}"))?;
        let d = Arc::new(d);
        self.carregados.lock().unwrap().insert(id.to_string(), d.clone());
        Ok(d)
    }

    /// Verifica uma palavra (considerando o dicionário pessoal e palavras compostas com hífen).
    fn correta(&self, d: &Dictionary, pessoal: &HashSet<String>, palavra: &str) -> bool {
        if pessoal.contains(&palavra.to_lowercase()) || d.check(palavra) {
            return true;
        }
        // "guarda-corpo": se a palavra inteira não existir, aceita se todas as partes existirem.
        if palavra.contains('-') {
            return palavra
                .split('-')
                .filter(|p| !p.is_empty())
                .all(|p| pessoal.contains(&p.to_lowercase()) || d.check(p));
        }
        false
    }

    /// Devolve, da lista recebida, as palavras que não estão no dicionário.
    ///
    /// `extras`: outros idiomas aceitos ao mesmo tempo (a palavra é aceita se
    /// existir em qualquer um). Extras não instalados são ignorados; o
    /// idioma principal precisa estar instalado.
    pub fn verificar(&self, idioma: &str, extras: &[String], palavras: &[String]) -> Result<Vec<String>, String> {
        let mut dicionarios = vec![self.dicionario(idioma)?];
        for e in extras {
            if e != idioma {
                if let Ok(d) = self.dicionario(e) {
                    dicionarios.push(d);
                }
            }
        }
        let pessoal = self.pessoal.lock().unwrap().clone();
        Ok(palavras
            .iter()
            .filter(|p| !dicionarios.iter().any(|d| self.correta(d, &pessoal, p)))
            .cloned()
            .collect())
    }

    /// Sugestões de correção para uma palavra (no máximo 8).
    pub fn sugerir(&self, idioma: &str, palavra: &str) -> Result<Vec<String>, String> {
        let d = self.dicionario(idioma)?;
        let mut saida = Vec::new();
        d.suggest(palavra, &mut saida);
        // Sugestões que separam a palavra em duas ("e strutrua") vão para o fim da lista.
        saida.sort_by_key(|s| s.contains(' '));
        saida.truncate(8);
        Ok(saida)
    }

    /// Acrescenta uma palavra ao dicionário pessoal (vale para todos os idiomas).
    pub fn adicionar(&self, palavra: &str) -> Result<(), String> {
        let palavra = palavra.trim();
        if palavra.is_empty() {
            return Ok(());
        }
        let mut pessoal = self.pessoal.lock().unwrap();
        if pessoal.insert(palavra.to_lowercase()) {
            use std::io::Write;
            let mut f = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&self.arquivo_pessoal)
                .map_err(|e| e.to_string())?;
            writeln!(f, "{palavra}").map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    /// Baixa o dicionário de um idioma do catálogo (função bloqueante: chamar
    /// numa thread separada). Precisa de internet só neste momento.
    pub fn baixar(&self, id: &str) -> Result<(), String> {
        let idioma = CATALOGO
            .iter()
            .find(|i| i.id == id)
            .ok_or("Idioma desconhecido.")?;
        std::fs::create_dir_all(&self.pasta_download).map_err(|e| e.to_string())?;
        let aff = baixar_arquivo(idioma.url_aff)?;
        let dic = baixar_arquivo(idioma.url_dic)?;
        // Confere se o conteúdo é mesmo um dicionário antes de gravar.
        if !String::from_utf8_lossy(&dic[..dic.len().min(200)]).trim_start().starts_with(|c: char| c.is_ascii_digit()) {
            return Err("O arquivo baixado não parece um dicionário Hunspell.".into());
        }
        std::fs::write(self.pasta_download.join(format!("{id}.aff")), aff).map_err(|e| e.to_string())?;
        std::fs::write(self.pasta_download.join(format!("{id}.dic")), dic).map_err(|e| e.to_string())?;
        // Descarta versão antiga em memória (se houver).
        self.carregados.lock().unwrap().remove(id);
        Ok(())
    }
}

/// Baixa um arquivo (até 60 MB).
fn baixar_arquivo(url: &str) -> Result<Vec<u8>, String> {
    let mut resp = ureq::get(url)
        .call()
        .map_err(|e| format!("Falha ao baixar o dicionário (verifique a internet): {e}"))?;
    resp.body_mut()
        .with_config()
        .limit(60 * 1024 * 1024)
        .read_to_vec()
        .map_err(|e| format!("Falha ao baixar o dicionário: {e}"))
}

/// Dicionários antigos usam ISO-8859-1 (indicado na linha "SET" do .aff).
/// A biblioteca exige UTF-8, então convertemos ao carregar.
fn converter_para_utf8(aff: &[u8], dic: &[u8]) -> (String, String) {
    // Lê a codificação declarada na linha "SET ..." do .aff.
    let cabecalho = String::from_utf8_lossy(&aff[..aff.len().min(4000)]);
    let declarada = cabecalho
        .lines()
        .find_map(|l| l.trim().strip_prefix("SET "))
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "UTF-8".into());
    let rotulo = declarada.to_uppercase().replace("ISO8859", "ISO-8859").replace("MICROSOFT-CP", "WINDOWS-");
    let codificacao = encoding_rs::Encoding::for_label(rotulo.as_bytes()).unwrap_or(encoding_rs::UTF_8);

    let decodificar = |b: &[u8]| -> String {
        let (t, _, _) = codificacao.decode(b);
        // Remove a marca BOM, se houver.
        t.trim_start_matches('\u{feff}').to_string()
    };
    let mut aff_txt = decodificar(aff);
    let dic_txt = decodificar(dic);
    if codificacao != encoding_rs::UTF_8 {
        // Atualiza a linha SET para o texto já convertido.
        aff_txt = aff_txt
            .lines()
            .map(|l| if l.trim_start().starts_with("SET ") { "SET UTF-8" } else { l })
            .collect::<Vec<_>>()
            .join("\n");
    }
    (aff_txt, dic_txt)
}
