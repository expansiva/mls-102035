/// <mls fileReference="_102035_/l1/pizzaria/module.ts" enhancement="_blank" />

export interface PizzariaPedido {
  id: string;
  status: 'recebido' | 'em preparo' | 'pronto' | 'saiu para entrega' | 'entregue';
  criadoEm: any;
  atualizadoEm: any;
  itens: any;
  responsavelAtendimento?: string;
  observacoes?: string;
  formaPagamento?: string;
  statusPagamento?: 'pendente' | 'pago' | 'parcial' | 'cancelado';
  observacaoCritica?: string;
}

export interface PizzariaItemPedido {
  id: string;
  pedidoId: string;
  nome: string;
  quantidade: number;
  observacoes?: string;
}

export interface PizzariaProducao {
  id: string;
  pedidoId: string;
  statusProducao: 'em preparo' | 'pronto';
  inicioEm?: any;
  fimEm?: any;
  cozinheiroResponsavelId?: string;
}

export interface PizzariaEntrega {
  id: string;
  pedidoId: string;
  entregadorId?: string;
  statusEntrega: 'saiu para entrega' | 'entregue';
  inicioEm?: any;
  fimEm?: any;
}

export interface PizzariaUsuario {
  id: string;
  nome: string;
  perfil: 'admin' | 'atendente' | 'cozinheiro' | 'entregador';
}

export interface PizzariaUpdatePedidoParams {
  id: string;
  status?: PizzariaPedido['status'];
  criadoEm?: any;
  atualizadoEm?: any;
  itens?: any;
  responsavelAtendimento?: string;
  observacoes?: string;
  formaPagamento?: string;
  statusPagamento?: PizzariaPedido['statusPagamento'];
  observacaoCritica?: string;
  author?: string;
}

export interface PizzariaUpdateItemPedidoParams {
  id: string;
  pedidoId?: string;
  nome?: string;
  quantidade?: number;
  observacoes?: string;
  author?: string;
}

export interface PizzariaUpdateProducaoParams {
  id: string;
  pedidoId?: string;
  statusProducao?: PizzariaProducao['statusProducao'];
  inicioEm?: any;
  fimEm?: any;
  cozinheiroResponsavelId?: string;
  author?: string;
}

export interface PizzariaUpdateEntregaParams {
  id: string;
  pedidoId?: string;
  entregadorId?: string;
  statusEntrega?: PizzariaEntrega['statusEntrega'];
  inicioEm?: any;
  fimEm?: any;
  author?: string;
}

export interface PizzariaUpdateUsuarioParams {
  id: string;
  nome?: string;
  perfil?: PizzariaUsuario['perfil'];
  author?: string;
}

export interface PizzariaSeedResult {
  insertedCount: number;
  totalCount: number;
  seededAt: string;
}

export interface PizzariaDesvioTempo {

}

export interface PizzariaMetasTempo {
  id: string,
  metaRecebidoMin: number;
  metaProntoMin: number;
  metaEntregueMin: number;
  observacao: string;
  atualizadoEm: string;
  atualizadoPor: string;
}

export interface PizzariaUpdateMetasTempoParams {
  id: string,
  metaRecebidoMin: number;
  metaProntoMin: number;
  metaEntregueMin: number;
  observacao: string;
  atualizadoEm: string;
  atualizadoPor: string;

}