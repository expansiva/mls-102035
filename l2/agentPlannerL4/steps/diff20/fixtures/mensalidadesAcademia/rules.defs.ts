/// <mls fileReference="_102047_/l4/mensalidadesAcademia/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2 } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "mensalidadesAcademia",
  "rules": {
    "cancelamentoSomenteMatriculaAtiva": "Uma matrícula somente pode ser cancelada enquanto estiver ativa.",
    "cancelamentoInterrompeGeracao": "O cancelamento da matrícula interrompe a geração de mensalidades futuras para ela.",
    "ruleForeignNamespaceRefused": "Dados de namespace de outro módulo não podem ser gravados no namespace de mensalidades da academia.",
    "ruleDocumentShapeValidated": "O documento cadastral do aluno deve respeitar a estrutura de dados exigida para esse documento.",
    "ruleIdentityNeverInNamespace": "A identidade mestre do aluno não pode ser armazenada no namespace do módulo de mensalidades da academia.",
    "rulePersonPrivacyConsentRequiredBrEu": "O aluno residente no Brasil ou na União Europeia deve possuir o consentimento de privacidade exigido.",
    "matriculaAtivaUnicaPorAluno": "Um aluno pode possuir somente uma matrícula ativa por vez.",
    "mensalidadeUnicaPorMatriculaEcompetencia": "Uma matrícula pode possuir somente uma mensalidade para cada mês de competência.",
    "mensalidadeGeradaParaMatriculaAtiva": "A mensalidade mensal somente pode ser gerada para matrícula ativa, com o valor do plano e vencimento no dia de vencimento do plano correspondente à competência.",
    "situacaoMensalidadeDerivada": "A mensalidade é paga quando o total de pagamentos alcança o valor da cobrança, vencida quando possui saldo devedor após o vencimento e em aberto nos demais casos.",
    "paymentAmountPositive": "O valor de cada pagamento deve ser positivo.",
    "paymentUpdatesMonthlyFee": "Todo pagamento registrado deve compor o total pago e atualizar o saldo devedor da mensalidade correspondente.",
    "paymentRegularizesStudentWhenApplicable": "O registro de pagamento deve regularizar a situação do aluno quando ele deixar de atender ao critério de bloqueio por mensalidades vencidas.",
    "alunoBloqueadoPorDuasMensalidadesVencidas": "O aluno com duas ou mais mensalidades vencidas fica bloqueado e não pode entrar na academia até deixar de possuir duas mensalidades vencidas.",
    "saldoDevedorMensalidadeCalculado": "O saldo devedor da mensalidade corresponde ao valor da cobrança menos o total pago, nunca sendo inferior a zero.",
    "totalAreceberMensalCalculado": "O total a receber do mês corresponde à soma dos valores das mensalidades geradas para o mês.",
    "totalRecebidoMensalCalculado": "O total recebido do mês corresponde à soma dos pagamentos registrados para mensalidades geradas no mês.",
    "quantidadeAlunosAtivosCalculada": "A quantidade de alunos ativos do período corresponde ao número de alunos com matrícula ativa no período.",
    "quantidadeAlunosBloqueadosCalculada": "A quantidade de alunos bloqueados do período corresponde ao número de alunos com duas ou mais mensalidades vencidas no período.",
    "quantidadeAlunosInadimplentesCalculada": "A quantidade de alunos inadimplentes do período corresponde ao número de alunos com ao menos uma mensalidade vencida no período."
  }
} as const satisfies Ns5RulesArtifactV2;

export type MensalidadesAcademiaRulesType = typeof mensalidadesAcademiaRules;

export default mensalidadesAcademiaRules;
