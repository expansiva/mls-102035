/// <mls fileReference="_102035_/l1/pizzaria/layer_2_controllers/metasTempoConfiguracao.ts" enhancement="_blank" />

import { PizzariaDesvioTempo, PizzariaMetasTempo, PizzariaUpdateMetasTempoParams } from "/_102035_/l1/pizzaria/module.js";

import { AppError, ok, type BffHandler, type RequestContext } from "/_102034_/l1/server/layer_2_controllers/contracts.js";

async function getMetasTempoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaMetasTempo>("pizzariaMetasTempo");
}

async function getDesvioTempoRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaDesvioTempo>("pizzariaDesvioTempo");
}

export async function getMetasTempoEtapas(ctx: RequestContext): Promise<PizzariaMetasTempo | undefined> {
  const repo = await getMetasTempoRepository(ctx);
  const rows = await repo.findMany();
  const first = rows[0];
  return first;
}

export async function listDesviosTempo(ctx: RequestContext, input?: { periodoDias?: number }): Promise<PizzariaDesvioTempo[]> {
  const repo = await getDesvioTempoRepository(ctx);
  let rows = await repo.findMany();
  if (input?.periodoDias !== undefined) {
    rows = rows.filter((item: PizzariaDesvioTempo) => input.periodoDias !== undefined);
  }
  return rows;
}

export async function save(ctx: RequestContext, input: PizzariaUpdateMetasTempoParams): Promise<PizzariaMetasTempo> {
  const repo = await getMetasTempoRepository(ctx);
  const existing = await repo.findOne({ where: { id: input.id } });
  if (!existing) throw new AppError("NOT_FOUND", "MetasTempo not found", 404);
  const merged: PizzariaMetasTempo = {
    ...existing, 
    ...(input.metaRecebidoMin !== undefined ? { metaRecebidoMin: input.metaRecebidoMin } : {}),
    ...(input.metaProntoMin !== undefined ? { metaProntoMin: input.metaProntoMin } : {}),
    ...(input.metaEntregueMin !== undefined ? { metaEntregueMin: input.metaEntregueMin } : {}),
    ...(input.observacao !== undefined ? { observacao: input.observacao } : {}),
    ...(input.atualizadoEm !== undefined ? { atualizadoEm: input.atualizadoEm } : {}),
    ...(input.atualizadoPor !== undefined ? { atualizadoPor: input.atualizadoPor } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export const metasTempoConfiguracaoGetMetasTempoEtapasHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await getMetasTempoEtapas(ctx));
};

export const metasTempoConfiguracaoListDesviosTempoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await listDesviosTempo(ctx, {
    periodoDias: typeof params.periodoDias === "number" ? params.periodoDias : undefined
  }));
};  

export const metasTempoConfiguracaoSaveHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await save(ctx, {
    id: typeof params.id === "string" ? params.id : undefined,
    metaRecebidoMin: typeof params.metaRecebidoMin === "number" ? params.metaRecebidoMin : undefined,
    metaProntoMin: typeof params.metaProntoMin === "number" ? params.metaProntoMin : undefined,
    metaEntregueMin: typeof params.metaEntregueMin === "number" ? params.metaEntregueMin : undefined,
    observacao: typeof params.observacao === "string" ? params.observacao : undefined,
    atualizadoEm: params.atualizadoEm !== undefined ? (params.atualizadoEm as any) : undefined,
    atualizadoPor: typeof params.atualizadoPor === "string" ? params.atualizadoPor : undefined
  } as PizzariaUpdateMetasTempoParams));
};