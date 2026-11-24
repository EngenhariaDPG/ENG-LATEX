// Janela de Configurações gerais: compilador, editor, corretor ortográfico e dicionários.

import { api } from "./api.js";
import { dialogo, esc, aviso, icone } from "./ui.js";
import { IDIOMAS } from "./i18n.js";

/** Lista de opções <option> com a atual selecionada. */
const opcoes = (lista, atual) =>
  lista.map(([v, t]) => `<option value="${esc(v)}" ${v === atual ? "selected" : ""}>${esc(t)}</option>`).join("");

/**
 * Abre a janela de configurações. Devolve a configuração salva (ou null se cancelar).
 */
export async function abrirConfiguracoes() {
  const [{ config, pasta_projetos, versao }, comp, idiomas] = await Promise.all([api.config(), api.compiladores(), api.idiomas()]);

  const linhaComp = (nome, caminho) =>
    `<tr><td>${nome}</td><td>${caminho ? `<span class="ok">✓</span> <small>${esc(caminho)}</small>` : '<span class="nao">não encontrado</span>'}</td></tr>`;

  const conteudo = `
    <div class="config-grade">
      <section>
        <h4>Compilação</h4>
        <label class="campo"><span>Compilador padrão</span>
          <select id="c-compilador">${opcoes(
            [
              ["auto", "Automático (MiKTeX/TeX Live se houver, senão Tectonic)"],
              ["tectonic", "Tectonic (embutido)"],
              ["latexmk", "latexmk (MiKTeX/TeX Live)"],
              ["direto", "pdflatex/xelatex/lualatex direto"],
            ],
            config.compilador_padrao,
          )}</select></label>
        <label class="campo"><span>Motor padrão (MiKTeX/TeX Live)</span>
          <select id="c-motor">${opcoes([["pdflatex", "pdfLaTeX"], ["xelatex", "XeLaTeX"], ["lualatex", "LuaLaTeX"]], config.motor_padrao)}</select></label>
        <label class="campo"><span>Pasta "bin" do MiKTeX/TeX Live (opcional)</span>
          <input id="c-pasta-tex" type="text" value="${esc(config.pasta_tex)}" placeholder="Detectada automaticamente" spellcheck="false"></label>
        <label class="marcar"><input type="checkbox" id="c-auto" ${config.compilar_automatico ? "checked" : ""}> Recompilar automaticamente ao parar de digitar</label>
        <table class="tabela-comp">
          ${linhaComp("Tectonic", comp.tectonic)}
          ${linhaComp("latexmk", comp.latexmk)}
          ${linhaComp("pdflatex", comp.pdflatex)}
          ${linhaComp("xelatex", comp.xelatex)}
          ${linhaComp("lualatex", comp.lualatex)}
          ${linhaComp("bibtex", comp.bibtex)}
          ${linhaComp("biber", comp.biber)}
          ${linhaComp("perl (latexmk no MiKTeX)", comp.perl)}
        </table>
      </section>
      <section>
        <h4>Editor</h4>
        <label class="campo"><span>Idioma da interface</span>
          <select id="c-interface">${opcoes([["", "Automático (idioma do Windows)"], ...Object.entries(IDIOMAS)], config.idioma_interface || "")}</select></label>
        <label class="campo"><span>Tema</span>
          <select id="c-tema">${opcoes([["claro", "Claro"], ["escuro", "Escuro"]], config.tema)}</select></label>
        <label class="campo"><span>Tamanho da fonte</span>
          <input id="c-fonte" type="number" min="9" max="28" value="${config.tamanho_fonte}"></label>
        <label class="marcar"><input type="checkbox" id="c-quebrar" ${config.quebrar_linhas ? "checked" : ""}> Quebrar linhas longas</label>

        <h4>Corretor ortográfico</h4>
        <label class="marcar"><input type="checkbox" id="c-corretor" ${config.corretor ? "checked" : ""}> Sublinhar palavras com erro</label>
        <label class="campo"><span>Idioma padrão (cada projeto pode ter o seu)</span>
          <select id="c-idioma">${opcoes(idiomas.filter((i) => i.instalado).map((i) => [i.id, i.nome]), config.idioma)}</select></label>
        <div class="lista-idiomas">
          ${idiomas
            .map(
              (i) => `<div class="idioma"><span>${esc(i.nome)}</span>
              ${i.instalado ? '<span class="ok">instalado</span>' : `<button class="botao pequeno" data-baixar="${esc(i.id)}">${icone("baixar", 14)} Baixar</button>`}</div>`,
            )
            .join("")}
        </div>
        <p class="dica">Dicionários Hunspell do LibreOffice (download único; depois funcionam offline).
          Palavras adicionadas ficam em Documentos\\EngLaTeX\\dicionario-pessoal.txt.</p>
      </section>
    </div>
    <p class="dica">Projetos em: <code>${esc(pasta_projetos)}</code> · Eng LaTeX ${esc(versao)}</p>`;

  return dialogo({
    titulo: "Configurações",
    largura: 820,
    conteudo,
    botoes: [
      { texto: "Cancelar", valor: null },
      { texto: "Salvar", valor: "ok", classe: "primario" },
    ],
    aoAbrir: (j) => {
      // Botões "Baixar" dos dicionários.
      j.querySelectorAll("[data-baixar]").forEach((b) => {
        b.onclick = async () => {
          b.disabled = true;
          b.textContent = "Baixando…";
          try {
            await api.baixarDicionario(b.dataset.baixar);
            b.replaceWith(Object.assign(document.createElement("span"), { className: "ok", textContent: "instalado" }));
            const nome = idiomas.find((i) => i.id === b.dataset.baixar)?.nome || b.dataset.baixar;
            j.querySelector("#c-idioma").insertAdjacentHTML("beforeend", `<option value="${esc(b.dataset.baixar)}">${esc(nome)}</option>`);
            aviso(`Dicionário ${nome} instalado.`, "sucesso");
          } catch (e) {
            b.disabled = false;
            b.textContent = "Tentar de novo";
            aviso(e.message, "erro", 7000);
          }
        };
      });
    },
    coletar: (j) => {
      const nova = {
        ...config,
        compilador_padrao: j.querySelector("#c-compilador").value,
        motor_padrao: j.querySelector("#c-motor").value,
        pasta_tex: j.querySelector("#c-pasta-tex").value.trim(),
        compilar_automatico: j.querySelector("#c-auto").checked,
        tema: j.querySelector("#c-tema").value,
        tamanho_fonte: Math.min(28, Math.max(9, Number(j.querySelector("#c-fonte").value) || 14)),
        quebrar_linhas: j.querySelector("#c-quebrar").checked,
        corretor: j.querySelector("#c-corretor").checked,
        idioma: j.querySelector("#c-idioma").value || config.idioma,
        idioma_interface: j.querySelector("#c-interface").value,
      };
      // Trocar o idioma da interface exige recarregar a tela.
      if (nova.idioma_interface !== (config.idioma_interface || "")) {
        api.salvarConfig(nova).then(() => location.reload());
        return nova;
      }
      api
        .salvarConfig(nova)
        .then(() => aviso("Configurações salvas.", "sucesso"))
        .catch((e) => aviso(e.message, "erro"));
      return nova;
    },
  });
}
