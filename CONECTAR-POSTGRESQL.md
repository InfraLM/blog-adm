# 🐘 **CONECTAR POSTGRESQL - GUIA DEFINITIVO**
## Prioridade Máxima: Inserção no Banco

### 🎯 **SOLUÇÃO IMEDIATA**

**Pare o servidor atual** (Ctrl+C) e execute:

```bash
npm run start:postgresql
```

Este servidor tenta **4 configurações diferentes** automaticamente até conseguir conectar!

---

### 🔍 **Configurações Testadas Automaticamente**

#### **1. Conexão Direta** (Primeira tentativa)
```
Host: 35.199.101.38:5432
SSL: Desabilitado
Timeout: 10 segundos
```

#### **2. Conexão com SSL** (Segunda tentativa)
```
Host: 35.199.101.38:5432
SSL: Habilitado (sem verificação de certificado)
Timeout: 10 segundos
```

#### **3. Túnel SSH Local** (Terceira tentativa)
```
Host: localhost:5433
SSL: Desabilitado
Timeout: 5 segundos
```

#### **4. Porta Alternativa** (Quarta tentativa)
```
Host: 35.199.101.38:5433
SSL: Desabilitado
Timeout: 10 segundos
```

---

### 🚀 **Método 1: Servidor Inteligente (Recomendado)**

```bash
# Parar servidor atual
Ctrl+C

# Executar servidor com múltiplas tentativas
npm run start:postgresql

# O servidor tentará todas as configurações automaticamente
# Quando conectar, mostrará: "🎉 POSTGRESQL CONECTADO COM SUCESSO!"
```

**Vantagens:**
- ✅ Testa 4 configurações automaticamente
- ✅ Logs detalhados de cada tentativa
- ✅ Conecta na primeira configuração que funcionar
- ✅ Mostra qual configuração foi bem-sucedida

---

### 🔧 **Método 2: Túnel SSH Manual**

Se nenhuma configuração automática funcionar:

#### **Windows (PowerShell/CMD):**
```bash
# Abrir novo terminal
# Criar túnel SSH (substitua 'usuario' pelo seu usuário SSH)
ssh -L 5433:localhost:5432 vinilean@35.199.101.38

# Deixar este terminal aberto
# Em outro terminal, executar:
npm run start:postgresql
```

#### **Linux/Mac:**
```bash
# Terminal 1: Criar túnel
ssh -L 5433:localhost:5432 vinilean@35.199.101.38 -N

# Terminal 2: Executar aplicação
npm run start:postgresql
```

---

### 🔍 **Método 3: Diagnóstico Completo**

```bash
# Testar conectividade básica
ping 35.199.101.38

# Testar porta PostgreSQL (Windows)
telnet 35.199.101.38 5432

# Testar porta PostgreSQL (Linux/Mac)
nc -zv 35.199.101.38 5432

# Executar diagnóstico automático
npm run setup-tunnel
```

---

### 🌐 **Método 4: Configuração de Rede**

#### **Verificar Firewall Windows:**
```bash
# Executar como Administrador
netsh advfirewall firewall add rule name="PostgreSQL" dir=out action=allow protocol=TCP localport=5432
```

#### **Verificar Proxy Corporativo:**
Se você está em rede corporativa, pode ser necessário:
1. Configurar proxy no terminal
2. Usar VPN da empresa
3. Solicitar liberação da porta 5432 para o TI

#### **Configurar DNS:**
Adicionar no arquivo hosts (como Administrador):
```
# Windows: C:\Windows\System32\drivers\etc\hosts
# Linux/Mac: /etc/hosts
35.199.101.38 postgres-server
```

Depois usar:
```env
DB_HOST=postgres-server
```

---

### 📊 **Verificar Status da Conexão**

Após executar `npm run start:postgresql`, procure por:

#### **✅ SUCESSO:**
```
🎉 POSTGRESQL CONECTADO COM SUCESSO!
✅ Usando: Conexão Direta
📍 Endpoint: 35.199.101.38:5432
📄 Artigos existentes: X
```

#### **❌ FALHA:**
```
❌ TODAS AS TENTATIVAS DE CONEXÃO FALHARAM!
💡 SOLUÇÕES POSSÍVEIS:
1. Verificar se o servidor PostgreSQL está rodando
2. Verificar firewall/rede corporativa
3. Configurar túnel SSH
```

---

### 🎯 **Teste Específico de Inserção**

Quando conectar, teste criando um artigo:

1. **Acesse:** `http://localhost:3000/blog-adm`
2. **Login:** `admbolado` / `lmbolado`
3. **Preencha** um artigo de teste
4. **Clique** em "Publicar Artigo"
5. **Verifique** os logs do servidor

#### **Logs de Sucesso:**
```
📝 NOVA REQUISIÇÃO DE CRIAÇÃO DE ARTIGO:
📍 Conexão: Conexão Direta
💾 Executando INSERT no PostgreSQL...
🎉 ARTIGO INSERIDO COM SUCESSO NO POSTGRESQL!
🆔 ID: 123
```

---

### 🔧 **Configurações Avançadas**

#### **Arquivo .env Personalizado:**
```env
# Configuração específica que funciona
DB_HOST=35.199.101.38
DB_PORT=5432
DB_NAME=liberdade-medica
DB_USER=vinilean
DB_PASSWORD=-Infra55LM-
DB_SSL=false
DB_TIMEOUT=30000
```

#### **Configuração de Proxy:**
```env
# Se usar proxy corporativo
HTTP_PROXY=http://proxy.empresa.com:8080
HTTPS_PROXY=http://proxy.empresa.com:8080
```

---

### 🆘 **Solução de Emergência**

Se **NADA** funcionar, use temporariamente:

```bash
# Modo híbrido: PostgreSQL + Fallback local
npm run start:fallback

# Artigos salvos localmente em data/articles.json
# Podem ser migrados depois para o banco
```

---

### 📞 **Suporte Técnico**

#### **Informações para Coleta:**

1. **Sistema Operacional:** Windows/Linux/Mac + versão
2. **Rede:** Corporativa/Residencial/VPN
3. **Logs completos** do servidor
4. **Resultado dos testes:**
   ```bash
   ping 35.199.101.38
   telnet 35.199.101.38 5432
   npm run setup-tunnel
   ```

#### **Comandos de Diagnóstico:**
```bash
# Verificar conectividade
npm run test-db

# Logs detalhados
npm run start:postgresql > logs.txt 2>&1

# Testar configurações
node scripts/setup-db-tunnel.js test
```

---

### 🎉 **Objetivo Final**

**SUCESSO = Ver esta mensagem:**

```
🎉 ARTIGO INSERIDO COM SUCESSO NO POSTGRESQL!
=============================================
🆔 ID: 123
🔗 Slug: meu-artigo-teste
📝 Título: Meu Artigo de Teste
📍 Conexão: Conexão Direta
=============================================
```

**🎯 Execute agora: `npm run start:postgresql`**
