package br.com.engenhariadpg.englatex;

import android.content.Context;
import android.content.res.AssetManager;
import android.os.Build;
import android.os.Environment;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Prepara e inicia o servidor do Eng LaTeX no próprio aparelho.
 *
 * O app Android reaproveita TODO o programa do PC: o servidor em Rust
 * (compilado para Android como lib/arm64-v8a/libenglatex.so) e a mesma
 * interface web, mostrada num WebView. O Tectonic (motor LaTeX) vem como
 * lib/arm64-v8a/libtectonic.so, com as bibliotecas de que ele precisa.
 *
 * Pastas usadas:
 *  - filesDir/app            dicionários, tectonic-cache, fonts.conf (extraídos de assets/dados.zip)
 *  - externalFilesDir/EngLaTeX  projetos, modelos e documentação técnica
 *                            (Android/data/br.com.engenhariadpg.englatex/files/EngLaTeX)
 *  - Download/EngLaTeX       PDFs e .zip salvos pelo usuário ("Salvar PDF")
 */
final class Servidor {
    /** Porta fixa do servidor local (só aceita conexões do próprio aparelho). */
    static final int PORTA = 47811;
    static final String URL_BASE = "http://127.0.0.1:" + PORTA + "/";

    /** Processo do servidor iniciado por este app (null se já estava rodando). */
    private static Process processo;

    private Servidor() {}

    /**
     * Garante que o servidor está no ar. Pode demorar alguns segundos na
     * primeira execução (extração do cache LaTeX). Rode fora da thread da tela.
     */
    static synchronized void iniciar(Context ctx, Progresso progresso) throws IOException {
        if (respondendo()) return;

        File pastaApp = new File(ctx.getFilesDir(), "app");
        extrairDadosSeNecessario(ctx, pastaApp, progresso);
        File fontsConf = escreverFontsConf(ctx, pastaApp);

        String libs = ctx.getApplicationInfo().nativeLibraryDir;
        File dados = new File(ctx.getExternalFilesDir(null), "EngLaTeX");
        //noinspection ResultOfMethodCallIgnored
        dados.mkdirs();

        progresso.mensagem("Iniciando o Eng LaTeX…");
        ProcessBuilder pb = new ProcessBuilder(
                libs + "/libenglatex.so", "--servidor",
                "--porta", String.valueOf(PORTA),
                "--pasta", dados.getAbsolutePath());
        Map<String, String> env = pb.environment();
        // As bibliotecas do Tectonic ficam junto com as do app.
        env.put("LD_LIBRARY_PATH", libs);
        // Avisos ao servidor (veja main.rs, compilador.rs e janela.rs).
        env.put("ENGLATEX_PASTA_APP", pastaApp.getAbsolutePath());
        env.put("ENGLATEX_TECTONIC", libs + "/libtectonic.so");
        env.put("ENGLATEX_PASTA_EXPORTAR", pastaExportar(ctx).getAbsolutePath());
        // Ambiente do Tectonic: fontes do Android, certificados e pastas temporárias.
        env.put("FONTCONFIG_FILE", fontsConf.getAbsolutePath());
        env.put("SSL_CERT_FILE", new File(pastaApp, "cert.pem").getAbsolutePath());
        env.put("HOME", ctx.getFilesDir().getAbsolutePath());
        env.put("TMPDIR", ctx.getCacheDir().getAbsolutePath());
        env.put("XDG_CACHE_HOME", ctx.getCacheDir().getAbsolutePath());
        pb.directory(ctx.getFilesDir());
        pb.redirectErrorStream(true);
        pb.redirectOutput(new File(ctx.getFilesDir(), "servidor.log"));
        processo = pb.start();

        // Espera o servidor responder (até ~20 s).
        for (int i = 0; i < 100; i++) {
            if (respondendo()) return;
            if (!vivo(processo)) break;
            try { Thread.sleep(200); } catch (InterruptedException e) { break; }
        }
        throw new IOException("O servidor do Eng LaTeX não iniciou. Veja " +
                new File(ctx.getFilesDir(), "servidor.log").getAbsolutePath());
    }

    /** O servidor responde em /api/ping? */
    static boolean respondendo() {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(URL_BASE + "api/ping").openConnection();
            c.setConnectTimeout(300);
            c.setReadTimeout(800);
            boolean ok = c.getResponseCode() == 200;
            c.disconnect();
            return ok;
        } catch (IOException e) {
            return false;
        }
    }

    private static boolean vivo(Process p) {
        try { p.exitValue(); return false; } catch (IllegalThreadStateException e) { return true; }
    }

    /** Encerra o servidor (ao fechar o app pelo botão Voltar). */
    static synchronized void parar() {
        if (processo != null) {
            processo.destroy();
            processo = null;
        }
    }

    /**
     * Pasta onde "Salvar PDF" e "Salvar .zip" gravam: Download/EngLaTeX.
     * Se o Android não deixar gravar lá, usa a pasta Exportados do app.
     */
    static File pastaExportar(Context ctx) {
        File download = new File(Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS), "EngLaTeX");
        if (podeGravar(download)) return download;
        return new File(ctx.getExternalFilesDir(null), "Exportados");
    }

    private static boolean podeGravar(File pasta) {
        try {
            //noinspection ResultOfMethodCallIgnored
            pasta.mkdirs();
            File teste = new File(pasta, ".teste");
            try (FileOutputStream f = new FileOutputStream(teste)) { f.write(1); }
            return teste.delete();
        } catch (Exception e) {
            return false;
        }
    }

    // -------------------------------------------------------------------
    // assets/dados.zip -> filesDir/app (só na 1ª vez e a cada versão nova)
    // -------------------------------------------------------------------

    private static void extrairDadosSeNecessario(Context ctx, File pastaApp, Progresso progresso) throws IOException {
        long versao;
        try {
            versao = Build.VERSION.SDK_INT >= 28
                    ? ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0).getLongVersionCode()
                    : ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0).versionCode;
        } catch (Exception e) {
            versao = 0;
        }
        File marca = new File(pastaApp, ".versao-" + versao);
        if (marca.exists()) return;

        progresso.mensagem("Preparando o LaTeX offline (só na primeira vez)…");
        apagar(pastaApp);
        //noinspection ResultOfMethodCallIgnored
        pastaApp.mkdirs();
        AssetManager assets = ctx.getAssets();
        try (ZipInputStream zip = new ZipInputStream(new BufferedInputStream(assets.open("dados.zip"), 1 << 16))) {
            byte[] buffer = new byte[1 << 16];
            ZipEntry e;
            int n = 0;
            while ((e = zip.getNextEntry()) != null) {
                File destino = new File(pastaApp, e.getName());
                // Segurança: não deixa o zip escrever fora da pasta.
                if (!destino.getCanonicalPath().startsWith(pastaApp.getCanonicalPath())) continue;
                if (e.isDirectory()) {
                    //noinspection ResultOfMethodCallIgnored
                    destino.mkdirs();
                    continue;
                }
                //noinspection ResultOfMethodCallIgnored
                destino.getParentFile().mkdirs();
                try (OutputStream out = new FileOutputStream(destino)) {
                    int lidos;
                    while ((lidos = zip.read(buffer)) > 0) out.write(buffer, 0, lidos);
                }
                if (++n % 200 == 0) progresso.mensagem("Preparando o LaTeX offline… " + n + " arquivos");
            }
        }
        //noinspection ResultOfMethodCallIgnored
        marca.createNewFile();
    }

    /** fonts.conf do fontconfig apontando para as fontes do Android. */
    private static File escreverFontsConf(Context ctx, File pastaApp) throws IOException {
        File pasta = new File(pastaApp, "fontconfig");
        //noinspection ResultOfMethodCallIgnored
        pasta.mkdirs();
        File conf = new File(pasta, "fonts.conf");
        String xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE fontconfig SYSTEM \"fonts.dtd\">\n<fontconfig>\n"
                + "  <dir>/system/fonts</dir>\n"
                + "  <dir>" + new File(pastaApp, "fontes").getAbsolutePath() + "</dir>\n"
                + "  <cachedir>" + new File(ctx.getCacheDir(), "fontconfig").getAbsolutePath() + "</cachedir>\n"
                + "</fontconfig>\n";
        try (OutputStream out = new FileOutputStream(conf)) { out.write(xml.getBytes("UTF-8")); }
        return conf;
    }

    private static void apagar(File f) {
        File[] filhos = f.listFiles();
        if (filhos != null) for (File c : filhos) apagar(c);
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }

    /** Recebe mensagens de progresso para mostrar na tela de abertura. */
    interface Progresso {
        void mensagem(String texto);
    }
}
