/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/persistence/seeds.ts" enhancement="_blank"/>
import type { TableSeedRows } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';

export const seedPlan = {
  "phase": "plan",
  "scenarios": [
    {
      "scenarioId": "criarTarefa",
      "tableId": "itemChecklist",
      "source": "journey:criarTarefa",
      "constraints": [
        "ref:tarefaId:Tarefa"
      ],
      "refs": [
        {
          "field": "tarefaId",
          "relationshipId": "itemChecklistTarefa",
          "entityId": "Tarefa"
        }
      ],
      "states": [],
      "entityId": "ItemChecklist"
    },
    {
      "scenarioId": "editarTarefa",
      "tableId": "itemChecklist",
      "source": "journey:editarTarefa",
      "constraints": [
        "ref:tarefaId:Tarefa"
      ],
      "refs": [
        {
          "field": "tarefaId",
          "relationshipId": "itemChecklistTarefa",
          "entityId": "Tarefa"
        }
      ],
      "states": [],
      "entityId": "ItemChecklist"
    },
    {
      "scenarioId": "executarTarefa",
      "tableId": "itemChecklist",
      "source": "journey:executarTarefa",
      "constraints": [
        "ref:tarefaId:Tarefa"
      ],
      "refs": [
        {
          "field": "tarefaId",
          "relationshipId": "itemChecklistTarefa",
          "entityId": "Tarefa"
        }
      ],
      "states": [],
      "entityId": "ItemChecklist"
    },
    {
      "scenarioId": "manterListas",
      "tableId": "listaTarefas",
      "source": "journey:manterListas",
      "constraints": [
        "uniqueKeys:nome"
      ],
      "refs": [],
      "states": [],
      "entityId": "ListaTarefas"
    },
    {
      "scenarioId": "acompanharTarefas",
      "tableId": "tarefa",
      "source": "journey:acompanharTarefas",
      "constraints": [
        "ref:criadorId:Participante",
        "ref:listaId:ListaTarefas",
        "ref:responsavelId:Participante",
        "ref:tarefaPaiId:Tarefa"
      ],
      "refs": [
        {
          "field": "criadorId",
          "relationshipId": "tarefaCriador",
          "entityId": "Participante"
        },
        {
          "field": "listaId",
          "relationshipId": "tarefaLista",
          "entityId": "ListaTarefas"
        },
        {
          "field": "responsavelId",
          "relationshipId": "tarefaResponsavel",
          "entityId": "Participante"
        },
        {
          "field": "tarefaPaiId",
          "relationshipId": "tarefaPai",
          "entityId": "Tarefa"
        }
      ],
      "states": [],
      "entityId": "Tarefa",
      "stateField": "status"
    },
    {
      "scenarioId": "cancelarTarefa",
      "tableId": "tarefa",
      "source": "journey:cancelarTarefa",
      "constraints": [
        "ref:criadorId:Participante",
        "ref:listaId:ListaTarefas",
        "ref:responsavelId:Participante",
        "ref:tarefaPaiId:Tarefa",
        "state:cancelada"
      ],
      "refs": [
        {
          "field": "criadorId",
          "relationshipId": "tarefaCriador",
          "entityId": "Participante"
        },
        {
          "field": "listaId",
          "relationshipId": "tarefaLista",
          "entityId": "ListaTarefas"
        },
        {
          "field": "responsavelId",
          "relationshipId": "tarefaResponsavel",
          "entityId": "Participante"
        },
        {
          "field": "tarefaPaiId",
          "relationshipId": "tarefaPai",
          "entityId": "Tarefa"
        }
      ],
      "states": [
        "cancelada"
      ],
      "entityId": "Tarefa",
      "stateField": "status"
    },
    {
      "scenarioId": "cancelarTarefaCriada",
      "tableId": "tarefa",
      "source": "journey:cancelarTarefaCriada",
      "constraints": [
        "ref:criadorId:Participante",
        "ref:listaId:ListaTarefas",
        "ref:responsavelId:Participante",
        "ref:tarefaPaiId:Tarefa",
        "state:cancelada"
      ],
      "refs": [
        {
          "field": "criadorId",
          "relationshipId": "tarefaCriador",
          "entityId": "Participante"
        },
        {
          "field": "listaId",
          "relationshipId": "tarefaLista",
          "entityId": "ListaTarefas"
        },
        {
          "field": "responsavelId",
          "relationshipId": "tarefaResponsavel",
          "entityId": "Participante"
        },
        {
          "field": "tarefaPaiId",
          "relationshipId": "tarefaPai",
          "entityId": "Tarefa"
        }
      ],
      "states": [
        "cancelada"
      ],
      "entityId": "Tarefa",
      "stateField": "status"
    },
    {
      "scenarioId": "criarTarefa",
      "tableId": "tarefa",
      "source": "journey:criarTarefa",
      "constraints": [
        "ref:criadorId:Participante",
        "ref:listaId:ListaTarefas",
        "ref:responsavelId:Participante",
        "ref:tarefaPaiId:Tarefa",
        "state:aFazer"
      ],
      "refs": [
        {
          "field": "criadorId",
          "relationshipId": "tarefaCriador",
          "entityId": "Participante"
        },
        {
          "field": "listaId",
          "relationshipId": "tarefaLista",
          "entityId": "ListaTarefas"
        },
        {
          "field": "responsavelId",
          "relationshipId": "tarefaResponsavel",
          "entityId": "Participante"
        },
        {
          "field": "tarefaPaiId",
          "relationshipId": "tarefaPai",
          "entityId": "Tarefa"
        }
      ],
      "states": [
        "aFazer"
      ],
      "entityId": "Tarefa",
      "stateField": "status"
    },
    {
      "scenarioId": "editarTarefa",
      "tableId": "tarefa",
      "source": "journey:editarTarefa",
      "constraints": [
        "ref:criadorId:Participante",
        "ref:listaId:ListaTarefas",
        "ref:responsavelId:Participante",
        "ref:tarefaPaiId:Tarefa"
      ],
      "refs": [
        {
          "field": "criadorId",
          "relationshipId": "tarefaCriador",
          "entityId": "Participante"
        },
        {
          "field": "listaId",
          "relationshipId": "tarefaLista",
          "entityId": "ListaTarefas"
        },
        {
          "field": "responsavelId",
          "relationshipId": "tarefaResponsavel",
          "entityId": "Participante"
        },
        {
          "field": "tarefaPaiId",
          "relationshipId": "tarefaPai",
          "entityId": "Tarefa"
        }
      ],
      "states": [],
      "entityId": "Tarefa",
      "stateField": "status"
    },
    {
      "scenarioId": "executarTarefa",
      "tableId": "tarefa",
      "source": "journey:executarTarefa",
      "constraints": [
        "ref:criadorId:Participante",
        "ref:listaId:ListaTarefas",
        "ref:responsavelId:Participante",
        "ref:tarefaPaiId:Tarefa",
        "state:emAndamento"
      ],
      "refs": [
        {
          "field": "criadorId",
          "relationshipId": "tarefaCriador",
          "entityId": "Participante"
        },
        {
          "field": "listaId",
          "relationshipId": "tarefaLista",
          "entityId": "ListaTarefas"
        },
        {
          "field": "responsavelId",
          "relationshipId": "tarefaResponsavel",
          "entityId": "Participante"
        },
        {
          "field": "tarefaPaiId",
          "relationshipId": "tarefaPai",
          "entityId": "Tarefa"
        }
      ],
      "states": [
        "emAndamento"
      ],
      "entityId": "Tarefa",
      "stateField": "status"
    },
    {
      "scenarioId": "minhasTarefas",
      "tableId": "tarefa",
      "source": "journey:minhasTarefas",
      "constraints": [
        "ref:criadorId:Participante",
        "ref:listaId:ListaTarefas",
        "ref:responsavelId:Participante",
        "ref:tarefaPaiId:Tarefa"
      ],
      "refs": [
        {
          "field": "criadorId",
          "relationshipId": "tarefaCriador",
          "entityId": "Participante"
        },
        {
          "field": "listaId",
          "relationshipId": "tarefaLista",
          "entityId": "ListaTarefas"
        },
        {
          "field": "responsavelId",
          "relationshipId": "tarefaResponsavel",
          "entityId": "Participante"
        },
        {
          "field": "tarefaPaiId",
          "relationshipId": "tarefaPai",
          "entityId": "Tarefa"
        }
      ],
      "states": [],
      "entityId": "Tarefa",
      "stateField": "status"
    },
    {
      "scenarioId": "reatribuirTarefa",
      "tableId": "tarefa",
      "source": "journey:reatribuirTarefa",
      "constraints": [
        "ref:criadorId:Participante",
        "ref:listaId:ListaTarefas",
        "ref:responsavelId:Participante",
        "ref:tarefaPaiId:Tarefa"
      ],
      "refs": [
        {
          "field": "criadorId",
          "relationshipId": "tarefaCriador",
          "entityId": "Participante"
        },
        {
          "field": "listaId",
          "relationshipId": "tarefaLista",
          "entityId": "ListaTarefas"
        },
        {
          "field": "responsavelId",
          "relationshipId": "tarefaResponsavel",
          "entityId": "Participante"
        },
        {
          "field": "tarefaPaiId",
          "relationshipId": "tarefaPai",
          "entityId": "Tarefa"
        }
      ],
      "states": [],
      "entityId": "Tarefa",
      "stateField": "status"
    },
    {
      "scenarioId": "reatribuirTarefaCriada",
      "tableId": "tarefa",
      "source": "journey:reatribuirTarefaCriada",
      "constraints": [
        "ref:criadorId:Participante",
        "ref:listaId:ListaTarefas",
        "ref:responsavelId:Participante",
        "ref:tarefaPaiId:Tarefa"
      ],
      "refs": [
        {
          "field": "criadorId",
          "relationshipId": "tarefaCriador",
          "entityId": "Participante"
        },
        {
          "field": "listaId",
          "relationshipId": "tarefaLista",
          "entityId": "ListaTarefas"
        },
        {
          "field": "responsavelId",
          "relationshipId": "tarefaResponsavel",
          "entityId": "Participante"
        },
        {
          "field": "tarefaPaiId",
          "relationshipId": "tarefaPai",
          "entityId": "Tarefa"
        }
      ],
      "states": [],
      "entityId": "Tarefa",
      "stateField": "status"
    },
    {
      "scenarioId": "resumoDiario",
      "tableId": "tarefa",
      "source": "journey:resumoDiario",
      "constraints": [
        "ref:criadorId:Participante",
        "ref:listaId:ListaTarefas",
        "ref:responsavelId:Participante",
        "ref:tarefaPaiId:Tarefa"
      ],
      "refs": [
        {
          "field": "criadorId",
          "relationshipId": "tarefaCriador",
          "entityId": "Participante"
        },
        {
          "field": "listaId",
          "relationshipId": "tarefaLista",
          "entityId": "ListaTarefas"
        },
        {
          "field": "responsavelId",
          "relationshipId": "tarefaResponsavel",
          "entityId": "Participante"
        },
        {
          "field": "tarefaPaiId",
          "relationshipId": "tarefaPai",
          "entityId": "Tarefa"
        }
      ],
      "states": [],
      "entityId": "Tarefa",
      "stateField": "status"
    },
    {
      "scenarioId": "retomarTarefa",
      "tableId": "tarefa",
      "source": "journey:retomarTarefa",
      "constraints": [
        "ref:criadorId:Participante",
        "ref:listaId:ListaTarefas",
        "ref:responsavelId:Participante",
        "ref:tarefaPaiId:Tarefa",
        "state:emAndamento"
      ],
      "refs": [
        {
          "field": "criadorId",
          "relationshipId": "tarefaCriador",
          "entityId": "Participante"
        },
        {
          "field": "listaId",
          "relationshipId": "tarefaLista",
          "entityId": "ListaTarefas"
        },
        {
          "field": "responsavelId",
          "relationshipId": "tarefaResponsavel",
          "entityId": "Participante"
        },
        {
          "field": "tarefaPaiId",
          "relationshipId": "tarefaPai",
          "entityId": "Tarefa"
        }
      ],
      "states": [
        "emAndamento"
      ],
      "entityId": "Tarefa",
      "stateField": "status"
    },
    {
      "scenarioId": "revisarTarefa",
      "tableId": "tarefa",
      "source": "journey:revisarTarefa",
      "constraints": [
        "ref:criadorId:Participante",
        "ref:listaId:ListaTarefas",
        "ref:responsavelId:Participante",
        "ref:tarefaPaiId:Tarefa",
        "state:concluida"
      ],
      "refs": [
        {
          "field": "criadorId",
          "relationshipId": "tarefaCriador",
          "entityId": "Participante"
        },
        {
          "field": "listaId",
          "relationshipId": "tarefaLista",
          "entityId": "ListaTarefas"
        },
        {
          "field": "responsavelId",
          "relationshipId": "tarefaResponsavel",
          "entityId": "Participante"
        },
        {
          "field": "tarefaPaiId",
          "relationshipId": "tarefaPai",
          "entityId": "Tarefa"
        }
      ],
      "states": [
        "concluida"
      ],
      "entityId": "Tarefa",
      "stateField": "status"
    }
  ]
} as const;

export const seedRows0 = {"seedFor":"listaTarefas","purpose":"test","rows":[{"nome":"tarefas.listaTarefas.manterListas.nome","details":{"version":1},"id":"df242dcb-e5ea-511e-be5c-82442de1b126"}]} satisfies TableSeedRows;
export const seedRows1 = {"seedFor":"mdmEntityIndex","purpose":"test","rows":[{"mdmId":"44c2dbd3-9f7a-5a13-9142-793c285ccc4f","subtype":"Person","name":"Membro da equipe","status":"Active","docType":null,"docId":null,"countryCode":"US","tags":["tarefas.Person","tarefas","actor","membroEquipe","tarefas.Participante"],"searchVector":"membro da equipe membroequipe tarefas","mergedInto":null,"dynamoPk":"44c2dbd3-9f7a-5a13-9142-793c285ccc4f","createdAt":"2026-07-01T00:00:00.000Z","updatedAt":"2026-07-01T00:00:00.000Z"},{"mdmId":"b4162417-5a3c-5d89-908f-68fac78937a7","subtype":"Person","name":"Gestor","status":"Active","docType":null,"docId":null,"countryCode":"US","tags":["tarefas.Person","tarefas","actor","gestor"],"searchVector":"gestor gestor tarefas","mergedInto":null,"dynamoPk":"b4162417-5a3c-5d89-908f-68fac78937a7","createdAt":"2026-07-01T00:00:00.000Z","updatedAt":"2026-07-01T00:00:00.000Z"}]} satisfies TableSeedRows;
export const seedRows2 = {"seedFor":"mdmDocumentCache","purpose":"test","rows":[{"mdmId":"44c2dbd3-9f7a-5a13-9142-793c285ccc4f","version":1,"details":{"mdmId":"44c2dbd3-9f7a-5a13-9142-793c285ccc4f","subtype":"Person","name":"Membro da equipe","status":"Active","docType":"SSN","docId":null,"countryCode":"US","tags":["tarefas.Person","tarefas","actor","membroEquipe","tarefas.Participante"],"mergedInto":null,"createdAt":"2026-07-01T00:00:00.000Z","updatedAt":"2026-07-01T00:00:00.000Z","moduleTypes":[],"aliases":[],"addresses":[],"contacts":[],"relationshipRefs":{},"notes":null,"actorId":"membroEquipe"}},{"mdmId":"b4162417-5a3c-5d89-908f-68fac78937a7","version":1,"details":{"mdmId":"b4162417-5a3c-5d89-908f-68fac78937a7","subtype":"Person","name":"Gestor","status":"Active","docType":"SSN","docId":null,"countryCode":"US","tags":["tarefas.Person","tarefas","actor","gestor"],"mergedInto":null,"createdAt":"2026-07-01T00:00:00.000Z","updatedAt":"2026-07-01T00:00:00.000Z","moduleTypes":[],"aliases":[],"addresses":[],"contacts":[],"relationshipRefs":{},"notes":null,"actorId":"gestor"}}]} satisfies TableSeedRows;

export const certificationFixture = {
  "schemaVersion": "2026-09-27-m1-certification-fixture-v1",
  "phase": "plan",
  "targets": [
    "memory",
    "development"
  ],
  "datasets": [
    {
      "supportId": "data:ItemChecklist",
      "entityId": "ItemChecklist",
      "tableId": "itemChecklist",
      "dependsOn": [
        "Tarefa"
      ],
      "sourceRefs": [
        "grant:gestorTodasTarefas",
        "grant:membroChecklistPropria",
        "journey:acompanharTarefas/abrirTarefaGestor",
        "journey:acompanharTarefas/filtrarTarefas",
        "journey:acompanharTarefas/verQuadro",
        "journey:cancelarTarefa/cancelar",
        "journey:cancelarTarefa/localizarTarefaCancelar",
        "journey:cancelarTarefaCriada/cancelarCriada",
        "journey:cancelarTarefaCriada/localizarCriadaCancelar",
        "journey:criarTarefa/adicionarChecklist",
        "journey:criarTarefa/preencherTarefa",
        "journey:editarTarefa/ajustarChecklist",
        "journey:editarTarefa/alterarCampos",
        "journey:editarTarefa/localizarTarefaEdicao",
        "journey:executarTarefa/abrirTarefa",
        "journey:executarTarefa/enviarRevisao",
        "journey:executarTarefa/iniciarTarefa",
        "journey:executarTarefa/marcarItem",
        "journey:executarTarefa/verTarefa",
        "journey:minhasTarefas/listarMinhas",
        "journey:minhasTarefas/verDetalhe",
        "journey:reatribuirTarefa/localizarTarefaReatribuir",
        "journey:reatribuirTarefa/trocarResponsavel",
        "journey:reatribuirTarefa/verResponsavelAtual",
        "journey:reatribuirTarefaCriada/localizarCriada",
        "journey:reatribuirTarefaCriada/trocarResponsavelCriada",
        "journey:reatribuirTarefaCriada/verResponsavelCriada",
        "journey:resumoDiario/lerResumo",
        "journey:resumoDiario/verVencendo",
        "journey:retomarTarefa/lerMotivo",
        "journey:retomarTarefa/reenviarRevisao",
        "journey:retomarTarefa/retomar",
        "journey:revisarTarefa/abrirRevisao",
        "journey:revisarTarefa/aceitarTarefa",
        "journey:revisarTarefa/conferirTarefa",
        "journey:revisarTarefa/devolverTarefa",
        "relationship:ItemChecklist/itemChecklistTarefa",
        "relationship:Tarefa/itemChecklistTarefa"
      ]
    },
    {
      "supportId": "data:ListaTarefas",
      "entityId": "ListaTarefas",
      "tableId": "listaTarefas",
      "dependsOn": [],
      "sourceRefs": [
        "grant:gestorListas",
        "grant:membroConsultarListas",
        "journey:acompanharTarefas/abrirTarefaGestor",
        "journey:acompanharTarefas/filtrarTarefas",
        "journey:acompanharTarefas/verQuadro",
        "journey:cancelarTarefa/cancelar",
        "journey:cancelarTarefa/localizarTarefaCancelar",
        "journey:cancelarTarefaCriada/cancelarCriada",
        "journey:cancelarTarefaCriada/localizarCriadaCancelar",
        "journey:criarTarefa/adicionarChecklist",
        "journey:criarTarefa/preencherTarefa",
        "journey:editarTarefa/ajustarChecklist",
        "journey:editarTarefa/alterarCampos",
        "journey:editarTarefa/localizarTarefaEdicao",
        "journey:executarTarefa/abrirTarefa",
        "journey:executarTarefa/enviarRevisao",
        "journey:executarTarefa/iniciarTarefa",
        "journey:executarTarefa/marcarItem",
        "journey:executarTarefa/verTarefa",
        "journey:manterListas/criarLista",
        "journey:manterListas/editarLista",
        "journey:manterListas/localizarLista",
        "journey:minhasTarefas/listarMinhas",
        "journey:minhasTarefas/verDetalhe",
        "journey:reatribuirTarefa/localizarTarefaReatribuir",
        "journey:reatribuirTarefa/trocarResponsavel",
        "journey:reatribuirTarefa/verResponsavelAtual",
        "journey:reatribuirTarefaCriada/localizarCriada",
        "journey:reatribuirTarefaCriada/trocarResponsavelCriada",
        "journey:reatribuirTarefaCriada/verResponsavelCriada",
        "journey:resumoDiario/lerResumo",
        "journey:resumoDiario/verVencendo",
        "journey:retomarTarefa/lerMotivo",
        "journey:retomarTarefa/reenviarRevisao",
        "journey:retomarTarefa/retomar",
        "journey:revisarTarefa/abrirRevisao",
        "journey:revisarTarefa/aceitarTarefa",
        "journey:revisarTarefa/conferirTarefa",
        "journey:revisarTarefa/devolverTarefa",
        "relationship:ListaTarefas/tarefaLista",
        "relationship:Tarefa/tarefaLista"
      ]
    },
    {
      "supportId": "data:Tarefa",
      "entityId": "Tarefa",
      "tableId": "tarefa",
      "dependsOn": [
        "ListaTarefas"
      ],
      "sourceRefs": [
        "grant:gestorTodasTarefas",
        "grant:membroTarefasProprias",
        "journey:acompanharTarefas/abrirTarefaGestor",
        "journey:acompanharTarefas/filtrarTarefas",
        "journey:acompanharTarefas/verQuadro",
        "journey:cancelarTarefa/cancelar",
        "journey:cancelarTarefa/localizarTarefaCancelar",
        "journey:cancelarTarefaCriada/cancelarCriada",
        "journey:cancelarTarefaCriada/localizarCriadaCancelar",
        "journey:configurarParticipantes/incluirParticipante",
        "journey:configurarParticipantes/localizarUsuario",
        "journey:configurarParticipantes/marcarPermissoes",
        "journey:criarTarefa/adicionarChecklist",
        "journey:criarTarefa/preencherTarefa",
        "journey:editarTarefa/ajustarChecklist",
        "journey:editarTarefa/alterarCampos",
        "journey:editarTarefa/localizarTarefaEdicao",
        "journey:executarTarefa/abrirTarefa",
        "journey:executarTarefa/enviarRevisao",
        "journey:executarTarefa/iniciarTarefa",
        "journey:executarTarefa/marcarItem",
        "journey:executarTarefa/verTarefa",
        "journey:manterListas/criarLista",
        "journey:manterListas/editarLista",
        "journey:manterListas/localizarLista",
        "journey:minhasTarefas/listarMinhas",
        "journey:minhasTarefas/verDetalhe",
        "journey:reatribuirTarefa/localizarTarefaReatribuir",
        "journey:reatribuirTarefa/trocarResponsavel",
        "journey:reatribuirTarefa/verResponsavelAtual",
        "journey:reatribuirTarefaCriada/localizarCriada",
        "journey:reatribuirTarefaCriada/trocarResponsavelCriada",
        "journey:reatribuirTarefaCriada/verResponsavelCriada",
        "journey:resumoDiario/lerResumo",
        "journey:resumoDiario/verVencendo",
        "journey:retomarTarefa/lerMotivo",
        "journey:retomarTarefa/reenviarRevisao",
        "journey:retomarTarefa/retomar",
        "journey:revisarTarefa/abrirRevisao",
        "journey:revisarTarefa/aceitarTarefa",
        "journey:revisarTarefa/conferirTarefa",
        "journey:revisarTarefa/decidirRevisao",
        "journey:revisarTarefa/devolverTarefa",
        "ontology:Tarefa/lifecycleStates/aFazer",
        "ontology:Tarefa/lifecycleStates/emAndamento",
        "ontology:Tarefa/lifecycleStates/emRevisao",
        "relationship:ItemChecklist/itemChecklistTarefa",
        "relationship:ListaTarefas/tarefaLista",
        "relationship:Participante/tarefaCriador",
        "relationship:Participante/tarefaResponsavel",
        "relationship:Tarefa/itemChecklistTarefa",
        "relationship:Tarefa/tarefaCriador",
        "relationship:Tarefa/tarefaLista",
        "relationship:Tarefa/tarefaResponsavel"
      ]
    }
  ],
  "runtime": [
    {
      "supportId": "identity:gestor",
      "kind": "identity",
      "entityId": "",
      "actorRefs": [
        "gestor"
      ],
      "gap": "PERSON_ENTITY_UNDECLARED: actor gestor declares no personEntity; the test identity cannot be bound",
      "owner": "runtime"
    },
    {
      "supportId": "identity:membroEquipe",
      "kind": "identity",
      "entityId": "Participante",
      "actorRefs": [
        "membroEquipe"
      ],
      "gap": "RUNTIME_TEST_IDENTITY_UNREFERENCED: no verified runtime capability provisions an authenticated test identity for membroEquipe bound to Participante",
      "owner": "runtime"
    }
  ],
  "gaps": []
} as const;

export function applicableSeeds(mode: string): TableSeedRows[] {
  if (mode !== 'development' && mode !== 'presentation') return [];
  return [seedRows0, seedRows1, seedRows2];
}
