/// <mls fileReference="_102047_/l4/agendaClinica/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const agendaClinicaIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "agendaClinica",
  "inbound": [],
  "outbound": [
    {
      "id": "consultaConfirmada",
      "kind": "event",
      "to": "any",
      "event": "consultaConfirmada",
      "on": "Consulta.confirmarConsulta",
      "description": "Publica a confirmação da consulta para módulos interessados.",
      "entityRefs": [
        "Consulta"
      ]
    },
    {
      "id": "consultaComFaltaRegistrada",
      "kind": "event",
      "to": "any",
      "event": "consultaComFaltaRegistrada",
      "on": "Consulta.registrarFalta",
      "description": "Publica o registro de falta do paciente para módulos interessados.",
      "entityRefs": [
        "Consulta"
      ]
    },
    {
      "id": "consultaAtendida",
      "kind": "event",
      "to": "any",
      "event": "consultaAtendida",
      "on": "Consulta.registrarAtendimento",
      "description": "Publica a conclusão do atendimento para módulos interessados.",
      "entityRefs": [
        "Consulta"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type AgendaClinicaIntegrationType = typeof agendaClinicaIntegration;

export default agendaClinicaIntegration;
