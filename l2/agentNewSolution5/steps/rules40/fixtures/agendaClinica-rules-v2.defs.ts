/// <mls fileReference="_102047_/l4/agendaClinica/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2 } from '/_102035_/l2/solution/types.js';

export const agendaClinicaRulesV2 = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "agendaClinica",
  "rules": {
    "horarioProfissionalExclusivo": "Não pode haver duas consultas para o mesmo profissional na mesma data e horário.",
    "anotacaoObrigatoriaNoAtendimento": "O registro de atendimento deve incluir uma anotação do atendimento.",
    "menorExigeResponsavel": "Paciente com menos de 18 anos precisa de pelo menos um responsável legal (vínculo GuardianOf ativo) antes da primeira consulta.",
    "inativoNaoAgenda": "Paciente ou profissional com situação Inativo não pode ter consulta agendada.",
    "contatoParaConfirmarConsulta": "Para confirmar consulta por telefone o paciente precisa de ao menos um canal de contato Phone ou WhatsApp ativo."
  }
} as const satisfies Ns5RulesArtifactV2;

export type AgendaClinicaRulesV2Type = typeof agendaClinicaRulesV2;

export default agendaClinicaRulesV2;
