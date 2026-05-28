/// <mls fileReference="_102035_/l2/locadora/web/contracts/clientesLista.ts" enhancement="_blank" />

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