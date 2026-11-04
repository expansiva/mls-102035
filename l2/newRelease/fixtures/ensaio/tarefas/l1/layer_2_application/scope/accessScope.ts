/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/scope/accessScope.ts" enhancement="_blank"/>
export interface StructureGrant {
  grantId: string;
  actorRef: string;
  scopeMode: string;
  session: string;
  pending: string;
  disclosure: string;
  recordField: string;
  /** Per entity of an own grant, the column that holds the anchor id (one direct step); a longer chain is a join. */
  recordFields: Readonly<Record<string, string>>;
  entityRefs: readonly string[];
  /** An own grant over the anchor itself (the person's own record): resolved with no column. */
  selfAnchored: boolean;
}

export const grants: readonly StructureGrant[] = [
  {"grantId":"gestorListas","actorRef":"gestor","scopeMode":"organization","session":"verified","pending":"","disclosure":"fullRecord","recordField":"","recordFields":{},"entityRefs":["ListaTarefas"],"selfAnchored":false},
  {"grantId":"gestorParticipantes","actorRef":"gestor","scopeMode":"organization","session":"verified","pending":"","disclosure":"fieldsOnly","recordField":"","recordFields":{},"entityRefs":["Participante"],"selfAnchored":false},
  {"grantId":"gestorTodasTarefas","actorRef":"gestor","scopeMode":"organization","session":"verified","pending":"","disclosure":"fullRecord","recordField":"","recordFields":{},"entityRefs":["Tarefa","ItemChecklist"],"selfAnchored":false},
  {"grantId":"membroChecklistPropria","actorRef":"membroEquipe","scopeMode":"own","session":"verified","pending":"ACCESS_ANCHOR","disclosure":"fullRecord","recordField":"","recordFields":{},"entityRefs":["ItemChecklist"],"selfAnchored":false},
  {"grantId":"membroConsultarListas","actorRef":"membroEquipe","scopeMode":"organization","session":"verified","pending":"","disclosure":"fullRecord","recordField":"","recordFields":{},"entityRefs":["ListaTarefas"],"selfAnchored":false},
  {"grantId":"membroEscolherResponsavel","actorRef":"membroEquipe","scopeMode":"organization","session":"verified","pending":"","disclosure":"fieldsOnly","recordField":"","recordFields":{},"entityRefs":["Participante"],"selfAnchored":false},
  {"grantId":"membroTarefasProprias","actorRef":"membroEquipe","scopeMode":"own","session":"verified","pending":"ACCESS_ANCHOR","disclosure":"fullRecord","recordField":"criadorId","recordFields":{"Tarefa":"criadorId"},"entityRefs":["Tarefa"],"selfAnchored":false}
];

export function resolveGrant(grantId: string): StructureGrant | { code: string; detail: string } {
  const grant = grants.find(item => item.grantId === grantId);
  if (!grant) return { code: 'GRANT_ABSENT', detail: `Grant ${grantId} is not declared.` };
  if (grant.session !== 'verified') return { code: 'SESSION_UNVERIFIED', detail: `Grant ${grantId} session is not verified.` };
  if (!grant.scopeMode) return { code: 'SCOPE_UNBOUND', detail: `Grant ${grantId} has no scope mode.` };
  if (grant.scopeMode === 'own' && Object.keys(grant.recordFields).length === 0 && !grant.selfAnchored) return { code: 'ACCESS_ANCHOR', detail: `Grant ${grantId} has no resolved scope path.` };
  return grant;
}
