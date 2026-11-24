// Funções de acesso ao servidor local (o próprio EngLaTeX.exe).
// Todas as rotas estão documentadas em src/api.rs.

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
  salvarPdf: (id) => pedir("POST", `${urlProjeto(id)}/salvar-pdf`),
  salvarZip: (id) => pedir("POST", `${urlProjeto(id)}/salvar-zip`),
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
