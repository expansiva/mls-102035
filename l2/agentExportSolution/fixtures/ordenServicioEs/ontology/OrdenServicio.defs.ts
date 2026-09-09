/// <mls fileReference="_102035_/l4/ordenServicioEs/ontology/OrdenServicio.defs.ts" enhancement="_blank"/>

import type { Ns4OntologyEntityArtifact } from '/_102035_/l2/agentNewSolution/types.js';

export const ordenServicioEsEntityOrdenServicio = {
  "schemaVersion": "2026-09-08-ns4-ontology-v7",
  "moduleName": "ordenServicioEs",
  "userLanguage": "es",
  "solutionMode": "new",
  "entityId": "OrdenServicio",
  "title": "Orden de servicio",
  "description": "Registro de recepción, diagnóstico y presupuesto de un aparato.",
  "kind": "core",
  "ownership": "moduleOwned",
  "party": "none",
  "sourceRefs": { "journeyIds": ["abrirOrden"], "featureIds": ["abrirOrden"], "authorityRefs": ["ordenservicioes:abrir"] },
  "fields": [
    {
      "fieldId": "ordenServicioId",
      "title": "Identificador de la orden",
      "type": "uuid",
      "required": true,
      "description": "Identificador estable de la orden de servicio.",
      "constraints": []
    },
    {
      "fieldId": "defectoInformado",
      "title": "Defecto informado",
      "type": "text",
      "required": true,
      "description": "El defecto que el cliente describe en la recepción.",
      "constraints": []
    }
  ],
  "lifecycleStates": [
    { "state": "abierta", "reachedBy": "actor" },
    { "state": "cerrada", "reachedBy": "actor" }
  ],
  "lifecycleLabels": [
    { "code": "abierta", "label": "Abierta" },
    { "code": "cerrada", "label": "Cerrada" }
  ],
  "lifecyclePredicates": [],
  "useRules": ["clienteSoloConsultaSusOrdenes"],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "ordenServicioId",
    "notes": "Tabla del módulo, no del maestro."
  },
  "ontologyHash": "sha256:00",
  "approvedBy": "auto",
  "approvedAt": "2026-09-09T00:00:00.000Z"
} as const satisfies Ns4OntologyEntityArtifact;

export type OrdenServicioEsEntityOrdenServicioType = typeof ordenServicioEsEntityOrdenServicio;

export default ordenServicioEsEntityOrdenServicio;
