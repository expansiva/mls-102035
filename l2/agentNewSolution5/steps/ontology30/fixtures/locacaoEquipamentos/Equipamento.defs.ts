/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/Equipamento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityArtifact } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityEquipamento = {
  "schemaVersion": "2026-09-11-ns5-ontology-v2",
  "moduleName": "locacaoEquipamentos",
  "entityId": "Equipamento",
  "title": "Equipamento",
  "description": "Equipamento de construção disponibilizado para locação, com situação operacional acompanhada pela locadora.",
  "kind": "mdm",
  "party": "none",
  "mdmSubtype": "AssetEquipment",
  "displayField": "name",
  "fields": [
    {
      "fieldId": "rentalCode",
      "title": "Código do equipamento",
      "type": "string",
      "required": true,
      "unique": true,
      "constraints": {
        "maxLength": 100
      },
      "description": "Código interno usado pela locadora para identificar o equipamento."
    },
    {
      "fieldId": "dailyRate",
      "title": "Valor da diária",
      "type": "money",
      "required": true,
      "constraints": {
        "min": 0,
        "precision": 2
      },
      "description": "Valor cobrado por dia de locação do equipamento."
    },
    {
      "fieldId": "operationalSituation",
      "title": "Situação operacional",
      "type": "string",
      "required": true,
      "enum": [
        {
          "value": "available",
          "title": "Disponível"
        },
        {
          "value": "rented",
          "title": "Locado"
        },
        {
          "value": "maintenance",
          "title": "Em manutenção"
        }
      ],
      "description": "Situação operacional atual do equipamento para fins de locação."
    }
  ],
  "fieldsBase": [
    { "fieldId": "name", "title": "Nome", "type": "string", "required": true, "description": "Nome do equipamento." },
    { "fieldId": "serialNumber", "title": "Número de série", "type": "string", "required": false, "description": "Número de série do equipamento." },
    { "fieldId": "brand", "title": "Marca", "type": "string", "required": false, "description": "Marca do equipamento." },
    { "fieldId": "model", "title": "Modelo", "type": "string", "required": false, "description": "Modelo do equipamento." }
  ],
  "lifecycleStates": [],
  "transitions": [],
  "storage": {
    "target": "mdm",
    "scope": "organization",
    "idField": "id",
    "mdmType": "locacaoEquipamentos.Equipamento"
  }
} as const satisfies Ns5OntologyEntityArtifact;

export type LocacaoEquipamentosEntityEquipamentoType = typeof locacaoEquipamentosEntityEquipamento;

export default locacaoEquipamentosEntityEquipamento;
