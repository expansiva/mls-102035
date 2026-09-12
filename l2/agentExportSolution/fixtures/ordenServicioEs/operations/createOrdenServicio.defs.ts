/// <mls fileReference="_102035_/l4/ordenServicioEs/operations/createOrdenServicio.defs.ts" enhancement="_blank"/>

export const operationCreateOrdenServicio = {
  "operationId": "createOrdenServicio",
  "title": "Crear orden de servicio",
  "actors": ["recepcionista"],
  "entity": "OrdenServicio",
  "kind": "create",
  "reads": ["OrdenServicio"],
  "writes": ["OrdenServicio"],
  "rulesApplied": [],
  "story": {
    "actor": "recepcionista",
    "goal": "Crear orden de servicio",
    "steps": ["Completar el registro nuevo."],
    "outcome": "La orden queda abierta."
  },
  "accessPattern": {
    "kind": "create",
    "description": "Crear orden de servicio",
    "entity": "OrdenServicio",
    "keyField": "OrdenServicio.ordenServicioId",
    "pagination": "none",
    "selection": "none",
    "output": ["OrdenServicio.ordenServicioId"]
  },
  "outputShape": { "kind": "object", "fields": [] },
  "inputs": [
    {
      "inputId": "defectoInformado",
      "fieldRef": "OrdenServicio.defectoInformado",
      "required": true,
      "source": "userInput",
      "description": "El defecto que el cliente describe en la recepción."
    }
  ],
  "pageId": "ordenServicioHub",
  "commandName": "cmdCreateOrdenServicio",
  "bffName": "cmdCreateOrdenServicio"
} as const;

export default operationCreateOrdenServicio;
