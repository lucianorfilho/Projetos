#!/usr/bin/env python3
"""
Teste de desempenho DBVendas - Simula múltiplos usuários acessando o cardápio
"""

from locust import HttpUser, task, between
import random
import time

class DBVendasUser(HttpUser):
    wait_time = between(1, 3)  # Espera 1-3 segundos entre requisições

    def on_start(self):
        """Executado quando o usuário inicia"""
        self.codigo_acesso = "EVENTO2024"
        self.nome_usuario = f"Usuario_{random.randint(1000, 9999)}"

    @task(10)  # 10x mais comum que outras tasks
    def carregar_produtos(self):
        """Carrega lista de produtos do cardápio"""
        self.client.get("/produtos", name="/produtos")

    @task(2)
    def validar_codigo_acesso(self):
        """Valida o código de acesso do evento"""
        self.client.get("/evento/config", name="/evento/config")

    @task(3)
    def fazer_pre_compra(self):
        """Simula criação de pré-compra"""
        payload = {
            "cliente_nome": self.nome_usuario,
            "itens": [
                {"produto_id": 1, "quantidade": random.randint(1, 3)},
                {"produto_id": 2, "quantidade": random.randint(1, 2)},
            ]
        }
        self.client.post(
            f"/pre-vendas?codigo_acesso={self.codigo_acesso}",
            json=payload,
            name="/pre-vendas"
        )

    @task(1)
    def consultar_pre_venda(self):
        """Consulta status de uma pré-venda"""
        pre_venda_id = random.randint(1, 100)
        self.client.get(f"/pre-vendas/{pre_venda_id}", name="/pre-vendas/{id}")
