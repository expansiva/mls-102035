# Contratos do agentReviewSolution

## Entrada

O agente recebe o projeto pelo contexto de execução e exige uma única invocação estruturada:

```text
@@agentReviewSolution {"moduleName":"agendaClinica","originalL4Path":"l4/agendaClinica/pipeline/releases/<baseId>/l4","temporaryL4Path":"l4/agendaClinica/tobe/plan","request":"<pedido>","expectedRevisionId":"<revisionId>"}
```

`moduleName`, `originalL4Path`, `temporaryL4Path` e `request` são obrigatórios.
`expectedRevisionId` é opcional no parser, mas deve ser enviado pela UI para impedir que uma revisão
troque entre a seleção e a execução. O projeto nunca é inferido da pasta nem aceito dentro do JSON.

Antes de criar trabalho LLM, `entry10` exige que:

- projeto, módulo, base, alteração, revisão e solicitação pertençam ao mesmo registro ativo;
- a pasta original seja exatamente a release da base e a temporária seja exatamente `tobe/plan`;
- os caminhos sejam distintos, relativos ao projeto e não escapem do módulo;
- os hashes correspondam aos bytes relidos da base e da revisão selada;
- o contexto de validação e o contador de correções sejam congelados na task.

## Estados internos

Os steps trocam resultados privados, versionados e limitados em tamanho. Eles não constituem API de
produto e não podem ser usados isoladamente para promover um candidato.

| step | resultado | estados relevantes |
|---|---|---|
| `review20` | `review20-private-result` | proposta estruturada, esclarecimento ou não suportado |
| `reconcile30` | `reconcile30-private-result` | `ready`, `clarification` ou `unsupported` |
| `validate40` | `validate40-private-result` | `ready`, `clarification`, `unsupported` ou `invalid` |
| `correction45` | `correction45-private-result-N` | `corrected` ou `uncorrectable`; máximo de três mutações reais |
| `finalize50` | `finalize50-private-result` | publicação condicional confirmada |

Retomadas recompõem a cadeia completa pelo `requestKey`. Resultado ausente, duplicado, fora de
ordem ou adulterado falha antes de qualquer marca/publicação. Uma validação não consome tentativa;
o contador aumenta somente quando `correction45` aplica ao menos uma restauração escalar segura.

## Saída terminal

O resultado terminal usa `2026-09-21-finalize50-private-result-v3` e contém:

- `project`, `moduleName` e `changeId`;
- `inputRevisionId` e `outputRevisionId`;
- `outputSnapshotHash`;
- `correctionState` (`requestKey` e `correctionAttemptsUsed`);
- `pointer` autoritativo confirmado pelo canal de candidato;
- `summary.fileCount` e `summary.changedPaths`.

Os bytes do snapshot, o permit e o conteúdo dos artefatos não são serializados no resultado privado.
`finalize50` relê a revisão selada, reconstrói os bytes preservando o envelope, marca o snapshot
completo e publica somente por `StudioCandidateAdapter.publishWithPermit`. A publicação só é aceita
quando o ponteiro confirmado identifica exatamente alteração, revisão e hash marcados.

## Limites

O agente não escreve o L4 original, não materializa L1/L2/L5, não executa planners e não estima
esforço. Path novo, removido ou renomeado falha fechado nesta versão. A UI e o acompanhamento do run
são responsabilidades da `mr_04`; este contrato apenas fornece a invocação e a evidência terminal.
