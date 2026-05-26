/// <mls fileReference="_102035_/l1/pizzaria/layer_2_controllers/areaPublicaCardapio.ts" enhancement="_blank" />

import { PizzariaCombo, PizzariaConfiguracaoWhatsApp, PizzariaPedido, PizzariaPoliticaCancelamentoReembolso, PizzariaProduto, PizzariaUpdatePedidoParams, PizzariaUpdateProdutoParams } from '/_102035_/l1/pizzaria/module.js';
import { AppError, ok, type BffHandler, type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';

async function getProdutoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaProduto>('pizzariaProduto');
}

async function getComboRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaCombo>('pizzariaCombo');
}

async function getPoliticaCancelamentoReembolsoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaPoliticaCancelamentoReembolso>('pizzariaPoliticaCancelamentoReembolso');
}

async function getConfiguracaoWhatsAppRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaConfiguracaoWhatsApp>('pizzariaConfiguracaoWhatsApp');
}

async function getPedidoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaPedido>('pizzariaPedido');
}

export async function listProdutosPublicos(ctx: RequestContext, input?: { termo?: string; categoria?: string; somenteDisponiveis?: boolean }): Promise<PizzariaProduto[]> {
  const repo = await getProdutoRepository(ctx);
  let rows = await repo.findMany();
  if (input?.termo) {
    const termo = input.termo.toLowerCase();
    rows = rows.filter((item: PizzariaProduto) => item.nome.toLowerCase().includes(termo) || (item.descricao ? item.descricao.toLowerCase().includes(termo) : false));
  }
  if (input?.categoria) {
    rows = rows.filter((item: PizzariaProduto) => item.categoria === input.categoria);
  }
  if (input?.somenteDisponiveis !== undefined) {
    rows = rows.filter((item: PizzariaProduto) => item.disponivel === input.somenteDisponiveis);
  }
  return rows;
}

export async function listCombosAtivos(ctx: RequestContext, input?: { ativo?: boolean }): Promise<PizzariaCombo[]> {
  const repo = await getComboRepository(ctx);
  let rows = await repo.findMany();
  if (input?.ativo !== undefined) {
    rows = rows.filter((item: PizzariaCombo) => item.ativo === input.ativo);
  }
  return rows;
}

export async function getPoliticaCancelamentoAtiva(ctx: RequestContext, input?: { ativo?: boolean }): Promise<PizzariaPoliticaCancelamentoReembolso | undefined> {
  const repo = await getPoliticaCancelamentoReembolsoRepository(ctx);
  let rows = await repo.findMany();
  if (input?.ativo !== undefined) {
    rows = rows.filter((item: PizzariaPoliticaCancelamentoReembolso) => item.ativo === input.ativo);
  }
  return rows[0];
}

export async function getConfiguracaoWhatsAppAtiva(ctx: RequestContext, input?: { ativo?: boolean }): Promise<PizzariaConfiguracaoWhatsApp | undefined> {
  const repo = await getConfiguracaoWhatsAppRepository(ctx);
  let rows = await repo.findMany();
  if (input?.ativo !== undefined) {
    rows = rows.filter((item: PizzariaConfiguracaoWhatsApp) => item.ativo === input.ativo);
  }
  return rows[0];
}

export async function loadMenu(ctx: RequestContext, input: PizzariaUpdateProdutoParams): Promise<PizzariaProduto> {
  const repo = await getProdutoRepository(ctx);
  const existing = await repo.findOne({ where: { id: input.id } });
  if (!existing) throw new AppError('NOT_FOUND', 'Produto not found', 404);
  const merged: PizzariaProduto = {
    ...existing,
    ...(input.nome !== undefined ? { nome: input.nome } : {}),
    ...(input.descricao !== undefined ? { descricao: input.descricao } : {}),
    ...(input.preco !== undefined ? { preco: input.preco } : {}),
    ...(input.categoria !== undefined ? { categoria: input.categoria } : {}),
    ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
    ...(input.disponivel !== undefined ? { disponivel: input.disponivel } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export async function createOrder(ctx: RequestContext, input: PizzariaUpdatePedidoParams): Promise<PizzariaPedido> {
  const repo = await getPedidoRepository(ctx);
  const existing = await repo.findOne({ where: { id: input.id } });
  if (!existing) throw new AppError('NOT_FOUND', 'Pedido not found', 404);
  const merged: PizzariaPedido = {
    ...existing,
    ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.itens !== undefined ? { itens: input.itens } : {}),
    ...(input.total !== undefined ? { total: input.total } : {}),
    ...(input.origem !== undefined ? { origem: input.origem } : {}),
    ...(input.cliente !== undefined ? { cliente: input.cliente } : {}),
    ...(input.enderecoEntrega !== undefined ? { enderecoEntrega: input.enderecoEntrega } : {}),
    ...(input.zonaEntregaId !== undefined ? { zonaEntregaId: input.zonaEntregaId } : {}),
    ...(input.taxaEntrega !== undefined ? { taxaEntrega: input.taxaEntrega } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export const areaPublicaCardapioListProdutosPublicosHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await listProdutosPublicos(ctx, {
    termo: typeof params.termo === 'string' ? params.termo : undefined,
    categoria: typeof params.categoria === 'string' ? params.categoria : undefined,
    somenteDisponiveis: true
  }));
};

export const areaPublicaCardapioListCombosAtivosHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await listCombosAtivos(ctx, {
    ativo: true
  }));
};

export const areaPublicaCardapioGetPoliticaCancelamentoAtivaHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await getPoliticaCancelamentoAtiva(ctx, {
    ativo: true
  }));
};

export const areaPublicaCardapioGetConfiguracaoWhatsAppAtivaHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await getConfiguracaoWhatsAppAtiva(ctx, {
    ativo: true
  }));
};

export const areaPublicaCardapioLoadMenuHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await loadMenu(ctx, {
    id: typeof params.id === 'string' ? params.id : '',
    nome: typeof params.nome === 'string' ? params.nome : undefined,
    descricao: typeof params.descricao === 'string' ? params.descricao : undefined,
    preco: typeof params.preco === 'number' ? params.preco : undefined,
    categoria: typeof params.categoria === 'string' ? params.categoria : undefined,
    ativo: typeof params.ativo === 'boolean' ? params.ativo : undefined,
    disponivel: typeof params.disponivel === 'boolean' ? params.disponivel : undefined,
    author: typeof params.author === 'string' ? params.author : undefined
  }));
};

export const areaPublicaCardapioCreateOrderHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await createOrder(ctx, {
    id: typeof params.id === 'string' ? params.id : '',
    tipo: typeof params.tipo === 'string' ? params.tipo as any : undefined,
    status: typeof params.status === 'string' ? params.status as any : undefined,
    itens: params.itens !== undefined ? params.itens : undefined,
    total: typeof params.total === 'number' ? params.total : undefined,
    origem: typeof params.origem === 'string' ? params.origem  as any : undefined,
    cliente: typeof params.cliente === 'string' ? params.cliente : undefined,
    enderecoEntrega: typeof params.enderecoEntrega === 'string' ? params.enderecoEntrega : undefined,
    zonaEntregaId: typeof params.zonaEntregaId === 'string' ? params.zonaEntregaId : undefined,
    taxaEntrega: typeof params.taxaEntrega === 'number' ? params.taxaEntrega : undefined,
    author: typeof params.author === 'string' ? params.author : undefined
  }));
};