/// <mls fileReference="_102035_/l2/pizzaria/module.ts" enhancement="_blank" />
import type { AuraModuleFrontendDefinition, IGenomeConfig, IPaths } from '/_102029_/l2/contracts/bootstrap.js';

export const moduleGenome: Record<string, IGenomeConfig> = {
  'web/desktop/page11': {
    designSystem: 'default',
    designSystemSkill:  '_102020_/l2/agents/newModule/skills/defaultDs.js',
    device: 'desktop',
    layout: 'standart',
    layoutSkill: '_102020_/l2/agents/newModule/skills/genPageRender.ts',
  }
} as const;
  
export const skills: IPaths = {
  web: {
    sharedPath: 'web/shared',
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
