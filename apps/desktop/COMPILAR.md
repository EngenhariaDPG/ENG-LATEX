# Como gerar o EngLaTeX.exe a partir do código

Pré-requisitos (no Windows): Rust (rustup) e Node.js 18+.

```bat
cd web
npm install
npm run build        :: gera web\dist (a interface que vai embutida no .exe)
cd ..
cargo build --release
```

O executável fica em `target\release\EngLaTeX.exe`. Para distribuir, coloque na mesma pasta:

- `WebView2Loader.dll` (vem no crate `webview2-com-sys`, pasta `x64`)
- `tectonic.exe` (https://github.com/tectonic-typesetting/tectonic/releases)
- `dicionarios\pt_BR.aff/.dic` e `en_US.aff/.dic` (repositório LibreOffice/dictionaries)
- `tectonic-cache\` (opcional: pacotes LaTeX para funcionar offline; gere compilando
  documentos com a variável `TECTONIC_CACHE_DIR` apontando para essa pasta)

Para testar sem janela (servidor + navegador): `EngLaTeX.exe --servidor --porta 18000`
e abra http://127.0.0.1:18000/.

## Organização

| Arquivo | O que faz |
|---|---|
| `src/main.rs` | inicialização, servidor interno e janela |
| `src/janela.rs` | janela nativa (WebView2), diálogos Salvar/Abrir, registro de erros |
| `src/api.rs` | todas as rotas usadas pela interface (lista no topo do arquivo) |
| `src/projetos.rs` | projetos, arquivos, variáveis (`\var{}`), modelos do usuário, zip |
| `src/historico.rs` | histórico de versões (pasta `.historico` de cada projeto) |
| `src/compilador.rs` | Tectonic/latexmk/pdflatex e leitura do log |
| `src/synctex.rs` | PDF ↔ código |
| `src/ortografia.rs` | corretor (Hunspell via spellbook) e download de dicionários |
| `src/modelos.rs` | modelos prontos (memorial, laudo...) |
| `web/src/editor.js` | tela do editor (liga todos os módulos abaixo) |
| `web/src/projetos.js` | tela inicial |
| `web/src/variaveis.js` | tabela de variáveis |
| `web/src/insercao.js` | janelas do botão direito (seção, imagem, lista, equação...) |
| `web/src/tabelas.js` | editor de tabelas (colar do Excel, editar tabela existente) |
| `web/src/simbolos.js` | paleta de símbolos |
| `web/src/formulas.js` | prévia de fórmulas com KaTeX |
| `web/src/visual.js` | modo visual |
| `web/src/historico.js` | tela do histórico (comparação lado a lado) |
| `web/src/referencias.js` | gerenciador de referências (.bib, DOI, normas ABNT) |
| `web/src/contagem.js` | contagem de palavras |
| `web/src/ortografia.js` | sublinhado, sugestões e trechos em outros idiomas |
| `web/src/i18n.js` | tradução da interface (pt-BR, en, es) — instruções no topo |
| `web/src/visualizador.js` | visualizador de PDF (pdf.js) |
| `web/src/latex.js` | realce, autocompletar e atalhos LaTeX |
