#!/usr/bin/env bash
# =============================================================================
# Monta o pacote de distribuição do Eng LaTeX para Windows (pasta + .zip).
#
# Roda no Linux (compilação cruzada para Windows com MinGW) ou no Windows
# dentro do Git Bash (compilação nativa). Passos:
#   1. gera a interface (web/dist) com o npm;
#   2. compila o EngLaTeX.exe;
#   3. junta exe + WebView2Loader.dll + tectonic.exe + dicionários + cache
#      do Tectonic + manual + licenças numa pasta "pacote/EngLaTeX";
#   4. compacta em release/EngLaTeX-<versão>-Windows.zip.
#
# Uso:
#   ferramentas/empacotar.sh                 # usa o cache do Tectonic do último pacote
#   CACHE_TECTONIC=/caminho ferramentas/empacotar.sh
#
# Pré-requisitos no Linux:
#   rustup target add x86_64-pc-windows-gnu
#   apt install mingw-w64 zip unzip curl
# =============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ"

VERSAO="$(grep -m1 '^version' Cargo.toml | cut -d'"' -f2)"
TECTONIC_VERSAO="0.15.0"
DESTINO="$RAIZ/pacote/EngLaTeX"
ZIP_FINAL="$RAIZ/release/EngLaTeX-${VERSAO%.*}-Windows.zip"   # 1.3.0 -> EngLaTeX-1.3-Windows.zip
LO="https://raw.githubusercontent.com/LibreOffice/dictionaries/master"

echo "== Eng LaTeX $VERSAO =="

# --- 1. Interface -------------------------------------------------------------
echo "-> Gerando a interface (web/dist)"
( cd web && npm ci --no-audit --no-fund && npm run build )

# --- 2. Executável --------------------------------------------------------------
if [[ "$(uname -s)" == MINGW* || "$(uname -s)" == MSYS* ]]; then
  echo "-> Compilando (Windows nativo)"
  cargo build --release
  EXE="target/release/EngLaTeX.exe"
else
  echo "-> Compilando para Windows (MinGW)"
  cargo build --release --target x86_64-pc-windows-gnu
  EXE="target/x86_64-pc-windows-gnu/release/EngLaTeX.exe"
fi

# --- 3. Monta a pasta -----------------------------------------------------------
echo "-> Montando $DESTINO"
rm -rf "$DESTINO"
mkdir -p "$DESTINO/dicionarios" "$DESTINO/licencas"
cp "$EXE" "$DESTINO/"
cp docs/LEIA-ME.txt "$DESTINO/"
cp docs/licencas/* "$DESTINO/licencas/"

# WebView2Loader.dll vem junto com o crate webview2-com-sys (baixado pelo cargo).
DLL="$(find "${CARGO_HOME:-$HOME/.cargo}/registry/src" -path '*webview2-com-sys*/x64/WebView2Loader.dll' | head -n1)"
[[ -n "$DLL" ]] || { echo "ERRO: WebView2Loader.dll não encontrada (rode o cargo build antes)"; exit 1; }
cp "$DLL" "$DESTINO/"

# Tectonic (compilador LaTeX embutido).
TMP="$(mktemp -d)"
curl -sSL -o "$TMP/tectonic.zip" \
  "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSAO}/tectonic-${TECTONIC_VERSAO}-x86_64-pc-windows-msvc.zip"
unzip -q -o "$TMP/tectonic.zip" -d "$TMP"
cp "$TMP/tectonic.exe" "$DESTINO/"

# Dicionários que vêm com o programa (os outros são baixados dentro dele).
curl -sSL -o "$DESTINO/dicionarios/pt_BR.aff" "$LO/pt_BR/pt_BR.aff"
curl -sSL -o "$DESTINO/dicionarios/pt_BR.dic" "$LO/pt_BR/pt_BR.dic"
curl -sSL -o "$DESTINO/dicionarios/en_US.aff" "$LO/en/en_US.aff"
curl -sSL -o "$DESTINO/dicionarios/en_US.dic" "$LO/en/en_US.dic"
curl -sSL -o "$DESTINO/dicionarios/LICENCA-pt_BR.txt" "$LO/pt_BR/README_pt_BR.txt"
curl -sSL -o "$DESTINO/dicionarios/LICENCA-en_US.txt" "$LO/en/README_en_US.txt"

# Cache do Tectonic (pacotes LaTeX para funcionar offline).
# Por padrão reaproveita o cache do pacote publicado em release/.
if [[ -n "${CACHE_TECTONIC:-}" ]]; then
  cp -r "$CACHE_TECTONIC" "$DESTINO/tectonic-cache"
else
  ANTERIOR="$(ls -1 release/EngLaTeX-*-Windows.zip 2>/dev/null | sort -V | tail -n1 || true)"
  if [[ -n "$ANTERIOR" ]]; then
    unzip -q -o "$ANTERIOR" 'EngLaTeX/tectonic-cache/*' -d "$TMP"
    cp -r "$TMP/EngLaTeX/tectonic-cache" "$DESTINO/"
  else
    echo "AVISO: sem cache do Tectonic; o pacote vai precisar de internet na 1ª compilação."
  fi
fi
rm -rf "$TMP"

# --- 4. Compacta ----------------------------------------------------------------
echo "-> Compactando $ZIP_FINAL"
mkdir -p release
rm -f "$ZIP_FINAL"
( cd "$RAIZ/pacote" && zip -qr9 "$ZIP_FINAL" EngLaTeX )
ls -lh "$ZIP_FINAL"

# --- 5. Instalador (setup .exe) -----------------------------------------------------
# Mesmo conteúdo do .zip, com atalhos, desinstalador e registro no Windows.
# Requer o NSIS (Linux: apt install nsis). Veja ferramentas/instalador.nsi.
INSTALADOR="$RAIZ/release/EngLaTeX-${VERSAO%.*}-Instalador.exe"
if command -v makensis >/dev/null; then
  echo "-> Gerando $INSTALADOR"
  makensis -V2 -DVERSAO="$VERSAO" -DPACOTE="$RAIZ/pacote/EngLaTeX" -DSAIDA="$INSTALADOR" \
    "$RAIZ/ferramentas/instalador.nsi"
  ls -lh "$INSTALADOR"
else
  echo "AVISO: makensis não encontrado; instalador não gerado (apt install nsis)."
fi
echo "Pronto."
