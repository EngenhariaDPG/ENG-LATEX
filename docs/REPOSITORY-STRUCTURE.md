# Estrutura do repositório

## Organização atual

```text
.
├── apps/
│   ├── desktop/                     # EngLaTeX desktop Rust/Windows e empacotamento
│   └── web/                         # protótipo web FORGE independente
│       ├── index.html
│       ├── styles.css
│       └── app.js
├── docs/
│   ├── contracts/
│   │   ├── API-V1.md                # operações e compatibilidade do contrato
│   │   ├── technical-project-v1.md  # proposta de manifesto técnico
│   │   └── product-api-v1.json      # schema de projeto versionado
│   ├── decisions/                   # decisões arquiteturais duradouras
│   ├── PRODUCT-VISION.md            # visão oficial do produto
│   ├── TECHNICAL-DOCUMENTATION.md   # módulo de livros/laudos/checklists
│   ├── ROADMAP.md
│   ├── REPOSITORY-STRUCTURE.md
│   ├── WEB-APP-BRIEF.md
│   └── WEB-ARCHITECTURE.md
├── .github/
├── CONTRIBUTING.md
├── README.md
├── EngLaTeX-1.1-codigo-fonte.zip   # material legado, preservado no local original
```

## Convenções

- O ZIP permanece na raiz para preservar o endereço já compartilhado. Mudanças devem manter seu conteúdo byte a byte, salvo autorização expressa em issue dedicada.
- `apps/web/` contém a aplicação web independente preservada como legado congelado; não recebe novas funcionalidades neste ciclo e não pressupõe compartilhamento de componentes visuais com Android.
- O Android/Expo, quando presente no histórico da PR, também permanece congelado como legado; a frente ativa desta etapa é `apps/desktop/`.
- `apps/desktop/` contém a cópia de trabalho do desktop Rust extraída do legado e o empacotamento Windows; o ZIP original não é alterado.
- Contratos de domínio multiplataforma ficam em `docs/contracts/`; mudanças incompatíveis exigem nova versão major e revisão das duas frentes.
- Documentação geral fica em `docs/` e decisões duradouras em `docs/decisions/`.
- O protótipo web atual usa armazenamento local do navegador e não habilita Drive, compilação ou backend.
- Não expor rotas locais do legado como API pública sem redesenho, revisão de segurança e aprovação.
- Não criar diretórios vazios para módulos futuros. Cada diretório deve conter conteúdo aprovado e mantido.
- Não copiar dependências, componentes ou assets do ZIP sem inventário de licença e decisão explícita.
- Dependências geradas, binários de terceiros, dicionários e cache LaTeX ficam fora do Git e entram apenas no payload de build do instalador.
