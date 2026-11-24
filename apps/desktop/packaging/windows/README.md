# Instalador Windows do Eng LaTeX

Este diretório contém o empacotamento do aplicativo desktop legado em um instalador Windows x64 criado com Inno Setup.

## Build local em Windows

Pré-requisitos:

- Windows 10 ou 11 de 64 bits;
- Rust estável via `rustup`;
- Node.js 18 ou superior;
- Inno Setup 6;
- Microsoft Edge WebView2 Runtime;
- acesso à internet para baixar o Tectonic e as dependências JavaScript.

Na raiz de `apps/desktop`:

```powershell
npm ci --prefix web
npm run build --prefix web
cargo build --release
```

Depois, prepare os artefatos:

```powershell
$payload = Join-Path $PWD 'packaging/windows/payload'
New-Item -ItemType Directory -Force $payload | Out-Null
Copy-Item target/release/EngLaTeX.exe $payload
& ./packaging/windows/Get-Tectonic.ps1 -Destination $payload
```

O `WebView2Loader.dll` deve ser colocado em `payload` quando o build do Wry/WebView2 o produzir. Dicionários Hunspell podem ser colocados em `payload/dicionarios`; um `tectonic-cache` pode ser colocado ao lado do executável para distribuição offline. Esses artefatos binários não são versionados no Git.

Compile `EngLaTeX.iss` pelo Inno Setup. O instalador será criado em `dist/desktop/`.

## Garantias do instalador

- instalação por usuário, sem exigir administrador;
- atalho opcional na Área de Trabalho;
- atalho no Menu Iniciar;
- desinstalador registrado;
- compilador, dicionários e cache são opcionais no pacote: sem `tectonic.exe`, a aplicação abre, mas a recompilação LaTeX informa que nenhum compilador foi encontrado;
- os projetos do usuário permanecem em `Documentos/EngLaTeX` e não são removidos pela desinstalação.

A geração oficial acontece no workflow `desktop-windows.yml`, em um runner Windows do GitHub Actions. O ZIP legado da raiz não é alterado pelo processo.
