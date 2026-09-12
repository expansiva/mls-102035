/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/registrarPagamentoMensalidade.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarPagamentoMensalidadeJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarPagamentoMensalidade",
  "business": {
    "actorRef": "recepcao",
    "title": "Registrar pagamento de mensalidade",
    "goal": "Registrar a data, o valor e a forma de pagamento de uma mensalidade do aluno.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarMensalidade",
        "kind": "locate",
        "entity": "Mensalidade",
        "title": "Localizar a mensalidade do aluno.",
        "description": "Busca a mensalidade a partir do contexto disponível ou consultando as mensalidades do aluno."
      },
      {
        "stepId": "inspecionarMensalidade",
        "kind": "inspect",
        "entity": "Mensalidade",
        "title": "Conferir os dados da mensalidade.",
        "description": "Visualiza o aluno, o valor devido, o vencimento e a situação da mensalidade."
      },
      {
        "stepId": "registrarDadosPagamento",
        "kind": "act",
        "entity": "Pagamento",
        "affects": [
          "Mensalidade"
        ],
        "effect": "create",
        "title": "Registrar os dados do pagamento.",
        "description": "Registra a data, o valor e a forma de pagamento vinculados à mensalidade."
      }
    ],
    "outcome": {
      "statement": "O pagamento fica registrado e a situação da mensalidade é atualizada conforme o valor recebido.",
      "evidence": [
        "Existe um pagamento com data, valor e forma de pagamento.",
        "A mensalidade mostra o pagamento registrado e sua situação atual."
      ]
    }
  },
  "businessHash": "sha256:8abd8edd88bb7f9b2f97b21fd09f3ba7376938247b881264fef608abbcdfc3c4"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarPagamentoMensalidadeJourneyType = typeof registrarPagamentoMensalidadeJourney;

export default registrarPagamentoMensalidadeJourney;
