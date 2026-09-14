/// <mls fileReference="_102047_/l4/ordenServicio/ontology/Cliente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioEntityCliente = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "ordenServicio",
  "entityId": "Cliente",
  "title": "Cliente",
  "description": "Persona cliente identificada para registrar sus órdenes de servicio y consultar sus propias órdenes desde el portal.",
  "kind": "mdm",
  "party": "person",
  "mdmSubtype": "Person",
  "displayField": "name",
  "fields": [],
  "fieldsBase": [
    { "fieldId": "name", "title": "Nombre completo", "type": "string", "required": true, "description": "Nombre completo del cliente." },
    { "fieldId": "docType", "title": "Tipo de documento", "type": "string", "required": true, "enum": [{ "value": "NationalId", "title": "Documento de identidad" }], "description": "Tipo de documento de identificación del cliente." },
    { "fieldId": "docId", "title": "Documento de identidad", "type": "string", "required": true, "description": "Número del documento de identidad del cliente." },
    { "fieldId": "contacts", "title": "Contactos", "type": "json", "required": true, "description": "Contactos del cliente (teléfono, correo electrónico)." }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "ordenServicio.Cliente"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type OrdenServicioEntityClienteType = typeof ordenServicioEntityCliente;

export default ordenServicioEntityCliente;
