// Contagem de palavras do projeto (Menu → Contar palavras).
//
// Conta só o texto que aparece no PDF: comandos, comentários, fórmulas e o
// preâmbulo ficam de fora (usa o mesmo leitor do corretor ortográfico).
// Segue os \input{} / \include{} a partir do arquivo principal.

import { api } from "./api.js";
import { dialogo, esc } from "./ui.js";
import { encontrarPalavras } from "./ortografia.js";

const decodificar = (b) => new TextDecoder("utf-8").decode(new Uint8Array(b));

/**
 * @param {string} id  projeto
 * @param {string} principal  arquivo principal
 * @param {(caminho) => string|null} textoAberto  texto atual de arquivos abertos no editor (inclusive não salvos)
 */
export async function contarPalavras(id, principal, textoAberto) {
  const visitados = new Set();
  const total = { palavras: 0, caracteres: 0, formulas: 0, figuras: 0, tabelas: 0, secoes: 0, arquivos: [] };

  async function ler(caminho) {
    const aberto = textoAberto(caminho);
    if (aberto !== null) return aberto;
    try {
      return decodificar(await api.lerArquivo(id, caminho));
    } catch {
      return null;
    }
  }

  async function visitar(caminho, raiz) {
    if (visitados.has(caminho) || visitados.size > 200) return;
    visitados.add(caminho);
    let texto = await ler(caminho);
    if (texto === null) return;
    // No arquivo principal, só conta o que está dentro de \begin{document}.
    if (raiz) {
      const ini = texto.indexOf("\\begin{document}");
      const fim = texto.indexOf("\\end{document}");
      if (ini >= 0) texto = texto.slice(ini, fim > ini ? fim : undefined);
    }
    const semComentarios = texto.replace(/(?<!\\)%.*$/gm, "");
    const palavras = encontrarPalavras(texto).map((p) => p.palavra);
    // Palavras todas em maiúsculas (siglas) também contam como palavras no texto.
    const siglas = [...semComentarios.replace(/\$[^$]*\$/g, "").matchAll(/(?<![\\\w])[A-ZÀ-Ý]{2,}\b/g)].length;
    const n = palavras.length + siglas;
    total.palavras += n;
    total.caracteres += palavras.reduce((s, p) => s + p.length, 0);
    total.formulas += [...semComentarios.matchAll(/\$[^$]+\$|\\\[|\\begin\{(equation|align|gather|multline)\*?\}/g)].length;
    total.figuras += [...semComentarios.matchAll(/\\begin\{figure\*?\}/g)].length;
    total.tabelas += [...semComentarios.matchAll(/\\begin\{table\*?\}|\\begin\{longtable\}/g)].length;
    total.secoes += [...semComentarios.matchAll(/\\(chapter|section|subsection|subsubsection)\*?\{/g)].length;
    total.arquivos.push([caminho, n]);

    // Segue os arquivos incluídos.
    for (const m of semComentarios.matchAll(/\\(input|include|subfile)\{([^}]+)\}/g)) {
      let alvo = m[2].trim();
      if (!/\.tex$/i.test(alvo)) alvo += ".tex";
      await visitar(alvo, false);
    }
  }

  await visitar(principal, true);

  return dialogo({
    titulo: "Contagem de palavras",
    largura: 460,
    conteudo: `
      <table class="tabela-contagem">
        <tr><td>Palavras</td><td><b>${total.palavras.toLocaleString("pt-BR")}</b></td></tr>
        <tr><td>Caracteres (sem espaços)</td><td>${total.caracteres.toLocaleString("pt-BR")}</td></tr>
        <tr><td>Seções</td><td>${total.secoes}</td></tr>
        <tr><td>Fórmulas</td><td>${total.formulas}</td></tr>
        <tr><td>Figuras</td><td>${total.figuras}</td></tr>
        <tr><td>Tabelas</td><td>${total.tabelas}</td></tr>
      </table>
      ${total.arquivos.length > 1 ? `<p class="dica">Por arquivo:</p><table class="tabela-contagem pequena">${total.arquivos.map(([c, n]) => `<tr><td>${esc(c)}</td><td>${n.toLocaleString("pt-BR")}</td></tr>`).join("")}</table>` : ""}
      <p class="dica">Conta só o texto do documento (sem comandos, fórmulas, comentários e preâmbulo).</p>`,
    botoes: [{ texto: "Fechar", valor: null, classe: "primario" }],
  });
}
