// Janelas de inserção (botão direito do mouse no editor -> Inserir ...).
//
// Cada função abre uma janela, monta o código LaTeX e devolve
// { texto, pacotes } para o editor inserir no cursor. `pacotes` lista os
// pacotes de que o trecho precisa (o editor acrescenta no preâmbulo se faltarem).

import { dialogo, esc, el, aviso, escolherArquivos } from "./ui.js";
import { desenharFormula } from "./formulas.js";

/** Escapa texto comum para LaTeX (para títulos e legendas digitados). */
export function escaparTexto(t) {
  return t.replace(/\\/g, "\\textbackslash{}").replace(/([&%$#_{}])/g, "\\$1").replace(/~/g, "\\textasciitilde{}").replace(/\^/g, "\\textasciicircum{}");
}

/** Gera um rótulo a partir de um título ("Força no cabo" -> "forca-no-cabo"). */
function rotuloDe(prefixo, titulo) {
  const base = titulo
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  return base ? `${prefixo}:${base}` : "";
}

// ---------------------------------------------------------------------------
// Seção / parágrafo
// ---------------------------------------------------------------------------

export function inserirSecao() {
  return dialogo({
    titulo: "Inserir seção ou parágrafo",
    largura: 560,
    conteudo: `
      <label class="campo"><span>Tipo</span>
        <select id="i-tipo">
          <option value="section">Seção (1)</option>
          <option value="subsection">Subseção (1.1)</option>
          <option value="subsubsection">Subsubseção (1.1.1)</option>
          <option value="chapter">Capítulo (classes report/book/abntex2)</option>
          <option value="paragraph">Parágrafo com título em negrito</option>
          <option value="texto">Parágrafo de texto (sem título)</option>
        </select></label>
      <label class="campo" id="i-bloco-titulo"><span>Título</span><input id="i-titulo" type="text"></label>
      <label class="marcar" id="i-bloco-num"><input type="checkbox" id="i-num" checked> Numerada (aparece no sumário)</label>
      <label class="campo"><span>Texto (opcional)</span><textarea id="i-texto" rows="5" placeholder="Escreva o parágrafo aqui…"></textarea></label>`,
    botoes: [{ texto: "Cancelar", valor: null }, { texto: "Inserir", valor: "ok", classe: "primario" }],
    aoAbrir: (j) => {
      const tipo = j.querySelector("#i-tipo");
      tipo.onchange = () => {
        const texto = tipo.value === "texto";
        j.querySelector("#i-bloco-titulo").hidden = texto;
        j.querySelector("#i-bloco-num").hidden = texto || tipo.value === "paragraph";
      };
      j.querySelector("#i-titulo").focus();
    },
    coletar: (j) => {
      const tipo = j.querySelector("#i-tipo").value;
      const titulo = j.querySelector("#i-titulo").value.trim();
      const corpo = j.querySelector("#i-texto").value.trim();
      if (tipo === "texto") return { texto: `\n${corpo || "Texto do parágrafo."}\n`, pacotes: [] };
      if (!titulo) {
        aviso("Escreva o título.", "erro");
        return undefined;
      }
      const estrela = j.querySelector("#i-num").checked || tipo === "paragraph" ? "" : "*";
      const prefixo = tipo === "chapter" ? "cap" : "sec";
      const rotulo = tipo === "paragraph" ? "" : `\\label{${rotuloDe(prefixo, titulo)}}`;
      return { texto: `\n\\${tipo}${estrela}{${escaparTexto(titulo)}}${rotulo}\n${corpo ? corpo + "\n" : ""}`, pacotes: [] };
    },
  });
}

// ---------------------------------------------------------------------------
// Imagem
// ---------------------------------------------------------------------------

const EXT_IMG = /\.(png|jpe?g|pdf|eps|gif|bmp|svg)$/i;

/**
 * @param {string[]} imagens  imagens já existentes no projeto
 * @param {function} enviar  async (arquivos) => caminhos enviados (para "Enviar do computador")
 * @param {function} url  (caminho) => URL para pré-visualizar
 */
export function inserirImagem(imagens, enviar, url) {
  let lista = [...imagens];
  return dialogo({
    titulo: "Inserir imagem",
    largura: 720,
    conteudo: `
      <div class="insere-imagem">
        <div>
          <label class="campo"><span>Imagem do projeto</span>
            <select id="i-arquivo" size="8"></select></label>
          <button class="botao pequeno" id="i-enviar">Enviar imagem do computador…</button>
        </div>
        <div class="previa-imagem" id="i-previa"><span class="dica">Escolha uma imagem</span></div>
      </div>
      <label class="campo"><span>Largura: <b id="i-larg-txt">80%</b> da largura do texto</span>
        <input id="i-larg" type="range" min="10" max="100" step="5" value="80"></label>
      <label class="campo"><span>Legenda</span><input id="i-legenda" type="text" placeholder="Ex.: Vista geral do equipamento"></label>
      <div class="linha-campos">
        <label class="campo"><span>Posição</span>
          <select id="i-pos"><option value="htbp">Automática (recomendado)</option><option value="H">Exatamente aqui</option><option value="t">Topo da página</option><option value="b">Rodapé da página</option><option value="p">Página separada</option></select></label>
        <label class="marcar"><input type="checkbox" id="i-flutuante" checked> Com legenda e número (figura)</label>
      </div>`,
    botoes: [{ texto: "Cancelar", valor: null }, { texto: "Inserir", valor: "ok", classe: "primario" }],
    aoAbrir: (j) => {
      const sel = j.querySelector("#i-arquivo");
      const previa = j.querySelector("#i-previa");
      const encher = (escolher) => {
        sel.innerHTML = lista.map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join("") || "";
        if (!lista.length) previa.innerHTML = '<span class="dica">Nenhuma imagem no projeto. Clique em "Enviar imagem do computador".</span>';
        if (escolher) { sel.value = escolher; sel.onchange(); }
      };
      sel.onchange = () => {
        const c = sel.value;
        previa.innerHTML = /\.(png|jpe?g|gif|bmp|svg)$/i.test(c) ? `<img src="${esc(url(c))}" alt="">` : `<span class="dica">${esc(c)}</span>`;
      };
      j.querySelector("#i-larg").oninput = (e) => (j.querySelector("#i-larg-txt").textContent = `${e.target.value}%`);
      j.querySelector("#i-flutuante").onchange = (e) => (j.querySelector("#i-legenda").disabled = !e.target.checked);
      j.querySelector("#i-enviar").onclick = async () => {
        const arquivos = (await escolherArquivos({ aceitar: "image/*,.pdf,.eps" })).filter((a) => EXT_IMG.test(a.name));
        if (!arquivos.length) return;
        const enviados = await enviar(arquivos);
        lista = [...new Set([...lista, ...enviados])];
        encher(enviados[0]);
      };
      encher(lista[0]);
    },
    coletar: (j) => {
      const arquivo = j.querySelector("#i-arquivo").value;
      if (!arquivo) {
        aviso("Escolha ou envie uma imagem.", "erro");
        return undefined;
      }
      const largura = Number(j.querySelector("#i-larg").value) / 100;
      const legenda = j.querySelector("#i-legenda").value.trim();
      const pos = j.querySelector("#i-pos").value;
      const comando = `\\includegraphics[width=${largura === 1 ? "" : largura}\\textwidth]{${arquivo}}`;
      const pacotes = ["graphicx"];
      if (pos === "H") pacotes.push("float");
      if (!j.querySelector("#i-flutuante").checked) {
        return { texto: `\n\\begin{center}\n  ${comando}\n\\end{center}\n`, pacotes };
      }
      const nome = arquivo.split("/").pop().replace(/\.[^.]+$/, "");
      const linhas = ["", `\\begin{figure}[${pos}]`, "  \\centering", `  ${comando}`];
      if (legenda) linhas.push(`  \\caption{${escaparTexto(legenda)}}`);
      linhas.push(`  \\label{${rotuloDe("fig", legenda || nome)}}`, "\\end{figure}", "");
      return { texto: linhas.join("\n"), pacotes };
    },
  });
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

export function inserirLista() {
  return dialogo({
    titulo: "Inserir lista",
    largura: 520,
    conteudo: `
      <label class="campo"><span>Tipo</span>
        <select id="i-tipo"><option value="itemize">Marcadores (•)</option><option value="enumerate">Numerada (1, 2, 3)</option><option value="alfabetica">Alfabética (a, b, c)</option></select></label>
      <label class="campo"><span>Itens (um por linha)</span><textarea id="i-itens" rows="6" placeholder="Primeiro item&#10;Segundo item"></textarea></label>`,
    botoes: [{ texto: "Cancelar", valor: null }, { texto: "Inserir", valor: "ok", classe: "primario" }],
    aoAbrir: (j) => j.querySelector("#i-itens").focus(),
    coletar: (j) => {
      const tipo = j.querySelector("#i-tipo").value;
      const itens = j.querySelector("#i-itens").value.split("\n").map((s) => s.trim()).filter(Boolean);
      const corpo = (itens.length ? itens : [""]).map((i) => `  \\item ${i}`).join("\n");
      if (tipo === "alfabetica") return { texto: `\n\\begin{enumerate}[label=\\alph*)]\n${corpo}\n\\end{enumerate}\n`, pacotes: ["enumitem"] };
      return { texto: `\n\\begin{${tipo}}\n${corpo}\n\\end{${tipo}}\n`, pacotes: [] };
    },
  });
}

// ---------------------------------------------------------------------------
// Equação (com prévia ao vivo)
// ---------------------------------------------------------------------------

export function inserirEquacao(variaveis) {
  return dialogo({
    titulo: "Inserir equação",
    largura: 640,
    conteudo: `
      <label class="campo"><span>Fórmula (código LaTeX, sem cifrões)</span>
        <textarea id="i-eq" rows="3" spellcheck="false" placeholder="F = \\frac{\\psi P}{n \\cos\\alpha}"></textarea></label>
      <div class="previa-equacao" id="i-previa"></div>
      <div class="linha-campos">
        <label class="campo"><span>Formato</span>
          <select id="i-tipo"><option value="equation">Destacada e numerada (1)</option><option value="equation*">Destacada sem número</option><option value="inline">No meio do texto ($...$)</option></select></label>
        <label class="campo"><span>Rótulo (para \\eqref)</span><input id="i-rot" type="text" value="eq:" spellcheck="false"></label>
      </div>`,
    botoes: [{ texto: "Cancelar", valor: null }, { texto: "Inserir", valor: "ok", classe: "primario" }],
    aoAbrir: (j) => {
      const eq = j.querySelector("#i-eq");
      const previa = j.querySelector("#i-previa");
      const atualizar = () => (eq.value.trim() ? desenharFormula(previa, eq.value, true, variaveis) : (previa.innerHTML = '<span class="dica">A prévia aparece aqui.</span>'));
      eq.oninput = atualizar;
      j.querySelector("#i-tipo").onchange = (e) => (j.querySelector("#i-rot").disabled = e.target.value !== "equation");
      atualizar();
      eq.focus();
    },
    coletar: (j) => {
      const eq = j.querySelector("#i-eq").value.trim();
      if (!eq) return undefined;
      const tipo = j.querySelector("#i-tipo").value;
      if (tipo === "inline") return { texto: `$${eq}$`, pacotes: [] };
      const rot = j.querySelector("#i-rot").value.trim();
      const rotulo = tipo === "equation" && rot && rot !== "eq:" ? `\n  \\label{${rot}}` : "";
      return { texto: `\n\\begin{${tipo}}\n  ${eq}${rotulo}\n\\end{${tipo}}\n`, pacotes: ["amsmath"] };
    },
  });
}

// ---------------------------------------------------------------------------
// Nota de rodapé, referência cruzada e citação
// ---------------------------------------------------------------------------

export function inserirNota() {
  return dialogo({
    titulo: "Inserir nota de rodapé",
    largura: 480,
    conteudo: `<label class="campo"><span>Texto da nota</span><textarea id="i-nota" rows="3"></textarea></label>`,
    botoes: [{ texto: "Cancelar", valor: null }, { texto: "Inserir", valor: "ok", classe: "primario" }],
    aoAbrir: (j) => j.querySelector("#i-nota").focus(),
    coletar: (j) => {
      const t = j.querySelector("#i-nota").value.trim();
      return t ? { texto: `\\footnote{${t}}`, pacotes: [] } : undefined;
    },
  });
}

/** Escolha numa lista com busca (usada para rótulos e citações). */
function escolherDaLista(titulo, rotulo, opcoes, montar) {
  if (!opcoes.length) {
    aviso(`Nenhum item encontrado para "${titulo}". Recompile o projeto para atualizar a lista.`, "info", 5000);
    return Promise.resolve(null);
  }
  return dialogo({
    titulo,
    largura: 520,
    conteudo: `<input type="search" id="i-busca" placeholder="Buscar…" spellcheck="false" class="campo-busca">
      <label class="campo"><span>${esc(rotulo)}</span><select id="i-lista" size="10" ${montar.multiplo ? "multiple" : ""}>${opcoes.map((o) => `<option value="${esc(o.valor)}">${esc(o.texto)}</option>`).join("")}</select></label>
      ${montar.extra || ""}`,
    botoes: [{ texto: "Cancelar", valor: null }, { texto: "Inserir", valor: "ok", classe: "primario" }],
    aoAbrir: (j) => {
      const lista = j.querySelector("#i-lista");
      lista.selectedIndex = 0;
      j.querySelector("#i-busca").oninput = (e) => {
        const f = e.target.value.toLowerCase();
        [...lista.options].forEach((o) => (o.hidden = !o.text.toLowerCase().includes(f)));
      };
      lista.ondblclick = () => j.querySelector(".modal-rodape .primario").click();
      j.querySelector("#i-busca").focus();
    },
    coletar: (j) => {
      const escolhidos = [...j.querySelector("#i-lista").selectedOptions].map((o) => o.value);
      return escolhidos.length ? montar.texto(escolhidos, j) : undefined;
    },
  });
}

export function inserirReferencia(rotulos) {
  const tipo = (r) => (r.startsWith("fig") ? "Figura" : r.startsWith("tab") ? "Tabela" : r.startsWith("eq") ? "Equação" : r.startsWith("sec") || r.startsWith("cap") ? "Seção" : "");
  return escolherDaLista(
    "Inserir referência cruzada",
    "Rótulo (\\label) a referenciar",
    rotulos.map((r) => ({ valor: r, texto: `${tipo(r) ? tipo(r) + " — " : ""}${r}` })),
    {
      extra: `<label class="marcar"><input type="checkbox" id="i-prefixo" checked> Escrever "Figura", "Tabela"... antes do número</label>`,
      texto: ([r], j) => {
        const eq = r.startsWith("eq");
        const ref = eq ? `\\eqref{${r}}` : `\\ref{${r}}`;
        const pre = j.querySelector("#i-prefixo").checked && tipo(r) ? `${tipo(r)}~` : "";
        return { texto: pre + ref, pacotes: eq ? ["amsmath"] : [] };
      },
    },
  );
}

export function inserirCitacao(citacoes) {
  return escolherDaLista("Inserir citação", "Referências dos arquivos .bib (Ctrl+clique para várias)", citacoes.map((c) => ({ valor: c, texto: c })), {
    multiplo: true,
    texto: (cs) => ({ texto: `\\cite{${cs.join(",")}}`, pacotes: [] }),
  });
}
