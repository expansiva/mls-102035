/// <mls fileReference="_102047_/l4/ordenServicio5/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5Access = {
  "schemaVersion": "2026-09-10-ns5-access-v2",
  "moduleName": "ordenServicio5",
  "actors": [
    {
      "actorId": "recepcionista",
      "kind": "internal",
      "origin": "named",
      "title": "Recepcionista",
      "description": "Personal que recibe aparatos y gestiona su entrega al cliente."
    },
    {
      "actorId": "tecnico",
      "kind": "internal",
      "origin": "named",
      "title": "Técnico",
      "description": "Personal que analiza los aparatos y realiza las reparaciones."
    },
    {
      "actorId": "cliente",
      "kind": "external",
      "origin": "named",
      "title": "Cliente",
      "description": "Persona que presenta un aparato para servicio y consulta o responde al presupuesto desde el portal."
    }
  ],
  "authorities": [
    {
      "authorityId": "registrarRecepcion",
      "title": "Registrar recepción de orden",
      "description": "Registrar la recepción del aparato, los datos de la orden, el defecto informado y las fotos asociadas."
    },
    {
      "authorityId": "entregarYfinalizar",
      "title": "Entregar y finalizar orden",
      "description": "Consultar las órdenes disponibles para retiro, registrar la entrega del aparato y finalizar la orden."
    },
    {
      "authorityId": "analizarYpresupuestar",
      "title": "Analizar y presupuestar orden",
      "description": "Consultar órdenes para análisis y registrar el diagnóstico, las piezas necesarias, sus costos internos y el presupuesto para el cliente."
    },
    {
      "authorityId": "registrarReparacion",
      "title": "Registrar reparación terminada",
      "description": "Consultar órdenes aprobadas y registrar la reparación realizada para dejarlas listas para entrega."
    },
    {
      "authorityId": "consultarMisOrdenes",
      "title": "Consultar mis órdenes",
      "description": "Consultar el estado, el diagnóstico y el valor del presupuesto de las órdenes propias."
    },
    {
      "authorityId": "responderPresupuesto",
      "title": "Responder presupuesto",
      "description": "Aprobar o rechazar el presupuesto de una orden propia."
    }
  ],
  "grants": [
    {
      "grantId": "recepcionistaRegistrarRecepcion",
      "actorRef": "recepcionista",
      "authorityRef": "registrarRecepcion",
      "entityRefs": [
        "OrdenServicio",
        "Cliente",
        "Aparato",
        "FotoOrdenServicio"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Órdenes y registros de recepción de toda la organización.",
        "anchorEntity": "Cliente"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Datos necesarios para registrar la recepción de una orden y sus fotos.",
        "allowedFields": [
          "OrdenServicio.id",
          "OrdenServicio.orderNumber",
          "OrdenServicio.cliente",
          "OrdenServicio.aparato",
          "OrdenServicio.reportedDefect",
          "OrdenServicio.receivedAt",
          "OrdenServicio.status",
          "Cliente.id",
          "Aparato.id",
          "FotoOrdenServicio.id"
        ]
      }
    },
    {
      "grantId": "recepcionistaEntregarYfinalizar",
      "actorRef": "recepcionista",
      "authorityRef": "entregarYfinalizar",
      "entityRefs": [
        "OrdenServicio",
        "Cliente",
        "Aparato",
        "Presupuesto",
        "EntregaAparato"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Órdenes de toda la organización que deben ser entregadas o finalizadas.",
        "anchorEntity": "Cliente"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Información necesaria para verificar el retiro, registrar la entrega y finalizar la orden, sin acceso al importe del presupuesto.",
        "allowedFields": [
          "OrdenServicio.id",
          "OrdenServicio.orderNumber",
          "OrdenServicio.cliente",
          "OrdenServicio.aparato",
          "OrdenServicio.entregaAparato",
          "OrdenServicio.status",
          "Cliente.id",
          "Aparato.id",
          "Presupuesto.status",
          "EntregaAparato.id",
          "EntregaAparato.deliveryDate"
        ],
        "deniedFields": [
          "Presupuesto.quoteAmount"
        ]
      }
    },
    {
      "grantId": "tecnicoAnalizarYpresupuestar",
      "actorRef": "tecnico",
      "authorityRef": "analizarYpresupuestar",
      "entityRefs": [
        "OrdenServicio",
        "Cliente",
        "Aparato",
        "FotoOrdenServicio",
        "Diagnostico",
        "PiezaNecesaria",
        "Presupuesto"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Órdenes de toda la organización pendientes de análisis o presupuesto.",
        "anchorEntity": "Cliente"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Acceso completo a la información técnica y económica necesaria para analizar y presupuestar."
      }
    },
    {
      "grantId": "tecnicoRegistrarReparacion",
      "actorRef": "tecnico",
      "authorityRef": "registrarReparacion",
      "entityRefs": [
        "OrdenServicio",
        "Diagnostico",
        "PiezaNecesaria",
        "Presupuesto",
        "Reparacion"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Órdenes de toda la organización con presupuesto aprobado que requieren reparación.",
        "anchorEntity": "Cliente"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Acceso completo a la información técnica necesaria para realizar y registrar la reparación."
      }
    },
    {
      "grantId": "clienteConsultarMisOrdenes",
      "actorRef": "cliente",
      "authorityRef": "consultarMisOrdenes",
      "entityRefs": [
        "OrdenServicio"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Solo las órdenes vinculadas al cliente que consulta.",
        "anchorEntity": "Cliente"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Estado, síntesis del diagnóstico y valor del presupuesto de las órdenes propias, sin información técnica interna.",
        "allowedFields": [
          "OrdenServicio.id",
          "OrdenServicio.orderNumber",
          "OrdenServicio.status",
          "Diagnostico.diagnosisSummary",
          "Presupuesto.quoteAmount",
          "Presupuesto.status"
        ],
        "deniedFields": [
          "OrdenServicio.cliente",
          "OrdenServicio.aparato",
          "OrdenServicio.reportedDefect",
          "OrdenServicio.receivedAt",
          "OrdenServicio.diagnostico",
          "OrdenServicio.presupuesto",
          "OrdenServicio.reparacion",
          "OrdenServicio.entregaAparato",
          "Diagnostico.diagnosisDetail",
          "Diagnostico.technicalNotes",
          "Diagnostico.requiredParts",
          "Presupuesto.id"
        ]
      }
    },
    {
      "grantId": "clienteResponderPresupuesto",
      "actorRef": "cliente",
      "authorityRef": "responderPresupuesto",
      "entityRefs": [
        "OrdenServicio"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Solo los presupuestos asociados a órdenes vinculadas al cliente que responde.",
        "anchorEntity": "Cliente"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Información necesaria para aprobar o rechazar el presupuesto de una orden propia.",
        "allowedFields": [
          "OrdenServicio.id",
          "OrdenServicio.orderNumber",
          "OrdenServicio.status",
          "Presupuesto.quoteAmount",
          "Presupuesto.status"
        ],
        "deniedFields": [
          "OrdenServicio.cliente",
          "OrdenServicio.aparato",
          "OrdenServicio.reportedDefect",
          "OrdenServicio.receivedAt",
          "OrdenServicio.diagnostico",
          "OrdenServicio.presupuesto",
          "OrdenServicio.reparacion",
          "OrdenServicio.entregaAparato",
          "Presupuesto.id"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type OrdenServicio5AccessType = typeof ordenServicio5Access;

export default ordenServicio5Access;
