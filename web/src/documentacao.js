// Aba "Documentação técnica" da tela inicial.
//
// Um documento técnico (memorial, laudo, procedimento, plano de rigging...)
// tem várias revisões: Rev. 00, Rev. 01, Rev. 02... Cada revisão é um projeto
// LaTeX completo, aberto no editor normal com o id "doc:<documento>:<pasta>".
// Criar uma revisão nova copia uma revisão existente (normalmente a última),
// de modo que a revisão já entregue ao cliente fica guardada como estava.
//
// Duas telas:
//   #/documentacao             -> lista de documentos  (desenharDocumentos)
//   #/documentacao/<documento> -> revisões do documento (desenharDocumento)
//
// O backend está em src/documentacao.rs (lá também está a lista de
// variáveis de revisão gravadas automaticamente: \var{revisao}, \var{tabela_revisoes}...).

import { api } from "./api.js";
import { icone, esc, dataRelativa, aviso, confirmar, dialogo, menuContexto, armazenamento } from "./ui.js";

/** Situações de uma revisão (as mesmas de SITUACOES em src/documentacao.rs). */
const SITUACOES = [
  ["elaboracao", "Em elaboração"],
  ["verificacao", "Em verificação"],
  ["emitida", "Emitida"],
  ["aprovada", "Aprovada"],
  ["cancelada", "Cancelada"],
];

/** Situações em que a revisão já foi entregue: abrir para editar pede confirmação. */
const FECHADAS = ["emitida", "aprovada", "cancelada"];

/** Texto da situação para a tela. */
const textoSituacao = (chave) => (SITUACOES.find(([k]) => k === chave) || SITUACOES[0])[1];

/** Etiqueta colorida da situação. */
const etiquetaSituacao = (chave) => `<span class="situacao situacao-${esc(chave || "elaboracao")}">${esc(textoSituacao(chave))}</span>`;

/** Data de hoje (fuso do Windows) no formato aaaa-mm-dd, o mesmo do campo <input type="date">. */
function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-11-25" -> "25/11/2026". */
const dataBr = (iso) => (/^\d{4}-\d\d-\d\d$/.test(iso || "") ? iso.split("-").reverse().join("/") : iso || "");

/** URL da tela de um documento. */
const urlDocumento = (doc) => `#/documentacao/${encodeURIComponent(doc)}`;

/** URL do editor de uma revisão. */
const urlEditor = (id) => `#/p/${encodeURIComponent(id)}`;

/** Último "Elaborado por" usado (preenche as janelas seguintes). */
const responsavelPadrao = () => armazenamento.ler("documentacao:responsavel", "");
const lembrarResponsavel = (nome) => nome && armazenamento.gravar("documentacao:responsavel", nome);

// ---------------------------------------------------------------------------
// Lista de documentos
// ---------------------------------------------------------------------------

/**
 * Desenha a lista de documentos técnicos.
 * @param {object} p  { lista, acoes, documentos, atualizar }
 *   lista: elemento onde vai a tabela; acoes: área de botões do cabeçalho;
 *   documentos: resposta de GET /api/documentos; atualizar: recarrega a aba.
 */
export function desenharDocumentos({ lista, acoes, documentos, atualizar }) {
  acoes.innerHTML = `<button class="botao primario" id="bt-novo-documento">${icone("mais")} Novo documento</button>`;
  acoes.querySelector("#bt-novo-documento").onclick = novoDocumento;

  if (!documentos.length) {
    // Cada trecho de texto fica numa linha só, para o i18n.js conseguir traduzir.
    lista.innerHTML = `<div class="vazio">
      <p>Nenhum documento técnico ainda.</p>
      <p>Cada documento (memorial, laudo, procedimento, plano de rigging…) guarda todas as suas <b>revisões</b>: Rev. 00, Rev. 01, Rev. 02…</p>
      <p>Cada revisão é um projeto completo, e a revisão já entregue ao cliente continua guardada do jeito que foi emitida.</p>
      <p>Clique em <b>Novo documento</b> para começar.</p></div>`;
    return;
  }

  lista.innerHTML = `
    <table class="tabela-projetos">
      <thead><tr><th>Documento</th><th>Cliente</th><th>Revisão atual</th><th>Revisões</th><th>Última modificação</th><th class="acoes">Ações</th></tr></thead>
      <tbody>${documentos
        .map(
          (d) => `
        <tr data-doc="${esc(d.id)}" data-nome="${esc(`${d.nome} ${d.cliente} ${d.descricao}`)}">
          <td><a href="${urlDocumento(d.id)}" class="link-projeto">${esc(d.nome)}</a>
            ${d.descricao ? `<div class="sub-linha" data-sem-traducao>${esc(d.descricao)}</div>` : ""}</td>
          <td data-sem-traducao>${esc(d.cliente)}</td>
          <td class="sem-quebra"><span data-sem-traducao>Rev. ${esc(d.ultima_revisao)}</span> ${etiquetaSituacao(d.ultima_status)}</td>
          <td class="numero">${d.quantidade}</td>
          <td class="data">${dataRelativa(d.modificado)}</td>
          <td class="acoes">
            <button class="botao pequeno" data-acao="revisao">${icone("mais")} Nova revisão</button>
            <button class="botao-icone" data-acao="abrir" title="Abrir a revisão atual no editor">${icone("lapis")}</button>
            <button class="botao-icone" data-acao="editar" title="Dados do documento">${icone("config")}</button>
            <button class="botao-icone perigo" data-acao="excluir" title="Excluir documento">${icone("lixeira")}</button>
          </td>
        </tr>`,
        )
        .join("")}</tbody>
    </table>`;

  lista.querySelectorAll("tbody tr").forEach((tr) => {
    const d = documentos.find((x) => x.id === tr.dataset.doc);
    const acao = (qual) => acaoDocumento(qual, d, atualizar);
    tr.querySelectorAll("[data-acao]").forEach((b) => (b.onclick = () => acao(b.dataset.acao)));
    tr.oncontextmenu = (e) => {
      e.preventDefault();
      menuContexto(e.clientX, e.clientY, [
        { texto: "Ver revisões", icone: "livro", acao: () => (location.hash = urlDocumento(d.id)) },
        { texto: "Abrir a revisão atual", icone: "lapis", acao: () => acao("abrir") },
        { texto: "Nova revisão", icone: "mais", acao: () => acao("revisao") },
        { texto: "Dados do documento", icone: "config", acao: () => acao("editar") },
        "-",
        { texto: "Excluir documento", icone: "lixeira", perigo: true, acao: () => acao("excluir") },
      ]);
    };
  });
}

/** Ações da linha de um documento na lista. */
async function acaoDocumento(acao, d, atualizar) {
  try {
    if (acao === "abrir") {
      return abrirRevisao({ id: d.ultima_id, status: d.ultima_status, revisao: d.ultima_revisao }, d.id);
    }
    if (acao === "revisao") {
      // A janela de nova revisão precisa da lista completa de revisões.
      return novaRevisao(await api.documento(d.id));
    }
    if (acao === "editar") {
      const novoId = await editarDocumento(d);
      if (novoId) await atualizar();
      return;
    }
    if (acao === "excluir") {
      const ok = await confirmar(
        "Excluir documento",
        `<b data-sem-traducao>${esc(d.nome)}</b> — ${d.quantidade} revisão(ões)</p><p>Tudo vai para a pasta Lixeira dentro de Documentos\\EngLaTeX (dá para recuperar de lá).`,
        "Excluir",
        true,
      );
      if (!ok) return;
      await api.excluirDocumento(d.id);
      await atualizar();
    }
  } catch (e) {
    aviso(e.message, "erro", 6000);
  }
}

// ---------------------------------------------------------------------------
// Tela de um documento: tabela de revisões
// ---------------------------------------------------------------------------

/**
 * Desenha as revisões de um documento.
 * @param {object} p  { lista, titulo, acoes, documento, atualizar }
 */
export async function desenharDocumento({ lista, titulo, acoes, documento, atualizar }) {
  let d;
  try {
    d = await api.documento(documento);
  } catch (e) {
    // Documento renomeado ou excluído (por exemplo, pelo Explorer): volta para a lista.
    aviso(e.message, "erro", 6000);
    location.hash = "#/documentacao";
    return;
  }

  titulo.innerHTML = `<a href="#/documentacao" class="migalha">Documentação técnica</a>
    <span class="migalha-sep">›</span> <span data-sem-traducao>${esc(d.nome)}</span>`;
  acoes.innerHTML = `
    <button class="botao" id="bt-dados-doc">${icone("config")} Dados do documento</button>
    <button class="botao primario" id="bt-nova-revisao">${icone("mais")} Nova revisão</button>`;
  acoes.querySelector("#bt-nova-revisao").onclick = () => novaRevisao(d);
  acoes.querySelector("#bt-dados-doc").onclick = async () => {
    const novoId = await editarDocumento(d);
    if (!novoId) return;
    if (novoId !== d.id) location.hash = urlDocumento(novoId);
    else await atualizar();
  };

  // Mais recente primeiro (é a que mais se usa).
  const versoes = [...d.versoes].reverse();
  const ultima = d.versoes[d.versoes.length - 1];

  lista.innerHTML = `
    <div class="info-documento">
      ${d.cliente ? `<div><span>Cliente</span> <b data-sem-traducao>${esc(d.cliente)}</b></div>` : ""}
      ${d.descricao ? `<div data-sem-traducao>${esc(d.descricao)}</div>` : ""}
      <div class="dica">Cada revisão é um projeto completo. <b>Nova revisão</b> copia a revisão escolhida; a anterior continua guardada como foi emitida.</div>
      <div class="dica">Variáveis preenchidas automaticamente em cada revisão: <code>\\var{revisao}</code> <code>\\var{data_revisao}</code> <code>\\var{descricao_revisao}</code> <code>\\var{responsavel_revisao}</code> <code>\\var{status_revisao}</code> <code>\\var{tabela_revisoes}</code></div>
    </div>
    <table class="tabela-projetos">
      <thead><tr><th>Revisão</th><th>Situação</th><th>Data</th><th>Descrição da revisão</th><th>Elaborado por</th><th>Última modificação</th><th class="acoes">Ações</th></tr></thead>
      <tbody>${versoes
        .map(
          (v) => `
        <tr data-pasta="${esc(v.pasta)}" data-nome="${esc(`Rev. ${v.revisao} ${v.descricao} ${v.responsavel}`)}" class="${v === ultima ? "linha-atual" : ""}">
          <td class="sem-quebra"><a href="${urlEditor(v.id)}" class="link-projeto" data-acao="abrir">Rev. ${esc(v.revisao)}</a>
            ${v === ultima ? '<span class="selo-atual">atual</span>' : ""}</td>
          <td>${etiquetaSituacao(v.status)}</td>
          <td class="sem-quebra" data-sem-traducao>${esc(dataBr(v.data))}</td>
          <td><span data-sem-traducao>${esc(v.descricao)}</span>${v.origem ? `<div class="sub-linha">copiada da <span data-sem-traducao>${esc(v.origem)}</span></div>` : ""}</td>
          <td data-sem-traducao>${esc(v.responsavel)}</td>
          <td class="data">${dataRelativa(v.modificado)}</td>
          <td class="acoes">
            <button class="botao-icone" data-acao="abrir" title="Abrir no editor">${icone("lapis")}</button>
            <button class="botao-icone" data-acao="copiar" title="Nova revisão a partir desta">${icone("copiar")}</button>
            <button class="botao-icone" data-acao="pdf" title="Salvar PDF" ${v.tem_pdf ? "" : "disabled"}>${icone("log")}</button>
            <button class="botao-icone" data-acao="editar" title="Dados da revisão">${icone("config")}</button>
            <button class="botao-icone perigo" data-acao="excluir" title="Excluir revisão" ${d.versoes.length > 1 ? "" : "disabled"}>${icone("lixeira")}</button>
          </td>
        </tr>`,
        )
        .join("")}</tbody>
    </table>`;

  lista.querySelectorAll("tbody tr").forEach((tr) => {
    const v = d.versoes.find((x) => x.pasta === tr.dataset.pasta);
    const acao = (qual) => acaoRevisao(qual, d, v, atualizar);
    tr.querySelectorAll("[data-acao]").forEach((b) => {
      b.onclick = (e) => {
        e.preventDefault();
        acao(b.dataset.acao);
      };
    });
    tr.oncontextmenu = (e) => {
      e.preventDefault();
      menuContexto(e.clientX, e.clientY, [
        { texto: "Abrir no editor", icone: "lapis", acao: () => acao("abrir") },
        { texto: "Nova revisão a partir desta", icone: "copiar", acao: () => acao("copiar") },
        { texto: "Dados da revisão", icone: "config", acao: () => acao("editar") },
        { texto: "Salvar PDF", icone: "log", acao: () => acao("pdf") },
        { texto: "Salvar .zip", icone: "baixar", acao: () => acao("zip") },
        { texto: "Abrir pasta", icone: "pasta", acao: () => acao("pasta") },
        "-",
        { texto: "Excluir revisão", icone: "lixeira", perigo: true, acao: () => acao("excluir") },
      ]);
    };
  });
}

/** Ações da linha de uma revisão. */
async function acaoRevisao(acao, d, v, atualizar) {
  try {
    if (acao === "abrir") return abrirRevisao(v, d.id, d);
    if (acao === "copiar") return novaRevisao(d, v.pasta);
    if (acao === "editar") {
      const r = await editarRevisao(d, v);
      if (r) await atualizar();
      return;
    }
    if (acao === "pdf") {
      const r = await api.salvarPdf(v.id);
      if (r.salvo) aviso(`PDF salvo em ${r.salvo}`, "sucesso");
      return;
    }
    if (acao === "zip") {
      const r = await api.salvarZip(v.id);
      if (r.salvo) aviso(`Salvo em ${r.salvo}`, "sucesso");
      return;
    }
    if (acao === "pasta") return api.abrirPasta(v.id);
    if (acao === "excluir") {
      if (d.versoes.length <= 1) {
        aviso("Esta é a única revisão do documento. Para apagá-la, exclua o documento inteiro.", "erro", 6000);
        return;
      }
      const ok = await confirmar(
        "Excluir revisão",
        `<b data-sem-traducao>${esc(d.nome)} — Rev. ${esc(v.revisao)}</b></p><p>A revisão vai para a pasta Lixeira dentro de Documentos\\EngLaTeX (dá para recuperar de lá).`,
        "Excluir",
        true,
      );
      if (!ok) return;
      await api.excluirRevisao(d.id, v.pasta);
      await atualizar();
    }
  } catch (e) {
    aviso(e.message, "erro", 6000);
  }
}

/**
 * Abre uma revisão no editor. Se ela já foi emitida/aprovada, avisa antes:
 * o normal é criar uma revisão nova em vez de mexer na que foi entregue.
 * @param {object} v  revisão ({ id, status, revisao })
 * @param {string} doc  id do documento
 * @param {object} [detalhe]  documento completo (se já carregado), para "Criar nova revisão"
 */
async function abrirRevisao(v, doc, detalhe) {
  if (FECHADAS.includes(v.status)) {
    const r = await dialogo({
      titulo: "Revisão já emitida",
      conteudo: `<p><b data-sem-traducao>Rev. ${esc(v.revisao)}</b> — ${etiquetaSituacao(v.status)}</p>
        <p>Para não alterar o que já foi entregue, o recomendado é criar uma nova revisão a partir desta.</p>`,
      botoes: [
        { texto: "Cancelar", valor: null },
        { texto: "Abrir mesmo assim", valor: "abrir" },
        { texto: "Criar nova revisão", valor: "nova", classe: "primario" },
      ],
    });
    if (r === "nova") {
      try {
        const d = detalhe || (await api.documento(doc));
        const pasta = d.versoes.find((x) => x.id === v.id)?.pasta;
        return novaRevisao(d, pasta);
      } catch (e) {
        return aviso(e.message, "erro");
      }
    }
    if (r !== "abrir") return;
  }
  location.hash = urlEditor(v.id);
}

// ---------------------------------------------------------------------------
// Janelas: novo documento, nova revisão, dados do documento/revisão
// ---------------------------------------------------------------------------

/** <option>s de um <select>. */
const opcoes = (lista, atual) => lista.map(([v, t]) => `<option value="${esc(v)}" ${v === atual ? "selected" : ""}>${esc(t)}</option>`).join("");

/**
 * Campos comuns de uma revisão (código, situação, data, elaborado por, descrição).
 * `v` traz os valores iniciais.
 */
function camposRevisao(v) {
  return `
    <div class="grade-campos">
      <label class="campo"><span>Revisão (código)</span>
        <input id="r-revisao" type="text" value="${esc(v.revisao || "")}" placeholder="00" spellcheck="false"></label>
      <label class="campo"><span>Situação</span>
        <select id="r-status">${opcoes(SITUACOES, v.status || "elaboracao")}</select></label>
      <label class="campo"><span>Data</span>
        <input id="r-data" type="date" value="${esc(v.data || hojeIso())}"></label>
      <label class="campo"><span>Elaborado por</span>
        <input id="r-responsavel" type="text" value="${esc(v.responsavel || "")}" placeholder="Eng. Nome"></label>
    </div>
    <label class="campo"><span>Descrição da revisão (o que mudou)</span>
      <input id="r-descricao" type="text" value="${esc(v.descricao || "")}" placeholder="Ex.: Atende comentários do cliente"></label>`;
}

/** Lê os campos de `camposRevisao`. */
function lerRevisao(j) {
  return {
    revisao: j.querySelector("#r-revisao").value.trim(),
    status: j.querySelector("#r-status").value,
    data: j.querySelector("#r-data").value,
    responsavel: j.querySelector("#r-responsavel").value.trim(),
    descricao: j.querySelector("#r-descricao").value.trim(),
  };
}

/** Janela "Novo documento": dados do documento, modelo e primeira revisão. Abre a revisão no editor. */
async function novoDocumento() {
  let modelos;
  try {
    modelos = await api.modelos();
  } catch (e) {
    return aviso(e.message, "erro");
  }
  const listaModelos = [
    ...modelos.prontos.map((m) => [m.id, m.nome]),
    ...modelos.usuario.map((m) => [m.id, `${m.nome} (meu modelo)`]),
  ];

  const dados = await dialogo({
    titulo: "Novo documento técnico",
    largura: 620,
    conteudo: `
      <label class="campo"><span>Nome do documento</span>
        <input id="d-nome" type="text" placeholder="Ex.: MC-001 Memorial de cálculo - Ponte rolante" spellcheck="false"></label>
      <div class="grade-campos">
        <label class="campo"><span>Cliente</span><input id="d-cliente" type="text"></label>
        <label class="campo"><span>Modelo</span><select id="d-modelo">${opcoes(listaModelos, "memorial")}</select></label>
      </div>
      <label class="campo"><span>Observações (opcional)</span><input id="d-descricao" type="text"></label>
      <h4 class="titulo-secao">Primeira revisão</h4>
      ${camposRevisao({ revisao: "00", descricao: "Emissão inicial", responsavel: responsavelPadrao() })}`,
    botoes: [
      { texto: "Cancelar", valor: null },
      { texto: "Criar documento", valor: "ok", classe: "primario" },
    ],
    coletar: (j) => {
      const nome = j.querySelector("#d-nome").value.trim();
      if (!nome) {
        aviso("Informe o nome do documento.", "erro");
        j.querySelector("#d-nome").focus();
        return undefined;
      }
      return {
        nome,
        cliente: j.querySelector("#d-cliente").value.trim(),
        descricao: j.querySelector("#d-descricao").value.trim(),
        modelo: j.querySelector("#d-modelo").value,
        versao: lerRevisao(j),
      };
    },
  });
  if (!dados) return;
  try {
    lembrarResponsavel(dados.versao.responsavel);
    const r = await api.criarDocumento(dados);
    // Abre a primeira revisão já com a tabela de variáveis (cliente, obra, ART...).
    location.hash = `${urlEditor(r.id)}?variaveis=1`;
  } catch (e) {
    aviso(e.message, "erro", 6000);
  }
}

/**
 * Janela "Nova revisão". Copia a revisão `origem` (padrão: a mais recente).
 * @param {object} d  documento completo (GET /api/documentos/:doc)
 * @param {string} [origem]  pasta da revisão de partida
 */
async function novaRevisao(d, origem) {
  const ultima = d.versoes[d.versoes.length - 1];
  origem = origem || ultima?.pasta;
  const base = d.versoes.find((v) => v.pasta === origem) || ultima;
  const listaOrigens = [...d.versoes].reverse().map((v) => [v.pasta, `Rev. ${v.revisao} — ${textoSituacao(v.status)}${v.descricao ? ` — ${v.descricao}` : ""}`]);

  const dados = await dialogo({
    titulo: `Nova revisão — ${d.nome}`,
    largura: 620,
    conteudo: `
      <p class="dica">Os arquivos da revisão escolhida são copiados para a nova revisão. A revisão de origem não muda.</p>
      <label class="campo"><span>Copiar a partir de</span>
        <select id="r-origem" data-sem-traducao>${opcoes(listaOrigens, origem)}</select></label>
      ${camposRevisao({ revisao: d.proxima_revisao, responsavel: base?.responsavel || responsavelPadrao() })}
      <label class="marcar"><input type="checkbox" id="r-abrir" checked> Abrir a nova revisão no editor</label>`,
    botoes: [
      { texto: "Cancelar", valor: null },
      { texto: "Criar revisão", valor: "ok", classe: "primario" },
    ],
    aoAbrir: (j) => {
      // Começa no campo de descrição: o código já vem sugerido.
      j.querySelector("#r-descricao").focus();
    },
    coletar: (j) => {
      const r = lerRevisao(j);
      if (!r.revisao) {
        aviso("Informe o código da revisão (ex.: 01).", "erro");
        return undefined;
      }
      return { ...r, origem: j.querySelector("#r-origem").value, abrir: j.querySelector("#r-abrir").checked };
    },
  });
  if (!dados) return;
  try {
    lembrarResponsavel(dados.responsavel);
    const { abrir, ...corpo } = dados;
    const r = await api.criarRevisao(d.id, corpo);
    aviso(`Revisão ${dados.revisao} criada.`, "sucesso");
    // Abre no editor ou mostra a tabela de revisões do documento.
    const destino = abrir ? urlEditor(r.id) : urlDocumento(d.id);
    // Se a URL não muda (já estava na tela do documento), força o redesenho.
    if (location.hash === destino) window.dispatchEvent(new HashChangeEvent("hashchange"));
    else location.hash = destino;
  } catch (e) {
    aviso(e.message, "erro", 6000);
  }
}

/** Janela "Dados da revisão". Devolve true se salvou. */
async function editarRevisao(d, v) {
  const dados = await dialogo({
    titulo: `Dados da revisão — ${d.nome}`,
    largura: 620,
    conteudo: `${camposRevisao(v)}
      <p class="dica">Ao salvar, as variáveis de revisão (<code>\\var{revisao}</code>, <code>\\var{tabela_revisoes}</code>…) são atualizadas nesta revisão e nas posteriores ainda em elaboração.</p>`,
    botoes: [
      { texto: "Cancelar", valor: null },
      { texto: "Salvar", valor: "ok", classe: "primario" },
    ],
    coletar: (j) => {
      const r = lerRevisao(j);
      if (!r.revisao) {
        aviso("Informe o código da revisão (ex.: 01).", "erro");
        return undefined;
      }
      return r;
    },
  });
  if (!dados) return false;
  try {
    await api.editarRevisao(d.id, v.pasta, dados);
    return true;
  } catch (e) {
    aviso(e.message, "erro", 6000);
    return false;
  }
}

/** Janela "Dados do documento". Devolve o id (pasta) do documento após salvar, ou null. */
async function editarDocumento(d) {
  const dados = await dialogo({
    titulo: "Dados do documento",
    largura: 560,
    conteudo: `
      <label class="campo"><span>Nome do documento</span><input id="d-nome" type="text" value="${esc(d.nome)}" spellcheck="false"></label>
      <label class="campo"><span>Cliente</span><input id="d-cliente" type="text" value="${esc(d.cliente || "")}"></label>
      <label class="campo"><span>Observações (opcional)</span><input id="d-descricao" type="text" value="${esc(d.descricao || "")}"></label>`,
    botoes: [
      { texto: "Cancelar", valor: null },
      { texto: "Salvar", valor: "ok", classe: "primario" },
    ],
    coletar: (j) => {
      const nome = j.querySelector("#d-nome").value.trim();
      if (!nome) return undefined;
      return { nome, cliente: j.querySelector("#d-cliente").value.trim(), descricao: j.querySelector("#d-descricao").value.trim() };
    },
  });
  if (!dados) return null;
  try {
    const r = await api.editarDocumento(d.id, dados);
    return r.documento;
  } catch (e) {
    aviso(e.message, "erro", 6000);
    return null;
  }
}
