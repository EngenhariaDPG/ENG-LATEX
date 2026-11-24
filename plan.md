# Plano — primeiro módulo técnico do FORGE

## Objetivo

Adicionar ao FORGE Web um fluxo inicial de criação de projeto técnico para Livro de Inspeção de Balancim/Andaime Suspenso, preservando o editor LaTeX e o armazenamento local já existentes.

## Abordagem

- Criar um núcleo JavaScript puro para validar dados técnicos e gerar um projeto LaTeX inicial.
- Adicionar um botão `Novo livro técnico` ao workspace atual.
- Coletar dados mínimos em formulário: equipamento, fabricante/modelo, empresa, cliente/obra, ART, responsável e data.
- Criar arquivos LaTeX separados por capítulos, manifesto técnico e metadados persistidos no projeto.
- Manter edição direta no editor e não declarar compilação real no Web MVP.
- Estender backup/restauração local para preservar o metadado técnico.

## Estrutura

- `apps/web/technical-core.js`: validação e geração pura do modelo técnico.
- `apps/web/index.html`: ação e modal do novo livro técnico.
- `apps/web/styles.css`: estilos do modal e do indicador técnico.
- `apps/web/app.js`: criação, persistência, restauração e renderização do projeto técnico.
- `tests/web-core.test.cjs`: testes do gerador e das validações.

## Limites

Esta entrega não implementa compilação LaTeX no navegador, assinatura digital, validação de conformidade, catálogo completo de equipamentos, upload de anexos ou geração de PDF real.
