/// <mls fileReference="_102035_/l1/locadora/layer_2_controllers/locacoesCadastro.ts" enhancement="_blank" />

import { LocadoraClienteResponse, LocadoraLocacaoResponse, LocadoraUpdateLocacaoRequest, LocadoraUpdateVeiculoRequest, LocadoraVeiculoResponse } from "/_102035_/l2/locadora/web/contracts/locacoesCadastro.js";
import { AppError, ok, type BffHandler, type RequestContext } from "/_102034_/l1/server/layer_2_controllers/contracts.js";
import { USE_MOCK, getMockClienteRepository, getMockLocacaoRepository, getMockVeiculoRepository } from "/_102035_/l1/locadora/layer_2_controllers/mock.js"; 

async function getLocacaoRepository(ctx: RequestContext) {
  if (USE_MOCK) return getMockLocacaoRepository();
  return ctx.data.moduleData.getTable<LocadoraLocacaoResponse>('locadoraLocacao');
}

async function getClienteRepository(ctx: RequestContext) {
  if (USE_MOCK) return getMockClienteRepository();
  return ctx.data.moduleData.getTable<LocadoraClienteResponse>('locadoraCliente');
}

async function getVeiculoRepository(ctx: RequestContext) {
  if (USE_MOCK) return getMockVeiculoRepository();
  return ctx.data.moduleData.getTable<LocadoraVeiculoResponse>('locadoraVeiculo');
}

export async function createLocacao(ctx: RequestContext, input?: {}): Promise<LocadoraLocacaoResponse[]> {
  const repo = await getLocacaoRepository(ctx);
  const rows = await repo.findMany();
  return rows;
}

export async function validateCliente(ctx: RequestContext, input?: { clienteId?: string }): Promise<LocadoraClienteResponse[]> {
  const repo = await getClienteRepository(ctx);
  const rows = await repo.findMany();
  const filtered = typeof input?.clienteId === 'string'
    ? rows.filter((item: LocadoraClienteResponse) => (item as unknown as { clienteId?: string }).clienteId === input.clienteId)
    : rows;
  return filtered;
}

export async function checkVeiculoAvailability(ctx: RequestContext, input?: { placa?: string }): Promise<LocadoraVeiculoResponse[]> {
  const repo = await getVeiculoRepository(ctx);
  const rows = await repo.findMany();
  const filtered = typeof input?.placa === 'string'
    ? rows.filter((item: LocadoraVeiculoResponse) => item.placa === input.placa)
    : rows;
  return filtered;
}

export async function save(ctx: RequestContext, input?: LocadoraUpdateLocacaoRequest): Promise<LocadoraLocacaoResponse> {
  if (!input || input.dataRetirada === undefined) throw new AppError('VALIDATION_ERROR', 'dataRetirada is required', 400);
  const repo = await getLocacaoRepository(ctx);
  const existing = await repo.findOne({ where: { dataRetirada: input.dataRetirada } });
  if (!existing) {
    await repo.upsert({ record: {
      dataRetirada: input.dataRetirada,
      dataDevolucao: input.dataDevolucao ?? '',
      valorDiario: input.valorDiario ?? 0,
      seguroOpcional: input.seguroOpcional ?? false,
      formaPagamento: input.formaPagamento ?? '',
      devolucaoPrevista: input.devolucaoPrevista ?? '',
      placaVeiculo: input.placaVeiculo ?? '',
      cpf: input.cpf ?? '',
    } });
    return {
      dataRetirada: input.dataRetirada,
      dataDevolucao: input.dataDevolucao ?? '',
      valorDiario: input.valorDiario ?? 0,
      seguroOpcional: input.seguroOpcional ?? false,          
      formaPagamento: input.formaPagamento ?? '',
      devolucaoPrevista: input.devolucaoPrevista ?? '',
      placaVeiculo: input.placaVeiculo ?? '',
      cpf: input.cpf ?? ''
    };
  }
  const merged: LocadoraLocacaoResponse = {
    ...existing,
    ...(input.dataDevolucao !== undefined ? { dataDevolucao: input.dataDevolucao } : {}),
    ...(input.valorDiario !== undefined ? { valorDiario: input.valorDiario } : {}),
    ...(input.seguroOpcional !== undefined ? { seguroOpcional: input.seguroOpcional } : {}),
    ...(input.formaPagamento !== undefined ? { formaPagamento: input.formaPagamento } : {}),
    ...(input.devolucaoPrevista !== undefined ? { devolucaoPrevista: input.devolucaoPrevista } : {}),
    ...(input.placaVeiculo !== undefined ? { placaVeiculo: input.placaVeiculo } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export async function checkVeiculo(ctx: RequestContext, input?: LocadoraUpdateVeiculoRequest): Promise<LocadoraVeiculoResponse> {
  if (!input || input.placa === undefined) throw new AppError('VALIDATION_ERROR', 'placa is required', 400);
  const repo = await getVeiculoRepository(ctx);
  const existing = await repo.findOne({ where: { placa: input.placa } });
  if (!existing) throw new AppError('NOT_FOUND', 'Veiculo not found', 404);
  const merged: LocadoraVeiculoResponse = {
    ...existing,
    ...(input.modelo !== undefined ? { modelo: input.modelo } : {}),
    ...(input.ano !== undefined ? { ano: input.ano } : {}),
    ...(input.categoria !== undefined ? { categoria: input.categoria } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.quilometragem !== undefined ? { quilometragem: input.quilometragem } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export async function cancel(ctx: RequestContext, input?: LocadoraUpdateLocacaoRequest): Promise<LocadoraLocacaoResponse> {
  if (!input || input.dataRetirada === undefined) throw new AppError('VALIDATION_ERROR', 'dataRetirada is required', 400);
  const repo = await getLocacaoRepository(ctx);
  const existing = await repo.findOne({ where: { dataRetirada: input.dataRetirada } });
  if (!existing) throw new AppError('NOT_FOUND', 'Locacao not found', 404);
  const merged: LocadoraLocacaoResponse = {
    ...existing,
    ...(input.dataDevolucao !== undefined ? { dataDevolucao: input.dataDevolucao } : {}),
    ...(input.valorDiario !== undefined ? { valorDiario: input.valorDiario } : {}),
    ...(input.seguroOpcional !== undefined ? { seguroOpcional: input.seguroOpcional } : {}),
    ...(input.formaPagamento !== undefined ? { formaPagamento: input.formaPagamento } : {}),
    ...(input.devolucaoPrevista !== undefined ? { devolucaoPrevista: input.devolucaoPrevista } : {}),
    ...(input.placaVeiculo !== undefined ? { placaVeiculo: input.placaVeiculo } : {})
  };
  await repo.upsert({ record: merged });
  return merged;
}

export const locacoesCadastroCreateLocacaoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await createLocacao(ctx, {}));
};

export const locacoesCadastroValidateClienteHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await validateCliente(ctx, {
    clienteId: typeof params.clienteId === 'string' ? params.clienteId : undefined
  }));
};

export const locacoesCadastroCheckVeiculoAvailabilityHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await checkVeiculoAvailability(ctx, {
    placa: typeof params.placa === 'string' ? params.placa : undefined
  }));
};

export const locacoesCadastroSaveHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await save(ctx, {
    dataRetirada: typeof params.dataRetirada === 'string' ? params.dataRetirada : undefined,
    dataDevolucao: typeof params.dataDevolucao === 'string' ? params.dataDevolucao : undefined,
    valorDiario: typeof params.valorDiario === 'number' ? params.valorDiario : undefined,
    seguroOpcional: typeof params.seguroOpcional === 'boolean' ? params.seguroOpcional : undefined,
    formaPagamento: typeof params.formaPagamento === 'string' ? params.formaPagamento : undefined,
    devolucaoPrevista: typeof params.devolucaoPrevista === 'string' ? params.devolucaoPrevista : undefined,
    placaVeiculo: typeof params.placaVeiculo === 'string' ? params.placaVeiculo : undefined,
    author: typeof params.author === 'string' ? params.author : undefined
  } as LocadoraUpdateLocacaoRequest));
};

export const locacoesCadastroCheckVeiculoHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await checkVeiculo(ctx, {
    placa: typeof params.placa === 'string' ? params.placa : undefined,
    modelo: typeof params.modelo === 'string' ? params.modelo : undefined,
    ano: typeof params.ano === 'number' ? params.ano : undefined,
    categoria: typeof params.categoria === 'string' ? params.categoria : undefined,
    status: typeof params.status === 'string' ? (params.status as LocadoraVeiculoResponse['status']) : undefined,
    quilometragem: typeof params.quilometragem === 'number' ? params.quilometragem : undefined,
    author: typeof params.author === 'string' ? params.author : undefined
  } as LocadoraUpdateVeiculoRequest));
};

export const locacoesCadastroCancelHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return ok(await cancel(ctx, {
    dataRetirada: typeof params.dataRetirada === 'string' ? params.dataRetirada : undefined,
    dataDevolucao: typeof params.dataDevolucao === 'string' ? params.dataDevolucao : undefined,
    valorDiario: typeof params.valorDiario === 'number' ? params.valorDiario : undefined,
    seguroOpcional: typeof params.seguroOpcional === 'boolean' ? params.seguroOpcional : undefined,
    formaPagamento: typeof params.formaPagamento === 'string' ? params.formaPagamento : undefined,
    devolucaoPrevista: typeof params.devolucaoPrevista === 'string' ? params.devolucaoPrevista : undefined,
    placaVeiculo: typeof params.placaVeiculo === 'string' ? params.placaVeiculo : undefined,
    author: typeof params.author === 'string' ? params.author : undefined
  } as LocadoraUpdateLocacaoRequest));
};