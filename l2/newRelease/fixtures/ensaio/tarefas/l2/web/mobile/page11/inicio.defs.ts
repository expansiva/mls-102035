/// <mls fileReference="_102047_/l2/tarefas/web/mobile/page11/inicio.defs.ts" enhancement="_blank"/>

export const definition = {
  "template": {
    "category": "_102020_/l4/collabux/templates/activityNotificationHub/page21.md",
    "experience": "inboxSplit"
  },
  "intent": "No celular, em conteúdo fluido estreito (referência 390px, utilizável de 360px a 430px), mostrar primeiro os prazos de hoje e atrasados e em seguida o que depende de mim agora, com ações diretas em cada tarefa.",
  "sections": [
    {
      "id": "secaoAlertas",
      "priority": "primary",
      "purpose": "Abrir com o resumo das 8h: tarefas abertas que vencem hoje ou estão atrasadas, tocáveis para abrir direto.",
      "organisms": [
        "alertasPrazo"
      ]
    },
    {
      "id": "secaoPendencias",
      "priority": "main",
      "purpose": "Empilhar o que depende de mim agora, alternando entre executar, revisar e retomar, com a ação de cada tarefa ao alcance do polegar.",
      "organisms": [
        "pendenciasAgora"
      ]
    },
    {
      "id": "secaoPanorama",
      "priority": "secondary",
      "purpose": "No fim, os contadores das minhas tarefas e se aceito e posso criar tarefas.",
      "organisms": [
        "indicadoresTarefas",
        "minhasPermissoes"
      ]
    }
  ],
  "organisms": {
    "pendenciasAgora": {
      "kind": "inbox",
      "text": "O que depende de mim agora: tarefas para iniciar e executar, tarefas que criei aguardando revisão e tarefas devolvidas para retomar, em cartões compactos com título, prazo, prioridade e progresso da checklist, e o motivo da devolução quando houver. Inicio, envio para revisão, aceito, devolvo com motivo ou retomo daqui; para checklist ou cancelar, abro em Minhas tarefas.",
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
      "text": "Resumo das 8h: minhas tarefas abertas que vencem hoje ou estão atrasadas, para tocar e abrir direto.",
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
      "text": "Abertas, vencem hoje, atrasadas e devolvidas aguardando retomada, em números curtos.",
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
      "text": "Se eu aceito tarefas e se posso criar tarefas (efetivo).",
      "intents": []
    }
  },
  "molecules": {
    "pendenciasAgora": [
      {
        "role": "lista de pendências",
        "preferred": "groupviewdata--ml-vertical-record-list"
      },
      {
        "role": "alternar entre executar, revisar e retomar",
        "preferred": "groupnavigatesection--ml-navigate-pills",
        "alternative": "groupnavigatesection--ml-tabs"
      },
      {
        "role": "ações da tarefa",
        "preferred": "grouptriggeraction--ml-split-button",
        "alternative": "grouptriggeraction--ml-kebab-action-trigger"
      }
    ],
    "alertasPrazo": [
      {
        "role": "aviso do resumo diário",
        "preferred": "groupnotifyuser--ml-notify-banner"
      },
      {
        "role": "tarefas vencendo ou atrasadas",
        "preferred": "groupviewdata--ml-vertical-record-list"
      }
    ],
    "indicadoresTarefas": [
      {
        "role": "contador de tarefas",
        "preferred": "groupviewmetric--ml-metric-big-number",
        "alternative": "groupviewmetric--ml-metric-card"
      }
    ]
  }
} as const;
