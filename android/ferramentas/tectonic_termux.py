#!/usr/bin/env python3
"""
tectonic_termux.py - baixa o Tectonic do repositório do Termux e prepara para o APK.

O Termux (terminal Linux para Android) já compila o Tectonic para Android.
Aproveitamos esse binário e as bibliotecas de que ele depende, com dois ajustes
para funcionar dentro de um app comum:

1. O Android só instala, em lib/arm64-v8a, arquivos chamados lib*.so.
   Bibliotecas como libicuuc.so.79 viram libicuuc_79.so, e o próprio
   tectonic vira libtectonic.so. As referências internas (DT_NEEDED/SONAME)
   são trocadas com o patchelf.
2. O RUNPATH (/data/data/com.termux/...) é removido: o app informa a pasta
   das bibliotecas por LD_LIBRARY_PATH (veja Servidor.java).

Uso: tectonic_termux.py <pasta temporária> <pasta lib/arm64-v8a de destino>
Requer: curl, dpkg-deb, readelf, patchelf.
"""
import os
import re
import shutil
import subprocess
import sys
import urllib.request

REPO = "https://packages.termux.dev/apt/termux-main"
# Bibliotecas que o Android já tem: não vão no APK.
DO_SISTEMA = {"libc.so", "libm.so", "libdl.so", "liblog.so", "libandroid.so"}


def baixar_indice():
    """Lê o índice de pacotes aarch64 do Termux: {nome: {campo: valor}}."""
    url = f"{REPO}/dists/stable/main/binary-aarch64/Packages"
    texto = urllib.request.urlopen(url).read().decode("utf-8")
    pacotes = {}
    for bloco in texto.split("\n\n"):
        campos = dict(l.split(": ", 1) for l in bloco.splitlines() if ": " in l and not l.startswith(" "))
        if "Package" in campos:
            pacotes[campos["Package"]] = campos
    return pacotes


def dependencias(pacotes, inicial):
    """Todos os pacotes de que `inicial` depende (recursivo)."""
    fila, vistos = [inicial], set()
    while fila:
        p = fila.pop()
        if p in vistos or p not in pacotes:
            continue
        vistos.add(p)
        for dep in pacotes[p].get("Depends", "").split(","):
            nome = dep.strip().split(" ")[0].split("|")[0]
            if nome:
                fila.append(nome)
    return sorted(vistos)


def needed(caminho):
    """Bibliotecas exigidas por um ELF (DT_NEEDED)."""
    saida = subprocess.run(["readelf", "-d", caminho], capture_output=True, text=True, check=True).stdout
    return re.findall(r"\(NEEDED\).*\[(.*)\]", saida)


def nome_android(soname):
    """libicuuc.so.79 -> libicuuc_79.so ; libz.so.1 -> libz_1.so ; libpng16.so fica igual."""
    if soname.endswith(".so"):
        return soname
    base, _, versao = soname.partition(".so.")
    return f"{base}_{versao.replace('.', '_')}.so"


def main():
    tmp, destino = sys.argv[1], sys.argv[2]
    os.makedirs(tmp, exist_ok=True)
    os.makedirs(destino, exist_ok=True)

    # 1. Baixa e extrai o tectonic e tudo de que ele depende.
    pacotes = baixar_indice()
    raiz = os.path.join(tmp, "raiz")
    for nome in dependencias(pacotes, "tectonic"):
        arquivo = os.path.join(tmp, os.path.basename(pacotes[nome]["Filename"]))
        if not os.path.exists(arquivo):
            urllib.request.urlretrieve(f"{REPO}/{pacotes[nome]['Filename']}", arquivo)
        subprocess.run(["dpkg-deb", "-x", arquivo, raiz], check=True)
    usr = os.path.join(raiz, "data/data/com.termux/files/usr")
    # Atalho usado pelo construir.sh (certificados em usr/etc/tls/cert.pem).
    atalho = os.path.join(tmp, "usr")
    if not os.path.exists(atalho):
        os.symlink(usr, atalho)
    print(f"    Tectonic {pacotes['tectonic']['Version']} do Termux")

    # 2. Só as bibliotecas realmente usadas pelo binário (fechamento de DT_NEEDED).
    pasta_lib = os.path.join(usr, "lib")
    usadas, fila = {}, needed(os.path.join(usr, "bin/tectonic"))
    while fila:
        so = fila.pop()
        if so in DO_SISTEMA or so in usadas:
            continue
        real = os.path.realpath(os.path.join(pasta_lib, so))
        if not os.path.isfile(real):
            sys.exit(f"Biblioteca não encontrada no Termux: {so}")
        usadas[so] = real
        fila += needed(real)

    # 3. Copia com nome lib*.so e corrige as referências.
    def corrigir(arquivo, soname=None):
        cmd = ["patchelf", "--remove-rpath"]
        if soname:
            cmd += ["--set-soname", soname]
        for dep in needed(arquivo):
            if dep in usadas and nome_android(dep) != dep:
                cmd += ["--replace-needed", dep, nome_android(dep)]
        subprocess.run(cmd + [arquivo], check=True)

    for so, real in usadas.items():
        alvo = os.path.join(destino, nome_android(so))
        shutil.copyfile(real, alvo)
        corrigir(alvo, nome_android(so))
    exe = os.path.join(destino, "libtectonic.so")
    shutil.copyfile(os.path.join(usr, "bin/tectonic"), exe)
    corrigir(exe)
    os.chmod(exe, 0o755)
    print(f"    {len(usadas)} bibliotecas: " + ", ".join(sorted(nome_android(s) for s in usadas)))


if __name__ == "__main__":
    main()
