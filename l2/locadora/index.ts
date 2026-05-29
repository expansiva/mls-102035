/// <mls fileReference="_102035_/l2/locadora/index.ts" enhancement="_blank" />
import { bootstrapCollabApp } from '/_102033_/l2/core/bootstrap.js';

void bootstrapCollabApp({
  projectId: '102035',
  appId: 'locadora',
  title: 'Collab Test · locadora',
  shellMode: 'spa',
  navigation: [
    { label: 'Monitor', href: '/monitor' },
    { label:'clientesCadastro', href: '/locadora/clientesCadastro' },
    { label:'clientesLista', href: '/locadora/clientesLista' },
    { label:'veiculosCadastro', href: '/locadora/veiculosCadastro' },
    { label:'veiculosLista', href: '/locadora/veiculosLista' },
    { label:'locacoesLista', href: '/locadora/locacoesLista' },
    { label:'locacoesCadastro', href: '/locadora/locacoesCadastro' },
  ],
  pages: [
    {
      path: '/locadora/clientesCadastro',
      title: 'clientesCadastro',
      tagName: 'locadora--web--desktop--page11--clientes-cadastro-102035',
      loader: () => import('/_102035_/l2/locadora/web/desktop/page11/clientesCadastro.js'),
    },
    {
      path: '/locadora/clientesLista',
      title: 'clientesLista',
      tagName: 'locadora--web--desktop--page11--clientes-lista-102035',
      loader: () => import('/_102035_/l2/locadora/web/desktop/page11/clientesLista.js'),
    },
    {
      path: '/locadora/veiculosCadastro',
      title: 'veiculosCadastro',
      tagName: 'locadora--web--desktop--page11--veiculos-cadastro-102035',
      loader: () => import('/_102035_/l2/locadora/web/desktop/page11/veiculosCadastro.js'),
    },
    {
      path: '/locadora/veiculosLista',
      title: 'veiculosLista',
      tagName: 'locadora--web--desktop--page11--veiculos-lista-102035',
      loader: () => import('/_102035_/l2/locadora/web/desktop/page11/veiculosLista.js'),
    },
    {
      path: '/locadora/locacoesLista',
      title: 'locacoesLista',
      tagName: 'locadora--web--desktop--page11--locacoes-lista-102035',
      loader: () => import('/_102035_/l2/locadora/web/desktop/page11/locacoesLista.js'),
    },
    {
      path: '/locadora/locacoesCadastro',
      title: 'locacoesCadastro',
      tagName: 'locadora--web--desktop--page11--locacoes-cadastro-102035',
      loader: () => import('/_102035_/l2/locadora/web/desktop/page11/locacoesCadastro.js'),
    },
    
  ],
});
