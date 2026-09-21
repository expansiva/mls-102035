# correction45 — correção privada dirigida

`correction45` é determinístico e não chama LLM. Ele examina somente erros retornados pelo
`validate40` e pode restaurar um escalar exato para o valor correspondente da base congelada. Não
adiciona/remove paths, não altera identidade e não inventa valores.

Uma tentativa só é contabilizada quando ao menos uma mutação segura é realmente aplicada. Sem alvo
seguro, o draft fica byte a byte equivalente no estado JSON, o contador não muda e o fluxo termina
fechado. Cada resultado corrigido fica em estado privado da task e agenda uma nova validação. O
contador máximo é três por `requestKey`; a cadeia persistida é retomada sem zerar.
