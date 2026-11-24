# TODO — primeiro módulo técnico do FORGE

## Concluído — criar projeto técnico de balancim/andaime suspenso

O usuário consegue iniciar um projeto técnico a partir do workspace existente, preencher equipamento, fabricante/modelo, empresa emitente, cliente, obra, ART, responsável e data, e receber um projeto local com manifesto técnico, dados estruturados e capítulos LaTeX iniciais. O projeto continua editável no editor LaTeX e aparece junto aos demais projetos. Cobertura: 13 testes Node e smoke test de navegador aprovados.

## Concluído — preservar dados técnicos no armazenamento local

O metadado técnico é salvo junto ao projeto no IndexedDB ou fallback localStorage, incluído em backup/restauração e mantido quando o usuário troca arquivos ou reabre o projeto.

## Manter limites explícitos

A primeira entrega não deve apresentar PDF compilado, conformidade normativa, assinatura digital, catálogo completo, anexos enviados ou sincronização remota como recursos prontos.

## Próximos resultados ainda abertos

Implementar modelos técnicos adicionais, anexos/fotos, catálogo de equipamentos, checklists editáveis, validação de fontes técnicas e compilação LaTeX real depois de definir a arquitetura do motor.
