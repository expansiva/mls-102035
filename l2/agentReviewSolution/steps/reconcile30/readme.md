# reconcile30 — step detector privado

Este core não “conserta” o L4. Ele compara base e proposta, considera alteração apenas textual quando todas as folhas modificadas são strings de apresentação conhecidas e expande dependências somente para mudanças estruturais conforme as entradas reais dos gates. Em seguida usa os validadores puros sobre o inventário fornecido.

O step lê exatamente um `review20-private-result` concluído da árvore da task, confere identidade e mapas de hashes com o snapshot congelado e recomputa o diff base/proposta para detectar adulteração. Não relê stor, `tobe` nem `candidateIO`. Em seguida chama o core puro. Qualquer mutação de base, proposta ou draft falha o step.

Saída `ready` significa apenas que as áreas diretas/dependentes verificáveis não apresentaram referência quebrada e é guardada em `reconcile30-private-result`, limitada a 400.000 caracteres. O envelope transporta a base, o draft, os hashes do snapshot, o hash do contexto de validação e o contador de correções. `clarification` cria diagnóstico privado e `waiting_human_input`; `unsupported` cria resultado terminal privado legível. `draft` é sempre uma cópia da proposta e `mutations` é sempre vazio. Não cria ou renomeia IDs, entidades, jornadas, grants, workflows ou integrações; não chama LLM, não escreve stor e não aprova publicação.

Suportado: detectar referências e invariantes cobertas pelos gates de module, journeys, ontology, rules, workflows, access e integration. Não suportado: inferir intenção, criar dependências ausentes, reconciliar workspace e executar oracle/correção. Quando o diagnóstico é `ready`, o step agenda `validate40`, que consome somente esse envelope e o contexto congelado da task.
