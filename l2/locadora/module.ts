/// <mls fileReference="_102035_/l2/locadora/module.ts" enhancement="_blank" />
import type { AuraModuleFrontendDefinition, IPaths, IGenomeConfig } from '/_102029_/l2/contracts/bootstrap.js';

export const moduleGenome: Record<string, IGenomeConfig> = {
  'web/desktop/page11': {
    designSystem: 'default',
    device: 'desktop',
    layout: 'standard',
  }
} as const;
  
export const skills: IPaths = {
  web: {
    sharedPath: '/_102035_/l2/locadora/web/shared',
    sharedSkill: '/_102020_/l2/agents/newModule/skills/genPageShared.ts'
  }
}

export const moduleStates = {
} as const;

export const moduleShellPreferences = {
  layout: {
    asideMode: {
      desktop: 'inline',
      mobile: 'fullscreen',
    },
  },
} as const;

export const moduleFrontendDefinition: AuraModuleFrontendDefinition = {
  pageTitle: 'locadora',
  device: 'desktop',
  navigation: [
    {
      id: 'clientesCadastro',
      label: 'clientesCadastro',
      href: '/locadora/clientesCadastro',
      description: 'clientesCadastro',
    },
    {
      id: 'clientesLista',
      label: 'clientesLista',
      href: '/locadora/clientesLista',
      description: 'clientesLista',
    },
    {
      id: 'veiculosCadastro',
      label: 'veiculosCadastro',
      href: '/locadora/veiculosCadastro',
      description: 'veiculosCadastro',
    },
    {
      id: 'veiculosLista',
      label: 'veiculosLista',
      href: '/locadora/veiculosLista',
      description: 'veiculosLista',
    },
    {
      id: 'locacoesCadastro',
      label: 'locacoesCadastro',
      href: '/locadora/locacoesCadastro',
      description: 'locacoesCadastro',
    },
    {
      id: 'locacoesLista',
      label: 'locacoesLista',
      href: '/locadora/locacoesLista',
      description: 'locacoesLista',
    },
  ],
  routes: [
    {
      path: '/locadora/clientesCadastro',
      aliases: [],
      entrypoint: '/_102035_/l2/locadora/web/desktop/page11/clientesCadastro.js',
      tag: 'locadora--web--desktop--page11--clientes-cadastro-102035',
      title: 'clientesCadastro',
    },
    {
      path: '/locadora/clientesLista',
      aliases: [],
      entrypoint: '/_102035_/l2/locadora/web/desktop/page11/clientesLista.js',
      tag: 'locadora--web--desktop--page11--clientes-lista-102035',
      title: 'clientesLista',
    },
    {
      path: '/locadora/veiculosCadastro',
      aliases: [],
      entrypoint: '/_102035_/l2/locadora/web/desktop/page11/veiculosCadastro.js',
      tag: 'locadora--web--desktop--page11--veiculos-cadastro-102035',
      title: 'veiculosCadastro',
    },
    {
      path: '/locadora/veiculosLista',
      aliases: [],
      entrypoint: '/_102035_/l2/locadora/web/desktop/page11/veiculosLista.js',
      tag: 'locadora--web--desktop--page11--veiculos-lista-102035',
      title: 'veiculosLista',
    },
    {
      path: '/locadora/locacoesCadastro',
      aliases: [],
      entrypoint: '/_102035_/l2/locadora/web/desktop/page11/locacoesCadastro.js',
      tag: 'locadora--web--desktop--page11--locacoes-cadastro-102035',
      title: 'locacoesCadastro',
    },
    {
      path: '/locadora/locacoesLista',
      aliases: [],
      entrypoint: '/_102035_/l2/locadora/web/desktop/page11/locacoesLista.js',
      tag: 'locadora--web--desktop--page11--locacoes-lista-102035',
      title: 'locacoesLista',
    },
  ],
};
