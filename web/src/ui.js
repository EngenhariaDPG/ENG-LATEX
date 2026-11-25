// Componentes de interface reutilizáveis: ícones, janelas de diálogo,
// avisos rápidos (toasts), menus de contexto e formatação de datas.

// ---------------------------------------------------------------------------
// Ícones (SVG em linha, traço simples no estilo "feather")
// ---------------------------------------------------------------------------

const CAMINHOS = {
  arquivo: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  tex: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  imagem: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  livro: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5V22h16"/>',
  pasta: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  novoArquivo: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/>',
  novaPasta: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M12 11v6M9 14h6"/>',
  enviar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  lixeira: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  lapis: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  copiar: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  casa: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  recompilar: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  setaDir: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  setaEsq: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  fechar: '<path d="M18 6L6 18M6 6l12 12"/>',
  estrela: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  log: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>',
  externo: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>',
  chevron: '<path d="M9 18l6-6-6-6"/>',
  abaixo: '<path d="M6 9l6 6 6-6"/>',
  ajustar: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  zip: '<path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>',
};

/** Devolve o HTML de um ícone. */
export function icone(nome, tamanho = 16) {
  return `<svg class="icone" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CAMINHOS[nome] || ""}</svg>`;
}

/** Ícone adequado para o tipo de arquivo. */
export function iconeArquivo(caminho) {
  const ext = caminho.split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "svg", "bmp", "webp", "eps", "pdf"].includes(ext)) return icone("imagem");
  if (ext === "bib") return icone("livro");
  if (["tex", "sty", "cls", "ltx"].includes(ext)) return icone("tex");
  return icone("arquivo");
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Escapa texto para inserir com segurança em HTML. */
export function esc(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Cria um elemento a partir de HTML. */
export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** "há 5 minutos", "ontem", "12/03/2026"... */
export function dataRelativa(segundos) {
  const diff = Date.now() / 1000 - segundos;
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 2 * 86400) return "ontem";
  if (diff < 7 * 86400) return `há ${Math.floor(diff / 86400)} dias`;
  return new Date(segundos * 1000).toLocaleDateString("pt-BR");
}

/** Leitura/gravação segura no localStorage (pode falhar em alguns contextos). */
export const armazenamento = {
  ler(chave, padrao) {
    try {
      const v = localStorage.getItem(chave);
      return v === null ? padrao : JSON.parse(v);
    } catch {
      return padrao;
    }
  },
  gravar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
      /* sem armazenamento: ignora */
    }
  },
};

// ---------------------------------------------------------------------------
// Avisos rápidos (canto inferior)
// ---------------------------------------------------------------------------

/** Mostra um aviso que some sozinho. tipo: "info", "sucesso" ou "erro". */
export function aviso(texto, tipo = "info", duracao = 3500) {
  let area = document.getElementById("avisos");
  if (!area) {
    area = el('<div id="avisos"></div>');
    document.body.appendChild(area);
  }
  const a = el(`<div class="aviso aviso-${tipo}">${esc(texto)}</div>`);
  area.appendChild(a);
  setTimeout(() => {
    a.classList.add("saindo");
    setTimeout(() => a.remove(), 300);
  }, duracao);
}

// ---------------------------------------------------------------------------
// Janelas de diálogo (substituem prompt/confirm do navegador)
// ---------------------------------------------------------------------------

/**
 * Abre uma janela modal. `conteudo` é HTML; `botoes` é uma lista
 * { texto, valor, classe }. Devolve uma Promise com o valor do botão clicado
 * (ou null se fechar com Esc / clique fora).
 * `aoAbrir(janela)` permite preencher campos; `coletar(janela)` define o valor
 * devolvido quando o botão principal é clicado.
 */
export function dialogo({ titulo, conteudo, botoes, aoAbrir, coletar, largura = 440 }) {
  return new Promise((resolver) => {
    const fundo = el(`
      <div class="modal-fundo">
        <div class="modal" style="width:${largura}px" role="dialog" aria-modal="true">
          <div class="modal-cabecalho"><h3>${esc(titulo)}</h3>
            <button class="botao-icone" data-fechar title="Fechar">${icone("fechar")}</button></div>
          <div class="modal-corpo">${conteudo}</div>
          <div class="modal-rodape"></div>
        </div>
      </div>`);
    const rodape = fundo.querySelector(".modal-rodape");
    const fechar = (valor) => {
      document.removeEventListener("keydown", teclas, true);
      fundo.remove();
      resolver(valor);
    };
    for (const b of botoes) {
      const botao = el(`<button class="botao ${b.classe || ""}">${esc(b.texto)}</button>`);
      botao.onclick = () => {
        if (b.valor === "ok" && coletar) {
          const v = coletar(fundo);
          if (v === undefined) return; // validação falhou
          fechar(v);
        } else fechar(b.valor ?? null);
      };
      rodape.appendChild(botao);
    }
    const teclas = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        fechar(null);
      } else if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "SELECT" && !e.target.closest("[data-sem-enter]")) {
        e.preventDefault();
        rodape.querySelector(".primario")?.click();
      }
    };
    document.addEventListener("keydown", teclas, true);
    fundo.querySelector("[data-fechar]").onclick = () => fechar(null);
    fundo.addEventListener("mousedown", (e) => {
      if (e.target === fundo) fechar(null);
    });
    document.body.appendChild(fundo);
    aoAbrir?.(fundo);
    // Se aoAbrir já colocou o foco em algum campo, respeita.
    if (fundo.contains(document.activeElement)) return;
    const foco = fundo.querySelector("input, select, textarea") || rodape.querySelector(".primario");
    foco?.focus();
    if (foco?.select && foco.dataset.selecionar !== "nao") {
      // Seleciona o nome sem a extensão (como no Overleaf).
      const v = foco.value || "";
      const ponto = v.lastIndexOf(".");
      if (ponto > 0 && foco.dataset.semExtensao === "sim") foco.setSelectionRange(0, ponto);
      else foco.select();
    }
  });
}

/** Pede um texto ao usuário. Devolve o texto ou null. */
export function perguntar(titulo, rotulo, valor = "", textoOk = "Confirmar", semExtensao = false) {
  return dialogo({
    titulo,
    conteudo: `<label class="campo"><span>${esc(rotulo)}</span>
      <input type="text" value="${esc(valor)}" data-sem-extensao="${semExtensao ? "sim" : "nao"}" spellcheck="false"></label>`,
    botoes: [
      { texto: "Cancelar", valor: null },
      { texto: textoOk, valor: "ok", classe: "primario" },
    ],
    coletar: (j) => {
      const v = j.querySelector("input").value.trim();
      return v ? v : undefined;
    },
  });
}

/** Pede confirmação. Devolve true/false. */
export async function confirmar(titulo, mensagem, textoOk = "Confirmar", perigo = false) {
  const r = await dialogo({
    titulo,
    conteudo: `<p>${mensagem}</p>`,
    botoes: [
      { texto: "Cancelar", valor: false },
      { texto: textoOk, valor: true, classe: perigo ? "perigo primario" : "primario" },
    ],
  });
  return r === true;
}

// ---------------------------------------------------------------------------
// Menus suspensos e de contexto
// ---------------------------------------------------------------------------

/**
 * Abre um menu na posição (x, y). `itens` = [{ texto, icone, acao, perigo }] ou "-" (separador).
 */
export function menuContexto(x, y, itens) {
  document.querySelectorAll(".menu-contexto").forEach((m) => m.remove());
  const menu = el('<div class="menu-contexto" role="menu"></div>');
  for (const it of itens) {
    if (it === "-") {
      menu.appendChild(el('<div class="menu-separador"></div>'));
      continue;
    }
    const b = el(`<button class="menu-item ${it.perigo ? "perigo" : ""}" role="menuitem">${it.icone ? icone(it.icone) : '<span class="icone-vazio"></span>'}<span>${esc(it.texto)}</span>${it.dica ? `<small>${esc(it.dica)}</small>` : ""}</button>`);
    b.onclick = () => {
      fechar();
      it.acao();
    };
    menu.appendChild(b);
  }
  document.body.appendChild(menu);
  // Mantém o menu dentro da tela.
  const r = menu.getBoundingClientRect();
  menu.style.left = Math.min(x, innerWidth - r.width - 8) + "px";
  menu.style.top = Math.min(y, innerHeight - r.height - 8) + "px";
  const fechar = () => {
    menu.remove();
    document.removeEventListener("mousedown", fora, true);
    document.removeEventListener("keydown", esc_, true);
  };
  const fora = (e) => {
    if (!menu.contains(e.target)) fechar();
  };
  const esc_ = (e) => {
    if (e.key === "Escape") fechar();
  };
  setTimeout(() => {
    document.addEventListener("mousedown", fora, true);
    document.addEventListener("keydown", esc_, true);
  });
  return menu;
}

/** Abre um menu logo abaixo de um botão. */
export function menuAbaixo(botao, itens) {
  const r = botao.getBoundingClientRect();
  return menuContexto(r.left, r.bottom + 4, itens);
}

/** Abre o seletor de arquivos do sistema e devolve a lista escolhida. */
export function escolherArquivos({ multiplos = true, aceitar = "" } = {}) {
  return new Promise((resolver) => {
    const input = el(`<input type="file" ${multiplos ? "multiple" : ""} accept="${aceitar}" style="display:none">`);
    input.onchange = () => {
      resolver([...input.files]);
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  });
}
