# Briefing da versão web do FORGE

**Estado:** proposta para revisão e aprovação; não é autorização para iniciar implementação.

**Escopo deste documento:** definir uma primeira versão web responsiva compatível, no nível de produto e contratos, com um cliente Android separado. Não especifica nem pressupõe hospedagem, backend ou serviço remoto.

## 1. Evidências observadas

Os pontos abaixo foram conferidos no repositório e no conteúdo do ZIP, sem editar ou extrair o ZIP para o repositório:

- O README do FORGE descreve o projeto como **planejamento e organização**, não como uma plataforma já implementada. O repositório mantém o legado em `EngLaTeX-1.1-codigo-fonte.zip` e instrui a preservá-lo. O roadmap pede definição de produto e limites antes de migração.
- O ZIP contém uma aplicação EngLaTeX 1.1 para Windows. O `LEIA-ME.txt` declara Windows 10/11 de 64 bits e uso de WebView2. `src/main.rs` descreve uma interface WebView2 servida por um servidor HTTP Rust/Axum vinculado a `127.0.0.1`; fechar a janela encerra o aplicativo. O estado e os projetos são armazenados em pastas locais convencionais do Windows.
- Há uma pasta `web/src/` com HTML, CSS e módulos JavaScript, um `package.json` e `build.mjs`. A interface usa CodeMirror 6, KaTeX e PDF.js, e o build com esbuild gera `web/dist` para ser embutido no executável. O alvo de build declarado é Chrome/Edge 110. A existência de um build estático **não** significa que o frontend funcione sozinho: `web/src/api.js` faz chamadas a `/api/...` que dependem do backend Rust.
- `src/api.rs` declara endpoints para configuração, projetos, arquivos, importação/exportação, compilação, PDF, referências, SyncTeX, variáveis, histórico e ortografia, entre outros. O contrato está acoplado ao estado e às operações locais do aplicativo; não foi observada uma API pública de rede, autenticação de usuário ou sincronização entre dispositivos.
- `src/compilador.rs` implementa a descoberta e invocação local de Tectonic, latexmk e motores TeX, com limite de execução observado de 180 segundos. `LEIA-ME.txt` descreve Tectonic e cache distribuído junto do programa, com possibilidade de baixar pacotes faltantes. Esses mecanismos não demonstram uma solução de compilação para navegador, Android ou implantação web.
- O README legado anuncia recursos como modo visual, histórico, referências, corretor, tabelas, modelos, variáveis, PDF e sincronização PDF↔código. Isso é documentação de capacidades declaradas; **não** equivale a uma avaliação de qualidade, segurança, acessibilidade, compatibilidade móvel, cobertura de testes ou paridade funcional.
- O ZIP passou em `unzip -t`. SHA-256 observado durante esta tarefa: `dec837207af0fcd3fe6d834fba5b34214a21bd6fa4ae652dd1d95f78a96e83aa`. Nenhum conteúdo do ZIP foi alterado por esta tarefa.

## 2. Hipóteses e propostas — aguardam aprovação

Esta seção contém recomendações para orientar a decisão, não fatos nem decisões já tomadas.

### Objetivo de produto proposto

Oferecer um cliente web independente, utilizável em desktop, celular e tablet, para criar ou importar projetos LaTeX, editar seus arquivos, salvar o trabalho e abrir ou exportar os arquivos do projeto. A compilação e a visualização de PDF devem entrar no MVP **somente após** aprovação de uma arquitetura de execução e armazenamento que as sustente. A experiência web não deve se apresentar como “Overleaf”, nem alegar equivalência com o EngLaTeX legado sem comparação sistemática.

### Escopo candidato para o MVP

1. Página inicial com projetos disponíveis no escopo de armazenamento aprovado, busca simples, estado vazio e ações de criar/importar.
2. Criar projeto a partir de um modelo mínimo aprovado, ou em branco; importar e exportar o formato de projeto ZIP compatível a definir.
3. Abrir um projeto, navegar sua árvore, visualizar/editar arquivos de texto LaTeX, criar e renomear arquivos/pastas e salvar com estado de persistência visível.
4. Informar erros recuperáveis com contexto e oferecer recuperação para edição não salva, falha de persistência e falha de importação.
5. Se uma decisão aprovada fornecer compilação: acionar compilação, mostrar andamento/resultado, erros e avisos e abrir o PDF resultante. Não exibir ação de compilação funcional enquanto não houver runtime aprovado.
6. Interface em português do Brasil inicialmente; internacionalização herdada só deve ser mantida se sua adequação e completude forem verificadas.

**Fora do MVP candidato, salvo decisão explícita:** contas, colaboração simultânea, nuvem/sincronização, compartilhamento público, comentários, DOI/rede bibliográfica, histórico avançado/comparação, modo visual, editor de tabelas especializado, correção ortográfica multilíngue, suporte genérico a plug-ins e promessa de operação offline integral. A interface pode ser responsiva sem que isso implique paridade com o aplicativo Android.

## 3. Fluxos e telas responsivas

### A. Início e gestão de projetos

- **Desktop/tablet:** cabeçalho com identidade discreta, ações “Novo projeto” e “Importar”, lista/tabela de projetos e indicação de origem/localização conforme o modelo de armazenamento decidido.
- **Celular:** lista em cartões, ações alcançáveis sem hover, criação/importação em fluxo de tela ou painel adequado ao toque.
- **Estados:** carregando, vazio com orientação, erro com tentativa de repetição e lista disponível. A exclusão, se aprovada, exige confirmação e explicita se é reversível.

### B. Criar/importar

- Fluxo curto: escolher projeto em branco ou modelo aprovado; nomear; confirmar criação.
- Importação: selecionar ZIP, validar conteúdo/limites, mostrar nome e resultado, apontar arquivos ignorados ou inválidos; não sobrescrever projeto existente silenciosamente.
- Exportação: ação explícita e mensagem clara sobre quais fontes/arquivos e metadados entram no pacote. Não expor segredos ou metadados de plataforma.

### C. Editor

- **Desktop largo:** navegação de arquivos à esquerda, editor ao centro e painel de PDF/saída opcional à direita; painéis recolhíveis e redimensionáveis somente se funcionar bem com teclado.
- **Tablet:** editor como vista primária e painéis em abas ou painel lateral alternável; evitar três colunas comprimidas.
- **Celular:** uma vista primária por vez — arquivos, editor, PDF ou diagnóstico — com navegação e ação “voltar” previsíveis. Não reduzir o editor desktop a miniatura; fornecer barra de ações compacta e controles com área de toque suficiente.
- Cabeçalho contextual com projeto, arquivo ativo e estado “Salvo / Salvando / Alterações pendentes / Falha ao salvar”. A compilação, se aprovada, é uma ação separada de salvar e deve comunicar seu estado.
- O editor deve permitir edição de texto em teclado virtual e físico, seleção, copiar/colar, desfazer/refazer e acesso a linha/coluna sem depender de atalhos desktop.

### D. PDF e diagnósticos (dependentes da decisão de compilação)

- Mostrar PDF no painel ou tela apropriada, com zoom e mensagem de indisponibilidade/erro compreensível.
- Listar erros e avisos em texto navegável. Selecionar um diagnóstico deve abrir o arquivo/linha correspondente apenas se o backend/artefato fornecer um mapeamento confiável.
- SyncTeX e paridade de interação bidirecional não são requisito do MVP: devem ser validados separadamente antes de promessa.

### E. Preferências

- Apenas opções essenciais à experiência e acessibilidade no MVP (por exemplo tema/idioma se aprovados). Preferências locais não devem ser confundidas com configuração global compartilhada entre clientes.

## 4. Arquitetura: decisões obrigatórias antes de implementação

O ZIP não define a arquitetura de uma aplicação web autônoma. O responsável pelo produto deve aprovar as decisões abaixo e registrá-las em ADR ou equivalente antes de construir funcionalidades dependentes:

1. **Modo de distribuição e limites de confiança:** site hospedado, instalação/autohospedagem ou cliente executado localmente; quem pode acessar os projetos; se há um ou vários usuários. Não pressupor servidor, autenticação, hospedagem, banco ou fornecedor.
2. **Persistência e formato canônico:** armazenamento no navegador/dispositivo, arquivos fornecidos pelo usuário, armazenamento do backend escolhido ou combinação explícita; limites, quotas, backup, recuperação, exclusão, concorrência, migração e retenção. `localStorage` não deve ser assumido como armazenamento de arquivos de projeto durável. Definir um formato de intercâmbio ZIP independente de caminhos absolutos do sistema, incluindo arquivos LaTeX e recursos binários permitidos.
3. **Compilação LaTeX:** escolher entre (a) avaliação técnica de compilador WebAssembly no navegador, incluindo tamanho, licenças, fontes/pacotes, rede, limites de recursos e compatibilidade; (b) serviço de compilação controlado e aprovado, com isolamento, quotas, timeout, proteção contra entrada maliciosa e política de retenção; ou (c) deixar compilação fora do MVP e fornecer exportação para compilação externa. A arquitetura (b) só pode existir após escolha e aprovação explícitas de ambiente e responsável; este briefing não cria nem sugere a existência de tal serviço. Não executar TeX não confiável num processo/servidor sem sandbox e limites de recursos.
4. **Contrato de interface/API:** escolher transporte (biblioteca local, HTTP ou outro) e versionamento depois de definir os itens de domínio. A interface não deve codificar rotas do EngLaTeX legado diretamente como contrato de produto. Separar UI de adaptadores substituíveis para persistência, importação/exportação e compilação.
5. **Proteção de dados e operação:** decidir autenticação/autorização se houver servidor multiusuário, limites de upload/download, proteção contra ZIP malicioso (travessia de diretório, bombas de descompressão), isolamento de projetos, logs sem conteúdo sensível, política de retenção e resposta a falhas.

**Bloqueio de escopo:** sem decisão sobre persistência, o agente não pode implementar operações como se houvesse armazenamento durável. Sem decisão de compilação, deve omitir essa função do MVP ou construir apenas uma interface explicitamente não funcional para protótipo — nunca conectar a um serviço inventado. Se o requisito de compilar for obrigatório para a primeira entrega, a escolha do runtime é pré-condição de aprovação.

## 5. Contrato de produto comum com o cliente Android

O cliente Android será uma aplicação separada; esta proposta não supõe código de UI, plataforma de execução ou armazenamento compartilhados. Para manter compatibilidade sem acoplamento entre interfaces:

- Definir um **modelo de domínio neutro de plataforma** para projeto, arquivo relativo, metadados, tarefa de compilação, artefato e diagnóstico. A interface web e a Android consomem operações sem depender de componentes visuais ou caminhos locais do Windows.
- Acordar nomes, campos, codificação UTF-8, formatos binários, semântica de caminhos relativos, limites de tamanho, estados, códigos de erro e versionamento. Não considerar automaticamente `.englatex.json`, estrutura interna ou endpoints do legado como contrato aprovado.
- Definir operações e comportamento equivalente: listar/abrir/criar/importar projeto, ler/alterar/criar/mover/excluir arquivo (quando permitido), salvar, exportar e, se adotado, compilar/obter PDF/listar diagnósticos. Cada operação indica se é suportada e quais limites tem.
- Se clientes comunicarem com um serviço, definir uma interface versionada comum e descoberta de capacidades para que o Android possa tratar recursos opcionais sem presumir que estão disponíveis. A forma de transporte e a política de identidade permanecem pendentes até a arquitetura ser escolhida.
- Especificar consistência de gravação, indicação de alterações não salvas, conflitos/versões e recuperação. Sincronização cruzada, colaboração e acesso simultâneo não são inferidos nem incluídos só por haver dois clientes.
- Preservar interoperabilidade por importação/exportação de um formato de projeto documentado, mesmo se web e Android usarem armazenamento interno distinto.

## 6. Critérios de aceitação propostos

O MVP só será considerado aceito após aprovar arquitetura, critérios e limites; critérios condicionados a compilação aplicam-se apenas se ela for aprovada para esta fase.

1. Em viewport estreita de celular, tablet e desktop, os fluxos de início, criação/importação e edição permanecem utilizáveis sem rolagem horizontal da página inteira; controles e conteúdo prioritário adaptam-se ao espaço.
2. Usuário consegue criar projeto em branco (e modelo somente se houver modelos aprovados), abrir, editar, salvar e reabrir os arquivos sem truncamento ou corrupção de conteúdo. Estado de salvamento e falha ficam visíveis.
3. Usuário consegue importar ZIP dentro dos limites publicados; conteúdo rejeitado não substitui projeto existente nem deixa o estado parcialmente gravado sem aviso. Exportar e reimportar preserva arquivos suportados e seus caminhos relativos.
4. Operações suportadas têm estados vazios, carregando, sucesso e erro; falha de rede/armazenamento não é reportada como sucesso e oferece uma ação de recuperação adequada.
5. Se compilação for parte aprovada do MVP: uma compilação produz resultado identificável; falhas e timeout não travam a interface; PDF e diagnósticos correspondem à versão compilada, e downloads/limites estão definidos. Se não houver runtime aprovado, não aparece um botão de compilar que prometa executar.
6. Não há chamadas a serviço externo não aprovado nem envio silencioso de fontes do usuário. A arquitetura deve documentar o que sai do dispositivo antes de qualquer transferência.
7. O contrato compartilhado com Android define versão, estrutura de projeto, operações, erros, capacidades e regras de persistência; não exige compartilhamento de implementação de UI.
8. Recursos declarados fora de escopo não são anunciados como existentes. A documentação não promete paridade com EngLaTeX até haver inventário e verificação em cada plataforma.

## 7. Acessibilidade e usabilidade

Meta proposta: WCAG 2.2 nível AA para as telas web, sujeita à validação. Requisitos mínimos:

- Fluxos completos operáveis por teclado, ordem de foco coerente, foco sempre visível e ausência de armadilhas; diálogos devolvem foco ao acionador e suportam Escape quando apropriado.
- HTML semântico, títulos e regiões nomeadas; rótulos associados a campos e botões com nomes acessíveis; estado de salvamento, compilação e alertas anunciado por tecnologia assistiva sem excesso de mensagens.
- Contraste adequado para texto, foco, estados e seleção; erros, avisos e diferenças não comunicados somente por cor ou ícone.
- Zoom/reflow e ampliação de texto sem perda de ações essenciais; interface móvel utilizável com leitor de tela e orientação de tela variável. Alvos de toque recomendados de pelo menos 44 × 44 CSS px onde praticável.
- Respeito a `prefers-reduced-motion`; evitar dependência de hover, gesto complexo, arrastar/soltar ou atalhos exclusivos. Fornecer alternativa por botão/menu para cada operação por gesto.
- Editor de código é um componente complexo: verificar árvore e comandos acessíveis, seleção, leitura de linha/coluna, teclado virtual, contraste e modo de alto contraste. Se não for acessível em determinado leitor/dispositivo, documentar limitação e oferecer operações de leitura/edição alternativas viáveis.
- PDF não deve ser a única representação de erros ou conteúdo: disponibilizar diagnóstico textual, nome de arquivo, linha quando conhecida e resumo do resultado.

## 8. Riscos e mitigação

| Risco | Tratamento exigido antes/depois da aprovação |
|---|---|
| Confundir build estático da UI com produto web completo | Tratar a API e runtime como dependências; isolar adaptadores e bloquear features sem backend definido. |
| Compilar TeX não confiável | Escolher runtime explicitamente; avaliar isolamento, tempo/memória, rede e acesso ao sistema de arquivos; não executar em servidor compartilhado sem sandbox. |
| Perda ou exposição de documentos | Aprovar modelo de armazenamento, backup, retenção, autenticação/autorização (se aplicável), transferência e recuperação antes de dados reais. |
| ZIP malicioso ou caminhos perigosos | Definir limites de quantidade/tamanho/profundidade e validar caminhos; impedir path traversal, symlinks perigosos e decompression bombs. |
| Falsa promessa de compatibilidade/paridade | Fazer matriz por recurso com estados “reutilizável”, “adaptar”, “não avaliado”; verificar com projetos de teste e dispositivos reais antes de anunciar. |
| Editor complexo em telas/tecnologias assistivas | Prototipar cedo em celular/tablet e realizar avaliação manual de teclado/leitor de tela; ajustar o escopo se o editor escolhido não atender. |
| Divergência web/Android | Aprovar contrato neutro e versionado antes de duplicar decisões de formatos, erros, importação e capacidades. |
| Migração destrutiva, licença e distribuição | Não migrar o legado nem redistribuir binários/dependências antes de decisões de licença, inventário e autorização. |

## 9. Reuso do legado: matriz de avaliação inicial

| Elemento observado | Potencial de reuso | Adaptação/verificação necessária |
|---|---|---|
| `web/src/` — módulos de editor, CodeMirror, atalhos, UI, traduções, árvore de arquivos | Candidato a referência e possível reuso seletivo de lógica | Remover dependência de rotas/estado do legado; revisar arquitetura, segurança, acessibilidade e comportamento responsivo; confirmar licenças e compatibilidade de dependências. Não copiar automaticamente. |
| `latex.js`, `formulas.js`, `simbolos.js`, `contagem.js`, `insercao.js`, `tabelas.js`, `visual.js` | Lógica de edição LaTeX potencialmente reaproveitável | Revisar APIs internas, dependências e UX de toque/acessibilidade; itens avançados podem ficar fora do MVP. |
| `visualizador.js` e uso de PDF.js/KaTeX | Bibliotecas e padrões de renderização são referências plausíveis | Verificar licenças, tamanho, compatibilidade, worker, origem dos artefatos e acesso a PDF gerado. Não implica mecanismo de compilação. |
| `web/src/api.js` e rotas de `src/api.rs` | Inventário útil de operações de domínio e exemplos de erro | Não reutilizar como API pública sem redesenhar versionamento, autenticação, transporte, limites, concorrência e persistência. Várias rotas acionam funções específicas do desktop/Windows. |
| `src/projetos.rs`, `src/historico.rs`, `src/variaveis.rs` funcionalidade correspondente | Referência para semântica e formatos legados | Depende de formato canônico, política de compatibilidade e plataforma; não importar sistemas de caminho/armazenamento do Windows sem adaptação. |
| `src/compilador.rs`, `src/synctex.rs`, `src/ortografia.rs` | Referência de requisitos e formatos de resultado | Dependem de binários, filesystem, dicionários e processos locais; exige nova estratégia/runtime por plataforma e análise de isolamento/licenças. Sem paridade presumida. |
| `build.mjs`, `package.json`, CSS e HTML | Referência do toolchain original | Build foi desenhado para embutir em WebView2; validar dependências, alvo, asset paths, worker, desempenho e CSP numa arquitetura web aprovada. |

## 10. Limites explícitos desta fase

- Não fazer engenharia reversa ampla nem inventário linha por linha do ZIP; esta leitura é exploratória e focada em arquitetura/capacidades.
- Não iniciar migração, extração, substituição, reempacotamento ou qualquer alteração ao ZIP; preservar o arquivo byte a byte.
- Não alterar funcionalidades ou código legado, nem assumir licença ou autorização de distribuição.
- Não iniciar projeto, instalar dependências, criar backend, banco de dados, autenticação, armazenamento, runtime LaTeX, conta de hospedagem ou chamada de serviço externo.
- Não afirmar equivalência funcional entre o ZIP e o produto web ou Android.

## 11. Instruções para o agente executor após aprovação

1. Confirme que este briefing foi aprovado e que as decisões bloqueadoras da seção 4 foram respondidas. Registre ADRs para distribuição, persistência/formato e compilação; se compilação não tiver decisão aprovada, remova-a do MVP.
2. Leia novamente README, roadmap, convenções do repositório e este documento. Inspecione o ZIP estritamente em modo leitura e, se autorização futura permitir extração, trabalhe numa cópia temporária fora do repositório. Registre hash antes/depois e confirme que o ZIP original permanece idêntico. Não altere branches nem arquivos fora da issue aprovada.
3. Produza inventário pequeno dos módulos legados realmente necessários, licenças/dependências e adaptações; não copie o aplicativo inteiro. Submeta questões de licença e dependências não resolvidas ao responsável antes de redistribuir código ou artefatos.
4. Defina contrato de domínio/API e formatos de importação/exportação versionados antes de integrar telas com persistência. Mantenha UI desacoplada do adaptador e prepare testes de contrato para o cliente Android separado.
5. Implemente apenas o MVP aprovado, com limites de upload, proteção de ZIP e tratamento de erros definidos. Para compilação aprovada, implemente isolamento e limites explícitos; jamais substitua a decisão por um endpoint ou serviço presumido.
6. Torne comportamento responsivo e acessível parte da implementação desde os primeiros fluxos. Verifique teclado, foco, leitores de tela, zoom/reflow, controles de toque, estados de falha e operação nos tamanhos de tela acordados.
7. Entregue evidências de critérios aceitos, lista do que foi verificado e do que continua pendente, arquitetura executada, dependências/licenças, formato exportado e compatibilidade do contrato Android. Não declarar paridade com EngLaTeX sem matriz comparativa aprovada e comprovada.

**Resultado esperado desta fase:** revisão e aprovação do escopo e das decisões arquiteturais; só depois disso abrir tarefa de implementação com arquivos, critérios e verificações delimitados.

## 12. Estado do protótipo Web (23/11/2026)

Existe um protótipo estático em `apps/web/` na branch `feature/forge-web`, aberto para revisão no PR #2. Ele oferece navegação por projetos demonstrativos, edição de texto LaTeX, criação de projetos, importação/exportação simples de `.tex`/`.txt`, múltiplos arquivos por projeto (criar, renomear e excluir) e persistência local no navegador. A persistência primária usa IndexedDB (banco `forge-web`, versão 1); projetos existentes na chave legada `localStorage` `forge.web.mock.v1` são migrados quando o banco está vazio. Há fallback para `localStorage` em indisponibilidade/falha de IndexedDB e fila serializada de gravações. A chave legada é preservada como cópia de recuperação nesta fase.

Também há backup local JSON versão 1 (formato exclusivo da Web, não é contrato Android/Web): exporta todos os projetos e permite restaurá-los como cópias com novos IDs, com limites de tamanho/quantidade e validação antes de alterar o estado local. O arquivo de backup contém os textos dos documentos e deve ser tratado como sensível.

A validação de caminhos/registros está em módulo puro `apps/web/project-core.js`. Testes Node.js foram adicionados em `tests/web-core.test.cjs`, e um workflow GitHub Actions em `.github/workflows/web-checks.yml` executa a suíte em pushes da branch Web e PRs com alterações relevantes. O workflow ainda precisa concluir para confirmar o resultado CI.

Limites atuais: IndexedDB é local ao navegador/perfil, não é backup remoto nem sincronização; não há gestão de quota, concorrência entre abas, histórico/recuperação de versões, exportação de projeto completo nem import/export ZIP. Não há compilação LaTeX, PDF real, diagnósticos reais, backend, endpoint HTTP, autenticação ou sincronização. Preview e diagnósticos são demonstrativos; Drive permanece desativado. Não houve teste visual/E2E em browser neste ambiente.

O arquivo `docs/contracts/PROJECT-ARCHIVE-V1.md` e seu schema são proposta não aprovada. Não constituem contrato Android/Web final e aguardam revisão da IA 1 pelo canal exclusivo `docs/AI-COLLABORATION.txt` e decisão do responsável.
