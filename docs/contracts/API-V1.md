# FORGE Product API v1 — proposta de contrato

**Versão do contrato:** 1.0.0  
**Estado:** especificação conceitual; não há servidor HTTP implantado.

## Recursos de domínio
- Project: id, name, description, documentKind, createdAt, updatedAt, revision, entryFile, files, storage.
- ProjectFile: path relativo, mediaType, contentEncoding, content, sha256, modifiedAt.
- StorageState: provider (local/google-drive), providerFileId, syncState, remoteVersion.
- CompileResult (futuro): jobId, status, diagnostics[], artifactRef, engine/version. Nenhum resultado é produzido no MVP atual.

O schema normativo do objeto Project está em product-api-v1.json. Clientes devem ignorar campos opcionais desconhecidos e rejeitar schemaVersion major incompatível.

## Operações propostas (sem endpoint público ainda)
| Operação | Semântica |
|---|---|
| CreateProject | Criar projeto local ou no provider escolhido após consentimento. |
| GetProject | Ler manifesto e arquivos; não enumerar todo o Drive sem escopo aprovado. |
| UpdateProject | Atualizar por revisão esperada; retornar conflito se a versão remota avançou. |
| DeleteProject | Exigir confirmação; lixeira/recuperação antes de exclusão definitiva quando o provider permitir. |
| ImportProject | Validar caminhos, tamanho, tipos e manifesto antes de persistir. |
| ExportProject | Gerar arquivo(s) para download/compartilhamento explícito. |
| CompileProject | Não disponível em v1 MVP. Operação futura assíncrona e isolada. |

## Regras de compatibilidade
- Versionamento semântico do contrato: mudança incompatível incrementa major.
- Identificadores de provider são opacos e nunca substituem o ID de domínio.
- Path sempre relativo, normalizado, sem traversal, caminhos absolutos ou colisões case-insensitive.
- Conteúdo binário usa base64; texto usa UTF-8. Hash SHA-256 opcional no MVP e recomendado para sincronização.
- Atualização deve receber revision/remoteVersion esperada. Conflitos não podem sobrescrever silenciosamente dados.
- Web e Android implementam interfaces visuais próprias e consomem o mesmo modelo de domínio; não compartilham componentes UI.
- Credenciais OAuth não fazem parte do contrato Project nem do manifesto persistido.

## Adaptadores
ProjectRepository: list/get/create/update/delete/import/export.  
StorageAdapter: local, browser storage e futuramente Drive.  
CompileAdapter: disabled no MVP; futuro WASM/helper/remote por decisão arquitetural separada.

## Exemplo mínimo
```json
{
  "schemaVersion": "1.0.0",
  "project": {
    "id": "prj_01",
    "name": "Relatório técnico",
    "documentKind": "latex",
    "createdAt": "2026-11-23T18:00:00Z",
    "updatedAt": "2026-11-23T18:00:00Z",
    "revision": 1,
    "entryFile": "main.tex",
    "files": [{
      "path": "main.tex",
      "mediaType": "text/x-tex",
      "contentEncoding": "utf-8",
      "content": "\\documentclass{article}"
    }],
    "storage": { "provider": "local", "syncState": "local-only" }
  }
}
```
