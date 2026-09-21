# finalize50 — materialização exata e marca privada

`finalize50` só aceita um `validate40-private-result` integralmente coberto. Antes de qualquer marca
ou publicação, recompõe todos os pares `validate40`/`correction45` até o
`correctionAttemptsUsed` final, reexecuta cada correção e validação determinística e recusa draft,
áreas, diagnóstico ou contador divergente. Depois relê a revisão imutável em
`pipeline/changes/<change>/revisions/<revision>/l4`, relê a base capturada, recalcula os hashes e
recusa qualquer diferença de identidade, request, conjunto de paths ou bytes.

O scanner compartilhado de defs separa `prefix`, objeto JSON e `suffix`. Arquivo cujo objeto não
mudou conserva todos os bytes. Arquivo alterado substitui somente o objeto por
`JSON.stringify(draft[path], null, 2)`; o envelope precisa ser idêntico ao da base ou corresponder ao
writer canônico. Path novo, removido, renomeado, wrapper ambíguo ou suffix inseguro falha fechado.

Os sources resultantes formam um `CandidateSnapshot` completo mantido somente em memória. O step
primeiro chama `StudioCandidateAdapter.replaySubmitted` pela identidade determinística da saída; um
draft `submitted` durável pode completar o retry sem nova marca. Sem replay, o step confere o snapshot
de entrada com a leitura autoritativa, chama `candidateMarkResult` com o snapshot de saída completo,
confirma a marca por releitura e então chama `publishWithPermit` com o mesmo snapshot. IDs de resultado,
tarefa e revisão de saída são determinísticos; o requestId permanece durável no draft do adapter.
O resultado privado serializa apenas hash, ponteiro e resumo limitado — nunca `files`/`contentBase64`.
Ele não altera
`tobe/plan`, não conecta UI/CLI/run e falha sem resultado de sucesso se persistência/publicação falhar.
