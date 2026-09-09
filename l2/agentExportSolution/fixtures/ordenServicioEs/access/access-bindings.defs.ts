/// <mls fileReference="_102035_/l4/ordenServicioEs/access/access-bindings.defs.ts" enhancement="_blank"/>

import type { Ns4AccessBindingsArtifact } from '/_102035_/l2/agentNewSolution/types.js';

export const ordenServicioEsAccessBindings = {
  "schemaVersion": "2026-09-08-ns4-access-bindings-v1",
  "moduleName": "ordenServicioEs",
  "compiledFromAccessHash": "sha256:00",
  "compiledFromOntologyHash": "sha256:00",
  "bindings": [
    {
      "profileRef": "cliente",
      "authorityRef": "ordenservicioes:abrir",
      "entityRef": "OrdenServicio",
      "dataScope": { "mode": "own", "description": "Sólo las órdenes del propio cliente." },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Estado, diagnóstico y valor del presupuesto.",
        "allowedInformation": ["Estado", "Diagnóstico", "Valor del presupuesto"],
        "deniedInformation": ["Costo interno de las piezas"]
      },
      "anchor": null,
      "anchorReason": "El cliente entra por el usuario de la plataforma."
    }
  ],
  "synthesizedAuthorities": [],
  "bindingsHash": "sha256:00"
} as const satisfies Ns4AccessBindingsArtifact;

export type OrdenServicioEsAccessBindingsType = typeof ordenServicioEsAccessBindings;

export default ordenServicioEsAccessBindings;
