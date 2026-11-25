// Tela de histórico de versões (botão "Histórico" no topo do editor).
//
//  ┌ versões ──────────┬ arquivos da versão ┬ comparação (versão × atual) ┐
//  │ Rev. 01 (com nome)│ main.tex  alterado │  vermelho = só na versão    │
//  │ hoje 14:32 (auto) │ refs.bib  igual    │  verde    = só no atual     │
//  └───────────────────┴────────────────────┴─────────────────────────────┘
//
// Ações: dar nome à versão, restaurar um arquivo, restaurar o projeto
// inteiro, excluir a versão e salvar uma nova versão agora.

import { MergeView } from "@codemirror/merge";
import { EditorView, lineNumbers } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { api } from "./api.js";
import { esc, icone, aviso, perguntar, confirmar } from "./ui.js";
import { linguagemLatex } from "./latex.js";

const decodificar = (b) => new TextDecoder("utf-8").decode(new Uint8Array(b));

/** Data legível: "hoje 14:32", "ontem 09:10", "12/11/2026 16:05". */
function dataVersao(seg) {
  const d = new Date(seg * 1000);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const hoje = new Date();
  const ontem = new Date(Date.now() - 86400000);
  if (d.toDateString() === hoje.toDateString()) return `hoje ${hora}`;
  if (d.toDateString() === ontem.toDateString()) return `ontem ${hora}`;
  return `${d.toLocaleDateString("pt-BR")} ${hora}`;
}

const SITUACAO = { alterado: "alterado", removido: "apagado depois", novo: "criado depois", igual: "igual" };

/**
 * Abre o histórico sobre a área do editor.
 * @param {HTMLElement} recipiente  onde desenhar (a área do editor)
 * @param {string} id  projeto
 * @param {object} acoes  { fechar(), aposRestaurar(caminhos|null), salvarTudo() }
 */
export async function abrirHistorico(recipiente, id, acoes) {
  await acoes.salvarTudo();
  const tela = document.createElement("div");
  tela.className = "tela-historico";
  tela.innerHTML = `
    <div class="hist-lista">
      <div class="hist-cabecalho">
        <b>Histórico de versões</b>
        <button class="botao pequeno primario" id="h-salvar">${icone("estrela", 12)} Salvar versão agora</button>
      </div>
      <div class="hist-versoes" id="h-versoes"></div>
      <p class="dica hist-dica">Uma versão automática é guardada ao compilar (no máximo a cada 5 min). Versões com nome nunca são apagadas.</p>
    </div>
    <div class="hist-arquivos" id="h-arquivos"></div>
    <div class="hist-comparacao">
      <div class="hist-barra" id="h-barra"><span class="dica">Escolha uma versão à esquerda.</span></div>
      <div class="hist-diff" id="h-diff"></div>
    </div>
    <button class="botao hist-fechar" id="h-fechar">${icone("fechar")} Fechar histórico</button>`;
  recipiente.appendChild(tela);
  const $ = (s) => tela.querySelector(s);
  let versaoAtual = null;
  let merge = null;

  const fechar = () => {
    merge?.destroy();
    tela.remove();
    document.removeEventListener("keydown", teclaEsc, true);
    acoes.fechar();
  };
  const teclaEsc = (e) => {
    if (e.key === "Escape" && !document.querySelector(".modal-fundo")) fechar();
  };
  document.addEventListener("keydown", teclaEsc, true);
  $("#h-fechar").onclick = fechar;

  $("#h-salvar").onclick = async () => {
    const nome = await perguntar("Salvar versão", "Nome da versão (ex.: Rev. 01 enviada ao cliente)", "", "Salvar");
    if (nome === null) return;
    try {
      await acoes.salvarTudo();
      await api.historicoCriar(id, nome);
      aviso("Versão salva.", "sucesso");
      await listarVersoes();
    } catch (e) {
      aviso(e.message, "erro");
    }
  };

  /** Lista de versões à esquerda. */
  async function listarVersoes() {
    const versoes = await api.historico(id);
    const div = $("#h-versoes");
    if (!versoes.length) {
      div.innerHTML = '<p class="vazio pequeno">Ainda não há versões. Compile o projeto ou clique em "Salvar versão agora".</p>';
      return;
    }
    div.innerHTML = versoes
      .map((v) => `
        <div class="hist-versao ${v.nome ? "com-nome" : ""} ${versaoAtual === v.numero ? "ativa" : ""}" data-n="${v.numero}">
          <div class="hist-v-titulo">${v.nome ? `${icone("estrela", 12)} ${esc(v.nome)}` : esc(dataVersao(v.data))}</div>
          <div class="hist-v-info">${v.nome ? esc(dataVersao(v.data)) + " · " : ""}#${v.numero} · ${esc(v.automatica ? `automática (${v.motivo})` : "manual")}</div>
        </div>`)
      .join("");
    div.querySelectorAll(".hist-versao").forEach((d) => {
      d.onclick = () => escolherVersao(Number(d.dataset.n));
      d.oncontextmenu = (e) => {
        e.preventDefault();
        escolherVersao(Number(d.dataset.n));
      };
    });
    if (!versaoAtual) escolherVersao(versoes[0].numero);
  }

  /** Mostra os arquivos de uma versão. */
  async function escolherVersao(n) {
    versaoAtual = n;
    tela.querySelectorAll(".hist-versao").forEach((d) => d.classList.toggle("ativa", Number(d.dataset.n) === n));
    const arquivos = await api.historicoArquivos(id, n);
    const lista = $("#h-arquivos");
    lista.innerHTML = `
      <div class="hist-cabecalho"><b>Arquivos</b></div>
      ${arquivos
        .map((a) => `<div class="hist-arquivo ${a.situacao}" data-c="${esc(a.caminho)}">
            <span>${esc(a.caminho === ".englatex.json" ? "Variáveis e configurações" : a.caminho)}</span><small>${SITUACAO[a.situacao]}</small></div>`)
        .join("")}
      <div class="hist-acoes">
        <button class="botao pequeno" id="h-restaurar-tudo">${icone("recompilar", 12)} Restaurar projeto inteiro</button>
        <button class="botao pequeno" id="h-nomear">${icone("lapis", 12)} Dar nome</button>
        <button class="botao pequeno perigo" id="h-excluir">${icone("lixeira", 12)} Excluir versão</button>
      </div>`;
    lista.querySelectorAll(".hist-arquivo").forEach((d) => (d.onclick = () => comparar(d.dataset.c, d.classList[1])));
    $("#h-restaurar-tudo").onclick = async () => {
      if (!(await confirmar("Restaurar projeto", `Voltar todos os arquivos de texto para a versão #${n}? O estado atual será guardado antes, como uma nova versão (dá para desfazer).`, "Restaurar"))) return;
      try {
        await api.historicoRestaurar(id, n, null);
        aviso("Projeto restaurado.", "sucesso");
        acoes.aposRestaurar(null);
        fechar();
      } catch (e) {
        aviso(e.message, "erro");
      }
    };
    $("#h-nomear").onclick = async () => {
      const nome = await perguntar("Nome da versão", "Nome", "", "Salvar");
      if (nome === null) return;
      await api.historicoRenomear(id, n, nome).catch((e) => aviso(e.message, "erro"));
      listarVersoes();
    };
    $("#h-excluir").onclick = async () => {
      if (!(await confirmar("Excluir versão", `Excluir a versão #${n} do histórico?`, "Excluir", true))) return;
      await api.historicoExcluir(id, n).catch((e) => aviso(e.message, "erro"));
      versaoAtual = null;
      $("#h-arquivos").innerHTML = "";
      $("#h-diff").innerHTML = "";
      listarVersoes();
    };
    const primeiro = arquivos.find((a) => a.situacao !== "igual") || arquivos[0];
    if (primeiro) comparar(primeiro.caminho, primeiro.situacao);
  }

  /** Compara o arquivo da versão com o atual (lado a lado). */
  async function comparar(caminho, situacao) {
    tela.querySelectorAll(".hist-arquivo").forEach((d) => d.classList.toggle("ativo", d.dataset.c === caminho));
    const n = versaoAtual;
    const [antigo, atual] = await Promise.all([
      situacao === "novo" ? Promise.resolve("") : api.historicoArquivo(id, n, caminho).then(decodificar).catch(() => ""),
      situacao === "removido" ? Promise.resolve("") : api.lerArquivo(id, caminho).then(decodificar).catch(() => ""),
    ]);
    $("#h-barra").innerHTML = `
      <span><b>${esc(caminho)}</b> — à esquerda a versão #${n}, à direita o arquivo atual</span>
      ${situacao !== "novo" && situacao !== "igual" ? `<button class="botao pequeno primario" id="h-restaurar">Restaurar este arquivo</button>` : ""}`;
    $("#h-restaurar")?.addEventListener("click", async () => {
      try {
        await api.historicoRestaurar(id, n, caminho);
        aviso(`${caminho} restaurado.`, "sucesso");
        acoes.aposRestaurar([caminho]);
        comparar(caminho, "igual");
        escolherVersao(n);
      } catch (e) {
        aviso(e.message, "erro");
      }
    });
    merge?.destroy();
    const div = $("#h-diff");
    div.innerHTML = "";
    const ext = [EditorState.phrases.of({ "$ unchanged lines": "$ linhas sem alteração" }), lineNumbers(), EditorView.editable.of(false), EditorState.readOnly.of(true), EditorView.lineWrapping, caminho.endsWith(".tex") || caminho.endsWith(".bib") ? linguagemLatex : []];
    merge = new MergeView({
      a: { doc: antigo, extensions: ext },
      b: { doc: atual, extensions: ext },
      parent: div,
      collapseUnchanged: { margin: 3, minSize: 6 },
      gutter: true,
    });
  }

  await listarVersoes();
}
