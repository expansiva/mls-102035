/// <mls fileReference="_102035_/l4/ordenServicioEs/siteMap.defs.ts" enhancement="_blank"/>

export const ordenServicioEsSiteMap = {
  "moduleName": "ordenServicioEs",
  "note": "Site map (permanent page index) — workspaces, landings and advisory edges.",
  "workspaces": [
    {
      "workspaceId": "ordenServicioHub",
      "title": "Panel de órdenes",
      "actors": ["recepcionista"],
      "kind": "landing",
      "entity": "OrdenServicio",
      "operationIds": ["createOrdenServicio"],
      "purpose": "Central de comando de la orden de servicio."
    }
  ],
  "landings": [
    { "actorId": "recepcionista", "workspaceId": "ordenServicioHub", "reason": "Central de comando de la orden de servicio." }
  ],
  "navigationEdges": [],
  "workspaceIds": ["ordenServicioHub"]
} as const;

export default ordenServicioEsSiteMap;
