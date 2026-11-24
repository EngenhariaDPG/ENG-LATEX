# Estrutura do repositório

## Organização atual

```text
.
├── README.md
└── EngLaTeX-1.1-codigo-fonte.zip   # material legado, preservado no local original
```

O ZIP permanece na raiz para evitar quebrar o endereço já compartilhado. Esta mudança não altera seu conteúdo nem tenta reorganizar os arquivos internos do pacote.

## Organização documental adotada

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/              # formulários para tarefas e propostas
│   └── PULL_REQUEST_TEMPLATE.md     # checklist de revisão
├── docs/
│   ├── decisions/                   # decisões arquiteturais registradas
│   ├── ROADMAP.md
│   └── REPOSITORY-STRUCTURE.md
├── CONTRIBUTING.md
├── README.md
└── EngLaTeX-1.1-codigo-fonte.zip   # preservado
```

## Convenções para mudanças futuras

- Não mover, substituir ou modificar material legado sem uma issue específica e aprovação do responsável pelo projeto.
- Manter documentação geral em `docs/` e decisões duradouras em `docs/decisions/`.
- Adicionar código-fonte extraído ou novo somente após decisão explícita sobre estrutura, licença, histórico e estratégia de migração.
- Não criar diretórios vazios para módulos futuros: cada diretório novo deve corresponder a conteúdo aprovado e mantido.
- Evitar duplicar documentos; o README deve orientar e apontar para a documentação detalhada.
