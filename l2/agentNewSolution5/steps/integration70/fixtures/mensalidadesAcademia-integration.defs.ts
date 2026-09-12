/// <mls fileReference="_102047_/l4/mensalidadesAcademia/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "mensalidadesAcademia",
  "inbound": [],
  "outbound": [
    {
      "id": "matriculaCancelada",
      "kind": "event",
      "to": "any",
      "event": "matriculaCancelada",
      "on": "Matricula.cancelarMatricula",
      "description": "Informa a outros módulos que a matrícula do aluno foi cancelada, encerrando a geração de mensalidades futuras.",
      "entityRefs": [
        "Matricula"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5IntegrationArtifact;

export type MensalidadesAcademiaIntegrationType = typeof mensalidadesAcademiaIntegration;

export default mensalidadesAcademiaIntegration;
