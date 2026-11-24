const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

const appRoot = path.resolve(__dirname, "../apps/web");
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

async function main() {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    const file = path.resolve(appRoot, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(appRoot + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404).end("Not found"); return; }
      res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const origin = "http://127.0.0.1:" + address.port;
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    page.on("pageerror", error => failures.push(error.message));
    await page.goto(origin);
    await page.waitForFunction(() => document.querySelector("#save-state").textContent.includes("IndexedDB"));
    assert.equal(await page.locator("#projects .project").count(), 3);

    const importContext = await browser.newContext();
    const importPage = await importContext.newPage();
    await importPage.goto(origin);
    await importPage.waitForFunction(() => document.querySelector("#save-state").textContent.includes("IndexedDB"));
    const importedText = "\\documentclass{article}\n\\begin{document}\nConteúdo importado.\n\\end{document}\n";
    await importPage.locator("#file").setInputFiles({
      name: "importado.tex",
      mimeType: "text/plain",
      buffer: Buffer.from(importedText, "utf8")
    });
    await importPage.waitForFunction(() => document.querySelectorAll("#projects .project").length === 4);
    assert.equal(await importPage.locator("#project-name").innerText(), "importado");
    assert.equal(await importPage.locator("#filename").innerText(), "importado.tex");
    assert.match(await importPage.evaluate(() => projects[0].id), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(await importPage.locator("#code").inputValue(), importedText);
    await importContext.close();

    const editor = page.locator("#code");
    const edited = String.raw`\documentclass{article}
%% autosave antes de trocar projeto
\begin{document}
Texto salvo no projeto correto.
\end{document}
`;
    await editor.fill(edited);
    await page.locator("#projects .project").nth(1).click();
    await page.locator("#projects .project").nth(0).click();
    assert.equal(await editor.inputValue(), edited, "o autosave deve permanecer no projeto original");

    page.once("dialog", dialog => dialog.accept("capitulos/introducao.tex"));
    await page.locator(".file-add").click();
    await page.locator(".file-tab").filter({ hasText: "capitulos/introducao.tex" }).waitFor();
    await editor.fill("Conteúdo do novo arquivo");
    await page.waitForTimeout(650);

    page.once("dialog", dialog => dialog.accept("capitulos/abertura.tex"));
    await page.locator(".file-rename").last().click();
    await page.locator(".file-tab").filter({ hasText: "capitulos/abertura.tex" }).waitFor();

    page.once("dialog", dialog => dialog.accept());
    await page.locator(".file-close").last().click();
    assert.equal(await page.locator(".file-tab-wrap").count(), 1);

    const downloadPromise = page.waitForEvent("download");
    await page.locator("#backup").click();
    const download = await downloadPromise;
    const backupPath = await download.path();
    const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
    assert.equal(backup.format, "forge-local-backup");
    assert.equal(backup.formatVersion, 1);
    assert.equal(backup.projects.length, 3);

    await page.locator("#backup-file").setInputFiles(backupPath);
    await page.waitForFunction(() => document.querySelectorAll("#projects .project").length === 6);
    assert.ok((await page.locator("#projects").innerText()).includes("(restaurado)"));

    const migrationContext = await browser.newContext();
    const migrationPage = await migrationContext.newPage();
    await migrationPage.addInitScript(() => {
      localStorage.setItem("forge.web.mock.v1", JSON.stringify([
        { id: "legacy-1", name: "Projeto migrado", updated: "Antes", files: { "main.tex": "CONTEÚDO LEGADO" } }
      ]));
    });
    await migrationPage.goto(origin);
    await migrationPage.waitForFunction(() => document.querySelector("#save-state").textContent.includes("IndexedDB"));
    assert.equal(await migrationPage.locator("#project-name").innerText(), "Projeto migrado");
    const migratedId = await migrationPage.evaluate(() => new Promise((resolve, reject) => { const request = indexedDB.open("forge-web", 1); request.onsuccess = () => { const get = request.result.transaction("projects", "readonly").objectStore("projects").getAll(); get.onsuccess = () => resolve(get.result.find(project => project.name === "Projeto migrado").id); get.onerror = () => reject(get.error); }; request.onerror = () => reject(request.error); }));
    assert.match(migratedId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(await migrationPage.locator("#code").inputValue(), "CONTEÚDO LEGADO");
    const migrated = await migrationPage.evaluate(() => new Promise((resolve, reject) => {
      const request = indexedDB.open("forge-web", 1);
      request.onsuccess = () => {
        const tx = request.result.transaction("projects", "readonly");
        const get = tx.objectStore("projects").getAll();
        get.onsuccess = () => resolve(get.result.some(project => project.name === "Projeto migrado"));
        get.onerror = () => reject(get.error);
      };
      request.onerror = () => reject(request.error);
    }));
    assert.equal(migrated, true, "a migração deve gravar o projeto legado no IndexedDB");
    await migrationContext.close();

    const fallbackContext = await browser.newContext();
    const fallbackPage = await fallbackContext.newPage();
    await fallbackPage.addInitScript(() => Object.defineProperty(window, "indexedDB", { configurable: true, value: undefined }));
    await fallbackPage.goto(origin);
    await fallbackPage.waitForFunction(() => document.querySelector("#save-state").textContent.includes("alternativo"));
    await fallbackPage.locator("#code").fill("Fallback localStorage");
    await fallbackPage.waitForFunction(() => document.querySelector("#save-state").textContent.includes("Salvo neste navegador"));
    assert.ok(await fallbackPage.evaluate(() => localStorage.getItem("forge.web.mock.v1").includes("Fallback localStorage")));
    await fallbackContext.close();

    await page.setViewportSize({ width: 820, height: 1024 });
    await page.locator("#toggle-inspector").click();
    assert.equal(await page.locator(".workspace.show-inspector .inspector").isVisible(), true, "o painel lateral deve abrir em tablet");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-mobile="sidebar"]').click();
    assert.equal(await page.locator(".workspace.mobile-sidebar .sidebar").isVisible(), true, "a navegação de projetos deve funcionar em celular");
    assert.equal(await page.locator("#backup-side").isVisible(), true, "backup local deve estar acessível na vista mobile de projetos");
    await page.locator('[data-mobile="inspector"]').click();
    assert.equal(await page.locator(".workspace.mobile-inspector .inspector").isVisible(), true, "o painel de inspeção deve abrir no celular");
    await page.locator('[data-mobile="editor"]').click();
    assert.equal(await page.locator(".workspace .editor").isVisible(), true, "o editor deve voltar a ser a vista ativa no celular");

    assert.deepEqual(failures, [], "a aplicação não deve lançar erros no browser");
    await context.close();
    process.stdout.write("Browser smoke tests: OK\\n");
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  process.stderr.write((error.stack || String(error)) + "\\n");
  process.exitCode = 1;
});
