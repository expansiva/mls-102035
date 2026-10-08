# agendaClinica — regra `anotacaoObrigatoriaNoAtendimento` alterada

Fixture **esperada** do `changeEffort.json` (quem produz o arquivo real é a `p4_34`). Gabarito medido pelo How em `mls-102047`: L2 `cc1b2e6`, L1 `79f94cc`.

Item `rule:anotacaoObrigatoriaNoAtendimento` `changed`. `regenerateDefs: []`, `runAgents: []`, `status: simple`.

`path` é o def de produto, relativo ao projeto do master. No `merged` cada unidade leva `project` (`102020` a página, `102021` as três do L1).

Onde o id aparece, e por isso entra em `materialize`:

- L2 `cc1b2e6`: página `agenda_diaria` — `rules` da rota no contrato, linha 121; função `rules` no shared da página, linha 190. O JSDoc de `contracts/agenda_diaria.defs.ts:113` só parafraseia a regra; não é o id.
- L1 `79f94cc`: usecase `registrarAtendimento` (`rulesApplied`, aponta para `l4/agendaClinica/rules.defs.ts`); entidade `consulta`, `ruleRefs` da transição, linhas 111–114; request `agenda_diaria`, `rules` da rota, linhas 350–353.

Ficam de fora `listConsulta` e `getConsulta`: só `rulePlan` herdado (`origin: Consulta.defs.ts#rules`), sem aplicar o id.

Rematerializar lê o texto da regra no L4 e implementa a alteração. Não é um caso de "zero LLM".
