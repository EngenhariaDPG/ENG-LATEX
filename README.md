<p align="center">
  <img src="recursos/icone64.png" width="64" alt="Eng LaTeX">
</p>

<h1 align="center">Eng LaTeX</h1>

<p align="center">
  Editor LaTeX <b>offline</b> para Windows, no estilo do Overleaf.<br>
  Um único programa: editor, compilador, PDF ao lado, corretor ortográfico e documentos-modelo com variáveis.
</p>

<p align="center">
  <a href="https://github.com/EngenhariaDPG/ENG-LATEX/raw/main/release/EngLaTeX-1.3-Instalador.exe"><b>⬇ Instalador para Windows (.exe)</b></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/EngenhariaDPG/ENG-LATEX/raw/main/release/EngLaTeX-1.3-Windows.zip">versão portátil (.zip)</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/EngenhariaDPG/ENG-LATEX/raw/main/release/EngLaTeX-1.3-Android.apk"><b>⬇ Baixar para Android (.apk)</b></a>
</p>

---

## Sumário

1. [Para quem só quer usar](#1-para-quem-só-quer-usar)
2. [Funcionalidades](#2-funcionalidades)
3. [Como o programa funciona por dentro](#3-como-o-programa-funciona-por-dentro)
4. [Estrutura do repositório](#4-estrutura-do-repositório)
5. [Como compilar](#5-como-compilar)
6. [Diretivas para trabalhar no código](#6-diretivas-para-trabalhar-no-código)
7. [Receitas: como fazer as alterações mais comuns](#7-receitas-como-fazer-as-alterações-mais-comuns)
8. [Como testar](#8-como-testar)
9. [Como publicar uma versão nova](#9-como-publicar-uma-versão-nova)
10. [Licenças](#10-licenças)

---

## 1. Para quem só quer usar

1. Baixe o **[instalador EngLaTeX-1.3-Instalador.exe](https://github.com/EngenhariaDPG/ENG-LATEX/raw/main/release/EngLaTeX-1.3-Instalador.exe)** e abra-o.
   - Não pede senha de administrador: instala só para o seu usuário, em `%LOCALAPPDATA%\Programs\EngLaTeX`.
   - Cria atalho no Menu Iniciar (e, se quiser, na Área de Trabalho) e aparece em *Configurações → Aplicativos*, de onde dá para desinstalar.
   - Para atualizar, rode o instalador da versão nova por cima. Desinstalar **não apaga** os projetos (`Documentos\EngLaTeX`).
2. **Ou**, sem instalar (versão portátil, ex.: pendrive): baixe **[EngLaTeX-1.3-Windows.zip](https://github.com/EngenhariaDPG/ENG-LATEX/raw/main/release/EngLaTeX-1.3-Windows.zip)**, descompacte a pasta inteira (ex.: `C:\EngLaTeX`) e abra o `EngLaTeX.exe` (não tire ele de dentro da pasta).

**Requisitos:** Windows 10 ou 11, 64 bits, com o *Microsoft Edge WebView2 Runtime*. Ele já vem no Windows atualizado; se faltar, o programa avisa.
Na primeira execução o SmartScreen pode avisar ("o Windows protegeu o computador"), porque o executável não tem assinatura digital. Clique em **Mais informações → Executar assim mesmo**.

### Android (celular e tablet)

1. No aparelho, baixe **[EngLaTeX-1.3-Android.apk](https://github.com/EngenhariaDPG/ENG-LATEX/raw/main/release/EngLaTeX-1.3-Android.apk)** e abra o arquivo.
2. Permita "instalar apps desta fonte" quando o Android pedir.
3. Na primeira abertura o app prepara o LaTeX offline (leva alguns segundos).

Compila **no próprio aparelho, sem internet**, com as mesmas funções do PC. Requer Android 8 ou mais novo, processador arm64.
No celular, o editor mostra um painel por vez (abas **Arquivos / Código / PDF / Compilar** embaixo). "Salvar PDF" grava em `Download/EngLaTeX` e abre o menu Compartilhar.
Detalhes técnicos e como gerar o APK: [android/LEIA-ME.md](android/LEIA-ME.md).

O manual completo de uso está em [`docs/LEIA-ME.txt`](docs/LEIA-ME.txt) e também vai dentro do .zip.

**Onde ficam os dados do usuário:** `Documentos\EngLaTeX\`
(`Projetos\`, `Modelos\`, `Documentacao\`, `Lixeira\`, `config.json`, `dicionario-pessoal.txt`, `englatex.log`).

## 2. Funcionalidades

| Área | O que tem |
|---|---|
| Editor | Realce de LaTeX, autocompletar (comandos, ambientes, `\ref`, `\cite`, `\var`, arquivos), localizar e substituir, vários cursores, Ctrl+B/I, salvamento automático |
| Modo visual | Títulos, negrito, listas, fórmulas (KaTeX), imagens e valores das variáveis aparecem formatados; o código reaparece na linha do cursor |
| Botão direito | Janelas para inserir seção/parágrafo, tabela, imagem, lista, equação (com prévia), nota de rodapé, referência cruzada, citação e variável; "Editar esta tabela" |
| Tabelas | Editor em grade; colar direto do Excel; booktabs, grade ou sem bordas; edita tabelas já existentes |
| Fórmulas | Prévia ao passar o mouse; paleta de símbolos (gregas, operadores, setas, unidades siunitx de engenharia) |
| Compilação | **Tectonic embutido com cache offline** (amsmath, siunitx, TikZ, pgfplots, babel pt, Beamer, abnTeX2...); usa **MiKTeX/TeX Live** (latexmk ou pdflatex/xelatex/lualatex) se instalados |
| PDF | Visualizador próprio (pdf.js), zoom, mantém a posição ao recompilar, **SyncTeX** nos dois sentidos (duplo clique no PDF → código; Ctrl+Alt+→ código → PDF) |
| Erros | Painel de erros/avisos/caixas clicável e marcação na linha do código |
| Variáveis | Tabela de variáveis por projeto; no texto `\var{nome}`; gera `variaveis.tex` portátil (compila no Overleaf também) |
| Modelos | Modelos prontos (artigo, memorial de cálculo, laudo técnico, Beamer) e "Salvar como modelo" de qualquer projeto |
| Referências | Gerenciador de `.bib`: livro, artigo, **norma ABNT/NBR**, site, tese, relatório, manual; busca por **DOI**; colar BibTeX; cria `\bibliography` sozinho |
| Documentação técnica | Aba na tela inicial para documentos com **várias revisões** (Rev. 00, Rev. 01...): cada revisão é um projeto completo; "Nova revisão" copia a escolhida e sugere o código seguinte; situação (em elaboração, emitida, aprovada...); variáveis automáticas `\var{revisao}`, `\var{data_revisao}`, `\var{tabela_revisoes}`... |
| Histórico | Versões automáticas ao compilar e versões com nome; comparação lado a lado; restaurar arquivo ou projeto |
| Corretor | Hunspell (pt_BR e en_US inclusos; outros idiomas baixados no programa); **vários idiomas no mesmo documento** (`otherlanguage`, `\foreignlanguage`, `\selectlanguage`) |
| Interface | Português, inglês e espanhol |
| Projetos | Importar/exportar .zip (compatível com o "Download source" do Overleaf), duplicar, lixeira, contagem de palavras |

## 3. Como o programa funciona por dentro

```
┌──────────────────────────── EngLaTeX.exe (Rust) ────────────────────────────┐
│                                                                              │
│  thread principal: janela nativa (tao) + WebView2 (wry)                      │
│        │  carrega http://127.0.0.1:<porta>/                                  │
│        ▼                                                                     │
│  interface web embutida no .exe (web/dist via rust-embed)                    │
│   CodeMirror 6 (editor) · pdf.js (PDF) · KaTeX (fórmulas)                    │
│        │  fetch /api/...                                                     │
│        ▼                                                                     │
│  thread do servidor: axum (só 127.0.0.1) ── projetos, compilação, SyncTeX,   │
│                                             corretor, histórico, variáveis   │
│        │                                                                     │
│        ▼                                                                     │
│  tectonic.exe  ou  latexmk / pdflatex / xelatex / lualatex (MiKTeX/TeX Live)  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- O servidor escuta **apenas em 127.0.0.1**, numa porta livre escolhida a cada execução. Nada é exposto na rede.
- Fechar a janela encerra o processo inteiro.
- Cada projeto é uma **pasta comum** em `Documentos\EngLaTeX\Projetos\<nome>`:
  - `.englatex.json`: configuração do projeto (arquivo principal, compilador, idioma, **variáveis**)
  - `.saida\`: PDF, log, aux e synctex gerados
  - `.historico\`: versões salvas (`<n>\` com os arquivos e `<n>.json` com os dados)
  - `variaveis.tex`: gerado a partir da tabela de variáveis (não editar à mão)
- Cada **documento técnico** é uma pasta em `Documentos\EngLaTeX\Documentacao\<documento>`:
  - `.documento.json`: nome, cliente e a lista de revisões (código, situação, data, responsável, descrição, origem)
  - `Rev. 00\`, `Rev. 01\`...: cada revisão é um projeto comum (mesma estrutura acima)
  - No editor e na API, uma revisão tem o id `doc:<documento>:<pasta da revisão>` (o `:` não existe em nomes de pasta do Windows, então não se confunde com projeto). `projetos::pasta_projeto` traduz esse id para a pasta, por isso todas as rotas `/api/p/:id/...` funcionam com revisões sem mudança.
- Itens que começam com `.` não aparecem na árvore de arquivos e não vão para o .zip exportado.

## 4. Estrutura do repositório

```
.
├── Cargo.toml / Cargo.lock      dependências Rust (versão do programa fica aqui)
├── build.rs                     embute ícone, manifesto e versão no .exe
├── recursos/                    icone.ico, icone64.png/.rgba, app.rc, app.manifest
├── src/                         BACKEND (Rust)
│   ├── main.rs                  inicialização: pastas, estado, servidor, janela
│   ├── janela.rs                janela WebView2, diálogos Salvar/Abrir, englatex.log
│   ├── api.rs                   TODAS as rotas HTTP (lista documentada no topo)
│   ├── projetos.rs              projetos, arquivos, variáveis, modelos do usuário, zip
│   ├── historico.rs             histórico de versões
│   ├── documentacao.rs          documentos técnicos com várias revisões (com testes)
│   ├── compilador.rs            Tectonic/latexmk/direto + leitura do log (com testes)
│   ├── synctex.rs               PDF ↔ código
│   ├── ortografia.rs            corretor Hunspell + catálogo/download de dicionários
│   ├── modelos.rs               modelos prontos de projeto
│   └── config.rs                configurações globais (config.json)
├── web/                         FRONTEND (JavaScript puro + esbuild)
│   ├── build.mjs                gera web/dist (bundle + pdf.worker + KaTeX)
│   └── src/
│       ├── main.js              navegação (#/ e #/p/<projeto>) e início da tradução
│       ├── api.js               chamadas ao backend (espelho de src/api.rs)
│       ├── ui.js                ícones, diálogos, avisos, menus
│       ├── projetos.js          tela inicial
│       ├── editor.js            tela do editor (liga todos os módulos abaixo)
│       ├── latex.js             realce, autocompletar, atalhos, estrutura
│       ├── visual.js            modo visual
│       ├── formulas.js          KaTeX + prévia de fórmulas
│       ├── simbolos.js          paleta de símbolos
│       ├── tabelas.js           editor de tabelas
│       ├── insercao.js          janelas do botão direito
│       ├── variaveis.js         tabela de variáveis
│       ├── referencias.js       gerenciador de .bib
│       ├── historico.js         tela do histórico
│       ├── documentacao.js      aba "Documentação técnica" (documentos e revisões)
│       ├── contagem.js          contagem de palavras
│       ├── ortografia.js        sublinhado, sugestões, trechos em outros idiomas
│       ├── visualizador.js      PDF (pdf.js) e destaque SyncTeX
│       ├── configuracoes.js     janela de configurações
│       ├── i18n.js              tradução da interface (pt-BR/en/es)
│       ├── index.html, estilo.css, icone.svg
├── docs/
│   ├── LEIA-ME.txt              manual do usuário (vai dentro do pacote)
│   └── licencas/                licenças dos componentes de terceiros
├── android/                     app Android (veja android/LEIA-ME.md)
│   ├── construir.sh             gera o .apk
│   └── app/                     manifesto e código Java (WebView + servidor local)
├── ferramentas/
│   ├── empacotar.sh             monta o pacote .zip e o instalador
│   └── instalador.nsi           script do instalador (NSIS)
└── release/
    ├── EngLaTeX-1.3-Instalador.exe instalador para Windows
    ├── EngLaTeX-1.3-Windows.zip versão portátil (Windows)
    └── EngLaTeX-1.3-Android.apk app para Android
```

## 5. Como compilar

### Pré-requisitos

- **Rust** estável (`rustup`), edição 2021
- **Node.js 18+** (só para gerar a interface)
- No Linux, para gerar o `.exe` de Windows: `rustup target add x86_64-pc-windows-gnu` e `apt install mingw-w64`

### Passo a passo

> **A interface precisa ser gerada antes do Rust.** O `rust-embed` lê `web/dist` durante a compilação. Se `web/dist` não existir, o `cargo build` falha.

```bash
# 1) interface
cd web
npm ci
npm run build          # cria web/dist
cd ..

# 2a) Windows (nativo)
cargo build --release  # target/release/EngLaTeX.exe

# 2b) Linux -> Windows (cruzado)
cargo build --release --target x86_64-pc-windows-gnu

# 2c) Linux, só para testes (sem janela; abre como servidor)
cargo build
./target/debug/EngLaTeX --servidor --porta 18000 --pasta /tmp/englatex
# e abra http://127.0.0.1:18000/ num navegador
```

Para rodar, o `.exe` precisa destes arquivos **na mesma pasta**. O `ferramentas/empacotar.sh` junta tudo:

| Arquivo | Origem |
|---|---|
| `WebView2Loader.dll` | crate `webview2-com-sys` (`x64/`), baixado pelo cargo |
| `tectonic.exe` | [Tectonic 0.15.0](https://github.com/tectonic-typesetting/tectonic/releases) |
| `dicionarios/` | `pt_BR` e `en_US` do [LibreOffice/dictionaries](https://github.com/LibreOffice/dictionaries) |
| `tectonic-cache/` | pacotes LaTeX para uso offline (reaproveitado do pacote anterior) |

### Opções de linha de comando

| Opção | Efeito |
|---|---|
| `--servidor` | não abre a janela, só o servidor (padrão fora do Windows) |
| `--porta N` | usa a porta N (padrão: uma livre qualquer) |
| `--pasta CAMINHO` | usa outra pasta de dados no lugar de `Documentos\EngLaTeX` |

## 6. Diretivas para trabalhar no código

Estas regras valem para qualquer pessoa ou IA que for mexer no projeto.

### Gerais

1. **Todo código é comentado, em português**, pensando em quem vai dar manutenção depois. Cada arquivo começa com um bloco explicando o que faz. Cada função pública tem `///` (Rust) ou `/** */` (JS).
2. **Nomes em português**: funções, variáveis, rotas, campos JSON e mensagens. Ex.: `pasta_projeto`, `abrirArquivo`, `/api/p/:id/compilar`. Mantenha o padrão.
3. **Mensagens de erro em português claro**, ditas ao usuário final: o que aconteceu e o que fazer (`"latexmk não encontrado. Instale o MiKTeX... ou escolha o Tectonic em Configurações."`). Nada de `unwrap()` em caminho que o usuário pode atingir; use `Resultado<T>` / `Result<_, String>`.
4. **O programa tem que funcionar offline.** Recurso que precisa de internet (download de dicionário, DOI) deve ser opcional e falhar com uma mensagem amigável.
5. **Nenhuma dependência de CDN** na interface: tudo vai embutido no `.exe` (bundle do esbuild e `cpSync` no `build.mjs`).
6. **Não quebre os projetos existentes.** Campos novos em `config.json` e `.englatex.json` levam `#[serde(default)]` e um valor padrão sensato. Nunca renomeie campos já gravados.
7. **Arquivos do usuário são sagrados:**
   - gravação via `projetos::gravar_arquivo` (escreve em temporário e renomeia);
   - excluir projeto move para a `Lixeira`;
   - restaurar versão salva o estado atual antes.
8. **Segurança de caminhos:** todo caminho vindo da interface passa por `projetos::validar_relativo` / `caminho_arquivo`. Não use `PathBuf::join` direto com texto da interface.
9. **Processos externos** (compiladores) rodam com tempo limite (`TEMPO_LIMITE`) e, no Windows, com `CREATE_NO_WINDOW`, para não piscar uma janela preta.
10. **Código de Windows** (janela, diálogos) fica atrás de `#[cfg(windows)]`. O resto compila e roda no Linux, para dar para testar sem Windows.

### Backend (Rust)

- Rotas novas: registrar em `api::rotas`, documentar na lista do topo de `api.rs` e criar a função correspondente em `web/src/api.js`.
- Operações demoradas ou bloqueantes (janela do Windows, download, carregar dicionário) vão em `tokio::task::spawn_blocking`.
- Rode `cargo build` e `cargo test` sem avisos antes de enviar.

### Frontend (JavaScript)

- JavaScript puro em módulos ES, sem framework. Cada recurso fica no seu arquivo e o `editor.js` só faz a ligação.
- **Textos da tela em português, direto no código.** A tradução para inglês/espanhol é feita pelo `i18n.js`, que observa a tela. **Todo texto novo visível precisa de uma linha em `TEXTOS` (ou `PADROES`) no `i18n.js`**, senão aparece em português nas outras línguas.
- Conteúdo do usuário (código, nomes de arquivo, PDF, log) não pode ser traduzido. Áreas novas desse tipo entram em `NAO_TRADUZIR`.
- Use os componentes de `ui.js` (`dialogo`, `perguntar`, `confirmar`, `aviso`, `menuContexto`) em vez de `alert`/`prompt`/`confirm`.
- `localStorage` só por `armazenamento` (com try/catch), e só para preferências leves de tela.
- Depois de mudar qualquer coisa em `web/src`, rode `npm run build` **e depois** `cargo build`, porque a interface vai embutida no `.exe`.

### Estilo

- CSS em `web/src/estilo.css`, com as cores nas variáveis do `:root` (`--verde`, `--barra`...).
- Rust: `cargo fmt`. JS: indentação de 2 espaços, aspas duplas, ponto e vírgula.

## 7. Receitas: como fazer as alterações mais comuns

| Quero... | Onde mexer |
|---|---|
| **Novo modelo pronto** de projeto | `src/modelos.rs`: uma entrada em `LISTA` e um ramo em `arquivos_texto()` (e em `arquivos()` se tiver variáveis). Use `PREAMBULO_FONTES` para funcionar com pdfLaTeX e XeLaTeX |
| **Novo idioma do corretor** | `src/ortografia.rs`: uma linha em `CATALOGO` (URLs do .aff/.dic). Se tiver nome de babel, acrescente em `IDIOMAS_BABEL` (`web/src/ortografia.js`) |
| **Novo idioma da interface** | `web/src/i18n.js`: código em `IDIOMAS`, coluna em `COLUNA` e uma coluna nova em `TEXTOS` e `PADROES` |
| **Novo símbolo na paleta** | `web/src/simbolos.js`: lista `CATEGORIAS` |
| **Novo comando no autocompletar** | `web/src/latex.js`: `COMANDOS`, `AMBIENTES` ou `PACOTES` |
| **Comando ignorado pelo corretor** | `web/src/ortografia.js`: `ARGUMENTOS_IGNORADOS` / `AMBIENTES_IGNORADOS` |
| **Nova janela no botão direito** | crie a função em `web/src/insercao.js` (devolve `{ texto, pacotes }`), acrescente um `case` em `Editor.ferramenta()` e um item em `Editor.menuBotaoDireito()` (`editor.js`) |
| **Novo tipo de referência** | `web/src/referencias.js`: `TIPOS` (e `CAMPOS` se precisar de campo novo) |
| **Elemento novo no modo visual** | `web/src/visual.js`: função `calcular()` |
| **Novo compilador/motor** | `src/compilador.rs`: `compilar_interno()` (escolha do `modo`) e `disponiveis()` |
| **Nova situação de revisão** | `src/documentacao.rs` (`SITUACOES`) + `web/src/documentacao.js` (`SITUACOES`, e `FECHADAS` se for "entregue") + cor em `estilo.css` (`.situacao-<chave>`) + texto no `i18n.js` |
| **Nova variável automática de revisão** | `src/documentacao.rs`: `atualizar_variaveis()` (e a lista no topo do arquivo e no LEIA-ME) |
| **Mudar regras do histórico** | `src/historico.rs`: `INTERVALO_AUTOMATICO`, `MAX_AUTOMATICAS`, `EXTENSOES` |
| **Nova configuração** | `src/config.rs` (com default) + `web/src/configuracoes.js` + textos no `i18n.js` |
| **Atualizar o cache offline do Tectonic** | compile documentos com os pacotes desejados usando `TECTONIC_CACHE_DIR=<pasta>` (com uma pasta pessoal limpa, para baixar também os arquivos de formato) e rode `CACHE_TECTONIC=<pasta> ferramentas/empacotar.sh` |

## 8. Como testar

1. **Testes automáticos do Rust:** `cargo test` (leitura do log do LaTeX em `compilador.rs`; códigos de revisão, ids e tabela de revisões em `documentacao.rs`).
2. **Teste manual pelo navegador**, sem precisar de Windows:
   ```bash
   (cd web && npm run build) && cargo build
   ./target/debug/EngLaTeX --servidor --porta 18000 --pasta /tmp/englatex
   ```
   Abra `http://127.0.0.1:18000/` no Chrome/Edge. Na primeira execução é criado o projeto "Exemplo - Memorial de cálculo".
3. **Roteiro mínimo antes de publicar:**
   - [ ] criar projeto de cada modelo e compilar (Tectonic e, se houver, MiKTeX/TeX Live)
   - [ ] erro proposital (`\comandoinexistente`) aparece no painel e na linha
   - [ ] duplo clique no PDF leva ao código; Ctrl+Alt+→ destaca no PDF
   - [ ] variáveis: alterar valor → recompilar → valor novo no PDF
   - [ ] botão direito → inserir tabela (colando do Excel), imagem, equação
   - [ ] corretor sublinha e sugere; trecho em `otherlanguage{english}` verificado em inglês
   - [ ] histórico: salvar versão, comparar, restaurar
   - [ ] documentação técnica: novo documento, nova revisão (código sugerido), marcar como emitida, abrir (pergunta), `\var{tabela_revisoes}` no PDF, excluir revisão
   - [ ] referências: cadastrar norma NBR, citar, compilar (bibliografia aparece)
   - [ ] interface em inglês e espanhol (Configurações → Idioma da interface)
   - [ ] **sem internet**: compilar um projeto novo (usa só o cache)
4. **No Windows de verdade:** abrir o `.exe` do pacote, testar janela, "Salvar PDF como…" e importar .zip (janelas nativas).

Em caso de problema, o registro fica em `Documentos\EngLaTeX\englatex.log`.

## 9. Como publicar uma versão nova

1. Atualize a versão em **`Cargo.toml`** (`version`), **`recursos/app.rc`** (`FILEVERSION`, `PRODUCTVERSION` e as strings) e **`web/package.json`**.
2. Acrescente as novidades em `docs/LEIA-ME.txt`.
3. Rode `ferramentas/empacotar.sh` (precisa do NSIS: `apt install nsis`). Ele gera `release/EngLaTeX-<x.y>-Windows.zip` (portátil) e `release/EngLaTeX-<x.y>-Instalador.exe`.
4. Faça o roteiro de testes da seção 8.
5. Atualize o link de download no topo deste README, apague o .zip da versão anterior de `release/` e faça o commit.

## 10. Licenças

Componentes de terceiros (licenças em [`docs/licencas/`](docs/licencas/)):

- [Tectonic](https://tectonic-typesetting.github.io/): MIT. Os pacotes LaTeX do cache têm licenças próprias (LPPL, GPL, OFL...)
- [CodeMirror 6](https://codemirror.net/) e `@codemirror/merge`: MIT
- [pdf.js](https://mozilla.github.io/pdf.js/): Apache 2.0
- [KaTeX](https://katex.org/): MIT
- WebView2Loader.dll: Microsoft, redistribuível
- Dicionários: [LibreOffice/dictionaries](https://github.com/LibreOffice/dictionaries) e [wooorm/dictionaries](https://github.com/wooorm/dictionaries), com a licença de cada idioma
- Bibliotecas Rust: veja `Cargo.toml` (axum, tokio, wry, tao, rfd, spellbook, zip, flate2, regex, ureq...)

---

Desenvolvido por **DPG Engenharia Mecânica**, Juiz de Fora, MG.
