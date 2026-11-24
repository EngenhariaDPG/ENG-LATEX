// Gerenciador de referências bibliográficas (arquivos .bib).
//
// Janela com a lista de referências do projeto à esquerda e o formulário da
// referência escolhida à direita. Permite:
//  - cadastrar livro, artigo, norma técnica (ABNT/NBR), site, tese, relatório...;
//  - buscar os dados automaticamente pelo DOI (precisa de internet);
//  - colar entradas BibTeX (por exemplo, copiadas do Google Acadêmico);
//  - inserir a citação no texto (\cite{chave});
//  - criar o arquivo referencias.bib e o \bibliography no documento, se faltarem.
//
// O arquivo .bib é lido e gravado aqui mesmo (formato texto simples), preservando
// entradas e campos que o formulário não conhece.

import { api } from "./api.js";
import { dialogo, esc, el, icone, aviso } from "./ui.js";

const decodificar = (b) => new TextDecoder("utf-8").decode(new Uint8Array(b));

// ---------------------------------------------------------------------------
// Tipos de referência e campos do formulário
// ---------------------------------------------------------------------------

/** Campo: [nome BibTeX, rótulo, dica]. */
const CAMPOS = {
  author: ["Autor(es)", "Sobrenome, Nome and Sobrenome, Nome"],
  title: ["Título", ""],
  year: ["Ano", "2024"],
  publisher: ["Editora", ""],
  address: ["Local", "São Paulo"],
  edition: ["Edição", "3"],
  journal: ["Revista", ""],
  volume: ["Volume", ""],
  number: ["Número", ""],
  pages: ["Páginas", "10--25"],
  doi: ["DOI", "10.xxxx/yyyy"],
  url: ["Endereço (URL)", "https://"],
  urldate: ["Acessado em", "2026-11-20"],
  organization: ["Organização", "Associação Brasileira de Normas Técnicas"],
  institution: ["Instituição", ""],
  school: ["Universidade", ""],
  booktitle: ["Nome do evento/livro", ""],
  note: ["Observação", ""],
  howpublished: ["Publicação", ""],
};

/** Tipos: [rótulo, tipo BibTeX, campos do formulário]. */
const TIPOS = {
  livro: ["Livro", "book", ["author", "title", "edition", "address", "publisher", "year"]],
  artigo: ["Artigo de revista", "article", ["author", "title", "journal", "volume", "number", "pages", "year", "doi"]],
  norma: ["Norma técnica (ABNT/NBR, NR...)", "misc", ["organization", "title", "address", "year", "note"]],
  site: ["Site / página da internet", "misc", ["author", "title", "howpublished", "url", "urldate", "year"]],
  congresso: ["Trabalho em evento", "inproceedings", ["author", "title", "booktitle", "address", "pages", "year", "doi"]],
  tese: ["Tese / dissertação", "phdthesis", ["author", "title", "school", "address", "year"]],
  tcc: ["TCC / monografia", "mastersthesis", ["author", "title", "school", "address", "year"]],
  relatorio: ["Relatório técnico", "techreport", ["author", "title", "institution", "number", "address", "year"]],
  manual: ["Manual / catálogo de fabricante", "manual", ["organization", "title", "edition", "address", "year", "url"]],
  outro: ["Outro", "misc", ["author", "title", "howpublished", "year", "note"]],
};

/**
 * Ajustes para a referência sair certa nos estilos BibTeX:
 *  - siglas no título ficam entre chaves ({NBR}), senão o estilo as escreve em minúsculas ("Nbr");
 *  - em normas e manuais a organização vira o autor ({ASSOCIAÇÃO ...} entre chaves = autor
 *    institucional) e o local vai para "howpublished" (o tipo misc não imprime "address").
 */
function ajustarParaEstilos(dados, tipoForm) {
  const c = dados.campos;
  if (c.title) {
    // Protege palavras com 2+ maiúsculas que ainda não estão entre chaves.
    c.title = c.title.replace(/(^|[^{\\\w])([A-ZÀ-Ý][A-ZÀ-Ý0-9-]+)(?![^{]*})/g, (m, antes, sigla) => (/[A-ZÀ-Ý].*[A-ZÀ-Ý]/.test(sigla) ? `${antes}{${sigla}}` : m));
  }
  if (["norma", "manual"].includes(tipoForm) && c.organization) {
    c.author = `{${c.organization.replace(/^\{|\}$/g, "")}}`;
    if (tipoForm === "norma" && c.address) c.howpublished = c.address;
  }
}

/** Descobre o tipo do formulário a partir do tipo BibTeX e dos campos. */
function tipoDoFormulario(e) {
  const t = e.tipo.toLowerCase();
  if (t === "book") return "livro";
  if (t === "article") return "artigo";
  if (t === "inproceedings" || t === "conference") return "congresso";
  if (t === "phdthesis") return "tese";
  if (t === "mastersthesis") return "tcc";
  if (t === "techreport") return "relatorio";
  if (t === "manual") return "manual";
  if (t === "misc" && (e.campos.url || e.campos.howpublished)) return "site";
  if (t === "misc" && e.campos.organization) return "norma";
  return "outro";
}

// ---------------------------------------------------------------------------
// Leitura e gravação de BibTeX
// ---------------------------------------------------------------------------

/**
 * Lê o texto de um .bib. Devolve [{ tipo, chave, campos:{}, inicio, fim }].
 * Comentários e @string/@preamble são ignorados (e preservados no arquivo).
 */
export function lerBib(texto) {
  const entradas = [];
  const re = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;
  let m;
  while ((m = re.exec(texto))) {
    const tipo = m[1];
    if (/^(string|preamble|comment)$/i.test(tipo)) continue;
    // Acha o fim da entrada contando chaves.
    let nivel = 1, i = texto.indexOf("{", m.index) + 1;
    for (; i < texto.length && nivel > 0; i++) {
      if (texto[i] === "{") nivel++;
      else if (texto[i] === "}") nivel--;
    }
    const corpo = texto.slice(m.index + m[0].length, i - 1);
    entradas.push({ tipo, chave: m[2], campos: lerCampos(corpo), inicio: m.index, fim: i });
    re.lastIndex = i;
  }
  return entradas;
}

/** Lê os campos "nome = {valor}" / "nome = "valor"" / "nome = 2020" de uma entrada. */
function lerCampos(corpo) {
  const campos = {};
  let i = 0;
  while (i < corpo.length) {
    const m = /\s*([A-Za-z][\w-]*)\s*=\s*/y;
    m.lastIndex = i;
    const r = m.exec(corpo);
    if (!r) {
      i++;
      continue;
    }
    const nome = r[1].toLowerCase();
    i = m.lastIndex;
    let valor = "";
    if (corpo[i] === "{") {
      let nivel = 0, j = i;
      for (; j < corpo.length; j++) {
        if (corpo[j] === "{") nivel++;
        else if (corpo[j] === "}" && --nivel === 0) break;
      }
      valor = corpo.slice(i + 1, j);
      i = j + 1;
    } else if (corpo[i] === '"') {
      const j = corpo.indexOf('"', i + 1);
      valor = corpo.slice(i + 1, j < 0 ? corpo.length : j);
      i = (j < 0 ? corpo.length : j) + 1;
    } else {
      const j = corpo.slice(i).search(/[,\n}]/);
      valor = corpo.slice(i, j < 0 ? corpo.length : i + j).trim();
      i = j < 0 ? corpo.length : i + j;
    }
    campos[nome] = valor.replace(/\s+/g, " ").trim();
    // Pula até a próxima vírgula.
    while (i < corpo.length && corpo[i] !== ",") i++;
    i++;
  }
  return campos;
}

/** Escreve uma entrada no formato BibTeX. */
export function escreverEntrada(e) {
  const nomes = Object.keys(e.campos).filter((k) => String(e.campos[k] ?? "").trim() !== "");
  const largura = Math.max(...nomes.map((n) => n.length), 4);
  const linhas = nomes.map((n) => `  ${n.padEnd(largura)} = {${String(e.campos[n]).trim()}}`);
  return `@${e.tipo}{${e.chave},\n${linhas.join(",\n")}\n}`;
}

/** Sugere uma chave: sobrenome do 1º autor (ou organização) + ano. Ex.: "silva2020", "abnt2008". */
function sugerirChave(campos, existentes) {
  const autor = (campos.author || campos.organization || campos.title || "ref").split(/\s+and\s+/i)[0];
  const sobrenome = autor.includes(",") ? autor.split(",")[0] : autor.split(/\s+/).pop();
  let base = (sobrenome || "ref")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "").toLowerCase().slice(0, 15) || "ref";
  if (/associacaobrasileira|abnt/i.test(autor.normalize("NFD").replace(/[\u0300-\u036f\s]/g, ""))) base = "abnt";
  base += (campos.year || "").replace(/\D/g, "").slice(0, 4);
  let chave = base, n = 1;
  while (existentes.includes(chave)) chave = base + String.fromCharCode(96 + ++n); // silva2020b, c...
  return chave;
}

// ---------------------------------------------------------------------------
// Janela do gerenciador
// ---------------------------------------------------------------------------

/**
 * Abre o gerenciador.
 * @param {string} id  projeto
 * @param {string[]} arquivosBib  arquivos .bib do projeto
 * @param {object} acoes  { inserirCitacao(chaves), garantirBibliografia(arquivoBib), recarregarArvore() }
 */
export async function abrirReferencias(id, arquivosBib, acoes) {
  let arquivo = arquivosBib[0] || "referencias.bib";
  let texto = "";
  let entradas = [];
  let selecionada = -1; // índice em `entradas` (-1 = nova)
  let alterado = false;

  async function carregar() {
    texto = arquivosBib.includes(arquivo) ? decodificar(await api.lerArquivo(id, arquivo)).replace(/\r\n/g, "\n") : "";
    entradas = lerBib(texto);
  }
  await carregar();

  /** Grava o arquivo inteiro, mantendo o que está fora das entradas (comentários, @string). */
  async function gravar() {
    await api.gravarArquivo(id, arquivo, texto);
    if (!arquivosBib.includes(arquivo)) {
      arquivosBib.push(arquivo);
      await acoes.recarregarArvore();
    }
    alterado = true;
  }

  /** Substitui (ou acrescenta) uma entrada no texto do arquivo. */
  async function salvarEntrada(e, indice) {
    const bloco = escreverEntrada(e);
    if (indice >= 0) {
      const antiga = entradas[indice];
      texto = texto.slice(0, antiga.inicio) + bloco + texto.slice(antiga.fim);
    } else {
      texto = (texto.trimEnd() ? texto.trimEnd() + "\n\n" : "") + bloco + "\n";
    }
    await gravar();
    entradas = lerBib(texto);
    return entradas.findIndex((x) => x.chave === e.chave);
  }

  async function excluirEntrada(indice) {
    const e = entradas[indice];
    texto = (texto.slice(0, e.inicio).trimEnd() + "\n\n" + texto.slice(e.fim).trimStart()).trim() + "\n";
    await gravar();
    entradas = lerBib(texto);
  }

  const conteudo = `
    <div class="refs" data-sem-enter>
      <div class="refs-lista">
        <div class="refs-topo">
          <select id="r-arquivo" title="Arquivo .bib">${[...new Set([...arquivosBib, arquivo])].map((a) => `<option ${a === arquivo ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>
          <input type="search" id="r-busca" placeholder="Buscar autor, título, ano…" spellcheck="false">
        </div>
        <div class="refs-itens" id="r-itens"></div>
        <div class="refs-botoes">
          <button class="botao pequeno primario" id="r-nova">${icone("mais", 12)} Nova referência</button>
          <button class="botao pequeno" id="r-doi">Buscar por DOI…</button>
          <button class="botao pequeno" id="r-colar">Colar BibTeX…</button>
        </div>
      </div>
      <div class="refs-form" id="r-form"></div>
    </div>`;

  const r = await dialogo({
    titulo: "Referências bibliográficas",
    largura: 1000,
    conteudo,
    botoes: [{ texto: "Fechar", valor: "fechar" }, { texto: "Citar no texto", valor: "ok", classe: "primario" }],
    aoAbrir: (j) => {
      const $ = (s) => j.querySelector(s);

      /** Lista à esquerda. */
      const desenharLista = () => {
        const f = $("#r-busca").value.trim().toLowerCase();
        const itens = entradas
          .map((e, i) => ({ e, i }))
          .filter(({ e }) => !f || [e.chave, e.campos.author, e.campos.organization, e.campos.title, e.campos.year].join(" ").toLowerCase().includes(f));
        $("#r-itens").innerHTML = itens.length
          ? itens.map(({ e, i }) => `
              <div class="ref-item ${i === selecionada ? "ativo" : ""}" data-i="${i}">
                <div class="ref-titulo">${esc(e.campos.title || "(sem título)")}</div>
                <div class="ref-info"><code>${esc(e.chave)}</code> · ${esc((e.campos.author || e.campos.organization || "").split(/\s+and\s+/i)[0])} ${esc(e.campos.year || "")}</div>
              </div>`).join("")
          : `<p class="vazio pequeno">${entradas.length ? "Nada encontrado." : "Nenhuma referência ainda. Clique em \"Nova referência\"."}</p>`;
        j.querySelectorAll(".ref-item").forEach((d) => {
          d.onclick = () => { selecionada = Number(d.dataset.i); desenharLista(); desenharFormulario(entradas[selecionada]); };
          d.ondblclick = () => j.querySelector(".modal-rodape .primario").click();
        });
      };

      /** Formulário à direita (entrada existente ou nova). */
      const desenharFormulario = (e) => {
        const nova = !e;
        const dados = e ? { tipo: e.tipo, chave: e.chave, campos: { ...e.campos } } : { tipo: "book", chave: "", campos: {} };
        let tipoForm = e ? tipoDoFormulario(e) : "livro";
        const form = $("#r-form");
        const desenharCampos = () => {
          const lista = TIPOS[tipoForm][2];
          // Campos que a entrada já tem, mas o formulário não mostra, vão para "outros".
          // (o "author" automático de normas/manuais fica oculto: vem da Organização)
          const ocultos = ["norma", "manual"].includes(tipoForm) ? ["author", "howpublished"] : [];
          const extras = Object.keys(dados.campos).filter((k) => !lista.includes(k) && !ocultos.includes(k));
          form.querySelector("#r-campos").innerHTML = [...lista, ...extras]
            .map((c) => `<label class="campo"><span>${esc(CAMPOS[c]?.[0] || c)}</span>
                <input data-campo="${esc(c)}" type="text" value="${esc(dados.campos[c] || "")}" placeholder="${esc(CAMPOS[c]?.[1] || "")}" spellcheck="false"></label>`)
            .join("");
          form.querySelectorAll("[data-campo]").forEach((inp) => (inp.oninput = () => (dados.campos[inp.dataset.campo] = inp.value)));
        };
        form.innerHTML = `
          <div class="linha-campos">
            <label class="campo"><span>Tipo</span><select id="r-tipo">${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}" ${k === tipoForm ? "selected" : ""}>${esc(v[0])}</option>`).join("")}</select></label>
            <label class="campo"><span>Chave (usada em \\cite)</span><input id="r-chave" type="text" value="${esc(dados.chave)}" placeholder="automática" spellcheck="false"></label>
          </div>
          <div id="r-campos" class="refs-campos"></div>
          <p class="dica" id="r-dica-norma" ${tipoForm === "norma" ? "" : "hidden"}>Ex.: Organização = ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS; Título = NBR 8800: Projeto de estruturas de aço...; Local = Rio de Janeiro.</p>
          <div class="refs-acoes">
            ${nova ? "" : `<button class="botao pequeno perigo" id="r-excluir">${icone("lixeira", 12)} Excluir</button>`}
            <span class="espaco"></span>
            <button class="botao pequeno primario" id="r-salvar">${nova ? "Adicionar referência" : "Salvar alterações"}</button>
          </div>`;
        desenharCampos();
        $("#r-tipo").onchange = (ev) => {
          tipoForm = ev.target.value;
          dados.tipo = TIPOS[tipoForm][1];
          $("#r-dica-norma").hidden = tipoForm !== "norma";
          desenharCampos();
        };
        $("#r-salvar").onclick = async () => {
          if (!dados.campos.title?.trim()) return aviso("Preencha pelo menos o título.", "erro");
          const outras = entradas.filter((x, i) => i !== selecionada).map((x) => x.chave);
          let chave = $("#r-chave").value.trim().replace(/[\s,{}]/g, "");
          if (!chave) chave = sugerirChave(dados.campos, outras);
          if (outras.includes(chave)) return aviso(`A chave "${chave}" já existe.`, "erro");
          dados.chave = chave;
          dados.tipo = e && tipoDoFormulario(e) === tipoForm ? e.tipo : TIPOS[tipoForm][1];
          ajustarParaEstilos(dados, tipoForm);
          try {
            selecionada = await salvarEntrada(dados, nova ? -1 : selecionada);
            aviso(nova ? `Referência "${chave}" adicionada.` : "Referência salva.", "sucesso");
            desenharLista();
            desenharFormulario(entradas[selecionada]);
          } catch (err) {
            aviso(err.message, "erro");
          }
        };
        $("#r-excluir")?.addEventListener("click", async () => {
          await excluirEntrada(selecionada);
          selecionada = -1;
          desenharLista();
          desenharFormulario(null);
        });
        if (nova) form.querySelector("[data-campo]")?.focus();
      };

      /** Acrescenta entradas BibTeX (coladas ou vindas do DOI). */
      const acrescentarBib = async (bib) => {
        const novas = lerBib(bib);
        if (!novas.length) return aviso("Nenhuma entrada BibTeX encontrada no texto.", "erro");
        for (const e of novas) {
          const existentes = entradas.map((x) => x.chave);
          // Chaves geradas pelo DOI costumam ser longas: trocamos pela sugestão curta.
          if (existentes.includes(e.chave) || e.chave.length > 25 || e.chave.includes("_")) e.chave = sugerirChave(e.campos, existentes);
          selecionada = await salvarEntrada(e, -1);
        }
        aviso(`${novas.length} referência(s) adicionada(s).`, "sucesso");
        desenharLista();
        desenharFormulario(entradas[selecionada]);
      };

      $("#r-busca").oninput = desenharLista;
      $("#r-nova").onclick = () => { selecionada = -1; desenharLista(); desenharFormulario(null); };
      $("#r-arquivo").onchange = async (ev) => { arquivo = ev.target.value; await carregar(); selecionada = -1; desenharLista(); desenharFormulario(null); };
      $("#r-doi").onclick = () => {
        // Campo do DOI aparece no lugar do formulário.
        const area = el(`<div class="refs-colar"><label class="campo"><span>DOI do artigo</span>
          <input type="text" placeholder="10.1016/j.engstruct.2020.110000 ou https://doi.org/..." spellcheck="false"></label>
          <p class="dica">Os dados (autores, título, revista, ano...) são buscados em doi.org. Precisa de internet.</p>
          <div><button class="botao pequeno primario">Buscar</button> <button class="botao pequeno">Cancelar</button></div></div>`);
        const form = $("#r-form");
        form.innerHTML = "";
        form.appendChild(area);
        const campo = area.querySelector("input");
        const [buscar, cancelar] = area.querySelectorAll("button");
        buscar.onclick = async () => {
          if (!campo.value.trim()) return;
          buscar.disabled = true;
          buscar.textContent = "Buscando…";
          try {
            const { bibtex } = await api.buscarDoi(campo.value.trim());
            await acrescentarBib(bibtex);
          } catch (err) {
            aviso(err.message, "erro", 7000);
            buscar.disabled = false;
            buscar.textContent = "Buscar";
          }
        };
        campo.onkeydown = (ev) => {
          if (ev.key === "Enter") { ev.preventDefault(); ev.stopPropagation(); buscar.click(); }
        };
        cancelar.onclick = () => desenharFormulario(entradas[selecionada]);
        campo.focus();
      };
      $("#r-colar").onclick = () => {
        const area = el(`<div class="refs-colar"><textarea rows="8" placeholder="Cole aqui uma ou mais entradas BibTeX (@article{...}). No Google Acadêmico: Citar → BibTeX." spellcheck="false"></textarea>
          <div><button class="botao pequeno primario">Adicionar</button> <button class="botao pequeno">Cancelar</button></div></div>`);
        const form = $("#r-form");
        form.innerHTML = "";
        form.appendChild(area);
        const [ok, cancelar] = area.querySelectorAll("button");
        ok.onclick = () => acrescentarBib(area.querySelector("textarea").value);
        cancelar.onclick = () => desenharFormulario(entradas[selecionada]);
        area.querySelector("textarea").focus();
      };

      if (entradas.length) selecionada = 0;
      desenharLista();
      desenharFormulario(entradas[selecionada]);
    },
    coletar: () => {
      if (selecionada < 0) {
        aviso("Escolha uma referência na lista para citar.", "erro");
        return undefined;
      }
      return { citar: entradas[selecionada].chave };
    },
  });

  // Garante \bibliography no documento quando o arquivo foi criado/alterado ou ao citar.
  if (alterado || r?.citar) await acoes.garantirBibliografia(arquivo);
  if (r?.citar) acoes.inserirCitacao([r.citar]);
  return alterado;
}
