// Suporte a LaTeX no editor: realce de sintaxe, autocompletar e atalhos.
//
// O autocompletar entende o contexto do cursor:
//   \sec...            -> comandos (\section{}, \subsection{}...)
//   \begin{...         -> ambientes (insere também o \end{} correspondente)
//   \ref{... \eqref{   -> rótulos (\label) do projeto
//   \cite{...          -> chaves dos arquivos .bib do projeto
//   \usepackage{...    -> pacotes comuns
//   \includegraphics{  -> imagens do projeto;  \input{ / \include{ -> arquivos .tex

import { StreamLanguage } from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { EditorState } from "@codemirror/state";
import { snippetCompletion } from "@codemirror/autocomplete";
import { EditorSelection } from "@codemirror/state";

/** Linguagem LaTeX para o CodeMirror (modo clássico "stex"). */
export const linguagemLatex = StreamLanguage.define(stex);

/** Define "%" como comentário de linha (para Ctrl+/ funcionar). */
export const dadosLatex = EditorState.languageData.of(() => [{ commentTokens: { line: "%" } }]);

// ---------------------------------------------------------------------------
// Listas de comandos, ambientes e pacotes
// ---------------------------------------------------------------------------
// Nos modelos, #{} marca onde o cursor para; Tab pula para o próximo.

const COMANDOS = [
  // Estrutura
  ["\\section{#{}}", "seção"], ["\\subsection{#{}}", "subseção"], ["\\subsubsection{#{}}", "subsubseção"],
  ["\\section*{#{}}", "seção sem número"], ["\\chapter{#{}}", "capítulo"], ["\\part{#{}}", "parte"],
  ["\\paragraph{#{}}", "parágrafo"], ["\\label{#{}}", "rótulo"], ["\\ref{#{}}", "referência"],
  ["\\eqref{#{}}", "referência de equação"], ["\\pageref{#{}}", "página do rótulo"], ["\\cite{#{}}", "citação"],
  ["\\footnote{#{}}", "nota de rodapé"], ["\\caption{#{}}", "legenda"], ["\\item #{}", "item de lista"],
  ["\\begin{#{}}", "início de ambiente"], ["\\end{#{}}", "fim de ambiente"],
  ["\\input{#{}}", "incluir arquivo"], ["\\include{#{}}", "incluir capítulo"],
  ["\\includegraphics[width=#{0.8}\\textwidth]{#{}}", "inserir imagem"],
  ["\\usepackage{#{}}", "carregar pacote"], ["\\usepackage[#{}]{#{}}", "pacote com opções"],
  ["\\documentclass[#{12pt,a4paper}]{#{article}}", "classe do documento"],
  ["\\title{#{}}", "título"], ["\\author{#{}}", "autor"], ["\\date{#{}}", "data"],
  ["\\maketitle", "gerar título"], ["\\tableofcontents", "sumário"], ["\\listoffigures", "lista de figuras"],
  ["\\listoftables", "lista de tabelas"], ["\\appendix", "apêndices"], ["\\bibliography{#{}}", "bibliografia"],
  ["\\bibliographystyle{#{plain}}", "estilo da bibliografia"], ["\\printbibliography", "bibliografia (biblatex)"],
  ["\\newpage", "nova página"], ["\\clearpage", "limpar página"], ["\\newline", "nova linha"],
  ["\\noindent", "sem recuo"], ["\\centering", "centralizar"], ["\\today", "data de hoje"],
  ["\\vspace{#{1cm}}", "espaço vertical"], ["\\hspace{#{1cm}}", "espaço horizontal"], ["\\hfill", "preencher linha"],
  ["\\vfill", "preencher vertical"], ["\\newcommand{\\#{nome}}{#{}}", "novo comando"],
  ["\\renewcommand{\\#{nome}}{#{}}", "redefinir comando"], ["\\setlength{\\#{}}{#{}}", "definir comprimento"],
  ["\\var{#{}}", "variável do documento"], ["\\url{#{}}", "endereço web"], ["\\href{#{}}{#{}}", "link"],
  // Formatação
  ["\\textbf{#{}}", "negrito"], ["\\textit{#{}}", "itálico"], ["\\underline{#{}}", "sublinhado"],
  ["\\emph{#{}}", "ênfase"], ["\\texttt{#{}}", "monoespaçado"], ["\\textsc{#{}}", "versalete"],
  ["\\textcolor{#{red}}{#{}}", "texto colorido"], ["\\small", "fonte pequena"], ["\\large", "fonte grande"],
  ["\\Large", "fonte maior"], ["\\LARGE", "fonte muito grande"], ["\\footnotesize", "fonte de rodapé"],
  ["\\tiny", "fonte mínima"], ["\\huge", "fonte enorme"], ["\\normalsize", "fonte normal"],
  // Tabelas
  ["\\hline", "linha horizontal"], ["\\toprule", "linha superior (booktabs)"], ["\\midrule", "linha do meio (booktabs)"],
  ["\\bottomrule", "linha inferior (booktabs)"], ["\\multicolumn{#{2}}{#{c}}{#{}}", "mesclar colunas"],
  ["\\multirow{#{2}}{*}{#{}}", "mesclar linhas"], ["\\cline{#{1-2}}", "linha parcial"],
  // Matemática
  ["\\frac{#{}}{#{}}", "fração"], ["\\dfrac{#{}}{#{}}", "fração grande"], ["\\sqrt{#{}}", "raiz quadrada"],
  ["\\sqrt[#{n}]{#{}}", "raiz n-ésima"], ["\\sum_{#{i=1}}^{#{n}}", "somatório"], ["\\prod_{#{}}^{#{}}", "produtório"],
  ["\\int_{#{a}}^{#{b}}", "integral"], ["\\iint", "integral dupla"], ["\\oint", "integral de contorno"],
  ["\\lim_{#{x \\to 0}}", "limite"], ["\\partial", "derivada parcial"], ["\\nabla", "nabla"],
  ["\\infty", "infinito"], ["\\cdot", "ponto de multiplicação"], ["\\times", "vezes"], ["\\div", "dividido"],
  ["\\pm", "mais ou menos"], ["\\leq", "menor ou igual"], ["\\geq", "maior ou igual"], ["\\neq", "diferente"],
  ["\\approx", "aproximadamente"], ["\\equiv", "equivalente"], ["\\propto", "proporcional"],
  ["\\rightarrow", "seta"], ["\\Rightarrow", "implica"], ["\\Leftrightarrow", "equivale"],
  ["\\left( #{} \\right)", "parênteses ajustáveis"], ["\\left[ #{} \\right]", "colchetes ajustáveis"],
  ["\\mathrm{#{}}", "texto reto em fórmula"], ["\\mathbf{#{}}", "negrito em fórmula"], ["\\text{#{}}", "texto em fórmula"],
  ["\\vec{#{}}", "vetor"], ["\\hat{#{}}", "chapéu"], ["\\bar{#{}}", "barra"], ["\\dot{#{}}", "ponto (derivada)"],
  ["\\overline{#{}}", "barra longa"], ["\\underbrace{#{}}_{#{}}", "chave inferior"],
  ["\\alpha", "α"], ["\\beta", "β"], ["\\gamma", "γ"], ["\\Gamma", "Γ"], ["\\delta", "δ"], ["\\Delta", "Δ"],
  ["\\epsilon", "ε"], ["\\varepsilon", "ε (variante)"], ["\\zeta", "ζ"], ["\\eta", "η"], ["\\theta", "θ"],
  ["\\Theta", "Θ"], ["\\lambda", "λ"], ["\\Lambda", "Λ"], ["\\mu", "μ"], ["\\nu", "ν"], ["\\xi", "ξ"],
  ["\\pi", "π"], ["\\Pi", "Π"], ["\\rho", "ρ"], ["\\sigma", "σ"], ["\\Sigma", "Σ"], ["\\tau", "τ"],
  ["\\phi", "φ"], ["\\varphi", "φ (variante)"], ["\\Phi", "Φ"], ["\\chi", "χ"], ["\\psi", "ψ"], ["\\Psi", "Ψ"],
  ["\\omega", "ω"], ["\\Omega", "Ω"], ["\\sin", "seno"], ["\\cos", "cosseno"], ["\\tan", "tangente"],
  ["\\log", "logaritmo"], ["\\ln", "logaritmo natural"], ["\\exp", "exponencial"], ["\\max", "máximo"], ["\\min", "mínimo"],
  // siunitx (unidades)
  ["\\SI{#{}}{#{\\kilo\\newton}}", "valor com unidade (siunitx)"], ["\\si{#{}}", "unidade (siunitx)"],
  ["\\num{#{}}", "número formatado (siunitx)"], ["\\qty{#{}}{#{}}", "quantidade (siunitx 3)"],
];

const AMBIENTES = [
  ["itemize", "\\item #{}"], ["enumerate", "\\item #{}"], ["description", "\\item[#{}] #{}"],
  ["equation", "#{}"], ["equation*", "#{}"], ["align", "#{} &= #{} \\\\"], ["align*", "#{} &= #{}"],
  ["gather", "#{}"], ["cases", "#{} & \\text{se } #{} \\\\"],
  ["figure", "\\centering\n\t\\includegraphics[width=0.8\\textwidth]{#{}}\n\t\\caption{#{}}\n\t\\label{fig:#{}}", "[h]"],
  ["table", "\\centering\n\t\\caption{#{}}\n\t\\label{tab:#{}}\n\t\\begin{tabular}{#{lcc}}\n\t\t\\toprule\n\t\t#{} \\\\\n\t\t\\midrule\n\t\t \\\\\n\t\t\\bottomrule\n\t\\end{tabular}", "[h]"],
  ["tabular", "#{} \\\\\n\t\\hline", "{#{lcc}}"], ["tabularx", "#{} \\\\", "{\\textwidth}{#{lXr}}"],
  ["longtable", "#{} \\\\", "{#{lcc}}"], ["center", "#{}"], ["flushleft", "#{}"], ["flushright", "#{}"],
  ["minipage", "#{}", "{#{0.45}\\textwidth}"], ["matrix", "#{}"], ["pmatrix", "#{} & #{} \\\\\n\t#{} & #{}"],
  ["bmatrix", "#{} & #{} \\\\\n\t#{} & #{}"], ["array", "#{}", "{#{cc}}"], ["abstract", "#{}"],
  ["quote", "#{}"], ["verbatim", "#{}"], ["tikzpicture", "#{}"], ["axis", "\\addplot {#{x^2}};"],
  ["frame", "#{}", "{#{Título}}"], ["block", "#{}", "{#{Título}}"], ["columns", "\\column{0.5\\textwidth}\n\t#{}"],
  ["proof", "#{}"], ["theorem", "#{}"], ["lstlisting", "#{}"], ["thebibliography", "\\bibitem{#{}} #{}", "{9}"],
];

const PACOTES = [
  "amsmath", "amssymb", "amsthm", "graphicx", "geometry", "hyperref", "babel", "inputenc", "fontenc", "lmodern",
  "fontspec", "xcolor", "booktabs", "tabularx", "longtable", "multirow", "array", "float", "caption", "subcaption",
  "siunitx", "tikz", "pgfplots", "fancyhdr", "lastpage", "enumitem", "listings", "minted", "natbib", "biblatex",
  "csquotes", "microtype", "setspace", "parskip", "titlesec", "tocloft", "appendix", "pdfpages", "wrapfig",
  "colortbl", "makecell", "cleveref", "xspace", "url", "mathtools", "physics", "circuitikz", "chemfig",
  "mhchem", "abntex2cite", "indentfirst", "iftex", "ragged2e", "eso-pic", "background", "tcolorbox", "ifthen",
];

/** Sugestões de comandos (com modelos de preenchimento). */
const sugestoesComandos = COMANDOS.map(([modelo, descricao]) => {
  const rotulo = modelo.replace(/#\{[^}]*\}/g, "").replace(/\{\}|\[\]/g, (m) => m);
  return snippetCompletion(modelo, {
    label: modelo.split(/[{[ _^]/)[0] || modelo,
    detail: descricao,
    type: "keyword",
    // Mostra o modelo completo como informação extra.
    info: rotulo.length > 30 ? rotulo : undefined,
  });
});

/**
 * Aplica um modelo de ambiente: completa o nome, fecha a chave e escreve o \end{}.
 * Respeita a indentação da linha atual.
 */
function sugestaoAmbiente([nome, corpo, argumentos = ""]) {
  return {
    label: nome,
    type: "type",
    detail: "ambiente",
    apply: (view, _c, de, ate) => {
      const linha = view.state.doc.lineAt(de);
      const recuo = linha.text.match(/^\s*/)[0];
      // Se o fechamento "}" já existe logo após o cursor (fechamento automático), substitui também.
      if (view.state.sliceDoc(ate, ate + 1) === "}") ate += 1;
      const modelo = `${nome}}${argumentos}\n\t${corpo}\n\\end{${nome}}`.replace(/\n/g, "\n" + recuo);
      snippetCompletion(modelo, { label: nome }).apply(view, _c, de, ate);
    },
  };
}
const sugestoesAmbientes = AMBIENTES.map(sugestaoAmbiente);

// ---------------------------------------------------------------------------
// Fonte de autocompletar
// ---------------------------------------------------------------------------

/**
 * Cria a função de autocompletar. `obterContexto()` devolve
 * { rotulos, citacoes, arquivos } atualizados do projeto.
 */
export function fonteAutocompletar(obterContexto) {
  return (contexto) => {
    const antes = contexto.state.sliceDoc(Math.max(0, contexto.pos - 200), contexto.pos);
    const ctx = obterContexto();

    // Dentro de chaves de comandos especiais: \ref{, \cite{a,b, ...
    const chave = antes.match(/\\([a-zA-Z]+)\*?(?:\[[^\]]*\])*\{([^{}]*)$/);
    if (chave) {
      const [, comando, digitado] = chave;
      // Em \cite{a,b,c} só completa a última chave.
      const ultimo = digitado.split(",").pop().trimStart();
      const de = contexto.pos - ultimo.length;
      let opcoes = null;

      if (comando === "begin" || comando === "end") {
        if (comando === "end") {
          // Sugere fechar o último ambiente aberto antes do cursor.
          const abertos = [];
          const texto = contexto.state.sliceDoc(0, contexto.pos);
          for (const m of texto.matchAll(/\\(begin|end)\{([^}]+)\}/g)) {
            if (m[1] === "begin") abertos.push(m[2]);
            else {
              const i = abertos.lastIndexOf(m[2]);
              if (i >= 0) abertos.splice(i, 1);
            }
          }
          opcoes = [...new Set(abertos.reverse())].map((n) => ({ label: n, type: "type", detail: "fechar ambiente" }));
        } else opcoes = sugestoesAmbientes;
      } else if (/ref$/i.test(comando) || comando === "autoref" || comando === "nameref") {
        opcoes = ctx.rotulos.map((r) => ({ label: r, type: "variable", detail: "rótulo" }));
      } else if (/cite/i.test(comando)) {
        opcoes = ctx.citacoes.map((c) => ({ label: c, type: "variable", detail: "referência .bib" }));
      } else if (comando === "var") {
        // Variáveis do documento, mostrando o valor atual ao lado.
        opcoes = ctx.variaveis.map((v) => ({ label: v.nome, type: "variable", detail: v.valor ? `= ${v.valor.slice(0, 40)}` : "(vazio)", info: v.descricao || undefined }));
      } else if (comando === "usepackage" || comando === "RequirePackage") {
        opcoes = PACOTES.map((p) => ({ label: p, type: "namespace", detail: "pacote" }));
      } else if (comando === "includegraphics") {
        opcoes = ctx.arquivos
          .filter((a) => /\.(png|jpe?g|pdf|eps|svg|gif|bmp)$/i.test(a))
          .map((a) => ({ label: a, type: "text", detail: "imagem" }));
      } else if (comando === "input" || comando === "include" || comando === "subfile") {
        opcoes = ctx.arquivos
          .filter((a) => /\.tex$/i.test(a))
          .map((a) => ({ label: comando === "include" ? a.replace(/\.tex$/i, "") : a, type: "text", detail: "arquivo" }));
      } else if (comando === "bibliography" || comando === "addbibresource") {
        opcoes = ctx.arquivos
          .filter((a) => /\.bib$/i.test(a))
          .map((a) => ({ label: comando === "bibliography" ? a.replace(/\.bib$/i, "") : a, type: "text", detail: "bibliografia" }));
      }
      if (opcoes && opcoes.length) return { from: de, options: opcoes, validFor: /^[^{},\s]*$/ };
      return null;
    }

    // Comando começando com barra invertida.
    const cmd = contexto.matchBefore(/\\[a-zA-Z]*\*?/);
    if (cmd && (cmd.text.length > 1 || contexto.explicit)) {
      return { from: cmd.from, options: sugestoesComandos, validFor: /^\\[a-zA-Z]*\*?$/ };
    }
    return null;
  };
}

// ---------------------------------------------------------------------------
// Atalhos de formatação (Ctrl+B, Ctrl+I), como no Overleaf
// ---------------------------------------------------------------------------

/** Envolve a seleção com um comando, ex.: \textbf{seleção}. */
export function envolverCom(comando) {
  return (view) => {
    const alteracoes = view.state.changeByRange((intervalo) => {
      const texto = view.state.sliceDoc(intervalo.from, intervalo.to);
      const novo = `\\${comando}{${texto}}`;
      const inicio = intervalo.from + comando.length + 2;
      return {
        changes: { from: intervalo.from, to: intervalo.to, insert: novo },
        range: EditorSelection.range(inicio, inicio + texto.length),
      };
    });
    view.dispatch(alteracoes);
    return true;
  };
}

// ---------------------------------------------------------------------------
// Estrutura do documento (painel "Estrutura", como o "File outline" do Overleaf)
// ---------------------------------------------------------------------------

const NIVEIS = { part: 0, chapter: 1, section: 2, subsection: 3, subsubsection: 4, paragraph: 5 };

/** Lê as seções do texto. Devolve [{ nivel, titulo, linha }]. */
export function estruturaDoTexto(texto) {
  const itens = [];
  const linhas = texto.split("\n");
  const re = /^[^%]*?\\(part|chapter|section|subsection|subsubsection|paragraph)\*?\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}?/;
  linhas.forEach((l, i) => {
    const m = l.match(re);
    if (m) itens.push({ nivel: NIVEIS[m[1]], titulo: m[2].trim() || "(sem título)", linha: i + 1 });
  });
  // Ajusta o recuo para o menor nível usado começar em zero.
  const minimo = Math.min(...itens.map((i) => i.nivel));
  itens.forEach((i) => (i.nivel -= minimo));
  return itens;
}

/** Traduções da interface do CodeMirror (busca, ir para linha...). */
export const FRASES = {
  Find: "Localizar",
  Replace: "Substituir",
  next: "próximo",
  previous: "anterior",
  all: "todos",
  "match case": "maiúsc./minúsc.",
  regexp: "expressão regular",
  "by word": "palavra inteira",
  replace: "substituir",
  "replace all": "substituir todos",
  close: "fechar",
  "current match": "ocorrência atual",
  "on line": "na linha",
  "Go to line": "Ir para a linha",
  go: "ir",
  "Folded lines": "Linhas recolhidas",
  "Unfolded lines": "Linhas expandidas",
  "Fold line": "Recolher",
  "Unfold line": "Expandir",
  "folded code": "código recolhido",
  unfold: "expandir",
  "Diagnostics": "Diagnósticos",
  "No diagnostics": "Sem diagnósticos",
  "Selection deleted": "Seleção apagada",
};
