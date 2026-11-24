# Módulo de documentação técnica

**Estado:** especificação inicial; não representa funcionalidade já entregue.

## Primeiro incremento implementado

O FORGE Web já possui um primeiro fluxo funcional em `apps/web/`: o botão `Livro técnico` abre um formulário, cria um projeto local de Livro de Inspeção de Balancim/Andaime Suspenso, salva os dados técnicos no projeto e gera `main.tex`, `dados/equipamento.json` e capítulos LaTeX editáveis. O manifesto técnico fica associado ao registro local e acompanha o backup. Esta entrega ainda é um modelo inicial, não um laudo final nem uma declaração de conformidade.

## Objetivo

Permitir que o usuário crie livros e documentos técnicos a partir de dados estruturados e modelos LaTeX, mantendo acesso completo ao código-fonte e aos anexos.

## Tipos iniciais

- Livro de inspeção de balancim/andaime suspenso.
- Laudo de liberação de andaime suspenso.
- Termo de entrega técnica.
- Checklist mecânico, diário e mensal.
- Registro de manutenção preventiva, corretiva e ocorrências.
- Livro de equipamento para elevador cremalheira.

## Estrutura comum de um projeto técnico

```text
projeto-tecnico/
├── manifest.json
├── main.tex
├── dados/
│   ├── empresa.tex
│   ├── obra.tex
│   ├── equipamento.tex
│   └── responsaveis.tex
├── capitulos/
│   ├── abertura.tex
│   ├── identificacao.tex
│   ├── entrega-tecnica.tex
│   ├── checklist.tex
│   ├── manutencao.tex
│   └── liberacao.tex
├── registros/
│   ├── inspecoes.json
│   └── manutencoes.json
├── imagens/
├── certificados/
├── manuais/
└── referencias.bib
```

A estrutura é uma proposta. O gerador não deve obrigar o usuário a manter os nomes se ele optar por editar o projeto manualmente, mas o manifesto precisa preservar a relação entre dados, arquivos e modelo.

## Entidades mínimas

### Empresa e obra

Razão social, nome fantasia, CNPJ, endereço, contatos, contratante, contratada, obra, endereço da obra e período de uso.

### Equipamento

Tipo, fabricante, modelo, número de série ou identificação patrimonial, quantidade, composição, capacidade, dimensões, acionamento, tensão, componentes, localização e fontes técnicas.

### Responsável

Nome, função, registro profissional quando fornecido, empresa, contato, papel no documento e assinatura pendente/recebida. O sistema não cria registro profissional nem assinatura.

### Inspeção

Data, equipamento, inspetor, periodicidade, item, status, observação, ação corretiva, evidência, anexos e revisão.

### Manutenção

Tipo, data, horímetro quando aplicável, descrição, peças, responsável, resultado, próxima data e anexos.

### Documento-fonte

Tipo, nome, arquivo, origem, versão/data, escopo e observações. Exemplos: manual do fabricante, ART, projeto, certificado, contrato e norma fornecida pelo usuário.

## Fluxo previsto

1. Escolher `Novo projeto técnico` no mesmo seletor de projetos do editor.
2. Escolher o tipo de documento e o modelo.
3. Cadastrar empresa, obra, equipamento e responsáveis.
4. Importar manuais, certificados, fotos e documentos de apoio.
5. Preencher os formulários e checklists.
6. Gerar os arquivos LaTeX a partir dos dados.
7. Editar qualquer capítulo diretamente no editor LaTeX.
8. Validar campos obrigatórios, referências e anexos.
9. Compilar quando o motor LaTeX estiver disponível.
10. Exportar o projeto completo e o PDF, quando gerado.

## Validações

O módulo deve validar formato de CNPJ, datas, unidades, referências a equipamentos, campos vazios, duplicidade de identificadores, anexos ausentes e coerência básica de tabelas. Essas validações são de qualidade de dados, não de conformidade legal ou de engenharia.

## Livro de balancim/andaime suspenso

O modelo inicial deve contemplar capa, termo de abertura, dados do emitente e cliente, identificação do equipamento, referências técnicas, requisitos aplicáveis fornecidos pelo responsável, entrega técnica, checklist mecânico, programação preventiva, checklist diário, manutenção, ocorrências, liberação e anexos.

O manual do fabricante pode fornecer especificações e procedimentos, mas os dados devem permanecer vinculados ao documento-fonte e revisáveis.

## Livro de elevador cremalheira

O modelo deverá ser criado depois da validação do primeiro módulo. Deve ter campos e checklists próprios para torre, ancoragens, cabine, portas/cancelas, cremalheira, freios, limitadores, emergência, aterramento, base, capacidade, manutenção e liberação. Não reutilizar automaticamente critérios do balancim.

## Saída e rastreabilidade

A exportação deve incluir o PDF, quando existir, o projeto LaTeX, o manifesto, os dados, anexos, fontes técnicas e um relatório de validação. Cada documento gerado deve registrar modelo, versão, data de geração e revisão do projeto.
