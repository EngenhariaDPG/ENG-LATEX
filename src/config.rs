//! Configurações globais do programa, gravadas em `Documentos\EngLaTeX\config.json`.
//!
//! As configurações de cada projeto (arquivo principal, compilador) ficam
//! dentro da pasta do projeto, no arquivo `.englatex.json` (ver `projetos.rs`).

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Configurações gerais (valem para todos os projetos que não definirem as suas).
#[derive(Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Config {
    /// "auto", "tectonic", "latexmk" ou "direto".
    pub compilador_padrao: String,
    /// Motor TeX padrão: "pdflatex", "xelatex" ou "lualatex" (ignorado pelo Tectonic, que usa XeTeX).
    pub motor_padrao: String,
    /// Recompilar sozinho alguns segundos depois de parar de digitar.
    pub compilar_automatico: bool,
    /// Tamanho da fonte do editor, em pixels.
    pub tamanho_fonte: u32,
    /// Tema do editor: "claro" ou "escuro".
    pub tema: String,
    /// Ativar o corretor ortográfico no editor.
    pub corretor: bool,
    /// Idioma padrão do corretor (ex.: "pt_BR"); cada projeto pode escolher outro.
    pub idioma: String,
    /// Idioma da interface: "pt-BR", "en" ou "es".
    pub idioma_interface: String,
    /// Editor abre no modo visual (true) ou no modo código (false).
    pub modo_visual: bool,
    /// Quebrar linhas longas no editor.
    pub quebrar_linhas: bool,
    /// Caminho opcional para a pasta "bin" do MiKTeX/TeX Live (se não estiver no PATH).
    pub pasta_tex: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            compilador_padrao: "auto".into(),
            motor_padrao: "pdflatex".into(),
            compilar_automatico: false,
            tamanho_fonte: 14,
            tema: "claro".into(),
            corretor: true,
            idioma: "pt_BR".into(),
            idioma_interface: String::new(), // vazio = segue o idioma do Windows
            modo_visual: false,
            quebrar_linhas: true,
            pasta_tex: String::new(),
        }
    }
}

impl Config {
    fn caminho(pasta_dados: &Path) -> PathBuf {
        pasta_dados.join("config.json")
    }

    /// Lê o arquivo de configuração. Se não existir ou estiver corrompido, usa os padrões.
    pub fn carregar(pasta_dados: &Path) -> Self {
        std::fs::read_to_string(Self::caminho(pasta_dados))
            .ok()
            .and_then(|t| serde_json::from_str(&t).ok())
            .unwrap_or_default()
    }

    /// Grava o arquivo de configuração (formatado, para poder ser editado à mão).
    pub fn salvar(&self, pasta_dados: &Path) -> std::io::Result<()> {
        let texto = serde_json::to_string_pretty(self).unwrap_or_default();
        std::fs::write(Self::caminho(pasta_dados), texto)
    }
}
