/// <mls fileReference="_102047_/l4/ordenServicio/ontology/OrdenServicio.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioEntityOrdenServicio = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "ordenServicio",
  "entityId": "OrdenServicio",
  "title": "Orden de servicio",
  "description": "Registro transaccional de la recepción, diagnóstico, presupuesto, decisión del cliente, reparación y entrega de un aparato.",
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
      "description": "Número secuencial asignado a la orden de servicio."
    },
    {
      "fieldId": "clienteId",
      "title": "Cliente",
      "type": "uuid",
      "required": true,
      "description": "Referencia al cliente que presentó el aparato para servicio."
    },
    {
      "fieldId": "aparatoId",
      "title": "Aparato",
      "type": "uuid",
      "required": true,
      "description": "Referencia al aparato recibido para su atención técnica."
    },
    {
      "fieldId": "defectoInformado",
      "title": "Defecto informado",
      "type": "text",
      "required": true,
      "description": "Descripción del problema reportado por el cliente al recibir el aparato."
    },
    {
      "fieldId": "fotosRecepcion",
      "title": "Fotografías de recepción",
      "type": "json",
      "required": false,
      "description": "Referencias a las fotografías tomadas del aparato durante su recepción."
    },
    {
      "fieldId": "recibidoEn",
      "title": "Fecha y hora de recepción",
      "type": "datetime",
      "required": true,
      "description": "Fecha y hora en que el aparato fue recibido para servicio."
    },
    {
      "fieldId": "diagnostico",
      "title": "Diagnóstico",
      "type": "text",
      "required": false,
      "description": "Resultado técnico del análisis del aparato."
    },
    {
      "fieldId": "valorPresupuesto",
      "title": "Valor del presupuesto",
      "type": "money",
      "required": false,
      "description": "Importe presupuestado al cliente para realizar la reparación."
    },
    {
      "fieldId": "anotacionesTecnicas",
      "title": "Anotaciones técnicas",
      "type": "text",
      "required": false,
      "description": "Notas internas del técnico sobre el análisis o la reparación."
    },
    {
      "fieldId": "reparacionRealizada",
      "title": "Reparación realizada",
      "type": "text",
      "required": false,
      "description": "Descripción de las acciones técnicas efectuadas para reparar el aparato."
    },
    {
      "fieldId": "entregadoEn",
      "title": "Fecha y hora de entrega",
      "type": "datetime",
      "required": false,
      "description": "Fecha y hora en que el aparato reparado fue entregado al cliente."
    },
    {
      "fieldId": "status",
      "title": "Estado",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "open",
          "title": "Abierta"
        },
        {
          "value": "quoteSent",
          "title": "Presupuesto enviado"
        },
        {
          "value": "quoteApproved",
          "title": "Presupuesto aprobado"
        },
        {
          "value": "rejected",
          "title": "Rechazada"
        },
        {
          "value": "readyForPickup",
          "title": "Lista para entrega"
        },
        {
          "value": "completed",
          "title": "Finalizada"
        }
      ],
      "description": "Estado actual de la orden de servicio."
    }
  ],
  "details": {
    "costoInternoTotal": {
      "type": "money",
      "description": "Suma de los costos internos de las piezas registradas para el presupuesto de la orden."
    }
  },
  "lifecycleStates": [
    {
      "state": "open",
      "reachedBy": "actor"
    },
    {
      "state": "quoteSent",
      "reachedBy": "actor"
    },
    {
      "state": "quoteApproved",
      "reachedBy": "actor"
    },
    {
      "state": "rejected",
      "reachedBy": "actor"
    },
    {
      "state": "readyForPickup",
      "reachedBy": "actor"
    },
    {
      "state": "completed",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "enviarPresupuesto",
      "from": [
        "open"
      ],
      "to": "quoteSent",
      "by": [
        "tecnico"
      ],
      "description": "El técnico deja el presupuesto disponible para la respuesta del cliente."
    },
    {
      "transitionId": "aprobarPresupuesto",
      "from": [
        "quoteSent"
      ],
      "to": "quoteApproved",
      "by": [
        "cliente"
      ],
      "description": "El cliente aprueba el presupuesto y autoriza la reparación."
    },
    {
      "transitionId": "rechazarPresupuesto",
      "from": [
        "quoteSent"
      ],
      "to": "rejected",
      "by": [
        "cliente"
      ],
      "description": "El cliente rechaza el presupuesto y la orden queda cerrada con el aparato disponible para retiro."
    },
    {
      "transitionId": "marcarLista",
      "from": [
        "quoteApproved"
      ],
      "to": "readyForPickup",
      "by": [
        "tecnico"
      ],
      "description": "El técnico marca la orden como lista para entregar el aparato reparado."
    },
    {
      "transitionId": "entregarYfinalizar",
      "from": [
        "readyForPickup"
      ],
      "to": "completed",
      "by": [
        "recepcionista"
      ],
      "description": "El recepcionista entrega el aparato reparado al cliente y finaliza la orden."
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
