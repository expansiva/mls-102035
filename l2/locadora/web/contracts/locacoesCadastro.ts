/// <mls fileReference="_102035_/l2/locadora/web/contracts/locacoesCadastro.ts" enhancement="_blank" />

export interface LocadoraVeiculoResponse {
  placa: string;
  modelo: string;
  ano: number;
  categoria: string;
  status: 'disponível' | 'locado' | 'manutenção';
  quilometragem: number;
}

export interface LocadoraUpdateVeiculoRequest {
  placa: string;
  modelo?: string;
  ano?: number;
  categoria?: string;
  status?: LocadoraVeiculoResponse['status'];
  quilometragem?: number;
  author?: string;
}

export interface LocadoraClienteResponse {
  nome: string;
  cpf: string;
  cnh: string;
  telefone: string;
  email: string;
}

export interface LocadoraUpdateClienteRequest {
  nome: string;
  cpf?: string;
  cnh?: string;
  telefone?: string;
  email?: string;
  author?: string;
}

export interface LocadoraLocacaoResponse {
  dataRetirada: string;
  dataDevolucao: string;
  valorDiario: number;
  seguroOpcional?: boolean;
  formaPagamento: string;
  devolucaoPrevista: string;
  placaVeiculo: string;
  cpf: string;
}

export interface LocadoraUpdateLocacaoRequest {
  dataRetirada: string;
  dataDevolucao?: string;
  valorDiario?: number;
  seguroOpcional?: boolean;
  formaPagamento?: string;
  devolucaoPrevista?: string;
  placaVeiculo?: string;
  cpf: string;
  author?: string;
}