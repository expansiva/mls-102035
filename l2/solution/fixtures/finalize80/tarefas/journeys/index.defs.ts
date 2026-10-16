/// <mls fileReference="_102035_/l2/solution/fixtures/finalize80/tarefas/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "tarefas",
  "journeys": [
    { "journeyId": "criarTarefa", "actorRef": "membro", "title": "Criar tarefa" },
    { "journeyId": "executarTarefa", "actorRef": "membro", "title": "Executar tarefa" },
    { "journeyId": "revisarTarefa", "actorRef": "gestor", "title": "Revisar tarefa" },
    { "journeyId": "manterTarefa", "actorRef": "membro", "title": "Manter tarefa" },
    { "journeyId": "gerenciarTarefas", "actorRef": "gestor", "title": "Gerenciar tarefas" },
    { "journeyId": "manterListas", "actorRef": "gestor", "title": "Manter listas" }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export default tarefasJourneyIndex;
