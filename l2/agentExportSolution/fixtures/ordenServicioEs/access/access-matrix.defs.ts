/// <mls fileReference="_102035_/l4/ordenServicioEs/access/access-matrix.defs.ts" enhancement="_blank"/>

import type { Ns4AccessMatrixArtifact } from '/_102035_/l2/agentNewSolution/types.js';

export const ordenServicioEsAccessMatrix = {
  "schemaVersion": "2026-08-09-ns4-access-matrix-v2",
  "moduleName": "ordenServicioEs",
  "userLanguage": "es",
  "title": "Matriz de acceso — Orden de servicio",
  "profiles": [
    {
      "profileId": "recepcionista",
      "title": "Recepcionista",
      "kind": "internal",
      "description": "Abre órdenes y entrega el aparato.",
      "actorRefs": ["recepcionista"],
      "landingIntent": "Abrir una orden de recepción."
    },
    {
      "profileId": "cliente",
      "title": "Cliente",
      "kind": "external",
      "description": "Consulta sólo sus propias órdenes.",
      "actorRefs": ["cliente"],
      "landingIntent": "Ver el estado de mis órdenes y el presupuesto."
    }
  ],
  "authorities": [
    {
      "authorityRef": "ordenservicioes:abrir",
      "title": "Abrir orden",
      "description": "Permite registrar la recepción del aparato.",
      "journeyStepRefs": ["abrirOrden.registrarOrden"],
      "informationNeeds": ["Datos del cliente y del aparato"]
    }
  ],
  "grants": [
    {
      "profileRef": "recepcionista",
      "authorityRef": "ordenservicioes:abrir",
      "reason": "El recepcionista abre la orden en el mostrador.",
      "dataScope": { "mode": "organization", "description": "Todas las órdenes del taller." },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Registro completo, incluido el costo interno.",
        "allowedInformation": ["Todo el registro"],
        "deniedInformation": []
      },
      "useRules": []
    },
    {
      "profileRef": "cliente",
      "authorityRef": "ordenservicioes:abrir",
      "reason": "El cliente consulta el presupuesto desde el portal.",
      "dataScope": { "mode": "own", "description": "Sólo las órdenes del propio cliente." },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Estado, diagnóstico y valor del presupuesto.",
        "allowedInformation": ["Estado", "Diagnóstico", "Valor del presupuesto"],
        "deniedInformation": ["Costo interno de las piezas", "Anotaciones técnicas internas"]
      },
      "useRules": ["clienteSoloConsultaSusOrdenes"]
    }
  ],
  "accessHash": "sha256:00",
  "approvedBy": "auto",
  "approvedAt": "2026-09-09T00:00:00.000Z",
  "realization": {
    "status": "pending",
    "compiledFromAccessHash": "sha256:00",
    "operationAuthorityRefs": []
  }
} as const satisfies Ns4AccessMatrixArtifact;

export type OrdenServicioEsAccessMatrixType = typeof ordenServicioEsAccessMatrix;

export default ordenServicioEsAccessMatrix;
