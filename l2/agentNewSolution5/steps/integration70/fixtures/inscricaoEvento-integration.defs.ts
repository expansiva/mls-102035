/// <mls fileReference="_102047_/l4/inscricaoEvento/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "inscricaoEvento",
  "inbound": [],
  "outbound": [
    {
      "id": "publicarEvento",
      "kind": "event",
      "to": "any",
      "event": "publicarEvento",
      "on": "Evento.publicarEvento",
      "description": "Publica o evento para que outros módulos possam reagir à sua disponibilização pública.",
      "entityRefs": [
        "Evento"
      ]
    },
    {
      "id": "cancelarInscricao",
      "kind": "event",
      "to": "any",
      "event": "cancelarInscricao",
      "on": "Inscricao.cancelarInscricao",
      "description": "Publica o cancelamento de uma inscrição para consumidores que acompanham a disponibilidade do evento.",
      "entityRefs": [
        "Inscricao",
        "Evento"
      ]
    },
    {
      "id": "promoverListaEspera",
      "kind": "event",
      "to": "any",
      "event": "promoverListaEspera",
      "on": "Inscricao.promoverListaEspera",
      "description": "Publica a promoção de uma inscrição da lista de espera para uma vaga disponível.",
      "entityRefs": [
        "Inscricao",
        "Evento"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type InscricaoEventoIntegrationType = typeof inscricaoEventoIntegration;

export default inscricaoEventoIntegration;
