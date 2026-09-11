/// <mls fileReference="_102047_/l4/mensalidadesAcademia/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaAccess = {
  "schemaVersion": "2026-09-10-ns5-access-v1",
  "moduleName": "mensalidadesAcademia",
  "profiles": [
    {
      "profileId": "recepcao",
      "actorRefs": [
        "recepcao"
      ],
      "kind": "internal"
    },
    {
      "profileId": "gerencia",
      "actorRefs": [
        "gerencia"
      ],
      "kind": "internal"
    },
    {
      "profileId": "aluno",
      "actorRefs": [
        "aluno"
      ],
      "kind": "external"
    }
  ],
  "authorities": [
    {
      "authorityId": "gerirMatriculas",
      "title": "Gerenciar matrículas",
      "description": "Cadastrar alunos, consultar planos disponíveis e iniciar matrículas."
    },
    {
      "authorityId": "registrarPagamentos",
      "title": "Registrar pagamentos",
      "description": "Consultar mensalidades e registrar os pagamentos recebidos."
    },
    {
      "authorityId": "gerirPlanos",
      "title": "Gerenciar planos",
      "description": "Cadastrar e atualizar os planos oferecidos pela academia."
    },
    {
      "authorityId": "gerarEcentralizarMensalidades",
      "title": "Gerar e acompanhar mensalidades",
      "description": "Gerar mensalidades do mês e consultar os indicadores mensais financeiros e de alunos."
    },
    {
      "authorityId": "cancelarPropriaMatricula",
      "title": "Cancelar própria matrícula",
      "description": "Consultar e cancelar a matrícula ativa do próprio aluno."
    }
  ],
  "grants": [
    {
      "grantId": "recepcaoGerirMatriculas",
      "profileRef": "recepcao",
      "authorityRef": "gerirMatriculas",
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
      "profileRef": "recepcao",
      "authorityRef": "registrarPagamentos",
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
      "profileRef": "gerencia",
      "authorityRef": "gerirPlanos",
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
      "profileRef": "gerencia",
      "authorityRef": "gerarEcentralizarMensalidades",
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
      "profileRef": "aluno",
      "authorityRef": "cancelarPropriaMatricula",
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
