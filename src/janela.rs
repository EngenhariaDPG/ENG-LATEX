//! Janela nativa do programa, diálogos de arquivo e registro de erros.
//!
//! A janela é criada com `tao` (gerenciador de janelas) e o conteúdo é
//! desenhado com `wry` (WebView2 do Windows). Fora do Windows este módulo só
//! oferece o registro de erros; a janela e os diálogos não existem.

use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

// ---------------------------------------------------------------------------
// Registro de erros (arquivo englatex.log na pasta de dados)
// ---------------------------------------------------------------------------

static ARQUIVO_LOG: OnceLock<PathBuf> = OnceLock::new();

/// Define onde o registro do programa será gravado.
pub fn iniciar_log(pasta_dados: &Path) {
    let _ = std::fs::create_dir_all(pasta_dados);
    let _ = ARQUIVO_LOG.set(pasta_dados.join("englatex.log"));
}

/// Acrescenta uma linha ao registro do programa (útil para diagnosticar problemas).
pub fn registrar(msg: &str) {
    if let Some(caminho) = ARQUIVO_LOG.get() {
        // Se o registro passar de 1 MB, recomeça do zero.
        if std::fs::metadata(caminho).map(|m| m.len() > 1_000_000).unwrap_or(false) {
            let _ = std::fs::remove_file(caminho);
        }
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(caminho) {
            let segundos = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            let _ = writeln!(f, "[{segundos}] {msg}");
        }
    }
}

// ---------------------------------------------------------------------------
// Diálogos nativos de arquivo ("Salvar como" / "Abrir")
// ---------------------------------------------------------------------------

/// Abre a janela "Salvar como". Devolve o caminho escolhido (ou None se cancelar).
pub fn dialogo_salvar(nome_sugerido: &str, descricao: &str, extensao: &str) -> Option<PathBuf> {
    #[cfg(windows)]
    {
        let inicial = dirs::document_dir().unwrap_or_default();
        rfd::FileDialog::new()
            .set_title("Salvar como")
            .set_directory(inicial)
            .set_file_name(nome_sugerido)
            .add_filter(descricao, &[extensao])
            .save_file()
    }
    #[cfg(not(windows))]
    {
        // App Android: não há janela "Salvar como". O app define a variável
        // ENGLATEX_PASTA_EXPORTAR (ex.: /storage/emulated/0/Download/EngLaTeX)
        // e os arquivos vão direto para lá, sem sobrescrever os existentes.
        let _ = (descricao, extensao);
        let pasta = PathBuf::from(std::env::var_os("ENGLATEX_PASTA_EXPORTAR")?);
        std::fs::create_dir_all(&pasta).ok()?;
        let caminho = std::path::Path::new(nome_sugerido);
        let base = caminho.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let ext = caminho.extension().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let mut destino = pasta.join(nome_sugerido);
        let mut n = 2;
        while destino.exists() {
            destino = pasta.join(format!("{base} ({n}).{ext}"));
            n += 1;
        }
        Some(destino)
    }
}

/// Abre a janela "Abrir" para escolher um arquivo. Devolve o caminho (ou None).
pub fn dialogo_abrir(descricao: &str, extensoes: &[&str]) -> Option<PathBuf> {
    #[cfg(windows)]
    {
        rfd::FileDialog::new()
            .set_title("Abrir")
            .add_filter(descricao, extensoes)
            .pick_file()
    }
    #[cfg(not(windows))]
    {
        let _ = (descricao, extensoes);
        None
    }
}

// ---------------------------------------------------------------------------
// Janela principal
// ---------------------------------------------------------------------------

/// Ícone da janela (64x64 RGBA, gerado junto com o icone.ico).
#[cfg(windows)]
const ICONE_RGBA: &[u8] = include_bytes!("../recursos/icone64.rgba");

/// Cria a janela e roda o laço de eventos até ela ser fechada (não retorna).
#[cfg(windows)]
pub fn executar(url: &str, pasta_dados: &Path) {
    use tao::dpi::LogicalSize;
    use tao::event::{Event, WindowEvent};
    use tao::event_loop::{ControlFlow, EventLoop};
    use tao::window::{Icon, WindowBuilder};
    use wry::{WebContext, WebViewBuilder, WebViewBuilderExtWindows};

    let laco = EventLoop::new();
    let janela = WindowBuilder::new()
        .with_title("Eng LaTeX")
        .with_inner_size(LogicalSize::new(1400.0, 900.0))
        .with_min_inner_size(LogicalSize::new(800.0, 500.0))
        .with_window_icon(Icon::from_rgba(ICONE_RGBA.to_vec(), 64, 64).ok())
        .with_maximized(true)
        .build(&laco)
        .expect("não foi possível criar a janela");

    // Dados do WebView2 (cache, preferências) ficam na pasta de dados, não ao lado
    // do .exe: assim o programa funciona mesmo instalado em "Arquivos de Programas".
    let mut contexto = WebContext::new(Some(pasta_dados.join("webview2")));
    let base = url.to_string();
    let base_nav = base.clone();

    let resultado = WebViewBuilder::new_with_web_context(&mut contexto)
        .with_url(url)
        // Atalhos do navegador (F5, Ctrl+P, Ctrl+F do navegador...) desligados:
        // o programa tem os seus próprios.
        .with_browser_accelerator_keys(false)
        .with_devtools(cfg!(debug_assertions))
        // Links externos (ex.: \url{} no PDF) abrem no navegador padrão, não dentro do programa.
        .with_navigation_handler(move |destino| {
            if destino.starts_with(&base_nav) || destino.starts_with("about:") || destino.starts_with("blob:") {
                true
            } else {
                let _ = open::that(destino);
                false
            }
        })
        .with_new_window_req_handler(move |destino, _| {
            if !destino.starts_with(&base) {
                let _ = open::that(destino);
            }
            wry::NewWindowResponse::Deny
        })
        .build(&janela);

    let _webview = match resultado {
        Ok(w) => w,
        Err(e) => {
            registrar(&format!("Falha ao criar o WebView2: {e}"));
            let _ = rfd::MessageDialog::new()
                .set_title("Eng LaTeX")
                .set_description(
                    "Não foi possível iniciar o componente WebView2 do Windows.\n\n\
                     Instale o \"Microsoft Edge WebView2 Runtime\" (gratuito, site da Microsoft) e abra o programa de novo.",
                )
                .set_level(rfd::MessageLevel::Error)
                .show();
            std::process::exit(1);
        }
    };

    laco.run(move |evento, _, controle| {
        *controle = ControlFlow::Wait;
        if let Event::WindowEvent { event: WindowEvent::CloseRequested, .. } = evento {
            registrar("Janela fechada pelo usuário.");
            // Encerra tudo, inclusive o servidor interno e compilações em andamento.
            std::process::exit(0);
        }
    });
}

/// Fora do Windows não há janela (o programa roda só como servidor).
#[cfg(not(windows))]
pub fn executar(url: &str, _pasta_dados: &Path) {
    println!("Janela disponível apenas no Windows. Abra {url} num navegador para testar.");
    loop {
        std::thread::park();
    }
}
