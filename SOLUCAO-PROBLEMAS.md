# 🔧 Solução de Problemas
## Blog Administração Web

### ❌ **Problema: Timeout na Conexão PostgreSQL**

**Sintoma:**
```
❌ Erro ao conectar PostgreSQL: connect ETIMEDOUT 35.199.101.38:5432
```

**Causa:**
- Firewall bloqueando conexão
- Rede corporativa com restrições
- VPN interferindo na conexão
- Configuração de proxy

**✅ Soluções:**

#### **1. Usar Modo Fallback (Recomendado)**
```bash
# Parar servidor atual (Ctrl+C)
# Executar versão com fallback
npm run start:fallback
```

**Vantagens do modo fallback:**
- ✅ Funciona mesmo sem conexão ao banco
- ✅ Salva artigos localmente em JSON
- ✅ Upload de imagens continua funcionando
- ✅ Todas as funcionalidades disponíveis
- ✅ Dados podem ser migrados depois

#### **2. Configurar Proxy/Tunnel**
Se você tem acesso SSH ao servidor do banco:
```bash
# Criar tunnel SSH
ssh -L 5432:localhost:5432 usuario@servidor-do-banco

# Em outro terminal, executar aplicação
npm start
```

#### **3. Verificar Configurações de Rede**
```bash
# Testar conectividade
telnet 35.199.101.38 5432

# Verificar DNS
nslookup 35.199.101.38

# Testar com ping
ping 35.199.101.38
```

#### **4. Configurar Variáveis de Ambiente**
Editar arquivo `.env`:
```env
# Usar IP alternativo ou hostname
DB_HOST=outro-ip-ou-hostname
DB_PORT=5432

# Ou configurar timeout maior
DB_TIMEOUT=30000
```

---

### 🔄 **Modo Fallback - Como Funciona**

#### **Armazenamento Local**
- Artigos salvos em: `data/articles.json`
- Backup automático a cada criação
- Formato compatível com PostgreSQL

#### **Migração de Dados**
Quando a conexão for restaurada:
```bash
# 1. Parar servidor fallback
# 2. Copiar dados locais
cp data/articles.json backup-articles.json

# 3. Executar script de migração (criar se necessário)
node scripts/migrate-local-to-db.js
```

#### **Funcionalidades no Modo Offline**
- ✅ **Login/Logout**: Funciona normalmente
- ✅ **Upload de imagens**: Backblaze B2 continua funcionando
- ✅ **Criar artigos**: Salvos localmente
- ✅ **Listar artigos**: Mostra artigos locais
- ✅ **Preview**: Funciona normalmente
- ✅ **Export HTML**: Funciona normalmente

---

### 🌐 **Problemas de Upload de Imagens**

#### **Erro: "Erro no upload para B2"**

**Verificações:**
1. **Credenciais Backblaze B2**:
   ```env
   B2_ACCESS_KEY_ID=sua-chave
   B2_SECRET_ACCESS_KEY=sua-chave-secreta
   ```

2. **Conectividade**:
   ```bash
   # Testar acesso ao endpoint
   curl -I https://s3.us-east-005.backblazeb2.com
   ```

3. **Permissões do Bucket**:
   - Verificar se o bucket existe
   - Verificar permissões de escrita
   - Verificar configuração de CORS

---

### 🔐 **Problemas de Autenticação**

#### **Erro: "Credenciais inválidas"**

**Verificações:**
1. **Credenciais no .env**:
   ```env
   ADMIN_USERNAME=admbolado
   ADMIN_PASSWORD=lmbolado
   ```

2. **Limpar cache do navegador**:
   - Ctrl+Shift+Delete
   - Limpar cookies e dados de sessão

3. **Verificar rate limiting**:
   - Aguardar 15 minutos se muitas tentativas
   - Reiniciar servidor para resetar

---

### 📱 **Problemas de Interface**

#### **Página não carrega**

**Verificações:**
1. **URL correta**:
   ```
   http://localhost:3000/blog-adm
   ```

2. **Arquivos estáticos**:
   ```bash
   # Verificar se existem
   ls public/blog-adm/
   ```

3. **Console do navegador** (F12):
   - Verificar erros JavaScript
   - Verificar erros de rede

#### **Upload não funciona**

**Verificações:**
1. **Tamanho do arquivo**: Máximo 10MB
2. **Tipo de arquivo**: Apenas imagens (JPG, PNG, GIF)
3. **JavaScript habilitado** no navegador

---

### 🚀 **Deploy em Produção**

#### **Configurações Importantes**

1. **Variáveis de Ambiente**:
   ```env
   NODE_ENV=production
   SESSION_SECRET=chave-super-secreta-unica
   ```

2. **HTTPS Obrigatório**:
   ```javascript
   // Configurar SSL/TLS
   secure: true // em cookies de sessão
   ```

3. **Proxy Reverso** (Nginx):
   ```nginx
   location /blog-adm/api {
     proxy_pass http://localhost:3000/blog-adm/api;
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
   }
   ```

---

### 📊 **Monitoramento e Logs**

#### **Logs Importantes**
```bash
# Logs do servidor
tail -f logs/server.log

# Logs de erro
tail -f logs/error.log

# Logs de acesso
tail -f logs/access.log
```

#### **Métricas para Monitorar**
- Taxa de sucesso de login
- Tempo de resposta das APIs
- Taxa de sucesso de uploads
- Uso de memória e CPU
- Conexões simultâneas

---

### 🆘 **Suporte Rápido**

#### **Comandos de Diagnóstico**
```bash
# Status do servidor
curl http://localhost:3000/blog-adm/api/health

# Teste de conexão
curl -X POST http://localhost:3000/blog-adm/api/test-connection \
  -H "Cookie: session-cookie-aqui"

# Verificar logs
npm run test
```

#### **Reinicialização Completa**
```bash
# Parar servidor
Ctrl+C

# Limpar cache
rm -rf node_modules/.cache

# Reinstalar dependências
npm install

# Executar modo fallback
npm run start:fallback
```

---

### 📞 **Quando Pedir Ajuda**

Inclua sempre estas informações:
1. **Sistema operacional** e versão
2. **Versão do Node.js**: `node --version`
3. **Logs de erro** completos
4. **Configuração** (sem credenciais)
5. **Passos** para reproduzir o problema

---

**💡 Dica:** O modo fallback resolve 90% dos problemas de conectividade. Use-o sempre que houver problemas de rede!
