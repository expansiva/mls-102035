# integration70

## 2026-09-10

- First integration step of agentNewSolution5: inbound/outbound module endpoints, events and
  externals, plus platform plugins. Tool `submitNs5Integration` only when a structural signal
  exists (`kind: system` actor, or a plugin-catalog term in `sourcePrompt`); otherwise persist
  empty lists with `noIntegrationSignal` and no LLM call. Gate: refs, plugin catalog,
  `moduleEndpoint` unknownModule as a warning. v1 form, minimum; align with the production
  harness before any executor. A run then stops at `awaitingStep: finalize80`.
