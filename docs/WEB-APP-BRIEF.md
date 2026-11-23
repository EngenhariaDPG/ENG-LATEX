# FORGE Web — briefing de aplicação

**Estado:** briefing inicial consolidado em 23/11/2026. A main consultada não contém a versão anterior de WEB-APP-BRIEF.md; este documento passa a registrar os fatos, hipóteses, riscos e propostas desta frente.

## Fatos verificados
- A main contém organização documental e o ZIP legado na raiz; não contém uma aplicação FORGE implementada.
- O ZIP EngLaTeX-1.1-codigo-fonte.zip foi mantido no local original e não foi extraído ou reutilizado nesta entrega.
- Não há matriz de reuso anterior disponível. Não se presume autorização para copiar módulos, CSS, ícones ou componentes do legado.
- O escopo legado descrito pelo responsável (web/src, backend Rust/Axum local e compilador local) não foi aberto nem testado nesta frente.

## Produto e experiência
FORGE é um ambiente modular multipropósito. A web é independente do Android, em pt-BR no primeiro ciclo, com identidade original laranja e experiência familiar de IDE: projetos, arquivos, editor, estado de salvamento, visualização e diagnósticos.
- Desktop: navegação, editor e painel lateral recolhível.
- Tablet: priorizar editor e alternância entre painel/arquivos; evitar três colunas comprimidas.
- Celular: vistas alternáveis, ações acessíveis por toque e sem depender de hover.
- Não reutilizar marca, código, ícones, imagens ou composição visual distintiva do Overleaf.

## Fatos, hipóteses, riscos e propostas
| Tipo | Registro |
|---|---|
| Fato | GitHub Pages entrega conteúdo estático, não API persistente. |
| Fato | Tectonic para Windows não se torna executável no navegador ou Android por estar presente no legado. |
| Fato | SwiftLaTeX demonstra motores TeX em WASM; o projeto identificado declara AGPL-3.0 e depende de arquivos TeX/CTAN. |
| Hipótese | Cada usuário poderá armazenar projetos em sua própria conta Drive por OAuth. |
| Hipótese | Projeto poderá ser uma pasta Drive com manifesto, fontes e recursos. |
| Risco | Licenças de engine, pacotes e fontes; memória/performance em dispositivos móveis. |
| Risco | Conflitos multi-dispositivo, rede offline, cotas, consentimento e revogação OAuth. |
| Proposta | Começar por armazenamento local e exportação; manter Drive/compilação desativados atrás de adaptadores. |
| Proposta | Definir contrato JSON versionado e independente das interfaces web/Android. |

## Matriz de reuso
| Área legada | Decisão | Razão |
|---|---|---|
| web/src | Não reutilizar nesta fase | Conteúdo não inspecionado e dependências desconhecidas. |
| Backend Rust/Axum | Referência arquitetural apenas | Rotas locais não são API pública aprovada. |
| Compilador local | Não reutilizar no browser | Executável local não equivale a WASM. |
| ZIP legado | Preservar byte a byte | Requisito explícito. |

## Critérios do protótipo
- Listar/criar projetos demonstrativos no armazenamento local do navegador.
- Editar um .tex, indicar alterações pendentes e persistir localmente.
- Importar arquivo .tex/.txt e exportar arquivo atual.
- Marcar preview/diagnósticos como demonstrativos.
- Não autenticar Drive, transferir fontes, executar compilador ou pedir credenciais.
- Layout desktop/mobile e uso básico por teclado.

## Decisões pendentes
1. Aprovar formato de projeto/pasta Drive e arquitetura local-first.
2. Aprovar OAuth, escopos, política de privacidade e verificação Google.
3. Decidir se MVP pode ficar sem compilação PDF ou se helper local deve ser priorizado.
4. Definir navegadores e sistemas operacionais suportados.
5. Definir licença FORGE e política de dependências/recursos TeX.
