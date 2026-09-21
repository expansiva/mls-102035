# Changelog

- 2026-09-21: core puro inicial com cobertura mr_03a, contador recebido do caller e limite de três tentativas.
- 2026-09-21: contador corrigido para tentativas de correção; validação apenas observa o estado e nunca o incrementa.
- 2026-09-21: step privado integrado ao motor com contexto real congelado no entry, revalidação de identidade/hashes/áreas e contrato de finalize explicitamente desabilitado.
- 2026-09-21: resultado `ready` passou a agendar `finalize50`; o step seguinte marca bytes exatos e
  publica somente pelo permit autoritativo.
- 2026-09-21: resultado inválido corrigível passou a agendar `correction45`; revalidações retomam a cadeia privada sem zerar o contador.
