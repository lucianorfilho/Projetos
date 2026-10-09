# DBSpeaker

**Conversação em inglês com IA** — converse, seja corrigido, evolua de nível.
Parte da família de produtos **dbtech solutions** (DBVault, DBView, DBScanner…).

## O que ele faz

- 💬 **Motor de diálogo adaptativo**: o tutor "Alex" conversa como um estrangeiro amigável e ajusta a profundidade das perguntas ao seu nível (A1 → C2).
- ✍️ **Correção inteligente**: base de conhecimento com os erros típicos de brasileiros (falsos cognatos, "I have 30 years", "make a question", 3ª pessoa, preposições…) com explicação em português.
- 📊 **Perfil do aluno**: cada mensagem é analisada (vocabulário, gramática, complexidade, erros) e o nível CEFR é recalculado com média móvel — a conversa aprofunda conforme você evolui.
- 🎤 **Pronúncia**: exercícios focados nos sons difíceis para brasileiros (TH, -ED, H aspirado, ship/sheep…), com nota palavra a palavra via reconhecimento de voz.
- 📚 **Vocabulário**: base por nível CEFR; o tutor sugere palavras um nível acima do seu e acompanha o domínio.

## Arquitetura

| Parte | Stack | Porta |
|---|---|---|
| backend | Express + better-sqlite3 | **4300** |
| frontend | Next.js + Tailwind + Web Speech API | **3300** |

### Dois motores de diálogo

1. **Local** (padrão): inteligência embarcada — cenários, regras e heurísticas. Funciona sem nenhuma chave.
2. **Claude** (recomendado): defina `ANTHROPIC_API_KEY` no `backend/.env` e o tutor passa a usar a API da Anthropic com correções muito mais ricas. Se a API falhar, cai automaticamente no motor local.

## Como rodar

```bash
# backend
cd backend
copy .env.example .env   # opcional: adicionar ANTHROPIC_API_KEY
npm install
npm run dev              # http://localhost:4300

# frontend (outro terminal)
cd frontend
npm install
npm run dev              # http://localhost:3300
```

> 🎤 O microfone (speaking) usa a Web Speech API — funciona no **Chrome** e **Edge**.

## Banco de dados

SQLite em `backend/data/dbspeaker.db`: alunos, sessões, mensagens, correções, progresso de vocabulário, tentativas de pronúncia e histórico de nível.
