/// <mls fileReference="_102035_/l1/pizzaria/layer_2_controllers/router.ts" enhancement="_blank" />
import type { BffHandler } from '/_102034_/l1/server/layer_2_controllers/contracts.js';


import {
  areaPublicaAcompanhamentoGetPedidoResumoPublicoHandler,
  areaPublicaAcompanhamentoListPedidoEtapasPublicoHandler,
  areaPublicaAcompanhamentoListItensPedidoPublicoHandler,
  areaPublicaAcompanhamentoGetEntregaPublicaHandler,
  areaPublicaAcompanhamentoGetConfiguracaoWhatsAppPublicaHandler,
} from '/_102035_/l1/pizzaria/layer_2_controllers/areaPublicaAcompanhamento.js';
import {
  areaPublicaCardapioListProdutosPublicosHandler,
  areaPublicaCardapioListCombosAtivosHandler,
  areaPublicaCardapioGetPoliticaCancelamentoAtivaHandler,
  areaPublicaCardapioGetConfiguracaoWhatsAppAtivaHandler,
} from '/_102035_/l1/pizzaria/layer_2_controllers/areaPublicaCardapio.js';
import {
  areaPublicaCheckoutGetResumoCheckoutPublicoHandler,
  areaPublicaCheckoutListarItensPedidoHandler,
  areaPublicaCheckoutListarCombosAtivosHandler,
  areaPublicaCheckoutListarPoliticasCancelamentoAtivasHandler,
} from '/_102035_/l1/pizzaria/layer_2_controllers/areaPublicaCheckout.js';
export function createPizzariaRouter(): Map<string, BffHandler> {
  return new Map<string, BffHandler>([
    ['pizzaria.getPedidoResumoPublico', areaPublicaAcompanhamentoGetPedidoResumoPublicoHandler],
    ['pizzaria.listPedidoEtapasPublico', areaPublicaAcompanhamentoListPedidoEtapasPublicoHandler],
    ['pizzaria.listItensPedidoPublico', areaPublicaAcompanhamentoListItensPedidoPublicoHandler],
    ['pizzaria.getEntregaPublica', areaPublicaAcompanhamentoGetEntregaPublicaHandler],
    ['pizzaria.getConfiguracaoWhatsAppPublica', areaPublicaAcompanhamentoGetConfiguracaoWhatsAppPublicaHandler],
    ['pizzaria.listProdutosPublicos', areaPublicaCardapioListProdutosPublicosHandler],
    ['pizzaria.listCombosAtivos', areaPublicaCardapioListCombosAtivosHandler],
    ['pizzaria.getPoliticaCancelamentoAtiva', areaPublicaCardapioGetPoliticaCancelamentoAtivaHandler],
    ['pizzaria.getConfiguracaoWhatsAppAtiva', areaPublicaCardapioGetConfiguracaoWhatsAppAtivaHandler],
    ['pizzaria.getResumoCheckoutPublico', areaPublicaCheckoutGetResumoCheckoutPublicoHandler],
    ['pizzaria.listarItensPedido', areaPublicaCheckoutListarItensPedidoHandler],
    ['pizzaria.listarCombosAtivos', areaPublicaCheckoutListarCombosAtivosHandler],
    ['pizzaria.listarPoliticasCancelamentoAtivas', areaPublicaCheckoutListarPoliticasCancelamentoAtivasHandler],
  ]);
}
