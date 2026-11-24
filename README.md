# FORGE

**Modular Multipurpose Development Environment**

O FORGE é a visão de evolução do projeto EngLaTeX para um ambiente modular e multipropósito. A proposta é preservar o trabalho já existente e, por etapas, permitir que ferramentas de diferentes áreas sejam integradas sem fazer do LaTeX a identidade central da plataforma.

> **Status:** planejamento e organização do repositório. FORGE é a direção proposta; esta página não afirma que uma plataforma FORGE já esteja implementada.

## Estado deste repositório

O repositório mantém o arquivo-fonte legado do EngLaTeX 1.1 em [`EngLaTeX-1.1-codigo-fonte.zip`](EngLaTeX-1.1-codigo-fonte.zip). O arquivo está sendo preservado como publicado. Esta organização documental não modifica, extrai, recompila ou substitui o código nele contido.

## Objetivos

- Preservar o histórico e os materiais existentes do EngLaTeX.
- Organizar decisões, documentação e planejamento antes de mudanças no software.
- Preparar uma evolução incremental para o FORGE, com módulos independentes e limites claros.
- Permitir trabalho paralelo de pessoas e agentes de IA em tarefas separadas e revisáveis.

## Documentação

- [Roadmap](docs/ROADMAP.md): etapas propostas, sem datas ou promessa de implementação.
- [Estrutura do repositório](docs/REPOSITORY-STRUCTURE.md): organização atual e convenções para novos materiais.
- [Briefing web](docs/WEB-APP-BRIEF.md): escopo, matriz de reuso e critérios do protótipo.
- [Arquitetura web](docs/WEB-ARCHITECTURE.md): avaliação local-first, hospedagem e compilação.
- [Rascunho de modelo de produto v1](docs/contracts/API-V1.md): proposta ainda não aprovada como contrato compartilhado.
- [Proposta de arquivo de projeto ZIP](docs/contracts/PROJECT-ARCHIVE-V1.md): formato de intercâmbio pendente de revisão Android e aprovação do responsável.
- [Registro de colaboração entre IAs](docs/AI-COLLABORATION.txt): canal exclusivo de coordenação Android/Web.

A aplicação web em `apps/web/` é um protótipo local com IndexedDB, fallback localStorage e backup JSON local. Testes Node e smoke tests Playwright/Chromium estão configurados no GitHub Actions. O backup JSON não é o formato de intercâmbio Android/Web. Drive, sincronização e importação/exportação ZIP continuam pendentes; compilação ainda não está conectada.
- [Fluxo de trabalho paralelo com IAs](docs/AI-PARALLEL-WORKFLOW.md): como dividir tarefas, evitar conflitos e integrar resultados.
- [Como contribuir](CONTRIBUTING.md): issues, branches e pull requests.
- [Decisões de projeto](docs/decisions/README.md): formato para registrar decisões duradouras.

## Como participar

Antes de iniciar uma mudança, abra ou escolha uma issue. Cada pull request deve ter escopo limitado, indicar arquivos ou áreas afetadas e explicar como foi verificado. Para trabalho simultâneo, consulte o [fluxo de trabalho paralelo](docs/AI-PARALLEL-WORKFLOW.md).

## Proteção do material existente

O ZIP legado deve permanecer inalterado, salvo autorização expressa em uma issue dedicada. Nenhuma decisão sobre licença, distribuição de binários ou migração do código é tomada por esta reorganização; esses pontos devem ser definidos explicitamente antes de ações correspondentes.
