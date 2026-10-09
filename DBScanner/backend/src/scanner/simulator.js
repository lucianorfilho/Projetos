// Schema simulado (modo demo): um ERP fictício com problemas realistas,
// para demonstrar o DBScanner sem precisar de um banco do cliente.
// Problemas plantados de propósito:
//  - LOG_ACESSO e ITENS_PEDIDO sem PK
//  - PEDIDOS.VENDEDOR_ID referencia VENDEDORES sem constraint (relação implícita)
//  - CLIENTES com CPF/EMAIL/TELEFONE sem proteção documentada (LGPD)
//  - FUNCIONARIOS.SENHA em VARCHAR2 (senha aparentemente em texto claro)
//  - TMP_CARGA_2019 vazia e abandonada
//  - FINANCEIRO_TITULOS.DT_VENCIMENTO como VARCHAR2 (data em texto)
//  - FKs sem índice, comentários quase inexistentes

function col(name, type, opts = {}) {
  return {
    name,
    dataType: type,
    dataLength: opts.len || null,
    nullable: opts.nullable !== false,
    numNulls: opts.numNulls ?? 0,
    numDistinct: opts.numDistinct ?? null,
    comments: opts.comments || null,
  };
}

const TABLES = [
  {
    name: 'CLIENTES', numRows: 48213, comments: null,
    columns: [
      col('CLIENTE_ID', 'NUMBER', { nullable: false, numDistinct: 48213 }),
      col('NOME', 'VARCHAR2', { len: 200, nullable: false, numDistinct: 47102 }),
      col('CPF', 'VARCHAR2', { len: 14, numDistinct: 46990, numNulls: 512 }),
      col('EMAIL', 'VARCHAR2', { len: 200, numDistinct: 44120, numNulls: 3200 }),
      col('TELEFONE', 'VARCHAR2', { len: 20, numNulls: 8100, numDistinct: 39000 }),
      col('CIDADE_ID', 'NUMBER', { numDistinct: 1180 }),
      col('DATA_CADASTRO', 'DATE', { nullable: false, numDistinct: 3650 }),
      col('LIMITE_CREDITO', 'NUMBER', { numNulls: 21000, numDistinct: 320 }),
      col('OBS', 'VARCHAR2', { len: 4000, numNulls: 46000, numDistinct: 1900 }),
    ],
    pk: ['CLIENTE_ID'],
    fks: [{ columns: ['CIDADE_ID'], refTable: 'CIDADES', refColumns: ['CIDADE_ID'] }],
    indexes: [
      { name: 'PK_CLIENTES', uniqueness: 'UNIQUE', columns: ['CLIENTE_ID'] },
      { name: 'IX_CLIENTES_NOME', uniqueness: 'NONUNIQUE', columns: ['NOME'] },
    ],
  },
  {
    name: 'CIDADES', numRows: 5570, comments: 'Municípios IBGE',
    columns: [
      col('CIDADE_ID', 'NUMBER', { nullable: false, numDistinct: 5570 }),
      col('NOME', 'VARCHAR2', { len: 120, nullable: false, numDistinct: 5290, comments: 'Nome do município' }),
      col('UF', 'CHAR', { len: 2, nullable: false, numDistinct: 27 }),
    ],
    pk: ['CIDADE_ID'],
    fks: [],
    indexes: [{ name: 'PK_CIDADES', uniqueness: 'UNIQUE', columns: ['CIDADE_ID'] }],
  },
  {
    name: 'PRODUTOS', numRows: 8412, comments: null,
    columns: [
      col('PRODUTO_ID', 'NUMBER', { nullable: false, numDistinct: 8412 }),
      col('DESCRICAO', 'VARCHAR2', { len: 300, nullable: false, numDistinct: 8390 }),
      col('CATEGORIA_ID', 'NUMBER', { numDistinct: 84 }),
      col('PRECO_VENDA', 'NUMBER', { numDistinct: 2100 }),
      col('CUSTO', 'NUMBER', { numNulls: 1200, numDistinct: 1800 }),
      col('ATIVO', 'CHAR', { len: 1, numDistinct: 2 }),
    ],
    pk: ['PRODUTO_ID'],
    fks: [{ columns: ['CATEGORIA_ID'], refTable: 'CATEGORIAS', refColumns: ['CATEGORIA_ID'] }],
    indexes: [{ name: 'PK_PRODUTOS', uniqueness: 'UNIQUE', columns: ['PRODUTO_ID'] }],
  },
  {
    name: 'CATEGORIAS', numRows: 84, comments: 'Categorias de produto',
    columns: [
      col('CATEGORIA_ID', 'NUMBER', { nullable: false, numDistinct: 84 }),
      col('NOME', 'VARCHAR2', { len: 100, nullable: false, numDistinct: 84 }),
    ],
    pk: ['CATEGORIA_ID'],
    fks: [],
    indexes: [{ name: 'PK_CATEGORIAS', uniqueness: 'UNIQUE', columns: ['CATEGORIA_ID'] }],
  },
  {
    name: 'PEDIDOS', numRows: 312450, comments: null,
    columns: [
      col('PEDIDO_ID', 'NUMBER', { nullable: false, numDistinct: 312450 }),
      col('CLIENTE_ID', 'NUMBER', { nullable: false, numDistinct: 41200 }),
      col('VENDEDOR_ID', 'NUMBER', { numDistinct: 62 }),
      col('DATA_PEDIDO', 'DATE', { nullable: false, numDistinct: 2900 }),
      col('STATUS', 'VARCHAR2', { len: 20, numDistinct: 6 }),
      col('VALOR_TOTAL', 'NUMBER', { numDistinct: 98000 }),
    ],
    pk: ['PEDIDO_ID'],
    fks: [{ columns: ['CLIENTE_ID'], refTable: 'CLIENTES', refColumns: ['CLIENTE_ID'] }],
    indexes: [{ name: 'PK_PEDIDOS', uniqueness: 'UNIQUE', columns: ['PEDIDO_ID'] }],
  },
  {
    name: 'ITENS_PEDIDO', numRows: 1148200, comments: null,
    columns: [
      col('PEDIDO_ID', 'NUMBER', { nullable: false, numDistinct: 312450 }),
      col('PRODUTO_ID', 'NUMBER', { nullable: false, numDistinct: 7900 }),
      col('QUANTIDADE', 'NUMBER', { nullable: false, numDistinct: 240 }),
      col('PRECO_UNITARIO', 'NUMBER', { numDistinct: 2100 }),
      col('DESCONTO', 'NUMBER', { numNulls: 900000, numDistinct: 50 }),
    ],
    pk: [], // sem PK de propósito
    fks: [
      { columns: ['PEDIDO_ID'], refTable: 'PEDIDOS', refColumns: ['PEDIDO_ID'] },
      { columns: ['PRODUTO_ID'], refTable: 'PRODUTOS', refColumns: ['PRODUTO_ID'] },
    ],
    indexes: [],
  },
  {
    name: 'VENDEDORES', numRows: 62, comments: null,
    columns: [
      col('VENDEDOR_ID', 'NUMBER', { nullable: false, numDistinct: 62 }),
      col('NOME', 'VARCHAR2', { len: 200, nullable: false, numDistinct: 62 }),
      col('COMISSAO_PCT', 'NUMBER', { numDistinct: 8 }),
    ],
    pk: ['VENDEDOR_ID'],
    fks: [],
    indexes: [{ name: 'PK_VENDEDORES', uniqueness: 'UNIQUE', columns: ['VENDEDOR_ID'] }],
  },
  {
    name: 'FUNCIONARIOS', numRows: 340, comments: null,
    columns: [
      col('FUNCIONARIO_ID', 'NUMBER', { nullable: false, numDistinct: 340 }),
      col('NOME', 'VARCHAR2', { len: 200, nullable: false, numDistinct: 340 }),
      col('CPF', 'VARCHAR2', { len: 14, numDistinct: 340 }),
      col('DATA_NASCIMENTO', 'DATE', { numDistinct: 335 }),
      col('SALARIO', 'NUMBER', { numDistinct: 90 }),
      col('LOGIN', 'VARCHAR2', { len: 50, numDistinct: 340 }),
      col('SENHA', 'VARCHAR2', { len: 50, numDistinct: 310 }),
    ],
    pk: ['FUNCIONARIO_ID'],
    fks: [],
    indexes: [{ name: 'PK_FUNCIONARIOS', uniqueness: 'UNIQUE', columns: ['FUNCIONARIO_ID'] }],
  },
  {
    name: 'ESTOQUE', numRows: 8412, comments: null,
    columns: [
      col('PRODUTO_ID', 'NUMBER', { nullable: false, numDistinct: 8412 }),
      col('DEPOSITO', 'VARCHAR2', { len: 30, nullable: false, numDistinct: 4 }),
      col('SALDO', 'NUMBER', { nullable: false, numDistinct: 1900 }),
      col('DATA_ULT_MOV', 'DATE', { numNulls: 300, numDistinct: 1400 }),
    ],
    pk: ['PRODUTO_ID', 'DEPOSITO'],
    fks: [{ columns: ['PRODUTO_ID'], refTable: 'PRODUTOS', refColumns: ['PRODUTO_ID'] }],
    indexes: [{ name: 'PK_ESTOQUE', uniqueness: 'UNIQUE', columns: ['PRODUTO_ID', 'DEPOSITO'] }],
  },
  {
    name: 'FINANCEIRO_TITULOS', numRows: 402100, comments: null,
    columns: [
      col('TITULO_ID', 'NUMBER', { nullable: false, numDistinct: 402100 }),
      col('CLIENTE_ID', 'NUMBER', { numDistinct: 40100 }),
      col('DT_VENCIMENTO', 'VARCHAR2', { len: 10, numDistinct: 3200 }),
      col('VALOR', 'NUMBER', { numDistinct: 120000 }),
      col('PAGO', 'CHAR', { len: 1, numDistinct: 2 }),
    ],
    pk: ['TITULO_ID'],
    fks: [{ columns: ['CLIENTE_ID'], refTable: 'CLIENTES', refColumns: ['CLIENTE_ID'] }],
    indexes: [{ name: 'PK_FIN_TITULOS', uniqueness: 'UNIQUE', columns: ['TITULO_ID'] }],
  },
  {
    name: 'NOTAS_FISCAIS', numRows: 298000, comments: null,
    columns: [
      col('NF_ID', 'NUMBER', { nullable: false, numDistinct: 298000 }),
      col('PEDIDO_ID', 'NUMBER', { numDistinct: 297500 }),
      col('CHAVE_ACESSO', 'VARCHAR2', { len: 44, numDistinct: 298000 }),
      col('DATA_EMISSAO', 'DATE', { numDistinct: 2800 }),
      col('XML', 'CLOB', { numNulls: 12000, numDistinct: null }),
    ],
    pk: ['NF_ID'],
    fks: [{ columns: ['PEDIDO_ID'], refTable: 'PEDIDOS', refColumns: ['PEDIDO_ID'] }],
    indexes: [{ name: 'PK_NOTAS_FISCAIS', uniqueness: 'UNIQUE', columns: ['NF_ID'] }],
  },
  {
    name: 'LOG_ACESSO', numRows: 18400000, comments: null,
    columns: [
      col('DATA_HORA', 'DATE', { nullable: false, numDistinct: 4100000 }),
      col('USUARIO', 'VARCHAR2', { len: 50, numDistinct: 350 }),
      col('IP', 'VARCHAR2', { len: 15, numDistinct: 2200 }),
      col('ACAO', 'VARCHAR2', { len: 200, numDistinct: 900 }),
    ],
    pk: [],
    fks: [],
    indexes: [],
  },
  {
    name: 'TMP_CARGA_2019', numRows: 0, comments: null,
    columns: [
      col('LINHA', 'VARCHAR2', { len: 4000, numDistinct: 0 }),
      col('PROCESSADO', 'CHAR', { len: 1, numDistinct: 0 }),
    ],
    pk: [],
    fks: [],
    indexes: [],
  },
  {
    name: 'PARAMETROS', numRows: 118, comments: 'Parâmetros gerais do sistema',
    columns: [
      col('CHAVE', 'VARCHAR2', { len: 100, nullable: false, numDistinct: 118, comments: 'Nome do parâmetro' }),
      col('VALOR', 'VARCHAR2', { len: 4000, numDistinct: 110 }),
    ],
    pk: ['CHAVE'],
    fks: [],
    indexes: [{ name: 'PK_PARAMETROS', uniqueness: 'UNIQUE', columns: ['CHAVE'] }],
  },
];

const OTHER_OBJECTS = { views: 12, procedures: 34, functions: 21, packages: 9, triggers: 14, sequences: 22 };

// Converte para o formato canônico de snapshot que o scanner entrega.
function scan() {
  const tables = TABLES.map((t) => ({
    name: t.name,
    numRows: t.numRows,
    lastAnalyzed: t.numRows > 0 ? '2026-06-28' : '2019-11-02',
    comments: t.comments,
    hasPk: t.pk.length > 0,
    pkColumns: t.pk,
    columns: t.columns.map((c, i) => ({
      ...c,
      position: i + 1,
      inPk: t.pk.includes(c.name),
      inFk: t.fks.some((fk) => fk.columns.includes(c.name)),
    })),
    indexes: t.indexes,
  }));

  const relations = [];
  for (const t of TABLES) {
    for (const fk of t.fks) {
      fk.columns.forEach((c, i) => relations.push({
        fromTable: t.name,
        fromColumn: c,
        toTable: fk.refTable,
        toColumn: fk.refColumns[i],
        kind: 'fk',
      }));
    }
  }

  return Promise.resolve({
    schema: 'ERP_DEMO',
    vendor: 'oracle',
    version: 'Oracle 19c (simulado)',
    tables,
    relations,
    otherObjects: OTHER_OBJECTS,
  });
}

module.exports = { scan };
