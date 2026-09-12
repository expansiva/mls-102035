/// <mls fileReference="_102047_/l4/ordenServicio/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioRules = {
  "schemaVersion": "2026-09-10-ns5-rules-v1",
  "moduleName": "ordenServicio",
  "rules": [
    {
      "ruleId": "presupuestoDebeEstarDisponibleParaDecision",
      "description": "El cliente solo puede aprobar o rechazar un presupuesto cuando este está disponible para su respuesta."
    },
    {
      "ruleId": "rechazoCierraOrdenYhabilitaRetiro",
      "description": "El rechazo del presupuesto cierra la orden como rechazada y deja el aparato disponible para retiro."
    },
    {
      "ruleId": "reparacionRequierePresupuestoAprobado",
      "description": "La reparación solo puede realizarse cuando el presupuesto ha sido aprobado por el cliente."
    },
    {
      "ruleId": "ordenListaRequiereReparacionRegistrada",
      "description": "Una orden solo puede marcarse como lista para entrega después de registrar la reparación realizada."
    },
    {
      "ruleId": "entregaRequiereOrdenLista",
      "description": "El aparato solo puede entregarse y la orden finalizarse cuando la orden está marcada como lista para entrega."
    },
    {
      "ruleId": "consultaClienteRestringidaAordenesPropias",
      "description": "El cliente solo puede consultar sus propias órdenes y ver su estado, diagnóstico y valor del presupuesto, sin acceso al costo interno de las piezas ni a las anotaciones técnicas."
    }
  ]
} as const satisfies Ns5RulesArtifact;

export type OrdenServicioRulesType = typeof ordenServicioRules;

export default ordenServicioRules;
