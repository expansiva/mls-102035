/// <mls fileReference="_102035_/l1/pizzaria/persistence.ts" enhancement="_blank" />
import type { TableDefinition } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';

export const tableDefinitions: TableDefinition[] = [
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaUsuario',
    tableName: 'Usuario',
    purpose: 'cadastro',
    description: 'Usuário do sistema com perfil de acesso.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'nome', postgresType: 'TEXT' },
      { name: 'perfil', postgresType: 'TEXT' },
      { name: 'ativo', postgresType: 'BOOLEAN' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_Usuario_perfil', columns: ['perfil'] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'Usuario_documents',
        staging: 'Usuario_documents_test',
        production: 'Usuario_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaProduto',
    tableName: 'Produto',
    purpose: 'cadastro',
    description: 'Item do cardápio da pizzaria.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'nome', postgresType: 'TEXT' },
      { name: 'descricao', postgresType: 'TEXT' },
      { name: 'preco', postgresType: 'INTEGER' },
      { name: 'categoria', postgresType: 'TEXT' },
      { name: 'ativo', postgresType: 'BOOLEAN' },
      { name: 'disponivel', postgresType: 'BOOLEAN' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_Produto_preco', columns: [{ name: 'preco', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'Produto_documents',
        staging: 'Produto_documents_test',
        production: 'Produto_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaEstoqueItem',
    tableName: 'EstoqueItem',
    purpose: 'cadastro',
    description: 'Controle de estoque de insumos e produtos.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'produtoId', postgresType: 'TEXT' },
      { name: 'quantidade', postgresType: 'INTEGER' },
      { name: 'unidade', postgresType: 'TEXT' },
      { name: 'minimo', postgresType: 'INTEGER' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_EstoqueItem_produtoId', columns: ['produtoId'] },
      { name: 'idx_EstoqueItem_quantidade', columns: [{ name: 'quantidade', direction: 'desc' }] },
      { name: 'idx_EstoqueItem_minimo', columns: [{ name: 'minimo', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'EstoqueItem_documents',
        staging: 'EstoqueItem_documents_test',
        production: 'EstoqueItem_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaPedido',
    tableName: 'Pedido',
    purpose: 'cadastro',
    description: 'Pedido de mesa, balcão ou delivery.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'tipo', postgresType: 'TEXT' },
      { name: 'status', postgresType: 'TEXT' },
      { name: 'itens', postgresType: 'TEXT' },
      { name: 'total', postgresType: 'INTEGER' },
      { name: 'origem', postgresType: 'TEXT' },
      { name: 'cliente', postgresType: 'TEXT' },
      { name: 'enderecoEntrega', postgresType: 'TEXT' },
      { name: 'zonaEntregaId', postgresType: 'TEXT' },
      { name: 'taxaEntrega', postgresType: 'INTEGER' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_Pedido_tipo', columns: ['tipo'] },
      { name: 'idx_Pedido_status', columns: ['status'] },
      { name: 'idx_Pedido_total', columns: [{ name: 'total', direction: 'desc' }] },
      { name: 'idx_Pedido_origem', columns: ['origem'] },
      { name: 'idx_Pedido_zonaEntregaId', columns: ['zonaEntregaId'] },
      { name: 'idx_Pedido_taxaEntrega', columns: [{ name: 'taxaEntrega', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'Pedido_documents',
        staging: 'Pedido_documents_test',
        production: 'Pedido_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaPagamento',
    tableName: 'Pagamento',
    purpose: 'cadastro',
    description: 'Registro de pagamento do pedido.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'pedidoId', postgresType: 'TEXT' },
      { name: 'metodo', postgresType: 'TEXT' },
      { name: 'status', postgresType: 'TEXT' },
      { name: 'valor', postgresType: 'INTEGER' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_Pagamento_pedidoId', columns: ['pedidoId'] },
      { name: 'idx_Pagamento_metodo', columns: ['metodo'] },
      { name: 'idx_Pagamento_valor', columns: [{ name: 'valor', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'Pagamento_documents',
        staging: 'Pagamento_documents_test',
        production: 'Pagamento_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaEntrega',
    tableName: 'Entrega',
    purpose: 'cadastro',
    description: 'Entrega vinculada a pedido delivery.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'pedidoId', postgresType: 'TEXT' },
      { name: 'entregadorId', postgresType: 'TEXT' },
      { name: 'status', postgresType: 'TEXT' },
      { name: 'endereco', postgresType: 'TEXT' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_Entrega_pedidoId', columns: ['pedidoId'] },
      { name: 'idx_Entrega_entregadorId', columns: ['entregadorId'] },
      { name: 'idx_Entrega_status', columns: ['status'] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'Entrega_documents',
        staging: 'Entrega_documents_test',
        production: 'Entrega_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaZonaEntrega',
    tableName: 'ZonaEntrega',
    purpose: 'cadastro',
    description: 'Zona de entrega com taxa e prazo estimado configuráveis.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'nome', postgresType: 'TEXT' },
      { name: 'taxa', postgresType: 'INTEGER' },
      { name: 'prazoEstimadoMin', postgresType: 'INTEGER' },
      { name: 'ativo', postgresType: 'BOOLEAN' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_ZonaEntrega_taxa', columns: [{ name: 'taxa', direction: 'desc' }] },
      { name: 'idx_ZonaEntrega_prazoEstimadoMin', columns: [{ name: 'prazoEstimadoMin', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'ZonaEntrega_documents',
        staging: 'ZonaEntrega_documents_test',
        production: 'ZonaEntrega_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaTempoAlvoEtapa',
    tableName: 'TempoAlvoEtapa',
    purpose: 'cadastro',
    description: 'Tempo-alvo por etapa do pedido para orientar produtividade.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'etapa', postgresType: 'TEXT' },
      { name: 'tempoAlvoMin', postgresType: 'INTEGER' },
      { name: 'ativo', postgresType: 'BOOLEAN' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_TempoAlvoEtapa_etapa', columns: ['etapa'] },
      { name: 'idx_TempoAlvoEtapa_tempoAlvoMin', columns: [{ name: 'tempoAlvoMin', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'TempoAlvoEtapa_documents',
        staging: 'TempoAlvoEtapa_documents_test',
        production: 'TempoAlvoEtapa_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaCombo',
    tableName: 'Combo',
    purpose: 'cadastro',
    description: 'Combo promocional para upsell no checkout.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'nome', postgresType: 'TEXT' },
      { name: 'descricao', postgresType: 'TEXT' },
      { name: 'itens', postgresType: 'TEXT' },
      { name: 'preco', postgresType: 'INTEGER' },
      { name: 'ativo', postgresType: 'BOOLEAN' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_Combo_preco', columns: [{ name: 'preco', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'Combo_documents',
        staging: 'Combo_documents_test',
        production: 'Combo_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaPoliticaCancelamentoReembolso',
    tableName: 'PoliticaCancelamentoReembolso',
    purpose: 'cadastro',
    description: 'Política padronizada de cancelamento e reembolso.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'condicoes', postgresType: 'TEXT' },
      { name: 'prazoMaximoMin', postgresType: 'INTEGER' },
      { name: 'permiteReembolso', postgresType: 'BOOLEAN' },
      { name: 'ativo', postgresType: 'BOOLEAN' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_PoliticaCancelamentoReembolso_prazoMaximoMin', columns: [{ name: 'prazoMaximoMin', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'PoliticaCancelamentoReembolso_documents',
        staging: 'PoliticaCancelamentoReembolso_documents_test',
        production: 'PoliticaCancelamentoReembolso_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaItemPedido',
    tableName: 'ItemPedido',
    purpose: 'cadastro',
    description: 'Item de pedido vinculando produto e quantidade.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'pedidoId', postgresType: 'TEXT' },
      { name: 'produtoId', postgresType: 'TEXT' },
      { name: 'quantidade', postgresType: 'INTEGER' },
      { name: 'precoUnitario', postgresType: 'INTEGER' },
      { name: 'observacoes', postgresType: 'TEXT' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_ItemPedido_pedidoId', columns: ['pedidoId'] },
      { name: 'idx_ItemPedido_produtoId', columns: ['produtoId'] },
      { name: 'idx_ItemPedido_quantidade', columns: [{ name: 'quantidade', direction: 'desc' }] },
      { name: 'idx_ItemPedido_precoUnitario', columns: [{ name: 'precoUnitario', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'ItemPedido_documents',
        staging: 'ItemPedido_documents_test',
        production: 'ItemPedido_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaConfiguracaoWhatsApp',
    tableName: 'ConfiguracaoWhatsApp',
    purpose: 'cadastro',
    description: 'Parâmetros persistentes da integração com WhatsApp.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'numeroTelefone', postgresType: 'TEXT' },
      { name: 'tokenAcesso', postgresType: 'TEXT' },
      { name: 'webhookUrl', postgresType: 'TEXT' },
      { name: 'ativo', postgresType: 'BOOLEAN' }
    ],
    primaryKey: ['id'],
    indexes: [],
    dynamo: {
      tableNameByEnv: {
        development: 'ConfiguracaoWhatsApp_documents',
        staging: 'ConfiguracaoWhatsApp_documents_test',
        production: 'ConfiguracaoWhatsApp_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  },
  {
    moduleId: 'pizzaria',
    repositoryName: 'pizzariaRegraUpsell',
    tableName: 'RegraUpsell',
    purpose: 'cadastro',
    description: 'Regra de sugestão de upsell entre produtos.',
    backupHot: true,
    storageProfile: 'postgresHotBackup',
    writeMode: 'writeBehind',
    columns: [
      { name: 'id', postgresType: 'TEXT' },
      { name: 'produtoBaseId', postgresType: 'TEXT' },
      { name: 'produtoSugeridoId', postgresType: 'TEXT' },
      { name: 'prioridade', postgresType: 'INTEGER' },
      { name: 'ativo', postgresType: 'BOOLEAN' }
    ],
    primaryKey: ['id'],
    indexes: [
      { name: 'idx_RegraUpsell_produtoBaseId', columns: ['produtoBaseId'] },
      { name: 'idx_RegraUpsell_produtoSugeridoId', columns: ['produtoSugeridoId'] },
      { name: 'idx_RegraUpsell_prioridade', columns: [{ name: 'prioridade', direction: 'desc' }] }
    ],
    dynamo: {
      tableNameByEnv: {
        development: 'RegraUpsell_documents',
        staging: 'RegraUpsell_documents_test',
        production: 'RegraUpsell_documents'
      },
      partitionKey: 'id'
    },
    version: 1
  }
];