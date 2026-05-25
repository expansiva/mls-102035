/// <mls fileReference="_102035_/l1/pizzaria/layer_2_controllers/router.ts" enhancement="_blank" />
import type { BffHandler } from '/_102034_/l1/server/layer_2_controllers/contracts.js';


import {
  areaPublicaAcompanhamentoGetPedidoResumoPublicoHandler,
  areaPublicaAcompanhamentoListPedidoEtapasPublicoHandler,
  areaPublicaAcompanhamentoListItensPedidoPublicoHandler,
  areaPublicaAcompanhamentoGetEntregaPublicaHandler,
  areaPublicaAcompanhamentoGetConfiguracaoWhatsAppPublicaHandler,
} from '/_102035_/l1/pizzaria/layer_2_controllers/areaPublicaAcompanhamento.js';
export function createPizzariaRouter(): Map<string, BffHandler> {
  return new Map<string, BffHandler>([
    ['pizzaria.getPedidoResumoPublico', areaPublicaAcompanhamentoGetPedidoResumoPublicoHandler],
    ['pizzaria.listPedidoEtapasPublico', areaPublicaAcompanhamentoListPedidoEtapasPublicoHandler],
    ['pizzaria.listItensPedidoPublico', areaPublicaAcompanhamentoListItensPedidoPublicoHandler],
    ['pizzaria.getEntregaPublica', areaPublicaAcompanhamentoGetEntregaPublicaHandler],
    ['pizzaria.getConfiguracaoWhatsAppPublica', areaPublicaAcompanhamentoGetConfiguracaoWhatsAppPublicaHandler],
  ]);
}
