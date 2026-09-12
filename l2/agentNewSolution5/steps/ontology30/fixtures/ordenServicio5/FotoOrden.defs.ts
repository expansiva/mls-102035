/// <mls fileReference="_102047_/l4/ordenServicio5/ontology/FotoOrden.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5EntityFotoOrden = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "ordenServicio5",
  "entityId": "FotoOrden",
  "title": "Foto de la orden",
  "description": "Imagen adjunta que documenta el aparato o su condición al recibirlo.",
  "kind": "supporting",
  "party": "none",
  "displayField": "nombreArchivo",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único de la foto de la orden."
    },
    {
      "fieldId": "nombreArchivo",
      "title": "Nombre del archivo",
      "type": "string",
      "required": true,
      "description": "Nombre del archivo de imagen adjunto a la orden."
    },
    {
      "fieldId": "urlArchivo",
      "title": "Ubicación del archivo",
      "type": "string",
      "required": true,
      "description": "Ubicación donde se almacena la imagen adjunta."
    },
    {
      "fieldId": "tipoMime",
      "title": "Tipo de archivo",
      "type": "string",
      "required": true,
      "description": "Tipo MIME de la imagen adjunta."
    }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "moduleDatabase",
    "scope": "module",
    "idField": "id"
  },
  "mutability": "appendOnly"
} as const satisfies Ns5OntologyEntityArtifact;

export type OrdenServicio5EntityFotoOrdenType = typeof ordenServicio5EntityFotoOrden;

export default ordenServicio5EntityFotoOrden;
