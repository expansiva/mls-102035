/// <mls fileReference="_102035_/l2/pizzaria/module.ts" enhancement="_blank" />
import type { AuraModuleFrontendDefinition, IGenomeConfig, IPaths } from '/_102029_/l2/contracts/bootstrap.js';

export const moduleGenome: Record<string, IGenomeConfig> = {
  'web/desktop/page11': {
    designSystem: 'default',
    device: 'desktop',
    layout: 'standard',
  }
} as const;
  
export const skills: IPaths = {
  web: {
    sharedPath: '/_102020_/l2/pizzaria/web/shared',
    sharedSkill: '/_102020_/l2/agents/newModule/skills/genPageShared.ts'
  }
}


export const moduleShellPreferences = {
  layout: {
    asideMode: {
      desktop: 'inline',
      mobile: 'fullscreen',
    },
  },
} as const;

export const moduleFrontendDefinition: AuraModuleFrontendDefinition = {
  pageTitle: 'pizzaria',
  device: 'desktop',
  navigation: [
    {
      id: 'areaPublicaAcompanhamento',
      label: 'areaPublicaAcompanhamento',
      href: '/pizzaria/areaPublicaAcompanhamento',
      description: 'areaPublicaAcompanhamento',
    },
    {
      id: 'areaPublicaCardapio',
      label: 'areaPublicaCardapio',
      href: '/pizzaria/areaPublicaCardapio',
      description: 'areaPublicaCardapio',
    },
    {
      id: 'areaPublicaCheckout',
      label: 'areaPublicaCheckout',
      href: '/pizzaria/areaPublicaCheckout',
      description: 'areaPublicaCheckout',
    },
    {
      id: 'caixaPagamentos',
      label: 'caixaPagamentos',
      href: '/pizzaria/caixaPagamentos',
      description: 'caixaPagamentos',
    },
  ],
  routes: [
    {
      path: '/pizzaria/areaPublicaAcompanhamento',
      aliases: [],
      entrypoint: '/_102035_/l2/pizzaria/web/desktop/page11/areaPublicaAcompanhamento.js',
      tag: 'pizzaria--web--desktop--page11--area-publica-acompanhamento-102035',
      title: 'areaPublicaAcompanhamento',
    },
    {
      path: '/pizzaria/areaPublicaCardapio',
      aliases: [],
      entrypoint: '/_102035_/l2/pizzaria/web/desktop/page11/areaPublicaCardapio.js',
      tag: 'pizzaria--web--desktop--page11--area-publica-cardapio-102035',
      title: 'areaPublicaCardapio',
    },
    {
      path: '/pizzaria/areaPublicaCheckout',
      aliases: [],
      entrypoint: '/_102035_/l2/pizzaria/web/desktop/page11/areaPublicaCheckout.js',
      tag: 'pizzaria--web--desktop--page11--area-publica-checkout-102035',
      title: 'areaPublicaCheckout',
    },
    {
      path: '/pizzaria/caixaPagamentos',
      aliases: [],
      entrypoint: '/_102035_/l2/pizzaria/web/desktop/page11/caixaPagamentos.js',
      tag: 'pizzaria--web--desktop--page11--caixa-pagamentos-102035',
      title: 'caixaPagamentos',
    },
  ],
};
