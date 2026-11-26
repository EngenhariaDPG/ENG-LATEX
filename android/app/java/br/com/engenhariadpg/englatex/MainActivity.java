package br.com.engenhariadpg.englatex;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;

/**
 * Tela única do app: um WebView com a mesma interface do Eng LaTeX do PC,
 * servida pelo servidor local (veja {@link Servidor}).
 *
 * Também faz a ponte com o Android:
 *  - escolher arquivos ("Enviar arquivos", "Importar .zip") pelo seletor do sistema;
 *  - compartilhar PDFs/zips salvos (window.EngAndroid.compartilhar);
 *  - abrir links externos no navegador.
 */
public class MainActivity extends Activity {
    private static final int PEDIDO_ARQUIVOS = 1;

    private WebView web;
    private TextView aviso;
    private ValueCallback<Uri[]> retornoArquivos;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        getWindow().setStatusBarColor(Color.parseColor("#1f2124"));

        FrameLayout raiz = new FrameLayout(this);
        web = new WebView(this);
        web.setVisibility(View.INVISIBLE);
        raiz.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // Mensagem enquanto o servidor inicia (na 1ª vez extrai o cache do LaTeX).
        aviso = new TextView(this);
        aviso.setGravity(Gravity.CENTER);
        aviso.setPadding(48, 48, 48, 48);
        aviso.setTextSize(16);
        aviso.setText("Abrindo o Eng LaTeX…");
        raiz.addView(aviso, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(raiz);

        configurarWebView();
        pedirPermissaoAntiga();

        // Inicia o servidor fora da thread da tela e depois carrega a interface.
        new Thread(() -> {
            try {
                Servidor.iniciar(getApplicationContext(), texto -> runOnUiThread(() -> aviso.setText(texto)));
                runOnUiThread(() -> {
                    if (estado == null || web.getUrl() == null) web.loadUrl(Servidor.URL_BASE);
                    web.setVisibility(View.VISIBLE);
                    aviso.setVisibility(View.GONE);
                });
            } catch (Exception e) {
                runOnUiThread(() -> aviso.setText("Não foi possível iniciar o Eng LaTeX:\n\n" + e.getMessage()));
            }
        }, "inicio-servidor").start();
    }

    private void configurarWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);           // localStorage: larguras, preferências do editor
        s.setAllowFileAccess(false);
        s.setBuiltInZoomControls(false);        // o zoom do PDF é o do próprio Eng LaTeX
        s.setSupportZoom(false);
        s.setTextZoom(100);                     // ignora a escala de fonte do sistema (layout fixo)
        // A interface usa isto para saber que está no Android (ui.js: NO_ANDROID).
        s.setUserAgentString(s.getUserAgentString() + " EngLaTeXAndroid/" + BuildConfigVersao.NOME);
        web.addJavascriptInterface(new Ponte(), "EngAndroid");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                // Links externos (DOI, ajuda...) abrem no navegador do aparelho.
                if (!"127.0.0.1".equals(u.getHost())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException ignorado) { }
                    return true;
                }
                return false;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            // <input type="file">: abre o seletor de arquivos do Android.
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> retorno, FileChooserParams p) {
                if (retornoArquivos != null) retornoArquivos.onReceiveValue(null);
                retornoArquivos = retorno;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try {
                    startActivityForResult(Intent.createChooser(i, "Escolher arquivos"), PEDIDO_ARQUIVOS);
                } catch (ActivityNotFoundException e) {
                    retornoArquivos = null;
                    return false;
                }
                return true;
            }
        });
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent dados) {
        if (pedido != PEDIDO_ARQUIVOS || retornoArquivos == null) {
            super.onActivityResult(pedido, resultado, dados);
            return;
        }
        Uri[] escolhidos = null;
        if (resultado == RESULT_OK && dados != null) {
            ClipData varios = dados.getClipData();
            if (varios != null) {
                escolhidos = new Uri[varios.getItemCount()];
                for (int i = 0; i < varios.getItemCount(); i++) escolhidos[i] = varios.getItemAt(i).getUri();
            } else if (dados.getData() != null) {
                escolhidos = new Uri[]{dados.getData()};
            }
        }
        retornoArquivos.onReceiveValue(escolhidos);
        retornoArquivos = null;
    }

    /** Android 8 a 10 precisam de permissão para gravar na pasta Download. */
    private void pedirPermissaoAntiga() {
        if (Build.VERSION.SDK_INT <= 29
                && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 2);
        }
    }

    /** Voltar: volta uma tela na interface; na tela inicial, sai do app. */
    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else {
            Servidor.parar();
            super.onBackPressed();
        }
    }

    /** Funções que a interface (JavaScript) pode chamar: window.EngAndroid.* */
    private class Ponte {
        /** Abre o menu "Compartilhar" do Android com um arquivo salvo (PDF ou zip). */
        @JavascriptInterface
        public void compartilhar(String caminho, String tipo) {
            runOnUiThread(() -> {
                File f = new File(caminho);
                if (!f.isFile()) {
                    Toast.makeText(MainActivity.this, "Arquivo não encontrado", Toast.LENGTH_SHORT).show();
                    return;
                }
                Uri uri = ProvedorArquivos.uriPara(f);
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType(tipo);
                i.putExtra(Intent.EXTRA_STREAM, uri);
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                // "Abrir com" também aparece, para ver o PDF num leitor.
                Intent ver = new Intent(Intent.ACTION_VIEW);
                ver.setDataAndType(uri, tipo);
                ver.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Intent escolha = Intent.createChooser(i, f.getName());
                escolha.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{ver});
                try { startActivity(escolha); } catch (ActivityNotFoundException ignorado) { }
            });
        }

        /** Versão do app (aparece em Configurações > Sobre). */
        @JavascriptInterface
        public String versao() {
            return BuildConfigVersao.NOME;
        }
    }
}
