// Janela "Variáveis do documento".
//
// Uma tabela com Nome | Valor | Tipo | Descrição. No texto do documento as
// variáveis são usadas como \var{nome}; ao compilar, o valor salvo na tabela
// é impresso no PDF. Assim um mesmo documento (ou modelo) serve para vários
// clientes/obras: basta trocar os valores e recompilar.

import { api } from "./api.js";
import { dialogo, esc, el, icone, aviso } from "./ui.js";

/** Regra para nomes: letras sem acento, números, "_" e "-". */
const NOME_VALIDO = /^[A-Za-z0-9_-]+$/;

/**
 * Abre a janela de variáveis.
 * @param {string} id  projeto
 * @param {Array} variaveis  lista atual [{nome, valor, descricao, tipo}]
 * @param {boolean} incluidas  o arquivo principal já tem \input{variaveis}?
 * @param {object} acoes  { inserir(nome) -> insere \var{nome} no cursor }
 * Devolve { variaveis, compilar } ao salvar, ou null se cancelar.
 */
export async function abrirVariaveis(id, variaveis, incluidas, acoes) {
  const linhas = variaveis.map((v) => ({ ...v }));

  const conteudo = `
    <p class="dica">Use no texto como <code>\\var{nome}</code>. Ao compilar, o valor desta tabela vai para o PDF.
      Tipo <b>Texto</b>: caracteres como &amp; % $ _ são tratados sozinhos. Tipo <b>LaTeX</b>: o valor é código (ex.: <code>$\\sigma$</code>, <code>\\textbf{x}</code>).</p>
    <div class="aviso-incluir" ${incluidas ? "hidden" : ""}>
      ${icone("log")} O arquivo principal ainda não carrega as variáveis.
      <button class="botao pequeno" id="bt-incluir">Incluir \\input{variaveis} no preâmbulo</button>
    </div>
    <div class="tabela-var-rolagem" data-sem-enter>
      <table class="tabela-var">
        <thead><tr><th style="width:18%">Nome</th><th>Valor</th><th style="width:10%">Tipo</th><th style="width:22%">Descrição</th><th style="width:72px"></th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
    <button class="botao" id="bt-nova">${icone("mais")} Nova variável</button>`;

  return dialogo({
    titulo: "Variáveis do documento",
    largura: 980,
    conteudo,
    botoes: [
      { texto: "Cancelar", valor: null },
      { texto: "Salvar", valor: "ok", classe: "" },
      { texto: "Salvar e compilar", valor: "ok", classe: "primario" },
    ],
    aoAbrir: (j) => {
      const corpo = j.querySelector("tbody");

      /** Ajusta a altura da caixa de valor ao conteúdo. */
      const ajustar = (t) => {
        t.style.height = "auto";
        t.style.height = Math.min(t.scrollHeight, 160) + "px";
      };

      /** Desenha todas as linhas da tabela. */
      const desenhar = () => {
        corpo.innerHTML = "";
        if (!linhas.length) {
          corpo.innerHTML = `<tr><td colspan="5" class="vazio">Nenhuma variável. Clique em "Nova variável".</td></tr>`;
          return;
        }
        linhas.forEach((v, i) => {
          const tr = el(`
            <tr>
              <td><input class="v-nome" type="text" value="${esc(v.nome)}" spellcheck="false" placeholder="nome"></td>
              <td><textarea class="v-valor" rows="1" placeholder="valor">${esc(v.valor)}</textarea></td>
              <td><select class="v-tipo"><option value="texto" ${v.tipo !== "latex" ? "selected" : ""}>Texto</option><option value="latex" ${v.tipo === "latex" ? "selected" : ""}>LaTeX</option></select></td>
              <td><input class="v-desc" type="text" value="${esc(v.descricao || "")}" placeholder="para que serve"></td>
              <td class="v-acoes">
                <button class="botao-icone" data-inserir title="Inserir \\var{${esc(v.nome)}} no cursor">${icone("setaDir")}</button>
                <button class="botao-icone perigo" data-excluir title="Remover">${icone("lixeira")}</button>
              </td>
            </tr>`);
          const nome = tr.querySelector(".v-nome");
          const valor = tr.querySelector(".v-valor");
          nome.oninput = () => {
            v.nome = nome.value.trim();
            nome.classList.toggle("invalido", !!v.nome && !NOME_VALIDO.test(v.nome));
          };
          valor.oninput = () => {
            v.valor = valor.value;
            ajustar(valor);
          };
          tr.querySelector(".v-tipo").onchange = (e) => (v.tipo = e.target.value);
          tr.querySelector(".v-desc").oninput = (e) => (v.descricao = e.target.value);
          tr.querySelector("[data-excluir]").onclick = () => {
            linhas.splice(i, 1);
            desenhar();
          };
          tr.querySelector("[data-inserir]").onclick = () => {
            if (!NOME_VALIDO.test(v.nome)) return aviso("Dê um nome válido à variável primeiro.", "erro");
            acoes.inserir(v.nome);
            aviso(`\\var{${v.nome}} inserido no editor.`, "sucesso");
          };
          corpo.appendChild(tr);
          requestAnimationFrame(() => ajustar(valor));
        });
      };

      j.querySelector("#bt-nova").onclick = () => {
        linhas.push({ nome: "", valor: "", descricao: "", tipo: "texto" });
        desenhar();
        const ultimas = corpo.querySelectorAll(".v-nome");
        ultimas[ultimas.length - 1]?.focus();
      };
      j.querySelector("#bt-incluir")?.addEventListener("click", async () => {
        try {
          await api.incluirVariaveis(id);
          j.querySelector(".aviso-incluir").hidden = true;
          acoes.recarregarArquivo?.();
          aviso("\\input{variaveis} incluído no arquivo principal.", "sucesso");
        } catch (e) {
          aviso(e.message, "erro", 6000);
        }
      });

      // Os dois botões "Salvar" usam valor "ok"; marcamos qual foi clicado.
      const botoes = j.querySelectorAll(".modal-rodape .botao");
      botoes[1].addEventListener("mousedown", () => (j.dataset.compilar = "0"), true);
      botoes[2].addEventListener("mousedown", () => (j.dataset.compilar = "1"), true);
      j.dataset.compilar = "1"; // Enter = Salvar e compilar
      desenhar();
      // Começa pelo primeiro valor (é o que normalmente se altera).
      const primeiro = corpo.querySelector(".v-valor") || j.querySelector("#bt-nova");
      primeiro.focus();
    },
    coletar: (j) => {
      const limpas = linhas.filter((v) => v.nome || v.valor);
      const invalida = limpas.find((v) => !NOME_VALIDO.test(v.nome));
      if (invalida) {
        aviso(`Nome inválido: "${invalida.nome || "(vazio)"}". Use só letras sem acento, números, _ e -.`, "erro", 6000);
        return undefined;
      }
      const nomes = new Set();
      for (const v of limpas) {
        if (nomes.has(v.nome)) {
          aviso(`A variável "${v.nome}" aparece duas vezes.`, "erro");
          return undefined;
        }
        nomes.add(v.nome);
      }
      return { variaveis: limpas.map((v) => ({ ...v, tipo: v.tipo || "texto" })), compilar: j.dataset.compilar === "1" };
    },
  });
}
