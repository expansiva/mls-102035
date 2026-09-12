/// <mls fileReference="_102047_/l4/ordenServicio/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "ordenServicio",
  "inbound": [],
  "outbound": [
    {
      "id": "enviarPresupuesto",
      "kind": "event",
      "to": "any",
      "event": "enviarPresupuesto",
      "on": "OrdenServicio.enviarPresupuesto",
      "description": "Publica que el presupuesto de una orden de servicio fue enviado al cliente.",
      "entityRefs": [
        "OrdenServicio"
      ]
    },
    {
      "id": "aprobarPresupuesto",
      "kind": "event",
      "to": "any",
      "event": "aprobarPresupuesto",
      "on": "OrdenServicio.aprobarPresupuesto",
      "description": "Publica que el cliente aprobó el presupuesto de una orden de servicio.",
      "entityRefs": [
        "OrdenServicio"
      ]
    },
    {
      "id": "rechazarPresupuesto",
      "kind": "event",
      "to": "any",
      "event": "rechazarPresupuesto",
      "on": "OrdenServicio.rechazarPresupuesto",
      "description": "Publica que el cliente rechazó el presupuesto y que el aparato quedó disponible para retiro.",
      "entityRefs": [
        "OrdenServicio"
      ]
    },
    {
      "id": "marcarLista",
      "kind": "event",
      "to": "any",
      "event": "marcarLista",
      "on": "OrdenServicio.marcarLista",
      "description": "Publica que la reparación fue terminada y la orden está lista para entrega.",
      "entityRefs": [
        "OrdenServicio"
      ]
    },
    {
      "id": "entregarYfinalizar",
      "kind": "event",
      "to": "any",
      "event": "entregarYfinalizar",
      "on": "OrdenServicio.entregarYfinalizar",
      "description": "Publica que el aparato fue entregado al cliente y la orden de servicio fue finalizada.",
      "entityRefs": [
        "OrdenServicio"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type OrdenServicioIntegrationType = typeof ordenServicioIntegration;

export default ordenServicioIntegration;
