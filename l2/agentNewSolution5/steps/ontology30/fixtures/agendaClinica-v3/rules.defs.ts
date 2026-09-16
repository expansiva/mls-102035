/// <mls fileReference="_102047_/l4/agendaClinica/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifact } from '/_102035_/l2/solution/types.js';

export const agendaClinicaRules = {
  "schemaVersion": "2026-09-10-ns5-rules-v1",
  "moduleName": "agendaClinica",
  "rules": [
    {
      "ruleId": "horarioProfissionalExclusivo",
      "description": "Não pode haver duas consultas para o mesmo profissional na mesma data e horário."
    },
    {
      "ruleId": "anotacaoObrigatoriaNoAtendimento",
      "description": "O registro de atendimento deve incluir uma anotação do atendimento."
    },
    {
      "ruleId": "menorExigeResponsavel",
      "description": "Paciente com menos de 18 anos precisa de pelo menos um responsável legal (vínculo GuardianOf ativo) antes da primeira consulta."
    },
    {
      "ruleId": "inativoNaoAgenda",
      "description": "Paciente ou profissional com situação Inativo não pode ter consulta agendada."
    },
    {
      "ruleId": "contatoParaConfirmarConsulta",
      "description": "Para confirmar consulta por telefone o paciente precisa de ao menos um canal de contato Phone ou WhatsApp ativo."
    }
  ]
} as const satisfies Ns5RulesArtifact;

export type AgendaClinicaRulesType = typeof agendaClinicaRules;

export default agendaClinicaRules;
