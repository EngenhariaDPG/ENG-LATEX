# Decisões de projeto

Esta pasta guarda decisões duradouras que afetam o escopo, as interfaces, a compatibilidade ou a distribuição do FORGE. Uma decisão deve ser registrada quando uma issue ou pull request introduzir uma escolha difícil de reverter ou que outras tarefas precisam compartilhar.

Não é necessário criar um documento para toda alteração. Use a issue/PR para decisões locais e temporárias.

## Modelo

Copie este esqueleto para um arquivo `NNNN-titulo-curto.md`:

```markdown
# ADR NNNN: Título

- Estado: proposta | aprovada | rejeitada | substituída
- Data: AAAA-MM-DD
- Issue/PR: #n

## Contexto
Qual problema ou escolha precisa ser resolvida?

## Decisão
O que foi escolhido e quais limites se aplicam?

## Alternativas consideradas
Quais opções relevantes foram avaliadas?

## Consequências
Quais benefícios, custos, riscos e efeitos de compatibilidade decorrem da decisão?
```

Uma ADR aprovada não deve ser apagada para ocultar uma decisão anterior. Se a decisão mudar, registre a substituição e faça referência ao documento anterior.
