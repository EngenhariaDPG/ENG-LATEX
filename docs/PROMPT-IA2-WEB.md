# Prompt para IA 2 — versão web do FORGE

Você é a IA 2, responsável pela frente WEB do FORGE. Trabalhe no repositório GitHub `EngenhariaDPG/ENG-LATEX`, em uma branch própria criada a partir da `main` atual. Não altere `main`, não trabalhe na branch da frente Android e não sobrescreva o código-fonte legado.

## Contexto e decisões do responsável

- O produto se chamará **FORGE**. A cor base da identidade visual será **laranja**, com contraste acessível e uma paleta complementar própria.
- A versão web será independente da versão Android. O Android será adaptado a celulares e tablets e deverá conversar com o mesmo modelo/API de produto quando esse contrato estiver definido; não se deve pressupor compartilhamento de componentes visuais.
- A experiência deve ser muito familiar para quem usa o Overleaf — por exemplo, projetos, árvore de arquivos, editor LaTeX, área de PDF e diagnósticos — mas com interface original do FORGE. Não copie o nome, logotipo, código, imagens, ícones ou composição visual distintiva do Overleaf. Trocar nome e cor, por si só, não garante autorização para copiar outros elementos.
- O responsável propôs como caminho prioritário a investigar uma aplicação **local-first**: interface web usando recursos do dispositivo, com armazenamento de projetos em um serviço como Google Drive. Trate isso como preferência para avaliação, não como decisão técnica já aprovada. A integração deve ser por conta e consentimento de cada usuário; não solicite senhas ou tokens no chat e não grave segredos no repositório.
- A base de referência é `EngLaTeX-1.1-codigo-fonte.zip`. Preserve esse ZIP byte a byte. A interface legada está em `web/src/` e depende da API local Rust/Axum; o compilador atual chama binários locais e foi documentado para Windows. Não declare que esses mecanismos já funcionam no navegador ou Android.
- Leia antes de implementar `README.md`, `docs/ROADMAP.md`, `docs/REPOSITORY-STRUCTURE.md` e `docs/WEB-APP-BRIEF.md`. O briefing web existente registra fatos, hipóteses, riscos e propostas. As decisões novas acima prevalecem onde houver conflito.

## Prioridade 0 — avaliar a arquitetura local-first e hospedagem

Compare, com base em documentação oficial e uma prova técnica pequena quando segura, estas opções:

1. **Frontend estático + execução no navegador:** GitHub Pages serve HTML/CSS/JavaScript; o navegador usa CPU/memória locais. Verifique se um compilador LaTeX em WebAssembly é viável em tamanho, pacotes, fontes, licenças, memória, desempenho e suporte a desktop/mobile. Não suponha que o Tectonic Windows existente possa ser executado diretamente no navegador.
2. **Aplicação web com serviço auxiliar local:** a interface é aberta no navegador e um processo local autorizado usa filesystem e compilador instalado no computador, inspirado no backend Rust/Axum existente. Avalie instalação, atualização, permissões, CORS, segurança de localhost e compatibilidade fora do Windows.
3. **Cliente Android separado:** avalie armazenamento/autenticação no Drive e edição no aparelho. O Android não pode aproveitar automaticamente o compilador ou filesystem do computador; indique se a compilação precisaria rodar no próprio Android, num serviço remoto posteriormente aprovado, ou ficar fora do MVP.

O usuário quer arquivos compartilháveis entre web e Android. Defina como hipótese de produto acesso ao Drive de cada usuário por OAuth, com escopos de menor privilégio e arquivos pertencentes ao usuário. Registre consentimento, configuração de OAuth, limites de API, cache/offline, conflitos de sincronização, recuperação e proteção de documentos. Considere [documentação oficial de autenticação do Drive API](https://developers.google.com/drive/api/guides/api-specific-auth) e [configuração oficial do OAuth para aplicações web](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid). Não use credenciais de serviço compartilhadas, não embuta tokens duráveis no app e não peça credenciais ao usuário nesta etapa.

GitHub pode manter o código e, se apropriado, publicar um frontend estático. Segundo a [documentação oficial do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), Pages serve HTML, CSS e JavaScript; não fornece backend ou banco de dados. GitHub Actions é automação/CI/CD, não um servidor persistente da aplicação: [documentação oficial sobre Actions e GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/deciding-when-to-build-a-github-app). Separe claramente **repositório/hosting estático**, **processamento local** e **armazenamento de documentos no Drive**. Não use o repositório Git como banco de arquivos de usuários e não coloque token pessoal do GitHub no navegador ou no Android.

Registre uma recomendação curta entre: (A) frontend estático no GitHub Pages + Drive + compilação no navegador; (B) frontend + serviço local instalado para compilação; (C) MVP sem compilação até ser possível validar uma opção segura; ou (D) outra arquitetura justificada. Se nenhuma opção atender web e Android com segurança, apresente o bloqueio e compare os caminhos antes de criar backend ou serviço remoto.

**Não conecte a uma conta real do Drive, não configure OAuth, não crie credenciais, contas, hospedagem, publicação, cobranças ou infraestrutura. Não solicite tokens, senhas ou chaves.** Até aprovação da integração, use um adaptador local/mock explicitamente identificado e não transfira fontes de usuário.

## Escopo visual e de produto

Prepare uma interface web responsiva, inicialmente em português do Brasil, com identidade própria FORGE e laranja como cor principal. Para telas grandes, planeje uma área de trabalho com navegação de projetos/arquivos, editor central e painel de PDF/diagnósticos que possa ser recolhido. Para tablets, evite três colunas comprimidas. Para celular, use vistas/telas alternáveis e ações acessíveis por toque, sem depender de hover.

Priorize os fluxos: abrir a lista de projetos; criar ou importar um projeto; navegar e editar arquivos LaTeX; mostrar estado de salvamento; autorizar armazenamento no Drive apenas após aprovação; visualizar PDF e diagnósticos apenas quando a arquitetura real permitir. Teclado, foco, contraste, ampliação, acessibilidade do editor e erros recuperáveis devem ser considerados desde o início. Use a matriz de reuso do `docs/WEB-APP-BRIEF.md`; avalie dependências e licenças antes de copiar módulos do legado.

A arquitetura da interface deve isolar domínio de projeto/arquivo e adaptadores de armazenamento, importação/exportação e compilação. Produza um contrato de produto/API versionado que possa ser consumido pelo cliente Android separado. Não exponha como API pública as rotas locais existentes sem redesenho e aprovação.

## Coordenação obrigatória com a IA 1

Use `docs/AI-COLLABORATION.txt` como registro compartilhado entre as frentes Android e Web. O arquivo compartilhado está disponível na branch `docs/android-web-mission`; faça fetch dessa branch e leia o arquivo inteiro antes de iniciar ou retomar trabalho. Não crie um segundo registro. Sincronize a versão mais recente do TXT na sua branch de implementação antes de acrescentar entradas. Registre, sempre ao final, o início da tarefa, decisões/propostas de arquitetura ou contrato, mudanças importantes e o handoff da entrega. Cada entrada deve incluir data/hora e fuso, agente/frente, status, branch/projeto, arquivos, impacto para Android, bloqueios e decisão necessária.

Não apague nem reescreva entradas anteriores e não coloque credenciais, tokens ou conteúdo de documentos de usuário no registro. Antes de editar o TXT, sincronize a branch e preserve entradas concorrentes; publique a atualização na branch/PR da sua frente e informe no PR qual foi a última entrada registrada. Propostas não são decisões aprovadas pelo responsável.

## Entrega em Git

- Faça alterações em uma branch exclusiva, por exemplo `feature/forge-web`, sem alterar ou mesclar diretamente em `main`.
- Siga a organização documentada no repositório. Se não houver localização apropriada para a nova aplicação, proponha `apps/web/` e explique a escolha no PR.
- Preserve o ZIP legado; registre SHA-256 antes e depois e confirme que os valores são idênticos.
- Entregue a interface/protótipo permitido, a avaliação local-first/hospedagem e o contrato/API proposto. Execute as verificações disponíveis e informe claramente o que é funcional, o que é somente interface e o que permanece bloqueado.
- Abra um PR para revisão; não faça merge. No resumo do PR, informe branch, arquivos, verificações, estado da integração Drive, limitações e decisões ainda necessárias do responsável.

A prioridade é entregar uma base web FORGE visualmente convincente e tecnicamente honesta, sem prometer sincronização ou compilação que dependam de integração ainda não autorizada.
