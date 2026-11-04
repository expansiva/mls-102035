/// <mls fileReference="_102047_/l2/tarefas/web/desktop/page11/inicio.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/activityNotificationHub/page21.md",
    "experience": "inboxSplit"
  },
  "intent": "Mostrar ao membro da equipe, logo ao entrar, tudo o que depende dele agora — tarefas para iniciar ou executar, tarefas que criou aguardando revisão e tarefas devolvidas para retomar — junto com os prazos que vencem hoje ou estão atrasados, para que aja sem procurar.",
  "sections": [
    {
      "id": "secaoAlertas",
      "priority": "primary",
      "purpose": "Destacar no topo o resumo das 8h com as tarefas abertas que vencem hoje ou estão atrasadas, para abrir direto.",
      "organisms": [
        "alertasPrazo"
      ]
    },
    {
      "id": "secaoPendencias",
      "priority": "main",
      "purpose": "Concentrar o que depende de mim agora, agrupado por executar, revisar e retomar, com a ação certa em cada tarefa.",
      "organisms": [
        "pendenciasAgora"
      ]
    },
    {
      "id": "secaoPanorama",
      "priority": "secondary",
      "purpose": "Dar o panorama numérico das minhas tarefas e lembrar se aceito e se posso criar tarefas.",
      "organisms": [
        "indicadoresTarefas",
        "minhasPermissoes"
      ]
    }
  ],
  "organisms": {
    "pendenciasAgora": {
      "kind": "inbox",
      "text": "O que depende de mim agora: tarefas para iniciar e executar, tarefas que criei aguardando minha revisão e tarefas devolvidas para eu retomar, com título, prazo, prioridade, lista, progresso da checklist e o motivo da devolução quando houver. Daqui inicio, envio para revisão, aceito, devolvo com motivo ou retomo; para marcar checklist ou cancelar, abro a tarefa em Minhas tarefas.",
      "intents": [
        {
          "id": "iniciarTarefa",
          "kind": "submit"
        },
        {
          "id": "enviarRevisao",
          "kind": "submit"
        },
        {
          "id": "aceitarTarefa",
          "kind": "submit"
        },
        {
          "id": "devolverTarefa",
          "kind": "submit"
        },
        {
          "id": "retomarTarefa",
          "kind": "submit"
        },
        {
          "id": "abrirTarefa",
          "kind": "navigate",
          "to": "minhas_tarefas"
        }
      ]
    },
    "alertasPrazo": {
      "kind": "alerts",
      "text": "Resumo das 8h: minhas tarefas abertas que vencem hoje ou estão atrasadas, com título e prazo, para abrir direto e ver o que falta.",
      "intents": [
        {
          "id": "abrirTarefaVencendo",
          "kind": "navigate",
          "to": "minhas_tarefas"
        }
      ]
    },
    "indicadoresTarefas": {
      "kind": "highlights",
      "text": "Quantas tarefas abertas eu tenho, quantas vencem hoje, quantas estão atrasadas e quantas foram devolvidas aguardando retomada.",
      "intents": [
        {
          "id": "verMinhasTarefas",
          "kind": "navigate",
          "to": "minhas_tarefas"
        }
      ]
    },
    "minhasPermissoes": {
      "kind": "summary",
      "text": "Se eu aceito tarefas e se posso criar tarefas (efetivo), como definido pelo gestor ou sim quando ainda não configurado.",
      "intents": []
    }
  },
  "molecules": {
    "pendenciasAgora": [
      {
        "role": "lista de pendências",
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewdata--ml-card-grid"
      },
      {
        "role": "alternar entre executar, revisar e retomar",
        "preferred": "groupnavigatesection--ml-navigate-pills",
        "alternative": "groupnavigatesection--ml-tabs"
      },
      {
        "role": "ações da tarefa",
        "preferred": "grouptriggeraction--ml-button-group",
        "alternative": "grouptriggeraction--ml-split-button"
      }
    ],
    "alertasPrazo": [
      {
        "role": "aviso do resumo diário",
        "preferred": "groupnotifyuser--ml-notify-banner"
      },
      {
        "role": "tarefas vencendo ou atrasadas",
        "preferred": "groupviewdata--ml-vertical-record-list",
        "alternative": "groupviewdata--ml-card-grid"
      }
    ],
    "indicadoresTarefas": [
      {
        "role": "contador de tarefas",
        "preferred": "groupviewmetric--ml-metric-card",
        "alternative": "groupviewmetric--ml-metric-big-number"
      }
    ]
  }
} as const;
