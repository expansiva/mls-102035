/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/auth/authorityMap.ts" enhancement="_blank"/>
export const entries = [
  {
    "grantId": "gestorListas",
    "actorRef": "gestor"
  },
  {
    "grantId": "gestorParticipantes",
    "actorRef": "gestor"
  },
  {
    "grantId": "gestorTodasTarefas",
    "actorRef": "gestor"
  },
  {
    "grantId": "membroChecklistPropria",
    "actorRef": "membroEquipe"
  },
  {
    "grantId": "membroConsultarListas",
    "actorRef": "membroEquipe"
  },
  {
    "grantId": "membroEscolherResponsavel",
    "actorRef": "membroEquipe"
  },
  {
    "grantId": "membroTarefasProprias",
    "actorRef": "membroEquipe"
  }
] as const;

export function actorRefFor(grantId: string): string | null {
  const entry = entries.find(item => item.grantId === grantId);
  return entry ? entry.actorRef : null;
}
