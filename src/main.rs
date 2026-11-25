//! # Eng LaTeX
//!
//! Editor LaTeX offline no estilo do Overleaf, num único programa para Windows.
//!
//! Como funciona por dentro:
//! - Uma thread roda um pequeno servidor HTTP interno em `127.0.0.1` (só a
//!   própria máquina acessa; nada sai para a rede). Ele cuida dos projetos,
//!   da compilação, do corretor ortográfico etc.
//! - A thread principal abre a janela do programa. O conteúdo da janela é
//!   desenhado pelo WebView2 (componente que já vem no Windows 10/11, o mesmo
//!   usado pelo Teams e pelo Outlook novo), que conversa com o servidor interno.
//! - Fechar a janela encerra o programa.
//!
//! Módulos:
//! - [`api`]        rotas HTTP usadas pela interface
//! - [`projetos`]   projetos, arquivos, variáveis e modelos do usuário
//! - [`compilador`] localização dos compiladores, compilação e leitura do log
//! - [`synctex`]    ligação entre posição no PDF e linha do código
//! - [`ortografia`] corretor ortográfico (dicionários Hunspell)
//! - [`modelos`]    modelos de projeto prontos (artigo, memorial, laudo...)
//! - [`config`]     configurações globais gravadas em JSON
//! - [`historico`]  histórico de versões dos projetos
//! - [`janela`]     janela nativa, diálogos de arquivo e registro de erros

// No Windows (modo release) não abre a janela preta do console.
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

mod api;
mod compilador;
mod config;
mod historico;
mod janela;
mod modelos;
mod ortografia;
mod projetos;
mod synctex;

use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Estado compartilhado entre todas as requisições.
pub struct Estado {
    /// Pasta onde ficam os projetos (Documentos\EngLaTeX\Projetos).
    pub pasta_projetos: PathBuf,
    /// Pasta dos modelos criados pelo usuário (Documentos\EngLaTeX\Modelos).
    pub pasta_modelos: PathBuf,
    /// Pasta de dados do programa (Documentos\EngLaTeX).
    pub pasta_dados: PathBuf,
    /// Pasta onde está o .exe (tectonic.exe, dicionários e cache vêm junto).
    pub pasta_app: PathBuf,
    /// Configurações globais (compilador padrão, idioma...).
    pub config: Mutex<config::Config>,
    /// Projetos compilando agora (evita duas compilações simultâneas do mesmo projeto).
    pub compilando: Mutex<HashSet<String>>,
    /// Corretor ortográfico (dicionários carregados sob demanda).
    pub ortografia: ortografia::Ortografia,
}

pub type EstadoRef = Arc<Estado>;

/// Opções de linha de comando (usadas em testes e para uso avançado).
struct Opcoes {
    /// `--servidor`: não abre a janela, só o servidor (para testes).
    so_servidor: bool,
    /// `--porta N`: força uma porta específica.
    porta: u16,
    /// `--pasta CAMINHO`: usa outra pasta de dados no lugar de Documentos\EngLaTeX.
    pasta: Option<PathBuf>,
}

fn ler_opcoes() -> Opcoes {
    let mut op = Opcoes { so_servidor: !cfg!(windows), porta: 0, pasta: None };
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        match a.as_str() {
            "--servidor" => op.so_servidor = true,
            "--porta" => op.porta = args.next().and_then(|p| p.parse().ok()).unwrap_or(0),
            "--pasta" => op.pasta = args.next().map(PathBuf::from),
            _ => {}
        }
    }
    op
}

fn main() {
    let op = ler_opcoes();

    // ---------------------------------------------------------------
    // 1. Pastas do programa
    // ---------------------------------------------------------------
    let pasta_dados = op.pasta.clone().unwrap_or_else(|| {
        dirs::document_dir()
            .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")))
            .join("EngLaTeX")
    });
    let pasta_projetos = pasta_dados.join("Projetos");
    let pasta_modelos = pasta_dados.join("Modelos");
    let _ = std::fs::create_dir_all(&pasta_projetos);
    let _ = std::fs::create_dir_all(&pasta_modelos);

    let pasta_app = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));

    janela::iniciar_log(&pasta_dados);

    // ---------------------------------------------------------------
    // 2. Estado compartilhado
    // ---------------------------------------------------------------
    let estado: EstadoRef = Arc::new(Estado {
        config: Mutex::new(config::Config::carregar(&pasta_dados)),
        ortografia: ortografia::Ortografia::new(&pasta_app, &pasta_dados),
        pasta_projetos,
        pasta_modelos,
        pasta_dados: pasta_dados.clone(),
        pasta_app,
        compilando: Mutex::new(HashSet::new()),
    });

    // Na primeira execução cria um projeto de exemplo, para a tela não ficar vazia.
    projetos::criar_exemplo_se_vazio(&estado);

    // ---------------------------------------------------------------
    // 3. Servidor interno numa thread separada
    // ---------------------------------------------------------------
    let (envia_porta, recebe_porta) = std::sync::mpsc::channel::<u16>();
    let estado_servidor = estado.clone();
    let porta_pedida = op.porta;
    let servidor = std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("falha ao iniciar o tokio");
        rt.block_on(async move {
            // Porta 0 = o sistema escolhe uma livre (permite abrir vários Eng LaTeX ao mesmo tempo).
            let ouvinte = tokio::net::TcpListener::bind(("127.0.0.1", porta_pedida))
                .await
                .expect("não foi possível abrir a porta local");
            let porta = ouvinte.local_addr().map(|a| a.port()).unwrap_or(0);
            let _ = envia_porta.send(porta);
            axum::serve(ouvinte, api::rotas(estado_servidor))
                .await
                .expect("falha no servidor interno");
        });
    });

    let porta = recebe_porta.recv().expect("o servidor interno não iniciou");
    let url = format!("http://127.0.0.1:{porta}/");
    println!("Eng LaTeX rodando em {url}");
    janela::registrar(&format!("Iniciado em {url}"));

    // ---------------------------------------------------------------
    // 4. Janela do programa (fechar a janela encerra o processo)
    // ---------------------------------------------------------------
    if op.so_servidor {
        let _ = servidor.join();
    } else {
        janela::executar(&url, &pasta_dados);
    }
}
