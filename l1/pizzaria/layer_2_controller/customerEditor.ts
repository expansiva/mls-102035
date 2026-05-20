/// <mls fileReference="_102035_/l1/pizzaria/layer_2_controllers/customerEditor.ts" enhancement="_blank" />
import {  PizzariaCustomer, PizzariaUpdateCustomerParams } from "_102035_/l1/pizzaria/module.js"
import { AppError, ok, type BffHandler, type RequestContext } from "_102034_/l1/server/layer_2_controllers/contracts.js"

async function getCustomerRepository(ctx: RequestContext) {
  return ctx.data.moduleData.getTable<PizzariaCustomer>("pizzariaCustomer");
}


export async function getCustomer(ctx: RequestContext, input?: { customerId?: string }): Promise<PizzariaCustomer | undefined> {
  const repo = await getCustomerRepository(ctx);
  const rows = await repo.findMany();
  const filtered = input?.customerId ? rows.filter((item: PizzariaCustomer) => item.customerId === input.customerId) : rows;
  return filtered[0];
}



export async function load(ctx: RequestContext, input: PizzariaUpdateCustomerParams): Promise<PizzariaCustomer> {
  const repo = await getCustomerRepository(ctx);
  const existing = await repo.findOne({ where: { customerId: input.customerId } });
  if (!existing) throw new AppError("NOT_FOUND", "Customer not found", 404);
  const merged: PizzariaCustomer = {
    ...existing,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export async function save(ctx: RequestContext, input: PizzariaUpdateCustomerParams): Promise<PizzariaCustomer> {
  const repo = await getCustomerRepository(ctx);
  const existing = await repo.findOne({ where: { customerId: input.customerId } });
  if (!existing) throw new AppError("NOT_FOUND", "Customer not found", 404);
  const merged: PizzariaCustomer = {
    ...existing,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export async function deleteCustomer(ctx: RequestContext, input: PizzariaUpdateCustomerParams): Promise<PizzariaCustomer> {
  const repo = await getCustomerRepository(ctx);
  const existing = await repo.findOne({ where: { customerId: input.customerId } });
  if (!existing) throw new AppError("NOT_FOUND", "Customer not found", 404);
  await repo.delete({ where: { customerId: input.customerId } });
  return existing;
}

export const customerEditorGetCustomerHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await getCustomer(ctx, {
    customerId: typeof params.customerId === "string" ? params.customerId : undefined
  }));
};


export const customerEditorLoadHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await load(ctx, {
    customerId: typeof params.customerId === "string" ? params.customerId : "",
    name: typeof params.name === "string" ? params.name : undefined,
    phone: typeof params.phone === "string" ? params.phone : undefined,
    notes: typeof params.notes === "string" ? params.notes : undefined,
    author: typeof params.author === "string" ? params.author : undefined
  }));
};

export const customerEditorSaveHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await save(ctx, {
    customerId: typeof params.customerId === "string" ? params.customerId : "",
    name: typeof params.name === "string" ? params.name : undefined,
    phone: typeof params.phone === "string" ? params.phone : undefined,
    notes: typeof params.notes === "string" ? params.notes : undefined,
    author: typeof params.author === "string" ? params.author : undefined
  }));
};

export const customerEditorDeleteHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await deleteCustomer(ctx, {
    customerId: typeof params.customerId === "string" ? params.customerId : "",
    name: typeof params.name === "string" ? params.name : undefined,
    phone: typeof params.phone === "string" ? params.phone : undefined,
    notes: typeof params.notes === "string" ? params.notes : undefined,
    author: typeof params.author === "string" ? params.author : undefined
  }));
};