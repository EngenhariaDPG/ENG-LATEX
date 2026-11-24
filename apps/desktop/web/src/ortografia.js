// Corretor ortográfico do editor.
//
// Como funciona:
// 1. O texto é varrido procurando palavras "de verdade", pulando comandos
//    LaTeX, fórmulas ($...$, equation, align...), comentários, rótulos,
//    citações, nomes de arquivos, opções de pacotes etc.;
// 2. As palavras ainda não conhecidas são enviadas ao programa, que verifica
//    com o dicionário Hunspell do idioma do trecho (o do projeto, ou o de um
//    trecho marcado em outro idioma — ver "Trechos em outros idiomas");
// 3. As erradas recebem um sublinhado vermelho ondulado;
// 4. Clique com o botão direito numa palavra sublinhada para ver sugestões,
//    adicionar ao dicionário pessoal ou ignorar.

import { StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";
import { EditorView, Decoration, ViewPlugin } from "@codemirror/view";
import { api } from "./api.js";
import { menuContexto, aviso } from "./ui.js";

// ---------------------------------------------------------------------------
// Regras do que NÃO deve ser verificado
// ---------------------------------------------------------------------------

/** Comandos cujos N primeiros argumentos {..} não são texto (rótulos, arquivos, opções...). */
const ARGUMENTOS_IGNORADOS = {
  label: 1, ref: 1, eqref: 1, pageref: 1, autoref: 1, cref: 1, Cref: 1, nameref: 1,
  usepackage: 1, RequirePackage: 1, documentclass: 1, input: 1, include: 1, includegraphics: 1,
  includepdf: 1, bibliography: 1, bibliographystyle: 1, addbibresource: 1, url: 1, href: 1,
  var: 1, hspace: 1, vspace: 1, "hspace*": 1, "vspace*": 1, pagestyle: 1, thispagestyle: 1,
  usetheme: 1, usecolortheme: 1, usefonttheme: 1, useinnertheme: 1, useoutertheme: 1,
  sisetup: 1, hypersetup: 1, geometry: 1, color: 1, textcolor: 1, colorbox: 1, fcolorbox: 2,
  pagecolor: 1, definecolor: 3, setcounter: 2, addtocounter: 2, setlength: 2, addtolength: 2,
  newcommand: 2, renewcommand: 2, providecommand: 2, newenvironment: 3, renewenvironment: 3,
  DeclareMathOperator: 2, SI: 2, si: 1, num: 1, qty: 2, unit: 1, ang: 1, SIrange: 3,
  newcounter: 1, numberwithin: 2, graphicspath: 1, lstset: 1, tikzset: 1, pgfplotsset: 1,
  rule: 2, raisebox: 1, resizebox: 2, scalebox: 1, makebox: 0, parbox: 1, rotatebox: 1,
  multicolumn: 2, multirow: 2, cline: 1, fontsize: 2, selectfont: 0, setmainfont: 1,
  setsansfont: 1, setmonofont: 1, newfontfamily: 2, bibitem: 1, nocite: 1, lhead: 0,
  pgfmathsetmacro: 2, selectlanguage: 1, foreignlanguage: 1, setdefaultlanguage: 1, setotherlanguage: 1, foreach: 0, columnwidth: 0, column: 1, def: 0, let: 0, mbox: 0,
};

/** Ambientes cujo conteúdo inteiro é ignorado (matemática, código, desenhos). */
const AMBIENTES_IGNORADOS = new Set([
  "equation", "equation*", "align", "align*", "alignat", "alignat*", "gather", "gather*",
  "multline", "multline*", "flalign", "flalign*", "eqnarray", "eqnarray*", "math", "displaymath",
  "verbatim", "verbatim*", "lstlisting", "minted", "comment", "tikzpicture", "axis", "circuitikz",
  "pgfpicture", "filecontents", "filecontents*", "split", "cases", "matrix", "pmatrix", "bmatrix",
]);

/** Ambientes com argumentos de configuração logo após o \begin (ex.: colunas da tabela). */
const AMBIENTES_COM_ARGUMENTOS = new Set([
  "tabular", "tabular*", "tabularx", "tabulary", "longtable", "array", "minipage", "multicols",
  "wrapfigure", "subfigure", "figure", "figure*", "table", "table*", "columns", "thebibliography",
  "otherlanguage", "otherlanguage*", "hyphenrules",
]);

/** Letras (inclui acentos de qualquer idioma). */
const LETRA = /\p{L}/u;

/**
 * Varre o texto e devolve as palavras a verificar: [{ de, ate, palavra }].
 * Só devolve palavras que começam entre `inicio` e `fim` (a parte visível).
 */
export function encontrarPalavras(texto, inicio = 0, fim = texto.length) {
  const palavras = [];
  const n = texto.length;
  let i = 0;

  /** Pula um grupo {...} ou [...] começando em j (com chaves aninhadas). Devolve a posição após o fechamento. */
  const pularGrupo = (j, abre, fecha) => {
    let nivel = 0;
    for (; j < n; j++) {
      const c = texto[j];
      if (c === "\\") { j++; continue; }
      if (c === abre) nivel++;
      else if (c === fecha) { nivel--; if (nivel === 0) return j + 1; }
    }
    return n;
  };
  /** Pula espaços (sem pular linha em branco). */
  const pularEspacos = (j) => { while (j < n && (texto[j] === " " || texto[j] === "\t")) j++; return j; };
  /** Pula argumentos opcionais [..] e `qtd` argumentos obrigatórios {..}. */
  const pularArgumentos = (j, qtd) => {
    j = pularEspacos(j);
    if (texto[j] === "*") j++;
    while (texto[pularEspacos(j)] === "[") j = pularGrupo(pularEspacos(j), "[", "]");
    for (let k = 0; k < qtd; k++) {
      j = pularEspacos(j);
      if (texto[j] === "{") j = pularGrupo(j, "{", "}");
      else if (texto[j] === "\\") { j++; while (j < n && /[a-zA-Z@]/.test(texto[j])) j++; }
      else break;
      while (texto[pularEspacos(j)] === "[") j = pularGrupo(pularEspacos(j), "[", "]");
    }
    return j;
  };

  while (i < n) {
    const c = texto[i];

    // Comentário: até o fim da linha.
    if (c === "%") {
      const f = texto.indexOf("\n", i);
      i = f < 0 ? n : f + 1;
      continue;
    }

    // Fórmulas com $ e $$.
    if (c === "$") {
      if (texto[i + 1] === "$") {
        const f = texto.indexOf("$$", i + 2);
        i = f < 0 ? n : f + 2;
      } else {
        let j = i + 1;
        while (j < n && !(texto[j] === "$" && texto[j - 1] !== "\\")) j++;
        i = j + 1;
      }
      continue;
    }

    // Comandos.
    if (c === "\\") {
      const prox = texto[i + 1];
      if (prox === "[" || prox === "(") {
        // \[ ... \]  e  \( ... \)
        const fecha = prox === "[" ? "\\]" : "\\)";
        const f = texto.indexOf(fecha, i + 2);
        i = f < 0 ? n : f + 2;
        continue;
      }
      if (!prox || !/[a-zA-Z@]/.test(prox)) {
        i += 2; // \%, \&, \\, \{ ...
        continue;
      }
      let j = i + 1;
      while (j < n && /[a-zA-Z@]/.test(texto[j])) j++;
      let nome = texto.slice(i + 1, j);
      if (texto[j] === "*") nome += "*";

      if (nome === "begin" || nome === "end") {
        const k = pularEspacos(j);
        if (texto[k] === "{") {
          const fimNome = pularGrupo(k, "{", "}");
          const ambiente = texto.slice(k + 1, fimNome - 1).trim();
          j = fimNome;
          if (nome === "begin" && AMBIENTES_IGNORADOS.has(ambiente)) {
            const fimAmb = texto.indexOf(`\\end{${ambiente}}`, j);
            j = fimAmb < 0 ? n : fimAmb + ambiente.length + 6;
          } else if (nome === "begin" && AMBIENTES_COM_ARGUMENTOS.has(ambiente)) {
            j = pularArgumentos(j, ambiente === "tabularx" || ambiente === "tabular*" ? 2 : 1);
          } else if (nome === "begin") {
            j = pularArgumentos(j, 0); // só opções [..], ex.: \begin{itemize}[noitemsep]
          }
        }
        i = j;
        continue;
      }
      const base = nome.replace(/\*$/, "");
      let qtd = ARGUMENTOS_IGNORADOS[nome] ?? ARGUMENTOS_IGNORADOS[base];
      if (qtd === undefined && /cite/i.test(base)) qtd = 1;
      i = qtd !== undefined ? pularArgumentos(j, qtd) : j;
      continue;
    }

    // Palavra.
    if (LETRA.test(c)) {
      let j = i + 1;
      while (j < n) {
        const d = texto[j];
        if (LETRA.test(d)) { j++; continue; }
        // Hífen ou apóstrofo no meio da palavra ("guarda-corpo", "d'água").
        if ((d === "-" || d === "'" || d === "’") && j + 1 < n && LETRA.test(texto[j + 1])) { j += 2; continue; }
        break;
      }
      const palavra = texto.slice(i, j);
      // Ignora: letras soltas, siglas em maiúsculas (NBR, ART, CREA) e palavras grudadas em números.
      const grudadaEmNumero = /\d/.test(texto[i - 1] || "") || /\d/.test(texto[j] || "");
      // Abreviações curtas seguidas de ponto ("Rev.", "Eng.", "Fig.") também são ignoradas.
      const abreviacao = texto[j] === "." && palavra.length <= 4;
      // Unidades e siglas mistas (kN, MPa, kW, NBRs): maiúscula depois da 1ª letra.
      const unidade = /^.\p{Ll}*\p{Lu}/u.test(palavra) && palavra.length <= 6;
      if (i >= inicio && i <= fim && palavra.length > 1 && palavra !== palavra.toUpperCase() && !grudadaEmNumero && !abreviacao && !unidade) {
        palavras.push({ de: i, ate: j, palavra });
      }
      i = j;
      continue;
    }
    i++;
  }
  return palavras;
}

// ---------------------------------------------------------------------------
// Trechos em outros idiomas
// ---------------------------------------------------------------------------
// O documento pode marcar trechos em outro idioma (babel/polyglossia):
//   \begin{otherlanguage}{english} ... \end{otherlanguage}
//   \foreignlanguage{english}{texto}     \textenglish{texto}
//   \selectlanguage{english}  (vale até o próximo \selectlanguage)
//   \begin{english} ... \end{english}    (polyglossia)
// Cada palavra é verificada no dicionário do idioma do trecho onde está.

/** Nomes de idioma do babel/polyglossia -> dicionário. */
export const IDIOMAS_BABEL = {
  brazil: "pt_BR", brazilian: "pt_BR", brazilian_portuguese: "pt_BR",
  portuguese: "pt_PT", portuges: "pt_PT", portugues: "pt_PT",
  english: "en_US", american: "en_US", usenglish: "en_US", british: "en_GB", ukenglish: "en_GB",
  spanish: "es_ES", french: "fr_FR", francais: "fr_FR", german: "de_DE", ngerman: "de_DE",
  italian: "it_IT",
};

/** Converte um nome do babel (com variações de maiúsculas) para o id do dicionário. */
function idiomaDe(nome) {
  const n = nome.trim().toLowerCase().replace(/[\s-]/g, "");
  return IDIOMAS_BABEL[n] ?? null;
}

/**
 * Faixas de idioma do texto: [{ de, ate, idioma }]. `idioma` = null quando o
 * nome não é conhecido (essas palavras não são verificadas).
 */
export function faixasDeIdioma(texto) {
  const faixas = [];
  // \selectlanguage: do comando até o próximo \selectlanguage.
  const selects = [...texto.matchAll(/\\selectlanguage\{([^}]+)\}/g)];
  selects.forEach((m, i) => {
    const fim = i + 1 < selects.length ? selects[i + 1].index : texto.length;
    faixas.push({ de: m.index, ate: fim, idioma: idiomaDe(m[1]), nivel: 0 });
  });
  // Ambientes otherlanguage e ambientes com nome de idioma (polyglossia).
  for (const m of texto.matchAll(/\\begin\{(otherlanguage\*?)\}(?:\[[^\]]*\])?\{([^}]+)\}|\\begin\{([a-zA-Z]+)\}/g)) {
    const nome = m[1] ? m[2] : m[3];
    const idioma = idiomaDe(nome);
    if (!m[1] && idioma === null) continue; // \begin{itemize} etc.
    const amb = m[1] || m[3];
    const fim = texto.indexOf(`\\end{${amb}}`, m.index);
    faixas.push({ de: m.index, ate: fim < 0 ? texto.length : fim, idioma, nivel: 1 });
  }
  // \foreignlanguage{idioma}{texto} e \textenglish{texto} (polyglossia).
  for (const m of texto.matchAll(/\\foreignlanguage(?:\[[^\]]*\])?\{([^}]+)\}\{|\\text([a-z]+)(?:\[[^\]]*\])?\{/g)) {
    const idioma = idiomaDe(m[1] ?? m[2]);
    if (!m[1] && idioma === null) continue; // \textbf, \textit...
    let nivel = 0, j = m.index + m[0].length - 1;
    for (; j < texto.length; j++) {
      if (texto[j] === "\\") { j++; continue; }
      if (texto[j] === "{") nivel++;
      else if (texto[j] === "}" && --nivel === 0) break;
    }
    faixas.push({ de: m.index, ate: j, idioma, nivel: 2 });
  }
  return faixas;
}

/** Idioma de uma posição: a faixa mais interna que a contém, ou undefined (= idioma do projeto). */
export function idiomaNaPosicao(faixas, pos) {
  let melhor;
  for (const f of faixas) {
    if (pos >= f.de && pos < f.ate && (!melhor || f.nivel > melhor.nivel || (f.nivel === melhor.nivel && f.de > melhor.de))) melhor = f;
  }
  return melhor ? melhor.idioma : undefined;
}

// ---------------------------------------------------------------------------
// Extensão do CodeMirror
// ---------------------------------------------------------------------------

/** Resultado das verificações já feitas: idioma -> Map(palavra -> correta?). */
const cache = new Map();
/** Palavras ignoradas nesta sessão (botão "Ignorar"). */
const ignoradas = new Set();
/** Idiomas cujo aviso de "dicionário não instalado" já foi mostrado. */
const avisados = new Set();

function cacheDo(idioma) {
  if (!cache.has(idioma)) cache.set(idioma, new Map());
  return cache.get(idioma);
}

/** Efeito que troca o conjunto de sublinhados. */
const definirErros = StateEffect.define();
const marcaErro = Decoration.mark({ class: "cm-erro-ortografia" });

/** Guarda os sublinhados e os ajusta conforme o texto é editado. */
const campoErros = StateField.define({
  create: () => Decoration.none,
  update(decos, tr) {
    decos = decos.map(tr.changes);
    for (const e of tr.effects) if (e.is(definirErros)) decos = e.value;
    return decos;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/**
 * Cria o corretor. `opcoes.idioma()` devolve o idioma atual (ex.: "pt_BR"),
 * `opcoes.ativo()` diz se o corretor está ligado.
 */
export function corretorOrtografico(opcoes) {
  const plugin = ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.view = view;
        this.temporizador = null;
        this.agendar(50);
      }
      update(u) {
        if (u.docChanged || u.viewportChanged || u.transactions.some((t) => t.effects.some((e) => e.is(reverificar)))) {
          this.agendar(u.docChanged ? 600 : 150);
        }
      }
      agendar(ms) {
        clearTimeout(this.temporizador);
        this.temporizador = setTimeout(() => this.verificar(), ms);
      }
      async verificar() {
        const view = this.view;
        if (!opcoes.ativo()) {
          view.dispatch({ effects: definirErros.of(Decoration.none) });
          return;
        }
        const principal = opcoes.idioma();
        const extras = opcoes.extras ? opcoes.extras() : [];
        const texto = view.state.doc.toString();
        // Verifica a parte visível com uma margem (rolar a tela não deixa "buracos").
        const { from, to } = view.viewport;
        const palavras = encontrarPalavras(texto, Math.max(0, from - 3000), Math.min(texto.length, to + 3000));
        const faixas = faixasDeIdioma(texto);

        // Agrupa as palavras pelo idioma do trecho onde estão.
        // Chave do grupo: "idioma|extras" (o cache é separado por grupo).
        const grupos = new Map();
        for (const p of palavras) {
          const trecho = idiomaNaPosicao(faixas, p.de);
          if (trecho === null) { p.grupo = null; continue; } // idioma desconhecido: não verifica
          const idioma = trecho || principal;
          const lista = idioma === principal ? extras : [];
          p.grupo = `${idioma}|${lista.join(",")}`;
          if (!grupos.has(p.grupo)) grupos.set(p.grupo, { idioma, extras: lista, palavras: new Set() });
          grupos.get(p.grupo).palavras.add(p.palavra);
        }

        // Envia ao programa só as palavras ainda não verificadas de cada grupo.
        let consultou = false;
        for (const [chave, g] of grupos) {
          const conhecidas = cacheDo(chave);
          const novas = [...g.palavras].filter((p) => !conhecidas.has(p));
          if (!novas.length) continue;
          consultou = true;
          try {
            for (let k = 0; k < novas.length; k += 2000) {
              const lote = novas.slice(k, k + 2000);
              const { erradas } = await api.verificarPalavras(g.idioma, lote, g.extras);
              const set = new Set(erradas);
              for (const p of lote) conhecidas.set(p, !set.has(p));
            }
          } catch (e) {
            // Dicionário não instalado: avisa uma vez por idioma e não sublinha esse trecho.
            if (!avisados.has(g.idioma)) {
              avisados.add(g.idioma);
              aviso(g.idioma === principal ? e.message : `Há texto em ${g.idioma} no documento, mas o dicionário não está instalado. Baixe em Configurações → Corretor ortográfico.`, "erro", 7000);
            }
            for (const p of novas) conhecidas.set(p, true);
          }
        }
        // O texto pode ter mudado enquanto esperava: começa de novo.
        if (consultou && view.state.doc.toString() !== texto) return this.agendar(100);

        const construtor = new RangeSetBuilder();
        for (const p of palavras) {
          if (p.grupo && cacheDo(p.grupo).get(p.palavra) === false && !ignoradas.has(p.palavra)) construtor.add(p.de, p.ate, marcaErro);
        }
        view.dispatch({ effects: definirErros.of(construtor.finish()) });
      }
      destroy() {
        clearTimeout(this.temporizador);
      }
    },
  );

  // Botão direito numa palavra sublinhada: sugestões.
  const menu = EditorView.domEventHandlers({
    contextmenu(evento, view) {
      const pos = view.posAtCoords({ x: evento.clientX, y: evento.clientY });
      if (pos == null) return false;
      let alvo = null;
      view.state.field(campoErros).between(pos, pos, (de, ate) => {
        alvo = { de, ate };
        return false;
      });
      if (!alvo) return false; // menu normal (copiar/colar)
      evento.preventDefault();
      const palavra = view.state.sliceDoc(alvo.de, alvo.ate);
      // Sugestões no idioma do trecho onde a palavra está.
      const idioma = idiomaNaPosicao(faixasDeIdioma(view.state.doc.toString()), alvo.de) || opcoes.idioma();

      const acoesFixas = [
        "-",
        { texto: `Adicionar "${palavra}" ao dicionário`, icone: "livro", acao: async () => {
          await api.adicionarPalavra(palavra).catch((e) => aviso(e.message, "erro"));
          for (const c of cache.values()) c.set(palavra, true);
          view.dispatch({ effects: reverificar.of(null) });
        } },
        { texto: "Ignorar nesta sessão", icone: "fechar", acao: () => {
          ignoradas.add(palavra);
          view.dispatch({ effects: reverificar.of(null) });
        } },
      ];
      const x = evento.clientX, y = evento.clientY;
      menuContexto(x, y, [{ texto: "Buscando sugestões…", acao: () => {} }, ...acoesFixas]);
      api.sugerir(idioma, palavra).then((sugestoes) => {
        const itens = sugestoes.length
          ? sugestoes.map((s) => ({ texto: s, acao: () => {
              // Confere se a palavra ainda está no mesmo lugar antes de trocar.
              if (view.state.sliceDoc(alvo.de, alvo.ate) === palavra) {
                view.dispatch({ changes: { from: alvo.de, to: alvo.ate, insert: s } });
              }
            } }))
          : [{ texto: "Sem sugestões", acao: () => {} }];
        menuContexto(x, y, [...itens, ...acoesFixas]);
      }).catch(() => {});
      return true;
    },
  });

  return [campoErros, plugin, menu];
}

/** Efeito para pedir uma nova verificação (troca de idioma, palavra adicionada...). */
export const reverificar = StateEffect.define();
