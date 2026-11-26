# Eng LaTeX para Android

O app Android usa **o mesmo programa do PC**. Ele compila o PDF **no próprio aparelho, sem internet**.

| Parte | No PC (Windows) | No Android |
|---|---|---|
| Interface | janela WebView2 | `WebView` (`MainActivity.java`) |
| Servidor (projetos, compilação, variáveis...) | `EngLaTeX.exe` | o mesmo código Rust compilado para `aarch64-linux-android`, instalado como `lib/arm64-v8a/libenglatex.so` e executado como processo (`Servidor.java`) |
| Motor LaTeX | `tectonic.exe` 0.15 | Tectonic 0.17 do repositório do Termux (`libtectonic.so` + bibliotecas) |
| Pacotes LaTeX offline | `tectonic-cache\` | `assets/dados.zip`, extraído na 1ª abertura |
| Projetos | `Documentos\EngLaTeX` | `Android/data/br.com.engenhariadpg.englatex/files/EngLaTeX` |
| "Salvar PDF" / "Salvar .zip" | janela "Salvar como" | grava em `Download/EngLaTeX` e abre o menu **Compartilhar** (WhatsApp, Drive, leitor de PDF) |

O app só roda em aparelhos **arm64** (`arm64-v8a`), que são praticamente todos os celulares e tablets desde 2017. Ele precisa do **Android 8.0** ou mais novo.

## Arquivos

```
android/
├── construir.sh                 gera release/EngLaTeX-<versão>-Android.apk
├── ferramentas/tectonic_termux.py  baixa o Tectonic do Termux e ajusta os nomes das bibliotecas
└── app/
    ├── AndroidManifest.xml
    └── java/br/com/engenhariadpg/englatex/
        ├── MainActivity.java     WebView, seletor de arquivos, compartilhar, links externos
        ├── Servidor.java         extrai os dados, monta o ambiente e inicia o servidor
        └── ProvedorArquivos.java entrega arquivos salvos para outros apps (FileProvider mínimo)
```

As mudanças que o Android exigiu no código do PC ficaram pequenas e ligadas a variáveis de ambiente. O comportamento no Windows não muda.

- `ENGLATEX_PASTA_APP` (`main.rs`): pasta dos dicionários e do `tectonic-cache`.
- `ENGLATEX_TECTONIC` (`compilador.rs`): caminho do tectonic.
- `ENGLATEX_PASTA_EXPORTAR` (`janela.rs`): para onde vão "Salvar PDF" e "Salvar .zip" quando não existe a janela "Salvar como".
- Interface: `ui.js` detecta o app (`NO_ANDROID`, pelo user-agent `EngLaTeXAndroid`). No celular, o editor mostra um painel por vez, com as abas **Arquivos / Código / PDF / Compilar** embaixo (`@media (max-width: 820px)` no `estilo.css`). No tablet deitado, o layout é o mesmo do PC.

## Como gerar o APK (Linux)

1. Ferramentas:
   - `rustup target add aarch64-linux-android`
   - JDK 17 (`javac`, `keytool`)
   - `patchelf`, `dpkg-deb`, `zip`, `python3-pil`, `fonts-liberation`
   - Node.js
2. Baixe do Google o NDK, o build-tools e a plataforma. Os endereços estão em `https://dl.google.com/android/repository/repository2-1.xml`:
   - `android-ndk-r28c-linux.zip`
   - `build-tools_r35.0.1_linux.zip`
   - `platform-35_r02.zip`

   Descompacte tudo numa pasta, por exemplo `/opt/android`.
3. Cache LaTeX offline (Tectonic **0.17**, a mesma versão do app):
   ```bash
   export TECTONIC_CACHE_DIR=/tmp/cache017
   # compile com o tectonic 0.17 (x86_64 Linux) os modelos que devem funcionar offline
   tectonic -X compile main.tex
   ```
   Na próxima versão o script reaproveita sozinho o cache do APK anterior, que fica em `release/`.
4. Gere o APK:
   ```bash
   ANDROID_SDK=/opt/android ANDROID_NDK=/opt/android/android-ndk-r28c \
   CACHE_TECTONIC_ANDROID=/tmp/cache017 \
   ENGLATEX_KEYSTORE=~/englatex-android.keystore ENGLATEX_KEYSTORE_SENHA=... \
   android/construir.sh
   ```

**Chave de assinatura:** use sempre a mesma (`ENGLATEX_KEYSTORE`). Se o APK novo for assinado com outra chave, o Android não aceita a atualização, e será preciso desinstalar o app antes, o que **apaga os projetos** guardados nele. A chave **não** fica no repositório.

## Testes feitos sem aparelho

Foi usado o `qemu-aarch64` com o sistema do emulador oficial do Android 9 (arm64):

- `libtectonic.so --version` roda, e todas as bibliotecas renomeadas são encontradas.
- O modelo "Livro de inspeção de balancim" compila **offline** (`--only-cached`) e gera o PDF.
- O `libenglatex.so` sobe o servidor, lista projetos e salva o .zip em `ENGLATEX_PASTA_EXPORTAR`.

A interface foi testada no Chromium, com tela de 400 px e o user-agent do app.

**Ainda precisa testar num aparelho de verdade:** a primeira abertura (extração do cache), compilar, enviar arquivos, compartilhar o PDF e girar a tela.
