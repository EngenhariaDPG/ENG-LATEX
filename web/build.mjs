// Gera a pasta dist/ com a interface pronta para ser embutida no .exe.
//
// - src/main.js (e tudo que ele importa) vira um único dist/app.js
// - o "worker" do pdf.js é copiado (ele roda numa thread separada)
// - index.html e estilo.css são copiados como estão
//
// Uso: npm run build

import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

await esbuild.build({
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "esm",
  minify: true,
  sourcemap: false,
  target: ["chrome110", "edge110"],
  outfile: "dist/app.js",
  // pdf.js referencia módulos do Node que não existem no navegador
  external: ["fs", "path", "url", "module", "canvas", "zlib", "http", "https"],
  logLevel: "info",
});

cpSync("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "dist/pdf.worker.min.mjs");
cpSync("src/index.html", "dist/index.html");
cpSync("src/estilo.css", "dist/estilo.css");
cpSync("src/icone.svg", "dist/icone.svg");
// KaTeX (desenho de fórmulas): folha de estilos + fontes, tudo offline.
cpSync("node_modules/katex/dist/katex.min.css", "dist/katex.min.css");
cpSync("node_modules/katex/dist/fonts", "dist/fonts", { recursive: true });
console.log("Interface gerada em dist/");
