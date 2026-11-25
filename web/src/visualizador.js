// Visualizador de PDF (painel da direita), feito com o pdf.js.
//
// - Desenha as páginas sob demanda (só as visíveis), para ser rápido em documentos grandes;
// - Ao recompilar, mantém a posição de rolagem e o zoom;
// - Zoom: ajustar à largura, página inteira ou porcentagem (Ctrl + roda do mouse também);
// - Duplo clique numa página -> vai para a linha correspondente no código (SyncTeX);
// - destacar() pisca um retângulo amarelo no trecho vindo do código (SyncTeX direto).

import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

/** Espaço entre as páginas e nas bordas, em pixels. */
const MARGEM = 12;

export class VisualizadorPdf {
  /**
   * @param {HTMLElement} recipiente  elemento com rolagem onde as páginas são desenhadas
   * @param {object} eventos  { aoDuploClique(pagina, x, y), aoMudarZoom(texto) }
   */
  constructor(recipiente, eventos = {}) {
    this.recipiente = recipiente;
    this.eventos = eventos;
    this.documento = null;
    this.paginas = []; // { div, largura, altura (em pontos), desenhada, tarefa }
    this.modoZoom = "largura"; // "largura" | "pagina" | número (1 = 100%)
    this.escala = 1;
    this.geracao = 0; // aumenta a cada PDF carregado (descarta desenhos antigos)

    // Desenha as páginas quando ficam visíveis.
    this.observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) this.desenhar(Number(e.target.dataset.pagina));
        }
      },
      { root: recipiente, rootMargin: "600px 0px" },
    );

    // Ajusta o zoom quando o painel muda de tamanho (modo "largura"/"página").
    let espera;
    new ResizeObserver(() => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        if (typeof this.modoZoom === "string") this.aplicarZoom();
      }, 120);
    }).observe(recipiente);

    // Ctrl + roda do mouse = zoom.
    recipiente.addEventListener(
      "wheel",
      (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        this.definirZoom(this.escala * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
      },
      { passive: false },
    );

    // Duplo clique: posição na página em pontos do PDF (origem no canto superior esquerdo).
    recipiente.addEventListener("dblclick", (e) => {
      const div = e.target.closest(".pdf-pagina");
      if (!div) return;
      const r = div.getBoundingClientRect();
      const x = (e.clientX - r.left) / this.escala;
      const y = (e.clientY - r.top) / this.escala;
      this.eventos.aoDuploClique?.(Number(div.dataset.pagina), x, y);
    });
  }

  /** Carrega (ou recarrega) um PDF a partir de uma URL, mantendo rolagem e zoom. */
  async carregar(url) {
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) throw new Error("PDF não encontrado");
    const dados = new Uint8Array(await resp.arrayBuffer());
    const geracao = ++this.geracao;
    const tarefa = pdfjs.getDocument({ data: dados, isEvalSupported: false });
    const doc = await tarefa.promise;
    if (geracao !== this.geracao) {
      tarefa.destroy(); // outro PDF foi pedido nesse meio tempo
      return;
    }

    // Guarda a posição relativa da rolagem para restaurar depois.
    const r = this.recipiente;
    const proporcaoY = r.scrollHeight > r.clientHeight ? r.scrollTop / (r.scrollHeight - r.clientHeight) : 0;
    const proporcaoX = r.scrollWidth > r.clientWidth ? r.scrollLeft / (r.scrollWidth - r.clientWidth) : 0;
    const primeiraVez = !this.documento;

    // Libera a memória do PDF anterior.
    this.tarefaAnterior?.destroy();
    this.tarefaAnterior = tarefa;
    this.documento = doc;

    // Tamanho de cada página (em pontos).
    const tamanhos = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const p = await doc.getPage(i);
      const v = p.getViewport({ scale: 1 });
      tamanhos.push({ largura: v.width, altura: v.height });
    }
    if (geracao !== this.geracao) return;

    // Reaproveita as divs existentes (evita "piscar" a tela ao recompilar).
    while (this.paginas.length > doc.numPages) {
      const p = this.paginas.pop();
      this.observador.unobserve(p.div);
      p.div.remove();
    }
    tamanhos.forEach((t, i) => {
      let p = this.paginas[i];
      if (!p) {
        const div = document.createElement("div");
        div.className = "pdf-pagina";
        div.dataset.pagina = String(i + 1);
        this.recipiente.appendChild(div);
        p = { div };
        this.paginas.push(p);
      }
      Object.assign(p, t, { desenhada: false });
    });

    this.aplicarZoom(false);
    for (const p of this.paginas) {
      this.observador.unobserve(p.div);
      this.observador.observe(p.div);
    }
    if (!primeiraVez) {
      r.scrollTop = proporcaoY * (r.scrollHeight - r.clientHeight);
      r.scrollLeft = proporcaoX * (r.scrollWidth - r.clientWidth);
    }
    // Redesenha as visíveis imediatamente.
    this.desenharVisiveis();
  }

  /** Remove o PDF exibido. */
  limpar() {
    this.geracao++;
    this.tarefaAnterior?.destroy();
    this.tarefaAnterior = null;
    this.documento = null;
    for (const p of this.paginas) p.div.remove();
    this.paginas = [];
  }

  /** Calcula a escala para o modo de zoom atual e redimensiona as páginas. */
  aplicarZoom(redesenhar = true) {
    if (!this.paginas.length) return;
    const larguraUtil = this.recipiente.clientWidth - 2 * MARGEM - 4;
    const alturaUtil = this.recipiente.clientHeight - 2 * MARGEM;
    const maior = this.paginas.reduce((a, p) => (p.largura > a.largura ? p : a), this.paginas[0]);
    if (this.modoZoom === "largura") this.escala = Math.max(0.2, larguraUtil / maior.largura);
    else if (this.modoZoom === "pagina") this.escala = Math.max(0.2, Math.min(larguraUtil / maior.largura, alturaUtil / maior.altura));
    else this.escala = this.modoZoom;

    for (const p of this.paginas) {
      p.div.style.width = `${Math.floor(p.largura * this.escala)}px`;
      p.div.style.height = `${Math.floor(p.altura * this.escala)}px`;
      p.desenhada = false;
    }
    this.eventos.aoMudarZoom?.(`${Math.round(this.escala * 100)}%`);
    if (redesenhar) this.desenharVisiveis();
  }

  /** Define o zoom: "largura", "pagina" ou um número (1 = 100%). */
  definirZoom(modo) {
    const r = this.recipiente;
    const proporcao = r.scrollHeight > r.clientHeight ? r.scrollTop / (r.scrollHeight - r.clientHeight) : 0;
    this.modoZoom = typeof modo === "number" ? Math.min(5, Math.max(0.25, modo)) : modo;
    this.aplicarZoom();
    r.scrollTop = proporcao * (r.scrollHeight - r.clientHeight);
  }

  /** Desenha as páginas que estão na tela agora. */
  desenharVisiveis() {
    const r = this.recipiente.getBoundingClientRect();
    for (const p of this.paginas) {
      const b = p.div.getBoundingClientRect();
      if (b.bottom > r.top - 600 && b.top < r.bottom + 600) this.desenhar(Number(p.div.dataset.pagina));
    }
  }

  /** Desenha uma página num canvas novo e só então troca (sem tela em branco). */
  async desenhar(numero) {
    const p = this.paginas[numero - 1];
    if (!p || p.desenhada || !this.documento) return;
    p.desenhada = true;
    const geracao = this.geracao;
    const escala = this.escala;
    try {
      const pagina = await this.documento.getPage(numero);
      // Resolução extra em telas de alta densidade (nitidez).
      const densidade = window.devicePixelRatio || 1;
      const viewport = pagina.getViewport({ scale: escala * densidade });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      p.tarefa?.cancel();
      p.tarefa = pagina.render({ canvas, viewport });
      await p.tarefa.promise;
      if (geracao !== this.geracao || escala !== this.escala) return;
      p.div.querySelector("canvas")?.remove();
      p.div.prepend(canvas);
    } catch (e) {
      if (e?.name !== "RenderingCancelledException") p.desenhada = false;
    }
  }

  /** Rola até e destaca retângulos vindos do SyncTeX: [{ pagina, x, y, larg, alt }] (em pontos). */
  destacar(retangulos) {
    if (!retangulos.length) return;
    const primeiro = retangulos[0];
    const p = this.paginas[primeiro.pagina - 1];
    if (!p) return;
    const alvoY = p.div.offsetTop + primeiro.y * this.escala - this.recipiente.clientHeight / 3;
    this.recipiente.scrollTo({ top: Math.max(0, alvoY), behavior: "smooth" });
    for (const ret of retangulos) {
      const pag = this.paginas[ret.pagina - 1];
      if (!pag) continue;
      const marca = document.createElement("div");
      marca.className = "pdf-destaque";
      Object.assign(marca.style, {
        left: `${ret.x * this.escala}px`,
        top: `${ret.y * this.escala}px`,
        width: `${Math.max(ret.larg, 4) * this.escala}px`,
        height: `${Math.max(ret.alt, 4) * this.escala}px`,
      });
      pag.div.appendChild(marca);
      setTimeout(() => marca.remove(), 2200);
    }
  }

  /** Número de páginas do documento atual. */
  get totalPaginas() {
    return this.paginas.length;
  }
}
