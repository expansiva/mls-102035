/// <mls fileReference="_102035_/l1/locadora/layer_2_controllers/router.ts" enhancement="_blank" />
import type { BffHandler } from '/_102034_/l1/server/layer_2_controllers/contracts.js';


import {
  veiculosCadastroGetStatusVeiculoOptionsHandler,
  veiculosCadastroSaveHandler
} from '/_102035_/l1/locadora/layer_2_controllers/veiculosCadastro.js'; 
import {
  veiculosListaListVeiculosHandler,
} from '/_102035_/l1/locadora/layer_2_controllers/veiculosLista.js';
import {
  clientesListaListarClientesHandler,
} from '/_102035_/l1/locadora/layer_2_controllers/clientesLista.js';
import {
  clientesCadastroSaveHandler,
  clientesCadastroCancelHandler,
  clientesCadastroValidateHandler,
} from '/_102035_/l1/locadora/layer_2_controllers/clientesCadastro.js';

import {
  locacoesListaListLocacoesHandler
} from '/_102035_/l1/locadora/layer_2_controllers/locacoesLista.js';


import {
  locacoesCadastroCreateLocacaoHandler,
  locacoesCadastroValidateClienteHandler,
  locacoesCadastroCheckVeiculoAvailabilityHandler,
} from '/_102035_/l1/locadora/layer_2_controllers/locacoesCadastro.js';
export function createPizzariaRouter(): Map<string, BffHandler> {
  return new Map<string, BffHandler>([
    ['locadora.veiculosCadastro.getStatusVeiculoOptions', veiculosCadastroGetStatusVeiculoOptionsHandler],
    ['locadora.veiculosCadastro.saveVeiculo', veiculosCadastroSaveHandler],
    ['locadora.veiculosLista.listVeiculos', veiculosListaListVeiculosHandler],
    ['locadora.clientesLista.listarClientes', clientesListaListarClientesHandler],
    ['locadora.clientesCadastro.save', clientesCadastroSaveHandler],
    ['locadora.clientesCadastro.cancel', clientesCadastroCancelHandler],
    ['locadora.clientesCadastro.validate', clientesCadastroValidateHandler],
    ['locadora.locacoesLista.listLocacoes', locacoesListaListLocacoesHandler],
    ['locadora.locacoesCadastro.createLocacao', locacoesCadastroCreateLocacaoHandler],
    ['locadora.locacoesCadastro.validateCliente', locacoesCadastroValidateClienteHandler],
    ['locadora.locacoesCadastro.checkVeiculoAvailability', locacoesCadastroCheckVeiculoAvailabilityHandler],
    
    
  ]);
}
