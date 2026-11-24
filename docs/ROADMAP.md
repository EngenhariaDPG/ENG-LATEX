# Roadmap do FORGE

Este roadmap registra uma sequência de trabalho proposta. Não estabelece prazos e não significa que as etapas já tenham sido iniciadas ou aprovadas. Cada etapa deve ser convertida em issues pequenas, com critérios de aceite e dependências explícitas.

## Etapa 0 — Organização e governança

- Manter o material EngLaTeX existente preservado.
- Definir como serão propostas, discutidas e revisadas mudanças.
- Usar issues e pull requests para registrar escopo, responsáveis, dependências e decisões.
- Decidir separadamente a licença e as regras para distribuição quando isso se tornar necessário.

**Saída esperada:** repositório compreensível e fluxo de contribuição revisável.

## Etapa 1 — Definição do produto e limites

- Especificar o problema que o FORGE pretende resolver e seus usuários iniciais.
- Definir quais capacidades do EngLaTeX devem ser mantidas, adiadas ou substituídas antes de qualquer migração.
- Registrar requisitos não funcionais, sistemas operacionais pretendidos e restrições de distribuição.
- Registrar decisões arquiteturais importantes como ADRs.

**Saída esperada:** escopo e critérios de aceitação aprovados para a primeira entrega FORGE.

## Etapa 2 — Fundação modular

- Definir interfaces mínimas entre aplicação hospedeira, projetos, interface e serviços de execução.
- Estabelecer configuração, logs, tratamento de erros, testes e versionamento das interfaces.
- Evitar construir um sistema de extensões genérico antes de validar os limites entre módulos internos.

**Saída esperada:** uma base pequena, testável e com contratos documentados.

## Etapa 3 — Migração gradual do EngLaTeX

- Planejar a preservação dos projetos e fluxos existentes antes de alterar formatos ou armazenamento.
- Tratar LaTeX como um módulo de documentos do FORGE, não como a identidade do núcleo.
- Migrar em incrementos verificáveis, mantendo compatibilidade quando tecnicamente viável.

**Saída esperada:** capacidades selecionadas do EngLaTeX funcionando sob a estrutura modular aprovada.

## Etapa 3A — Documentação técnica sobre o núcleo LaTeX

- Manter o editor LaTeX como caminho completo e independente para projetos comuns.
- Criar modelos versionados para livros, laudos, checklists, manuais e relatórios.
- Separar dados de empresa, obra, equipamento, responsáveis, inspeções, manutenções e anexos da apresentação LaTeX.
- Começar pelo livro de inspeção/liberação de balancim ou andaime suspenso.
- Usar os manuais e documentos fornecidos pelo usuário como fontes rastreáveis, sem inferir dados técnicos ausentes.
- Criar depois o módulo específico de elevador cremalheira, com campos e checklists próprios.
- Validar completude e consistência dos dados sem declarar conformidade legal ou de engenharia automaticamente.

**Saída esperada:** um projeto técnico gerado por modelo, editável como formulários, dados e LaTeX, com anexos e manifesto versionado.

## Etapa 4 — Extensibilidade

- Validar a separação dos módulos internos em uso real.
- Definir um contrato de extensão com versão, ciclo de vida, erros e permissões antes de aceitar extensões externas.
- Começar com extensões internas; ampliar o modelo somente quando houver necessidade comprovada.

**Saída esperada:** caminho de extensão documentado e compatível com a segurança e a manutenção do produto.

## Etapa 5 — Novos módulos

- Selecionar novos módulos a partir de necessidades priorizadas, não apenas de possibilidades técnicas.
- Avaliar cada módulo isoladamente quanto a dependências, experiência de uso e manutenção.
- Considerar documentos além de LaTeX, código, dados e automação conforme o escopo aprovado.

**Saída esperada:** módulos independentes acrescentados sem acoplamento desnecessário ao núcleo.

## Etapa 6 — Qualidade e distribuição

- Automatizar testes e verificações para cada plataforma oficialmente suportada.
- Documentar instalação, atualização, requisitos externos e recuperação de projetos.
- Definir processo de release, integridade dos artefatos e inventário de dependências.

**Saída esperada:** releases repetíveis, testadas e documentadas.

## Revisão do roadmap

O roadmap deve ser atualizado por pull request. Mudanças de ordem, escopo ou critérios devem explicar a razão e, quando pertinente, apontar para a issue ou ADR relacionada.
