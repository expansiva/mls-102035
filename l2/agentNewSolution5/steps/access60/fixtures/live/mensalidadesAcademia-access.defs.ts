/// <mls fileReference="_102047_/l4/mensalidadesAcademia/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "mensalidadesAcademia",
  "actors": [
    {
      "actorId": "recepcao",
      "kind": "internal",
      "origin": "named",
      "title": "Recepção",
      "description": "Matricula alunos em planos e registra pagamentos de mensalidades."
    },
    {
      "actorId": "gerencia",
      "kind": "internal",
      "origin": "named",
      "title": "Gerência",
      "description": "Gera mensalidades mensais e acompanha os indicadores financeiros e de alunos."
    },
    {
      "actorId": "aluno",
      "kind": "external",
      "origin": "inferred",
      "title": "Aluno",
      "description": "Pode cancelar sua matrícula, encerrando futuras gerações de mensalidades."
    }
  ],
  "grants": [
    {
      "grantId": "recepcaoGerirMatriculas",
      "actorRef": "recepcao",
      "title": "Gerenciar matrículas",
      "description": "Cadastrar alunos, consultar planos disponíveis e iniciar matrículas.",
      "entityRefs": [
        "Plano",
        "Aluno",
        "Matricula"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Planos, alunos e matrículas da academia.",
        "anchorEntity": "Aluno"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Dados necessários para selecionar planos, cadastrar alunos e iniciar matrículas.",
        "allowedFields": [
          "Plano.id",
          "Plano.periodicity",
          "Plano.amount",
          "Plano.dueDay",
          "Aluno.id",
          "Matricula.id",
          "Matricula.startDate",
          "Matricula.aluno",
          "Matricula.plano",
          "Matricula.status"
        ]
      }
    },
    {
      "grantId": "recepcaoRegistrarPagamentos",
      "actorRef": "recepcao",
      "title": "Registrar pagamentos",
      "description": "Consultar mensalidades e registrar os pagamentos recebidos.",
      "entityRefs": [
        "Mensalidade",
        "Pagamento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Mensalidades e pagamentos registrados pela academia.",
        "anchorEntity": "Aluno"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Dados necessários para localizar mensalidades, conferir valores e registrar pagamentos.",
        "allowedFields": [
          "Mensalidade.id",
          "Mensalidade.referenceMonth",
          "Mensalidade.matricula",
          "Mensalidade.amount",
          "Mensalidade.dueDate",
          "Mensalidade.details.totalPaid",
          "Mensalidade.details.outstandingAmount",
          "Mensalidade.details.paymentSituation",
          "Pagamento.id",
          "Pagamento.mensalidade",
          "Pagamento.paymentDate",
          "Pagamento.amount",
          "Pagamento.paymentMethod"
        ]
      }
    },
    {
      "grantId": "gerenciaGerirPlanos",
      "actorRef": "gerencia",
      "title": "Gerenciar planos",
      "description": "Cadastrar e atualizar os planos oferecidos pela academia.",
      "entityRefs": [
        "Plano"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os planos configurados pela academia.",
        "anchorEntity": "Aluno"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Dados completos dos planos para cadastro e atualização.",
        "allowedFields": [
          "Plano.id",
          "Plano.periodicity",
          "Plano.amount",
          "Plano.dueDay"
        ]
      }
    },
    {
      "grantId": "gerenciaGerarEacompanharMensalidades",
      "actorRef": "gerencia",
      "title": "Gerar e acompanhar mensalidades",
      "description": "Gerar mensalidades do mês e consultar os indicadores mensais financeiros e de alunos.",
      "entityRefs": [
        "Plano",
        "Matricula",
        "Mensalidade",
        "PainelMensalidades"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Matrículas, planos, mensalidades e consolidações mensais de toda a academia.",
        "anchorEntity": "Aluno"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Dados necessários para gerar cobranças mensais e acompanhar os indicadores consolidados.",
        "allowedFields": [
          "Plano.id",
          "Plano.periodicity",
          "Plano.amount",
          "Plano.dueDay",
          "Matricula.id",
          "Matricula.startDate",
          "Matricula.aluno",
          "Matricula.plano",
          "Matricula.status",
          "Mensalidade.id",
          "Mensalidade.referenceMonth",
          "Mensalidade.matricula",
          "Mensalidade.amount",
          "Mensalidade.dueDate",
          "Mensalidade.details.totalPaid",
          "Mensalidade.details.outstandingAmount",
          "Mensalidade.details.paymentSituation",
          "PainelMensalidades.id",
          "PainelMensalidades.referenceMonth",
          "PainelMensalidades.mensalidades",
          "PainelMensalidades.details.totalAreceber",
          "PainelMensalidades.details.totalRecebido",
          "PainelMensalidades.details.quantidadeAlunosAtivos",
          "PainelMensalidades.details.quantidadeAlunosBloqueados",
          "PainelMensalidades.details.quantidadeAlunosInadimplentes"
        ]
      }
    },
    {
      "grantId": "alunoCancelarPropriaMatricula",
      "actorRef": "aluno",
      "title": "Cancelar própria matrícula",
      "description": "Consultar e cancelar a matrícula ativa do próprio aluno.",
      "entityRefs": [
        "Matricula"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente a matrícula vinculada ao próprio aluno.",
        "anchorEntity": "Aluno"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Dados necessários para verificar e cancelar a própria matrícula.",
        "allowedFields": [
          "Matricula.id",
          "Matricula.startDate",
          "Matricula.plano",
          "Matricula.status"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type MensalidadesAcademiaAccessType = typeof mensalidadesAcademiaAccess;

export default mensalidadesAcademiaAccess;
