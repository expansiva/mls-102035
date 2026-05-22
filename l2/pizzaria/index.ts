/// <mls fileReference="_102035_/l2/pizzaria/index.ts" enhancement="_blank" />
import { bootstrapCollabApp } from '/_102033_/l2/core/bootstrap.js';

void bootstrapCollabApp({
  projectId: '102035',
  appId: 'pizzaria',
  title: 'Collab Test · pizzaria',
  shellMode: 'spa',
  navigation: [
    { label: 'Monitor', href: '/monitor' },
    { label: 'displayCozinha', href: '/pizzaria/displayCozinha' },
    { label: 'confirmacaoImpressaoComanda', href: '/pizzaria/confirmacaoImpressaoComanda' },
    { label: 'metasTempoConfiguracao', href: '/pizzaria/metasTempoConfiguracao' },
  ],
  pages: [
    {
      path: '/pizzaria/displayCozinha',
      title: 'displayCozinha',
      tagName: 'pizzaria--web--desktop--page11--display-cozinha-102035',
      loader: () => import('_102035_/l2/pizzaria/web/desktop/page11/displayCozinha.js'),
    },
    {
      path: '/pizzaria/confirmacaoImpressaoComanda',
      title: 'confirmacaoImpressaoComanda',
      tagName: 'pizzaria--web--desktop--page11--confirmacao-impressao-comanda-102035',
      loader: () => import('_102035_/l2/pizzaria/web/desktop/page11/confirmacaoImpressaoComanda.js'),
    },
    {
      path: '/pizzaria/metasTempoConfiguracao',
      title: 'metasTempoConfiguracao',
      tagName: 'pizzaria--web--desktop--page11--metas-tempo-configuracao-102035',
      loader: () => import('_102035_/l2/pizzaria/web/desktop/page11/metasTempoConfiguracao.js'),
    },
  ],
});
