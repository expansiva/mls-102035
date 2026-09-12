/// <mls fileReference="_102047_/l4/reembolsoDespesas/journeys/avaliarDespesaDaEquipe.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const avaliarDespesaDaEquipeJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "avaliarDespesaDaEquipe",
  "business": {
    "actorRef": "gestorEquipe",
    "title": "Avaliar despesa da equipe",
    "goal": "Avaliar uma despesa de colaborador da equipe e decidir por sua aprovação para pagamento ou rejeição com motivo.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarDespesaPendente",
        "kind": "locate",
        "entity": "Despesa",
        "title": "Localizar despesa pendente",
        "description": "Localiza uma despesa pendente de aprovação de colaborador da equipe."
      },
      {
        "stepId": "consultarDespesaPendente",
        "kind": "inspect",
        "entity": "Despesa",
        "title": "Consultar despesa",
        "description": "Consulta os dados, a descrição e o comprovante da despesa."
      },
      {
        "stepId": "decidirAprovacaoOuRejeicao",
        "kind": "decide",
        "entity": "Despesa",
        "title": "Decidir sobre a despesa",
        "description": "Escolhe aprovar a despesa para pagamento ou rejeitá-la, informando o motivo da rejeição quando essa for a decisão."
      },
      {
        "stepId": "registrarDecisaoDaDespesa",
        "kind": "act",
        "entity": "Despesa",
        "effect": "transition",
        "transitionRef": "recordApprovalDecision",
        "title": "Registrar decisão",
        "description": "Registra a aprovação para pagamento ou a rejeição com seu motivo e encaminha a despesa ao responsável pela próxima tratativa."
      },
      {
        "stepId": "encaminharDespesaAposDecisao",
        "kind": "handoff",
        "entity": "Despesa",
        "title": "Encaminhar após decisão",
        "description": "A despesa aprovada segue para o financeiro; a rejeitada retorna ao colaborador.",
        "handoffTo": "financeiro"
      }
    ],
    "outcome": {
      "statement": "A decisão do gestor sobre a despesa da equipe fica registrada, com aprovação para pagamento ou rejeição motivada.",
      "evidence": [
        "Decisão de aprovação ou rejeição fica registrada na despesa.",
        "Motivo da rejeição pode ser consultado quando a despesa for rejeitada.",
        "Despesa aprovada fica disponível para pagamento e despesa rejeitada fica disponível ao colaborador."
      ]
    }
  },
  "businessHash": "sha256:edd9fbf41940eb8b331606377d32248e65b72ce698a6edf05a5319d23ff57ec3"
} as const satisfies Ns5JourneyArtifact;

export type AvaliarDespesaDaEquipeJourneyType = typeof avaliarDespesaDaEquipeJourney;

export default avaliarDespesaDaEquipeJourney;
