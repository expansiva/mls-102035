/// <mls fileReference="_102035_/l1/locadora/layer_2_controllers/mock.ts" enhancement="_blank" />
export const USE_MOCK = true;

const mockStore = {
  locadoraVeiculo: [
    { placa: 'AAA1', modelo: 'Fiat Argo', ano: 2025, categoria: 'Hatch ', status: 'disponível', quilometragem: 100000 },
    { placa: 'BBB2', modelo: 'Chevrolet Onix', ano: 2025, categoria: 'Sedan', status: 'disponível', quilometragem: 20000 },
  ] as any[],
  locadoraCliente: [
    { nome: 'Alberto', cpf: '99999999999', cnh: '99999999', telefone: '(99)9999-999', email: 'emaila@gmail.com' },
    { nome: 'Raul', cpf: '88888888888', cnh: '88888888', telefone: '(88)8888-888', email: 'emailb@gmail.com' },
  ] as any[],
  locadoraLocacao: [
    { dataRetirada: '01/05/2026', dataDevolucao: '03/05/2026', valorDiario: 10, seguroOpcional: true, formaPagamento: 'dinheiro', devolucaoPrevista: '03/05/2026', placaVeiculo:"BBB2", cpf:"99999999999" },
    { dataRetirada: '03/05/2026', dataDevolucao: '08/05/2026', valorDiario: 20, seguroOpcional: false, formaPagamento: 'dinheiro', devolucaoPrevista: '08/05/2026', placaVeiculo:"AAA1", cpf:"88888888888" },
  ] as any[],
  locadoraUsuarioAdmin: [
    { id: 'id-001', usuario: 'user1', senha: '123456' },
    { id: 'id-002', usuario: 'user2', senha: '123456' },
  ] as any[],
};

export function getMockVeiculoRepository() {
  const store = mockStore.locadoraVeiculo;
  return {
    async findMany(): Promise<any[]> {
      return store;
    },
    async findOne({ where }: { where: Record<string, any> }): Promise<any> {
      return store.find((item: any) =>
        Object.entries(where).every(([k, v]) => (item as Record<string, any>)[k] === v)
      );
    },
    async upsert({ record }: { record: any }): Promise<void> {
      const idx = store.findIndex((item: any) => item.placa === record.placa);
      if (idx >= 0) store[idx] = record;
      else store.push(record);
    },
  };
}

export function getMockClienteRepository() {
  const store = mockStore.locadoraCliente;
  return {
    async findMany(): Promise<any[]> {
      return store;
    },
    async findOne({ where }: { where: Record<string, any> }): Promise<any> {
      return store.find((item: any) =>
        Object.entries(where).every(([k, v]) => (item as Record<string, any>)[k] === v)
      );
    },
    async upsert({ record }: { record: any }): Promise<void> {
      const idx = store.findIndex((item: any) => item.nome === record.nome);
      if (idx >= 0) store[idx] = record;
      else store.push(record);
    },
  };
}

export function getMockLocacaoRepository() {
  const store = mockStore.locadoraLocacao;
  return {
    async findMany(): Promise<any[]> {
      return store;
    },
    async findOne({ where }: { where: Record<string, any> }): Promise<any> {
      return store.find((item: any) =>
        Object.entries(where).every(([k, v]) => (item as Record<string, any>)[k] === v)
      );
    },
    async upsert({ record }: { record: any }): Promise<void> {
      const idx = store.findIndex((item: any) => item.dataRetirada === record.dataRetirada);
      if (idx >= 0) store[idx] = record;
      else store.push(record);
    },
  };
}

export function getMockUsuarioAdminRepository() {
  const store = mockStore.locadoraUsuarioAdmin;
  return {
    async findMany(): Promise<any[]> {
      return store;
    },
    async findOne({ where }: { where: Record<string, any> }): Promise<any> {
      return store.find((item: any) =>
        Object.entries(where).every(([k, v]) => (item as Record<string, any>)[k] === v)
      );
    },
    async upsert({ record }: { record: any }): Promise<void> {
      const idx = store.findIndex((item: any) => item.id === record.id);
      if (idx >= 0) store[idx] = record;
      else store.push(record);
    },
  };
}
