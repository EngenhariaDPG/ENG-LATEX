# ADR 0002: Editor LaTeX como núcleo e documentação técnica como módulo

- Estado: aprovada como direção de produto
- Data: 2026-11-24
- Issue/PR: #2

## Contexto

O FORGE precisa atender ao trabalho principal do usuário: criar livros de equipamentos, laudos, checklists, manuais e relatórios técnicos. Ao mesmo tempo, o projeto já possui a direção de um editor LaTeX com arquivos, modelos, visualização e histórico. Substituir o editor por formulários reduziria a liberdade de autoria e dificultaria a evolução para documentos personalizados.

## Decisão

O editor LaTeX permanece o núcleo do FORGE. A documentação técnica será implementada como um módulo integrado que usa projetos, modelos, dados estruturados, anexos e o motor LaTeX. O módulo pode oferecer formulários e automações, mas sempre deve permitir abrir, revisar e alterar o código gerado.

O modelo de domínio separará dados da obra, equipamento, responsáveis, inspeções e manutenções da apresentação LaTeX. Cada modelo técnico terá versão, fonte e escopo. O sistema poderá validar completude e consistência, mas não emitirá declaração automática de conformidade nem substituirá profissional habilitado.

## Alternativas consideradas

### Criar apenas um gerador fechado de PDF

Rejeitada. Facilita formulários iniciais, mas prende o usuário à interface, dificulta customizações e perde a compatibilidade natural com LaTeX.

### Manter apenas o editor LaTeX sem camada técnica

Rejeitada. Mantém liberdade, mas não resolve a repetição de dados, checklists, anexos e documentos padronizados de equipamentos.

### Migrar tudo para um editor visual sem LaTeX

Rejeitada. Rompe o trabalho existente e reduz o controle técnico sobre layout, referências, tabelas e versionamento.

## Consequências

### Positivas

- Preserva funcionalidades já existentes e o investimento no editor.
- Permite criar documentos técnicos rapidamente sem bloquear edição avançada.
- Torna dados reutilizáveis entre livros, laudos e relatórios.
- Facilita exportação, revisão e auditoria do documento.

### Custos e riscos

- Será necessário definir contratos para dados, modelos e anexos.
- O gerador precisa preservar edições manuais ou sinalizar quando uma regeneração puder substituí-las.
- Cada tipo de equipamento exige critérios próprios e revisão técnica.
- Compilação, sincronização e colaboração continuam sendo decisões separadas.

## Critérios de aceite da direção

- Um projeto LaTeX existente continua abrindo e sendo editável sem o módulo técnico.
- Um projeto técnico gera arquivos LaTeX identificáveis e editáveis.
- O usuário consegue exportar dados, código, anexos e manifesto juntos.
- Campos técnicos indicam origem e estado de revisão.
- A interface não apresenta validação de formulário como aprovação legal ou de engenharia.
