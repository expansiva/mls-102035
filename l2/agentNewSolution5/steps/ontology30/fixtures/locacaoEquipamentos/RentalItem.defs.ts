/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/RentalItem.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityRentalItem = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "locacaoEquipamentos",
  "entityId": "RentalItem",
  "title": "Item de locação",
  "description": "Item de um contrato que identifica o equipamento reservado para o período de locação.",
  "kind": "supporting",
  "party": "none",
  "displayField": "equipment",
  "fields": [
    {
      "fieldId": "id",
      "title": "Identificador",
      "type": "uuid",
      "required": true,
      "description": "Identificador único do item de locação."
    },
    {
      "fieldId": "rentalContract",
      "title": "Contrato de locação",
      "type": "uuid",
      "required": true,
      "description": "Contrato de locação ao qual este item pertence."
    },
    {
      "fieldId": "equipment",
      "title": "Equipamento",
      "type": "uuid",
      "required": true,
      "description": "Equipamento específico reservado neste item de locação."
    },
    {
      "fieldId": "dailyRate",
      "title": "Valor da diária contratada",
      "type": "money",
      "required": true,
      "description": "Valor diário do equipamento registrado no momento da inclusão no contrato."
    }
  ],
  "uniqueKeys": [
    [
      "rentalContract",
      "equipment"
    ]
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

export type LocacaoEquipamentosEntityRentalItemType = typeof locacaoEquipamentosEntityRentalItem;

export default locacaoEquipamentosEntityRentalItem;
