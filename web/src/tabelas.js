// Editor de tabelas: monta a tabela numa grade (como numa planilha) e gera o
// código LaTeX. Também permite:
//  - colar direto do Excel/LibreOffice (Ctrl+V numa célula cola o bloco inteiro);
//  - editar uma tabela existente (cursor dentro de um tabular -> "Editar tabela").
//
// Estilos de borda: booktabs (padrão de publicações), grade completa ou sem bordas.

import { dialogo, esc, el, icone, aviso } from "./ui.js";

/** Escapa caracteres especiais do LaTeX em texto colado. */
function escapar(t) {
  return t.replace(/\\/g, "\\textbackslash{}").replace(/([&%$#_{}])/g, "\\$1").replace(/~/g, "\\textasciitilde{}").replace(/\^/g, "\\textasciicircum{}");
}

/**
 * Localiza o ambiente tabular (ou table que o envolve) na posição do cursor.
 * Devolve { de, ate, dados } ou null. `dados` já vem no formato do editor.
 */
export function tabelaNoCursor(texto, pos) {
  const tipos = ["tabularx", "tabular", "longtable"];
  for (const tipo of tipos) {
    const ini = texto.lastIndexOf(`\\begin{${tipo}}`, pos);
    if (ini < 0) continue;
    const fimTag = `\\end{${tipo}}`;
    const fim = texto.indexOf(fimTag, ini);
    if (fim < 0 || pos > fim + fimTag.length) continue;

    // Se estiver dentro de um \begin{table}, substitui o ambiente table inteiro.
    let de = ini, ate = fim + fimTag.length;
    let legenda = "", rotulo = "", flutuante = false;
    const iniTable = texto.lastIndexOf("\\begin{table}", ini);
    const fimTable = texto.indexOf("\\end{table}", ini);
    if (iniTable >= 0 && fimTable > ate && !texto.slice(iniTable, ini).includes("\\end{table}")) {
      const envolvente = texto.slice(iniTable, fimTable);
      legenda = (envolvente.match(/\\caption\{([^}]*)\}/) || [])[1] || "";
      rotulo = (envolvente.match(/\\label\{([^}]*)\}/) || [])[1] || "";
      de = iniTable;
      ate = fimTable + "\\end{table}".length;
      flutuante = true;
    }

    const bloco = texto.slice(ini, fim);
    // Especificação de colunas: \begin{tabular}{lcc} ou \begin{tabularx}{\textwidth}{lXr}
    const especMatch = bloco.match(tipo === "tabularx" ? /^\\begin\{tabularx\}\{[^}]*\}\{([^}]*)\}/ : new RegExp(`^\\\\begin\\{${tipo}\\}(?:\\[[^\\]]*\\])?\\{([^}]*)\\}`));
    const espec = especMatch ? especMatch[1] : "";
    const corpo = especMatch ? bloco.slice(especMatch[0].length) : bloco;
    const alinhamentos = [...espec.replace(/[|@{}]|p\{[^}]*\}|>\{[^}]*\}/g, (m) => (m.startsWith("p") ? "l" : "")).matchAll(/[lcrX]/g)].map((m) => (m[0] === "X" ? "l" : m[0]));

    const bordas = /\\toprule|\\midrule|\\bottomrule/.test(corpo) ? "booktabs" : /\\hline/.test(corpo) || espec.includes("|") ? "grade" : "nenhuma";
    // Remove comandos de linha e divide em linhas/células.
    const limpo = corpo
      .replace(/\\(toprule|midrule|bottomrule|hline|endhead|endfirsthead|endfoot|endlastfoot)\b/g, "")
      .replace(/\\cline\{[^}]*\}/g, "");
    const linhas = limpo
      .split(/\\\\(?:\[[^\]]*\])?/)
      .map((l) => l.trim())
      .filter((l) => l.length)
      .map((l) => l.split(/(?<!\\)&/).map((c) => c.trim()));
    if (!linhas.length) continue;
    const colunas = Math.max(...linhas.map((l) => l.length), alinhamentos.length || 1);
    linhas.forEach((l) => { while (l.length < colunas) l.push(""); });
    while (alinhamentos.length < colunas) alinhamentos.push("l");
    // Cabeçalho em negrito: detecta se todas as células da 1ª linha são \textbf{...}.
    const negrito = linhas[0].every((c) => !c || /^\\textbf\{.*\}$/.test(c));
    if (negrito) linhas[0] = linhas[0].map((c) => c.replace(/^\\textbf\{(.*)\}$/, "$1"));

    return { de, ate, dados: { celulas: linhas, alinhamentos: alinhamentos.slice(0, colunas), bordas, legenda, rotulo, flutuante, cabecalhoNegrito: negrito, larguraTotal: tipo === "tabularx" } };
  }
  return null;
}

/** Gera o código LaTeX da tabela. */
export function gerarLatex(d) {
  const n = d.alinhamentos.length;
  const ncol = d.larguraTotal ? d.alinhamentos.map((a) => (a === "l" ? "X" : a)) : d.alinhamentos;
  const espec = d.bordas === "grade" ? `|${ncol.join("|")}|` : ncol.join("");
  const ambiente = d.larguraTotal ? "tabularx" : "tabular";
  const abre = d.larguraTotal ? `\\begin{tabularx}{\\textwidth}{${espec}}` : `\\begin{tabular}{${espec}}`;
  const recuo = d.flutuante ? "  " : "";
  const linhas = [];
  linhas.push(recuo + abre);
  if (d.bordas === "booktabs") linhas.push(recuo + "  \\toprule");
  if (d.bordas === "grade") linhas.push(recuo + "  \\hline");
  d.celulas.forEach((l, i) => {
    const cel = l.slice(0, n).map((c) => (i === 0 && d.cabecalhoNegrito && c ? `\\textbf{${c}}` : c));
    linhas.push(`${recuo}  ${cel.join(" & ")} \\\\`);
    if (i === 0 && d.bordas === "booktabs" && d.celulas.length > 1) linhas.push(recuo + "  \\midrule");
    if (d.bordas === "grade") linhas.push(recuo + "  \\hline");
  });
  if (d.bordas === "booktabs") linhas.push(recuo + "  \\bottomrule");
  linhas.push(`${recuo}\\end{${ambiente}}`);
  if (!d.flutuante) return linhas.join("\n");
  // Rótulo vazio ou só "tab:": gera a partir da legenda ("Esforços nos cabos" -> "tab:esforcos-nos-cabos").
  let rotulo = d.rotulo.trim();
  if (!rotulo || rotulo === "tab:") {
    const base = d.legenda.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
    rotulo = base ? `tab:${base}` : "";
  }
  return [
    "\\begin{table}[htbp]",
    "  \\centering",
    d.legenda ? `  \\caption{${d.legenda}}` : null,
    rotulo ? `  \\label{${rotulo}}` : null,
    ...linhas,
    "\\end{table}",
  ].filter((x) => x !== null).join("\n");
}

/** Pacotes necessários para o estilo escolhido. */
function pacotesNecessarios(d) {
  const p = [];
  if (d.bordas === "booktabs") p.push("booktabs");
  if (d.larguraTotal) p.push("tabularx");
  return p;
}

/**
 * Abre o editor de tabelas. `inicial` (opcional) vem de tabelaNoCursor().
 * Devolve { latex, pacotes } ou null.
 */
export function abrirEditorTabela(inicial) {
  const d = inicial
    ? structuredClone(inicial)
    : { celulas: [["Item", "Valor", "Unidade"], ["", "", ""], ["", "", ""]], alinhamentos: ["l", "c", "c"], bordas: "booktabs", legenda: "", rotulo: "tab:", flutuante: true, cabecalhoNegrito: true, larguraTotal: false };

  const conteudo = `
    <div class="tabela-opcoes">
      <label>Bordas <select id="t-bordas">
        <option value="booktabs">Profissional (booktabs)</option><option value="grade">Grade completa</option><option value="nenhuma">Sem bordas</option></select></label>
      <label class="marcar"><input type="checkbox" id="t-negrito"> Cabeçalho em negrito</label>
      <label class="marcar"><input type="checkbox" id="t-largura"> Largura total da página</label>
      <label class="marcar"><input type="checkbox" id="t-flutuante"> Com legenda (ambiente table)</label>
    </div>
    <div class="tabela-legenda" id="t-legenda-bloco">
      <label class="campo"><span>Legenda</span><input id="t-legenda" type="text"></label>
      <label class="campo"><span>Rótulo (para \\ref)</span><input id="t-rotulo" type="text" spellcheck="false"></label>
    </div>
    <div class="grade-acoes">
      <button class="botao pequeno" data-op="+linha">${icone("mais", 12)} Linha</button>
      <button class="botao pequeno" data-op="-linha">${icone("menos", 12)} Linha</button>
      <button class="botao pequeno" data-op="+coluna">${icone("mais", 12)} Coluna</button>
      <button class="botao pequeno" data-op="-coluna">${icone("menos", 12)} Coluna</button>
      <span class="dica">Dica: copie células do Excel e cole (Ctrl+V) numa célula da grade.</span>
    </div>
    <div class="grade-rolagem"><table class="grade-tabela" id="t-grade"></table></div>
    <details class="tabela-codigo"><summary>Ver código LaTeX</summary><pre id="t-codigo"></pre></details>`;

  return dialogo({
    titulo: inicial ? "Editar tabela" : "Inserir tabela",
    largura: 900,
    conteudo,
    botoes: [
      { texto: "Cancelar", valor: null },
      { texto: inicial ? "Atualizar tabela" : "Inserir tabela", valor: "ok", classe: "primario" },
    ],
    aoAbrir: (j) => {
      const grade = j.querySelector("#t-grade");
      const codigo = j.querySelector("#t-codigo");
      j.querySelector("#t-bordas").value = d.bordas;
      j.querySelector("#t-negrito").checked = d.cabecalhoNegrito;
      j.querySelector("#t-largura").checked = d.larguraTotal;
      j.querySelector("#t-flutuante").checked = d.flutuante;
      j.querySelector("#t-legenda").value = d.legenda;
      j.querySelector("#t-rotulo").value = d.rotulo;

      const atualizarCodigo = () => (codigo.textContent = gerarLatex(d));
      const mostrarLegenda = () => (j.querySelector("#t-legenda-bloco").hidden = !d.flutuante);

      /** Desenha a grade: 1ª linha = alinhamento das colunas; depois as células. */
      const desenhar = () => {
        const n = d.alinhamentos.length;
        let html = "<tr><th></th>" + d.alinhamentos.map((a, c) => `<th><select data-alinh="${c}" title="Alinhamento da coluna">
            <option value="l" ${a === "l" ? "selected" : ""}>⇤ esquerda</option><option value="c" ${a === "c" ? "selected" : ""}>↔ centro</option><option value="r" ${a === "r" ? "selected" : ""}>⇥ direita</option></select></th>`).join("") + "</tr>";
        d.celulas.forEach((linha, l) => {
          html += `<tr><th class="num-linha">${l + 1}</th>` + linha.slice(0, n).map((c, k) => `<td><input data-l="${l}" data-c="${k}" value="${esc(c)}" spellcheck="false"></td>`).join("") + "</tr>";
        });
        grade.innerHTML = html;
        grade.querySelectorAll("[data-alinh]").forEach((s) => (s.onchange = () => { d.alinhamentos[+s.dataset.alinh] = s.value; atualizarCodigo(); }));
        grade.querySelectorAll("input").forEach((inp) => {
          inp.oninput = () => { d.celulas[+inp.dataset.l][+inp.dataset.c] = inp.value; atualizarCodigo(); };
          // Colar do Excel: texto com tabulações e quebras de linha preenche a grade a partir desta célula.
          inp.onpaste = (e) => {
            const txt = e.clipboardData.getData("text/plain");
            if (!txt.includes("\t") && !txt.includes("\n")) return;
            e.preventDefault();
            const blocos = txt.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((l) => l.split("\t"));
            const l0 = +inp.dataset.l, c0 = +inp.dataset.c;
            blocos.forEach((cels, i) => {
              while (d.celulas.length <= l0 + i) d.celulas.push(new Array(d.alinhamentos.length).fill(""));
              cels.forEach((v, k) => {
                while (d.alinhamentos.length <= c0 + k) { d.alinhamentos.push("c"); d.celulas.forEach((x) => x.push("")); }
                d.celulas[l0 + i][c0 + k] = escapar(v.trim());
              });
            });
            desenhar();
            atualizarCodigo();
            aviso(`${blocos.length} linha(s) colada(s).`, "sucesso");
          };
          // Enter = próxima linha; Tab já vai para a próxima célula naturalmente.
          inp.onkeydown = (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              grade.querySelector(`input[data-l="${+inp.dataset.l + 1}"][data-c="${inp.dataset.c}"]`)?.focus();
            }
          };
        });
        atualizarCodigo();
      };

      j.querySelectorAll("[data-op]").forEach((b) => {
        b.onclick = () => {
          const n = d.alinhamentos.length;
          if (b.dataset.op === "+linha") d.celulas.push(new Array(n).fill(""));
          if (b.dataset.op === "-linha" && d.celulas.length > 1) d.celulas.pop();
          if (b.dataset.op === "+coluna") { d.alinhamentos.push("c"); d.celulas.forEach((l) => l.push("")); }
          if (b.dataset.op === "-coluna" && n > 1) { d.alinhamentos.pop(); d.celulas.forEach((l) => l.pop()); }
          desenhar();
        };
      });
      j.querySelector("#t-bordas").onchange = (e) => { d.bordas = e.target.value; atualizarCodigo(); };
      j.querySelector("#t-negrito").onchange = (e) => { d.cabecalhoNegrito = e.target.checked; atualizarCodigo(); };
      j.querySelector("#t-largura").onchange = (e) => { d.larguraTotal = e.target.checked; atualizarCodigo(); };
      j.querySelector("#t-flutuante").onchange = (e) => { d.flutuante = e.target.checked; mostrarLegenda(); atualizarCodigo(); };
      j.querySelector("#t-legenda").oninput = (e) => { d.legenda = e.target.value; atualizarCodigo(); };
      j.querySelector("#t-rotulo").oninput = (e) => { d.rotulo = e.target.value; atualizarCodigo(); };
      mostrarLegenda();
      desenhar();
      grade.querySelector("input")?.focus();
    },
    coletar: () => ({ latex: gerarLatex(d), pacotes: pacotesNecessarios(d) }),
  });
}
