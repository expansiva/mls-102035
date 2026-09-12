/// <mls fileReference="_102035_/l4/ordenServicioEs/module.defs.ts" enhancement="_blank"/>

import type { Ns4ModuleArtifact } from '/_102035_/l2/agentNewSolution/types.js';

export const ordenServicioEsModule = {
  "schemaVersion": "2026-08-06-ns4-module-v4",
  "presentation": {
    "userLanguage": "es",
    "stepTitles": {
      "e1-clarification": "Defina el módulo",
      "e1-compile": "Compile el módulo",
      "e2-journeys": "Revise las jornadas",
      "e3-access-matrix": "Revise los accesos",
      "e4-ontology": "Revise los datos",
      "e4b-access-realization": "Realice los accesos",
      "e5-rules": "Revise las reglas",
      "e6-behaviors": "Revise módulos y plugins",
      "e7-realization": "Revise la realización",
      "e8-workspaces": "Revise los espacios",
      "e9-navigation-compiler": "Compile la navegación",
      "e10-validation": "Valide la solución"
    },
    "phrases": {
      "catalogue.list.title": "Listar {entity}",
      "catalogue.create.story": "Completar el registro nuevo."
    }
  },
  "module": {
    "moduleName": "ordenServicioEs",
    "title": "Orden de servicio",
    "purpose": "Registrar la recepción de un aparato y dejar la orden disponible para diagnóstico.",
    "languages": ["es"]
  },
  "designContext": {
    "initialPrompt": "crear el módulo ordenServicio, en español, para un servicio técnico de electrónica.",
    "clarification": {
      "mainActors": "recepcionista, técnico y cliente",
      "mainGoal": "Abrir una orden de servicio con los datos del cliente y el aparato.",
      "boundaries": "Sin pago, garantía ni stock de piezas."
    }
  },
  "reviewPolicy": { "mode": "automatic" },
  "solutionStrategy": {
    "mode": "newSolution",
    "rationale": "Solución nueva para el taller.",
    "databaseChangePolicy": "new"
  },
  "businessScope": {
    "mainGoal": "Registrar la recepción del aparato y dejar la orden disponible.",
    "actors": [
      { "actorId": "recepcionista", "title": "Recepcionista", "kind": "internal", "origin": "named", "expectedOutcome": "La orden queda abierta." },
      { "actorId": "tecnico", "title": "Técnico", "kind": "internal", "origin": "named", "expectedOutcome": "El diagnóstico queda registrado." },
      { "actorId": "cliente", "title": "Cliente", "kind": "external", "origin": "named", "expectedOutcome": "Consulta sólo sus propias órdenes." }
    ],
    "expectedOutcomes": [
      { "outcomeId": "ordenAbierta", "title": "Orden abierta", "description": "Existe una orden con cliente, aparato y defecto." }
    ],
    "inScope": ["Recepción del aparato", "Diagnóstico y presupuesto"],
    "outOfScope": ["Pago", "Garantía"]
  },
  "localization": {
    "productLanguages": ["es"],
    "defaultLanguage": "es",
    "primaryMarket": "España"
  },
  "declaredConstraints": {
    "mandatoryIntegrations": [],
    "regulatoryNotes": "El cliente no ve el costo interno.",
    "criticalNotes": "Fotos del aparato en la recepción."
  },
  "specStatus": {
    "flowId": "agentNewSolution",
    "flowVersion": "2026-09-08-ns4-flow-v41",
    "state": "complete",
    "artifactCompleteness": "full",
    "completedSteps": [],
    "nextStep": "complete",
    "updatedAt": "2026-09-09T00:00:00.000Z"
  }
} as const satisfies Ns4ModuleArtifact;

export type OrdenServicioEsModuleType = typeof ordenServicioEsModule;

export default ordenServicioEsModule;
