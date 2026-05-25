/// <mls fileReference="_102035_/l1/pizzaria/module.ts" enhancement="_blank" />

export interface PizzariaUsuario {
  id: string;
  nome: string;
  perfil: 'admin' | 'caixa' | 'atendente' | 'cozinha' | 'entregador';
  ativo: boolean;
}

export interface PizzariaUpdateUsuarioParams {
  id: string;
  nome?: string;
  perfil?: PizzariaUsuario['perfil'];
  ativo?: boolean;
  author?: string;
}

export interface PizzariaProduto {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  categoria?: string;
  ativo: boolean;
  disponivel?: boolean;
}

export interface PizzariaUpdateProdutoParams {
  id: string;
  nome?: string;
  descricao?: string;
  preco?: number;
  categoria?: string;
  ativo?: boolean;
  disponivel?: boolean;
  author?: string;
}

export interface PizzariaEstoqueItem {
  id: string;
  produtoId: string;
  quantidade: number;
  unidade: string;
  minimo?: number;
}

export interface PizzariaUpdateEstoqueItemParams {
  id: string;
  produtoId?: string;
  quantidade?: number;
  unidade?: string;
  minimo?: number;
  author?: string;
}

export interface PizzariaPedido {
  id: string;
  tipo: 'mesa' | 'balcao' | 'delivery';
  status:
    | 'recebido'
    | 'em preparo'
    | 'pronto'
    | 'saiu para entrega'
    | 'concluido'
    | 'cancelado'
    | 'reembolsado';
  itens: any;
  total: number;
  origem: 'interno' | 'publico';
  cliente?: string;
  enderecoEntrega?: string;
  zonaEntregaId?: string;
  taxaEntrega?: number;
}

export interface PizzariaUpdatePedidoParams {
  id: string;
  tipo?: PizzariaPedido['tipo'];
  status?: PizzariaPedido['status'];
  itens?: any;
  total?: number;
  origem?: PizzariaPedido['origem'];
  cliente?: string;
  enderecoEntrega?: string;
  zonaEntregaId?: string;
  taxaEntrega?: number;
  author?: string;
}

export interface PizzariaPagamento {
  id: string;
  pedidoId: string;
  metodo: 'online';
  status: string;
  valor: number;
}

export interface PizzariaUpdatePagamentoParams {
  id: string;
  pedidoId?: string;
  metodo?: PizzariaPagamento['metodo'];
  status?: string;
  valor?: number;
  author?: string;
}

export interface PizzariaEntrega {
  id: string;
  pedidoId: string;
  entregadorId: string;
  status: 'saiu para entrega' | 'concluido';
  endereco: string;
}

export interface PizzariaUpdateEntregaParams {
  id: string;
  pedidoId?: string;
  entregadorId?: string;
  status?: PizzariaEntrega['status'];
  endereco?: string;
  author?: string;
}

export interface PizzariaZonaEntrega {
  id: string;
  nome: string;
  taxa: number;
  prazoEstimadoMin?: number;
  ativo: boolean;
}

export interface PizzariaUpdateZonaEntregaParams {
  id: string;
  nome?: string;
  taxa?: number;
  prazoEstimadoMin?: number;
  ativo?: boolean;
  author?: string;
}

export interface PizzariaTempoAlvoEtapa {
  id: string;
  etapa: 'recebido' | 'em preparo' | 'pronto' | 'saiu para entrega';
  tempoAlvoMin: number;
  ativo: boolean;
}

export interface PizzariaUpdateTempoAlvoEtapaParams {
  id: string;
  etapa?: PizzariaTempoAlvoEtapa['etapa'];
  tempoAlvoMin?: number;
  ativo?: boolean;
  author?: string;
}

export interface PizzariaCombo {
  id: string;
  nome: string;
  descricao?: string;
  itens: any;
  preco: number;
  ativo: boolean;
}

export interface PizzariaUpdateComboParams {
  id: string;
  nome?: string;
  descricao?: string;
  itens?: any;
  preco?: number;
  ativo?: boolean;
  author?: string;
}

export interface PizzariaPoliticaCancelamentoReembolso {
  id: string;
  condicoes: string;
  prazoMaximoMin?: number;
  permiteReembolso: boolean;
  ativo: boolean;
}

export interface PizzariaUpdatePoliticaCancelamentoReembolsoParams {
  id: string;
  condicoes?: string;
  prazoMaximoMin?: number;
  permiteReembolso?: boolean;
  ativo?: boolean;
  author?: string;
}

export interface PizzariaItemPedido {
  id: string;
  pedidoId: string;
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
  observacoes?: string;
}

export interface PizzariaUpdateItemPedidoParams {
  id: string;
  pedidoId?: string;
  produtoId?: string;
  quantidade?: number;
  precoUnitario?: number;
  observacoes?: string;
  author?: string;
}

export interface PizzariaConfiguracaoWhatsApp {
  id: string;
  numeroTelefone: string;
  tokenAcesso?: string;
  webhookUrl?: string;
  ativo: boolean;
}

export interface PizzariaUpdateConfiguracaoWhatsAppParams {
  id: string;
  numeroTelefone?: string;
  tokenAcesso?: string;
  webhookUrl?: string;
  ativo?: boolean;
  author?: string;
}

export interface PizzariaRegraUpsell {
  id: string;
  produtoBaseId: string;
  produtoSugeridoId: string;
  prioridade?: number;
  ativo: boolean;
}

export interface PizzariaUpdateRegraUpsellParams {
  id: string;
  produtoBaseId?: string;
  produtoSugeridoId?: string;
  prioridade?: number;
  ativo?: boolean;
  author?: string;
}

export interface PizzariaSeedResult {
  insertedCount: number;
  totalCount: number;
  seededAt: string;
}
