# Changelog

- 2026-09-21: materialização byte-preserving, `CandidateSnapshot` exato, marca autoritativa
  `candidateMarkResult` e resultado privado com permit consumível.
- 2026-09-21: publicação condicional integrada no mesmo step por `publishWithPermit`; snapshot fica
  somente em memória e o resultado persistido contém apenas referências e resumo limitado.
- 2026-09-21: retry end-to-end consulta primeiro `replaySubmitted`; IDs são determinísticos e a marca
  transporta o snapshot de saída completo para impedir resultado completed incoerente.
- 2026-09-21: contador de correção passou a integrar a identidade de publicação; antes de marcar,
  `finalize50` recompõe toda a cadeia e reexecuta a validação determinística, recusando estado privado
  adulterado.
