/// <mls fileReference="_102035_/l1/pizzaria/layer_2_controllers/router.ts" enhancement="_blank" />
import type { BffHandler } from '_102034_/l1/server/layer_2_controllers/contracts.js';


import {
  displayCozinhaGetResumoProducaoCozinhaHandler,
  displayCozinhaListarPedidosCozinhaHandler,
  displayCozinhaGetPedidoCozinhaDetalheHandler,
} from '/_102035_/l1/pizzaria/layer_2_controllers/displayCozinha.js';

import {
  confirmacaoImpressaoComandaGetPedidoResumoImpressaoHandler,
} from '/_102035_/l1/pizzaria/layer_2_controllers/confirmacaoImpressaoComanda.js';

import {
  metasTempoConfiguracaoGetMetasTempoEtapasHandler,
  metasTempoConfiguracaoListDesviosTempoHandler,
} from '/_102035_/l1/pizzaria/layer_2_controllers/metasTempoConfiguracao.js';
export function createPizzariaRouter(): Map<string, BffHandler> {
  return new Map<string, BffHandler>([
    ['pizzaria.getResumoProducaoCozinha', displayCozinhaGetResumoProducaoCozinhaHandler],
    ['pizzaria.listarPedidosCozinha', displayCozinhaListarPedidosCozinhaHandler],
    ['pizzaria.getPedidoCozinhaDetalhe', displayCozinhaGetPedidoCozinhaDetalheHandler],
    ['pizzaria.getPedidoResumoImpressao', confirmacaoImpressaoComandaGetPedidoResumoImpressaoHandler],
    ['pizzaria.getMetasTempoEtapas', metasTempoConfiguracaoGetMetasTempoEtapasHandler],
    ['pizzaria.listDesviosTempo', metasTempoConfiguracaoListDesviosTempoHandler],
  ]);
}
