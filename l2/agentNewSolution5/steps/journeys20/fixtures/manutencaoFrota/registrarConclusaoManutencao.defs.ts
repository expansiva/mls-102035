/// <mls fileReference="_102047_/l4/manutencaoFrota/journeys/registrarConclusaoManutencao.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const registrarConclusaoManutencaoJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarConclusaoManutencao",
  "business": {
    "actorRef": "gestorFrota",
    "title": "Registrar conclusão de manutenção",
    "goal": "Completar os dados de uma ordem após o serviço realizado.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarOrdemAberta",
        "kind": "locate",
        "entity": "OrdemManutencao",
        "title": "Localizar ordem de manutenção",
        "description": "Localiza a ordem referente ao serviço concluído."
      },
      {
        "stepId": "inspecionarOrdem",
        "kind": "inspect",
        "entity": "OrdemManutencao",
        "title": "Conferir ordem",
        "description": "Confere o veículo, a oficina, a descrição e os dados já registrados na ordem."
      },
      {
        "stepId": "registrarDadosConclusao",
        "kind": "act",
        "entity": "OrdemManutencao",
        "effect": "update",
        "title": "Registrar conclusão do serviço",
        "description": "Informa o custo e a data de saída do veículo da oficina."
      }
    ],
    "outcome": {
      "statement": "A ordem passa a registrar os dados finais da manutenção realizada.",
      "evidence": [
        "Ordem com custo e data de saída preenchidos.",
        "Histórico da ordem preserva oficina, descrição e período de manutenção."
      ]
    }
  },
  "businessHash": "sha256:6a9051cd7b43e6a77a30102eb4779c4b7cb30457210a98a916fbf6677995ecfb"
} as const satisfies Ns5JourneyArtifact;

export type RegistrarConclusaoManutencaoJourneyType = typeof registrarConclusaoManutencaoJourney;

export default registrarConclusaoManutencaoJourney;
