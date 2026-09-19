# judge35 fixtures

- `candidates-12.json` — journeys / ontology transitions / processes of the twelve v4 modules
  (compras, manutencaoFrota, ordenServicio from `ns5_leva_v4_r2`; the rest from `ns5_leva_v4`).
  Input of `collectNs5JudgeCandidates`. Not a flow-v2 replay pack.
- `locacaoEquipamentos-before.json` — the locacao slice of that pack, before ns5_63 regenerates it.
- `locacaoEquipamentos-after.json` — filled byte-for-byte after ns5_63 (supervisor live proof).
Not present yet.
