# Fluxo de trabalho paralelo com agentes de IA

Este processo permite que vários agentes trabalhem ao mesmo tempo sem editar a branch principal nem sobrescrever o trabalho uns dos outros. Ele coordena trabalho por GitHub Issues e pull requests; não automatiza, por si só, a execução de modelos de IA.

## Papéis

Para cada conjunto de tarefas, defina estes papéis na issue ou no comentário de coordenação:

1. **Coordenador/integrador:** divide o objetivo em issues, define interfaces compartilhadas, acompanha dependências e integra pull requests.
2. **Agente executor:** implementa uma issue com escopo e arquivos delimitados, em branch própria.
3. **Agente revisor:** revisa o resultado de forma independente, usando critérios de aceite da issue. O revisor não altera a branch do executor sem combinar isso primeiro.

Com três ou mais modelos, podem existir vários executores em paralelo. Deve haver um integrador por conjunto de mudanças para manter decisões consistentes.

## Antes de paralelizar

Uma tarefa só deve ser marcada como paralelizável quando:

- puder ser dividida em entregas úteis e verificáveis;
- as issues tiverem áreas de arquivo distintas ou interfaces compartilhadas já definidas;
- dependências entre tarefas estiverem registradas como links `blocked by` / `blocks` ou referências às issues;
- houver critérios de aceite que não dependam de interpretação subjetiva.

Se várias tarefas precisarem alterar o mesmo contrato ou os mesmos arquivos, primeiro abra uma issue de definição e registre uma decisão. Não peça a dois executores que alterem a mesma área simultaneamente.

## Ciclo de trabalho

1. O integrador abre uma issue por entrega independente. Cada issue registra objetivo, não objetivos, áreas/arquivos sob responsabilidade, dependências, critérios de aceite e verificação esperada.
2. O coordenador atribui uma issue a um executor e declara a área reservada. Tarefas sem dependência mútua podem ser iniciadas simultaneamente.
3. Cada executor cria uma branch própria a partir da branch principal atual. Padrões sugeridos: `docs/<numero>-<slug>`, `feature/<numero>-<slug>` ou `fix/<numero>-<slug>`.
4. O executor mantém a mudança restrita à issue. Se o escopo mudar, registra a alteração na issue antes de expandir a implementação.
5. O executor abre um pull request ligado à issue. O PR lista arquivos tocados, decisões, verificações feitas e pontos não verificados.
6. O revisor verifica os critérios de aceite e comenta no PR. Se houver conflito de arquivos ou contrato, o integrador pausa o merge e resolve a ordem de integração.
7. O integrador faz o merge em sequência, após CI/verificações e revisão. A branch principal não é usada diretamente para trabalho de agentes.

## Evitar conflitos

- Uma issue, uma branch e um pull request por unidade de trabalho.
- Não compartilhar branches de escrita entre agentes.
- Declarar a lista de arquivos ou diretórios reservados na issue.
- Não editar arquivos fora do escopo sem atualizar a issue e avisar o integrador.
- Se um contrato comum mudar, parar tarefas dependentes, atualizar a especificação e só então retomar.
- Ao encontrar conflito de merge, o integrador escolhe a ordem de integração; executores não fazem `force-push` em branches alheias.
- Separar mudanças documentais, código e atualização de dependências em PRs distintos sempre que isso melhorar a revisão.

## Rastreabilidade e segurança

- Incluir no PR o número da issue e o nome/papel do agente executor e revisor.
- Não inserir chaves, tokens, credenciais, dados pessoais ou documentos privados em issues, commits, logs ou prompts compartilhados.
- Não atribuir aos outros agentes uma revisão que não ocorreu.
- Registrar decisões duradouras em `docs/decisions/` em vez de deixá-las apenas em conversas.
- A aprovação de um PR deve continuar sendo uma decisão explícita do responsável pelo repositório.

## Sinais para serializar o trabalho

Faça as tarefas em sequência quando houver dependência técnica direta, disputa sobre o mesmo arquivo, contrato ainda indefinido, risco de migração de dados ou mudança que afete compatibilidade. Paralelismo não deve ser usado para multiplicar implementações divergentes do mesmo requisito.
