/// <mls fileReference="_102035_/l1/pizzaria/module.ts" enhancement="_blank" />

export interface PizzariaCustomer {
  customerId: string;
  name: string;
  phone: string;
  notes?: string;
}

export interface PizzariaCustomerOrderHistory {
  customerId: string;
  orderId: string;
  orderDate: any;
}

export interface PizzariaServiceTimeTarget {
  status: 'recebido' | 'em preparo' | 'pronto' | 'entregue';
  targetMinutes: number;
}

export interface PizzariaInventoryReplenishmentRule {
  productId: string;
  minimumStock: number;
  replenishmentAlert: 'ativo' | 'inativo';
}

export interface PizzariaPhoneOrderScript {
  scriptId: string;
  title: string;
  content: string;
  status: 'ativo' | 'inativo';
}

export interface PizzariaPhoneOrderChecklist {
  checklistId: string;
  title: string;
  items: string;
  status: 'ativo' | 'inativo';
}

export interface PizzariaUpdateCustomerParams {
  customerId: string;
  name?: string;
  phone?: string;
  notes?: string;
  author?: string;
}

export interface PizzariaUpdateCustomerOrderHistoryParams {
  customerId: string;
  orderId?: string;
  orderDate?: any;
  author?: string;
}

export interface PizzariaUpdateServiceTimeTargetParams {
  status: PizzariaServiceTimeTarget['status'];
  targetMinutes?: number;
  author?: string;
}

export interface PizzariaUpdateInventoryReplenishmentRuleParams {
  productId: string;
  minimumStock?: number;
  replenishmentAlert?: PizzariaInventoryReplenishmentRule['replenishmentAlert'];
  author?: string;
}

export interface PizzariaUpdatePhoneOrderScriptParams {
  scriptId: string;
  title?: string;
  content?: string;
  status?: PizzariaPhoneOrderScript['status'];
  author?: string;
}

export interface PizzariaUpdatePhoneOrderChecklistParams {
  checklistId: string;
  title?: string;
  items?: string;
  status?: PizzariaPhoneOrderChecklist['status'];
  author?: string;
}

export interface PizzariaSeedResult {
  insertedCount: number;
  totalCount: number;
  seededAt: string;
}
