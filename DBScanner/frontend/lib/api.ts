import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4200',
});

export default api;

export type Scan = {
  id: number;
  database_id: number;
  database_name: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  summary?: {
    schema: string;
    vendor: string;
    version: string;
    otherObjects: Record<string, number>;
    metrics: {
      totalTables: number;
      totalColumns: number;
      totalRelations: number;
      inferredRelations: number;
      docCoverage: number;
      knowledgeIndex: number;
      knowledgeEntries: number;
      tablesWithoutPk: number;
      sensitiveColumns: number;
      bySeverity: Record<string, number>;
      byCategory: Record<string, number>;
    };
  };
};

export type Insight = {
  id: number;
  severity: 'alta' | 'media' | 'baixa' | 'info';
  category: string;
  object_name: string | null;
  column_name: string | null;
  title: string;
  detail: string;
  recommendation: string;
};

export type TableRow = {
  name: string;
  num_rows: number | null;
  comments: string | null;
  has_pk: number;
  column_count: number;
  insight_count: number;
};

export type KnowledgeEntry = {
  id: number;
  database_id: number;
  object_name: string;
  column_name: string | null;
  business_name: string | null;
  description: string | null;
  tags: string | null;
  updated_at: string;
};
