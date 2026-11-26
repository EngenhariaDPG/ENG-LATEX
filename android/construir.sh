#!/usr/bin/env bash
# =============================================================================
# construir.sh - gera o APK do Eng LaTeX para Android (arm64)
# -----------------------------------------------------------------------------
# Não usa Gradle nem Android Studio: só as ferramentas de linha de comando do
# SDK (aapt2, d8, zipalign, apksigner), o NDK (para compilar o servidor Rust)
# e o javac. Assim o build é curto, previsível e fácil de manter.
#
# O que entra no APK:
#   lib/arm64-v8a/libenglatex.so   servidor do Eng LaTeX (o mesmo código do PC,
#                                  compilado para Android; é um EXECUTÁVEL)
#   lib/arm64-v8a/libtectonic.so   motor LaTeX Tectonic (pacote do Termux)
#   lib/arm64-v8a/lib*.so          bibliotecas do Tectonic (ICU, HarfBuzz...)
#   assets/dados.zip               cache LaTeX offline, dicionários, certificados
#   classes.dex                    app Java (android/app/java)
#
# Requisitos (veja android/LEIA-ME.md):
#   ANDROID_SDK  pasta com build-tools (aapt2, d8...) e android.jar
#   ANDROID_NDK  pasta do NDK (r26 ou mais novo)
#   rustup target add aarch64-linux-android ; javac (JDK 17) ; patchelf ; python3 + Pillow
#   CACHE_TECTONIC_ANDROID  cache do Tectonic 0.17 (opcional: se faltar, reaproveita
#                           o do APK anterior em release/)
#   ENGLATEX_KEYSTORE / ENGLATEX_KEYSTORE_SENHA  chave de assinatura (guarde bem:
#                           sem ela o Android não aceita atualizar o app instalado)
#
# Uso:  android/construir.sh        -> release/EngLaTeX-<versão>-Android.apk
# =============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
AND="$RAIZ/android"
TMP="$RAIZ/target/android-build"
SAIDA="$RAIZ/release"

: "${ANDROID_SDK:?defina ANDROID_SDK}"
: "${ANDROID_NDK:?defina ANDROID_NDK}"
# Aceita o layout do sdkmanager (build-tools/35.0.1, platforms/android-35) e o
# dos zips soltos do Google (android-15, android-35).
shopt -s nullglob
BT=""; ANDROID_JAR=""
for d in "$ANDROID_SDK"/build-tools/* "$ANDROID_SDK"/android-*; do [[ -x "$d/aapt2" ]] && BT="$d"; done
for j in "$ANDROID_SDK"/platforms/*/android.jar "$ANDROID_SDK"/android-*/android.jar; do ANDROID_JAR="$j"; done
shopt -u nullglob
[[ -n "$BT" && -n "$ANDROID_JAR" ]] || { echo "build-tools ou android.jar não encontrados em $ANDROID_SDK"; exit 1; }
CLANG="$ANDROID_NDK/toolchains/llvm/prebuilt/linux-x86_64/bin"

# Versão: a mesma do Cargo.toml (1.3.0 -> versionCode 10300)
VERSAO="$(grep -m1 '^version' "$RAIZ/Cargo.toml" | cut -d'"' -f2)"
IFS=. read -r MA MI PA <<<"$VERSAO"
VERSAO_CODIGO=$((MA * 10000 + MI * 100 + PA))
echo "==> Eng LaTeX $VERSAO para Android (versionCode $VERSAO_CODIGO)"

rm -rf "$TMP" && mkdir -p "$TMP"/{lib/arm64-v8a,assets,dados,res,classes,termux}
LIBS="$TMP/lib/arm64-v8a"

# -----------------------------------------------------------------------------
# 1. Interface web + servidor Rust para Android
# -----------------------------------------------------------------------------
echo "==> Interface web"
(cd "$RAIZ/web" && npm ci --silent && npm run build --silent)
echo "==> Servidor (Rust -> aarch64-linux-android)"
export CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER="$CLANG/aarch64-linux-android26-clang"
export CC_aarch64_linux_android="$CLANG/aarch64-linux-android26-clang"
export AR_aarch64_linux_android="$CLANG/llvm-ar"
(cd "$RAIZ" && cargo build --release --target aarch64-linux-android)
cp "$RAIZ/target/aarch64-linux-android/release/EngLaTeX" "$LIBS/libenglatex.so"

# -----------------------------------------------------------------------------
# 2. Tectonic e bibliotecas (pacotes do Termux, renomeados para lib*.so)
# -----------------------------------------------------------------------------
echo "==> Tectonic (Termux)"
python3 "$AND/ferramentas/tectonic_termux.py" "$TMP/termux" "$LIBS"

# -----------------------------------------------------------------------------
# 3. assets/dados.zip: cache LaTeX, dicionários e certificados
# -----------------------------------------------------------------------------
echo "==> Dados (cache LaTeX offline, dicionários)"
if [[ -n "${CACHE_TECTONIC_ANDROID:-}" ]]; then
  cp -r "$CACHE_TECTONIC_ANDROID" "$TMP/dados/tectonic-cache"
else
  ANTERIOR="$(ls -t "$SAIDA"/EngLaTeX-*-Android.apk 2>/dev/null | head -1 || true)"
  [[ -n "$ANTERIOR" ]] || { echo "Defina CACHE_TECTONIC_ANDROID (não há APK anterior para reaproveitar)"; exit 1; }
  echo "    reaproveitando o cache de $(basename "$ANTERIOR")"
  unzip -q -p "$ANTERIOR" assets/dados.zip > "$TMP/anterior.zip"
  unzip -q "$TMP/anterior.zip" 'tectonic-cache/*' -d "$TMP/dados"
fi
rm -rf "$TMP/dados/tectonic-cache/.teste-gravacao"
mkdir -p "$TMP/dados/dicionarios"
cp "$RAIZ/dicionarios/"* "$TMP/dados/dicionarios/" 2>/dev/null || \
  unzip -q -j "$(ls -t "$SAIDA"/EngLaTeX-*-Windows.zip | head -1)" 'EngLaTeX/dicionarios/*' -d "$TMP/dados/dicionarios"
cp "$TMP/termux/usr/etc/tls/cert.pem" "$TMP/dados/cert.pem"
# Liberation Sans/Serif/Mono: mesmas medidas de Arial/Times/Courier (o Android
# não tem Arial). Licença SIL OFL. Ficam em app/fontes (veja Servidor.java).
mkdir -p "$TMP/dados/fontes"
cp /usr/share/fonts/truetype/liberation/Liberation{Sans,Serif,Mono}-*.ttf "$TMP/dados/fontes/" 2>/dev/null || \
  echo "    aviso: fontes Liberation não encontradas (apt install fonts-liberation)"
(cd "$TMP/dados" && zip -q -r -9 "$TMP/assets/dados.zip" .)

# -----------------------------------------------------------------------------
# 4. Recursos (ícone) e manifesto
# -----------------------------------------------------------------------------
echo "==> Recursos"
python3 - "$RAIZ/recursos/icone64.png" "$TMP/res" <<'PY'
# Gera o ícone do app nos tamanhos do Android a partir do ícone do PC.
import sys, os
from PIL import Image
origem, res = sys.argv[1], sys.argv[2]
im = Image.open(origem).convert("RGBA")
for pasta, lado in {"mipmap-mdpi": 48, "mipmap-hdpi": 72, "mipmap-xhdpi": 96, "mipmap-xxhdpi": 144, "mipmap-xxxhdpi": 192}.items():
    os.makedirs(os.path.join(res, pasta), exist_ok=True)
    im.resize((lado, lado), Image.LANCZOS).save(os.path.join(res, pasta, "ic_launcher.png"))
PY
sed -e "s/@VERSION_CODE@/$VERSAO_CODIGO/" -e "s/@VERSION_NAME@/$VERSAO/" "$AND/app/AndroidManifest.xml" > "$TMP/AndroidManifest.xml"

"$BT/aapt2" compile --dir "$TMP/res" -o "$TMP/res.zip"
"$BT/aapt2" link -o "$TMP/base.apk" -I "$ANDROID_JAR" --manifest "$TMP/AndroidManifest.xml" \
  -A "$TMP/assets" "$TMP/res.zip" --auto-add-overlay

# -----------------------------------------------------------------------------
# 5. Código Java -> classes.dex
# -----------------------------------------------------------------------------
echo "==> Java"
mkdir -p "$TMP/gerado/br/com/engenhariadpg/englatex"
cat > "$TMP/gerado/br/com/engenhariadpg/englatex/BuildConfigVersao.java" <<JAVA
package br.com.engenhariadpg.englatex;
/** Gerado pelo construir.sh: versão do app. */
final class BuildConfigVersao { static final String NOME = "$VERSAO"; private BuildConfigVersao() {} }
JAVA
# core-lambda-stubs.jar (vem no build-tools) permite usar lambdas no Java 8.
if ! javac -source 8 -target 8 -nowarn -encoding UTF-8 -Xlint:-options \
    -bootclasspath "$ANDROID_JAR" -classpath "$BT/core-lambda-stubs.jar" -d "$TMP/classes" \
    $(find "$AND/app/java" "$TMP/gerado" -name '*.java') > "$TMP/javac.log" 2>&1; then
  cat "$TMP/javac.log"; exit 1
fi
"$BT/d8" --release --min-api 26 --lib "$ANDROID_JAR" --output "$TMP" $(find "$TMP/classes" -name '*.class')

# -----------------------------------------------------------------------------
# 6. Monta, alinha e assina o APK
# -----------------------------------------------------------------------------
echo "==> APK"
cp "$TMP/base.apk" "$TMP/sem-assinatura.apk"
(cd "$TMP" && zip -q "$TMP/sem-assinatura.apk" classes.dex && zip -q -r "$TMP/sem-assinatura.apk" lib)
"$BT/zipalign" -f -p 4 "$TMP/sem-assinatura.apk" "$TMP/alinhado.apk"

KS="${ENGLATEX_KEYSTORE:-$HOME/.englatex-android.keystore}"
SENHA="${ENGLATEX_KEYSTORE_SENHA:-englatex}"
if [[ ! -f "$KS" ]]; then
  echo "    criando chave de assinatura em $KS (GUARDE ESTE ARQUIVO)"
  keytool -genkeypair -keystore "$KS" -storepass "$SENHA" -keypass "$SENHA" -alias englatex \
    -keyalg RSA -keysize 3072 -validity 20000 -dname "CN=Eng LaTeX, O=DPG Engenharia, L=Juiz de Fora, ST=MG, C=BR" >/dev/null 2>&1
fi
mkdir -p "$SAIDA"
APK="$SAIDA/EngLaTeX-$MA.$MI-Android.apk"
"$BT/apksigner" sign --v4-signing-enabled false --ks "$KS" --ks-pass "pass:$SENHA" --ks-key-alias englatex --out "$APK" "$TMP/alinhado.apk"
"$BT/apksigner" verify "$APK"
echo "==> Pronto: $APK ($(du -h "$APK" | cut -f1))"
