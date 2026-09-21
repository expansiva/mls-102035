# review20 — proposta privada

`entry10` agenda um único step `review20`. Antes de preparar o prompt, o step reabre a revisão e os bytes selados, confere o snapshot da task e lê a solicitação persistida. O prompt e o schema próprios geram exatamente uma chamada estruturada; não existe retentativa automática. A resposta passa por `stageReview20`, que aceita apenas `replace` de folha escalar com `expectedJson` vigente. `basis: base-unchanged` permite a primeira alteração quando o valor ainda coincide com a base; um campo já divergente só pode ser refinado com `refine-candidate-edit`.

Uma proposta válida fica em `review20-private-result`, dentro da task privada, limitada a 280.000 caracteres. O envelope inclui a base selada e os mapas de hashes necessários para `reconcile30` operar sem reler stor/tobe. Não é gravada em `tobe/plan`, original, `candidateIO` ou outro stor. Contradição vira um step `clarification` em `waiting_human_input`; saída inválida falha sem agendar outro modelo.

Uma proposta válida agenda o step privado e determinístico `reconcile30`, que consome este resultado sem escrever stor. O envelope também transporta o hash do contexto real capturado no entry e o `correctionAttemptsUsed` persistido na task, permitindo que um reconcile `ready` agende `validate40` sem reler stor. `review20` não valida ou publica o L4.
