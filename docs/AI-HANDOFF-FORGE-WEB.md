# Handoff — FORGE Web

**Data:** 24/11/2026 09:31 BRT  
**Responsável pelo handoff:** IA 3  
**Repositório:** `EngenhariaDPG/ENG-LATEX`  
**PR de trabalho:** [#2 — feat(web): add FORGE web MVP and architecture proposal](https://github.com/EngenhariaDPG/ENG-LATEX/pull/2)  
**Branch de trabalho:** `feature/forge-web`  
**Cópia local de trabalho:** `/tmp/role-feature`

## Estado entregue

O FORGE Web está publicado e pode ser testado no navegador:

**URL pública:** <https://forgeweb-kh3teb92.manus.space>

A publicação é um projeto Webdev gerenciado separado do repositório GitHub. Ela contém a mesma versão funcional da PR #2, mas não existe sincronização automática entre a branch GitHub e o projeto publicado. Toda alteração futura deve ser aplicada na branch e depois copiada/publicada no projeto Webdev, ou o fluxo de publicação precisa ser redesenhado.

A versão atual reproduz a organização de uso do Overleaf: barra superior com menus, seletor de projeto, histórico/layout/compartilhamento visuais, rail vertical, árvore de arquivos, File outline, abas de arquivos, toolbar do editor, split view código/PDF e botão Recompilar. O botão Recompilar é apenas de interface: ainda não existe compilador LaTeX.

## Últimos pontos de controle

- **GitHub/PR:** `0630cd2 feat(web): reproduce Overleaf editor workspace layout`.
- **Projeto Webdev publicado:** `de52096 feat: reproduce Overleaf workspace layout`.
- **URL pública confirmada:** `https://forgeweb-kh3teb92.manus.space`.
- **ZIP legado:** não foi alterado. O SHA-256 preservado é `dec837207af0fcd3fe6d834fba5b34214a21bd6fa4ae652dd1d95f78a96e83aa`.
- **PR:** continua aberta; não criar uma nova PR e não fazer merge silencioso.

## Funcionalidades que já existem

- Criação e seleção de projetos locais.
- Criação, seleção, renomeação e exclusão de arquivos.
- Validação de caminhos e nomes de arquivo.
- Importação de `.tex` e `.txt` em UTF-8.
- UUID v4 para novos projetos e migração dos IDs demonstrativos antigos.
- Exportação de arquivo individual.
- Backup e restauração local em JSON, restaurando como cópias com novos IDs.
- Persistência em IndexedDB, com fallback para localStorage.
- Autosave e salvamento com `Ctrl+S`/`Cmd+S`.
- CodeMirror 5.65.16 local, com modo TeX e fallback para textarea.
- Tema visual escuro inspirado diretamente no layout Overleaf enviado pelo usuário.
- Navegação responsiva para telas menores.

## Limites que não podem ser escondidos na interface

Ainda não existem compilação LaTeX, PDF real, sincronização remota, Google Drive, login, colaboração em tempo real, histórico remoto, comentários, busca global, versionamento de documentos, backend, banco de dados ou autenticação.

O painel PDF atual é uma pré-visualização ilustrativa. A presença do botão Recompilar não deve ser descrita como compilação funcional. O armazenamento é local ao navegador/perfil; limpar os dados do navegador pode remover os projetos se o usuário não tiver exportado backup.

O workflow `.github/workflows/deploy-web-pages.yml` foi criado, mas o GitHub Pages não pôde ser habilitado automaticamente com a autorização disponível. A URL válida atual é a publicação Webdev acima, não uma URL do GitHub Pages.

## Próximas etapas para uma ferramenta Web definitiva

### 1. Fechar o contrato do produto

Antes de implementar serviços, decidir se o FORGE definitivo será apenas um editor local, um editor com sincronização Drive, ou um serviço completo com conta, colaboração e compilação remota. Registrar a decisão em ADR. Definir usuários iniciais, limites de privacidade, plataformas suportadas e o que significa “projeto salvo”.

### 2. Separar definitivamente UI e domínio

Manter a aparência Overleaf, mas retirar regras de negócio de `app.js`. Criar módulos para `Project`, `File`, `Workspace`, `ProjectRepository`, `ImportExportAdapter` e `CompileAdapter`. A UI deve conversar com interfaces, permitindo trocar IndexedDB por armazenamento remoto sem reescrever o editor.

### 3. Consolidar armazenamento local

Implementar migrações versionadas do IndexedDB, gestão de quota, indicador de espaço, recuperação de erro, concorrência entre abas com `BroadcastChannel`/versionamento, exclusão segura e testes de restauração. Manter o backup JSON, mas criar também um formato de projeto versionado compatível com o contrato `PROJECT-ARCHIVE-V1` quando o contrato multiplataforma estiver aprovado.

### 4. Implementar a árvore de arquivos de verdade

Adicionar diretórios hierárquicos, arquivos binários e recursos, renomeação/movimentação entre pastas, arquivo principal, busca no projeto e File outline derivado de seções LaTeX. A árvore atual lista arquivos planos e projetos recentes; ela ainda não representa pastas como a árvore completa do Overleaf.

### 5. Escolher e provar a compilação

Executar uma PoC com 10–20 documentos reais anonimizados e recursos. Comparar três caminhos: engine WASM isolada em Worker, helper local para desktop ou compilação remota isolada. Medir tempo, memória, tamanho do payload, compatibilidade de pacotes/fontes, segurança e custo. Não ativar o botão Recompilar antes de escolher uma arquitetura.

Se for WASM, impor limites de CPU/memória/tempo/tamanho, bloquear rede arbitrária, revisar licenças e testar desktop/tablet/celulares. Se for remoto, criar fila, sandbox multi-tenant, quotas, retenção, exclusão, autenticação e observabilidade sem vazar fontes nos logs.

### 6. Definir sincronização e conta

Somente depois de aprovar o produto remoto, adicionar autenticação e um `ProjectRepository` remoto. Para Drive, usar OAuth do próprio usuário, escopo mínimo, ETags/versões, conflitos explícitos e cópia local offline. Nunca armazenar senha, usar conta de serviço compartilhada ou sobrescrever revisão remota silenciosamente.

### 7. Segurança e produção

Adicionar CSP, sanitização de conteúdo importado, proteção contra arquivos maliciosos, limites de tamanho, política de retenção, telemetria sem conteúdo de documentos, auditoria de dependências, SBOM, revisão de licenças e testes de ameaça. Definir backup, recuperação e exclusão de conta/projeto antes de chamar o produto de definitivo.

### 8. Qualidade e lançamento

Adicionar testes de unidade para domínio, testes de browser para todos os fluxos principais, testes de migração, testes de quota/offline/conflito, testes de acessibilidade, visual regression do layout Overleaf-like e testes em Chrome/Firefox/Safari/Android. Configurar CI obrigatório na PR, releases versionadas, changelog e um processo de rollback.

## Ordem recomendada para a próxima IA

1. Trabalhar na PR #2 existente e atualizar primeiro este handoff se o estado mudar.
2. Não alterar o ZIP legado nem publicar Android/Expo.
3. Não anunciar PDF, compilação, Drive ou sincronização como funcionais sem implementação e testes.
4. Criar uma ADR de produto para escolher local-only, WASM, helper local ou remoto.
5. Refatorar `apps/web/app.js` em módulos de domínio sem mudar o contrato visual já aprovado.
6. Implementar diretórios/árvore de arquivos e busca antes da integração externa.
7. Só então executar a PoC de compilação e decidir a arquitetura definitiva.
8. Manter a URL pública atual atualizada quando houver mudanças publicáveis.

## Arquivos principais

- `apps/web/index.html` — estrutura do editor e do split view.
- `apps/web/styles.css` — layout Overleaf-like, tema escuro e responsividade.
- `apps/web/app.js` — estado local, persistência, CRUD, importação/exportação e CodeMirror.
- `apps/web/project-core.js` — validação pura de caminhos, registros e backups.
- `apps/web/vendor/codemirror/` — CodeMirror local e licença MIT.
- `tests/web-core.test.cjs` — testes Node das regras puras.
- `tests/web-browser.test.cjs` — smoke tests Chromium/Playwright.
- `docs/WEB-ARCHITECTURE.md` — decisões, limites e alternativas de compilação/sincronização.
- `docs/ROADMAP.md` — roadmap geral do FORGE.
- `.github/workflows/web-checks.yml` — verificações da Web.
- `.github/workflows/deploy-web-pages.yml` — tentativa de workflow Pages; não é a hospedagem atualmente válida.

## Direção de produto adicionada em 24/11/2026

O FORGE não será reduzido a um gerador de livros técnicos. A decisão registrada na [ADR 0002](decisions/0002-editor-latex-e-documentacao-tecnica.md) mantém o editor LaTeX como núcleo e adiciona documentação técnica como módulo integrado. O módulo deverá gerar livros de inspeção, laudos, checklists, manuais e relatórios a partir de dados estruturados, modelos LaTeX e anexos, sempre mantendo o código editável.

Documentos de referência:

- [`docs/PRODUCT-VISION.md`](PRODUCT-VISION.md) — visão e princípios do produto.
- [`docs/TECHNICAL-DOCUMENTATION.md`](TECHNICAL-DOCUMENTATION.md) — entidades, fluxo e modelos técnicos.
- [`docs/contracts/technical-project-v1.md`](contracts/technical-project-v1.md) — proposta do manifesto técnico.
- [`docs/decisions/0002-editor-latex-e-documentacao-tecnica.md`](decisions/0002-editor-latex-e-documentacao-tecnica.md) — decisão arquitetural.

O desktop Rust também foi incorporado como cópia de trabalho em `apps/desktop/`, com workflow Windows e instalador. O ZIP legado permanece inalterado. A documentação técnica ainda é especificação; não anunciar seus livros, laudos ou validações como recursos implementados até que existam código e testes.
