/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/agents/ontology/DraftNotice.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityDraftNotice = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "DraftNotice",
  "title": "Draft notice",
  "description": "Notice from the cm that a draft is ready or refused with a reason; the same notice is applied only once.",
  "displayField": "receivedAt",
  "relationships": {
    "draft": {
      "relationshipId": "noticeDraft",
      "to": "AgentDraft",
      "via": "DraftNotice.draftId",
      "cardinality": "N:1",
      "title": "Draft the notice is about",
      "description": "Each notice concerns one draft; a draft may receive more than one notice.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "create": "Records a notice the cm sends when a draft is ready or refused, as an upsert on the notice key so the inbound connection never writes it twice; works with no screen open.",
    "uniqueKey": "Refuses a second notice with the same notice key, so the same notice from the cm is applied only once.",
    "read.byId": "Reads one notice by its id when applying it to the draft list.",
    "listByForeignKey": "Lists the notices of one draft, or of all drafts on the first screen at once, so the company admin and members see each draft's situation (preparing, ready or refused with the reason).",
    "locate.byColumn": "Lists notices by outcome and received time, newest first, for the drafts on the first screen.",
    "count": "Counts ready or refused notices to show a badge of drafts waiting for the company admin's review.",
    "transaction": "Writes the notice and the suggested tools set on the agent's tool choices all or nothing when a ready notice is applied."
  },
  "rules": [
    "draftNoticeAppliedOnce",
    "refusedNoticeHasReason",
    "suggestedToolsFromCatalog"
  ],
  "writer": "inbound",
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "agents_draftnotice",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "draftId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "AgentDraft"
        ],
        "title": "Draft",
        "description": "The draft in the cm that this notice is about."
      },
      "noticeKey": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "Notice key",
        "description": "The key the cm gives each notice, used only to recognise a notice that arrives again so it is applied once. Never shown on a screen.",
        "maxLength": 200
      },
      "outcome": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "ready",
            "title": "Ready"
          },
          {
            "value": "refused",
            "title": "Refused"
          }
        ],
        "title": "Outcome",
        "description": "What the cm says about the draft: it is ready for review or it was refused."
      },
      "receivedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Received at",
        "description": "When the notice arrived from the cm; filled by the system and used to order the notices."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "The content of the notice.",
        "fields": {
          "refusalReason": {
            "type": "text",
            "title": "Reason for refusal",
            "description": "Why the cm refused the draft, in plain language, shown on the draft card when the outcome is refused.",
            "maxLength": 2000
          },
          "suggestedTools": {
            "type": "object",
            "collection": true,
            "title": "Suggested tools",
            "description": "Tools from the catalog the cm suggests for the new agent when the draft is ready.",
            "fields": {
              "tool": {
                "type": "record",
                "required": true,
                "to": [
                  "Tool"
                ],
                "title": "Tool",
                "description": "The catalog tool suggested for the agent."
              }
            }
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "noticeKey"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityDraftNoticeType = typeof agentsEntityDraftNotice;

export default agentsEntityDraftNotice;
