// Alternar entre abas
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    const btns = document.querySelectorAll('.tab-btn');

    tabs.forEach(tab => tab.classList.remove('active'));
    btns.forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Carregar configuração ao iniciar
window.addEventListener('DOMContentLoaded', () => {
    loadConfiguration();
});

// Carregar configuração da API
function loadConfiguration() {
    fetch('/api/config')
        .then(response => response.json())
        .then(config => {
            // Oracle
            document.getElementById('oracle_host').value = config.oracle?.host || '';
            document.getElementById('oracle_port').value = config.oracle?.port || 1521;
            document.getElementById('oracle_instance').value = config.oracle?.instance || '';
            document.getElementById('oracle_username').value = config.oracle?.username || '';
            document.getElementById('oracle_password').value = config.oracle?.password || '';

            // Email
            document.getElementById('email_address').value = config.email?.email || '';
            document.getElementById('email_password').value = config.email?.app_password || '';
            document.getElementById('email_smtp').value = config.email?.smtp_server || 'smtp.gmail.com';
            document.getElementById('email_port').value = config.email?.smtp_port || 587;

            // Schedule
            document.getElementById('schedule_enabled').checked = config.schedule?.enabled || false;
            document.getElementById('schedule_time').value = config.schedule?.time || '05:50';
        })
        .catch(error => console.error('Erro ao carregar configuração:', error));
}

// Salvar configuração
function saveConfiguration() {
    const config = {
        oracle: {
            host: document.getElementById('oracle_host').value,
            port: parseInt(document.getElementById('oracle_port').value),
            username: document.getElementById('oracle_username').value,
            password: document.getElementById('oracle_password').value,
            instance: document.getElementById('oracle_instance').value,
            service_name: ''
        },
        email: {
            smtp_server: document.getElementById('email_smtp').value,
            smtp_port: parseInt(document.getElementById('email_port').value),
            email: document.getElementById('email_address').value,
            app_password: document.getElementById('email_password').value
        },
        schedule: {
            enabled: document.getElementById('schedule_enabled').checked,
            time: document.getElementById('schedule_time').value
        }
    };

    fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(result => {
        showMessage('✅ Configuração salva com sucesso!', 'success');
    })
    .catch(error => {
        showMessage('❌ Erro ao salvar: ' + error, 'error');
    });
}

// Testar conexão Oracle
function testOracleConnection() {
    const config = {
        oracle: {
            host: document.getElementById('oracle_host').value,
            port: parseInt(document.getElementById('oracle_port').value),
            username: document.getElementById('oracle_username').value,
            password: document.getElementById('oracle_password').value,
            instance: document.getElementById('oracle_instance').value
        }
    };

    showLoading(true);

    fetch('/api/test-oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    })
    .then(response => response.json())
    .then(result => {
        showLoading(false);
        if (result.status === 'success') {
            showMessage('✅ Conexão Oracle bem-sucedida!', 'success');
        } else {
            showMessage('❌ Erro: ' + result.message, 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        showMessage('❌ Erro ao testar conexão: ' + error, 'error');
    });
}

// Executar monitoramento agora
function runNow() {
    showLoading(true);
    const resultArea = document.getElementById('result-area');
    resultArea.innerHTML = '<p>Executando monitoramento, aguarde...</p>';

    fetch('/api/run-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(result => {
        showLoading(false);
        if (result.status === 'success') {
            document.getElementById('result-area').innerHTML = result.report;
            showMessage('✅ Monitoramento executado e email enviado!', 'success');
        } else {
            document.getElementById('result-area').innerHTML = '<p class="status-error">❌ Erro: ' + result.message + '</p>';
            showMessage('❌ Erro: ' + result.message, 'error');
        }
    })
    .catch(error => {
        showLoading(false);
        document.getElementById('result-area').innerHTML = '<p class="status-error">❌ Erro: ' + error + '</p>';
        showMessage('❌ Erro ao executar: ' + error, 'error');
    });
}

// Salvar agendamento
function saveSchedule() {
    saveConfiguration();
}

// Download do relatório
function downloadReport() {
    const html = document.getElementById('result-area').innerHTML;
    if (!html || html.includes('Clique em')) {
        showMessage('❌ Execute o monitoramento primeiro!', 'error');
        return;
    }

    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    link.download = `DBHealthCheck_${timestamp}.html`;
    link.click();
}

// Funções auxiliares
function showMessage(message, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.textContent = message;
    document.body.insertBefore(div, document.body.firstChild);

    setTimeout(() => div.remove(), 5000);
}

function showLoading(show) {
    const loader = document.querySelector('.loading') || createLoader();
    loader.style.display = show ? 'block' : 'none';
}

function createLoader() {
    const div = document.createElement('div');
    div.className = 'loading';
    div.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(div);
    return div;
}
