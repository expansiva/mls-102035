/// <mls fileReference="_102047_/l4/ordenServicio/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "ordenServicio",
  "actors": [
    {
      "actorId": "recepcionista",
      "kind": "internal",
      "origin": "named",
      "title": "Recepcionista",
      "description": "Personal que abre órdenes de servicio y entrega los aparatos reparados a los clientes."
    },
    {
      "actorId": "tecnico",
      "kind": "internal",
      "origin": "named",
      "title": "Técnico",
      "description": "Personal que analiza los aparatos, prepara presupuestos y realiza las reparaciones."
    },
    {
      "actorId": "cliente",
      "kind": "external",
      "origin": "named",
      "title": "Cliente",
      "description": "Persona que consulta sus órdenes y aprueba o rechaza presupuestos desde el portal."
    }
  ],
  "grants": [
    {
      "grantId": "recepcionGestionaOrdenes",
      "actorRef": "recepcionista",
      "title": "Gestionar recepción y entrega de órdenes",
      "description": "Permite identificar clientes y aparatos, abrir órdenes de servicio y registrar la entrega final de los aparatos.",
      "entityRefs": [
        "Cliente",
        "Aparato",
        "OrdenServicio"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Puede gestionar las recepciones y entregas de todas las órdenes de la organización."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Puede consultar todos los datos de clientes, aparatos y órdenes necesarios para la recepción y entrega."
      }
    },
    {
      "grantId": "tecnicoGestionaDiagnosticoReparacion",
      "actorRef": "tecnico",
      "title": "Gestionar diagnóstico, presupuesto y reparación",
      "description": "Permite consultar órdenes y aparatos, registrar diagnósticos, piezas, costos internos, presupuestos y reparaciones.",
      "entityRefs": [
        "Aparato",
        "OrdenServicio",
        "BudgetPart"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Puede trabajar sobre las órdenes de servicio de toda la organización."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Puede consultar todos los datos técnicos, presupuestarios y de piezas necesarios para diagnosticar y reparar."
      }
    },
    {
      "grantId": "clienteConsultaYdecideSusOrdenes",
      "actorRef": "cliente",
      "title": "Consultar y responder presupuestos propios",
      "description": "Permite consultar el estado, diagnóstico y valor presupuestado de las órdenes propias, y aprobar o rechazar el presupuesto.",
      "entityRefs": [
        "OrdenServicio"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Solo puede acceder a las órdenes vinculadas con su propio registro de cliente.",
        "anchorEntity": "Cliente"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Puede ver únicamente la identificación, el estado, el diagnóstico y el valor del presupuesto; no puede ver costos internos ni anotaciones técnicas.",
        "allowedFields": [
          "OrdenServicio.id",
          "OrdenServicio.numeroOrden",
          "OrdenServicio.diagnostico",
          "OrdenServicio.valorPresupuesto",
          "OrdenServicio.status"
        ],
        "deniedFields": [
          "OrdenServicio.clienteId",
          "OrdenServicio.aparatoId",
          "OrdenServicio.defectoInformado",
          "OrdenServicio.fotosRecepcion",
          "OrdenServicio.recibidoEn",
          "OrdenServicio.anotacionesTecnicas",
          "OrdenServicio.reparacionRealizada",
          "OrdenServicio.entregadoEn",
          "OrdenServicio.details.costoInternoTotal"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type OrdenServicioAccessType = typeof ordenServicioAccess;

export default ordenServicioAccess;
