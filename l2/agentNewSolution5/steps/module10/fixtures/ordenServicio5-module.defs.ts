/// <mls fileReference="_102047_/l4/ordenServicio5/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5Module = {
  "schemaVersion": "2026-09-10-ns5-module-v1",
  "moduleName": "ordenServicio5",
  "title": "Órdenes de servicio técnico",
  "userLanguage": "es",
  "productLanguages": [
    "es"
  ],
  "defaultLanguage": "es",
  "sourcePrompt": "crear el módulo ordenServicio, en español, para un servicio técnico de electrónica. el cliente trae un aparato y el recepcionista abre una orden de servicio con los datos del cliente, el aparato, el defecto informado y fotos. el técnico analiza y registra el diagnóstico, las piezas necesarias con costo interno y el valor del presupuesto para el cliente. el cliente recibe el presupuesto y lo aprueba o lo rechaza desde el portal; si lo rechaza, la orden se cierra como rechazada y el aparato queda disponible para retiro. si lo aprueba, el técnico realiza la reparación, registra lo que hizo y la marca como lista; el recepcionista entrega y finaliza. el cliente accede al portal y ve solamente sus propias órdenes, con estado, diagnóstico y valor del presupuesto — nunca el costo interno de las piezas ni las anotaciones del técnico. perfiles: recepcionista, técnico y cliente.",
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
  "scope": {
    "inScope": [
      "Gestión de órdenes para servicio técnico de electrónica",
      "Recepción, diagnóstico, presupuesto, reparación y entrega de aparatos",
      "Consulta y respuesta del cliente sobre sus propias órdenes"
    ],
    "outOfScope": [
      "Gestión general de inventario o compras",
      "Contabilidad, facturación y cobros",
      "Servicios técnicos ajenos a aparatos electrónicos"
    ]
  }
} as const satisfies Ns5ModuleArtifact;

export type OrdenServicio5ModuleType = typeof ordenServicio5Module;

export default ordenServicio5Module;
