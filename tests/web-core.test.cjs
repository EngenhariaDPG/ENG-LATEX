const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const coreSource = fs.readFileSync(path.join(root, "apps/web/project-core.js"), "utf8");
const context = vm.createContext({});
vm.runInContext(coreSource, context, { filename: "project-core.js" });

function validPath(value) {
  return vm.runInContext("ForgeCore.validProjectPath(" + JSON.stringify(value) + ")", context);
}
function validRecord(record) {
  return vm.runInContext("ForgeCore.validProjectRecord(" + JSON.stringify(record) + ")", context);
}

test("aceita arquivos LaTeX e caminhos Unicode relativos", () => {
  assert.equal(validPath("main.tex"), true);
  assert.equal(validPath(" main.tex "), false);
  assert.equal(validPath("capítulos/introdução.tex"), true);
  assert.equal(validPath("figuras/ensaio-01.png"), true);
});

test("rejeita caminhos absolutos, traversal e separadores Windows", () => {
  for (const value of ["/etc/passwd", "../segredo.tex", "a/../b.tex", "a//b.tex", "a\\b.tex", "C:/arquivo.tex"]) {
    assert.equal(validPath(value), false, value);
  }
});

test("rejeita segmentos reservados, controles e nomes não portáveis", () => {
  for (const value of ["__proto__/x.tex", "constructor/x.tex", "CON.txt", "pasta/arquivo.", "nome:fluxo.tex", "linha\nquebrada.tex"]) {
    assert.equal(validPath(value), false, JSON.stringify(value));
  }
});

test("aplica limites de comprimento e profundidade", () => {
  assert.equal(validPath("a".repeat(241) + ".tex"), false);
  assert.equal(validPath(Array.from({ length: 21 }, (_, i) => "d" + i).join("/") + "/x.tex"), false);
});

test("valida projeto com pelo menos um arquivo textual", () => {
  assert.equal(validRecord({ id: "p1", name: "Projeto", files: { "main.tex": "\\documentclass{article}" } }), true);
  assert.equal(validRecord({ id: "p1", name: "Projeto", files: {} }), false);
  assert.equal(validRecord({ id: "p1", name: "Projeto", files: { "../escape.tex": "x" } }), false);
  assert.equal(validRecord({ id: "", name: "Projeto", files: { "main.tex": "x" } }), false);
});

test("app web tem sintaxe válida e carrega o core antes do app", () => {
  const app = fs.readFileSync(path.join(root, "apps/web/app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "apps/web/index.html"), "utf8");
  assert.doesNotThrow(() => new Function(app));
  assert.ok(html.indexOf('src="./project-core.js"') < html.indexOf('src="./app.js"'));
});

test("schema do arquivo de projeto permanece JSON válido", () => {
  const schema = fs.readFileSync(path.join(root, "docs/contracts/forge-project-v1.schema.json"), "utf8");
  assert.doesNotThrow(() => JSON.parse(schema));
});


test("valida formato e limites de backup local", () => {
  const project = { id: "p1", name: "Projeto", files: { "main.tex": "conteúdo" } };
  const valid = { format: "forge-local-backup", formatVersion: 1, projects: [project] };
  assert.equal(vm.runInContext("ForgeCore.validateBackupPayload(" + JSON.stringify(valid) + ", 0, 100)", context), null);
  assert.match(vm.runInContext("ForgeCore.validateBackupPayload(" + JSON.stringify(valid) + ", 100, 100)", context), /100 projetos/);
  assert.match(vm.runInContext("ForgeCore.validateBackupPayload(" + JSON.stringify(valid) + ", 0, 26*1024*1024)", context), /25 MB/);
  assert.match(vm.runInContext("ForgeCore.validateBackupPayload(" + JSON.stringify({ ...valid, formatVersion: 2 }) + ", 0, 100)", context), /inválido/);
  const oversized = { format: "forge-local-backup", formatVersion: 1, projects: [{ id: "p2", name: "Grande", files: { "main.tex": "x".repeat(5*1024*1024+1) } }] };
  assert.match(vm.runInContext("ForgeCore.validateBackupPayload(" + JSON.stringify(oversized) + ", 0, 100)", context), /5 MB/);
  const multibyte = { format: "forge-local-backup", formatVersion: 1, projects: [{ id: "p3", name: "Unicode", files: { "main.tex": "é".repeat(3*1024*1024) } }] };
  assert.match(vm.runInContext("ForgeCore.validateBackupPayload(" + JSON.stringify(multibyte) + ", 0, 100)", context), /5 MB/);
});
