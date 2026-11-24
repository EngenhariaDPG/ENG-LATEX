// Paleta de símbolos (como a "Symbol palette" do Overleaf).
//
// Um painel com botões; clicar insere o comando no cursor. Se o cursor não
// estiver dentro de uma fórmula, os símbolos matemáticos são inseridos já
// entre cifrões ($\alpha$). Para acrescentar símbolos, edite a lista CATEGORIAS.

import { esc, el, icone } from "./ui.js";
import { formulaEm } from "./formulas.js";

/** [símbolo exibido, comando, descrição] por categoria. */
const CATEGORIAS = {
  "Gregas": [
    ["α", "\\alpha", "alfa"], ["β", "\\beta", "beta"], ["γ", "\\gamma", "gama"], ["δ", "\\delta", "delta"],
    ["ε", "\\varepsilon", "épsilon"], ["ζ", "\\zeta", "zeta"], ["η", "\\eta", "eta"], ["θ", "\\theta", "teta"],
    ["ι", "\\iota", "iota"], ["κ", "\\kappa", "capa"], ["λ", "\\lambda", "lambda"], ["μ", "\\mu", "mi"],
    ["ν", "\\nu", "ni"], ["ξ", "\\xi", "csi"], ["π", "\\pi", "pi"], ["ρ", "\\rho", "rô"], ["σ", "\\sigma", "sigma"],
    ["τ", "\\tau", "tau"], ["υ", "\\upsilon", "úpsilon"], ["φ", "\\phi", "fi"], ["ϕ", "\\varphi", "fi (variante)"],
    ["χ", "\\chi", "qui"], ["ψ", "\\psi", "psi"], ["ω", "\\omega", "ômega"], ["Γ", "\\Gamma", "Gama"],
    ["Δ", "\\Delta", "Delta"], ["Θ", "\\Theta", "Teta"], ["Λ", "\\Lambda", "Lambda"], ["Ξ", "\\Xi", "Csi"],
    ["Π", "\\Pi", "Pi"], ["Σ", "\\Sigma", "Sigma"], ["Φ", "\\Phi", "Fi"], ["Ψ", "\\Psi", "Psi"], ["Ω", "\\Omega", "Ômega"],
  ],
  "Operadores": [
    ["±", "\\pm", "mais ou menos"], ["∓", "\\mp", "menos ou mais"], ["×", "\\times", "vezes"], ["÷", "\\div", "dividido"],
    ["·", "\\cdot", "ponto"], ["∘", "\\circ", "composição"], ["√", "\\sqrt{}", "raiz"], ["ⁿ√", "\\sqrt[n]{}", "raiz n-ésima"],
    ["a/b", "\\frac{}{}", "fração"], ["∑", "\\sum_{i=1}^{n}", "somatório"], ["∏", "\\prod_{i=1}^{n}", "produtório"],
    ["∫", "\\int_{a}^{b}", "integral"], ["∬", "\\iint", "integral dupla"], ["∮", "\\oint", "integral de contorno"],
    ["∂", "\\partial", "derivada parcial"], ["∇", "\\nabla", "nabla"], ["lim", "\\lim_{x \\to 0}", "limite"],
    ["∞", "\\infty", "infinito"], ["x²", "^{2}", "ao quadrado"], ["xᵢ", "_{i}", "índice"], ["‖", "\\|", "norma"],
    ["∪", "\\cup", "união"], ["∩", "\\cap", "interseção"], ["⊗", "\\otimes", "produto tensorial"], ["⊕", "\\oplus", "soma direta"],
  ],
  "Relações": [
    ["≤", "\\leq", "menor ou igual"], ["≥", "\\geq", "maior ou igual"], ["≠", "\\neq", "diferente"], ["≈", "\\approx", "aproximadamente"],
    ["≡", "\\equiv", "equivalente"], ["∝", "\\propto", "proporcional"], ["∼", "\\sim", "semelhante"], ["≅", "\\cong", "congruente"],
    ["≪", "\\ll", "muito menor"], ["≫", "\\gg", "muito maior"], ["∈", "\\in", "pertence"], ["∉", "\\notin", "não pertence"],
    ["⊂", "\\subset", "subconjunto"], ["⊆", "\\subseteq", "subconjunto ou igual"], ["∀", "\\forall", "para todo"],
    ["∃", "\\exists", "existe"], ["∅", "\\emptyset", "vazio"], ["⊥", "\\perp", "perpendicular"], ["∥", "\\parallel", "paralelo"],
    ["∠", "\\angle", "ângulo"],
  ],
  "Setas": [
    ["→", "\\rightarrow", "seta"], ["←", "\\leftarrow", "seta esquerda"], ["↔", "\\leftrightarrow", "seta dupla"],
    ["⇒", "\\Rightarrow", "implica"], ["⇐", "\\Leftarrow", "é implicado"], ["⇔", "\\Leftrightarrow", "equivale"],
    ["↦", "\\mapsto", "mapeia"], ["↑", "\\uparrow", "para cima"], ["↓", "\\downarrow", "para baixo"], ["⟶", "\\longrightarrow", "seta longa"],
  ],
  "Acentos e funções": [
    ["â", "\\hat{}", "chapéu"], ["ā", "\\bar{}", "barra"], ["a⃗", "\\vec{}", "vetor"], ["ȧ", "\\dot{}", "ponto (derivada)"],
    ["ä", "\\ddot{}", "dois pontos"], ["ã", "\\tilde{}", "til"], ["x̄", "\\overline{}", "barra longa"], ["( )", "\\left(  \\right)", "parênteses ajustáveis"],
    ["[ ]", "\\left[  \\right]", "colchetes ajustáveis"], ["{ }", "\\left\\{  \\right\\}", "chaves ajustáveis"], ["|x|", "\\left|  \\right|", "módulo"],
    ["sin", "\\sin", "seno"], ["cos", "\\cos", "cosseno"], ["tan", "\\tan", "tangente"], ["log", "\\log", "logaritmo"],
    ["ln", "\\ln", "logaritmo natural"], ["exp", "\\exp", "exponencial"], ["max", "\\max", "máximo"], ["min", "\\min", "mínimo"],
    ["[ab]", "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}", "matriz"],
  ],
  "Engenharia (siunitx)": [
    ["kN", "\\SI{}{\\kilo\\newton}", "quilonewton"], ["N", "\\SI{}{\\newton}", "newton"], ["kgf", "\\SI{}{kgf}", "quilograma-força"],
    ["t", "\\SI{}{\\tonne}", "tonelada"], ["kg", "\\SI{}{\\kilogram}", "quilograma"], ["m", "\\SI{}{\\meter}", "metro"],
    ["mm", "\\SI{}{\\milli\\meter}", "milímetro"], ["m²", "\\SI{}{\\square\\meter}", "metro quadrado"], ["m³", "\\SI{}{\\cubic\\meter}", "metro cúbico"],
    ["MPa", "\\SI{}{\\mega\\pascal}", "megapascal"], ["kPa", "\\SI{}{\\kilo\\pascal}", "quilopascal"], ["bar", "\\SI{}{\\bar}", "bar"],
    ["kN·m", "\\SI{}{\\kilo\\newton\\meter}", "momento"], ["kW", "\\SI{}{\\kilo\\watt}", "quilowatt"], ["TR", "\\SI{}{TR}", "tonelada de refrigeração"],
    ["BTU/h", "\\SI{}{BTU/h}", "BTU por hora"], ["m³/h", "\\SI{}{\\cubic\\meter\\per\\hour}", "vazão"], ["°C", "\\SI{}{\\celsius}", "graus Celsius"],
    ["°", "\\SI{}{\\degree}", "graus"], ["%", "\\SI{}{\\percent}", "porcentagem"], ["Hz", "\\SI{}{\\hertz}", "hertz"], ["V", "\\SI{}{\\volt}", "volt"],
    ["A", "\\SI{}{\\ampere}", "ampère"], ["Ω", "\\SI{}{\\ohm}", "ohm"],
  ],
  "Texto": [
    ["§", "\\S", "parágrafo"], ["©", "\\copyright", "copyright"], ["™", "\\texttrademark", "marca"], ["°", "\\textdegree", "grau (texto)"],
    ["º", "\\textordmasculine", "ordinal masculino"], ["ª", "\\textordfeminine", "ordinal feminino"], ["€", "\\texteuro", "euro"],
    ["…", "\\dots", "reticências"], ["–", "--", "travessão curto"], ["—", "---", "travessão"], ["“ ”", "``''", "aspas"],
    ["✓", "\\checkmark", "visto"], ["•", "\\textbullet", "marcador"], ["&", "\\&", "e comercial"], ["%", "\\%", "porcento"],
    ["$", "\\$", "cifrão"], ["#", "\\#", "cerquilha"], ["_", "\\_", "sublinhado"], ["~", "\\textasciitilde", "til"],
  ],
};

/** Categorias cujos comandos só valem dentro de fórmulas. */
const MATEMATICAS = new Set(["Gregas", "Operadores", "Relações", "Setas", "Acentos e funções"]);

/**
 * Monta a paleta dentro de `recipiente`. `obterView()` devolve o EditorView atual.
 */
export function montarPaleta(recipiente, obterView) {
  recipiente.innerHTML = "";
  const nomes = Object.keys(CATEGORIAS);
  const cab = el(`
    <div class="paleta-cabecalho">
      <div class="paleta-abas">${nomes.map((n, i) => `<button data-cat="${esc(n)}" class="${i === 0 ? "ativo" : ""}">${esc(n)}</button>`).join("")}</div>
      <input type="search" placeholder="Buscar símbolo…" spellcheck="false">
    </div>`);
  const grade = el('<div class="paleta-grade"></div>');
  recipiente.append(cab, grade);
  let categoria = nomes[0];

  const desenhar = (filtro = "") => {
    const f = filtro.trim().toLowerCase();
    const itens = f
      ? Object.entries(CATEGORIAS).flatMap(([c, l]) => l.map((s) => [...s, c])).filter(([s, cmd, d]) => d.toLowerCase().includes(f) || cmd.toLowerCase().includes(f) || s.includes(f))
      : CATEGORIAS[categoria].map((s) => [...s, categoria]);
    grade.innerHTML = itens
      .map(([s, cmd, d, c]) => `<button class="simbolo" data-cmd="${esc(cmd)}" data-cat="${esc(c)}" title="${esc(d)} — ${esc(cmd)}">${esc(s)}</button>`)
      .join("") || '<p class="vazio pequeno">Nada encontrado.</p>';
    grade.querySelectorAll(".simbolo").forEach((b) => (b.onclick = () => inserir(b.dataset.cmd, MATEMATICAS.has(b.dataset.cat))));
  };

  /** Insere o comando no cursor; símbolos matemáticos fora de fórmula ganham $...$. */
  const inserir = (cmd, matematico) => {
    const view = obterView();
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const dentroDeFormula = !!formulaEm(view.state.doc.toString(), from);
    const texto = matematico && !dentroDeFormula ? `$${cmd}$` : cmd;
    // Cursor vai para o primeiro {} vazio (ex.: \frac{|}{}), se houver.
    const vazio = texto.indexOf("{}");
    const cursor = from + (vazio >= 0 ? vazio + 1 : texto.length);
    view.dispatch({ changes: { from, to, insert: texto }, selection: { anchor: cursor } });
    view.focus();
  };

  cab.querySelectorAll("[data-cat]").forEach((b) => {
    b.onclick = () => {
      categoria = b.dataset.cat;
      cab.querySelectorAll("[data-cat]").forEach((x) => x.classList.toggle("ativo", x === b));
      cab.querySelector("input").value = "";
      desenhar();
    };
  });
  cab.querySelector("input").oninput = (e) => desenhar(e.target.value);
  desenhar();
}
