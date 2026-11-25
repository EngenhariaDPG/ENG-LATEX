// Tela do editor (como a tela de projeto do Overleaf):
//
//  ┌──────────── barra superior: menu, nome do projeto, variáveis ─────────────┐
//  │ arquivos   │ editor de código (CodeMirror)        │ PDF (pdf.js)          │
//  │ estrutura  │                                      │ [Recompilar] [Logs]   │
//  └────────────┴──────────────────────────────────────┴───────────────────────┘
//
// Responsabilidades deste módulo:
//  - árvore de arquivos (criar, renomear, mover, excluir, enviar arquivos);
//  - abrir/editar/salvar arquivos (salvamento automático);
//  - compilar, mostrar erros no editor e no painel de logs;
//  - PDF com SyncTeX nos dois sentidos;
//  - variáveis do documento, corretor ortográfico e configurações do projeto;
//  - barra de ferramentas e menu do botão direito com janelas de inserção
//    (seção, tabela, imagem, lista, equação, nota, referência, citação);
//  - modo visual, paleta de símbolos, prévia de fórmulas e histórico.

import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightSpecialChars, hoverTooltip } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { syntaxHighlighting, defaultHighlightStyle, foldGutter, indentOnInput, bracketMatching, foldKeymap, indentUnit } from "@codemirror/language";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches, search, gotoLine } from "@codemirror/search";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { lintGutter, setDiagnostics } from "@codemirror/lint";
import { oneDark } from "@codemirror/theme-one-dark";

import { api, nomeExibicao, separarIdRevisao } from "./api.js";
import { icone, iconeArquivo, esc, el, aviso, perguntar, confirmar, menuContexto, menuAbaixo, escolherArquivos, armazenamento } from "./ui.js";
import { linguagemLatex, dadosLatex, fonteAutocompletar, envolverCom, estruturaDoTexto, FRASES } from "./latex.js";
import { corretorOrtografico, reverificar } from "./ortografia.js";
import { VisualizadorPdf } from "./visualizador.js";
import { abrirVariaveis } from "./variaveis.js";
import { abrirConfiguracoes } from "./configuracoes.js";
import { previaFormulas, formulaEm } from "./formulas.js";
import { modoVisual } from "./visual.js";
import { montarPaleta } from "./simbolos.js";
import { abrirEditorTabela, tabelaNoCursor } from "./tabelas.js";
import { inserirSecao, inserirImagem, inserirLista, inserirEquacao, inserirNota, inserirReferencia, inserirCitacao } from "./insercao.js";
import { abrirHistorico } from "./historico.js";
import { contarPalavras } from "./contagem.js";
import { abrirReferencias } from "./referencias.js";
import { frasesEditor } from "./i18n.js";
import { dialogo } from "./ui.js";

/** Extensões tratadas como texto (abrem no editor). */
const EXT_TEXTO = new Set(["tex", "sty", "cls", "bib", "bst", "txt", "md", "csv", "dat", "json", "xml", "yaml", "yml", "ltx", "dtx", "ins", "def", "cfg", "clo", "lua", "py", "m", "tikz", "pgf", "gp", "plt", "bbx", "cbx", "lbx", "log", "ist", "gnuplot", "r", "c", "h", "cpp", "js", "sh", "bat", "ps1", "ini", "toml"]);
/** Extensões de imagem (abrem como visualização). */
const EXT_IMAGEM = new Set(["png", "jpg", "jpeg", "gif", "svg", "bmp", "webp"]);

const extensao = (caminho) => (caminho.includes(".") ? caminho.split(".").pop().toLowerCase() : "");
const nomeDe = (caminho) => caminho.split("/").pop();
const pastaDe = (caminho) => (caminho.includes("/") ? caminho.slice(0, caminho.lastIndexOf("/")) : "");

/** Instância atual (só existe um editor aberto por vez). */
let atual = null;

/** Fecha o editor atual (grava pendências). Chamado ao voltar para a lista de projetos. */
export async function fecharEditor() {
  if (atual) {
    await atual.salvarTudo();
    atual.destruir();
    atual = null;
  }
}

/** Monta a tela do editor para o projeto `id`. */
export async function telaEditor(raiz, id, parametros) {
  await fecharEditor();
  atual = new Editor(raiz, id);
  await atual.iniciar(parametros);
}

class Editor {
  constructor(raiz, id) {
    this.raiz = raiz;
    this.id = id;
    this.itens = []; // árvore: [{ caminho, pasta, tamanho }]
    this.principal = null;
    this.configProjeto = {};
    this.config = {};
    this.arquivoAtual = null;
    this.estados = new Map(); // caminho -> EditorState (mantém o "desfazer" de cada arquivo)
    this.pendentes = new Map(); // caminho -> temporizador de salvamento
    this.problemas = [];
    this.referencias = { rotulos: [], citacoes: [] };
    this.compilando = false;
    this.pedidoNovaCompilacao = false;
    this.pastasAbertas = new Set(armazenamento.ler(`pastas:${id}`, []));
    this.limpezas = [];
    // Compartimentos do CodeMirror que mudam com as configurações.
    this.cTema = new Compartment();
    this.cFonte = new Compartment();
    this.cQuebra = new Compartment();
    this.cLinguagem = new Compartment();
    this.cVisual = new Compartment();
  }

  // -------------------------------------------------------------------------
  // Montagem da tela
  // -------------------------------------------------------------------------

  async iniciar(parametros) {
    // Revisões da Documentação técnica (id "doc:<documento>:<revisão>") aparecem
    // como "Documento - Rev. 01" e o botão "casa" volta para a tela do documento.
    this.revisao = separarIdRevisao(this.id);
    const nomeTela = nomeExibicao(this.id);
    const voltar = this.revisao ? `#/documentacao/${encodeURIComponent(this.revisao.documento)}` : "#/";
    document.title = `${nomeTela} – Eng LaTeX`;
    this.raiz.innerHTML = `
      <div class="tela-editor">
        <header class="barra-editor">
          <button class="botao-topo" id="bt-menu" title="Menu">${icone("menu")} Menu</button>
          <a class="botao-topo" href="${voltar}" title="${this.revisao ? "Voltar às revisões do documento" : "Voltar aos projetos"}">${icone("casa")}</a>
          <div class="nome-projeto" id="nome-projeto" title="${this.revisao ? "Revisão de documento técnico (dados na aba Documentação técnica)" : "Clique para renomear"}">${esc(nomeTela)}</div>
          <div class="espaco"></div>
          <div class="alternar-modo" title="Modo de edição">
            <button id="bt-modo-codigo" class="ativo">Código</button><button id="bt-modo-visual">Visual</button>
          </div>
          <button class="botao-topo" id="bt-historico" title="Histórico de versões">${icone("recompilar")} Histórico</button>
          <button class="botao-topo destaque" id="bt-variaveis" title="Tabela de variáveis do documento">{x} Variáveis</button>
          <button class="botao-topo" id="bt-config" title="Configurações">${icone("config")}</button>
        </header>
        <div class="area-editor">
          <aside class="lateral" id="lateral">
            <div class="lateral-barra">
              <span>Arquivos</span>
              <div>
                <button class="botao-icone" id="bt-novo-arquivo" title="Novo arquivo">${icone("novoArquivo")}</button>
                <button class="botao-icone" id="bt-nova-pasta" title="Nova pasta">${icone("novaPasta")}</button>
                <button class="botao-icone" id="bt-enviar" title="Enviar arquivos (imagens, .bib...)">${icone("enviar")}</button>
              </div>
            </div>
            <div class="arvore" id="arvore" tabindex="0"></div>
            <div class="divisor-h" id="divisor-estrutura"></div>
            <div class="lateral-barra"><span>Estrutura</span></div>
            <div class="estrutura" id="estrutura"></div>
          </aside>
          <div class="divisor" data-painel="lateral"></div>
          <section class="painel-codigo" id="painel-codigo">
            <div class="barra-arquivo">
              <span id="caminho-arquivo"></span>
              <span class="espaco"></span>
              <span id="status-salvo" class="status-salvo"></span>
            </div>
            <div class="barra-ferramentas" id="barra-ferramentas">
              <button data-ferr="negrito" title="Negrito (Ctrl+B)"><b>B</b></button>
              <button data-ferr="italico" title="Itálico (Ctrl+I)"><i>I</i></button>
              <span class="sep"></span>
              <button data-ferr="secao" title="Inserir seção ou parágrafo">§ Seção</button>
              <button data-ferr="lista" title="Inserir lista">≡ Lista</button>
              <span class="sep"></span>
              <button data-ferr="equacao" title="Inserir equação">√x Equação</button>
              <button data-ferr="simbolos" title="Paleta de símbolos">Ω Símbolos</button>
              <span class="sep"></span>
              <button data-ferr="tabela" title="Inserir ou editar tabela">▦ Tabela</button>
              <button data-ferr="imagem" title="Inserir imagem">🖼 Imagem</button>
              <span class="sep"></span>
              <button data-ferr="referencia" title="Referência cruzada (\\ref)">→ Ref.</button>
              <button data-ferr="citacao" title="Citação (\\cite)">❝ Citação</button>
              <button data-ferr="referencias" title="Gerenciar referências bibliográficas">📚 Referências</button>
              <button data-ferr="nota" title="Nota de rodapé">¹ Nota</button>
            </div>
            <div class="codigo" id="codigo"></div>
            <div class="paleta-simbolos" id="paleta" hidden></div>
            <div class="visualizacao" id="visualizacao" hidden></div>
          </section>
          <div class="divisor divisor-sync" data-painel="pdf">
            <button class="botao-sync" id="bt-ir-pdf" title="Mostrar no PDF a posição do cursor (Ctrl+Alt+→)">${icone("setaDir", 14)}</button>
            <button class="botao-sync" id="bt-ir-codigo" title="Dica: dê dois cliques no PDF para ir ao código">${icone("setaEsq", 14)}</button>
          </div>
          <section class="painel-pdf" id="painel-pdf">
            <div class="barra-pdf">
              <div class="grupo-recompilar">
                <button class="botao-recompilar" id="bt-compilar" title="Recompilar (Ctrl+S ou Ctrl+Enter)">${icone("recompilar")} <span>Recompilar</span></button>
                <button class="botao-recompilar seta" id="bt-compilar-opcoes" title="Opções de compilação">${icone("abaixo", 14)}</button>
              </div>
              <button class="botao-log" id="bt-log" title="Erros, avisos e log completo">${icone("log")} <span id="contagem-log">Logs</span></button>
              <span class="espaco"></span>
              <button class="botao-icone claro" id="bt-zoom-menos" title="Diminuir zoom">${icone("menos")}</button>
              <button class="botao-zoom" id="bt-zoom" title="Opções de zoom">100%</button>
              <button class="botao-icone claro" id="bt-zoom-mais" title="Aumentar zoom">${icone("mais")}</button>
              <button class="botao-icone claro" id="bt-salvar-pdf" title="Salvar PDF como…">${icone("baixar")}</button>
            </div>
            <div class="pdf-rolagem" id="pdf"><div class="pdf-vazio" id="pdf-vazio">Clique em <b>Recompilar</b> para gerar o PDF.</div></div>
            <div class="painel-log" id="painel-log" hidden></div>
            <div class="carregando-pdf" id="carregando" hidden><div class="girando"></div> Compilando…</div>
          </section>
        </div>
      </div>`;

    this.$ = (sel) => this.raiz.querySelector(sel);
    this.configurarDivisores();
    this.configurarBotoes();

    // Dados iniciais.
    try {
      const [cfg] = await Promise.all([api.config(), this.carregarArvore()]);
      this.config = cfg.config;
    } catch (e) {
      aviso(e.message, "erro", 6000);
      location.hash = "#/";
      return;
    }

    // Visualizador de PDF.
    this.pdf = new VisualizadorPdf(this.$("#pdf"), {
      aoDuploClique: (pagina, x, y) => this.irParaCodigo(pagina, x, y),
      aoMudarZoom: (t) => (this.$("#bt-zoom").textContent = t),
    });

    this.criarEditor();
    this.atualizarReferencias();
    this.atualizarBotoesModo();
    montarPaleta(this.$("#paleta"), () => this.view);

    // Abre o último arquivo usado neste projeto (ou o principal).
    const ultimo = armazenamento.ler(`ultimo:${this.id}`, null);
    const abrir = ultimo && this.itens.some((i) => i.caminho === ultimo) ? ultimo : this.principal;
    if (abrir) await this.abrirArquivo(abrir);

    // Mostra o PDF anterior na hora e compila em seguida (como o Overleaf ao abrir).
    this.pdf.carregar(this.urlPdf()).then(() => (this.$("#pdf-vazio").hidden = true)).catch(() => {});
    this.compilar();

    if (parametros.get("variaveis") === "1") setTimeout(() => this.abrirTabelaVariaveis(), 300);

    // Atalhos globais (fora do editor de código também).
    const teclas = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        this.compilar();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.compilar();
      }
    };
    document.addEventListener("keydown", teclas);
    this.limpezas.push(() => document.removeEventListener("keydown", teclas));
  }

  destruir() {
    this.limpezas.forEach((f) => f());
    this.view?.destroy();
    this.pdf?.limpar();
  }

  // -------------------------------------------------------------------------
  // Divisores arrastáveis (larguras guardadas entre sessões)
  // -------------------------------------------------------------------------

  configurarDivisores() {
    const lateral = this.$("#lateral");
    const pdf = this.$("#painel-pdf");
    lateral.style.width = armazenamento.ler("largura:lateral", 230) + "px";
    pdf.style.width = armazenamento.ler("largura:pdf", Math.round(window.innerWidth * 0.42)) + "px";

    this.raiz.querySelectorAll(".divisor").forEach((d) => {
      d.addEventListener("mousedown", (e) => {
        if (e.target.closest("button")) return;
        e.preventDefault();
        const painel = d.dataset.painel === "lateral" ? lateral : pdf;
        const inicioX = e.clientX;
        const inicioL = painel.getBoundingClientRect().width;
        document.body.classList.add("arrastando");
        const mover = (ev) => {
          const dx = ev.clientX - inicioX;
          const nova = d.dataset.painel === "lateral" ? inicioL + dx : inicioL - dx;
          painel.style.width = Math.max(d.dataset.painel === "lateral" ? 150 : 250, Math.min(nova, window.innerWidth - 400)) + "px";
        };
        const soltar = () => {
          document.body.classList.remove("arrastando");
          document.removeEventListener("mousemove", mover);
          document.removeEventListener("mouseup", soltar);
          armazenamento.gravar(`largura:${d.dataset.painel}`, Math.round(painel.getBoundingClientRect().width));
        };
        document.addEventListener("mousemove", mover);
        document.addEventListener("mouseup", soltar);
      });
      // Duplo clique no divisor esconde/mostra o painel.
      d.addEventListener("dblclick", (e) => {
        if (e.target.closest("button")) return;
        const painel = d.dataset.painel === "lateral" ? lateral : pdf;
        painel.classList.toggle("recolhido");
      });
    });

    // Divisor entre árvore de arquivos e estrutura.
    const arvore = this.$("#arvore");
    arvore.style.flexBasis = armazenamento.ler("altura:arvore", 55) + "%";
    this.$("#divisor-estrutura").addEventListener("mousedown", (e) => {
      e.preventDefault();
      const total = lateral.getBoundingClientRect();
      const mover = (ev) => {
        const pct = Math.max(15, Math.min(85, ((ev.clientY - total.top) / total.height) * 100));
        arvore.style.flexBasis = pct + "%";
      };
      const soltar = () => {
        document.removeEventListener("mousemove", mover);
        document.removeEventListener("mouseup", soltar);
        armazenamento.gravar("altura:arvore", parseFloat(arvore.style.flexBasis));
      };
      document.addEventListener("mousemove", mover);
      document.addEventListener("mouseup", soltar);
    });
  }

  // -------------------------------------------------------------------------
  // Botões
  // -------------------------------------------------------------------------

  configurarBotoes() {
    this.$("#bt-menu").onclick = (e) => this.abrirMenu(e.currentTarget);
    this.$("#bt-config").onclick = async () => {
      const nova = await abrirConfiguracoes();
      if (nova) this.aplicarConfig(nova);
    };
    this.$("#nome-projeto").onclick = () => this.renomearProjeto();
    this.$("#bt-variaveis").onclick = () => this.abrirTabelaVariaveis();
    this.$("#bt-historico").onclick = () => this.abrirHistorico();
    this.$("#bt-modo-codigo").onclick = () => this.definirModoVisual(false);
    this.$("#bt-modo-visual").onclick = () => this.definirModoVisual(true);
    this.raiz.querySelectorAll("[data-ferr]").forEach((b) => {
      b.onmousedown = (e) => e.preventDefault(); // não tira o foco do editor
      b.onclick = () => this.ferramenta(b.dataset.ferr);
    });
    this.$("#bt-compilar").onclick = () => this.compilar();
    this.$("#bt-compilar-opcoes").onclick = (e) => this.menuCompilacao(e.currentTarget);
    this.$("#bt-log").onclick = () => this.alternarLog();
    this.$("#bt-zoom-menos").onclick = () => this.pdf.definirZoom(this.pdf.escala / 1.15);
    this.$("#bt-zoom-mais").onclick = () => this.pdf.definirZoom(this.pdf.escala * 1.15);
    this.$("#bt-zoom").onclick = (e) =>
      menuAbaixo(e.currentTarget, [
        { texto: "Ajustar à largura", icone: "ajustar", acao: () => this.pdf.definirZoom("largura") },
        { texto: "Página inteira", icone: "ajustar", acao: () => this.pdf.definirZoom("pagina") },
        "-",
        ...[0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((z) => ({ texto: `${z * 100}%`, acao: () => this.pdf.definirZoom(z) })),
      ]);
    this.$("#bt-salvar-pdf").onclick = () => this.salvarPdf();
    this.$("#bt-ir-pdf").onclick = () => this.irParaPdf();
    this.$("#bt-ir-codigo").onclick = () => aviso("Dê dois cliques num ponto do PDF para ir à linha correspondente no código.", "info", 4500);
    this.$("#bt-novo-arquivo").onclick = () => this.novoItem(false, this.pastaSelecionada());
    this.$("#bt-nova-pasta").onclick = () => this.novoItem(true, this.pastaSelecionada());
    this.$("#bt-enviar").onclick = () => this.enviarArquivos(this.pastaSelecionada());

    // Arrastar arquivos do Windows Explorer para a árvore.
    const arvore = this.$("#arvore");
    arvore.addEventListener("dragover", (e) => {
      if (e.dataTransfer.types.includes("Files")) {
        e.preventDefault();
        arvore.classList.add("soltar-aqui");
      }
    });
    arvore.addEventListener("dragleave", () => arvore.classList.remove("soltar-aqui"));
    arvore.addEventListener("drop", (e) => {
      arvore.classList.remove("soltar-aqui");
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      const destino = e.target.closest("[data-pasta]")?.dataset.caminho ?? "";
      this.enviarArquivos(destino, [...e.dataTransfer.files]);
    });
  }

  // -------------------------------------------------------------------------
  // Árvore de arquivos
  // -------------------------------------------------------------------------

  async carregarArvore() {
    const r = await api.arvore(this.id);
    this.itens = r.itens;
    this.principal = r.principal;
    this.configProjeto = r.config;
    this.variaveisIncluidas = r.variaveis_incluidas;
    this.desenharArvore();
    this.$("#bt-variaveis").textContent = `{x} Variáveis${this.configProjeto.variaveis?.length ? ` (${this.configProjeto.variaveis.length})` : ""}`;
  }

  /** Pasta onde criar itens novos: a do arquivo aberto (ou a raiz). */
  pastaSelecionada() {
    const sel = this.$("#arvore .item.selecionado");
    if (sel?.dataset.pasta !== undefined) return sel.dataset.caminho;
    return this.arquivoAtual ? pastaDe(this.arquivoAtual) : "";
  }

  desenharArvore() {
    const arvore = this.$("#arvore");
    // Monta a estrutura de pastas a partir da lista plana.
    const filhos = new Map([["", []]]);
    for (const it of this.itens) {
      if (it.pasta) filhos.set(it.caminho, []);
    }
    for (const it of this.itens) {
      const pai = pastaDe(it.caminho);
      (filhos.get(pai) || filhos.get("")).push(it);
    }
    // Pastas primeiro, depois arquivos (ordem alfabética).
    for (const lista of filhos.values()) {
      lista.sort((a, b) => (a.pasta === b.pasta ? nomeDe(a.caminho).localeCompare(nomeDe(b.caminho), "pt-BR") : a.pasta ? -1 : 1));
    }

    const html = (pasta, nivel) =>
      (filhos.get(pasta) || [])
        .map((it) => {
          const recuo = `style="padding-left:${8 + nivel * 14}px"`;
          if (it.pasta) {
            const aberta = this.pastasAbertas.has(it.caminho);
            return `<div class="item pasta ${aberta ? "aberta" : ""}" data-caminho="${esc(it.caminho)}" data-pasta draggable="true" ${recuo}>
                <span class="seta">${icone("chevron", 12)}</span>${icone("pasta")}<span class="nome">${esc(nomeDe(it.caminho))}</span></div>
              <div class="filhos" ${aberta ? "" : "hidden"}>${html(it.caminho, nivel + 1)}</div>`;
          }
          const principal = it.caminho === this.principal;
          return `<div class="item arquivo ${it.caminho === this.arquivoAtual ? "selecionado" : ""}" data-caminho="${esc(it.caminho)}" draggable="true" ${recuo}>
              <span class="seta"></span>${iconeArquivo(it.caminho)}<span class="nome">${esc(nomeDe(it.caminho))}</span>
              ${principal ? `<span class="marca-principal" title="Arquivo principal">${icone("estrela", 12)}</span>` : ""}</div>`;
        })
        .join("");

    arvore.innerHTML = html("", 0) || '<p class="vazio pequeno">Projeto vazio.</p>';

    arvore.querySelectorAll(".item").forEach((item) => {
      const caminho = item.dataset.caminho;
      const ehPasta = item.dataset.pasta !== undefined;
      item.onclick = () => {
        if (ehPasta) {
          if (this.pastasAbertas.has(caminho)) this.pastasAbertas.delete(caminho);
          else this.pastasAbertas.add(caminho);
          armazenamento.gravar(`pastas:${this.id}`, [...this.pastasAbertas]);
          item.classList.toggle("aberta");
          item.nextElementSibling.hidden = !this.pastasAbertas.has(caminho);
          arvore.querySelectorAll(".item.selecionado").forEach((i) => i.classList.remove("selecionado"));
          item.classList.add("selecionado");
        } else this.abrirArquivo(caminho);
      };
      item.oncontextmenu = (e) => {
        e.preventDefault();
        this.menuItem(e.clientX, e.clientY, caminho, ehPasta);
      };
      // Arrastar itens para dentro de pastas (mover).
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/x-englatex", caminho);
        e.dataTransfer.effectAllowed = "move";
      });
      if (ehPasta) {
        item.addEventListener("dragover", (e) => {
          if (e.dataTransfer.types.includes("text/x-englatex")) {
            e.preventDefault();
            item.classList.add("alvo");
          }
        });
        item.addEventListener("dragleave", () => item.classList.remove("alvo"));
        item.addEventListener("drop", (e) => {
          item.classList.remove("alvo");
          const origem = e.dataTransfer.getData("text/x-englatex");
          if (!origem) return;
          e.preventDefault();
          e.stopPropagation();
          this.moverItem(origem, `${caminho}/${nomeDe(origem)}`);
        });
      }
    });

    // Soltar na área vazia = mover para a raiz.
    arvore.ondragover = (e) => {
      if (e.dataTransfer.types.includes("text/x-englatex")) e.preventDefault();
    };
    arvore.ondrop = (e) => {
      const origem = e.dataTransfer.getData("text/x-englatex");
      if (origem && !e.target.closest("[data-pasta]") && pastaDe(origem) !== "") {
        e.preventDefault();
        this.moverItem(origem, nomeDe(origem));
      }
    };
  }

  /** Menu de contexto (botão direito) de um item da árvore. */
  menuItem(x, y, caminho, ehPasta) {
    const itens = [];
    if (ehPasta) {
      itens.push(
        { texto: "Novo arquivo aqui", icone: "novoArquivo", acao: () => this.novoItem(false, caminho) },
        { texto: "Nova pasta aqui", icone: "novaPasta", acao: () => this.novoItem(true, caminho) },
        { texto: "Enviar arquivos aqui", icone: "enviar", acao: () => this.enviarArquivos(caminho) },
        "-",
      );
    } else if (extensao(caminho) === "tex" && caminho !== this.principal) {
      itens.push({ texto: "Definir como arquivo principal", icone: "estrela", acao: () => this.definirPrincipal(caminho) }, "-");
    }
    itens.push(
      { texto: "Renomear", icone: "lapis", acao: () => this.renomearItem(caminho) },
      { texto: "Excluir", icone: "lixeira", perigo: true, acao: () => this.excluirItem(caminho, ehPasta) },
    );
    menuContexto(x, y, itens);
  }

  async novoItem(pasta, dentro) {
    const nome = await perguntar(pasta ? "Nova pasta" : "Novo arquivo", "Nome", pasta ? "imagens" : "capitulo.tex", "Criar", !pasta);
    if (!nome) return;
    const caminho = dentro ? `${dentro}/${nome}` : nome;
    try {
      await api.criarItem(this.id, caminho, pasta);
      if (dentro) this.pastasAbertas.add(dentro);
      await this.carregarArvore();
      if (!pasta) this.abrirArquivo(caminho);
    } catch (e) {
      aviso(e.message, "erro");
    }
  }

  async renomearItem(caminho) {
    const novo = await perguntar("Renomear", "Novo nome", nomeDe(caminho), "Renomear", true);
    if (!novo || novo === nomeDe(caminho)) return;
    const pasta = pastaDe(caminho);
    await this.moverItem(caminho, pasta ? `${pasta}/${novo}` : novo);
  }

  async moverItem(de, para) {
    if (de === para) return;
    try {
      await this.salvarTudo();
      await api.moverItem(this.id, de, para);
      // Atualiza o estado guardado do arquivo (e de arquivos dentro da pasta movida).
      for (const [c, estado] of [...this.estados]) {
        if (c === de || c.startsWith(de + "/")) {
          this.estados.delete(c);
          this.estados.set(para + c.slice(de.length), estado);
        }
      }
      if (this.arquivoAtual && (this.arquivoAtual === de || this.arquivoAtual.startsWith(de + "/"))) {
        this.arquivoAtual = para + this.arquivoAtual.slice(de.length);
        this.$("#caminho-arquivo").textContent = this.arquivoAtual;
      }
      await this.carregarArvore();
    } catch (e) {
      aviso(e.message, "erro");
    }
  }

  async excluirItem(caminho, ehPasta) {
    const ok = await confirmar("Excluir", `Excluir ${ehPasta ? "a pasta" : "o arquivo"} <b>${esc(caminho)}</b>${ehPasta ? " e todo o conteúdo" : ""}? Esta ação não pode ser desfeita.`, "Excluir", true);
    if (!ok) return;
    try {
      clearTimeout(this.pendentes.get(caminho));
      this.pendentes.delete(caminho);
      await api.excluirItem(this.id, caminho);
      for (const c of [...this.estados.keys()]) if (c === caminho || c.startsWith(caminho + "/")) this.estados.delete(c);
      const eraAtual = this.arquivoAtual && (this.arquivoAtual === caminho || this.arquivoAtual.startsWith(caminho + "/"));
      await this.carregarArvore();
      if (eraAtual) {
        this.arquivoAtual = null;
        if (this.principal) this.abrirArquivo(this.principal);
      }
    } catch (e) {
      aviso(e.message, "erro");
    }
  }

  /** Envia arquivos do computador para o projeto (imagens, .bib, .tex...). */
  async enviarArquivos(pasta, arquivos) {
    arquivos = arquivos || (await escolherArquivos());
    if (!arquivos.length) return;
    let enviados = 0;
    for (const a of arquivos) {
      const destino = pasta ? `${pasta}/${a.name}` : a.name;
      if (this.itens.some((i) => i.caminho === destino) && !(await confirmar("Substituir arquivo", `<b>${esc(destino)}</b> já existe. Substituir?`, "Substituir"))) continue;
      try {
        await api.gravarArquivo(this.id, destino, a);
        this.estados.delete(destino);
        enviados++;
      } catch (e) {
        aviso(`${a.name}: ${e.message}`, "erro");
      }
    }
    if (pasta) this.pastasAbertas.add(pasta);
    await this.carregarArvore();
    if (enviados) aviso(`${enviados} arquivo(s) enviado(s).`, "sucesso");
  }

  async definirPrincipal(caminho) {
    try {
      this.configProjeto.arquivo_principal = caminho;
      await api.configProjeto(this.id, this.configProjeto);
      await this.carregarArvore();
      aviso(`${caminho} agora é o arquivo principal.`, "sucesso");
      this.compilar();
    } catch (e) {
      aviso(e.message, "erro");
    }
  }

  async renomearProjeto() {
    // Revisão de documento técnico: código e nome são alterados na aba Documentação técnica.
    if (this.revisao) {
      await this.salvarTudo();
      location.hash = `#/documentacao/${encodeURIComponent(this.revisao.documento)}`;
      return;
    }
    const nome = await perguntar("Renomear projeto", "Novo nome", this.id, "Renomear");
    if (!nome || nome === this.id) return;
    try {
      await this.salvarTudo();
      const r = await api.renomearProjeto(this.id, nome);
      location.hash = `#/p/${encodeURIComponent(r.id)}`;
    } catch (e) {
      aviso(e.message, "erro");
    }
  }

  // -------------------------------------------------------------------------
  // Editor de código
  // -------------------------------------------------------------------------

  /** Idioma do corretor para este projeto. */
  idioma() {
    return this.configProjeto.idioma || this.config.idioma || "pt_BR";
  }

  /** Extensões comuns a todos os arquivos de texto. */
  extensoes(ehLatex) {
    return [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      indentUnit.of("  "),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      search({ top: true }),
      lintGutter(),
      EditorState.phrases.of(frasesEditor(FRASES)),
      this.cLinguagem.of(ehLatex ? [linguagemLatex, dadosLatex] : []),
      this.cTema.of(this.config.tema === "escuro" ? oneDark : []),
      this.cFonte.of(EditorView.theme({ "&": { fontSize: `${this.config.tamanho_fonte || 14}px` } })),
      this.cQuebra.of(this.config.quebrar_linhas ? EditorView.lineWrapping : []),
      // O corretor próprio substitui o do WebView2.
      EditorView.contentAttributes.of({ spellcheck: "false", autocorrect: "off", autocapitalize: "off" }),
      autocompletion({
        override: [fonteAutocompletar(() => this.contextoAutocompletar())],
        icons: false,
        activateOnTyping: true,
      }),
      ehLatex ? corretorOrtografico({ idioma: () => this.idioma(), extras: () => this.configProjeto.idiomas_extras || [], ativo: () => this.config.corretor !== false }) : [],
      ehLatex ? this.dicaVariaveis() : [],
      ehLatex ? previaFormulas(() => this.configProjeto.variaveis || []) : [],
      this.cVisual.of(ehLatex && this.config.modo_visual ? this.extensaoVisual() : []),
      // Botão direito: menu próprio com "Inserir ..." (depois do corretor, que tem prioridade nas palavras sublinhadas).
      EditorView.domEventHandlers({
        contextmenu: (e, view) => {
          e.preventDefault();
          const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
          // Clique fora da seleção: move o cursor para onde clicou.
          if (pos != null) {
            const sel = view.state.selection.main;
            if (pos < sel.from || pos > sel.to) view.dispatch({ selection: { anchor: pos } });
          }
          this.menuBotaoDireito(e.clientX, e.clientY);
          return true;
        },
      }),
      keymap.of([
        { key: "Mod-s", run: () => (this.compilar(), true) },
        { key: "Mod-Enter", run: () => (this.compilar(), true) },
        { key: "Mod-b", run: envolverCom("textbf") },
        { key: "Mod-i", run: envolverCom("textit") },
        { key: "Mod-Alt-ArrowRight", run: () => (this.irParaPdf(), true) },
        { key: "Mod-g", run: gotoLine },
        indentWithTab,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
      ]),
      EditorView.updateListener.of((u) => {
        if (u.docChanged && this.arquivoAtual) {
          this.agendarSalvamento(this.arquivoAtual);
          this.agendarEstrutura();
        }
      }),
    ];
  }

  /** Passar o mouse sobre \var{nome} mostra o valor da variável. */
  dicaVariaveis() {
    return hoverTooltip((view, pos) => {
      const linha = view.state.doc.lineAt(pos);
      const re = /\\var\{([A-Za-z0-9_-]+)\}/g;
      let m;
      while ((m = re.exec(linha.text))) {
        const de = linha.from + m.index;
        const ate = de + m[0].length;
        if (pos >= de && pos <= ate) {
          const v = (this.configProjeto.variaveis || []).find((x) => x.nome === m[1]);
          return {
            pos: de,
            end: ate,
            above: true,
            create: () => {
              const dom = document.createElement("div");
              dom.className = "dica-variavel";
              dom.innerHTML = v
                ? `<b>${esc(v.nome)}</b> = ${esc(v.valor) || "<i>(vazio)</i>"}${v.descricao ? `<br><small>${esc(v.descricao)}</small>` : ""}`
                : `<b>${esc(m[1])}</b>: variável não definida. Abra <b>Variáveis</b> para criar.`;
              return { dom };
            },
          };
        }
      }
      return null;
    });
  }

  /** Dados para o autocompletar: rótulos, citações, arquivos e variáveis. */
  contextoAutocompletar() {
    // Rótulos do arquivo aberto (atualizados na hora) + os do projeto todo.
    const texto = this.view?.state.doc.toString() || "";
    const locais = [...texto.matchAll(/\\label\{([^}]+)\}/g)].map((m) => m[1]);
    return {
      rotulos: [...new Set([...locais, ...this.referencias.rotulos])],
      citacoes: this.referencias.citacoes,
      arquivos: this.itens.filter((i) => !i.pasta).map((i) => i.caminho),
      variaveis: this.configProjeto.variaveis || [],
    };
  }

  async atualizarReferencias() {
    try {
      this.referencias = await api.referencias(this.id);
    } catch {
      /* não essencial */
    }
  }

  criarEditor() {
    this.view = new EditorView({
      state: EditorState.create({ doc: "", extensions: this.extensoes(true) }),
      parent: this.$("#codigo"),
    });
  }

  /** Aplica mudanças das configurações gerais sem recarregar a tela. */
  aplicarConfig(nova) {
    this.config = nova;
    this.view.dispatch({
      effects: [
        this.cTema.reconfigure(nova.tema === "escuro" ? oneDark : []),
        this.cFonte.reconfigure(EditorView.theme({ "&": { fontSize: `${nova.tamanho_fonte}px` } })),
        this.cQuebra.reconfigure(nova.quebrar_linhas ? EditorView.lineWrapping : []),
        reverificar.of(null),
      ],
    });
    // Os estados guardados de outros arquivos são recriados com a configuração nova.
    for (const c of [...this.estados.keys()]) if (c !== this.arquivoAtual) this.estados.delete(c);
  }

  /** Abre um arquivo: texto no editor; imagem/PDF numa visualização. */
  async abrirArquivo(caminho, linha) {
    if (this.arquivoAtual === caminho) {
      if (linha) this.irParaLinha(linha);
      return;
    }
    // Guarda o estado (texto, cursor, desfazer) do arquivo que estava aberto.
    if (this.arquivoAtual && this.estados.has(this.arquivoAtual)) this.estados.set(this.arquivoAtual, this.view.state);

    const ext = extensao(caminho);
    const visual = this.$("#visualizacao");
    const codigo = this.$("#codigo");

    if (EXT_IMAGEM.has(ext) || ext === "pdf") {
      this.arquivoAtual = caminho;
      const url = `/api/p/${encodeURIComponent(this.id)}/arquivo?caminho=${encodeURIComponent(caminho)}&t=${Date.now()}`;
      visual.innerHTML = ext === "pdf" ? `<embed src="${url}" type="application/pdf">` : `<img src="${url}" alt="${esc(caminho)}">`;
      visual.hidden = false;
      codigo.hidden = true;
      this.posAbrir(caminho);
      return;
    }

    try {
      let estado = this.estados.get(caminho);
      if (!estado) {
        const bytes = await api.lerArquivo(this.id, caminho);
        const texto = this.decodificar(bytes, caminho);
        if (texto === null) {
          // Binário desconhecido: não abre no editor.
          this.arquivoAtual = caminho;
          visual.innerHTML = `<div class="vazio">Este arquivo não é texto e não pode ser editado aqui.</div>`;
          visual.hidden = false;
          codigo.hidden = true;
          this.posAbrir(caminho);
          return;
        }
        const ehLatex = ["tex", "sty", "cls", "ltx", "bib", "dtx", "tikz"].includes(ext);
        estado = EditorState.create({ doc: texto, extensions: this.extensoes(ehLatex) });
        this.estados.set(caminho, estado);
      }
      this.arquivoAtual = caminho;
      this.view.setState(estado);
      visual.hidden = true;
      codigo.hidden = false;
      this.posAbrir(caminho);
      this.mostrarProblemasNoEditor();
      this.atualizarEstrutura();
      if (linha) this.irParaLinha(linha);
      else this.view.focus();
    } catch (e) {
      aviso(`Não foi possível abrir ${caminho}: ${e.message}`, "erro");
    }
  }

  /** Atualizações comuns após abrir um arquivo. */
  posAbrir(caminho) {
    this.$("#caminho-arquivo").textContent = caminho;
    armazenamento.gravar(`ultimo:${this.id}`, caminho);
    this.$("#arvore").querySelectorAll(".item").forEach((i) => i.classList.toggle("selecionado", i.dataset.caminho === caminho));
    // Abre as pastas até o arquivo.
    let p = pastaDe(caminho);
    let mudou = false;
    while (p) {
      if (!this.pastasAbertas.has(p)) {
        this.pastasAbertas.add(p);
        mudou = true;
      }
      p = pastaDe(p);
    }
    if (mudou) this.desenharArvore();
  }

  /**
   * Converte bytes em texto. UTF-8 primeiro; se não for válido, Windows-1252
   * (arquivos antigos). Devolve null se parecer binário.
   */
  decodificar(bytes, caminho) {
    const u8 = new Uint8Array(bytes);
    const ext = extensao(caminho);
    if (!EXT_TEXTO.has(ext) && u8.subarray(0, 8000).includes(0)) return null;
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(u8);
    } catch {
      aviso(`${caminho} não estava em UTF-8; será salvo em UTF-8.`, "info", 5000);
      return new TextDecoder("windows-1252").decode(u8);
    }
  }

  irParaLinha(linha, coluna = 0) {
    const doc = this.view.state.doc;
    const l = doc.line(Math.max(1, Math.min(linha, doc.lines)));
    const pos = Math.min(l.from + coluna, l.to);
    this.view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: "center" }) });
    this.view.focus();
  }

  /** Insere texto na posição do cursor. */
  inserirNoCursor(texto) {
    if (this.$("#codigo").hidden) return aviso("Abra um arquivo .tex para inserir.", "erro");
    const { from, to } = this.view.state.selection.main;
    this.view.dispatch({ changes: { from, to, insert: texto }, selection: { anchor: from + texto.length } });
  }

  // -------------------------------------------------------------------------
  // Modo visual
  // -------------------------------------------------------------------------

  /** Extensão do modo visual com acesso aos dados do projeto. */
  extensaoVisual() {
    return modoVisual({
      variaveis: () => this.configProjeto.variaveis || [],
      urlArquivo: (c) => `/api/p/${encodeURIComponent(this.id)}/arquivo?caminho=${encodeURIComponent(this.resolverImagem(c))}`,
      editarTabela: (view, pos) => {
        view.dispatch({ selection: { anchor: pos } });
        this.ferramenta("tabela");
      },
    });
  }

  /** \includegraphics{foto} pode omitir a extensão: procura o arquivo real no projeto. */
  resolverImagem(c) {
    if (this.itens.some((i) => i.caminho === c)) return c;
    const achado = this.itens.find((i) => !i.pasta && i.caminho.replace(/\.[^.]+$/, "") === c);
    return achado ? achado.caminho : c;
  }

  /** Liga/desliga o modo visual (a escolha fica salva nas configurações). */
  definirModoVisual(ligar) {
    this.config.modo_visual = ligar;
    api.salvarConfig(this.config).catch(() => {});
    const ehLatex = ["tex", "ltx"].includes(extensao(this.arquivoAtual || ""));
    this.view.dispatch({ effects: this.cVisual.reconfigure(ligar && ehLatex ? this.extensaoVisual() : []) });
    // Estados guardados de outros arquivos são recriados ao abrir (com o modo novo).
    for (const c of [...this.estados.keys()]) if (c !== this.arquivoAtual) this.estados.delete(c);
    this.atualizarBotoesModo();
  }

  atualizarBotoesModo() {
    this.$("#bt-modo-codigo").classList.toggle("ativo", !this.config.modo_visual);
    this.$("#bt-modo-visual").classList.toggle("ativo", !!this.config.modo_visual);
  }

  // -------------------------------------------------------------------------
  // Barra de ferramentas, botão direito e janelas de inserção
  // -------------------------------------------------------------------------

  /** Executa um botão da barra de ferramentas (ou item do botão direito). */
  async ferramenta(nome) {
    if (this.$("#codigo").hidden && nome !== "simbolos") return aviso("Abra um arquivo .tex para inserir.", "erro");
    const view = this.view;
    const texto = view.state.doc.toString();
    const pos = view.state.selection.main.head;
    let r = null;
    switch (nome) {
      case "negrito": return envolverCom("textbf")(view);
      case "italico": return envolverCom("textit")(view);
      case "simbolos": {
        const p = this.$("#paleta");
        p.hidden = !p.hidden;
        this.raiz.querySelector('[data-ferr="simbolos"]').classList.toggle("ativo", !p.hidden);
        return;
      }
      case "secao": r = await inserirSecao(); break;
      case "lista": r = await inserirLista(); break;
      case "equacao": r = await inserirEquacao(this.configProjeto.variaveis || []); break;
      case "nota": r = await inserirNota(); break;
      case "referencia": r = await inserirReferencia(this.contextoAutocompletar().rotulos); break;
      case "citacao":
        // Sem referências cadastradas: abre o gerenciador para cadastrar.
        if (!this.referencias.citacoes.length) return this.abrirGerenciadorReferencias();
        r = await inserirCitacao(this.referencias.citacoes);
        break;
      case "referencias": return this.abrirGerenciadorReferencias();
      case "imagem":
        r = await inserirImagem(
          this.itens.filter((i) => !i.pasta && /\.(png|jpe?g|pdf|eps|gif|bmp|svg)$/i.test(i.caminho)).map((i) => i.caminho),
          async (arquivos) => {
            // Imagens enviadas por aqui vão para a pasta "imagens".
            const enviados = [];
            for (const a of arquivos) {
              const destino = `imagens/${a.name}`;
              await api.gravarArquivo(this.id, destino, a);
              enviados.push(destino);
            }
            await this.carregarArvore();
            return enviados;
          },
          (c) => `/api/p/${encodeURIComponent(this.id)}/arquivo?caminho=${encodeURIComponent(c)}`,
        );
        break;
      case "tabela": {
        const existente = tabelaNoCursor(texto, pos);
        const t = await abrirEditorTabela(existente?.dados);
        if (!t) return;
        if (existente) {
          view.dispatch({ changes: { from: existente.de, to: existente.ate, insert: t.latex } });
        } else {
          this.inserirNoCursor(`\n${t.latex}\n`);
        }
        await this.garantirPacotes(t.pacotes);
        view.focus();
        return;
      }
    }
    if (!r) return;
    this.inserirNoCursor(r.texto);
    await this.garantirPacotes(r.pacotes || []);
    view.focus();
  }

  /** Menu do botão direito do mouse no editor. */
  menuBotaoDireito(x, y) {
    const view = this.view;
    const sel = view.state.selection.main;
    const texto = view.state.doc.toString();
    const temSelecao = !sel.empty;
    const naTabela = !!tabelaNoCursor(texto, sel.head);
    const naFormula = !!formulaEm(texto, sel.head);
    const itens = [
      { texto: "Recortar", icone: "copiar", dica: "Ctrl+X", acao: () => this.areaTransferencia("recortar") },
      { texto: "Copiar", icone: "copiar", dica: "Ctrl+C", acao: () => this.areaTransferencia("copiar") },
      { texto: "Colar", icone: "copiar", dica: "Ctrl+V", acao: () => this.areaTransferencia("colar") },
      "-",
    ];
    if (temSelecao) {
      itens.push(
        { texto: "Negrito", dica: "Ctrl+B", acao: () => this.ferramenta("negrito") },
        { texto: "Itálico", dica: "Ctrl+I", acao: () => this.ferramenta("italico") },
        "-",
      );
    }
    if (naTabela) itens.push({ texto: "Editar esta tabela…", icone: "lapis", acao: () => this.ferramenta("tabela") }, "-");
    itens.push(
      { texto: "Inserir seção ou parágrafo…", icone: "tex", acao: () => this.ferramenta("secao") },
      { texto: "Inserir tabela…", icone: "zip", acao: () => this.ferramenta("tabela") },
      { texto: "Inserir imagem…", icone: "imagem", acao: () => this.ferramenta("imagem") },
      { texto: "Inserir lista…", icone: "menu", acao: () => this.ferramenta("lista") },
      { texto: "Inserir equação…", icone: "mais", acao: () => this.ferramenta("equacao") },
      { texto: "Inserir símbolo…", icone: "estrela", acao: () => { if (this.$("#paleta").hidden) this.ferramenta("simbolos"); } },
      { texto: "Inserir nota de rodapé…", icone: "log", acao: () => this.ferramenta("nota") },
      { texto: "Inserir referência cruzada…", icone: "setaDir", acao: () => this.ferramenta("referencia") },
      { texto: "Inserir citação…", icone: "livro", acao: () => this.ferramenta("citacao") },
      { texto: "Gerenciar referências bibliográficas…", icone: "livro", acao: () => this.abrirGerenciadorReferencias() },
    );
    const vars = this.configProjeto.variaveis || [];
    if (vars.length) itens.push({ texto: "Inserir variável…", icone: "lapis", acao: () => this.escolherVariavel() });
    itens.push("-", { texto: "Mostrar no PDF", icone: "setaDir", dica: "Ctrl+Alt+→", acao: () => this.irParaPdf() });
    if (naFormula) itens.push({ texto: "Dica: passe o mouse sobre a fórmula para ver a prévia", acao: () => {} });
    menuContexto(x, y, itens);
  }

  /** Recortar/copiar/colar pelo menu (os atalhos de teclado continuam funcionando). */
  async areaTransferencia(acao) {
    const view = this.view;
    const sel = view.state.selection.main;
    try {
      if (acao === "colar") {
        const t = await navigator.clipboard.readText();
        view.dispatch(view.state.replaceSelection(t));
      } else {
        await navigator.clipboard.writeText(view.state.sliceDoc(sel.from, sel.to));
        if (acao === "recortar") view.dispatch({ changes: { from: sel.from, to: sel.to, insert: "" } });
      }
    } catch {
      aviso(`Use o atalho ${acao === "colar" ? "Ctrl+V" : acao === "copiar" ? "Ctrl+C" : "Ctrl+X"}.`, "info");
    }
    view.focus();
  }

  /** Lista as variáveis para inserir \var{nome}. */
  escolherVariavel() {
    const vars = this.configProjeto.variaveis || [];
    const r = this.view.coordsAtPos(this.view.state.selection.main.head) || { left: 300, bottom: 200 };
    menuContexto(r.left, r.bottom + 4, vars.map((v) => ({ texto: v.nome, dica: v.valor.slice(0, 40), acao: () => this.inserirNoCursor(`\\var{${v.nome}}`) })));
  }

  /**
   * Garante que os pacotes estão no preâmbulo do arquivo principal
   * (acrescenta \usepackage{...} depois do último \usepackage, se faltar).
   */
  async garantirPacotes(pacotes) {
    if (!pacotes?.length || !this.principal) return;
    const aberto = this.arquivoAtual === this.principal ? this.view.state : this.estados.get(this.principal);
    let texto = aberto ? aberto.doc.toString() : new TextDecoder().decode(new Uint8Array(await api.lerArquivo(this.id, this.principal)));
    const inicioDoc = texto.indexOf("\\begin{document}");
    const preambulo = inicioDoc >= 0 ? texto.slice(0, inicioDoc) : texto;
    const faltando = pacotes.filter((p) => !new RegExp(`\\\\(usepackage|RequirePackage)(\\[[^\\]]*\\])?\\{[^}]*\\b${p}\\b[^}]*\\}`).test(preambulo));
    if (!faltando.length) return;
    const linhas = faltando.map((p) => `\\usepackage{${p}}`).join("\n") + "\n";
    // Posição: depois do último \usepackage do preâmbulo (ou do \documentclass).
    const re = /^[^%\n]*\\(usepackage|documentclass)[^\n]*\n/gm;
    let pos = -1, m;
    while ((m = re.exec(preambulo))) pos = m.index + m[0].length;
    if (pos < 0) return;
    if (this.arquivoAtual === this.principal) {
      this.view.dispatch({ changes: { from: pos, insert: linhas } });
    } else {
      texto = texto.slice(0, pos) + linhas + texto.slice(pos);
      this.estados.delete(this.principal);
      await api.gravarArquivo(this.id, this.principal, texto);
    }
    aviso(`Pacote${faltando.length > 1 ? "s" : ""} ${faltando.join(", ")} adicionado${faltando.length > 1 ? "s" : ""} ao preâmbulo.`, "info", 4000);
  }

  // -------------------------------------------------------------------------
  // Referências bibliográficas
  // -------------------------------------------------------------------------

  async abrirGerenciadorReferencias() {
    await this.salvarTudo();
    const bibs = this.itens.filter((i) => !i.pasta && /\.bib$/i.test(i.caminho)).map((i) => i.caminho);
    await abrirReferencias(this.id, bibs, {
      recarregarArvore: () => this.carregarArvore(),
      inserirCitacao: (chaves) => {
        if (this.$("#codigo").hidden) return aviso("Abra um arquivo .tex para inserir a citação.", "info");
        this.inserirNoCursor(`\\cite{${chaves.join(",")}}`);
        this.view.focus();
      },
      garantirBibliografia: (arquivoBib) => this.garantirBibliografia(arquivoBib),
    });
    // O .bib pode ter mudado: descarta a versão em memória e atualiza o autocompletar.
    for (const c of [...this.estados.keys()]) if (/\.bib$/i.test(c) && c !== this.arquivoAtual) this.estados.delete(c);
    if (/\.bib$/i.test(this.arquivoAtual || "")) await this.recarregarDoDisco(this.arquivoAtual);
    this.atualizarReferencias();
  }

  /**
   * Garante que o documento imprime a bibliografia: acrescenta
   * \bibliographystyle{plain} + \bibliography{arquivo} antes do \end{document}
   * (ou acrescenta o arquivo à lista de um \bibliography existente).
   */
  async garantirBibliografia(arquivoBib) {
    if (!this.principal) return;
    const nome = arquivoBib.replace(/\.bib$/i, "");
    const aberto = this.arquivoAtual === this.principal;
    let texto = aberto ? this.view.state.doc.toString() : new TextDecoder().decode(new Uint8Array(await api.lerArquivo(this.id, this.principal)));
    if (/\\addbibresource|\\printbibliography/.test(texto)) return; // biblatex: o usuário controla
    const existente = texto.match(/\\bibliography\{([^}]*)\}/);
    let de, ate, insercao;
    if (existente) {
      const lista = existente[1].split(",").map((s) => s.trim().replace(/\.bib$/i, ""));
      if (lista.includes(nome)) return;
      de = existente.index;
      ate = de + existente[0].length;
      insercao = `\\bibliography{${[...lista.filter(Boolean), nome].join(",")}}`;
    } else {
      const fim = texto.lastIndexOf("\\end{document}");
      if (fim < 0) return;
      // Com abntex2cite o estilo já vem do pacote; senão usa o "plain".
      const estilo = /abntex2cite/.test(texto) ? "" : "\\bibliographystyle{plain}\n";
      de = ate = fim;
      insercao = `${estilo}\\bibliography{${nome}}\n\n`;
    }
    if (aberto) this.view.dispatch({ changes: { from: de, to: ate, insert: insercao } });
    else {
      texto = texto.slice(0, de) + insercao + texto.slice(ate);
      this.estados.delete(this.principal);
      await api.gravarArquivo(this.id, this.principal, texto);
    }
    aviso("Bibliografia incluída no final do documento.", "info", 4000);
  }

  // -------------------------------------------------------------------------
  // Histórico
  // -------------------------------------------------------------------------

  async abrirHistorico() {
    const area = this.raiz.querySelector(".area-editor");
    area.classList.add("com-historico");
    await abrirHistorico(area, this.id, {
      salvarTudo: () => this.salvarTudo(),
      fechar: () => area.classList.remove("com-historico"),
      aposRestaurar: async (caminhos) => {
        // Descarta o que estava na memória e relê do disco.
        const lista = caminhos || [...this.estados.keys()];
        for (const c of lista) this.estados.delete(c);
        await this.carregarArvore();
        const atual = this.arquivoAtual;
        this.arquivoAtual = null;
        if (atual && this.itens.some((i) => i.caminho === atual)) await this.abrirArquivo(atual);
        else if (this.principal) await this.abrirArquivo(this.principal);
        this.compilar();
      },
    }).catch((e) => {
      area.classList.remove("com-historico");
      aviso(e.message, "erro");
    });
  }

  // -------------------------------------------------------------------------
  // Salvamento automático
  // -------------------------------------------------------------------------

  agendarSalvamento(caminho) {
    this.estados.set(caminho, this.view.state);
    clearTimeout(this.pendentes.get(caminho));
    this.$("#status-salvo").textContent = "Editando…";
    this.pendentes.set(caminho, setTimeout(() => this.salvar(caminho), 800));
    // Compilação automática alguns segundos após parar de digitar.
    if (this.config.compilar_automatico) {
      clearTimeout(this.tempoCompilarAuto);
      this.tempoCompilarAuto = setTimeout(() => this.compilar(), 2500);
    }
  }

  async salvar(caminho) {
    clearTimeout(this.pendentes.get(caminho));
    this.pendentes.delete(caminho);
    const estado = caminho === this.arquivoAtual ? this.view.state : this.estados.get(caminho);
    if (!estado) return;
    this.$("#status-salvo").textContent = "Salvando…";
    try {
      await api.gravarArquivo(this.id, caminho, estado.doc.toString());
      if (!this.pendentes.size) this.$("#status-salvo").textContent = "Salvo";
    } catch (e) {
      this.$("#status-salvo").textContent = "Erro ao salvar!";
      aviso(`Erro ao salvar ${caminho}: ${e.message}`, "erro", 8000);
    }
  }

  /** Grava tudo que estiver pendente (antes de compilar, renomear, sair...). */
  async salvarTudo() {
    await Promise.all([...this.pendentes.keys()].map((c) => this.salvar(c)));
  }

  // -------------------------------------------------------------------------
  // Estrutura (seções do arquivo aberto)
  // -------------------------------------------------------------------------

  agendarEstrutura() {
    clearTimeout(this.tempoEstrutura);
    this.tempoEstrutura = setTimeout(() => this.atualizarEstrutura(), 700);
  }

  atualizarEstrutura() {
    const div = this.$("#estrutura");
    const itens = this.$("#codigo").hidden ? [] : estruturaDoTexto(this.view.state.doc.toString());
    if (!itens.length) {
      div.innerHTML = '<p class="vazio pequeno">Sem seções neste arquivo.</p>';
      return;
    }
    div.innerHTML = itens
      .map((i) => `<div class="item-estrutura" data-linha="${i.linha}" style="padding-left:${10 + i.nivel * 12}px" title="Linha ${i.linha}">${esc(i.titulo)}</div>`)
      .join("");
    div.querySelectorAll(".item-estrutura").forEach((d) => (d.onclick = () => this.irParaLinha(Number(d.dataset.linha))));
  }

  // -------------------------------------------------------------------------
  // Compilação
  // -------------------------------------------------------------------------

  urlPdf() {
    return `/api/p/${encodeURIComponent(this.id)}/pdf?t=${Date.now()}`;
  }

  async compilar() {
    // Se já está compilando, compila de novo ao terminar (com o texto mais novo).
    if (this.compilando) {
      this.pedidoNovaCompilacao = true;
      return;
    }
    this.compilando = true;
    const botao = this.$("#bt-compilar");
    botao.classList.add("ocupado");
    botao.querySelector("span").textContent = "Compilando…";
    const aviso_ = setTimeout(() => (this.$("#carregando").hidden = false), 1500);
    try {
      await this.salvarTudo();
      const r = await api.compilar(this.id);
      this.problemas = r.problemas;
      this.ultimoLog = r.log;
      this.ultimoResultado = r;
      this.atualizarContagemLog();
      this.mostrarProblemasNoEditor();
      if (r.pdf) {
        await this.pdf.carregar(this.urlPdf());
        this.$("#pdf-vazio").hidden = true;
      }
      const erros = r.problemas.filter((p) => p.tipo === "erro").length;
      if (!r.pdf || r.falha) this.mostrarLog(true);
      else if (!this.$("#painel-log").hidden) this.mostrarLog(true); // painel já aberto: atualiza
      this.$("#status-salvo").textContent = `Compilado em ${(r.duracao_ms / 1000).toFixed(1)} s${erros ? ` · ${erros} erro(s)` : ""}`;
    } catch (e) {
      aviso(e.message, "erro", 6000);
    } finally {
      clearTimeout(aviso_);
      this.$("#carregando").hidden = true;
      this.compilando = false;
      botao.classList.remove("ocupado");
      botao.querySelector("span").textContent = "Recompilar";
      this.atualizarReferencias();
      if (this.pedidoNovaCompilacao) {
        this.pedidoNovaCompilacao = false;
        this.compilar();
      }
    }
  }

  /** Menu ao lado do botão Recompilar: compilação automática, compilador e motor. */
  menuCompilacao(botao) {
    const cp = this.configProjeto;
    const marca = (v) => (v ? "✓ " : "    ");
    const definir = async (campo, valor) => {
      cp[campo] = valor;
      await api.configProjeto(this.id, cp).catch((e) => aviso(e.message, "erro"));
      this.compilar();
    };
    menuAbaixo(botao, [
      { texto: `${marca(this.config.compilar_automatico)}Compilação automática`, acao: async () => {
        this.config.compilar_automatico = !this.config.compilar_automatico;
        await api.salvarConfig(this.config).catch(() => {});
        aviso(`Compilação automática ${this.config.compilar_automatico ? "ligada" : "desligada"}.`);
      } },
      "-",
      { texto: `${marca(!cp.compilador)}Compilador: padrão das configurações`, acao: () => definir("compilador", "") },
      { texto: `${marca(cp.compilador === "tectonic")}Tectonic (embutido)`, acao: () => definir("compilador", "tectonic") },
      { texto: `${marca(cp.compilador === "latexmk")}latexmk (MiKTeX/TeX Live)`, acao: () => definir("compilador", "latexmk") },
      { texto: `${marca(cp.compilador === "direto")}Motor direto (MiKTeX/TeX Live)`, acao: () => definir("compilador", "direto") },
      "-",
      { texto: `${marca(!cp.motor || cp.motor === "pdflatex")}pdfLaTeX`, acao: () => definir("motor", "pdflatex") },
      { texto: `${marca(cp.motor === "xelatex")}XeLaTeX`, acao: () => definir("motor", "xelatex") },
      { texto: `${marca(cp.motor === "lualatex")}LuaLaTeX`, acao: () => definir("motor", "lualatex") },
    ]);
  }

  /** Erros e avisos do arquivo aberto aparecem sublinhados no código (e na margem). */
  mostrarProblemasNoEditor() {
    if (!this.view || this.$("#codigo").hidden) return;
    const doc = this.view.state.doc;
    const diagnosticos = this.problemas
      .filter((p) => p.linha && (p.arquivo === this.arquivoAtual || (!p.arquivo && this.arquivoAtual === this.principal)))
      .map((p) => {
        const l = doc.line(Math.min(Math.max(1, p.linha), doc.lines));
        return {
          from: l.from,
          to: l.to,
          severity: p.tipo === "erro" ? "error" : p.tipo === "aviso" ? "warning" : "info",
          message: p.mensagem,
        };
      });
    this.view.dispatch(setDiagnostics(this.view.state, diagnosticos));
  }

  atualizarContagemLog() {
    const erros = this.problemas.filter((p) => p.tipo === "erro").length;
    const avisos = this.problemas.filter((p) => p.tipo === "aviso").length;
    const bt = this.$("#bt-log");
    bt.classList.toggle("com-erro", erros > 0);
    bt.classList.toggle("com-aviso", !erros && avisos > 0);
    this.$("#contagem-log").textContent = erros ? `${erros} erro(s)` : avisos ? `${avisos} aviso(s)` : "Logs";
  }

  // -------------------------------------------------------------------------
  // Painel de logs
  // -------------------------------------------------------------------------

  alternarLog() {
    const painel = this.$("#painel-log");
    if (painel.hidden) this.mostrarLog(true);
    else painel.hidden = true;
  }

  mostrarLog(mostrar) {
    const painel = this.$("#painel-log");
    painel.hidden = !mostrar;
    if (!mostrar) return;
    const filtro = this.filtroLog || "todos";
    const r = this.ultimoResultado;
    const contar = (t) => this.problemas.filter((p) => p.tipo === t).length;
    const visiveis = this.problemas.filter((p) => filtro === "todos" || p.tipo === filtro);

    painel.innerHTML = `
      <div class="log-cabecalho">
        <div class="abas-log">
          <button data-filtro="todos" class="${filtro === "todos" ? "ativo" : ""}">Todos (${this.problemas.length})</button>
          <button data-filtro="erro" class="${filtro === "erro" ? "ativo" : ""}">Erros (${contar("erro")})</button>
          <button data-filtro="aviso" class="${filtro === "aviso" ? "ativo" : ""}">Avisos (${contar("aviso")})</button>
          <button data-filtro="caixa" class="${filtro === "caixa" ? "ativo" : ""}">Caixas (${contar("caixa")})</button>
        </div>
        <button class="botao-icone claro" id="bt-fechar-log" title="Fechar">${icone("fechar")}</button>
      </div>
      <div class="log-corpo">
        ${r ? `<p class="log-info">${esc(r.compilador)} · ${(r.duracao_ms / 1000).toFixed(1)} s${r.falha ? ` · <b class="txt-erro">${esc(r.falha)}</b>` : ""}</p>` : ""}
        ${visiveis.length ? "" : '<p class="vazio">Nenhum item. 🎉</p>'}
        ${visiveis
          .map(
            (p, i) => `
          <div class="cartao-log ${p.tipo}" data-i="${i}">
            <div class="cartao-titulo">
              <span class="etiqueta">${p.tipo === "erro" ? "Erro" : p.tipo === "aviso" ? "Aviso" : "Caixa"}</span>
              <span class="local">${esc(p.arquivo || "")}${p.linha ? `, linha ${p.linha}` : ""}</span>
            </div>
            <div class="cartao-msg">${esc(p.mensagem)}</div>
            ${p.contexto ? `<pre class="cartao-contexto">${esc(p.contexto)}</pre>` : ""}
          </div>`,
          )
          .join("")}
        <details class="log-bruto"><summary>Log completo</summary><pre>${esc(this.ultimoLog || "")}</pre></details>
      </div>`;

    painel.querySelector("#bt-fechar-log").onclick = () => (painel.hidden = true);
    painel.querySelectorAll("[data-filtro]").forEach((b) => {
      b.onclick = () => {
        this.filtroLog = b.dataset.filtro;
        this.mostrarLog(true);
      };
    });
    painel.querySelectorAll(".cartao-log").forEach((c) => {
      c.onclick = () => {
        const p = visiveis[Number(c.dataset.i)];
        const arquivo = p.arquivo && this.itens.some((i) => i.caminho === p.arquivo) ? p.arquivo : this.principal;
        if (arquivo) this.abrirArquivo(arquivo, p.linha || 1);
      };
    });
  }

  // -------------------------------------------------------------------------
  // SyncTeX
  // -------------------------------------------------------------------------

  /** Duplo clique no PDF -> linha do código. */
  async irParaCodigo(pagina, x, y) {
    try {
      const pos = await api.synctexInversa(this.id, pagina, x, y);
      await this.abrirArquivo(pos.arquivo, pos.linha);
      if (this.arquivoAtual === pos.arquivo) this.irParaLinha(pos.linha);
    } catch (e) {
      aviso(e.message, "info");
    }
  }

  /** Linha do cursor -> destaque no PDF. */
  async irParaPdf() {
    if (!this.arquivoAtual || this.$("#codigo").hidden) return;
    const linha = this.view.state.doc.lineAt(this.view.state.selection.main.head).number;
    try {
      const rets = await api.synctexDireta(this.id, this.arquivoAtual, linha);
      if (!rets.length) return aviso("Essa linha não aparece no PDF (recompile se necessário).", "info");
      this.pdf.destacar(rets);
    } catch (e) {
      aviso(e.message, "info");
    }
  }

  // -------------------------------------------------------------------------
  // Variáveis
  // -------------------------------------------------------------------------

  async abrirTabelaVariaveis() {
    await this.carregarArvore().catch(() => {});
    const r = await abrirVariaveis(this.id, this.configProjeto.variaveis || [], this.variaveisIncluidas, {
      inserir: (nome) => this.inserirNoCursor(`\\var{${nome}}`),
      recarregarArquivo: () => this.recarregarDoDisco(this.principal),
    });
    if (!r) return;
    try {
      const res = await api.gravarVariaveis(this.id, r.variaveis);
      this.configProjeto.variaveis = r.variaveis;
      await this.carregarArvore();
      if (!res.incluidas && r.variaveis.length) {
        aviso("Lembrete: o arquivo principal ainda não tem \\input{variaveis}.", "info", 6000);
      }
      if (r.compilar) this.compilar();
      else aviso("Variáveis salvas.", "sucesso");
    } catch (e) {
      aviso(e.message, "erro", 6000);
    }
  }

  /** Relê um arquivo do disco (depois de o programa alterá-lo, ex.: incluir \input{variaveis}). */
  async recarregarDoDisco(caminho) {
    if (!caminho) return;
    await this.salvar(caminho).catch(() => {});
    this.estados.delete(caminho);
    if (this.arquivoAtual === caminho) {
      this.arquivoAtual = null;
      await this.abrirArquivo(caminho);
    }
  }

  // -------------------------------------------------------------------------
  // Menu principal (botão "Menu")
  // -------------------------------------------------------------------------

  async abrirMenu(botao) {
    const idiomas = await api.idiomas().catch(() => []);
    const idiomaAtual = this.idioma();
    menuAbaixo(botao, [
      { texto: "Salvar PDF como…", icone: "baixar", acao: () => this.salvarPdf() },
      { texto: "Salvar projeto (.zip)…", icone: "zip", acao: () => this.salvarZip() },
      { texto: "Abrir pasta do projeto", icone: "pasta", acao: () => api.abrirPasta(this.id) },
      "-",
      { texto: "Variáveis do documento", icone: "lapis", acao: () => this.abrirTabelaVariaveis() },
      { texto: "Histórico de versões", icone: "recompilar", acao: () => this.abrirHistorico() },
      { texto: "Contar palavras", icone: "log", acao: () => this.contarPalavras() },
      { texto: "Referências bibliográficas", icone: "livro", acao: () => this.abrirGerenciadorReferencias() },
      { texto: "Salvar como modelo…", icone: "estrela", acao: () => this.salvarModelo() },
      "-",
      { texto: `Arquivo principal: ${this.principal || "(nenhum)"}`, icone: "tex", acao: () => this.escolherPrincipal() },
      { texto: `Idiomas do corretor: ${idiomas.find((i) => i.id === idiomaAtual)?.nome || idiomaAtual}${(this.configProjeto.idiomas_extras || []).length ? ` + ${this.configProjeto.idiomas_extras.length}` : ""}`, icone: "livro", acao: () => this.escolherIdiomas(idiomas) },
      { texto: "Configurações gerais…", icone: "config", acao: async () => {
        const nova = await abrirConfiguracoes();
        if (nova) this.aplicarConfig(nova);
      } },
      { texto: "Atalhos de teclado", icone: "log", acao: () => this.mostrarAtalhos() },
    ]);
  }

  async escolherPrincipal() {
    const tex = this.itens.filter((i) => !i.pasta && extensao(i.caminho) === "tex");
    menuContexto(innerWidth / 2 - 150, 120, tex.map((t) => ({ texto: t.caminho, icone: t.caminho === this.principal ? "estrela" : "tex", acao: () => this.definirPrincipal(t.caminho) })));
  }

  /** Janela "Idiomas do corretor": idioma principal + idiomas aceitos em todo o documento. */
  async escolherIdiomas(idiomas) {
    const instalados = idiomas.filter((i) => i.instalado);
    const extras = new Set(this.configProjeto.idiomas_extras || []);
    const r = await dialogo({
      titulo: "Idiomas do corretor ortográfico",
      largura: 560,
      conteudo: `
        <label class="campo"><span>Idioma principal deste projeto</span>
          <select id="id-principal">${instalados.map((i) => `<option value="${esc(i.id)}" ${i.id === this.idioma() ? "selected" : ""}>${esc(i.nome)}</option>`).join("")}</select></label>
        <p class="campo"><span><b>Aceitar também, em todo o documento:</b></span></p>
        <div class="lista-idiomas">${instalados.map((i) => `<label class="idioma"><span>${esc(i.nome)}</span><input type="checkbox" value="${esc(i.id)}" ${extras.has(i.id) ? "checked" : ""}></label>`).join("")}</div>
        <p class="dica">Trechos marcados no LaTeX são verificados no idioma do trecho, sem precisar marcar nada aqui:
          <code>\\begin{otherlanguage}{english}…\\end{otherlanguage}</code>, <code>\\foreignlanguage{english}{…}</code>,
          <code>\\selectlanguage{english}</code>. Para outros idiomas, baixe o dicionário em Configurações.</p>`,
      botoes: [{ texto: "Baixar idiomas…", valor: "baixar" }, { texto: "Cancelar", valor: null }, { texto: "Salvar", valor: "ok", classe: "primario" }],
      coletar: (j) => ({
        principal: j.querySelector("#id-principal").value,
        extras: [...j.querySelectorAll(".lista-idiomas input:checked")].map((c) => c.value),
      }),
    });
    if (r === "baixar") {
      const nova = await abrirConfiguracoes();
      if (nova) this.aplicarConfig(nova);
      return;
    }
    if (!r) return;
    this.configProjeto.idioma = r.principal;
    this.configProjeto.idiomas_extras = r.extras.filter((x) => x !== r.principal);
    await api.configProjeto(this.id, this.configProjeto).catch((e) => aviso(e.message, "erro"));
    this.view.dispatch({ effects: reverificar.of(null) });
    aviso("Idiomas do corretor atualizados.", "sucesso");
  }

  /** Conta as palavras do projeto (usa o texto aberto no editor, mesmo não salvo). */
  async contarPalavras() {
    if (!this.principal) return aviso("O projeto não tem arquivo principal.", "erro");
    await contarPalavras(this.id, this.principal, (c) => {
      if (c === this.arquivoAtual && !this.$("#codigo").hidden) return this.view.state.doc.toString();
      const e = this.estados.get(c);
      return e ? e.doc.toString() : null;
    });
  }

  async salvarPdf() {
    try {
      const r = await api.salvarPdf(this.id);
      if (r.salvo) aviso(`PDF salvo em ${r.salvo}`, "sucesso", 5000);
    } catch (e) {
      aviso(e.message, "erro");
    }
  }

  async salvarZip() {
    try {
      await this.salvarTudo();
      const r = await api.salvarZip(this.id);
      if (r.salvo) aviso(`Projeto salvo em ${r.salvo}`, "sucesso", 5000);
    } catch (e) {
      aviso(e.message, "erro");
    }
  }

  async salvarModelo() {
    const nome = await perguntar("Salvar como modelo", "Nome do modelo (aparece em Novo projeto)", nomeExibicao(this.id), "Salvar modelo");
    if (!nome) return;
    try {
      await this.salvarTudo();
      await api.salvarComoModelo(this.id, nome);
      aviso(`Modelo "${nome}" salvo. Use em Novo projeto → ${nome}.`, "sucesso", 5000);
    } catch (e) {
      aviso(e.message, "erro");
    }
  }

  mostrarAtalhos() {
    const linhas = [
      ["Ctrl + S  /  Ctrl + Enter", "Salvar e recompilar"],
      ["Ctrl + B  /  Ctrl + I", "Negrito / itálico (\\textbf, \\textit)"],
      ["Ctrl + /", "Comentar / descomentar linhas"],
      ["Ctrl + F  /  Ctrl + H", "Localizar / substituir"],
      ["Ctrl + G", "Ir para a linha"],
      ["Ctrl + Espaço", "Mostrar sugestões de comandos"],
      ["Ctrl + Alt + →", "Mostrar no PDF a linha do cursor"],
      ["Duplo clique no PDF", "Ir para o código correspondente"],
      ["Ctrl + roda do mouse (PDF)", "Zoom"],
      ["Ctrl + Z  /  Ctrl + Y", "Desfazer / refazer"],
      ["Alt + clique", "Vários cursores"],
      ["Botão direito em palavra sublinhada", "Sugestões do corretor"],
      ["Botão direito no texto", "Inserir seção, tabela, imagem, lista, equação…"],
      ["Mouse sobre uma fórmula", "Prévia da fórmula desenhada"],
    ];
    import("./ui.js").then(({ dialogo }) =>
      dialogo({
        titulo: "Atalhos de teclado",
        largura: 560,
        conteudo: `<table class="tabela-atalhos">${linhas.map(([a, b]) => `<tr><td><kbd>${esc(a)}</kbd></td><td>${esc(b)}</td></tr>`).join("")}</table>`,
        botoes: [{ texto: "Fechar", valor: null, classe: "primario" }],
      }),
    );
  }
}
