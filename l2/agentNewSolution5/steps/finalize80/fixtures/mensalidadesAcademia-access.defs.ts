/// <mls fileReference="_102047_/l4/mensalidadesAcademia/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaAccess = {
  "schemaVersion": "2026-09-10-ns5-access-v2",
  "moduleName": "mensalidadesAcademia",
  "actors": [
    {
      "actorId": "recepcao",
      "kind": "internal",
      "origin": "named",
      "title": "Recepção",
      "description": "Profissional da recepção que realiza matrículas e registra pagamentos."
    },
    {
      "actorId": "gerencia",
      "kind": "internal",
      "origin": "named",
      "title": "Gerência",
      "description": "Profissional da gerência que gera mensalidades e acompanha os indicadores da academia."
    },
    {
      "actorId": "aluno",
      "kind": "external",
      "origin": "inferred",
      "title": "Aluno",
      "description": "Pessoa matriculada que pode cancelar sua matrícula."
    }
  ],
  "authorities": [
    {
      "authorityId": "gerenciarMatriculasPagamentos",
      "title": "Gerenciar matrículas e pagamentos",
      "description": "Permite localizar alunos e planos, registrar matrículas e registrar pagamentos de mensalidades."
    },
    {
      "authorityId": "administrarPlanos",
      "title": "Administrar planos",
      "description": "Permite cadastrar, consultar, alterar e desativar as modalidades de plano da academia."
    },
    {
      "authorityId": "gerarMensalidades",
      "title": "Gerar mensalidades",
      "description": "Permite consultar matrículas ativas e planos para gerar as mensalidades do período."
    },
    {
      "authorityId": "consultarIndicadoresFinanceiros",
      "title": "Consultar indicadores financeiros",
      "description": "Permite consultar os totais e as quantidades consolidadas que compõem o painel financeiro da academia."
    },
    {
      "authorityId": "cancelarPropriaMatricula",
      "title": "Cancelar própria matrícula",
      "description": "Permite consultar e cancelar a própria matrícula ativa."
    }
  ],
  "grants": [
    {
      "grantId": "recepcaoGerenciaMatriculasPagamentos",
      "actorRef": "recepcao",
      "authorityRef": "gerenciarMatriculasPagamentos",
      "entityRefs": [
        "Aluno",
        "Plano",
        "Matricula",
        "Mensalidade",
        "Pagamento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os alunos, planos, matrículas, mensalidades e pagamentos de toda a academia necessários ao atendimento da recepção."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "A recepção consulta todos os dados dos registros necessários para matricular alunos e registrar pagamentos."
      }
    },
    {
      "grantId": "gerenciaAdministraPlanos",
      "actorRef": "gerencia",
      "authorityRef": "administrarPlanos",
      "entityRefs": [
        "Plano"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange todos os planos comerciais cadastrados pela academia."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "A gerência pode consultar todos os dados dos planos para administrá-los."
      }
    },
    {
      "grantId": "gerenciaGeraMensalidades",
      "actorRef": "gerencia",
      "authorityRef": "gerarMensalidades",
      "entityRefs": [
        "Plano",
        "Matricula",
        "Mensalidade"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange todos os planos, matrículas e mensalidades necessários para a geração mensal de cobranças."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "A gerência consulta todos os dados dos planos, matrículas e mensalidades necessários para gerar as cobranças."
      }
    },
    {
      "grantId": "gerenciaConsultaIndicadores",
      "actorRef": "gerencia",
      "authorityRef": "consultarIndicadoresFinanceiros",
      "entityRefs": [
        "Aluno",
        "Matricula",
        "Mensalidade",
        "Pagamento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os registros da academia utilizados no cálculo dos indicadores financeiros e de situação dos alunos."
      },
      "disclosure": {
        "mode": "aggregateOnly",
        "description": "A gerência visualiza somente os totais e as quantidades consolidadas do painel financeiro."
      }
    },
    {
      "grantId": "alunoCancelaPropriaMatricula",
      "actorRef": "aluno",
      "authorityRef": "cancelarPropriaMatricula",
      "entityRefs": [
        "Matricula"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange exclusivamente as matrículas vinculadas ao próprio aluno autenticado.",
        "anchorEntity": "Aluno"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O aluno pode consultar todos os dados de suas próprias matrículas para confirmar o cancelamento."
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type MensalidadesAcademiaAccessType = typeof mensalidadesAcademiaAccess;

export default mensalidadesAcademiaAccess;
