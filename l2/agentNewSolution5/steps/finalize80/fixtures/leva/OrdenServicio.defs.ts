/// <mls fileReference="_102047_/l4/ordenServicio/ontology/OrdenServicio.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioEntityOrdenServicio = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "ordenServicio",
  "entityId": "OrdenServicio",
  "title": "Orden de servicio",
  "description": "Registro transaccional de la recepción, análisis, presupuesto, autorización, reparación y entrega de un aparato.",
  "kind": "core",
  "party": "none",
  "displayField": "numeroOrden",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único de la orden de servicio."
    },
    {
      "fieldId": "numeroOrden",
      "title": "Número de orden",
      "type": "string",
      "required": true,
      "unique": true,
      "description": "Número secuencial único asignado a la orden de servicio."
    },
    {
      "fieldId": "clienteId",
      "title": "Cliente",
      "type": "uuid",
      "required": true,
      "description": "Referencia al cliente titular de la orden de servicio."
    },
    {
      "fieldId": "aparatoId",
      "title": "Aparato",
      "type": "uuid",
      "required": true,
      "description": "Referencia al aparato recibido para diagnóstico, reparación y entrega."
    },
    {
      "fieldId": "defectoInformado",
      "title": "Defecto informado",
      "type": "text",
      "required": true,
      "description": "Descripción del problema comunicada por el cliente al recibir el aparato."
    },
    {
      "fieldId": "fotosRecepcion",
      "title": "Fotos de recepción",
      "type": "json",
      "required": false,
      "description": "Referencias a las fotos aportadas del aparato al momento de su recepción."
    },
    {
      "fieldId": "diagnostico",
      "title": "Diagnóstico",
      "type": "text",
      "required": false,
      "description": "Resultado técnico del análisis del aparato."
    },
    {
      "fieldId": "anotacionesTecnicas",
      "title": "Anotaciones técnicas",
      "type": "text",
      "required": false,
      "description": "Observaciones internas del técnico que no se muestran al cliente."
    },
    {
      "fieldId": "valorPresupuesto",
      "title": "Valor del presupuesto",
      "type": "money",
      "required": false,
      "description": "Importe presupuestado que se comunica al cliente para autorizar la reparación."
    },
    {
      "fieldId": "fechaEntrega",
      "title": "Fecha de entrega",
      "type": "datetime",
      "required": false,
      "description": "Fecha y hora en que el aparato fue entregado al cliente."
    },
    {
      "fieldId": "status",
      "title": "Estado",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "recibida",
          "title": "Recibida"
        },
        {
          "value": "presupuestada",
          "title": "Presupuestada"
        },
        {
          "value": "pendienteAprobacion",
          "title": "Pendiente de aprobación"
        },
        {
          "value": "aprobada",
          "title": "Aprobada"
        },
        {
          "value": "rechazada",
          "title": "Rechazada, disponible para retiro"
        },
        {
          "value": "listaParaEntrega",
          "title": "Lista para entrega"
        },
        {
          "value": "finalizada",
          "title": "Finalizada"
        }
      ],
      "description": "Estado actual de la orden de servicio dentro de su proceso de atención."
    }
  ],
  "lifecycleStates": [
    {
      "state": "recibida",
      "reachedBy": "actor"
    },
    {
      "state": "presupuestada",
      "reachedBy": "actor"
    },
    {
      "state": "pendienteAprobacion",
      "reachedBy": "actor"
    },
    {
      "state": "aprobada",
      "reachedBy": "actor"
    },
    {
      "state": "rechazada",
      "reachedBy": "actor"
    },
    {
      "state": "listaParaEntrega",
      "reachedBy": "actor"
    },
    {
      "state": "finalizada",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "registrarDiagnosticoYpresupuesto",
      "from": [
        "recibida"
      ],
      "to": "presupuestada",
      "by": [
        "tecnico"
      ],
      "description": "El técnico registra el diagnóstico, las piezas necesarias y el valor del presupuesto."
    },
    {
      "transitionId": "enviarPresupuestoAlCliente",
      "from": [
        "presupuestada"
      ],
      "to": "pendienteAprobacion",
      "by": [
        "tecnico"
      ],
      "description": "El técnico envía el presupuesto al portal del cliente para su decisión."
    },
    {
      "transitionId": "aprobarPresupuesto",
      "from": [
        "pendienteAprobacion"
      ],
      "to": "aprobada",
      "by": [
        "cliente"
      ],
      "description": "El cliente aprueba el presupuesto y autoriza la reparación."
    },
    {
      "transitionId": "rechazarPresupuesto",
      "from": [
        "pendienteAprobacion"
      ],
      "to": "rechazada",
      "by": [
        "cliente"
      ],
      "description": "El cliente rechaza el presupuesto y el aparato queda disponible para retiro."
    },
    {
      "transitionId": "marcarOrdenLista",
      "from": [
        "aprobada"
      ],
      "to": "listaParaEntrega",
      "by": [
        "tecnico"
      ],
      "description": "El técnico marca la orden como lista para entregar tras registrar la reparación."
    },
    {
      "transitionId": "registrarEntregaYfinalizacion",
      "from": [
        "rechazada",
        "listaParaEntrega"
      ],
      "to": "finalizada",
      "by": [
        "recepcionista"
      ],
      "description": "El recepcionista entrega el aparato al cliente y finaliza la orden."
    }
  ],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type OrdenServicioEntityOrdenServicioType = typeof ordenServicioEntityOrdenServicio;

export default ordenServicioEntityOrdenServicio;
