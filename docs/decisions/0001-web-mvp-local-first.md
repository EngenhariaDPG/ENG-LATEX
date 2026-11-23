# ADR 0001 — MVP web local-first sem compilação

- **Status:** Proposta para aprovação
- **Data:** 2026-11-23
- **Responsável pela decisão:** responsável pelo produto FORGE

## Contexto

A frente web precisa entregar uma experiência inicial compatível com o modelo de projetos e arquivos, mas não há API de produto compartilhada aprovada, OAuth configurado ou compilador validado em browser/Android. GitHub Pages é hosting estático. O executável Tectonic do ambiente legado não pode ser presumido como executável em browser.

## Decisão proposta

Adotar para o primeiro protótipo a opção C: interface estática, armazenamento local do navegador, importação/exportação e compilação desativada. Isolar armazenamento e compilação por adaptadores. Tratar Drive por OAuth como hipótese futura por usuário, com escopos mínimos e consentimento explícito.

## Alternativas consideradas

- **A — Pages + WASM + Drive:** tecnicamente possível em subset de LaTeX, mas engine, pacotes, fontes, licenças, memória e desempenho móvel não foram validados.
- **B — helper local:** oferece acesso ao compilador/filesystem desktop, mas exige instalador e hardening de localhost; não resolve Android.
- **D — serviço remoto:** pode unificar clientes, mas exige backend, isolamento, custos, segurança e política de dados, sem aprovação atual.

## Consequências

- A experiência de edição e gestão de projetos pode evoluir sem alegar compilação PDF.
- O protótipo não transfere documentos nem autentica contas Google.
- A sincronização Drive e compilação são bloqueios explícitos, não falhas ocultas.
- Web e Android poderão consumir o mesmo contrato de domínio versionado, mantendo UIs independentes.

## Reversão

Revisar esta ADR após benchmark de WASM, validação do helper desktop e/ou aprovação de backend remoto, com critérios de compatibilidade, segurança e custos.
