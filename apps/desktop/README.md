# Eng LaTeX Desktop

Esta pasta contém uma cópia de trabalho do código desktop legado que estava preservado em `EngLaTeX-1.1-codigo-fonte.zip`. O ZIP original permanece inalterado e continua sendo a referência histórica.

O aplicativo é uma aplicação Rust para Windows 10/11 x64. Ele inicia um servidor HTTP somente em `127.0.0.1` e apresenta a interface em uma janela nativa WebView2. A interface é compilada a partir de `web/` e embutida no executável durante o build.

## Verificação local

```powershell
npm ci --prefix web
npm run build --prefix web
cargo check --locked
cargo build --release --locked
```

O build Windows exige Rust, Node.js e o runtime Microsoft Edge WebView2. Para compilar documentos, o aplicativo precisa encontrar `tectonic.exe`, MiKTeX ou TeX Live.

## Instalador

O empacotamento está em [`packaging/windows`](packaging/windows). O workflow [`desktop-windows.yml`](../../.github/workflows/desktop-windows.yml) compila em `windows-latest`, executa um smoke test do servidor local e publica o instalador Inno Setup como artefato da execução.

O instalador não remove os projetos do usuário em `Documentos/EngLaTeX` durante a desinstalação.

## Estado atual

A interface web interna foi compilada com sucesso no ambiente de auditoria. A compilação Rust e o teste da janela WebView2 precisam ocorrer em Windows, pois o ambiente de desenvolvimento atual não possui a toolchain Rust nem o runtime WebView2. Por isso, um instalador só deve ser considerado release depois de uma execução verde do workflow Windows e de um teste manual da instalação.
