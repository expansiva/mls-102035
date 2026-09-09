/// <mls fileReference="_102035_/l4/ordenServicioEs/usecases/index.defs.ts" enhancement="_blank"/>

import type { Ns4UseCaseIndexArtifactV3 } from '/_102035_/l2/agentNewSolution/types.js';

export const ordenServicioEsUseCaseIndex = {
  "schemaVersion": "2026-09-09-ns4-usecase-index-v4",
  "moduleName": "ordenServicioEs",
  "userLanguage": "es",
  "sourceHashes": {
    "journeys": [{ "journeyId": "abrirOrden", "businessHash": "sha256:00" }],
    "ontologyHash": "sha256:00",
    "rulesHash": "sha256:00"
  },
  "useCases": [
    {
      "useCaseId": "registrarOrden",
      "title": "Registrar orden de servicio",
      "kind": "command",
      "compiledFrom": ["abrirOrden.registrarOrden"],
      "useCaseHash": "sha256:00",
      "artifactPath": "l4/ordenServicioEs/usecases/registrarOrden.defs.ts"
    }
  ],
  "realizationHash": "sha256:00",
  "generatedAt": "2026-09-09T00:00:00.000Z",
  "systemDecisions": []
} as const satisfies Ns4UseCaseIndexArtifactV3;

export type OrdenServicioEsUseCaseIndexType = typeof ordenServicioEsUseCaseIndex;

export default ordenServicioEsUseCaseIndex;
