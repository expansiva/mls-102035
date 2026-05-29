/// <mls fileReference="_102035_/l2/locadora/web/contracts/locacoesLista.ts" enhancement="_blank" />

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
  dataRetirada: LocadoraLocacaoResponse["dataRetirada"];
  dataDevolucao?: LocadoraLocacaoResponse["dataDevolucao"];
  valorDiario?: LocadoraLocacaoResponse["valorDiario"];
  seguroOpcional?: LocadoraLocacaoResponse["seguroOpcional"];
  formaPagamento?: LocadoraLocacaoResponse["formaPagamento"];
  devolucaoPrevista?: LocadoraLocacaoResponse["devolucaoPrevista"];
  placaVeiculo?: LocadoraLocacaoResponse["placaVeiculo"];
  cpf: LocadoraLocacaoResponse["cpf"];
  author?: string;
}