# Visão do produto FORGE

**Estado:** direção aprovada para orientar a evolução da PR #2
**Data:** 24/11/2026

## Tese do produto

O FORGE é um ambiente de autoria técnica. Seu núcleo continua sendo um editor LaTeX completo, com liberdade para editar arquivos, modelos e código. Sobre esse núcleo será construída uma camada de documentação técnica estruturada, voltada a livros de equipamentos, laudos, checklists, manuais, registros e relatórios.

A documentação técnica não substitui o editor LaTeX e não transforma o FORGE em um formulário fechado. Toda informação gerada pelo módulo técnico deve permanecer editável como dados, arquivos LaTeX, tabelas, imagens e anexos.

## Dois núcleos integrados

### Editor LaTeX

O editor é responsável por projetos, arquivos, árvore de documentos, edição de código, modelos, compilação, visualização PDF, histórico, referências, tabelas, fórmulas, símbolos, corretor e importação/exportação. Recursos ainda não implementados permanecem explicitamente marcados como futuros.

### Documentação técnica

O módulo técnico oferece formulários, catálogos e geradores para criar documentos padronizados sem retirar o controle do autor. Os primeiros casos são livros de inspeção e liberação de balancim/andaime suspenso e, depois, elevador cremalheira.

## Princípios

1. **LaTeX continua sendo o núcleo de autoria.** O código gerado pode ser aberto e editado diretamente.
2. **Dados separados de apresentação.** Dados da obra, equipamento, responsáveis e inspeções não devem ficar presos em texto formatado.
3. **Modelos versionados.** Cada documento nasce de um modelo identificável, com versão e origem.
4. **Fontes técnicas rastreáveis.** Limites, procedimentos e checklists devem apontar para manual, projeto, norma ou decisão técnica fornecida pelo usuário.
5. **Nenhuma conformidade inventada.** O FORGE pode sinalizar campos faltantes e inconsistências, mas não substitui profissional habilitado nem declara conformidade sozinho.
6. **Interoperabilidade.** O projeto deve poder ser exportado com `.tex`, dados, imagens, anexos e manifesto.
7. **Preservação.** O editor LaTeX atual, o desktop legado e o ZIP histórico continuam preservados.

## Fora do escopo automático

O FORGE não deve, sem revisão autorizada, interpretar um manual como aprovação legal, atualizar norma por conta própria, preencher assinatura, fabricar ART, declarar equipamento liberado ou transformar uma sugestão em laudo técnico assinado.

## Estado de implementação

- Editor Web local: protótipo funcional com persistência local e interface inspirada no Overleaf.
- Desktop Rust: código de trabalho e pipeline Windows documentados na PR #2.
- Módulo de documentação técnica: direção aprovada; ainda não implementado como fluxo de produto.
- Compilação Web, Drive, colaboração e backend: não anunciar como funcionais enquanto não houver implementação e testes.
