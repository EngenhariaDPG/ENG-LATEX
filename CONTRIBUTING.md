# Como contribuir

Obrigado pelo interesse no FORGE. O repositório está em planejamento e mantém um pacote-fonte legado do EngLaTeX 1.1. Para que mudanças sejam rastreáveis e reversíveis, use Issues e pull requests.

## Antes de começar

- Verifique se já existe uma issue para o assunto. Se não existir, abra uma usando os formulários do repositório.
- Escreva o objetivo, o que fica fora do escopo, os critérios de aceite, as áreas afetadas e as dependências.
- O pacote `EngLaTeX-1.1-codigo-fonte.zip` deve permanecer inalterado, salvo autorização expressa em issue dedicada.

## Branches e commits

- Não trabalhe diretamente em `main`.
- Use uma branch por issue, por exemplo `docs/123-roadmap` ou `feature/124-projects`.
- Mantenha cada commit relacionado a uma unidade de trabalho revisável.
- Não inclua arquivos gerados, cache, credenciais, `.env` ou dados pessoais.

## Pull requests

- Abra um PR para `main` e vincule a issue correspondente.
- Explique o que mudou e por quê; liste os arquivos ou áreas afetadas.
- Registre verificações executadas e também o que não foi executado.
- Avise sobre mudanças de contrato, compatibilidade, dados, dependências ou escopo.
- Solicite uma revisão independente antes do merge quando houver contribuição de múltiplos contribuidores.
- Não faça merge se os critérios de aceite da issue não estiverem satisfeitos.

## Documentação e decisões

- Escreva a documentação em português do Brasil por padrão; termos técnicos em inglês podem ser mantidos quando forem nomes de ferramentas ou interfaces.
- Mantenha o README breve e use `docs/` para detalhes.
- Registre decisões duradouras em `docs/decisions/` conforme o formato descrito no [índice de decisões](docs/decisions/README.md).

## Licença e distribuição

Esta organização não escolhe nem altera a licença do projeto. A licença e as condições de distribuição devem ser confirmadas pelo responsável antes de aceitar contribuições de terceiros ou redistribuir código e artefatos.
