/// <mls fileReference="_102047_/l4/comandaRestaurante5/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestaurante5Module = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "comandaRestaurante5",
  "title": "Comanda de restaurante",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "crie o módulo comandaRestaurante para um restaurante de bairro: o garçom abre uma comanda numa mesa e vai lançando os itens do cardápio pedidos, podendo cancelar um item lançado por engano; ao final, o caixa confere a comanda, pode aplicar um desconto pontual e fecha a conta recebendo o pagamento, que pode ser dividido entre as pessoas da mesa."
} as const satisfies Ns5ModuleArtifact;

export type ComandaRestaurante5ModuleType = typeof comandaRestaurante5Module;

export default comandaRestaurante5Module;
