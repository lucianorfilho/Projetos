// Scanner de Oracle real: lê o dicionário de dados em modo thin
// (sem Instant Client). Só faz SELECT em views do catálogo — nunca
// toca nos dados do cliente além das estatísticas do otimizador.
const oracledb = require('oracledb');
const config = require('../config');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function scan() {
  const conn = await oracledb.getConnection({
    user: config.oracle.user,
    password: config.oracle.password,
    connectString: config.oracle.connectString,
  });

  try {
    const owner = (config.oracle.targetSchema || config.oracle.user).toUpperCase();
    const bind = { owner };

    const version = (await conn.execute(
      `SELECT banner FROM v$version WHERE ROWNUM = 1`
    ).catch(() => null))?.rows?.[0]?.BANNER || 'Oracle';

    const tablesRes = await conn.execute(`
      SELECT t.table_name, t.num_rows, TO_CHAR(t.last_analyzed,'YYYY-MM-DD') last_analyzed, c.comments
        FROM all_tables t
        LEFT JOIN all_tab_comments c
          ON c.owner = t.owner AND c.table_name = t.table_name AND c.table_type = 'TABLE'
       WHERE t.owner = :owner
       ORDER BY t.table_name`, bind);

    const colsRes = await conn.execute(`
      SELECT c.table_name, c.column_name, c.column_id, c.data_type, c.data_length,
             c.nullable, c.num_nulls, c.num_distinct, cc.comments
        FROM all_tab_columns c
        LEFT JOIN all_col_comments cc
          ON cc.owner = c.owner AND cc.table_name = c.table_name AND cc.column_name = c.column_name
       WHERE c.owner = :owner
       ORDER BY c.table_name, c.column_id`, bind);

    const consRes = await conn.execute(`
      SELECT ac.constraint_name, ac.constraint_type, ac.table_name,
             acc.column_name, acc.position,
             r.table_name r_table, rcc.column_name r_column
        FROM all_constraints ac
        JOIN all_cons_columns acc
          ON acc.owner = ac.owner AND acc.constraint_name = ac.constraint_name
        LEFT JOIN all_constraints r
          ON r.owner = ac.r_owner AND r.constraint_name = ac.r_constraint_name
        LEFT JOIN all_cons_columns rcc
          ON rcc.owner = r.owner AND rcc.constraint_name = r.constraint_name
         AND rcc.position = acc.position
       WHERE ac.owner = :owner AND ac.constraint_type IN ('P','R')
       ORDER BY ac.table_name, acc.position`, bind);

    const idxRes = await conn.execute(`
      SELECT i.table_name, i.index_name, i.uniqueness,
             LISTAGG(ic.column_name, ',') WITHIN GROUP (ORDER BY ic.column_position) cols
        FROM all_indexes i
        JOIN all_ind_columns ic
          ON ic.index_owner = i.owner AND ic.index_name = i.index_name
       WHERE i.owner = :owner
       GROUP BY i.table_name, i.index_name, i.uniqueness`, bind);

    const objRes = await conn.execute(`
      SELECT object_type, COUNT(*) cnt
        FROM all_objects
       WHERE owner = :owner
         AND object_type IN ('VIEW','PROCEDURE','FUNCTION','PACKAGE','TRIGGER','SEQUENCE')
       GROUP BY object_type`, bind);

    // Monta o snapshot canônico
    const byTable = new Map();
    for (const t of tablesRes.rows) {
      byTable.set(t.TABLE_NAME, {
        name: t.TABLE_NAME,
        numRows: t.NUM_ROWS,
        lastAnalyzed: t.LAST_ANALYZED,
        comments: t.COMMENTS,
        hasPk: false,
        pkColumns: [],
        columns: [],
        indexes: [],
      });
    }

    for (const c of colsRes.rows) {
      const t = byTable.get(c.TABLE_NAME);
      if (!t) continue;
      t.columns.push({
        name: c.COLUMN_NAME,
        position: c.COLUMN_ID,
        dataType: c.DATA_TYPE,
        dataLength: c.DATA_LENGTH,
        nullable: c.NULLABLE === 'Y',
        numNulls: c.NUM_NULLS,
        numDistinct: c.NUM_DISTINCT,
        comments: c.COMMENTS,
        inPk: false,
        inFk: false,
      });
    }

    const relations = [];
    for (const k of consRes.rows) {
      const t = byTable.get(k.TABLE_NAME);
      if (!t) continue;
      const colObj = t.columns.find((c) => c.name === k.COLUMN_NAME);
      if (k.CONSTRAINT_TYPE === 'P') {
        t.hasPk = true;
        t.pkColumns.push(k.COLUMN_NAME);
        if (colObj) colObj.inPk = true;
      } else if (k.CONSTRAINT_TYPE === 'R' && k.R_TABLE) {
        if (colObj) colObj.inFk = true;
        relations.push({
          fromTable: k.TABLE_NAME,
          fromColumn: k.COLUMN_NAME,
          toTable: k.R_TABLE,
          toColumn: k.R_COLUMN,
          kind: 'fk',
        });
      }
    }

    for (const i of idxRes.rows) {
      const t = byTable.get(i.TABLE_NAME);
      if (t) t.indexes.push({ name: i.INDEX_NAME, uniqueness: i.UNIQUENESS, columns: (i.COLS || '').split(',') });
    }

    const otherObjects = {};
    for (const o of objRes.rows) otherObjects[o.OBJECT_TYPE.toLowerCase() + 's'] = o.CNT;

    return {
      schema: owner,
      vendor: 'oracle',
      version,
      tables: [...byTable.values()],
      relations,
      otherObjects,
    };
  } finally {
    await conn.close().catch(() => {});
  }
}

module.exports = { scan };
