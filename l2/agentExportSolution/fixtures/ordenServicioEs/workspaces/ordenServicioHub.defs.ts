/// <mls fileReference="_102035_/l4/ordenServicioEs/workspaces/ordenServicioHub.defs.ts" enhancement="_blank"/>

export const ordenServicioHubWorkspace = {
  "workspaceId": "ordenServicioHub",
  "title": "Panel de órdenes",
  "actors": ["recepcionista"],
  "kind": "landing",
  "entity": "OrdenServicio",
  "bffCalls": [],
  "sections": [
    { "sectionId": "lista", "intent": "Encontrar la orden y su presupuesto.", "organisms": [] }
  ],
  "operationIds": ["createOrdenServicio"],
  "purpose": "Central de comando de la orden de servicio.",
  "presentation": { "categoryRef": "entityHub", "confidence": 1, "classificationNote": "Hub de la orden." },
  "sliceHash": "sha256:00"
} as const;

export default ordenServicioHubWorkspace;
