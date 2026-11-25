//! Rotas HTTP usadas pela interface.
//!
//! Todas as rotas da API começam com `/api/`. O resto é servido a partir dos
//! arquivos da interface embutidos no executável (pasta `web/dist`).
//!
//! Resumo das rotas:
//! ```text
//! GET    /api/ping                         identifica o servidor
//! GET    /api/config  | PUT /api/config    configurações globais
//! GET    /api/compiladores                 compiladores encontrados no PC
//! GET    /api/modelos                      modelos prontos + modelos do usuário
//! DELETE /api/modelos-usuario/:nome        excluir modelo do usuário
//! POST   /api/importar-dialogo             escolher um .zip pela janela "Abrir" e importar
//! GET    /api/projetos                     lista de projetos
//! POST   /api/projetos                     criar {nome, modelo}
//! POST   /api/importar?nome=               importar .zip (corpo = bytes do zip)
//! POST   /api/p/:id/renomear               {nome}
//! POST   /api/p/:id/duplicar
//! DELETE /api/p/:id                        move para a Lixeira
//! GET    /api/p/:id/arvore                 árvore de arquivos + configuração
//! GET    /api/p/:id/arquivo?caminho=       conteúdo bruto do arquivo
//! PUT    /api/p/:id/arquivo?caminho=       gravar (corpo = conteúdo)
//! POST   /api/p/:id/item                   criar {caminho, pasta}
//! POST   /api/p/:id/mover                  {de, para}
//! DELETE /api/p/:id/arquivo?caminho=       excluir arquivo/pasta
//! PUT    /api/p/:id/config                 configuração do projeto
//! POST   /api/p/:id/compilar               compila e devolve erros/avisos
//! GET    /api/p/:id/pdf                    PDF compilado
//! GET    /api/p/:id/zip                    baixar projeto em .zip
//! GET    /api/p/:id/referencias            rótulos e citações (autocompletar)
//! GET    /api/p/:id/synctex/inversa?pagina=&x=&y=
//! GET    /api/p/:id/synctex/direta?arquivo=&linha=
//! POST   /api/p/:id/abrir-pasta            abre a pasta do projeto no Explorer
//! POST   /api/p/:id/salvar-pdf             "Salvar como" do PDF (janela nativa)
//! POST   /api/p/:id/salvar-zip             "Salvar como" do projeto em .zip
//! POST   /api/p/:id/salvar-modelo          {nome} salva o projeto como modelo
//! PUT    /api/p/:id/variaveis              grava a tabela de variáveis
//! POST   /api/p/:id/variaveis/incluir      insere \input{variaveis} no arquivo principal
//! GET    /api/p/:id/historico                   versões (mais nova primeiro)
//! POST   /api/p/:id/historico                   {nome} cria uma versão com nome
//! GET    /api/p/:id/historico/:n/arquivos       arquivos da versão comparados com o atual
//! GET    /api/p/:id/historico/:n/arquivo?caminho=
//! POST   /api/p/:id/historico/:n/restaurar      {caminho?} restaura um arquivo ou tudo
//! PUT    /api/p/:id/historico/:n                {nome} renomeia
//! DELETE /api/p/:id/historico/:n
//! GET    /api/documentos                        documentação técnica: lista de documentos
//! POST   /api/documentos                        criar {nome, cliente, descricao, modelo, versao:{...}}
//! GET    /api/documentos/:doc                   documento com todas as revisões
//! PUT    /api/documentos/:doc                   {nome, cliente, descricao} (renomeia a pasta se o nome mudar)
//! DELETE /api/documentos/:doc                   move o documento inteiro para a Lixeira
//! POST   /api/documentos/:doc/versoes           nova revisão {origem, revisao, descricao, status, data, responsavel}
//! PUT    /api/documentos/:doc/versoes/:ver      altera os dados da revisão (mesmos campos)
//! DELETE /api/documentos/:doc/versoes/:ver      move a revisão para a Lixeira
//!        (cada revisão abre no editor como o projeto "doc:<doc>:<ver>", usando as rotas /api/p/:id)
//! GET    /api/doi?doi=10.xxxx/yyy            dados BibTeX de um DOI (precisa de internet)
//! GET    /api/ortografia/idiomas           idiomas disponíveis/instalados
//! POST   /api/ortografia/verificar         {idioma, palavras} -> palavras erradas
//! GET    /api/ortografia/sugerir?idioma=&palavra=
//! POST   /api/ortografia/adicionar         {palavra} -> dicionário pessoal
//! POST   /api/ortografia/baixar            {id} baixa o dicionário de um idioma
//! ```

use crate::{compilador, documentacao, historico, modelos, projetos, synctex, EstadoRef};
use axum::{
    body::{Body, Bytes},
    extract::{DefaultBodyLimit, Path, Query, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post, put},
    Json, Router,
};
use rust_embed::RustEmbed;
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;

/// Arquivos da interface, embutidos no .exe durante a compilação.
#[derive(RustEmbed)]
#[folder = "web/dist/"]
struct Interface;

/// Limite de tamanho dos envios (imagens, .zip importados): 300 MB.
const LIMITE_ENVIO: usize = 300 * 1024 * 1024;

/// Monta o roteador com todas as rotas.
pub fn rotas(estado: EstadoRef) -> Router {
    Router::new()
        .route("/api/ping", get(|| async { Json(json!({"app": "eng-latex", "versao": env!("CARGO_PKG_VERSION")})) }))
        .route("/api/config", get(ler_config).put(gravar_config))
        .route("/api/compiladores", get(compiladores))
        .route("/api/modelos", get(listar_modelos))
        .route("/api/modelos-usuario/:nome", axum::routing::delete(excluir_modelo))
        .route("/api/importar-dialogo", post(importar_dialogo))
        .route("/api/projetos", get(listar).post(criar))
        .route("/api/importar", post(importar))
        .route("/api/p/:id", axum::routing::delete(excluir_projeto))
        .route("/api/p/:id/renomear", post(renomear))
        .route("/api/p/:id/duplicar", post(duplicar))
        .route("/api/p/:id/arvore", get(arvore))
        .route("/api/p/:id/arquivo", get(ler_arquivo).put(gravar_arquivo).delete(excluir_item))
        .route("/api/p/:id/item", post(criar_item))
        .route("/api/p/:id/mover", post(mover))
        .route("/api/p/:id/config", put(config_projeto))
        .route("/api/p/:id/compilar", post(compilar))
        .route("/api/p/:id/pdf", get(pdf))
        .route("/api/p/:id/zip", get(zip))
        .route("/api/p/:id/referencias", get(referencias))
        .route("/api/p/:id/synctex/inversa", get(synctex_inversa))
        .route("/api/p/:id/synctex/direta", get(synctex_direta))
        .route("/api/p/:id/abrir-pasta", post(abrir_pasta))
        .route("/api/p/:id/salvar-pdf", post(salvar_pdf))
        .route("/api/p/:id/salvar-zip", post(salvar_zip))
        .route("/api/p/:id/salvar-modelo", post(salvar_modelo))
        .route("/api/p/:id/variaveis", put(gravar_variaveis))
        .route("/api/p/:id/variaveis/incluir", post(incluir_variaveis))
        .route("/api/p/:id/historico", get(historico_listar).post(historico_criar))
        .route("/api/p/:id/historico/:n", put(historico_renomear).delete(historico_excluir))
        .route("/api/p/:id/historico/:n/arquivos", get(historico_arquivos))
        .route("/api/p/:id/historico/:n/arquivo", get(historico_arquivo))
        .route("/api/p/:id/historico/:n/restaurar", post(historico_restaurar))
        .route("/api/documentos", get(documentos_listar).post(documentos_criar))
        .route("/api/documentos/:doc", get(documentos_detalhar).put(documentos_editar).delete(documentos_excluir))
        .route("/api/documentos/:doc/versoes", post(versoes_criar))
        .route("/api/documentos/:doc/versoes/:ver", put(versoes_editar).delete(versoes_excluir))
        .route("/api/doi", get(buscar_doi))
        .route("/api/ortografia/idiomas", get(idiomas))
        .route("/api/ortografia/verificar", post(verificar_ortografia))
        .route("/api/ortografia/sugerir", get(sugerir_ortografia))
        .route("/api/ortografia/adicionar", post(adicionar_palavra))
        .route("/api/ortografia/baixar", post(baixar_dicionario))
        .fallback(get(arquivo_interface))
        .layer(DefaultBodyLimit::max(LIMITE_ENVIO))
        .with_state(estado)
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

/// Converte um erro em resposta HTTP 400 com a mensagem em JSON.
fn erro(msg: impl Into<String>) -> Response {
    (StatusCode::BAD_REQUEST, Json(json!({"erro": msg.into()}))).into_response()
}

/// Resposta padrão de sucesso.
fn ok() -> Response {
    Json(json!({"ok": true})).into_response()
}

/// Converte `Resultado<T>` em resposta JSON.
fn responder<T: serde::Serialize>(r: projetos::Resultado<T>) -> Response {
    match r {
        Ok(v) => Json(v).into_response(),
        Err(e) => erro(e),
    }
}

#[derive(Deserialize)]
struct QCaminho {
    caminho: String,
}

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------

async fn ler_config(State(e): State<EstadoRef>) -> Response {
    let cfg = e.config.lock().await.clone();
    Json(json!({
        "config": cfg,
        "pasta_projetos": e.pasta_projetos.display().to_string(),
        "versao": env!("CARGO_PKG_VERSION"),
    }))
    .into_response()
}

async fn gravar_config(State(e): State<EstadoRef>, Json(nova): Json<crate::config::Config>) -> Response {
    let mut cfg = e.config.lock().await;
    *cfg = nova;
    match cfg.salvar(&e.pasta_dados) {
        Ok(_) => ok(),
        Err(err) => erro(format!("Não foi possível salvar as configurações: {err}")),
    }
}

async fn compiladores(State(e): State<EstadoRef>) -> Response {
    Json(compilador::disponiveis(&e).await).into_response()
}

// ---------------------------------------------------------------------------
// Projetos
// ---------------------------------------------------------------------------

async fn listar(State(e): State<EstadoRef>) -> Response {
    Json(projetos::listar_projetos(&e)).into_response()
}

#[derive(Deserialize)]
struct NovoProjeto {
    nome: String,
    modelo: String,
}

async fn criar(State(e): State<EstadoRef>, Json(n): Json<NovoProjeto>) -> Response {
    responder(projetos::criar_projeto(&e, &n.nome, &n.modelo).map(|id| json!({"id": id})))
}

#[derive(Deserialize)]
struct QNome {
    nome: String,
}

async fn importar(State(e): State<EstadoRef>, Query(q): Query<QNome>, corpo: Bytes) -> Response {
    let nome = q.nome.trim_end_matches(".zip").to_string();
    responder(projetos::importar_zip(&e, &nome, corpo.to_vec()).map(|id| json!({"id": id})))
}

async fn renomear(State(e): State<EstadoRef>, Path(id): Path<String>, Json(n): Json<QNome>) -> Response {
    responder(projetos::renomear_projeto(&e, &id, &n.nome).map(|id| json!({"id": id})))
}

async fn duplicar(State(e): State<EstadoRef>, Path(id): Path<String>) -> Response {
    responder(projetos::duplicar_projeto(&e, &id).map(|id| json!({"id": id})))
}

async fn excluir_projeto(State(e): State<EstadoRef>, Path(id): Path<String>) -> Response {
    responder(projetos::excluir_projeto(&e, &id).map(|_| json!({"ok": true})))
}

// ---------------------------------------------------------------------------
// Arquivos do projeto
// ---------------------------------------------------------------------------

async fn arvore(State(e): State<EstadoRef>, Path(id): Path<String>) -> Response {
    let pasta = match projetos::pasta_projeto(&e, &id) {
        Ok(p) => p,
        Err(m) => return erro(m),
    };
    let cfg = projetos::ler_config(&pasta);
    Json(json!({
        "itens": projetos::listar_arvore(&pasta),
        "principal": projetos::arquivo_principal(&pasta),
        "variaveis_incluidas": projetos::variaveis_incluidas(&pasta),
        "config": cfg,
    }))
    .into_response()
}

async fn ler_arquivo(State(e): State<EstadoRef>, Path(id): Path<String>, Query(q): Query<QCaminho>) -> Response {
    let caminho = match projetos::caminho_arquivo(&e, &id, &q.caminho) {
        Ok(c) => c,
        Err(m) => return erro(m),
    };
    match tokio::fs::read(&caminho).await {
        Ok(dados) => {
            let mime = mime_guess::from_path(&caminho).first_or_octet_stream();
            // Arquivos de texto do LaTeX são enviados como texto UTF-8.
            let tipo = if mime.type_() == "image" || mime.subtype() == "pdf" {
                mime.to_string()
            } else {
                "application/octet-stream".to_string()
            };
            ([(header::CONTENT_TYPE, tipo), (header::CACHE_CONTROL, "no-store".into())], dados).into_response()
        }
        Err(_) => (StatusCode::NOT_FOUND, "Arquivo não encontrado").into_response(),
    }
}

async fn gravar_arquivo(State(e): State<EstadoRef>, Path(id): Path<String>, Query(q): Query<QCaminho>, corpo: Bytes) -> Response {
    match projetos::gravar_arquivo(&e, &id, &q.caminho, &corpo) {
        Ok(_) => ok(),
        Err(m) => erro(m),
    }
}

async fn excluir_item(State(e): State<EstadoRef>, Path(id): Path<String>, Query(q): Query<QCaminho>) -> Response {
    match projetos::excluir_item(&e, &id, &q.caminho) {
        Ok(_) => ok(),
        Err(m) => erro(m),
    }
}

#[derive(Deserialize)]
struct NovoItem {
    caminho: String,
    pasta: bool,
}

async fn criar_item(State(e): State<EstadoRef>, Path(id): Path<String>, Json(n): Json<NovoItem>) -> Response {
    match projetos::criar_item(&e, &id, &n.caminho, n.pasta) {
        Ok(_) => ok(),
        Err(m) => erro(m),
    }
}

#[derive(Deserialize)]
struct Mover {
    de: String,
    para: String,
}

async fn mover(State(e): State<EstadoRef>, Path(id): Path<String>, Json(m): Json<Mover>) -> Response {
    match projetos::mover_item(&e, &id, &m.de, &m.para) {
        Ok(_) => ok(),
        Err(msg) => erro(msg),
    }
}

async fn config_projeto(State(e): State<EstadoRef>, Path(id): Path<String>, Json(c): Json<projetos::ConfigProjeto>) -> Response {
    match projetos::pasta_projeto(&e, &id).and_then(|p| projetos::gravar_config(&p, &c)) {
        Ok(_) => ok(),
        Err(m) => erro(m),
    }
}

async fn referencias(State(e): State<EstadoRef>, Path(id): Path<String>) -> Response {
    responder(projetos::pasta_projeto(&e, &id).map(|p| projetos::referencias(&p)))
}

// ---------------------------------------------------------------------------
// Compilação e saída
// ---------------------------------------------------------------------------

async fn compilar(State(e): State<EstadoRef>, Path(id): Path<String>) -> Response {
    responder(compilador::compilar(&e, &id).await)
}

/// Nome base do arquivo principal ("main.tex" -> "main").
fn base_principal(pasta: &std::path::Path) -> String {
    projetos::arquivo_principal(pasta)
        .and_then(|p| std::path::Path::new(&p).file_stem().map(|s| s.to_string_lossy().to_string()))
        .unwrap_or_else(|| "main".into())
}

#[derive(Deserialize)]
struct QBaixar {
    #[serde(default)]
    baixar: Option<String>,
}

async fn pdf(State(e): State<EstadoRef>, Path(id): Path<String>, Query(q): Query<QBaixar>) -> Response {
    let pasta = match projetos::pasta_projeto(&e, &id) {
        Ok(p) => p,
        Err(m) => return erro(m),
    };
    let base = base_principal(&pasta);
    let caminho = pasta.join(projetos::PASTA_SAIDA).join(format!("{base}.pdf"));
    match tokio::fs::read(&caminho).await {
        Ok(dados) => {
            // Com ?baixar=1 o navegador salva o arquivo com o nome do projeto.
            let disp = if q.baixar.is_some() {
                format!("attachment; filename*=UTF-8''{}", codificar_url(&format!("{}.pdf", documentacao::nome_exibicao(&id))))
            } else {
                "inline".into()
            };
            (
                [
                    (header::CONTENT_TYPE, "application/pdf".to_string()),
                    (header::CACHE_CONTROL, "no-store".to_string()),
                    (header::CONTENT_DISPOSITION, disp),
                ],
                dados,
            )
                .into_response()
        }
        Err(_) => (StatusCode::NOT_FOUND, "Ainda não há PDF. Clique em Recompilar.").into_response(),
    }
}

async fn zip(State(e): State<EstadoRef>, Path(id): Path<String>) -> Response {
    let pasta = match projetos::pasta_projeto(&e, &id) {
        Ok(p) => p,
        Err(m) => return erro(m),
    };
    match projetos::exportar_zip(&pasta) {
        Ok(dados) => (
            [
                (header::CONTENT_TYPE, "application/zip".to_string()),
                (header::CONTENT_DISPOSITION, format!("attachment; filename*=UTF-8''{}", codificar_url(&format!("{}.zip", documentacao::nome_exibicao(&id))))),
            ],
            dados,
        )
            .into_response(),
        Err(m) => erro(m),
    }
}

/// Codificação percentual simples para nomes de arquivo com acentos no cabeçalho HTTP.
fn codificar_url(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' => (b as char).to_string(),
            _ => format!("%{b:02X}"),
        })
        .collect()
}

// ---------------------------------------------------------------------------
// SyncTeX
// ---------------------------------------------------------------------------

async fn synctex_inversa(State(e): State<EstadoRef>, Path(id): Path<String>, Query(q): Query<HashMap<String, String>>) -> Response {
    let pasta = match projetos::pasta_projeto(&e, &id) {
        Ok(p) => p,
        Err(m) => return erro(m),
    };
    let num = |k: &str| q.get(k).and_then(|v| v.parse::<f64>().ok()).unwrap_or(0.0);
    let base = base_principal(&pasta);
    let Some(st) = synctex::Synctex::carregar(&pasta.join(projetos::PASTA_SAIDA), &base) else {
        return erro("Sem dados SyncTeX. Recompile o projeto.");
    };
    match st.inversa(&pasta, num("pagina") as u32, num("x"), num("y")) {
        Some(pos) => Json(pos).into_response(),
        None => erro("Não foi possível localizar esse ponto no código."),
    }
}

async fn synctex_direta(State(e): State<EstadoRef>, Path(id): Path<String>, Query(q): Query<HashMap<String, String>>) -> Response {
    let pasta = match projetos::pasta_projeto(&e, &id) {
        Ok(p) => p,
        Err(m) => return erro(m),
    };
    let arquivo = q.get("arquivo").cloned().unwrap_or_default();
    let linha = q.get("linha").and_then(|v| v.parse().ok()).unwrap_or(1);
    let base = base_principal(&pasta);
    let Some(st) = synctex::Synctex::carregar(&pasta.join(projetos::PASTA_SAIDA), &base) else {
        return erro("Sem dados SyncTeX. Recompile o projeto.");
    };
    Json(st.direta(&pasta, &arquivo, linha)).into_response()
}

// ---------------------------------------------------------------------------
// Outros
// ---------------------------------------------------------------------------

async fn abrir_pasta(State(e): State<EstadoRef>, Path(id): Path<String>) -> Response {
    match projetos::pasta_projeto(&e, &id) {
        Ok(p) => {
            let _ = open::that(p);
            ok()
        }
        Err(m) => erro(m),
    }
}

/// Serve os arquivos da interface (index.html, app.js, estilos...).
async fn arquivo_interface(uri: axum::http::Uri) -> Response {
    let caminho = uri.path().trim_start_matches('/');
    let caminho = if caminho.is_empty() { "index.html" } else { caminho };
    match Interface::get(caminho).or_else(|| Interface::get("index.html")) {
        Some(arq) => {
            let nome = if Interface::get(caminho).is_some() { caminho } else { "index.html" };
            let mime = mime_guess::from_path(nome).first_or_octet_stream();
            Response::builder()
                .header(header::CONTENT_TYPE, mime.as_ref())
                .header(header::CACHE_CONTROL, "no-cache")
                .body(Body::from(arq.data.into_owned()))
                .unwrap()
        }
        None => (StatusCode::NOT_FOUND, "Interface não encontrada").into_response(),
    }
}

// ---------------------------------------------------------------------------
// Modelos do usuário
// ---------------------------------------------------------------------------

async fn listar_modelos(State(e): State<EstadoRef>) -> Response {
    Json(json!({
        "prontos": modelos::LISTA,
        "usuario": projetos::listar_modelos_usuario(&e),
    }))
    .into_response()
}

async fn excluir_modelo(State(e): State<EstadoRef>, Path(nome): Path<String>) -> Response {
    responder(projetos::excluir_modelo_usuario(&e, &nome).map(|_| json!({"ok": true})))
}

async fn salvar_modelo(State(e): State<EstadoRef>, Path(id): Path<String>, Json(n): Json<QNome>) -> Response {
    responder(projetos::salvar_como_modelo(&e, &id, &n.nome).map(|nome| json!({"nome": nome})))
}

// ---------------------------------------------------------------------------
// Variáveis
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct CorpoVariaveis {
    variaveis: Vec<projetos::Variavel>,
}

async fn gravar_variaveis(State(e): State<EstadoRef>, Path(id): Path<String>, Json(c): Json<CorpoVariaveis>) -> Response {
    let r = projetos::pasta_projeto(&e, &id).and_then(|p| {
        projetos::gravar_variaveis(&p, c.variaveis)?;
        Ok(json!({"ok": true, "incluidas": projetos::variaveis_incluidas(&p)}))
    });
    responder(r)
}

async fn incluir_variaveis(State(e): State<EstadoRef>, Path(id): Path<String>) -> Response {
    responder(projetos::pasta_projeto(&e, &id).and_then(|p| projetos::incluir_variaveis(&p)).map(|_| json!({"ok": true})))
}

// ---------------------------------------------------------------------------
// Janelas nativas "Salvar como" / "Abrir"
// ---------------------------------------------------------------------------
// As janelas do Windows bloqueiam a thread enquanto estão abertas, por isso
// rodam em `spawn_blocking` (uma thread separada), sem travar o servidor.

async fn salvar_pdf(State(e): State<EstadoRef>, Path(id): Path<String>) -> Response {
    let pasta = match projetos::pasta_projeto(&e, &id) {
        Ok(p) => p,
        Err(m) => return erro(m),
    };
    let origem = pasta.join(projetos::PASTA_SAIDA).join(format!("{}.pdf", base_principal(&pasta)));
    if !origem.is_file() {
        return erro("Ainda não há PDF. Clique em Recompilar.");
    }
    // Revisões de documentos técnicos saem como "Documento - Rev. 01.pdf".
    let nome = format!("{}.pdf", documentacao::nome_exibicao(&id));
    let r = tokio::task::spawn_blocking(move || {
        match crate::janela::dialogo_salvar(&nome, "Documento PDF", "pdf") {
            Some(destino) => std::fs::copy(&origem, &destino)
                .map(|_| json!({"salvo": destino.display().to_string()}))
                .map_err(|e| format!("Não foi possível salvar: {e}")),
            None => Ok(json!({"salvo": null})),
        }
    })
    .await
    .unwrap_or_else(|e| Err(e.to_string()));
    responder(r)
}

async fn salvar_zip(State(e): State<EstadoRef>, Path(id): Path<String>) -> Response {
    let pasta = match projetos::pasta_projeto(&e, &id) {
        Ok(p) => p,
        Err(m) => return erro(m),
    };
    let nome = format!("{}.zip", documentacao::nome_exibicao(&id));
    let r = tokio::task::spawn_blocking(move || {
        let Some(destino) = crate::janela::dialogo_salvar(&nome, "Arquivo ZIP", "zip") else {
            return Ok(json!({"salvo": null}));
        };
        let dados = projetos::exportar_zip(&pasta)?;
        std::fs::write(&destino, dados).map_err(|e| format!("Não foi possível salvar: {e}"))?;
        Ok(json!({"salvo": destino.display().to_string()}))
    })
    .await
    .unwrap_or_else(|e| Err(e.to_string()));
    responder(r)
}

async fn importar_dialogo(State(e): State<EstadoRef>) -> Response {
    let r = tokio::task::spawn_blocking(move || {
        let Some(origem) = crate::janela::dialogo_abrir("Projeto LaTeX (.zip)", &["zip"]) else {
            return Ok(json!({"id": null}));
        };
        let nome = origem
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "Projeto importado".into());
        let dados = std::fs::read(&origem).map_err(|e| e.to_string())?;
        projetos::importar_zip(&e, &nome, dados).map(|id| json!({"id": id}))
    })
    .await
    .unwrap_or_else(|e| Err(e.to_string()));
    responder(r)
}

// ---------------------------------------------------------------------------
// Corretor ortográfico
// ---------------------------------------------------------------------------

async fn idiomas(State(e): State<EstadoRef>) -> Response {
    Json(e.ortografia.idiomas()).into_response()
}

#[derive(Deserialize)]
struct PedidoVerificar {
    idioma: String,
    /// Idiomas aceitos além do principal (opcional).
    #[serde(default)]
    extras: Vec<String>,
    palavras: Vec<String>,
}

async fn verificar_ortografia(State(e): State<EstadoRef>, Json(p): Json<PedidoVerificar>) -> Response {
    // A primeira verificação carrega o dicionário (pode levar meio segundo): roda fora do laço principal.
    let r = tokio::task::spawn_blocking(move || e.ortografia.verificar(&p.idioma, &p.extras, &p.palavras).map(|erradas| json!({"erradas": erradas})))
        .await
        .unwrap_or_else(|e| Err(e.to_string()));
    responder(r)
}

async fn sugerir_ortografia(State(e): State<EstadoRef>, Query(q): Query<HashMap<String, String>>) -> Response {
    let idioma = q.get("idioma").cloned().unwrap_or_else(|| "pt_BR".into());
    let palavra = q.get("palavra").cloned().unwrap_or_default();
    let r = tokio::task::spawn_blocking(move || e.ortografia.sugerir(&idioma, &palavra))
        .await
        .unwrap_or_else(|e| Err(e.to_string()));
    responder(r)
}

#[derive(Deserialize)]
struct PedidoPalavra {
    palavra: String,
}

async fn adicionar_palavra(State(e): State<EstadoRef>, Json(p): Json<PedidoPalavra>) -> Response {
    responder(e.ortografia.adicionar(&p.palavra).map(|_| json!({"ok": true})))
}

#[derive(Deserialize)]
struct PedidoBaixar {
    id: String,
}

async fn baixar_dicionario(State(e): State<EstadoRef>, Json(p): Json<PedidoBaixar>) -> Response {
    let r = tokio::task::spawn_blocking(move || e.ortografia.baixar(&p.id).map(|_| json!({"ok": true})))
        .await
        .unwrap_or_else(|e| Err(e.to_string()));
    responder(r)
}

// ---------------------------------------------------------------------------
// Histórico de versões
// ---------------------------------------------------------------------------

async fn historico_listar(State(e): State<EstadoRef>, Path(id): Path<String>) -> Response {
    responder(projetos::pasta_projeto(&e, &id).map(|p| historico::listar(&p)))
}

#[derive(Deserialize)]
struct CorpoNomeVersao {
    #[serde(default)]
    nome: String,
}

async fn historico_criar(State(e): State<EstadoRef>, Path(id): Path<String>, Json(c): Json<CorpoNomeVersao>) -> Response {
    let r = projetos::pasta_projeto(&e, &id).and_then(|p| historico::criar(&p, &c.nome, false, "manual", true));
    responder(r.map(|v| json!({"versao": v})))
}

async fn historico_renomear(State(e): State<EstadoRef>, Path((id, n)): Path<(String, u64)>, Json(c): Json<CorpoNomeVersao>) -> Response {
    responder(projetos::pasta_projeto(&e, &id).and_then(|p| historico::renomear(&p, n, &c.nome)))
}

async fn historico_excluir(State(e): State<EstadoRef>, Path((id, n)): Path<(String, u64)>) -> Response {
    responder(projetos::pasta_projeto(&e, &id).and_then(|p| historico::excluir(&p, n)).map(|_| json!({"ok": true})))
}

async fn historico_arquivos(State(e): State<EstadoRef>, Path((id, n)): Path<(String, u64)>) -> Response {
    responder(projetos::pasta_projeto(&e, &id).and_then(|p| historico::arquivos(&p, n)))
}

async fn historico_arquivo(State(e): State<EstadoRef>, Path((id, n)): Path<(String, u64)>, Query(q): Query<QCaminho>) -> Response {
    match projetos::pasta_projeto(&e, &id).and_then(|p| historico::ler_arquivo(&p, n, &q.caminho)) {
        Ok(d) => ([(header::CONTENT_TYPE, "application/octet-stream")], d).into_response(),
        Err(m) => erro(m),
    }
}

#[derive(Deserialize)]
struct CorpoRestaurar {
    #[serde(default)]
    caminho: Option<String>,
}

async fn historico_restaurar(State(e): State<EstadoRef>, Path((id, n)): Path<(String, u64)>, Json(c): Json<CorpoRestaurar>) -> Response {
    let r = projetos::pasta_projeto(&e, &id).and_then(|p| historico::restaurar(&p, n, c.caminho.as_deref()));
    responder(r.map(|_| json!({"ok": true})))
}

// ---------------------------------------------------------------------------
// Documentação técnica (documentos com várias revisões) - veja documentacao.rs
// ---------------------------------------------------------------------------

async fn documentos_listar(State(e): State<EstadoRef>) -> Response {
    Json(documentacao::listar(&e)).into_response()
}

async fn documentos_criar(State(e): State<EstadoRef>, Json(n): Json<documentacao::NovoDocumento>) -> Response {
    responder(documentacao::criar(&e, n).map(|(doc, id)| json!({"documento": doc, "id": id})))
}

async fn documentos_detalhar(State(e): State<EstadoRef>, Path(doc): Path<String>) -> Response {
    responder(documentacao::detalhar(&e, &doc))
}

#[derive(Deserialize)]
struct CorpoDocumento {
    nome: String,
    #[serde(default)]
    cliente: String,
    #[serde(default)]
    descricao: String,
}

async fn documentos_editar(State(e): State<EstadoRef>, Path(doc): Path<String>, Json(c): Json<CorpoDocumento>) -> Response {
    responder(documentacao::editar(&e, &doc, &c.nome, &c.cliente, &c.descricao).map(|id| json!({"documento": id})))
}

async fn documentos_excluir(State(e): State<EstadoRef>, Path(doc): Path<String>) -> Response {
    responder(documentacao::excluir(&e, &doc).map(|_| json!({"ok": true})))
}

async fn versoes_criar(State(e): State<EstadoRef>, Path(doc): Path<String>, Json(d): Json<documentacao::DadosVersao>) -> Response {
    responder(documentacao::criar_versao(&e, &doc, d).map(|id| json!({"id": id})))
}

async fn versoes_editar(State(e): State<EstadoRef>, Path((doc, ver)): Path<(String, String)>, Json(d): Json<documentacao::DadosVersao>) -> Response {
    responder(documentacao::editar_versao(&e, &doc, &ver, d).map(|id| json!({"id": id})))
}

async fn versoes_excluir(State(e): State<EstadoRef>, Path((doc, ver)): Path<(String, String)>) -> Response {
    responder(documentacao::excluir_versao(&e, &doc, &ver).map(|_| json!({"ok": true})))
}

// ---------------------------------------------------------------------------
// Referências: busca de dados pelo DOI
// ---------------------------------------------------------------------------

/// Busca o BibTeX de um DOI no serviço oficial doi.org (negociação de conteúdo).
/// Feito aqui no programa (e não na interface) para evitar bloqueios de CORS.
async fn buscar_doi(Query(q): Query<HashMap<String, String>>) -> Response {
    let doi = q.get("doi").cloned().unwrap_or_default();
    // Aceita o DOI puro ou um link (https://doi.org/10....).
    let doi = doi.trim().trim_start_matches("https://doi.org/").trim_start_matches("http://dx.doi.org/").trim_start_matches("doi:").trim().to_string();
    if !doi.starts_with("10.") {
        return erro("DOI inválido. Exemplo: 10.1016/j.engstruct.2020.110000");
    }
    let r = tokio::task::spawn_blocking(move || -> Result<String, String> {
        let url = format!("https://doi.org/{doi}");
        let mut resp = ureq::get(&url)
            .header("Accept", "application/x-bibtex; charset=utf-8")
            .call()
            .map_err(|e| format!("Não foi possível consultar o DOI (verifique a internet): {e}"))?;
        resp.body_mut().read_to_string().map_err(|e| e.to_string())
    })
    .await
    .unwrap_or_else(|e| Err(e.to_string()));
    responder(r.map(|bib| json!({"bibtex": bib})))
}
