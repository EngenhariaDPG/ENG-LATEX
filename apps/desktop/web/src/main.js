// Ponto de entrada da interface.
//
// Navegação por "hash" (parte da URL depois do #):
//   #/              -> lista de projetos
//   #/p/<projeto>   -> editor do projeto (aceita ?variaveis=1 para abrir a tabela de variáveis)
//
// A tradução da interface (i18n.js) é ligada antes da primeira tela.

import { telaProjetos } from "./projetos.js";
import { telaEditor, fecharEditor } from "./editor.js";
import { aviso } from "./ui.js";
import { iniciarTraducao } from "./i18n.js";
import { api } from "./api.js";

const raiz = document.getElementById("app");

async function navegar() {
  const hash = decodeURIComponent(location.hash.slice(1) || "/");
  const [caminho, consulta = ""] = hash.split("?");
  const parametros = new URLSearchParams(consulta);
  try {
    if (caminho.startsWith("/p/")) {
      await telaEditor(raiz, caminho.slice(3), parametros);
    } else {
      await fecharEditor();
      await telaProjetos(raiz);
    }
  } catch (e) {
    console.error(e);
    aviso(e.message || String(e), "erro", 8000);
  }
}

window.addEventListener("hashchange", navegar);

// Sem o menu do navegador (Voltar/Recarregar) fora das áreas de texto.
document.addEventListener("contextmenu", (e) => {
  if (!e.target.closest(".cm-content, input, textarea")) e.preventDefault();
});

// Impede que soltar um arquivo fora da árvore faça a janela "navegar" para ele.
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

// Erros inesperados aparecem como aviso em vez de sumirem em silêncio.
window.addEventListener("unhandledrejection", (e) => aviso(String(e.reason?.message || e.reason), "erro", 6000));

// Idioma da interface (lido das configurações) e depois a primeira tela.
api
  .config()
  .then((c) => iniciarTraducao(c.config.idioma_interface))
  .catch(() => iniciarTraducao(""))
  .finally(navegar);
