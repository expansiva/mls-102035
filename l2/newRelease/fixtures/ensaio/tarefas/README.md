# tarefas — módulo gerado por inteiro, cenário das fases de implementação (l4_p4_96)

`l4/` e `l1/`: cópia byte a byte de `mls-102047/l4/tarefas` (53 arquivos, com o `pool/` da geração inicial) e `mls-102047/l1/tarefas` (252 arquivos), HEAD `a6a911c4` do 102047, 04/11/2026. `l2/tarefas` (141 arquivos) não entra: as fases `postprocess`, `prepare` e `/compare` do `agentNewReleaseL1` não o leem; entra quando uma fase de L2 for exercitada.

`changeEffortSoRegra.json`: **montado na fixture, não capturado.** É o estado já aceito, depois da promoção, do pedido de só regra do teste real de 04/11 (`rules.nomeListaUnico`, nome com no mínimo 4 caracteres): forma do `changeEffort` do ensaio do `agendaClinica` (`solution/fixtures/changeEffort/agendaClinica-regra-anotacao`), com um item, sem materialização e sem `runAgents`. O teste o grava em `l4/tarefas/pool/l4/changeEffort.json`.

Não misturar com o `controleEstoque`, que é o cenário dos planners.
