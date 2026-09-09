/// <mls fileReference="_102035_/l4/ordenServicioEs/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns4OntologyIndexArtifact } from '/_102035_/l2/agentNewSolution/types.js';

export const ordenServicioEsOntologyIndex = {
  "schemaVersion": "2026-09-08-ns4-ontology-v7",
  "moduleName": "ordenServicioEs",
  "userLanguage": "es",
  "solutionMode": "new",
  "title": "Ontología — Orden de servicio",
  "businessDomain": "Taller de electrónica: recepción, diagnóstico y presupuesto.",
  "entities": [
    {
      "entityId": "OrdenServicio",
      "title": "Orden de servicio",
      "kind": "core",
      "storage": { "target": "moduleDatabase", "scope": "module", "idField": "ordenServicioId" },
      "definitionRef": "l4/ordenServicioEs/ontology/OrdenServicio.defs.ts"
    }
  ],
  "relationships": [
    {
      "relationshipId": "ordenTieneCliente",
      "fromEntity": "OrdenServicio",
      "toEntity": "Cliente",
      "type": "manyToOne",
      "required": true,
      "description": "Cada orden pertenece a un único cliente.",
      "persistence": { "mode": "crossStoreReference" },
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "OrdenServicio",
        "from": { "entityId": "OrdenServicio", "fieldIds": ["clienteId"] },
        "to": { "entityId": "Cliente", "fieldIds": ["clienteId"] },
        "description": "La orden apunta al cliente dueño del aparato."
      }
    }
  ],
  "ontologyHash": "sha256:00",
  "approvedBy": "auto",
  "approvedAt": "2026-09-09T00:00:00.000Z",
  "realization": { "status": "pending", "compiledFromOntologyHash": "sha256:00" }
} as const satisfies Ns4OntologyIndexArtifact;

export type OrdenServicioEsOntologyIndexType = typeof ordenServicioEsOntologyIndex;

export default ordenServicioEsOntologyIndex;
