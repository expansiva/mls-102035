/// <mls fileReference="_102047_/l4/ordenServicio5/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicio5Rules = {
  "schemaVersion": "2026-09-10-ns5-rules-v1",
  "moduleName": "ordenServicio5",
  "rules": [
    {
      "ruleId": "datosObligatoriosRecepcion",
      "description": "Al abrir una orden de servicio deben registrarse los datos del cliente, el aparato, el defecto informado y las fotos."
    },
    {
      "ruleId": "diagnosticoPiezasYpresupuestoObligatorios",
      "description": "Para presupuestar una orden deben registrarse el diagnóstico, las piezas necesarias con su costo interno y el valor del presupuesto para el cliente."
    },
    {
      "ruleId": "rechazoCierraOrdenYhabilitaRetiro",
      "description": "Si el cliente rechaza el presupuesto, la orden se cierra como rechazada y el aparato queda disponible para retiro."
    },
    {
      "ruleId": "aprobacionHabilitaReparacion",
      "description": "Si el cliente aprueba el presupuesto, la orden queda disponible para que el técnico realice la reparación."
    },
    {
      "ruleId": "reparacionRegistradaParaMarcarLista",
      "description": "El técnico debe registrar las tareas efectuadas en la reparación antes de marcar la orden como lista para entrega."
    },
    {
      "ruleId": "entregaDeOrdenListaOrechazada",
      "description": "El recepcionista entrega el aparato y finaliza la orden cuando esta está lista para entrega o cuando quedó rechazada con el aparato disponible para retiro."
    },
    {
      "ruleId": "visibilidadPortalCliente",
      "description": "El cliente ve y responde solamente sus propias órdenes, con estado, diagnóstico y valor del presupuesto, y nunca el costo interno de las piezas ni las anotaciones del técnico."
    }
  ]
} as const satisfies Ns5RulesArtifact;

export type OrdenServicio5RulesType = typeof ordenServicio5Rules;

export default ordenServicio5Rules;
