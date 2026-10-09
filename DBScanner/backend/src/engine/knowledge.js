// Motor de conhecimento: aprende com as anotações do usuário e com a
// estrutura descoberta nos scans para SUGERIR novo conhecimento.
// Cada sugestão aceita vira uma anotação — e gera novas sugestões:
// quanto mais o usuário anota, mais o DBScanner aprende.
const db = require('../catalog');

function latestScanId(databaseId) {
  const row = db.prepare(
    `SELECT id FROM scans WHERE database_id = ? AND status='done' ORDER BY id DESC LIMIT 1`
  ).get(databaseId);
  return row ? row.id : null;
}

function suggestions(databaseId) {
  const scanId = latestScanId(databaseId);
  if (!scanId) return [];

  const columns = db.prepare(
    'SELECT table_name, name, data_type FROM scan_columns WHERE scan_id = ?').all(scanId);
  const relations = db.prepare(
    'SELECT * FROM scan_relations WHERE scan_id = ?').all(scanId);
  const knowledge = db.prepare(
    'SELECT * FROM knowledge WHERE database_id = ?').all(databaseId);

  const known = new Set(knowledge.map((k) => `${k.object_name}|${k.column_name || ''}`));
  const colKnowledge = knowledge.filter((k) => k.column_name);
  const tableKnowledge = new Map(
    knowledge.filter((k) => !k.column_name).map((k) => [k.object_name, k]));

  const out = [];
  const seen = new Set();
  const add = (objectName, columnName, businessName, description, tags, reason) => {
    const key = `${objectName}|${columnName || ''}`;
    if (known.has(key) || seen.has(key)) return;
    seen.add(key);
    out.push({
      object_name: objectName, column_name: columnName,
      business_name: businessName, description, tags, reason,
    });
  };

  // 1) Propagação por nome: coluna anotada em uma tabela → mesma coluna
  //    (mesmo nome e tipo compatível) em outras tabelas herda o significado.
  for (const k of colKnowledge) {
    if (!k.description && !k.business_name) continue;
    for (const c of columns) {
      if (c.name === k.column_name && c.table_name !== k.object_name) {
        add(c.table_name, c.name, k.business_name, k.description, k.tags,
          `Propagado da sua anotação em ${k.object_name}.${k.column_name}`);
      }
    }
  }

  // 2) Relacionamentos: se a tabela-destino tem nome de negócio, a coluna FK
  //    (real ou inferida) ganha uma descrição derivada.
  for (const r of relations) {
    const target = tableKnowledge.get(r.to_table);
    if (!target || !target.business_name) continue;
    add(r.from_table, r.from_column, null,
      `Referência a ${target.business_name} (${r.to_table}.${r.to_column})${r.kind === 'inferred' ? ' — relação inferida, sem FK no banco' : ''}`,
      target.tags,
      `Derivado do relacionamento com ${r.to_table}, que você nomeou "${target.business_name}"`);
  }

  // 3) Herança de tags LGPD: tabela marcada com tag lgpd → colunas sensíveis
  //    detectadas pelo scan nessa tabela viram sugestão de anotação.
  const lgpdInsights = db.prepare(
    `SELECT object_name, column_name, title FROM scan_insights
      WHERE scan_id = ? AND category = 'lgpd' AND column_name IS NOT NULL`).all(scanId);
  for (const i of lgpdInsights) {
    const t = tableKnowledge.get(i.object_name);
    if (!t || !(t.tags || '').includes('lgpd')) continue;
    add(i.object_name, i.column_name, null,
      `Dado pessoal (${i.title.replace('Dado pessoal detectado: ', '')}) em tabela do inventário LGPD`,
      'lgpd',
      `A tabela ${i.object_name} está marcada como LGPD e o scan detectou dado pessoal nesta coluna`);
  }

  return out;
}

module.exports = { suggestions, latestScanId };
