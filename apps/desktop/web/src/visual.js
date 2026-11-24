// Modo visual do editor (como o "Visual Editor" do Overleaf).
//
// O texto continua sendo o mesmo código LaTeX (mesmo arquivo, mesmo desfazer),
// mas o editor ESCONDE a marcação e mostra o resultado:
//   \section{Título}      -> título grande (sem o comando)
//   \textbf{x} \textit{x} -> negrito / itálico
//   $x^2$  \[ ... \]      -> fórmula desenhada
//   equation / align      -> fórmula desenhada logo abaixo do código
//   \item                 -> marcador • ou número
//   \includegraphics{a}   -> miniatura da imagem
//   \var{nome}            -> etiqueta com o valor da variável
//   tabular               -> botão "Editar tabela"
//   preâmbulo             -> recolhido num bloco clicável
//
// Na linha onde está o cursor a marcação aparece de novo, para poder editar.
// Tudo é feito com "decorações" do CodeMirror num StateField (recalculado a
// cada alteração ou movimento do cursor).

import { StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";
import { EditorView, Decoration, WidgetType } from "@codemirror/view";
import { desenharFormula, AMBIENTES_MATEMATICOS } from "./formulas.js";

/** Liga/desliga o preâmbulo aberto (efeito disparado pelo bloco clicável). */
export const alternarPreambulo = StateEffect.define();

// ---------------------------------------------------------------------------
// Widgets (elementos desenhados no lugar do código)
// ---------------------------------------------------------------------------

class FormulaWidget extends WidgetType {
  constructor(codigo, exibicao, variaveis) {
    super();
    this.codigo = codigo;
    this.exibicao = exibicao;
    this.variaveis = variaveis;
  }
  eq(o) {
    return o.codigo === this.codigo && o.exibicao === this.exibicao;
  }
  toDOM() {
    const s = document.createElement(this.exibicao ? "div" : "span");
    s.className = this.exibicao ? "vis-formula-bloco" : "vis-formula";
    desenharFormula(s, this.codigo, this.exibicao, this.variaveis);
    return s;
  }
  ignoreEvent() {
    return false; // clicar posiciona o cursor (e mostra o código)
  }
}

class TextoWidget extends WidgetType {
  constructor(texto, classe, titulo = "") {
    super();
    this.texto = texto;
    this.classe = classe;
    this.titulo = titulo;
  }
  eq(o) {
    return o.texto === this.texto && o.classe === this.classe && o.titulo === this.titulo;
  }
  toDOM() {
    const s = document.createElement("span");
    s.className = this.classe;
    s.textContent = this.texto;
    if (this.titulo) s.title = this.titulo;
    return s;
  }
}

class ImagemWidget extends WidgetType {
  constructor(url, nome) {
    super();
    this.url = url;
    this.nome = nome;
  }
  eq(o) {
    return o.url === this.url;
  }
  toDOM() {
    const d = document.createElement("div");
    d.className = "vis-imagem";
    if (/\.(png|jpe?g|gif|bmp|svg|webp)$/i.test(this.nome)) {
      const img = document.createElement("img");
      img.src = this.url;
      img.alt = this.nome;
      d.appendChild(img);
    } else {
      d.textContent = `🖼 ${this.nome}`;
    }
    return d;
  }
}

class BotaoWidget extends WidgetType {
  constructor(texto, acao, classe = "vis-botao") {
    super();
    this.texto = texto;
    this.acao = acao;
    this.classe = classe;
  }
  eq(o) {
    return o.texto === this.texto && o.classe === this.classe;
  }
  toDOM(view) {
    const b = document.createElement("button");
    b.className = this.classe;
    b.textContent = this.texto;
    b.onmousedown = (e) => {
      e.preventDefault();
      this.acao(view, b);
    };
    return b;
  }
  ignoreEvent() {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Cálculo das decorações
// ---------------------------------------------------------------------------

const TITULOS = { part: "vis-h0", chapter: "vis-h1", section: "vis-h2", subsection: "vis-h3", subsubsection: "vis-h4", paragraph: "vis-h5" };
const FORMATOS = { textbf: "vis-negrito", textit: "vis-italico", emph: "vis-italico", underline: "vis-sublinhado", texttt: "vis-mono", textsc: "vis-versalete" };

/** Fecha a chave correspondente a partir de `ini` (posição do "{"). */
function fimChave(texto, ini) {
  let nivel = 0;
  for (let i = ini; i < texto.length; i++) {
    const c = texto[i];
    if (c === "\\") { i++; continue; }
    if (c === "{") nivel++;
    else if (c === "}" && --nivel === 0) return i;
    else if (c === "\n" && texto[i + 1] === "\n") return -1; // parágrafo acabou: chave sem fechamento
  }
  return -1;
}

/**
 * Monta as decorações do modo visual.
 * @param {EditorState} state
 * @param {object} ctx  { variaveis, urlArquivo(caminho), editarTabela(view, pos), preambuloAberto }
 */
function calcular(state, ctx, preambuloAberto) {
  const texto = state.doc.toString();
  const doc = state.doc;
  const cursor = state.selection.main;
  const linhaCursorIni = doc.lineAt(cursor.from).number;
  const linhaCursorFim = doc.lineAt(cursor.to).number;
  /** O intervalo toca a(s) linha(s) do cursor? Então mostramos o código. */
  const editando = (de, ate) => {
    const l1 = doc.lineAt(de).number;
    const l2 = doc.lineAt(Math.min(ate, doc.length)).number;
    return l2 >= linhaCursorIni && l1 <= linhaCursorFim;
  };

  /**
   * Substituições em bloco precisam cobrir linhas inteiras. Se o trecho ocupa
   * linhas inteiras (só espaços antes/depois), devolve o intervalo das linhas;
   * senão devolve null (e usamos um widget em linha).
   */
  const linhasInteiras = (de, ate) => {
    const l1 = doc.lineAt(de), l2 = doc.lineAt(ate);
    if (texto.slice(l1.from, de).trim() || texto.slice(ate, l2.to).trim()) return null;
    return [l1.from, l2.to];
  };

  const decos = []; // { de, ate, deco }
  const ocupado = []; // intervalos já substituídos (evita sobreposição)
  const livre = (de, ate) => !ocupado.some(([a, b]) => de < b && ate > a);
  const add = (de, ate, deco, substitui = false) => {
    if (substitui) {
      if (!livre(de, ate)) return false;
      ocupado.push([de, ate]);
    }
    decos.push({ de, ate, deco });
    return true;
  };

  // --- Preâmbulo recolhido -------------------------------------------------
  const inicioDoc = texto.indexOf("\\begin{document}");
  let inicioCorpo = 0;
  if (inicioDoc > 0) {
    inicioCorpo = inicioDoc;
    const nLinhas = doc.lineAt(inicioDoc).number - 1;
    if (!preambuloAberto && !editando(0, inicioDoc) && nLinhas > 0) {
      const fimPreambulo = doc.line(nLinhas).to;
      add(0, fimPreambulo, Decoration.replace({
        block: true,
        widget: new BotaoWidget(`▸ Preâmbulo (${nLinhas} linhas) — clique para mostrar`, (view) => view.dispatch({ effects: alternarPreambulo.of(true) }), "vis-preambulo"),
      }), true);
    }
  }

  // --- Comentários: ignorados (não decoramos nada dentro deles) -----------
  const comentarios = [];
  for (const m of texto.matchAll(/(?<!\\)%.*$/gm)) comentarios.push([m.index, m.index + m[0].length]);
  const emComentario = (p) => comentarios.some(([a, b]) => p >= a && p < b);

  // --- Ambientes matemáticos de várias linhas: fórmula desenhada abaixo ---
  const matematica = []; // intervalos de matemática (para não formatar texto dentro)
  for (const amb of AMBIENTES_MATEMATICOS) {
    const re = new RegExp(`\\\\begin\\{${amb.replace("*", "\\*")}\\}([\\s\\S]*?)\\\\end\\{${amb.replace("*", "\\*")}\\}`, "g");
    for (const m of texto.matchAll(re)) {
      const de = m.index, ate = de + m[0].length;
      if (emComentario(de)) continue;
      matematica.push([de, ate]);
      if (de < inicioCorpo) continue;
      const base = amb.replace("*", "");
      const codigo = ["align", "flalign", "eqnarray"].includes(base) ? `\\begin{aligned}${m[1]}\\end{aligned}` : ["gather", "multline"].includes(base) ? `\\begin{gathered}${m[1]}\\end{gathered}` : m[1];
      if (editando(de, ate)) {
        // Editando: mostra o código e a prévia logo abaixo.
        add(ate, ate, Decoration.widget({ widget: new FormulaWidget(codigo, true, ctx.variaveis()), block: true, side: 1 }));
      } else {
        const inteiro = linhasInteiras(de, ate);
        const w = new FormulaWidget(codigo, true, ctx.variaveis());
        if (inteiro) add(inteiro[0], inteiro[1], Decoration.replace({ widget: w, block: true }), true);
        else add(de, ate, Decoration.replace({ widget: w }), true);
      }
    }
  }
  // \[ ... \]
  for (const m of texto.matchAll(/(?<!\\)\\\[([\s\S]*?)\\\]/g)) {
    const de = m.index, ate = de + m[0].length;
    if (de < inicioCorpo || emComentario(de)) continue;
    matematica.push([de, ate]);
    if (!editando(de, ate) && !m[1].includes("\n\n")) {
      const inteiro = linhasInteiras(de, ate);
      const w = new FormulaWidget(m[1], true, ctx.variaveis());
      if (inteiro) add(inteiro[0], inteiro[1], Decoration.replace({ widget: w, block: true }), true);
      else add(de, ate, Decoration.replace({ widget: w }), true);
    }
  }
  // $...$  e  \( ... \)
  for (const m of texto.matchAll(/(?<![\\$])\$(?!\$)((?:\\\$|[^$\n])+?)\$|\\\(([\s\S]*?)\\\)/g)) {
    const de = m.index, ate = de + m[0].length;
    if (de < inicioCorpo || emComentario(de) || matematica.some(([a, b]) => de >= a && de < b)) continue;
    matematica.push([de, ate]);
    if (!editando(de, ate)) add(de, ate, Decoration.replace({ widget: new FormulaWidget(m[1] ?? m[2], false, ctx.variaveis()) }), true);
  }
  const emMatematica = (p) => matematica.some(([a, b]) => p >= a && p < b);

  // --- Comandos com argumento {..} ---------------------------------------
  const reCmd = /\\(part|chapter|section|subsection|subsubsection|paragraph|textbf|textit|emph|underline|texttt|textsc|title|author|caption|footnote|var|includegraphics|label|ref|eqref|cite)\*?\s*(\[[^\]]*\])?\{/g;
  for (const m of texto.matchAll(reCmd)) {
    const de = m.index;
    if (de < inicioCorpo && !["title", "author"].includes(m[1])) continue;
    if (emComentario(de) || emMatematica(de)) continue;
    const abre = de + m[0].length - 1;
    const fecha = fimChave(texto, abre);
    if (fecha < 0) continue;
    const nome = m[1];
    const conteudo = texto.slice(abre + 1, fecha);
    const ate = fecha + 1;
    const mostrandoCodigo = editando(de, ate);

    if (nome in TITULOS) {
      // A linha inteira ganha o estilo de título; a marcação some fora da edição.
      const linha = doc.lineAt(de);
      add(linha.from, linha.from, Decoration.line({ class: `vis-titulo ${TITULOS[nome]}` }));
      if (!mostrandoCodigo) {
        add(de, abre + 1, Decoration.replace({}), true);
        add(fecha, ate, Decoration.replace({}), true);
      }
    } else if (nome in FORMATOS) {
      add(abre + 1, fecha, Decoration.mark({ class: FORMATOS[nome] }));
      if (!mostrandoCodigo) {
        add(de, abre + 1, Decoration.replace({}), true);
        add(fecha, ate, Decoration.replace({}), true);
      }
    } else if (nome === "title" || nome === "author") {
      add(abre + 1, fecha, Decoration.mark({ class: nome === "title" ? "vis-titulo-doc" : "vis-autor" }));
    } else if (nome === "caption") {
      add(abre + 1, fecha, Decoration.mark({ class: "vis-legenda" }));
    } else if (nome === "footnote" && !mostrandoCodigo) {
      add(de, ate, Decoration.replace({ widget: new TextoWidget("¹", "vis-nota", conteudo) }), true);
    } else if (nome === "var" && !mostrandoCodigo) {
      const v = ctx.variaveis().find((x) => x.nome === conteudo);
      const valor = v ? (v.valor || "(vazio)") : `[${conteudo}?]`;
      add(de, ate, Decoration.replace({ widget: new TextoWidget(valor, v ? "vis-variavel" : "vis-variavel faltando", `\\var{${conteudo}}`) }), true);
    } else if (nome === "includegraphics") {
      const linha = doc.lineAt(de);
      add(linha.to, linha.to, Decoration.widget({ widget: new ImagemWidget(ctx.urlArquivo(conteudo), conteudo), block: true, side: 1 }));
    } else if (["label", "ref", "eqref", "cite"].includes(nome) && !mostrandoCodigo) {
      const rotulo = nome === "label" ? `🏷 ${conteudo}` : nome === "cite" ? `[${conteudo}]` : `→ ${conteudo}`;
      add(de, ate, Decoration.replace({ widget: new TextoWidget(rotulo, `vis-ref vis-${nome}`, m[0] + conteudo + "}") }), true);
    }
  }

  // --- Listas: \item vira marcador ou número ------------------------------
  const pilha = [];
  for (const m of texto.matchAll(/\\(begin|end)\{(itemize|enumerate|description)\}|\\item\b(\[[^\]]*\])?/g)) {
    const de = m.index;
    if (emComentario(de) || de < inicioCorpo) continue;
    if (m[1] === "begin") { pilha.push({ tipo: m[2], n: 0 }); continue; }
    if (m[1] === "end") { pilha.pop(); continue; }
    const topo = pilha[pilha.length - 1];
    if (!topo) continue;
    topo.n++;
    const ate = de + m[0].length;
    if (editando(de, ate)) continue;
    const marca = m[3] ? m[3].slice(1, -1) : topo.tipo === "enumerate" ? `${topo.n}.` : "•";
    add(de, ate, Decoration.replace({ widget: new TextoWidget(marca, "vis-marcador") }), true);
  }

  // --- Linhas de estrutura (\begin/\end de ambientes) ficam discretas ----
  for (const m of texto.matchAll(/^[ \t]*\\(begin|end)\{(itemize|enumerate|description|center|figure|table|minipage|abstract|quote)\*?\}.*$/gm)) {
    if (m.index < inicioCorpo) continue;
    add(m.index, m.index, Decoration.line({ class: "vis-estrutura" }));
  }

  // --- Tabelas: botão "Editar tabela" antes do tabular -------------------
  for (const m of texto.matchAll(/\\begin\{(tabularx?|longtable)\}/g)) {
    if (m.index < inicioCorpo || emComentario(m.index)) continue;
    const linha = doc.lineAt(m.index);
    const pos = m.index;
    add(linha.from, linha.from, Decoration.widget({ widget: new BotaoWidget("✎ Editar tabela", (view) => ctx.editarTabela(view, pos + 2)), side: -1 }));
  }

  // Monta o conjunto ordenado (o CodeMirror exige ordem crescente).
  decos.sort((a, b) => a.de - b.de || a.deco.startSide - b.deco.startSide);
  const b = new RangeSetBuilder();
  for (const { de, ate, deco } of decos) {
    try {
      b.add(de, ate, deco);
    } catch {
      /* decoração fora de ordem: ignora */
    }
  }
  return b.finish();
}

/**
 * Cria a extensão do modo visual.
 * @param {object} ctx  { variaveis(), urlArquivo(c), editarTabela(view, pos) }
 */
export function modoVisual(ctx) {
  const campoPreambulo = StateField.define({
    create: () => false,
    update(aberto, tr) {
      for (const e of tr.effects) if (e.is(alternarPreambulo)) aberto = e.value;
      return aberto;
    },
  });
  const campo = StateField.define({
    create: (state) => calcular(state, ctx, false),
    update(decos, tr) {
      if (tr.docChanged || tr.selection || tr.effects.length) {
        return calcular(tr.state, ctx, tr.state.field(campoPreambulo));
      }
      return decos;
    },
    provide: (f) => EditorView.decorations.from(f),
  });
  return [campoPreambulo, campo, EditorView.editorAttributes.of({ class: "modo-visual" })];
}
