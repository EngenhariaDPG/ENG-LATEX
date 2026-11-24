# Manifesto de projeto técnico v1 — proposta

**Estado:** proposta; não é ainda um contrato implementado.

O manifesto liga um projeto LaTeX aos dados e anexos de documentação técnica sem substituir o contrato geral de projeto.

```json
{
  "schemaVersion": "technical-project-1.0.0",
  "projectId": "uuid-v4",
  "documentKind": "technical-book",
  "technicalDocument": {
    "type": "inspection-book",
    "equipmentFamily": "suspended-platform",
    "templateId": "forge.suspended-platform.inspection-book",
    "templateVersion": "0.1.0",
    "status": "draft",
    "revision": 1,
    "sourceDocuments": [
      {
        "path": "manuais/manual-fabricante.pdf",
        "kind": "manufacturer-manual",
        "label": "Manual técnico",
        "version": "informada pelo usuário"
      }
    ]
  },
  "dataFiles": [
    "dados/empresa.json",
    "dados/obra.json",
    "dados/equipamentos.json",
    "registros/inspecoes.json"
  ],
  "entryFile": "main.tex"
}
```

## Regras propostas

- `projectId` deve ser UUID v4 e deve ser diferente do identificador de qualquer equipamento.
- `templateId` e `templateVersion` são obrigatórios em projetos gerados por modelo.
- `sourceDocuments` registra a origem das informações, mas não autoriza o sistema a inferir requisitos ausentes.
- `status` é editorial (`draft`, `review`, `ready-for-signature`, `archived`), não é declaração de conformidade.
- Um arquivo LaTeX manualmente editado não deve ser sobrescrito silenciosamente por regeneração; o sistema deve criar revisão, comparar ou pedir ação explícita.
- O contrato geral `product-api-v1.json` continua sendo a referência para identidade de projeto e arquivos.
