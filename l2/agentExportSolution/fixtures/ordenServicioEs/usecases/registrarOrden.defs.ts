/// <mls fileReference="_102035_/l4/ordenServicioEs/usecases/registrarOrden.defs.ts" enhancement="_blank"/>

import type { Ns4UseCaseArtifactV3 } from '/_102035_/l2/agentNewSolution/types.js';

export const registrarOrdenUseCase = {
  "schemaVersion": "2026-09-09-ns4-usecase-v4",
  "moduleName": "ordenServicioEs",
  "useCaseId": "registrarOrden",
  "title": "Registrar orden de servicio",
  "kind": "command",
  "compiledFrom": ["abrirOrden.registrarOrden"],
  "description": "Registra la recepción del aparato con cliente, defecto informado y fotos.",
  "contexts": { "requires": [], "provides": ["selectedOrdenServicio"] },
  "entityRefs": ["OrdenServicio"],
  "writes": [{ "entityId": "OrdenServicio" }],
  "useRules": ["clienteSoloConsultaSusOrdenes"],
  "transitionRefs": [],
  "useCaseHash": "sha256:00"
} as const satisfies Ns4UseCaseArtifactV3;

export type RegistrarOrdenUseCaseType = typeof registrarOrdenUseCase;

export default registrarOrdenUseCase;
