# TODO — primeiro módulo técnico do FORGE

## Criar projeto técnico de balancim/andaime suspenso

O usuário deve conseguir iniciar um projeto técnico a partir do workspace existente, preencher equipamento, fabricante/modelo, empresa emitente, cliente, obra, ART, responsável e data, e receber um projeto local com manifesto técnico, dados estruturados e capítulos LaTeX iniciais. O projeto deve continuar editável no editor LaTeX e aparecer junto aos demais projetos.

## Preservar dados técnicos no armazenamento local

O metadado técnico deve ser salvo junto ao projeto no IndexedDB ou fallback localStorage, incluído em backup/restauração e mantido quando o usuário troca arquivos ou reabre o projeto.

## Manter limites explícitos

A primeira entrega não deve apresentar PDF compilado, conformidade normativa, assinatura digital, catálogo completo, anexos enviados ou sincronização remota como recursos prontos.

## Próximos resultados ainda abertos

Implementar modelos técnicos adicionais, anexos/fotos, catálogo de equipamentos, checklists editáveis, validação de fontes técnicas e compilação LaTeX real depois de definir a arquitetura do motor.
