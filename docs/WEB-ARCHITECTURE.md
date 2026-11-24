# FORGE Web — arquitetura, hospedagem e avaliação local-first

**Status:** proposta para revisão. Nenhuma infraestrutura ou integração externa foi configurada.

## Recomendação

**C — MVP sem compilação.** Manter frontend estático e adaptadores preparados. O protótipo valida navegação, edição e persistência local, sem fingir que há PDF. Drive permanece como integração planejada e desativada. A opção A é tecnicamente plausível para subconjunto de documentos, mas exige PoC com corpus real e auditoria de licenças. A opção B é possível em desktops, mas cria instalador, atualizador e superfície de ataque local e não resolve Android. A opção D (serviço remoto) adiciona custo, privacidade, isolamento e operação; não criar sem aprovação.

## A — Frontend estático + WASM + Drive

GitHub Pages entrega HTML/CSS/JS; o navegador executa WASM usando CPU/memória locais. SwiftLaTeX demonstra pdfTeX e XeTeX em WASM. Isso comprova viabilidade técnica básica, não equivalência a uma distribuição TeX completa ou suporte universal.
- Payload de engine de referência é da ordem de MB, mas formatos, fontes e pacotes podem ampliar bastante a instalação.
- SwiftLaTeX documenta carregamento de arquivos TeX sob demanda/CTAN; endpoint externo afeta disponibilidade, integridade e privacidade.
- XeTeX oferece suporte OpenType; redistribuição de fontes exige licença e inventário.
- O repositório SwiftLaTeX declara AGPL-3.0. Não incorporar sem análise jurídica e decisão de licença do FORGE.
- WASM roda em browsers modernos, mas memória, workers, threads e pressão de memória variam por navegador/aparelho. Testar desktop, tablet e celulares de entrada.
- Isolar engine em Worker; limitar tempo, memória, tamanho e quantidade de arquivos; validar caminhos e não permitir rede arbitrária.

**Conclusão A:** viável como experimento de compilação controlado, não aprovar como compilador padrão ainda.

## B — Frontend + serviço auxiliar local

Um helper instalado pode expor API local limitada para diretórios escolhidos e invocar Tectonic/TeX instalado.
- Exige instalador, assinatura, atualização segura, versão compatível, permissões e suporte por sistema operacional.
- Bind apenas em loopback, porta aleatória e token efêmero por sessão; origem allowlist; CORS estrito; validar Origin/Host e proteger contra DNS rebinding. CORS não é autenticação.
- Não aceitar caminhos arbitrários; usar sandbox de compilação, limites de CPU/memória/tempo e não expor API administrativa.
- A documentação disponível do legado indica Windows; Linux/macOS precisam ser validados. Android não ganha acesso automático ao filesystem ou compilador do PC.

**Conclusão B:** possível para desktop avançado, não é solução web+Android compartilhada.

## C — MVP sem compilação

Interface estática com projetos locais, editor, importação/exportação e estados explícitos. Adaptadores de compilação e armazenamento ficam atrás de interfaces. É o caminho recomendado para validar produto e contrato multiplataforma sem bloquear o desenvolvimento.

## D — Compilação remota futura

Exigiria autenticação, isolamento multi-tenant, fila, quotas, retenção/exclusão, política de privacidade, defesa contra pacotes maliciosos e custos. Nenhum backend remoto foi criado.

## Drive — hipótese de produto

O usuário autoriza sua própria conta por OAuth. Nunca pedir senha no FORGE/chat, usar conta de serviço compartilhada ou versionar tokens.
- Começar avaliando scope drive.file: acesso aos arquivos criados pelo app ou explicitamente abertos/compartilhados com ele. Solicitar metadados apenas se necessário. Evitar drive e drive.readonly, que concedem acesso amplo.
- Explicar na tela de consentimento quais dados serão lidos/criados/alterados; pedir permissões incrementalmente; oferecer desconectar/revogar.
- OAuth client ID é identificador público de cliente, não segredo; access tokens são efêmeros. Refresh token durável não deve ser armazenado em SPA sem desenho de segurança aprovado. Android usa fluxo nativo e armazenamento seguro do sistema.
- OAuth, verificação Google, política de privacidade e configuração permanecem bloqueados até aprovação.

### Sincronização e proteção
Hipótese de pasta de projeto com manifesto forge-project.json, fontes, imagens e recursos. Cópia local permite operação offline.
- Guardar fileId, name, mimeType, modifiedTime, version/headRevisionId quando disponível e checksum local.
- Usar versões/ETags e pré-condições quando suportadas; nunca sobrescrever silenciosamente uma revisão remota mais nova.
- Em conflito, preservar ambas as versões, mostrar comparação e exigir decisão. Não mesclar LaTeX automaticamente no MVP.
- Cache com limite, expiração, limpeza e indicador de sincronização. Offline: fila idempotente, retry exponencial para 403/429/5xx apropriados, estado pendente visível.
- Recuperação por exportação completa, revisões Drive quando disponíveis e restauração testada.
- Não enviar fontes para logs/telemetria; HTTPS, CSP restritiva, sem conteúdo remoto executável; política de retenção/exclusão clara.
- Drive aplica cotas por projeto/usuário e limites de transferência. Tratar 403/429 com backoff e evitar polling agressivo.

## Fronteiras

    Web UI -> Domain (Project / File / Workspace)
              -> ProjectRepository (local mock -> browser storage -> Drive adapter)
              -> ImportExportAdapter (.tex / project archive)
              -> CompileAdapter (disabled -> WASM / desktop helper / remote)
    Android UI -> same versioned product contract; independent native UI

GitHub mantém código/histórico/CI. GitHub Pages, se aprovado, entrega assets estáticos. Drive guarda documentos do usuário. Compilação é capacidade separada de hosting e storage.

## Plano de validação
1. Selecionar 10–20 documentos anonimizados e recursos.
2. Medir cold start, cache, pico de memória, tempo e saída PDF em desktop/tablet/celular.
3. Inventariar pacotes/fontes, SBOM e licenças; não baixar pacotes de endpoint arbitrário.
4. Comparar saída com distribuição de referência.
5. Testar offline, perda de energia, conflitos e restauração.
6. Submeter ADR para A, B ou D após evidência.


## Persistência local implementada no protótipo Web (23/11/2026)

O protótipo evoluiu de `localStorage` exclusivo para uma camada local simples baseada em IndexedDB:

- Banco `forge-web`, versão 1, object store `projects` com chave `id`.
- Inicialização assíncrona: tenta abrir IndexedDB, carrega projetos existentes e, se o banco estiver vazio, migra os registros válidos da chave legada `forge.web.mock.v1`. A chave antiga não é apagada, funcionando como cópia de recuperação durante esta fase.
- A ordem da lista é persistida por metadado interno `_order`; snapshots são gravados em transação readwrite após limpeza e regravação do conjunto de projetos.
- Se IndexedDB não estiver disponível ou falhar durante gravação, o protótipo tenta o fallback `localStorage`. Se ambos falharem, apresenta estado de erro e orienta exportar uma cópia.
- A gravação é serializada por fila de Promises para evitar que autosaves assíncronos concorrentes concluam fora de ordem.
- A validação de caminhos e registros foi extraída para `apps/web/project-core.js`, sem dependência de DOM, e cobre traversal, caminhos absolutos, separadores Windows, nomes reservados, caracteres de controle, limites de tamanho/profundidade e arquivos de texto.
- Testes automatizados Node.js foram adicionados em `tests/web-core.test.cjs`, com workflow `.github/workflows/web-checks.yml`. O workflow testa validação, sintaxe da aplicação, ordem dos scripts e parse do schema JSON.

**Limites:** isso ainda é armazenamento local de um navegador/perfil, não backup remoto, sincronização, armazenamento multi-dispositivo nem garantia de durabilidade. Não há gestão de quota, interface de exportação completa, concorrência entre abas, recuperação de versões ou testes reais de browser/IndexedDB. O fallback `localStorage` tem limite de capacidade menor. Não declarar a suíte aprovada até o primeiro workflow CI concluir.

### Backup local JSON (recurso exclusivo da Web, não é o contrato multiplataforma)

O protótipo também permite baixar todos os projetos locais num arquivo JSON `forge-local-backup` versão 1 e restaurá-los como **cópias** com novos IDs, preservando os projetos já existentes. A restauração rejeita formato/versão desconhecidos, projetos inválidos, mais de 100 projetos no conjunto, arquivo acima de 5 MB, conteúdo total acima de 20 MB ou backup acima de 25 MB; limita cada projeto a 500 arquivos. O arquivo contém o texto dos documentos do usuário: deve ser tratado como dado sensível e guardado pelo próprio usuário. O backup JSON não é o formato ZIP Android/Web, não substitui `PROJECT-ARCHIVE-V1` e não inclui credenciais, Drive IDs ou estado de sync.
