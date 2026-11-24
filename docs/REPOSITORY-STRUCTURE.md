# Estrutura do repositório

## Organização atual

```text
.
├── apps/
│   └── web/                         # protótipo web FORGE independente
│       ├── index.html
│       ├── styles.css
│       └── app.js
├── docs/
│   ├── contracts/
│   │   ├── API-V1.md                # operações e compatibilidade do contrato
│   │   └── product-api-v1.json      # schema de projeto versionado
│   ├── decisions/
│   ├── ROADMAP.md
│   ├── REPOSITORY-STRUCTURE.md
│   ├── WEB-APP-BRIEF.md
│   └── WEB-ARCHITECTURE.md
├── .github/
├── CONTRIBUTING.md
├── README.md
└── EngLaTeX-1.1-codigo-fonte.zip   # material legado, preservado no local original
```

## Convenções

- O ZIP permanece na raiz para preservar o endereço já compartilhado. Mudanças devem manter seu conteúdo byte a byte, salvo autorização expressa em issue dedicada.
- `apps/web/` contém a aplicação web independente; não pressupõe compartilhamento de componentes visuais com Android.
- Contratos de domínio multiplataforma ficam em `docs/contracts/`; mudanças incompatíveis exigem nova versão major e revisão das duas frentes.
- Documentação geral fica em `docs/` e decisões duradouras em `docs/decisions/`.
- O protótipo web atual usa armazenamento local do navegador e não habilita Drive, compilação ou backend.
- Não expor rotas locais do legado como API pública sem redesenho, revisão de segurança e aprovação.
- Não criar diretórios vazios para módulos futuros. Cada diretório deve conter conteúdo aprovado e mantido.
- Não copiar dependências, componentes ou assets do ZIP sem inventário de licença e decisão explícita.
