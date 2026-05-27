/// <mls fileReference="_102035_/l1/pizzaria/persistence.ts" enhancement="_blank" />
import type { TableDefinition } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';

export const tableDefinitions: TableDefinition[] = [
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaUsuario',
    tableName: 'Usuario',
    purpose: 'cadastro',
    description: 'Pessoa que acessa o módulo com um perfil específico.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'nome', postgresType: 'TEXT' },
      { name: 'perfil', postgresType: 'TEXT' }
    ],
    primaryKey: ['nome'],
    indexes: [
      { name: 'idx_Usuario_perfil', columns: ['perfil'] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'Usuario_documents',
        staging: 'Usuario_documents_test',
        production: 'Usuario_documents'
      },
      partitionKey: 'nome'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaPedido',
    tableName: 'Pedido',
    purpose: 'cadastro',
    description: 'Registro de pedido balcão ou delivery.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'canal', postgresType: 'TEXT' },
      { name: 'status', postgresType: 'TEXT' },
      { name: 'itens', postgresType: 'TEXT' },
      { name: 'total', postgresType: 'INTEGER' },
      { name: 'dataHora', postgresType: 'TIMESTAMPTZ' },
      { name: 'clienteContato', postgresType: 'TEXT' },
      { name: 'motivoCancelamento', postgresType: 'TEXT' },
      { name: 'tempoEstimadoMin', postgresType: 'INTEGER' }
    ],
    primaryKey: ['canal'],
    indexes: [
      { name: 'idx_Pedido_status', columns: ['status'] },
      { name: 'idx_Pedido_total', columns: [{ name: 'total', direction: 'desc' }] },
      { name: 'idx_Pedido_dataHora', columns: [{ name: 'dataHora', direction: 'desc' }] },
      { name: 'idx_Pedido_tempoEstimadoMin', columns: [{ name: 'tempoEstimadoMin', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'Pedido_documents',
        staging: 'Pedido_documents_test',
        production: 'Pedido_documents'
      },
      partitionKey: 'canal'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaItemCardapio',
    tableName: 'ItemCardapio',
    purpose: 'cadastro',
    description: 'Item disponível para venda no cardápio.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'nome', postgresType: 'TEXT' },
      { name: 'descricao', postgresType: 'TEXT' },
      { name: 'preco', postgresType: 'INTEGER' },
      { name: 'ativo', postgresType: 'BOOLEAN' }
    ],
    primaryKey: ['nome'],
    indexes: [
      { name: 'idx_ItemCardapio_preco', columns: [{ name: 'preco', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'ItemCardapio_documents',
        staging: 'ItemCardapio_documents_test',
        production: 'ItemCardapio_documents'
      },
      partitionKey: 'nome'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaProducao',
    tableName: 'Producao',
    purpose: 'cadastro',
    description: 'Controle de produção dos pedidos.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'pedidoId', postgresType: 'TEXT' },
      { name: 'status', postgresType: 'TEXT' },
      { name: 'responsavel', postgresType: 'TEXT' }
    ],
    primaryKey: ['pedidoId'],
    indexes: [
      { name: 'idx_Producao_status', columns: ['status'] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'Producao_documents',
        staging: 'Producao_documents_test',
        production: 'Producao_documents'
      },
      partitionKey: 'pedidoId'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaEstoque',
    tableName: 'Estoque',
    purpose: 'cadastro',
    description: 'Controle básico de estoque de ingredientes e insumos.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'item', postgresType: 'TEXT' },
      { name: 'quantidade', postgresType: 'INTEGER' },
      { name: 'unidade', postgresType: 'TEXT' }
    ],
    primaryKey: ['item'],
    indexes: [
      { name: 'idx_Estoque_quantidade', columns: [{ name: 'quantidade', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'Estoque_documents',
        staging: 'Estoque_documents_test',
        production: 'Estoque_documents'
      },
      partitionKey: 'item'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaFinanceiro',
    tableName: 'Financeiro',
    purpose: 'cadastro',
    description: 'Registro simples de vendas e totais.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'pedidoId', postgresType: 'TEXT' },
      { name: 'valor', postgresType: 'INTEGER' },
      { name: 'dataHora', postgresType: 'TIMESTAMPTZ' }
    ],
    primaryKey: ['pedidoId'],
    indexes: [
      { name: 'idx_Financeiro_valor', columns: [{ name: 'valor', direction: 'desc' }] },
      { name: 'idx_Financeiro_dataHora', columns: [{ name: 'dataHora', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'Financeiro_documents',
        staging: 'Financeiro_documents_test',
        production: 'Financeiro_documents'
      },
      partitionKey: 'pedidoId'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaPoliticaCancelamentoReembolso',
    tableName: 'PoliticaCancelamentoReembolso',
    purpose: 'cadastro',
    description: 'Políticas de cancelamento e reembolso com motivos obrigatórios.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'motivosPermitidos', postgresType: 'TEXT' },
      { name: 'regras', postgresType: 'TEXT' },
      { name: 'ativa', postgresType: 'BOOLEAN' }
    ],
    primaryKey: ['motivosPermitidos'],
    indexes: [],
    dynamo: {
      tableNameByEnv: {
        development: 'PoliticaCancelamentoReembolso_documents',
        staging: 'PoliticaCancelamentoReembolso_documents_test',
        production: 'PoliticaCancelamentoReembolso_documents'
      },
      partitionKey: 'motivosPermitidos'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaConfiguracaoEntrega',
    tableName: 'ConfiguracaoEntrega',
    purpose: 'cadastro',
    description: 'Definição de janelas de entrega e tempo estimado padrão por canal.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'canal', postgresType: 'TEXT' },
      { name: 'janelaEntrega', postgresType: 'TEXT' },
      { name: 'tempoEstimadoPadraoMin', postgresType: 'INTEGER' },
      { name: 'ativa', postgresType: 'BOOLEAN' }
    ],
    primaryKey: ['canal'],
    indexes: [
      { name: 'idx_ConfiguracaoEntrega_tempoEstimadoPadraoMin', columns: [{ name: 'tempoEstimadoPadraoMin', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'ConfiguracaoEntrega_documents',
        staging: 'ConfiguracaoEntrega_documents_test',
        production: 'ConfiguracaoEntrega_documents'
      },
      partitionKey: 'canal'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaTaxaEntrega',
    tableName: 'TaxaEntrega',
    purpose: 'cadastro',
    description: 'Política de taxa de entrega por região e valor mínimo.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'regiao', postgresType: 'TEXT' },
      { name: 'taxa', postgresType: 'INTEGER' },
      { name: 'valorMinimoPedido', postgresType: 'INTEGER' },
      { name: 'ativa', postgresType: 'BOOLEAN' }
    ],
    primaryKey: ['regiao'],
    indexes: [
      { name: 'idx_TaxaEntrega_taxa', columns: [{ name: 'taxa', direction: 'desc' }] },
      { name: 'idx_TaxaEntrega_valorMinimoPedido', columns: [{ name: 'valorMinimoPedido', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'TaxaEntrega_documents',
        staging: 'TaxaEntrega_documents_test',
        production: 'TaxaEntrega_documents'
      },
      partitionKey: 'regiao'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaMensagemWhatsAppPadrao',
    tableName: 'MensagemWhatsAppPadrao',
    purpose: 'cadastro',
    description: 'Mensagens padronizadas para comunicação de status por WhatsApp.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'statusPedido', postgresType: 'TEXT' },
      { name: 'mensagem', postgresType: 'TEXT' },
      { name: 'ativa', postgresType: 'BOOLEAN' }
    ],
    primaryKey: ['statusPedido'],
    indexes: [],
    dynamo: {
      tableNameByEnv: {
        development: 'MensagemWhatsAppPadrao_documents',
        staging: 'MensagemWhatsAppPadrao_documents_test',
        production: 'MensagemWhatsAppPadrao_documents'
      },
      partitionKey: 'statusPedido'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaCaixa',
    tableName: 'Caixa',
    purpose: 'cadastro',
    description: 'Controle de caixa com abertura, sangria e fechamento diário.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'data', postgresType: 'TIMESTAMPTZ' },
      { name: 'valorAbertura', postgresType: 'INTEGER' },
      { name: 'valorFechamento', postgresType: 'INTEGER' },
      { name: 'status', postgresType: 'TEXT' }
    ],
    primaryKey: ['data'],
    indexes: [
      { name: 'idx_Caixa_valorAbertura', columns: [{ name: 'valorAbertura', direction: 'desc' }] },
      { name: 'idx_Caixa_valorFechamento', columns: [{ name: 'valorFechamento', direction: 'desc' }] },
      { name: 'idx_Caixa_status', columns: ['status'] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'Caixa_documents',
        staging: 'Caixa_documents_test',
        production: 'Caixa_documents'
      },
      partitionKey: 'data'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaMovimentoCaixa',
    tableName: 'MovimentoCaixa',
    purpose: 'cadastro',
    description: 'Movimentações de caixa como sangrias e entradas.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'caixaId', postgresType: 'TEXT' },
      { name: 'tipo', postgresType: 'TEXT' },
      { name: 'valor', postgresType: 'INTEGER' },
      { name: 'dataHora', postgresType: 'TIMESTAMPTZ' },
      { name: 'observacao', postgresType: 'TEXT' }
    ],
    primaryKey: ['caixaId'],
    indexes: [
      { name: 'idx_MovimentoCaixa_tipo', columns: ['tipo'] },
      { name: 'idx_MovimentoCaixa_valor', columns: [{ name: 'valor', direction: 'desc' }] },
      { name: 'idx_MovimentoCaixa_dataHora', columns: [{ name: 'dataHora', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'MovimentoCaixa_documents',
        staging: 'MovimentoCaixa_documents_test',
        production: 'MovimentoCaixa_documents'
      },
      partitionKey: 'caixaId'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaMovimentoEstoque',
    tableName: 'MovimentoEstoque',
    purpose: 'cadastro',
    description: 'Registro de movimentações de estoque (entrada/saída) com motivo.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'estoqueId', postgresType: 'TEXT' },
      { name: 'tipo', postgresType: 'TEXT' },
      { name: 'quantidade', postgresType: 'INTEGER' },
      { name: 'dataHora', postgresType: 'TIMESTAMPTZ' },
      { name: 'motivo', postgresType: 'TEXT' },
      { name: 'observacao', postgresType: 'TEXT' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_MovimentoEstoque_estoqueId', columns: ['estoqueId'] },
      { name: 'idx_MovimentoEstoque_tipo', columns: ['tipo'] },
      { name: 'idx_MovimentoEstoque_quantidade', columns: [{ name: 'quantidade', direction: 'desc' }] },
      { name: 'idx_MovimentoEstoque_dataHora', columns: [{ name: 'dataHora', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'MovimentoEstoque_documents',
        staging: 'MovimentoEstoque_documents_test',
        production: 'MovimentoEstoque_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaReembolso',
    tableName: 'Reembolso',
    purpose: 'cadastro',
    description: 'Registro de reembolsos vinculados a pedidos cancelados.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'pedidoId', postgresType: 'TEXT' },
      { name: 'valor', postgresType: 'INTEGER' },
      { name: 'dataHora', postgresType: 'TIMESTAMPTZ' },
      { name: 'motivo', postgresType: 'TEXT' },
      { name: 'observacao', postgresType: 'TEXT' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_Reembolso_pedidoId', columns: ['pedidoId'] },
      { name: 'idx_Reembolso_valor', columns: [{ name: 'valor', direction: 'desc' }] },
      { name: 'idx_Reembolso_dataHora', columns: [{ name: 'dataHora', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'Reembolso_documents',
        staging: 'Reembolso_documents_test',
        production: 'Reembolso_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  }
];