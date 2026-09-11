/// <mls fileReference="_102047_/l4/ordenServicio5/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5Access = {
  "schemaVersion": "2026-09-10-ns5-access-v1",
  "moduleName": "ordenServicio5",
  "profiles": [
    {
      "profileId": "recepcionista",
      "actorRefs": [
        "recepcionista"
      ],
      "kind": "internal"
    },
    {
      "profileId": "tecnico",
      "actorRefs": [
        "tecnico"
      ],
      "kind": "internal"
    },
    {
      "profileId": "cliente",
      "actorRefs": [
        "cliente"
      ],
      "kind": "external"
    }
  ],
  "authorities": [
    {
      "authorityId": "gestionarRecepcionYentrega",
      "title": "Gestionar recepción y entrega",
      "description": "Registrar la recepción de aparatos y completar su entrega al cliente."
    },
    {
      "authorityId": "analizarYpresupuestar",
      "title": "Analizar y presupuestar órdenes",
      "description": "Analizar aparatos recibidos y registrar diagnósticos, piezas y presupuestos."
    },
    {
      "authorityId": "repararOrden",
      "title": "Reparar y dejar lista una orden",
      "description": "Registrar la reparación autorizada y marcar la orden como lista para entrega."
    },
    {
      "authorityId": "consultarYresponderPresupuesto",
      "title": "Consultar y responder presupuestos",
      "description": "Consultar el diagnóstico y presupuesto de las órdenes propias y aprobarlos o rechazarlos."
    }
  ],
  "grants": [
    {
      "grantId": "recepcionGestionaRecepcionYentrega",
      "profileRef": "recepcionista",
      "authorityRef": "gestionarRecepcionYentrega",
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
        "description": "Órdenes y registros de recepción o entrega gestionados por el servicio técnico.",
        "anchorEntity": "Cliente"
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
      "profileRef": "tecnico",
      "authorityRef": "analizarYpresupuestar",
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
        "description": "Órdenes del servicio técnico que requieren análisis o presupuesto.",
        "anchorEntity": "Cliente"
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
      "profileRef": "tecnico",
      "authorityRef": "repararOrden",
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
        "description": "Órdenes cuyo presupuesto fue aprobado y están disponibles para reparación.",
        "anchorEntity": "Cliente"
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
      "profileRef": "cliente",
      "authorityRef": "consultarYresponderPresupuesto",
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
