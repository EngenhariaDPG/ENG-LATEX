# FORGE

**Modular Multipurpose Development Environment**

O FORGE é a visão de evolução do projeto EngLaTeX para um ambiente modular e multipropósito. A proposta é preservar o trabalho já existente e, por etapas, permitir que ferramentas de diferentes áreas sejam integradas sem fazer do LaTeX a identidade central da plataforma.

> **Status:** planejamento e organização do repositório. FORGE é a direção proposta; esta página não afirma que uma plataforma FORGE já esteja implementada.

## Estado deste repositório

O repositório mantém o arquivo-fonte legado do EngLaTeX 1.1 em [`EngLaTeX-1.1-codigo-fonte.zip`](EngLaTeX-1.1-codigo-fonte.zip). O arquivo permanece preservado como publicado. A cópia de trabalho do desktop está em [`apps/desktop/`](apps/desktop/) e não substitui nem modifica o ZIP original.

## Objetivos

- Preservar o histórico e os materiais existentes do EngLaTeX.
- Organizar decisões, documentação e planejamento antes de mudanças no software.
- Preparar uma evolução incremental para o FORGE, com módulos independentes e limites claros.
- Desenvolver, por etapas, os projetos Web, Android e desktop local, com módulos independentes e limites claros.

## Documentação

- [Roadmap](docs/ROADMAP.md): etapas propostas, sem datas ou promessa de implementação.
- [Visão do produto](docs/PRODUCT-VISION.md): editor LaTeX como núcleo e documentação técnica como módulo integrado.
- [Módulo de documentação técnica](docs/TECHNICAL-DOCUMENTATION.md): entidades, fluxo, modelos e limites do gerador de livros e laudos.
- [Estrutura do repositório](docs/REPOSITORY-STRUCTURE.md): organização atual e convenções para novos materiais.
- [Briefing web](docs/WEB-APP-BRIEF.md): escopo, matriz de reuso e critérios do protótipo.
- [Arquitetura web](docs/WEB-ARCHITECTURE.md): avaliação local-first, hospedagem e compilação.
- [Rascunho de modelo de produto v1](docs/contracts/API-V1.md): proposta de modelo ainda não aprovada como contrato compartilhado.
- [Proposta de arquivo de projeto ZIP](docs/contracts/PROJECT-ARCHIVE-V1.md): formato de intercâmbio Android/Web em análise; UUID v4, arquivos binários e validações foram especificados, mas limites e aprovação do responsável seguem pendentes.

A aplicação web em `apps/web/` é um protótipo local com IndexedDB, fallback localStorage e backup JSON local. Testes Node e smoke tests Playwright/Chromium estão configurados no GitHub Actions. O backup JSON não é o formato de intercâmbio Android/Web. Drive, sincronização e importação/exportação ZIP continuam pendentes; compilação ainda não está conectada.

O desktop legado em `apps/desktop/` é uma aplicação Rust para Windows 10/11 x64, com interface WebView2 e servidor local. O workflow [`Desktop Windows`](.github/workflows/desktop-windows.yml) compila o executável, executa um smoke test e gera um instalador Inno Setup. Uma release só deve ser anunciada após uma execução verde em Windows e teste manual do instalador.

O Web possui o primeiro incremento do módulo técnico: `Livro técnico` cria localmente um projeto LaTeX inicial de balancim/andaime suspenso com dados estruturados, manifesto e capítulos editáveis. Esse fluxo ainda não compila PDF no navegador, não valida conformidade e não substitui assinatura profissional.
- [Como contribuir](CONTRIBUTING.md): issues, branches e pull requests.
- [Decisões de projeto](docs/decisions/README.md): formato para registrar decisões duradouras.

A direção oficial do FORGE está registrada na [ADR 0002](docs/decisions/0002-editor-latex-e-documentacao-tecnica.md): o editor LaTeX continua sendo o núcleo; livros técnicos, laudos, checklists e relatórios serão adicionados como projetos gerados por modelos, com dados estruturados e anexos. O [manifesto de projeto técnico v1](docs/contracts/technical-project-v1.md) é uma proposta de contrato e ainda não representa uma funcionalidade implementada.

## Como participar

Antes de iniciar uma mudança, abra ou escolha uma issue. Cada pull request deve ter escopo limitado, indicar arquivos ou áreas afetadas e explicar como foi verificado. Para trabalho simultâneo, declare dependências e áreas afetadas na issue e no PR.

## Proteção do material existente

O ZIP legado deve permanecer inalterado, salvo autorização expressa em uma issue dedicada. Nenhuma decisão sobre licença, distribuição de binários ou migração do código é tomada por esta reorganização; esses pontos devem ser definidos explicitamente antes de ações correspondentes.
