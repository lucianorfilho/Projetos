// Motor de insights do DBScanner: recebe o snapshot canônico de um scan
// e produz achados (insights) + relações inferidas + índice de conhecimento.
//
// Severidades: alta | media | baixa | info
// Categorias:  integridade | lgpd | performance | documentacao | limpeza | modelagem

const SENSITIVE_PATTERNS = [
  { re: /(^|_)CPF($|_)/, label: 'CPF' },
  { re: /(^|_)CNPJ($|_)/, label: 'CNPJ' },
  { re: /(^|_)RG($|_)/, label: 'RG' },
  { re: /EMAIL|E_MAIL/, label: 'e-mail' },
  { re: /TELEFONE|CELULAR|(^|_)FONE($|_)/, label: 'telefone' },
  { re: /NASCIMENTO|DT_NASC|DATA_NASC/, label: 'data de nascimento' },
  { re: /ENDERECO|LOGRADOURO/, label: 'endereço' },
  { re: /SALARIO|REMUNERACAO/, label: 'salário' },
  { re: /CARTAO|(^|_)CC_NUM/, label: 'cartão' },
];

const PASSWORD_RE = /SENHA|PASSWORD|(^|_)PWD($|_)/;

function analyze(snapshot) {
  const insights = [];
  const add = (severity, category, objectName, columnName, title, detail, recommendation) =>
    insights.push({ severity, category, objectName, columnName, title, detail, recommendation });

  const tableNames = new Set(snapshot.tables.map((t) => t.name));
  const pkByTable = new Map(snapshot.tables.map((t) => [t.name, t.pkColumns || []]));
  const fkPairs = new Set(snapshot.relations.map((r) => `${r.fromTable}.${r.fromColumn}`));

  const inferredRelations = [];

  for (const t of snapshot.tables) {
    // --- integridade: tabela sem PK
    if (!t.hasPk) {
      add('alta', 'integridade', t.name, null,
        `Tabela sem chave primária`,
        `${t.name} (${fmtRows(t.numRows)} linhas) não possui primary key. Sem PK não há garantia de unicidade, replicação e ORMs sofrem, e linhas duplicadas passam despercebidas.`,
        `Identificar a coluna (ou combinação) que identifica cada linha e criar a PK — ou ao menos um índice único.`);
    }

    // --- limpeza: tabela vazia / abandonada
    if (t.numRows === 0) {
      add('info', 'limpeza', t.name, null,
        `Tabela vazia (possível abandono)`,
        `${t.name} está vazia${t.lastAnalyzed ? ` e não é analisada desde ${t.lastAnalyzed}` : ''}. Nomes com TMP/BKP/OLD costumam ser restos de cargas antigas.`,
        `Confirmar com o time se pode ser removida — reduz superfície de risco e ruído no schema.`);
    }

    // --- documentação
    if (!t.comments) {
      add('baixa', 'documentacao', t.name, null,
        `Tabela sem comentário/documentação`,
        `${t.name} não possui COMMENT no dicionário. Ninguém que chegar no projeto saberá o que ela representa sem perguntar.`,
        `Adicionar COMMENT ON TABLE ou registrar o significado na base de conhecimento do DBScanner.`);
    }

    for (const c of t.columns || []) {
      // --- LGPD: dados pessoais
      const sensitive = SENSITIVE_PATTERNS.find((p) => p.re.test(c.name));
      if (sensitive) {
        add('alta', 'lgpd', t.name, c.name,
          `Dado pessoal detectado: ${sensitive.label}`,
          `A coluna ${t.name}.${c.name} aparenta armazenar ${sensitive.label} (dado pessoal sob a LGPD).`,
          `Mapear no inventário LGPD, restringir grants de SELECT e avaliar mascaramento/criptografia. O DBVault pode proteger o acesso a esta tabela.`);
      }
      // --- LGPD/segurança: senha em texto
      if (PASSWORD_RE.test(c.name) && /CHAR/.test(c.dataType || '') && (c.dataLength || 0) <= 60) {
        add('alta', 'lgpd', t.name, c.name,
          `Possível senha armazenada em texto claro`,
          `${t.name}.${c.name} é ${c.dataType}(${c.dataLength}) — tamanho típico de senha sem hash forte (um hash bcrypt ocupa 60+ caracteres).`,
          `Migrar para hash com salt (bcrypt/argon2) e invalidar as senhas atuais.`);
      }
      // --- modelagem: data guardada como texto
      if (/^(DT_|DATA_|DAT_)/.test(c.name) && /VARCHAR|CHAR/.test(c.dataType || '')) {
        add('media', 'modelagem', t.name, c.name,
          `Data armazenada como texto`,
          `${t.name}.${c.name} parece ser uma data, mas o tipo é ${c.dataType}. Isso quebra ordenação, comparação e índices por data.`,
          `Converter para DATE/TIMESTAMP com migração controlada.`);
      }
      // --- limpeza: coluna 100% nula
      if (t.numRows > 0 && c.numNulls != null && c.numNulls >= t.numRows) {
        add('baixa', 'limpeza', t.name, c.name,
          `Coluna totalmente nula`,
          `${t.name}.${c.name} está nula em 100% das ${fmtRows(t.numRows)} linhas — provavelmente nunca foi usada.`,
          `Verificar se a coluna pode ser removida ou se a aplicação deveria estar preenchendo.`);
      }

      // --- modelagem: relação implícita (FK sem constraint)
      if (!c.inPk && !c.inFk && /_ID$/.test(c.name) && !fkPairs.has(`${t.name}.${c.name}`)) {
        const guess = c.name.replace(/_ID$/, '');
        const target = [...tableNames].find((n) => n === guess || n === guess + 'S' || n === guess + 'ES');
        if (target && target !== t.name) {
          const targetPk = pkByTable.get(target) || [];
          if (targetPk.length === 1) {
            inferredRelations.push({
              fromTable: t.name, fromColumn: c.name,
              toTable: target, toColumn: targetPk[0], kind: 'inferred',
            });
            add('media', 'integridade', t.name, c.name,
              `Relacionamento sem foreign key`,
              `${t.name}.${c.name} aparenta referenciar ${target}.${targetPk[0]}, mas não existe constraint. O banco não impede registros órfãos.`,
              `Validar se há órfãos (SELECT ... NOT IN ...) e criar a FK — ou documentar por que ela não existe.`);
          }
        }
      }
    }

    // --- performance: FK sem índice
    const indexedFirstCols = new Set((t.indexes || []).map((i) => i.columns[0]));
    for (const r of snapshot.relations.filter((r) => r.fromTable === t.name)) {
      if (!indexedFirstCols.has(r.fromColumn)) {
        add('media', 'performance', t.name, r.fromColumn,
          `Foreign key sem índice`,
          `${t.name}.${r.fromColumn} → ${r.toTable} não tem índice. Joins ficam lentos e deletes na tabela pai podem travar a filha (lock em full scan).`,
          `CREATE INDEX em ${t.name}(${r.fromColumn}).`);
      }
    }

    // --- performance/limpeza: tabela grande sem índice nenhum
    if ((t.numRows || 0) > 1000000 && (t.indexes || []).length === 0) {
      add('media', 'performance', t.name, null,
        `Tabela grande sem nenhum índice`,
        `${t.name} tem ${fmtRows(t.numRows)} linhas e nenhum índice — qualquer consulta é full scan.`,
        `Avaliar padrões de consulta e indexar; se for log, considerar particionamento e expurgo.`);
    }
  }

  // --- métricas agregadas
  const totalTables = snapshot.tables.length;
  const totalColumns = snapshot.tables.reduce((s, t) => s + (t.columns || []).length, 0);
  const documentedTables = snapshot.tables.filter((t) => t.comments).length;
  const documentedColumns = snapshot.tables.reduce(
    (s, t) => s + (t.columns || []).filter((c) => c.comments).length, 0);

  const docCoverage = totalTables + totalColumns > 0
    ? Math.round(((documentedTables + documentedColumns) / (totalTables + totalColumns)) * 100)
    : 0;

  if (docCoverage < 30 && totalTables > 0) {
    add('media', 'documentacao', null, null,
      `Cobertura de documentação muito baixa (${docCoverage}%)`,
      `Apenas ${documentedTables} de ${totalTables} tabelas e ${documentedColumns} de ${totalColumns} colunas têm comentário. O conhecimento do banco está só na cabeça das pessoas.`,
      `Usar a base de conhecimento do DBScanner para registrar o significado dos objetos mais críticos primeiro (os de maior volume/uso).`);
  }

  return {
    insights,
    inferredRelations,
    metrics: {
      totalTables,
      totalColumns,
      totalRelations: snapshot.relations.length,
      inferredRelations: inferredRelations.length,
      docCoverage,
      tablesWithoutPk: snapshot.tables.filter((t) => !t.hasPk).length,
      sensitiveColumns: insights.filter((i) => i.category === 'lgpd').length,
      bySeverity: countBy(insights, 'severity'),
      byCategory: countBy(insights, 'category'),
    },
  };
}

function countBy(arr, key) {
  const out = {};
  for (const item of arr) out[item[key]] = (out[item[key]] || 0) + 1;
  return out;
}

function fmtRows(n) {
  if (n == null) return '?';
  return n.toLocaleString('pt-BR');
}

module.exports = { analyze };
