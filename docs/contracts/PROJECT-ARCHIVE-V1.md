# FORGE Project Archive v1 — proposta de interoperabilidade

**Status: PROPOSTA para revisão conjunta IA 1 (Android) / IA 2 (Web). Não aprovada pelo responsável.**  
**Objetivo:** estabelecer um formato portátil de intercâmbio entre os clientes Android e Web, sem compartilhar componentes de interface, implementação de armazenamento ou provedor de nuvem.

## 1. Decisão proposta

Adotar um arquivo ZIP versionado como unidade de exportação/importação do projeto. O ZIP contém um manifesto `forge-project.json` na raiz e os arquivos do projeto sob `files/`.

```text
meu-projeto.forge.zip
├── forge-project.json
└── files/
    ├── main.tex
    ├── capitulos/
    │   └── introducao.tex
    └── imagens/
        └── figura-01.png
```

Os caminhos declarados no manifesto são relativos à raiz lógica do projeto, sem o prefixo `files/`. A localização física dentro do ZIP é `files/{path}`.

## 2. Manifesto candidato

O esquema normativo inicial está em [forge-project-v1.schema.json](./forge-project-v1.schema.json). Exemplo ilustrativo:

```json
{
  "format": "forge-project",
  "formatVersion": "1.0.0",
  "project": {
    "id": "7d7d67e0-7c0a-4a9a-a1d4-21e3c46d63ab",
    "name": "Meu projeto",
    "description": "Documento de demonstração",
    "entryFile": "main.tex",
    "createdAt": "2026-11-23T21:00:00-03:00",
    "updatedAt": "2026-11-23T21:00:00-03:00"
  },
  "files": [
    {
      "path": "main.tex",
      "mediaType": "text/x-tex",
      "encoding": "utf-8",
      "sizeBytes": 128,
      "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    },
    {
      "path": "imagens/figura-01.png",
      "mediaType": "image/png",
      "encoding": "binary",
      "sizeBytes": 2048,
      "sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    }
  ]
}
```

Os valores de hash e tamanho acima são exemplos ilustrativos, não arquivos reais.

## 3. Semântica proposta

- `format` identifica o tipo de pacote; `formatVersion` versiona a estrutura do arquivo, independentemente da versão do app.
- `project.id` é um identificador estável do projeto. Importar/exportar não deve gerar um ID novo silenciosamente; duplicação deve ser uma ação explícita do usuário.
- `entryFile` aponta para um caminho declarado em `files`.
- `files[].path` é único, relativo, normalizado e usa separador `/` (POSIX), independentemente do sistema operacional.
- `encoding=utf-8` indica bytes UTF-8 válidos; `binary` indica conteúdo opaco, preservado byte a byte.
- `sizeBytes` e `sha256` são calculados sobre os bytes descompactados do arquivo, não sobre o ZIP.
- O manifesto é UTF-8. Datas são ISO 8601 com fuso explícito.
- Arquivos não listados no manifesto não fazem parte do projeto e devem ser rejeitados ou reportados na importação; não devem ser incorporados silenciosamente.
- O pacote não contém tokens, credenciais, identificadores de conta, estado OAuth, estado de sincronização, ETags ou IDs específicos de Google Drive.

## 4. Segurança e portabilidade

Importadores devem validar o ZIP antes de gravar qualquer arquivo:

1. Rejeitar caminhos absolutos, letras de unidade, segmentos `.` ou `..`, barras invertidas, NUL, caminhos vazios e entradas fora de `files/` (exceto o manifesto).
2. Rejeitar symlinks, hardlinks, arquivos especiais, entradas duplicadas e colisões de nomes que não sejam portáveis entre sistemas de arquivos case-sensitive/case-insensitive.
3. Validar manifesto, versão, referências, tamanhos, quantidade de entradas e hashes antes de confirmar a importação.
4. Aplicar limites explícitos de tamanho comprimido/descomprimido, quantidade de arquivos, profundidade e razão de compressão. Os valores máximos precisam ser definidos por produto antes da implementação.
5. Extrair em área temporária isolada e só confirmar o projeto depois de todas as verificações; falha não pode deixar importação parcial silenciosa.
6. Não executar scripts, macros ou compilação durante a importação.

## 5. Separação entre arquivo, domínio e sincronização

Este formato é um **formato de intercâmbio**, não uma API HTTP e não um formato interno obrigatório de armazenamento.

- **Arquivo ZIP:** manifesto e bytes de cada arquivo, sem dados de provedor.
- **Modelo de domínio:** projeto, metadados e operações sobre arquivos. Pode ser representado por objetos/DTOs, sem obrigar a carregar todos os conteúdos em uma única resposta.
- **Adaptador de armazenamento:** IndexedDB/arquivos locais/Drive ou outro provedor aprovado. Metadados remotos e estado de sync ficam fora do ZIP.
- **Adaptador de compilação:** capacidade independente, opcional e descoberta explicitamente; o pacote não promete compilação.

A proposta atual da Web em `product-api-v1.json` embute conteúdo de arquivo no objeto de projeto e inclui campos de storage. Isso é útil como rascunho de DTO, mas não deve ser confundido com o manifesto portátil. Recomenda-se separar DTOs/operações de domínio do formato ZIP antes de declarar um contrato compartilhado.

## 6. Operações e conflitos — ainda pendentes

Operações candidatas: criar projeto, listar projetos, abrir projeto, listar arquivos, ler arquivo, gravar arquivo, criar/mover/renomear/excluir arquivo, importar ZIP, exportar ZIP e consultar capacidades.

A semântica de revisão e sincronização precisa ser aprovada em separado. Proposta inicial para discussão:

- gravações locais incrementam uma revisão local monotônica;
- cada arquivo pode ter hash de conteúdo;
- sincronização compara versão remota conhecida e revisão/hash local;
- se a origem remota mudou desde a última leitura, não sobrescrever: preservar as duas versões e marcar conflito;
- resolução de conflito é explícita, sem merge automático de LaTeX no MVP;
- falhas de rede mantêm o conteúdo local e uma operação pendente idempotente;
- erros devem ter código estável, mensagem para usuário e contexto técnico sem conteúdo do documento.

Ainda faltam acordo sobre identificador de revisão remota, operações atômicas, resolução de rename/delete concorrente, política de lixeira e suporte a colaboração simultânea.

## 7. Perguntas para a IA 1 e para o responsável

1. A IA 1 confirma que o plano Android pretende usar ZIP com `forge-project.json` na raiz?
2. O layout `files/{path}` e a lista de descritores atendem ao import/export Android?
3. O projeto precisa suportar arquivos ocultos, pastas vazias, symlinks ou recursos não-LaTeX? A proposta inicial exclui symlinks e não representa pastas vazias.
4. O identificador do projeto deve ser UUID e permanecer estável ao duplicar/importar?
5. Quais limites de tamanho/quantidade devem valer em Android e Web?
6. O responsável aprova este formato como base de intercâmbio ou solicita ajustes?

**Até aprovação conjunta:** este documento e o JSON Schema são apenas propostas. Nenhum cliente deve depender deles como contrato final; Drive, OAuth, sincronização e compilação permanecem fora do escopo implementado.
