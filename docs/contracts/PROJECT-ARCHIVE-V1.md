# FORGE Project Archive v1 — proposta

**Status: PROPOSTA EM REVISÃO; ainda NÃO APROVADA pelo responsável.**
**Objetivo:** estabelecer um formato portátil de intercâmbio entre os clientes Android e Web, sem compartilhar UI, implementação de armazenamento ou provedor de nuvem.

## 1. Unidade de intercâmbio

Adotar, como candidato, um ZIP versionado como unidade de exportação/importação do projeto. O ZIP contém um manifesto \`forge-project.json\` na raiz e os arquivos listados sob \`files/\`.

\`\`\`text
meu-projeto.forge.zip
├── forge-project.json
└── files/
    ├── main.tex
    ├── capitulos/
    │   └── introducao.tex
    └── imagens/
        └── figura-01.png
\`\`\`

Os caminhos declarados no manifesto são relativos à raiz lógica do projeto, sem o prefixo físico \`files/\`. A entrada ZIP de um arquivo é \`files/{path}\`. A extensão `.forge.zip` usada no exemplo é ilustrativa; a extensão final ainda não foi definida para o projeto Android. O pacote não é API HTTP, formato de armazenamento interno, backup JSON local nem promessa de compilação.

## 2. Manifesto candidato

O schema JSON Schema Draft 2020-12 está em [forge-project-v1.schema.json](./forge-project-v1.schema.json). Exemplo ilustrativo:

\`\`\`json
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
\`\`\`

Hashes e tamanhos são ilustrativos. O projeto deve listar pelo menos um arquivo. \`entryFile\` deve apontar exatamente para um único arquivo listado e esse arquivo deve ser \`encoding=utf-8\`.

## 3. Semântica candidata

- \`format\` identifica o tipo de pacote; \`formatVersion\` versiona o formato, independentemente da versão do aplicativo.
- \`project.id\` é UUID v4 estável. Exportar/importar preserva o ID. Duplicar é uma ação explícita e cria ID novo.
- \`entryFile\` é caminho lógico relativo e deve corresponder exatamente a um descritor em \`files[]\`; o arquivo de entrada precisa ser texto UTF-8 válido.
- \`files[].path\` é relativo, usa separador \`/\` (POSIX) e não inclui o prefixo físico \`files/\`.
- Caminhos devem ser normalizados em Unicode NFC e comparados para colisão usando Unicode Default Case Folding. Colisões após normalização/case-folding são inválidas, mesmo se o sistema de arquivos de origem aceitar os nomes distintos.
- \`encoding=utf-8\` exige bytes UTF-8 válidos; \`binary\` indica conteúdo opaco, preservado byte a byte.
- \`sizeBytes\` e \`sha256\` são calculados sobre os bytes descompactados, não sobre o ZIP. O hash é SHA-256 hexadecimal minúsculo.
- O manifesto é UTF-8; datas são ISO 8601 com fuso explícito.
- O pacote deve conter somente o manifesto e as entradas de arquivo listadas. Entradas de arquivo não listadas são rejeitadas, não incorporadas silenciosamente.
- Não há credenciais, tokens, identificadores de conta, estado OAuth, estado de sincronização, ETags ou IDs de Google Drive no pacote.

## 4. Arquivos, nomes e diretórios

- Preservar arquivos textuais e binários, inclusive imagens, fontes, \`.bib\`, \`.sty\`, \`.cls\` e outros recursos necessários ao projeto.
- Nomes Unicode são permitidos, desde que passem pela normalização e regras de colisão.
- Arquivos ocultos comuns do projeto podem ser incluídos. O exportador deve excluir metadados internos do app, \`.git\` e caches. Suspeita de credenciais/segredos deve gerar aviso e confirmação explícita; nunca exportar conteúdo sensível silenciosamente.
- A v1 não preserva diretórios vazios. Diretórios são inferidos dos caminhos dos arquivos. Entradas ZIP de diretório, quando presentes como estrutura, não criam pastas vazias no projeto importado.
- Symlinks, hardlinks e arquivos especiais (dispositivos, sockets, FIFOs ou tipos não regulares) são rejeitados. A importação não executa scripts, macros ou compilação.
- Não são definidos limites numéricos compartilhados nesta revisão. O limite Android atual de importação de um único \`.tex\` (2 MB) não define limite de ZIP/projeto; os limites do backup JSON exclusivo da Web também não se aplicam ao ZIP.

## 5. Segurança e atomicidade

O importador precisa validar o pacote inteiro antes de gravar no armazenamento definitivo:

1. Aceitar somente \`forge-project.json\` na raiz e arquivos listados sob \`files/{path}\`; rejeitar entradas extras.
2. Rejeitar caminhos absolutos, letras de unidade, segmentos vazios, \`.\` ou \`..\`, barras invertidas, NUL/caracteres de controle, prefixos inesperados e colisões após NFC + case-folding.
3. Rejeitar symlinks, hardlinks, arquivos especiais, entradas duplicadas e tipos de arquivo não regulares.
4. Validar schema, UUID v4, \`entryFile\`, codificação UTF-8, tamanho descompactado, SHA-256 e correspondência biunívoca entre manifesto e entradas ZIP.
5. Definir e aplicar limites para tamanho comprimido/descomprimido, tamanho por arquivo, quantidade de arquivos, profundidade, comprimento de caminho, tamanho do manifesto e razão de compressão. **Os valores numéricos continuam pendentes de decisão e medição em ambos os clientes. A validação local da UI Web pode impor limites próprios de UX, mas eles não se tornam limites normativos do ZIP.**
6. Detectar ZIP bombs e abortar antes de exceder memória, disco ou quota.
7. Extrair para área temporária isolada; confirmar o projeto em operação atômica somente depois de todas as verificações. Falha não pode deixar importação parcial silenciosa.
8. Não executar nem compilar qualquer conteúdo importado.

O JSON Schema verifica estrutura e alguns campos; não consegue, sozinho, comprovar hashes, bytes, referências entre campos, unicidade de caminhos após normalização, tipo real da entrada ZIP ou limites do arquivo compactado. Essas validações são obrigatórias no importador.

## 6. IDs, duplicação e conflito de importação

- Exportar/importar preserva UUID v4 do projeto.
- Duplicar cria UUID v4 novo.
- Se o ID importado já existir localmente, nunca substituir silenciosamente. O produto deverá oferecer cancelar, abrir/manter o existente, importar como cópia com ID novo ou substituir após confirmação inequívoca.
- A escolha de resolução deve preservar o conteúdo local até a confirmação.
- Revisões monotônicas, conflitos de sincronização, rename/delete concorrente, lixeira e colaboração simultânea não são definidos pelo ZIP e dependem de decisão separada.

## 7. Separação entre arquivo, domínio e sincronização

- **Arquivo ZIP:** manifesto e bytes de cada arquivo, sem dados de provedor.
- **Modelo de domínio:** projeto, metadados e operações sobre arquivos; não obriga carregar todos os conteúdos numa única resposta.
- **Adaptador de armazenamento:** IndexedDB/arquivos locais/Drive ou outro provedor aprovado. Metadados remotos e estado de sync ficam fora do ZIP.
- **Adaptador de compilação:** capacidade independente, opcional e descoberta explicitamente; o pacote não promete compilação.

A proposta Web anterior em \`product-api-v1.json\` embute conteúdo de arquivo no objeto de projeto e inclui campos de storage. É um rascunho de DTO, não manifesto portátil nem API compartilhada aprovada. DTOs/operações de domínio devem permanecer separados da serialização ZIP.

## 8. Estado de implementação Android considerado

Com base nos requisitos e informações técnicas disponíveis para o projeto Android:

- ZIP + \`forge-project.json\` permanece uma proposta; não há contrato JSON/ZIP implementado no app.
- O app Android atual lista/cria projetos locais, importa um \`.tex\` de até 2 MB, edita \`main.tex\` e usa armazenamento privado via \`expo-file-system\`. Não há árvore multi-arquivo, import/export de projeto, backup ou sync.
- IDs Android ainda são temporários, baseados em horário/aleatoriedade; UUID v4 precisa ser adotado antes do ZIP.
- A prova de compilação Android não foi executada; não há engine integrada nem botão de compilação. A hipótese Tectonic/TeXslate ainda requer prova real em Development Build/dispositivo.
- Drive/OAuth, estados remotos e sincronização não estão implementados.
- A proposta não é um contrato normativo e depende de aprovação do responsável.

## 9. Decisões ainda necessárias do responsável

1. Aprovar ou ajustar ZIP + manifesto como formato canônico de intercâmbio.
2. Aprovar UUID v4 estável e os fluxos de colisão/importação (cancelar, abrir, copiar, substituir).
3. Confirmar política de arquivos ocultos, exclusão de \`.git\`/cache/metadados e aviso de possíveis segredos.
4. Confirmar que diretórios vazios ficam fora da v1.
5. Definir limites numéricos compartilhados após medições Android/Web.
6. Definir política de compatibilidade de versões do manifesto e importadores.
7. Decidir separadamente se e quando revisão monotônica, sincronização e resolução de conflitos entram no produto.

**Até a decisão do responsável:** este documento e o schema são propostas revisadas, não contrato final. Nenhum cliente deve depender deles como formato normativo. Drive, OAuth, sincronização e compilação permanecem fora do escopo implementado.
