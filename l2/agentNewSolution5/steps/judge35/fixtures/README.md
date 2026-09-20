# judge35 fixtures

- `candidates-12.json` — journeys / ontology transitions / processes of the twelve v4 modules
  (compras, manutencaoFrota, ordenServicio from `ns5_leva_v4_r2`; the rest from `ns5_leva_v4`).
  Input of `collectNs5JudgeCandidates`. Not a flow-v2 replay pack.
- `locacaoEquipamentos-before.json` — the locacao slice of that pack, before ns5_63 regenerates it.
  Includes the four index relationships (`contratoLocacaoEquipamentos` is the N:N the coverage
  hint/gate uses).
- `locacaoEquipamentos-after.json` — ns5_63 regenerated slice: Equipamento has no lifecycle,
  written `emManutencao` (boolean) and derived `situacaoAtual`, plus the module rules. Input of
  the written-switch collector (one candidate: `Equipamento.emManutencao`).
