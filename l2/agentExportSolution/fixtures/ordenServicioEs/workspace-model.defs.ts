/// <mls fileReference="_102035_/l4/ordenServicioEs/workspace-model.defs.ts" enhancement="_blank"/>

export const ordenServicioEsWorkspaceModel = {
  "planId": "e8-workspace-model",
  "schemaVersion": "2026-08-14-ns4-e8-model-v1",
  "moduleName": "ordenServicioEs",
  "userLanguage": "es",
  "title": "Espacios de trabajo",
  "reviewRound": 1,
  "hubEntity": "OrdenServicio",
  "workspaces": [
    {
      "workspaceId": "ordenServicioHub",
      "tier": "hub",
      "title": "Panel de órdenes",
      "purpose": "Central de comando de la orden de servicio.",
      "kind": "landing",
      "entity": "OrdenServicio",
      "actors": ["recepcionista"],
      "profileRefs": ["recepcionista"],
      "featureRefs": [],
      "hostedStepRefs": [],
      "categoryRef": "entityHub",
      "bffCalls": [],
      "sections": [
        { "sectionId": "lista", "intent": "Encontrar la orden y su presupuesto.", "organisms": [] }
      ]
    }
  ],
  "operations": [
    {
      "operationId": "createOrdenServicio",
      "title": "Crear orden de servicio",
      "kind": "command",
      "entityRef": "OrdenServicio",
      "entityRefs": ["OrdenServicio"],
      "accessPattern": { "kind": "create" },
      "inputs": [
        { "inputId": "defectoInformado", "fieldRef": { "entityId": "OrdenServicio", "fieldId": "defectoInformado" }, "source": "userInput", "required": true, "description": "El defecto que el cliente describe." }
      ],
      "outputRefs": [],
      "useRules": [],
      "transitionRefs": [],
      "story": ["Completar el registro nuevo."],
      "authorityRefs": ["ordenservicioes:abrir"]
    }
  ],
  "menu": [
    { "workspaceId": "ordenServicioHub", "label": "Órdenes", "featureRef": "abrirOrden", "tier": "hub", "profileRefs": ["recepcionista"] }
  ],
  "landings": [
    { "profileRef": "recepcionista", "workspaceId": "ordenServicioHub", "reason": "exclusive" }
  ],
  "systemDecisions": []
} as const;

export default ordenServicioEsWorkspaceModel;
