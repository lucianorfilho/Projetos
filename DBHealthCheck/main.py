import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from flask import Flask, render_template, request, jsonify
import threading
import schedule
import time
from pathlib import Path

try:
    import cx_Oracle
    ORACLE_AVAILABLE = True
except ImportError:
    ORACLE_AVAILABLE = False
    print("[WARNING] cx_Oracle nao instalado. Para usar, instale: pip install cx_Oracle")
    print("    Voce precisara do Oracle Instant Client.")

app = Flask(__name__, template_folder='templates', static_folder='static')

CONFIG_FILE = 'config.json'

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

def get_oracle_info(config):
    if not ORACLE_AVAILABLE:
        return {
            'status': 'warning',
            'message': 'cx_Oracle não instalado. Modo de demonstração ativado.',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'tablespaces': {
                'USERS': {'total_mb': 10240, 'free_mb': 3072, 'used_mb': 7168, 'percent_used': 70.0},
                'SYSTEM': {'total_mb': 5120, 'free_mb': 1024, 'used_mb': 4096, 'percent_used': 80.0},
                'TEMP': {'total_mb': 2048, 'free_mb': 512, 'used_mb': 1536, 'percent_used': 75.0},
            },
            'memory': {
                'sga_target': 2.5,
                'pga_aggregate_target': 1.0,
            },
            'backups': {'last_backup': '2026-09-01 22:30:00'}
        }

    try:
        oracle_config = config.get('oracle', {})
        dsn = cx_Oracle.makedsn(
            oracle_config['host'],
            oracle_config['port'],
            oracle_config['instance']
        )

        conn = cx_Oracle.connect(
            oracle_config['username'],
            oracle_config['password'],
            dsn
        )
        cursor = conn.cursor()

        info = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'tablespaces': {},
            'memory': {},
            'backups': {},
            'status': 'success'
        }

        cursor.execute("""
            SELECT tablespace_name, sum(bytes)/1024/1024 as mb_total,
                   sum(decode(free_space,NULL,0,free_space))/1024/1024 as mb_free
            FROM dba_data_files
            GROUP BY tablespace_name
        """)
        for row in cursor.fetchall():
            info['tablespaces'][row[0]] = {
                'total_mb': float(row[1]),
                'free_mb': float(row[2]),
                'used_mb': float(row[1] - row[2]),
                'percent_used': round((float(row[1] - row[2]) / float(row[1]) * 100), 2) if row[1] > 0 else 0
            }

        cursor.execute("SELECT name, value FROM v$parameter WHERE name LIKE '%sga%'")
        for row in cursor.fetchall():
            if 'sga' in row[0].lower():
                info['memory'][row[0]] = float(row[1]) / 1024 / 1024 / 1024

        cursor.execute("SELECT name, value FROM v$parameter WHERE name LIKE '%pga%'")
        for row in cursor.fetchall():
            if 'pga' in row[0].lower():
                info['memory'][row[0]] = float(row[1]) / 1024 / 1024 / 1024

        cursor.execute("""
            SELECT MAX(completion_time) FROM v$backup_set
            WHERE status = 'COMPLETED'
        """)
        backup_date = cursor.fetchone()[0]
        if backup_date:
            info['backups']['last_backup'] = backup_date.strftime('%Y-%m-%d %H:%M:%S')
        else:
            info['backups']['last_backup'] = 'Nenhum backup encontrado'

        cursor.close()
        conn.close()

        return info
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

def get_disk_info():
    import shutil
    try:
        disk_info = {}
        for drive in 'CDEFGHIJ':
            drive_path = f'{drive}:\\'
            if os.path.exists(drive_path):
                usage = shutil.disk_usage(drive_path)
                disk_info[drive] = {
                    'total_gb': usage.total / 1024 / 1024 / 1024,
                    'used_gb': usage.used / 1024 / 1024 / 1024,
                    'free_gb': usage.free / 1024 / 1024 / 1024,
                    'percent_used': round((usage.used / usage.total * 100), 2)
                }
        return disk_info
    except Exception as e:
        return {'error': str(e)}

def generate_report(config):
    oracle_info = get_oracle_info(config)
    disk_info = get_disk_info()

    report = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
            h1 {{ color: #333; border-bottom: 3px solid #0066cc; padding-bottom: 10px; }}
            h2 {{ color: #0066cc; margin-top: 30px; }}
            table {{ width: 100%; border-collapse: collapse; background-color: white; margin: 15px 0; }}
            th {{ background-color: #0066cc; color: white; padding: 12px; text-align: left; }}
            td {{ padding: 10px; border-bottom: 1px solid #ddd; }}
            tr:hover {{ background-color: #f9f9f9; }}
            .status-ok {{ color: green; font-weight: bold; }}
            .status-warning {{ color: orange; font-weight: bold; }}
            .status-error {{ color: red; font-weight: bold; }}
        </style>
    </head>
    <body>
        <h1>📊 DBHealthCheck - Relatório de Monitoramento</h1>
        <p><strong>Data/Hora:</strong> {oracle_info.get('timestamp', 'N/A')}</p>
    """

    if oracle_info.get('status') == 'success':
        # Tablespaces
        report += "<h2>📦 Tablespaces</h2><table><tr><th>Nome</th><th>Total (MB)</th><th>Livre (MB)</th><th>Usado (MB)</th><th>% Usado</th></tr>"
        for ts_name, ts_info in oracle_info.get('tablespaces', {}).items():
            status_class = 'status-warning' if ts_info['percent_used'] > 80 else 'status-ok'
            report += f"""
            <tr>
                <td>{ts_name}</td>
                <td>{ts_info['total_mb']:.2f}</td>
                <td>{ts_info['free_mb']:.2f}</td>
                <td>{ts_info['used_mb']:.2f}</td>
                <td class="{status_class}">{ts_info['percent_used']:.2f}%</td>
            </tr>
            """
        report += "</table>"

        # Memory
        report += "<h2>💾 Memória</h2><table><tr><th>Parâmetro</th><th>Valor (GB)</th></tr>"
        for mem_name, mem_value in oracle_info.get('memory', {}).items():
            report += f"<tr><td>{mem_name}</td><td>{mem_value:.2f}</td></tr>"
        report += "</table>"

        # Backups
        report += "<h2>💿 Último Backup</h2><table><tr><th>Data</th></tr>"
        report += f"<tr><td>{oracle_info.get('backups', {}).get('last_backup', 'N/A')}</td></tr>"
        report += "</table>"
    else:
        report += f"<p class='status-error'>❌ Erro ao conectar ao Oracle: {oracle_info.get('message', 'Erro desconhecido')}</p>"

    # Disk Info
    report += "<h2>💿 Espaço em Disco</h2><table><tr><th>Drive</th><th>Total (GB)</th><th>Livre (GB)</th><th>Usado (GB)</th><th>% Usado</th></tr>"
    for drive, info in disk_info.items():
        if 'error' not in info:
            status_class = 'status-warning' if info['percent_used'] > 85 else 'status-ok'
            report += f"""
            <tr>
                <td>{drive}:</td>
                <td>{info['total_gb']:.2f}</td>
                <td>{info['free_gb']:.2f}</td>
                <td>{info['used_gb']:.2f}</td>
                <td class="{status_class}">{info['percent_used']:.2f}%</td>
            </tr>
            """
    report += "</table></body></html>"

    return report

def send_email(config, report_html):
    try:
        email_config = config.get('email', {})

        if not email_config.get('email') or not email_config.get('app_password'):
            return {'status': 'warning', 'message': 'Email nao configurado. Configure credenciais para enviar.'}

        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"DBHealthCheck - Relatorio {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        msg['From'] = email_config['email']
        msg['To'] = email_config['email']

        msg.attach(MIMEText(report_html, 'html'))

        server = smtplib.SMTP(email_config['smtp_server'], email_config['smtp_port'])
        server.starttls()
        server.login(email_config['email'], email_config['app_password'])
        server.send_message(msg)
        server.quit()

        return {'status': 'success', 'message': 'Email enviado com sucesso!'}
    except Exception as e:
        return {'status': 'warning', 'message': 'Email nao enviado: ' + str(e)}

def run_scheduled_job():
    config = load_config()
    report = generate_report(config)
    result = send_email(config, report)
    print(f"[{datetime.now()}] Job executado: {result}")

def scheduler_worker():
    config = load_config()
    schedule_time = config.get('schedule', {}).get('time', '05:50')

    schedule.every().day.at(schedule_time).do(run_scheduled_job)

    while True:
        schedule.run_pending()
        time.sleep(60)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify(load_config())

@app.route('/api/config', methods=['POST'])
def update_config():
    config = request.json
    save_config(config)
    return jsonify({'status': 'success', 'message': 'Configuração salva!'})

@app.route('/api/test-oracle', methods=['POST'])
def test_oracle():
    config = request.json
    info = get_oracle_info(config)
    return jsonify(info)

@app.route('/api/run-now', methods=['POST'])
def run_now():
    config = load_config()
    report = generate_report(config)

    if not ORACLE_AVAILABLE:
        return jsonify({'status': 'success', 'message': '[MODO DEMONSTRACAO] Relatorio gerado (sem Oracle real). Email nao enviado.', 'report': report})

    result = send_email(config, report)
    return jsonify({**result, 'report': report})

@app.route('/api/disk-info', methods=['GET'])
def disk_info():
    return jsonify(get_disk_info())

if __name__ == '__main__':
    scheduler_thread = threading.Thread(target=scheduler_worker, daemon=True)
    scheduler_thread.start()

    app.run(host='localhost', port=5000, debug=False)
