// Funções de acesso ao servidor local (o próprio EngLaTeX.exe).
// Todas as rotas estão documentadas em src/api.rs.

/**
 * Revisões da aba "Documentação técnica" abrem no editor como projetos com o id
 * `doc:<documento>:<revisão>` (veja src/documentacao.rs). Esta função separa
 * as duas partes; devolve null se o id for de um projeto comum.
 */
export function separarIdRevisao(id) {
  if (!id || !id.startsWith("doc:")) return null;
  const resto = id.slice(4);
  const i = resto.indexOf(":");
  return i < 0 ? null : { documento: resto.slice(0, i), pasta: resto.slice(i + 1) };
}

/** Nome para mostrar na tela: "Documento - Rev. 01" para revisões, o próprio id para projetos. */
export function nomeExibicao(id) {
  const r = separarIdRevisao(id);
  return r ? `${r.documento} - ${r.pasta}` : id;
}

/** No app Android, depois de salvar, oferece compartilhar o arquivo (veja MainActivity.Ponte). */
function compartilharNoAndroid(r, tipo) {
  if (r && r.salvo && window.EngAndroid) window.EngAndroid.compartilhar(r.salvo, tipo);
  return r;
}

/** Codifica o id do projeto para uso na URL. */
export const urlProjeto = (id) => `/api/p/${encodeURIComponent(id)}`;

/**
 * Faz uma requisição e devolve o JSON. Se o servidor responder com erro,
 * lança uma exceção com a mensagem em português que veio dele.
 */
export async function pedir(metodo, url, corpo, tipo = "json") {
  const opcoes = { method: metodo, headers: {} };
  if (corpo !== undefined) {
    if (corpo instanceof Blob || corpo instanceof ArrayBuffer || typeof corpo === "string") {
      opcoes.body = corpo;
    } else {
      opcoes.body = JSON.stringify(corpo);
      opcoes.headers["Content-Type"] = "application/json";
    }
  }
  let resp;
  try {
    resp = await fetch(url, opcoes);
  } catch {
    throw new Error("Sem comunicação com o Eng LaTeX. O programa foi fechado?");
  }
  if (!resp.ok) {
    let msg = `Erro ${resp.status}`;
    try {
      const j = await resp.json();
      if (j.erro) msg = j.erro;
    } catch {
      /* resposta sem JSON */
    }
    throw new Error(msg);
  }
  if (tipo === "bytes") return resp.arrayBuffer();
  return resp.json();
}

export const api = {
  config: () => pedir("GET", "/api/config"),
  salvarConfig: (cfg) => pedir("PUT", "/api/config", cfg),
  compiladores: () => pedir("GET", "/api/compiladores"),
  modelos: () => pedir("GET", "/api/modelos"),

  projetos: () => pedir("GET", "/api/projetos"),
  criarProjeto: (nome, modelo) => pedir("POST", "/api/projetos", { nome, modelo }),
  importarZip: (nome, arquivo) => pedir("POST", `/api/importar?nome=${encodeURIComponent(nome)}`, arquivo),
  renomearProjeto: (id, nome) => pedir("POST", `${urlProjeto(id)}/renomear`, { nome }),
  duplicarProjeto: (id) => pedir("POST", `${urlProjeto(id)}/duplicar`),
  excluirProjeto: (id) => pedir("DELETE", urlProjeto(id)),

  arvore: (id) => pedir("GET", `${urlProjeto(id)}/arvore`),
  lerArquivo: (id, caminho) => pedir("GET", `${urlProjeto(id)}/arquivo?caminho=${encodeURIComponent(caminho)}`, undefined, "bytes"),
  gravarArquivo: (id, caminho, conteudo) =>
    pedir("PUT", `${urlProjeto(id)}/arquivo?caminho=${encodeURIComponent(caminho)}`, conteudo),
  excluirItem: (id, caminho) => pedir("DELETE", `${urlProjeto(id)}/arquivo?caminho=${encodeURIComponent(caminho)}`),
  criarItem: (id, caminho, pasta) => pedir("POST", `${urlProjeto(id)}/item`, { caminho, pasta }),
  moverItem: (id, de, para) => pedir("POST", `${urlProjeto(id)}/mover`, { de, para }),
  configProjeto: (id, cfg) => pedir("PUT", `${urlProjeto(id)}/config`, cfg),
  compilar: (id) => pedir("POST", `${urlProjeto(id)}/compilar`),
  referencias: (id) => pedir("GET", `${urlProjeto(id)}/referencias`),
  synctexInversa: (id, pagina, x, y) =>
    pedir("GET", `${urlProjeto(id)}/synctex/inversa?pagina=${pagina}&x=${x}&y=${y}`),
  synctexDireta: (id, arquivo, linha) =>
    pedir("GET", `${urlProjeto(id)}/synctex/direta?arquivo=${encodeURIComponent(arquivo)}&linha=${linha}`),
  abrirPasta: (id) => pedir("POST", `${urlProjeto(id)}/abrir-pasta`),
  // No app Android o arquivo vai para Download/EngLaTeX e em seguida abre o
  // menu "Compartilhar" do Android (WhatsApp, Drive, leitor de PDF...).
  salvarPdf: (id) => pedir("POST", `${urlProjeto(id)}/salvar-pdf`).then((r) => compartilharNoAndroid(r, "application/pdf")),
  salvarZip: (id) => pedir("POST", `${urlProjeto(id)}/salvar-zip`).then((r) => compartilharNoAndroid(r, "application/zip")),
  importarDialogo: () => pedir("POST", "/api/importar-dialogo"),

  // Variáveis e modelos do usuário
  gravarVariaveis: (id, variaveis) => pedir("PUT", `${urlProjeto(id)}/variaveis`, { variaveis }),
  incluirVariaveis: (id) => pedir("POST", `${urlProjeto(id)}/variaveis/incluir`),
  salvarComoModelo: (id, nome) => pedir("POST", `${urlProjeto(id)}/salvar-modelo`, { nome }),
  excluirModelo: (nome) => pedir("DELETE", `/api/modelos-usuario/${encodeURIComponent(nome)}`),

  // Histórico de versões
  historico: (id) => pedir("GET", `${urlProjeto(id)}/historico`),
  historicoCriar: (id, nome) => pedir("POST", `${urlProjeto(id)}/historico`, { nome }),
  historicoArquivos: (id, n) => pedir("GET", `${urlProjeto(id)}/historico/${n}/arquivos`),
  historicoArquivo: (id, n, caminho) => pedir("GET", `${urlProjeto(id)}/historico/${n}/arquivo?caminho=${encodeURIComponent(caminho)}`, undefined, "bytes"),
  historicoRestaurar: (id, n, caminho) => pedir("POST", `${urlProjeto(id)}/historico/${n}/restaurar`, { caminho }),
  historicoRenomear: (id, n, nome) => pedir("PUT", `${urlProjeto(id)}/historico/${n}`, { nome }),
  historicoExcluir: (id, n) => pedir("DELETE", `${urlProjeto(id)}/historico/${n}`),

  // Documentação técnica (documentos com várias revisões)
  documentos: () => pedir("GET", "/api/documentos"),
  criarDocumento: (dados) => pedir("POST", "/api/documentos", dados),
  documento: (doc) => pedir("GET", `/api/documentos/${encodeURIComponent(doc)}`),
  editarDocumento: (doc, dados) => pedir("PUT", `/api/documentos/${encodeURIComponent(doc)}`, dados),
  excluirDocumento: (doc) => pedir("DELETE", `/api/documentos/${encodeURIComponent(doc)}`),
  criarRevisao: (doc, dados) => pedir("POST", `/api/documentos/${encodeURIComponent(doc)}/versoes`, dados),
  editarRevisao: (doc, pasta, dados) => pedir("PUT", `/api/documentos/${encodeURIComponent(doc)}/versoes/${encodeURIComponent(pasta)}`, dados),
  excluirRevisao: (doc, pasta) => pedir("DELETE", `/api/documentos/${encodeURIComponent(doc)}/versoes/${encodeURIComponent(pasta)}`),

  // Referências
  buscarDoi: (doi) => pedir("GET", `/api/doi?doi=${encodeURIComponent(doi)}`),

  // Corretor ortográfico
  idiomas: () => pedir("GET", "/api/ortografia/idiomas"),
  verificarPalavras: (idioma, palavras, extras = []) => pedir("POST", "/api/ortografia/verificar", { idioma, extras, palavras }),
  sugerir: (idioma, palavra) =>
    pedir("GET", `/api/ortografia/sugerir?idioma=${encodeURIComponent(idioma)}&palavra=${encodeURIComponent(palavra)}`),
  adicionarPalavra: (palavra) => pedir("POST", "/api/ortografia/adicionar", { palavra }),
  baixarDicionario: (id) => pedir("POST", "/api/ortografia/baixar", { id }),
};

