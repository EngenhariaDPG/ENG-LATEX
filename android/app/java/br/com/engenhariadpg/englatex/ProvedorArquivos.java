package br.com.engenhariadpg.englatex;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;

/**
 * Entrega arquivos do Eng LaTeX para outros apps (WhatsApp, Drive, leitor de
 * PDF) quando o usuário toca em "Compartilhar". Versão mínima do FileProvider
 * do AndroidX, para não depender de bibliotecas externas.
 *
 * Só libera arquivos dentro das pastas do próprio app e de Download/EngLaTeX,
 * sempre só para leitura.
 */
public class ProvedorArquivos extends ContentProvider {
    static final String AUTORIDADE = "br.com.engenhariadpg.englatex.arquivos";

    /** content://<autoridade>/<caminho absoluto> */
    static Uri uriPara(File f) {
        return new Uri.Builder().scheme("content").authority(AUTORIDADE).encodedPath(Uri.encode(f.getAbsolutePath(), "/")).build();
    }

    private File arquivo(Uri uri) throws FileNotFoundException {
        File f = new File(uri.getPath());
        try {
            String c = f.getCanonicalPath();
            String[] permitidas = {
                    getContext().getExternalFilesDir(null).getCanonicalPath(),
                    getContext().getFilesDir().getCanonicalPath(),
                    Servidor.pastaExportar(getContext()).getCanonicalPath(),
            };
            for (String p : permitidas) if (c.startsWith(p + "/") && f.isFile()) return f;
        } catch (IOException ignorado) { }
        throw new FileNotFoundException(uri.toString());
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String modo) throws FileNotFoundException {
        return ParcelFileDescriptor.open(arquivo(uri), ParcelFileDescriptor.MODE_READ_ONLY);
    }

    /** Nome e tamanho do arquivo (o WhatsApp e outros apps pedem isso). */
    @Override
    public Cursor query(Uri uri, String[] colunas, String sel, String[] args, String ordem) {
        File f;
        try { f = arquivo(uri); } catch (FileNotFoundException e) { return null; }
        MatrixCursor c = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
        c.addRow(new Object[]{f.getName(), f.length()});
        return c;
    }

    @Override
    public String getType(Uri uri) {
        String ext = MimeTypeMap.getFileExtensionFromUrl(uri.toString());
        String tipo = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.toLowerCase());
        return tipo != null ? tipo : "application/octet-stream";
    }

    @Override public boolean onCreate() { return true; }
    @Override public Uri insert(Uri uri, ContentValues v) { return null; }
    @Override public int delete(Uri uri, String s, String[] a) { return 0; }
    @Override public int update(Uri uri, ContentValues v, String s, String[] a) { return 0; }
}
