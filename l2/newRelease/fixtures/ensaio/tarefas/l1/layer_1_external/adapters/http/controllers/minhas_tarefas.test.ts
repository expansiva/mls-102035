/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/http/controllers/minhas_tarefas.test.ts" enhancement="_blank"/>

// Monitor cases of this page backend, as data (skills/monitorTests.md). Written by hand in the agentMaterializeL1 format (prompt limit).
export const pageTests = {
  "moduleName": "tarefas",
  "page": "minhas_tarefas",
  "variant": "backend",
  "actor": "membroEquipe",
  "cases": [
    {
      "id": "tarefas.minhas_tarefas.qryMinhasTarefas.ok",
      "routine": "tarefas.minhas_tarefas.qryMinhasTarefas",
      "params": {
        "page": 1,
        "pageSize": 10
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": false
    },
    {
      "id": "tarefas.minhas_tarefas.qryMinhasTarefas.page.required",
      "routine": "tarefas.minhas_tarefas.qryMinhasTarefas",
      "params": {
        "pageSize": 10
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": false
    },
    {
      "id": "tarefas.minhas_tarefas.qryMinhasTarefas.pageSize.required",
      "routine": "tarefas.minhas_tarefas.qryMinhasTarefas",
      "params": {
        "page": 1
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": false
    },
    {
      "id": "tarefas.minhas_tarefas.qryTarefasDoGrupo.responsavel",
      "routine": "tarefas.minhas_tarefas.qryTarefasDoGrupo",
      "params": {
        "grupo": "responsavel",
        "page": 1,
        "pageSize": 10
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": false
    },
    {
      "id": "tarefas.minhas_tarefas.qryTarefasDoGrupo.criadas",
      "routine": "tarefas.minhas_tarefas.qryTarefasDoGrupo",
      "params": {
        "grupo": "criadas",
        "page": 1,
        "pageSize": 10
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": false
    },
    {
      "id": "tarefas.minhas_tarefas.qryTarefasDoGrupo.dependeDeMim",
      "routine": "tarefas.minhas_tarefas.qryTarefasDoGrupo",
      "params": {
        "grupo": "dependeDeMim",
        "page": 1,
        "pageSize": 10
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": false
    },
    {
      "id": "tarefas.minhas_tarefas.qryTarefasDoGrupo.grupo.required",
      "routine": "tarefas.minhas_tarefas.qryTarefasDoGrupo",
      "params": {
        "page": 1,
        "pageSize": 10
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": false
    },
    {
      "id": "tarefas.minhas_tarefas.qryTarefa.ok",
      "routine": "tarefas.minhas_tarefas.qryTarefa",
      "params": {
        "tarefaId": "<seedRef>"
      },
      "paramFieldRefs": {
        "tarefaId": "Tarefa.id"
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": false
    },
    {
      "id": "tarefas.minhas_tarefas.qryTarefa.tarefaId.required",
      "routine": "tarefas.minhas_tarefas.qryTarefa",
      "params": {},
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": false
    },
    {
      "id": "tarefas.minhas_tarefas.qryResponsaveis.ok",
      "routine": "tarefas.minhas_tarefas.qryResponsaveis",
      "params": {},
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": false
    },
    {
      "id": "tarefas.minhas_tarefas.qryResponsaveis.porNome",
      "routine": "tarefas.minhas_tarefas.qryResponsaveis",
      "params": {
        "busca": "<seedValue>"
      },
      "paramFieldRefs": {
        "busca": "Participante.details.identification.name"
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": false
    },
    {
      "id": "tarefas.minhas_tarefas.qryListas.ok",
      "routine": "tarefas.minhas_tarefas.qryListas",
      "params": {},
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": false
    },
    {
      "id": "tarefas.minhas_tarefas.cmdCriarTarefa.ok",
      "routine": "tarefas.minhas_tarefas.cmdCriarTarefa",
      "params": {
        "titulo": "Revisar proposta",
        "details": {
          "descricao": "Conferir valores"
        },
        "prioridade": "media",
        "listaId": "<seedRef>",
        "responsavelId": "<seedRef>",
        "criadorId": "<seedRef>"
      },
      "paramFieldRefs": {
        "listaId": "ListaTarefas.id",
        "responsavelId": "Participante.id",
        "criadorId": "Participante.id"
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdCriarTarefa.titulo.required",
      "routine": "tarefas.minhas_tarefas.cmdCriarTarefa",
      "params": {
        "details": {},
        "prioridade": "media",
        "listaId": "<seedRef>",
        "responsavelId": "<seedRef>",
        "criadorId": "<seedRef>"
      },
      "paramFieldRefs": {
        "listaId": "ListaTarefas.id",
        "responsavelId": "Participante.id",
        "criadorId": "Participante.id"
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdCriarTarefa.prioridade.invalid",
      "routine": "tarefas.minhas_tarefas.cmdCriarTarefa",
      "params": {
        "titulo": "Revisar proposta",
        "details": {},
        "prioridade": "urgente",
        "listaId": "<seedRef>",
        "responsavelId": "<seedRef>",
        "criadorId": "<seedRef>"
      },
      "paramFieldRefs": {
        "listaId": "ListaTarefas.id",
        "responsavelId": "Participante.id",
        "criadorId": "Participante.id"
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdSalvarAlteracoes.ok",
      "routine": "tarefas.minhas_tarefas.cmdSalvarAlteracoes",
      "params": {
        "id": "<seedRef>",
        "version": "<seedRef>",
        "titulo": "Revisar proposta",
        "details": {},
        "prioridade": "alta",
        "listaId": "<seedRef>",
        "responsavelId": "<seedRef>"
      },
      "paramFieldRefs": {
        "id": "Tarefa.id",
        "version": "Tarefa.version",
        "listaId": "ListaTarefas.id",
        "responsavelId": "Participante.id"
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdSalvarAlteracoes.id.required",
      "routine": "tarefas.minhas_tarefas.cmdSalvarAlteracoes",
      "params": {
        "version": "<seedRef>",
        "titulo": "Revisar proposta",
        "details": {},
        "prioridade": "alta",
        "listaId": "<seedRef>",
        "responsavelId": "<seedRef>"
      },
      "paramFieldRefs": {
        "version": "Tarefa.version",
        "listaId": "ListaTarefas.id",
        "responsavelId": "Participante.id"
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdAdicionarItensChecklist.ok",
      "routine": "tarefas.minhas_tarefas.cmdAdicionarItensChecklist",
      "params": {
        "tarefaId": "<seedRef>",
        "itens": [
          {
            "ordem": 1,
            "details": {
              "descricao": "Primeiro passo",
              "concluido": false
            }
          }
        ]
      },
      "paramFieldRefs": {
        "tarefaId": "Tarefa.id"
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdAdicionarItensChecklist.tarefaId.required",
      "routine": "tarefas.minhas_tarefas.cmdAdicionarItensChecklist",
      "params": {
        "itens": [
          {
            "ordem": 1,
            "details": {
              "descricao": "Primeiro passo",
              "concluido": false
            }
          }
        ]
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdAjustarChecklist.tarefaId.required",
      "routine": "tarefas.minhas_tarefas.cmdAjustarChecklist",
      "params": {
        "itens": []
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdIniciar.ok",
      "routine": "tarefas.minhas_tarefas.cmdIniciar",
      "params": {
        "id": "<seedRef>",
        "version": "<seedRef>"
      },
      "paramFieldRefs": {
        "id": "Tarefa.id",
        "version": "Tarefa.version"
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdIniciar.id.required",
      "routine": "tarefas.minhas_tarefas.cmdIniciar",
      "params": {
        "version": 1
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdEnviarParaRevisao.ok",
      "routine": "tarefas.minhas_tarefas.cmdEnviarParaRevisao",
      "params": {
        "id": "<seedRef>",
        "version": "<seedRef>"
      },
      "paramFieldRefs": {
        "id": "Tarefa.id",
        "version": "Tarefa.version"
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdEnviarParaRevisao.id.required",
      "routine": "tarefas.minhas_tarefas.cmdEnviarParaRevisao",
      "params": {
        "version": 1
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdAceitar.ok",
      "routine": "tarefas.minhas_tarefas.cmdAceitar",
      "params": {
        "id": "<seedRef>",
        "version": "<seedRef>"
      },
      "paramFieldRefs": {
        "id": "Tarefa.id",
        "version": "Tarefa.version"
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdAceitar.id.required",
      "routine": "tarefas.minhas_tarefas.cmdAceitar",
      "params": {
        "version": 1
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdDevolver.ok",
      "routine": "tarefas.minhas_tarefas.cmdDevolver",
      "params": {
        "id": "<seedRef>",
        "version": "<seedRef>",
        "details": {
          "motivoDevolucao": "Corrigir os valores"
        }
      },
      "paramFieldRefs": {
        "id": "Tarefa.id",
        "version": "Tarefa.version"
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdDevolver.motivoDevolucao.required",
      "routine": "tarefas.minhas_tarefas.cmdDevolver",
      "params": {
        "id": "<seedRef>",
        "version": "<seedRef>",
        "details": {}
      },
      "paramFieldRefs": {
        "id": "Tarefa.id",
        "version": "Tarefa.version"
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdRetomar.ok",
      "routine": "tarefas.minhas_tarefas.cmdRetomar",
      "params": {
        "id": "<seedRef>",
        "version": "<seedRef>"
      },
      "paramFieldRefs": {
        "id": "Tarefa.id",
        "version": "Tarefa.version"
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdRetomar.id.required",
      "routine": "tarefas.minhas_tarefas.cmdRetomar",
      "params": {
        "version": 1
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdCancelar.ok",
      "routine": "tarefas.minhas_tarefas.cmdCancelar",
      "params": {
        "id": "<seedRef>",
        "version": "<seedRef>"
      },
      "paramFieldRefs": {
        "id": "Tarefa.id",
        "version": "Tarefa.version"
      },
      "expect": {
        "ok": true,
        "shape": "object"
      },
      "mutating": true
    },
    {
      "id": "tarefas.minhas_tarefas.cmdCancelar.id.required",
      "routine": "tarefas.minhas_tarefas.cmdCancelar",
      "params": {
        "version": 1
      },
      "expect": {
        "ok": false,
        "errorCode": "VALIDATION_ERROR"
      },
      "mutating": true
    }
  ]
} as const;
