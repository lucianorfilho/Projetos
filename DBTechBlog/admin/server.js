require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const matter = require('gray-matter');

const PORT = process.env.PORT || 4400;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const BLOG_DIR = path.resolve(__dirname, '../src/content/blog');
const CATEGORIES_FILE = path.resolve(__dirname, '../src/content/categories.json');
const BLOG_ROOT = path.resolve(__dirname, '..');
const DEPLOY_TARGET = process.env.DEPLOY_TARGET || ''; // ex: /var/www/dbtechsolutions/html

if (!JWT_SECRET || !ADMIN_PASSWORD_HASH) {
	console.error('JWT_SECRET e ADMIN_PASSWORD_HASH precisam estar definidos no .env');
	process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- auth ----------

function auth(req, res, next) {
	const header = req.headers.authorization || '';
	const token = header.startsWith('Bearer ') ? header.slice(7) : null;
	if (!token) return res.status(401).json({ error: 'Sem token' });
	try {
		req.user = jwt.verify(token, JWT_SECRET);
		next();
	} catch {
		res.status(401).json({ error: 'Token inválido ou expirado' });
	}
}

app.post('/api/login', async (req, res) => {
	const { password } = req.body || {};
	if (!password) return res.status(400).json({ error: 'Senha obrigatória' });
	const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
	if (!valid) return res.status(401).json({ error: 'Senha incorreta' });
	const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
	res.json({ token });
});

// ---------- helpers ----------

function slugify(title) {
	return title
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function readPost(slug) {
	const file = path.join(BLOG_DIR, `${slug}.md`);
	if (!fs.existsSync(file)) return null;
	const raw = fs.readFileSync(file, 'utf8');
	const parsed = matter(raw);
	return { slug, ...parsed.data, content: parsed.content.trim() };
}

function writePost(slug, data, content) {
	const file = path.join(BLOG_DIR, `${slug}.md`);
	const fileContent = matter.stringify(content || '', data);
	fs.writeFileSync(file, fileContent, 'utf8');
}

// ---------- categorias (grupos) ----------

function readCategories() {
	if (!fs.existsSync(CATEGORIES_FILE)) return [];
	return JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));
}

function writeCategories(list) {
	fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(list, null, 2) + '\n', 'utf8');
}

app.get('/api/categories', auth, (req, res) => {
	res.json(readCategories());
});

app.post('/api/categories', auth, (req, res) => {
	const { name } = req.body || {};
	if (!name || !name.trim()) return res.status(400).json({ error: 'Nome do grupo obrigatório' });
	const list = readCategories();
	if (list.some((c) => c.toLowerCase() === name.trim().toLowerCase())) {
		return res.status(409).json({ error: 'Esse grupo já existe' });
	}
	list.push(name.trim());
	writeCategories(list);
	res.status(201).json(list);
});

app.delete('/api/categories/:name', auth, (req, res) => {
	const name = decodeURIComponent(req.params.name);
	const inUse = fs
		.readdirSync(BLOG_DIR)
		.filter((f) => f.endsWith('.md'))
		.some((f) => matter(fs.readFileSync(path.join(BLOG_DIR, f), 'utf8')).data.category === name);
	if (inUse) {
		return res
			.status(409)
			.json({ error: 'Existem posts usando esse grupo. Mude o grupo deles antes de apagar.' });
	}
	const list = readCategories().filter((c) => c !== name);
	writeCategories(list);
	res.json(list);
});

// ---------- posts ----------

app.get('/api/posts', auth, (req, res) => {
	const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
	const posts = files.map((f) => {
		const slug = f.replace(/\.md$/, '');
		const { data } = matter(fs.readFileSync(path.join(BLOG_DIR, f), 'utf8'));
		return { slug, ...data };
	});
	posts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
	res.json(posts);
});

app.get('/api/posts/:slug', auth, (req, res) => {
	const post = readPost(req.params.slug);
	if (!post) return res.status(404).json({ error: 'Post não encontrado' });
	res.json(post);
});

app.post('/api/posts', auth, (req, res) => {
	const { title, description, category, content, pubDate } = req.body || {};
	if (!title || !description) {
		return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
	}
	let slug = slugify(title);
	let candidate = slug;
	let i = 2;
	while (fs.existsSync(path.join(BLOG_DIR, `${candidate}.md`))) {
		candidate = `${slug}-${i++}`;
	}
	slug = candidate;

	const data = {
		title,
		description,
		pubDate: pubDate || new Date().toISOString().slice(0, 10),
	};
	if (category) data.category = category;

	writePost(slug, data, content || '');
	res.status(201).json({ slug, ...data });
});

app.put('/api/posts/:slug', auth, (req, res) => {
	const existing = readPost(req.params.slug);
	if (!existing) return res.status(404).json({ error: 'Post não encontrado' });

	const { title, description, category, content, pubDate } = req.body || {};
	const data = {
		title: title ?? existing.title,
		description: description ?? existing.description,
		pubDate: pubDate ?? existing.pubDate,
	};
	const finalCategory = category ?? existing.category;
	if (finalCategory) data.category = finalCategory;

	writePost(req.params.slug, data, content ?? existing.content);
	res.json({ slug: req.params.slug, ...data });
});

app.delete('/api/posts/:slug', auth, (req, res) => {
	const file = path.join(BLOG_DIR, `${req.params.slug}.md`);
	if (!fs.existsSync(file)) return res.status(404).json({ error: 'Post não encontrado' });
	fs.unlinkSync(file);
	res.json({ ok: true });
});

// ---------- publicar (build + opcionalmente copiar pro Nginx) ----------

app.post('/api/publish', auth, (req, res) => {
	const npmBin = process.env.NPM_BIN || (process.platform === 'win32' ? 'npm.cmd' : 'npm');
	execFile(
		npmBin,
		['run', 'build'],
		{ cwd: BLOG_ROOT, timeout: 120000 },
		(err, stdout, stderr) => {
			if (err) {
				console.error(stderr);
				return res.status(500).json({ error: 'Falha no build', detail: stderr?.slice(-2000) });
			}
			if (!DEPLOY_TARGET) {
				return res.json({ ok: true, deployed: false, message: 'Build concluído (DEPLOY_TARGET não configurado).' });
			}
			const src = path.join(BLOG_ROOT, 'dist');
			try {
				fs.cpSync(src, DEPLOY_TARGET, { recursive: true });
				res.json({ ok: true, deployed: true, message: 'Build concluído e publicado.' });
			} catch (copyErr) {
				res.status(500).json({ error: 'Build ok, mas falhou ao copiar para o destino', detail: String(copyErr) });
			}
		},
	);
});

app.listen(PORT, () => {
	console.log(`DBTechBlog Admin API rodando na porta ${PORT}`);
});
