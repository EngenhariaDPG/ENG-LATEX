// Fórmulas: desenho com KaTeX (rápido, sem compilar o documento).
//
// Usado em dois lugares:
//  - prévia ao passar o mouse sobre uma fórmula no editor;
//  - modo visual (fórmulas aparecem desenhadas no próprio texto).
//
// O KaTeX entende a maior parte da matemática do LaTeX (amsmath). Para os
// comandos do siunitx (\SI, \si, \num) e para \var{nome} fazemos uma
// tradução simples antes de desenhar.

import katex from "katex";
import { hoverTooltip } from "@codemirror/view";

/** Unidades e prefixos do siunitx mais usados -> texto. */
const UNIDADES = {
  kilo: "k", mega: "M", giga: "G", milli: "m", micro: "μ", centi: "c", deci: "d", nano: "n",
  newton: "N", meter: "m", metre: "m", gram: "g", kilogram: "kg", second: "s", pascal: "Pa",
  joule: "J", watt: "W", volt: "V", ampere: "A", ohm: "Ω", hertz: "Hz", kelvin: "K",
  celsius: "°C", degreeCelsius: "°C", degree: "°", liter: "L", litre: "L", tonne: "t",
  hour: "h", minute: "min", bar: "bar", percent: "%", radian: "rad", kgf: "kgf", hp: "hp",
  square: "", cubic: "", per: "/", squared: "²", cubed: "³",
};

/** Converte os argumentos de unidade do siunitx (\kilo\newton\per\meter\squared) em texto. */
function unidadeTexto(u) {
  let t = u.replace(/\\(square|cubic)\\([a-zA-Z]+)/g, (_, p, n) => `\\${n}${p === "square" ? "²" : "³"}`);
  t = t.replace(/\\([a-zA-Z]+)/g, (_, n) => (n in UNIDADES ? UNIDADES[n] : n));
  return t.replace(/~/g, " ").replace(/\./g, "·").trim();
}

/**
 * Prepara o código para o KaTeX: troca \var{nome} pelo valor da tabela de
 * variáveis e os comandos do siunitx por texto.
 */
export function prepararFormula(codigo, variaveis = []) {
  let c = codigo;
  c = c.replace(/\\var\{([A-Za-z0-9_-]+)\}/g, (_, n) => {
    const v = variaveis.find((x) => x.nome === n);
    return v ? (v.tipo === "latex" ? v.valor : `\\text{${v.valor.replace(/[{}\\]/g, "")}}`) : `\\text{[${n}?]}`;
  });
  c = c.replace(/\\(SI|qty)\s*(?:\[[^\]]*\])?\{([^{}]*)\}\{([^{}]*)\}/g, (_, __, n, u) => `${n.replace(/,/g, "{,}")}\\,\\mathrm{${unidadeTexto(u)}}`);
  c = c.replace(/\\(si|unit)\s*(?:\[[^\]]*\])?\{([^{}]*)\}/g, (_, __, u) => `\\mathrm{${unidadeTexto(u)}}`);
  c = c.replace(/\\num\s*(?:\[[^\]]*\])?\{([^{}]*)\}/g, (_, n) => n.replace(/,/g, "{,}"));
  c = c.replace(/\\(label|nonumber|notag)\s*(\{[^}]*\})?/g, "");
  return c;
}

/** Desenha uma fórmula num elemento. Em caso de erro, mostra a mensagem do KaTeX. */
export function desenharFormula(elemento, codigo, exibicao, variaveis) {
  try {
    katex.render(prepararFormula(codigo, variaveis), elemento, {
      displayMode: exibicao,
      throwOnError: true,
      strict: "ignore",
      trust: false,
      // Ambientes de várias linhas (align, gather) precisam ser desenhados como bloco.
      macros: { "\\degree": "^\\circ", "\\celsius": "^\\circ\\mathrm{C}", "\\ohm": "\\Omega", "\\tonne": "\\mathrm{t}" },
    });
    return true;
  } catch (e) {
    elemento.innerHTML = "";
    const erro = document.createElement("span");
    erro.className = "formula-erro";
    erro.textContent = String(e.message || e).replace(/^KaTeX parse error: /, "");
    elemento.appendChild(erro);
    return false;
  }
}

/** Ambientes matemáticos de várias linhas (desenhados como bloco). */
export const AMBIENTES_MATEMATICOS = ["equation", "equation*", "align", "align*", "gather", "gather*", "multline", "multline*", "flalign", "flalign*", "eqnarray", "eqnarray*", "displaymath", "math"];

/**
 * Procura a fórmula que contém a posição `pos` do texto.
 * Devolve { de, ate, codigo, exibicao } ou null.
 */
export function formulaEm(texto, pos) {
  // 1) Ambientes (equation, align...): procura o \begin mais próximo antes de pos.
  for (const amb of AMBIENTES_MATEMATICOS) {
    const ini = texto.lastIndexOf(`\\begin{${amb}}`, pos);
    if (ini < 0) continue;
    const fimTag = `\\end{${amb}}`;
    const fim = texto.indexOf(fimTag, ini);
    if (fim >= 0 && pos <= fim + fimTag.length) {
      const corpo = texto.slice(ini + amb.length + 8, fim);
      // align/gather viram "aligned"/"gathered" (o KaTeX desenha dentro de um bloco).
      const base = amb.replace("*", "");
      const codigo = ["align", "flalign", "eqnarray"].includes(base)
        ? `\\begin{aligned}${corpo}\\end{aligned}`
        : base === "gather" ? `\\begin{gathered}${corpo}\\end{gathered}`
        : base === "multline" ? `\\begin{gathered}${corpo}\\end{gathered}`
        : corpo;
      return { de: ini, ate: fim + fimTag.length, codigo, exibicao: true };
    }
  }
  // 2) \[ ... \]  e  \( ... \)
  for (const [abre, fecha, exibicao] of [["\\[", "\\]", true], ["\\(", "\\)", false]]) {
    const ini = texto.lastIndexOf(abre, pos);
    // "\\[2mm]" é quebra de linha com espaço, não fórmula.
    if (ini >= 0 && texto[ini - 1] !== "\\") {
      const fim = texto.indexOf(fecha, ini + 2);
      if (fim >= 0 && pos <= fim + 2) return { de: ini, ate: fim + 2, codigo: texto.slice(ini + 2, fim), exibicao };
    }
  }
  // 3) $$ ... $$ e $ ... $ na mesma linha/parágrafo: conta os cifrões desde o início do parágrafo.
  const inicioPar = Math.max(texto.lastIndexOf("\n\n", pos), 0);
  const fimPar = (() => {
    const f = texto.indexOf("\n\n", pos);
    return f < 0 ? texto.length : f;
  })();
  const trecho = texto.slice(inicioPar, fimPar);
  const re = /\$\$([\s\S]+?)\$\$|(?<!\\)\$((?:\\\$|[^$])+?)\$/g;
  let m;
  while ((m = re.exec(trecho))) {
    const de = inicioPar + m.index;
    const ate = de + m[0].length;
    if (pos >= de && pos <= ate) return { de, ate, codigo: m[1] ?? m[2], exibicao: m[1] !== undefined };
  }
  return null;
}

/** Prévia da fórmula ao passar o mouse (extensão do CodeMirror). */
export function previaFormulas(obterVariaveis) {
  return hoverTooltip(
    (view, pos) => {
      const texto = view.state.doc.toString();
      const f = formulaEm(texto, pos);
      if (!f) return null;
      return {
        pos: f.de,
        end: f.ate,
        above: true,
        create: () => {
          const dom = document.createElement("div");
          dom.className = "previa-formula";
          desenharFormula(dom, f.codigo, true, obterVariaveis());
          return { dom };
        },
      };
    },
    { hoverTime: 350 },
  );
}
