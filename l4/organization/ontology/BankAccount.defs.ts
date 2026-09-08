/// <mls fileReference="_102035_/l4/organization/ontology/BankAccount.defs.ts" enhancement="_blank"/>

import type { Ns4Level1EntityArtifact } from '/_102035_/l2/agentNewSolution/types.js';

export const level1BankAccount = {
  "schemaVersion": "ns4-level1-v1",
  "subtype": "BankAccount",
  "identification": [
    {
      "fieldId": "name",
      "type": "string",
      "required": true
    },
    {
      "fieldId": "docType",
      "type": "DocType | null",
      "required": false
    },
    {
      "fieldId": "docId",
      "type": "string | null",
      "required": false
    },
    {
      "fieldId": "countryCode",
      "type": "string",
      "required": true
    },
    {
      "fieldId": "tags",
      "type": "string[]",
      "required": true
    }
  ],
  "baseFields": [
    {
      "fieldId": "aliases",
      "type": "string[]",
      "required": true
    },
    {
      "fieldId": "contacts",
      "type": "ContactSummaryValue[]",
      "required": true
    },
    {
      "fieldId": "addresses",
      "type": "AddressValue[]",
      "required": true
    },
    {
      "fieldId": "relationshipRefs",
      "type": "CompactRelationshipRefs",
      "required": true
    },
    {
      "fieldId": "bankRoutingNumber",
      "type": "string | null",
      "required": false
    },
    {
      "fieldId": "bankName",
      "type": "string | null",
      "required": false
    },
    {
      "fieldId": "accountNumber",
      "type": "string | null",
      "required": false
    },
    {
      "fieldId": "accountType",
      "type": "'Checking' | 'Savings' | 'MoneyMarket' | 'Payment' | 'Other' | null",
      "required": false
    },
    {
      "fieldId": "swift",
      "type": "string | null",
      "required": false
    },
    {
      "fieldId": "iban",
      "type": "string | null",
      "required": false
    },
    {
      "fieldId": "pixKey",
      "type": "string | null",
      "required": false
    },
    {
      "fieldId": "pixKeyType",
      "type": "'CPF' | 'CNPJ' | 'Phone' | 'Email' | 'RandomKey' | null",
      "required": false
    },
    {
      "fieldId": "isVerified",
      "type": "boolean",
      "required": true
    },
    {
      "fieldId": "notes",
      "type": "string | null",
      "required": false
    }
  ],
  "allowedRelationships": [
    {
      "type": "HoldsAccount",
      "as": "to",
      "otherSubtypes": [
        "Person",
        "Company"
      ]
    },
    {
      "type": "HasContact",
      "as": "from",
      "otherSubtypes": [
        "ContactChannel"
      ]
    }
  ]
} as const satisfies Ns4Level1EntityArtifact;

export type Level1BankAccountType = typeof level1BankAccount;

export default level1BankAccount;
