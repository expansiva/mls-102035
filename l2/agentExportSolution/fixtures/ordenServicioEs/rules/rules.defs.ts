/// <mls fileReference="_102035_/l4/ordenServicioEs/rules/rules.defs.ts" enhancement="_blank"/>

import type { Ns4RulesArtifact } from '/_102035_/l2/agentNewSolution/types.js';

export const ordenServicioEsRules = {
  "schemaVersion": "2026-08-09-ns4-rules-v2",
  "moduleName": "ordenServicioEs",
  "userLanguage": "es",
  "rules": [
    {
      "id": "clienteSoloConsultaSusOrdenes",
      "description": "El cliente ve sólo sus propias órdenes, sin el costo interno de las piezas ni las anotaciones técnicas."
    }
  ],
  "rulesHash": "sha256:00",
  "approvedBy": "auto",
  "approvedAt": "2026-09-09T00:00:00.000Z",
  "realization": { "status": "pending", "compiledFromRulesHash": "sha256:00" }
} as const satisfies Ns4RulesArtifact;

export type OrdenServicioEsRulesType = typeof ordenServicioEsRules;

export default ordenServicioEsRules;
