/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Mensalidade.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityMensalidade = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Mensalidade",
  "title": "Mensalidade",
  "description": "Cobrança gerada para a competência de uma matrícula ativa, com valor e vencimento definidos pelo plano.",
  "displayField": "competence",
  "relationships": {
    "matricula": {
      "relationshipId": "matriculaMensalidades",
      "to": "Matricula",
      "via": "Mensalidade.matriculaId",
      "cardinality": "N:1",
      "title": "Matrícula que gerou a mensalidade",
      "description": "Cada mensalidade pertence à matrícula para a qual a cobrança foi gerada.",
      "mode": "fk",
      "direction": "to",
      "required": "Sempre.",
      "role": "origem da cobrança"
    },
    "pagamentos": {
      "relationshipId": "mensalidadePagamentos",
      "to": "Pagamento",
      "via": "Pagamento.mensalidadeId",
      "cardinality": "1:N",
      "title": "Pagamentos da mensalidade",
      "description": "A mensalidade pode receber pagamentos parciais ou integrais registrados pela recepção.",
      "mode": "fk",
      "required": "Quando houver pagamentos registrados.",
      "role": "mensalidade cobrada"
    }
  },
  "capabilities": {
    "read.byId": "Lê uma mensalidade pelo identificador da cobrança · consulta a linha pelo id no repositório · recepção e gerência ao abrir uma mensalidade já selecionada.",
    "locate.byColumn": "Localiza mensalidades por matrícula, competência ou vencimento · filtra e pagina pelas colunas indexadas · recepção e gerência nas consultas de cobranças.",
    "count": "Conta mensalidades conforme os filtros de competência e vencimento · executa a contagem sobre as colunas indexadas · gerência na composição dos indicadores mensais.",
    "listByForeignKey": "Lista as mensalidades de uma matrícula · consulta pelo campo matriculaId · recepção e gerência no histórico de cobranças do aluno.",
    "create": "Cria uma cobrança mensal para uma matrícula elegível · insere a mensalidade com competência, vencimento e valor devido · gerência na geração mensal.",
    "uniqueKey": "Impede duas mensalidades da mesma matrícula na mesma competência · aplica índice único em matriculaId e competência · motor da plataforma durante a geração mensal.",
    "transaction": "Grava em conjunto as mensalidades geradas para a competência · executa a geração em transação · gerência ao gerar as cobranças do mês.",
    "mensalidadesAcademia.gerarMensalidadesDoMes": "Gera uma mensalidade por matrícula ativa na competência selecionada · usa o valor e o dia de vencimento do plano vigente e respeita a chave única · gerência na rotina mensal de cobrança."
  },
  "rules": [
    "mensalidadeUnicaPorMatriculaCompetencia",
    "mensalidadeGeradaParaMatriculaAtiva",
    "valorEVencimentoDoPlano",
    "situacaoMensalidadeCalculada"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "mensalidadesAcademia_mensalidade",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "matriculaId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Matricula"
        ],
        "title": "Matrícula",
        "description": "Matrícula ativa que originou esta cobrança.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "competence": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Competência",
        "description": "Mês de referência da cobrança, representado pela data inicial da competência.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "dueDate": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Vencimento",
        "description": "Data de vencimento da mensalidade, calculada a partir do dia de vencimento do plano.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Dados da mensalidade",
        "description": "Dados financeiros da cobrança e valores calculados a partir dos pagamentos registrados.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "amountDue": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Valor devido",
            "description": "Valor da mensalidade na geração da cobrança, conforme o plano vigente da matrícula.",
            "maxLength": 0,
            "min": 0.01,
            "max": 0
          },
          "totalPaid": {
            "type": "money",
            "derived": true,
            "title": "Total pago",
            "description": "Soma dos valores de todos os pagamentos registrados para esta mensalidade."
          },
          "outstandingBalance": {
            "type": "money",
            "derived": true,
            "title": "Saldo em aberto",
            "description": "Valor devido desta mensalidade menos a soma dos pagamentos registrados para ela, nunca inferior a zero."
          },
          "situation": {
            "type": "string",
            "derived": true,
            "title": "Situação calculada",
            "description": "Quitada quando a soma dos pagamentos alcança o valor devido; vencida quando ainda há saldo em aberto e o vencimento é anterior à data atual; em aberto nos demais casos."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "matriculaId",
      "competence"
    ]
  ]
} as const satisfies Ns5OntologyEntityV3;

export type MensalidadesAcademiaEntityMensalidadeType = typeof mensalidadesAcademiaEntityMensalidade;

export default mensalidadesAcademiaEntityMensalidade;
