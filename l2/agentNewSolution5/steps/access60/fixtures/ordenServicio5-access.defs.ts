/// <mls fileReference="_102047_/l4/ordenServicio5/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5Access = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
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
  "grants": [
    {
      "grantId": "recepcionGestionaRecepcionYentrega",
      "actorRef": "recepcionista",
      "title": "Gestionar recepción y entrega",
      "description": "Registrar la recepción de aparatos y completar su entrega al cliente.",
      "entityRefs": [
        "OrdenServicio",
        "Cliente",
        "Aparato",
        "DefectoInformado",
        "FotoOrden",
        "EntregaAparato"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Órdenes y registros de recepción o entrega gestionados por el servicio técnico."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Puede consultar y registrar los datos necesarios para recibir y entregar aparatos, sin acceso a información técnica ni costos internos.",
        "allowedFields": [
          "OrdenServicio.id",
          "OrdenServicio.numeroOrden",
          "OrdenServicio.clienteId",
          "OrdenServicio.aparatoId",
          "OrdenServicio.defectoInformadoId",
          "OrdenServicio.fotoOrdenIds",
          "OrdenServicio.entregaAparatoId",
          "OrdenServicio.status",
          "Cliente.id",
          "Aparato.id",
          "DefectoInformado.id",
          "DefectoInformado.descripcion",
          "FotoOrden.id",
          "FotoOrden.nombreArchivo",
          "FotoOrden.urlArchivo",
          "FotoOrden.tipoMime",
          "EntregaAparato.id",
          "EntregaAparato.fechaEntrega"
        ]
      }
    },
    {
      "grantId": "tecnicoAnalizaYpresupuesta",
      "actorRef": "tecnico",
      "title": "Analizar y presupuestar órdenes",
      "description": "Analizar aparatos recibidos y registrar diagnósticos, piezas y presupuestos.",
      "entityRefs": [
        "OrdenServicio",
        "Aparato",
        "DefectoInformado",
        "FotoOrden",
        "Diagnostico",
        "PiezaNecesaria",
        "Presupuesto"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Órdenes del servicio técnico que requieren análisis o presupuesto."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Puede consultar la recepción y registrar toda la información técnica y económica necesaria para el presupuesto.",
        "allowedFields": [
          "OrdenServicio.id",
          "OrdenServicio.numeroOrden",
          "OrdenServicio.aparatoId",
          "OrdenServicio.defectoInformadoId",
          "OrdenServicio.fotoOrdenIds",
          "OrdenServicio.diagnosticoId",
          "OrdenServicio.presupuestoId",
          "OrdenServicio.status",
          "Aparato.id",
          "DefectoInformado.id",
          "DefectoInformado.descripcion",
          "FotoOrden.id",
          "FotoOrden.nombreArchivo",
          "FotoOrden.urlArchivo",
          "FotoOrden.tipoMime",
          "Diagnostico.id",
          "Diagnostico.descripcion",
          "PiezaNecesaria.id",
          "PiezaNecesaria.nombrePieza",
          "PiezaNecesaria.cantidad",
          "PiezaNecesaria.costoInterno",
          "Presupuesto.id",
          "Presupuesto.valorCliente",
          "Presupuesto.piezasNecesarias",
          "Presupuesto.status"
        ]
      }
    },
    {
      "grantId": "tecnicoReparaOrden",
      "actorRef": "tecnico",
      "title": "Reparar y dejar lista una orden",
      "description": "Registrar la reparación autorizada y marcar la orden como lista para entrega.",
      "entityRefs": [
        "OrdenServicio",
        "Aparato",
        "Diagnostico",
        "PiezaNecesaria",
        "Presupuesto",
        "Reparacion"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Órdenes cuyo presupuesto fue aprobado y están disponibles para reparación."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Puede consultar el diagnóstico, las piezas y la autorización, y registrar el trabajo técnico realizado.",
        "allowedFields": [
          "OrdenServicio.id",
          "OrdenServicio.numeroOrden",
          "OrdenServicio.aparatoId",
          "OrdenServicio.diagnosticoId",
          "OrdenServicio.presupuestoId",
          "OrdenServicio.reparacionId",
          "OrdenServicio.status",
          "Aparato.id",
          "Diagnostico.id",
          "Diagnostico.descripcion",
          "PiezaNecesaria.id",
          "PiezaNecesaria.nombrePieza",
          "PiezaNecesaria.cantidad",
          "PiezaNecesaria.costoInterno",
          "Presupuesto.id",
          "Presupuesto.valorCliente",
          "Presupuesto.piezasNecesarias",
          "Presupuesto.status",
          "Reparacion.id",
          "Reparacion.detalleTrabajo"
        ]
      }
    },
    {
      "grantId": "clienteConsultaYrespondePresupuesto",
      "actorRef": "cliente",
      "title": "Consultar y responder presupuestos",
      "description": "Consultar el diagnóstico y presupuesto de las órdenes propias y aprobarlos o rechazarlos.",
      "entityRefs": [
        "OrdenServicio"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Solo órdenes vinculadas al cliente que accede al portal.",
        "anchorEntity": "Cliente"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Puede ver el estado, diagnóstico y valor del presupuesto de sus órdenes, y registrar su respuesta, sin acceso a costos internos, piezas ni anotaciones técnicas.",
        "allowedFields": [
          "OrdenServicio.id",
          "OrdenServicio.numeroOrden",
          "OrdenServicio.diagnosticoId",
          "OrdenServicio.presupuestoId",
          "OrdenServicio.status",
          "Diagnostico.id",
          "Diagnostico.descripcion",
          "Presupuesto.id",
          "Presupuesto.valorCliente",
          "Presupuesto.status"
        ],
        "deniedFields": [
          "Presupuesto.piezasNecesarias"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type OrdenServicio5AccessType = typeof ordenServicio5Access;

export default ordenServicio5Access;
