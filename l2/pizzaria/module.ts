/// <mls fileReference="_102035_/l2/pizzaria/module.ts" enhancement="_blank" />
import type { AuraModuleFrontendDefinition } from '/_102029_/l2/contracts/bootstrap.js';

export const moduleGenome = {
  page11: {
    device: 'desktop',
    layout: 'standard',
  },
  page21: {
    device: 'mobile',
    layout: 'standard',
  },
} as const;

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
  pageTitle: 'pizzaria',
  device: 'desktop',
  navigation: [
    {
      id: 'areaPublicaAcompanhamento',
      label: 'areaPublicaAcompanhamento',
      href: '/pizzaria/areaPublicaAcompanhamento',
      description: 'areaPublicaAcompanhamento',
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
  ],
};
