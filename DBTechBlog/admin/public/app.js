// Suporta rodar tanto na raiz do domínio quanto montado num sub-caminho
// (ex. https://dominio/admin/) sem precisar trocar cada chamada /api/...
const API = window.location.pathname.replace(/\/$/, '');
let token = localStorage.getItem('admin_token') || '';
let categories = [];
let editingSlug = null;

const $ = (id) => document.getElementById(id);

function authHeaders() {
	return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function api(path, options = {}) {
	const res = await fetch(API + path, {
		...options,
		headers: { ...authHeaders(), ...(options.headers || {}) },
	});
	if (res.status === 401) {
		logout();
		throw new Error('Sessão expirada, entre novamente.');
	}
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data.error || 'Erro na requisição');
	return data;
}

function showApp() {
	$('login-view').classList.add('hidden');
	$('app-view').classList.remove('hidden');
	loadCategories().then(loadPosts);
}

function showLogin() {
	$('app-view').classList.add('hidden');
	$('login-view').classList.remove('hidden');
}

function logout() {
	token = '';
	localStorage.removeItem('admin_token');
	showLogin();
}

$('login-btn').addEventListener('click', async () => {
	const password = $('login-password').value;
	$('login-error').classList.add('hidden');
	try {
		const res = await fetch(API + '/api/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password }),
		});
		const data = await res.json();
		if (!res.ok) throw new Error(data.error || 'Falha no login');
		token = data.token;
		localStorage.setItem('admin_token', token);
		showApp();
	} catch (err) {
		$('login-error').textContent = err.message;
		$('login-error').classList.remove('hidden');
	}
});

$('login-password').addEventListener('keydown', (e) => {
	if (e.key === 'Enter') $('login-btn').click();
});

$('logout-btn').addEventListener('click', logout);

// ---- tabs ----
document.querySelectorAll('.tab').forEach((tab) => {
	tab.addEventListener('click', () => {
		document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
		tab.classList.add('active');
		$('tab-posts').classList.toggle('hidden', tab.dataset.tab !== 'posts');
		$('tab-grupos').classList.toggle('hidden', tab.dataset.tab !== 'grupos');
	});
});

// ---- categorias ----
async function loadCategories() {
	categories = await api('/api/categories');
	renderCategories();
	renderCategorySelect();
}

function renderCategorySelect() {
	const sel = $('post-cat');
	sel.innerHTML = '<option value="">(sem grupo)</option>' +
		categories.map((c) => `<option value="${c}">${c}</option>`).join('');
}

function renderCategories() {
	const list = $('cats-list');
	if (!categories.length) {
		list.innerHTML = '<p class="empty">Nenhum grupo ainda.</p>';
		return;
	}
	list.innerHTML = categories
		.map(
			(c) => `
		<div class="cat-row">
			<span>${c}</span>
			<button class="btn-sm btn-danger" data-del-cat="${c}">Apagar</button>
		</div>`,
		)
		.join('');
	list.querySelectorAll('[data-del-cat]').forEach((btn) => {
		btn.addEventListener('click', async () => {
			if (!confirm(`Apagar o grupo "${btn.dataset.delCat}"?`)) return;
			try {
				categories = await api(`/api/categories/${encodeURIComponent(btn.dataset.delCat)}`, {
					method: 'DELETE',
				});
				renderCategories();
				renderCategorySelect();
			} catch (err) {
				alert(err.message);
			}
		});
	});
}

$('new-cat-btn').addEventListener('click', async () => {
	const name = $('new-cat-input').value.trim();
	if (!name) return;
	try {
		categories = await api('/api/categories', {
			method: 'POST',
			body: JSON.stringify({ name }),
		});
		$('new-cat-input').value = '';
		renderCategories();
		renderCategorySelect();
	} catch (err) {
		alert(err.message);
	}
});

// ---- posts ----
let allPosts = [];

async function loadPosts() {
	allPosts = await api('/api/posts');
	renderPosts();
}

function renderPosts() {
	$('posts-count').textContent = `${allPosts.length} post(s)`;
	const list = $('posts-list');
	if (!allPosts.length) {
		list.innerHTML = '<p class="empty">Nenhum post ainda. Clique em "+ Novo post".</p>';
		return;
	}
	list.innerHTML = allPosts
		.map(
			(p) => `
		<div class="post-row">
			<div class="info">
				${p.category ? `<span class="tag">${p.category}</span>` : ''}
				<h3>${p.title}</h3>
				<div class="meta">${new Date(p.pubDate).toLocaleDateString('pt-BR')} — ${p.description}</div>
			</div>
			<div class="actions">
				<button class="btn-sm btn-ghost" data-edit="${p.slug}">Editar</button>
				<button class="btn-sm btn-danger" data-del="${p.slug}">Apagar</button>
			</div>
		</div>`,
		)
		.join('');

	list.querySelectorAll('[data-edit]').forEach((btn) => {
		btn.addEventListener('click', () => openEdit(btn.dataset.edit));
	});
	list.querySelectorAll('[data-del]').forEach((btn) => {
		btn.addEventListener('click', async () => {
			if (!confirm('Apagar este post? Não dá pra desfazer.')) return;
			try {
				await api(`/api/posts/${btn.dataset.del}`, { method: 'DELETE' });
				await loadPosts();
			} catch (err) {
				alert(err.message);
			}
		});
	});
}

function openModal(title) {
	$('post-modal-title').textContent = title;
	$('post-modal-error').classList.add('hidden');
	$('post-modal').classList.remove('hidden');
}
function closeModal() {
	$('post-modal').classList.add('hidden');
}

$('new-post-btn').addEventListener('click', () => {
	editingSlug = null;
	$('post-slug').value = '';
	$('post-title').value = '';
	$('post-desc').value = '';
	$('post-cat').value = '';
	$('post-date').value = new Date().toISOString().slice(0, 10);
	$('post-content').value = '';
	openModal('Novo post');
});

async function openEdit(slug) {
	try {
		const post = await api(`/api/posts/${slug}`);
		editingSlug = slug;
		$('post-slug').value = slug;
		$('post-title').value = post.title || '';
		$('post-desc').value = post.description || '';
		$('post-cat').value = post.category || '';
		$('post-date').value = new Date(post.pubDate).toISOString().slice(0, 10);
		$('post-content').value = post.content || '';
		openModal('Editar post');
	} catch (err) {
		alert(err.message);
	}
}

$('post-cancel-btn').addEventListener('click', closeModal);

$('post-save-btn').addEventListener('click', async () => {
	const body = {
		title: $('post-title').value.trim(),
		description: $('post-desc').value.trim(),
		category: $('post-cat').value || undefined,
		pubDate: $('post-date').value,
		content: $('post-content').value,
	};
	if (!body.title || !body.description) {
		$('post-modal-error').textContent = 'Título e resumo são obrigatórios.';
		$('post-modal-error').classList.remove('hidden');
		return;
	}
	try {
		if (editingSlug) {
			await api(`/api/posts/${editingSlug}`, { method: 'PUT', body: JSON.stringify(body) });
		} else {
			await api('/api/posts', { method: 'POST', body: JSON.stringify(body) });
		}
		closeModal();
		await loadPosts();
	} catch (err) {
		$('post-modal-error').textContent = err.message;
		$('post-modal-error').classList.remove('hidden');
	}
});

// ---- publicar ----
$('publish-btn').addEventListener('click', async () => {
	const msg = $('global-msg');
	msg.className = 'msg';
	msg.textContent = 'Publicando (pode levar alguns segundos)...';
	$('publish-btn').disabled = true;
	try {
		const data = await api('/api/publish', { method: 'POST' });
		msg.className = 'msg ok';
		msg.textContent = data.message;
	} catch (err) {
		msg.className = 'msg error';
		msg.textContent = err.message;
	} finally {
		$('publish-btn').disabled = false;
	}
});

// ---- boot ----
if (token) showApp();
else showLogin();
