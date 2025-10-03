# 🌐 Blog Administração Web
## Sistema de Gestão - Liberdade Médica

Aplicação web completa para administração do blog, com sistema de autenticação, upload de imagens e criação de artigos.

---

## 🚀 **Funcionalidades**

### 🔐 **Sistema de Autenticação**
- Login seguro com credenciais únicas
- Sessões protegidas com cookies httpOnly
- Rate limiting para tentativas de login
- Logout automático por inatividade

### 📝 **Criação de Artigos**
- **Campos principais**: título, categoria, autor
- **Novos campos**: co-autor, resumo, destaque
- **Sistema de blocos**: texto e imagens intercalados
- **Preview em tempo real** do artigo

### 🖼️ **Upload de Imagens**
- **Integração com Backblaze B2** para armazenamento
- **Interface drag & drop** intuitiva
- **Validação de arquivos** (tipo e tamanho)
- **Preview imediato** das imagens
- **URLs públicas** automáticas

### 🛡️ **Segurança**
- Headers de segurança (Helmet.js)
- Proteção CSRF
- Rate limiting por IP
- Validação de entrada rigorosa
- Sessões seguras

---

## 🏗️ **Arquitetura**

```
blog-adm/
├── src/
│   └── server.js           # Servidor Express com APIs
├── public/blog-adm/
│   ├── index.html          # Interface principal
│   ├── app.js              # JavaScript da aplicação
│   ├── styles.css          # Estilos principais
│   ├── styles-upload.css   # Estilos para upload
│   └── styles-auth.css     # Estilos para autenticação
├── scripts/
│   └── build-static.js     # Script de build
├── dist/                   # Arquivos para produção
└── package.json
```

---

## ⚙️ **Configuração**

### **Credenciais de Acesso**
```javascript
// Configurado no servidor
const ADMIN_CREDENTIALS = {
  username: 'admbolado',
  password: 'lmbolado'
};
```

### **Banco PostgreSQL**
```javascript
const dbConfig = {
  host: '35.199.101.38',
  port: 5432,
  database: 'liberdade-medica',
  user: 'vinilean',
  password: '-Infra55LM-'
};
```

### **Backblaze B2**
```javascript
const b2Config = {
  accessKeyId: '005130cedd268650000000004',
  secretAccessKey: 'K005h8RBjbhsVX5NieckVPQ0ZKGHSAc',
  endpoint: 'https://s3.us-east-005.backblazeb2.com',
  region: 'us-east-005',
  bucket: 'imagensblog'
};
```

---

## 🚀 **Instalação e Uso**

### **1. Desenvolvimento Local**

```bash
# Clonar repositório
git clone https://github.com/InfraLM/blog-adm.git
cd blog-adm

# Instalar dependências
npm install

# Executar servidor de desenvolvimento
npm run dev

# Acessar aplicação
# http://localhost:3000/blog-adm
```

### **2. Build para Produção**

```bash
# Gerar arquivos estáticos
npm run build

# Arquivos gerados em dist/
ls dist/
```

### **3. Deploy em Produção**

```bash
# Executar servidor backend
NODE_ENV=production npm start

# Copiar arquivos estáticos para servidor web
cp -r dist/* /var/www/html/blog-adm/

# Configurar Nginx (ver dist/nginx.conf)
sudo nano /etc/nginx/sites-available/seu-site
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📋 **APIs Disponíveis**

### **Autenticação**
- `POST /blog-adm/api/login` - Fazer login
- `POST /blog-adm/api/logout` - Fazer logout
- `GET /blog-adm/api/auth-status` - Status de autenticação

### **Artigos**
- `GET /blog-adm/api/articles` - Listar artigos
- `POST /blog-adm/api/articles` - Criar artigo

### **Upload**
- `POST /blog-adm/api/upload-image` - Upload de imagem

### **Sistema**
- `GET /blog-adm/api/health` - Health check
- `GET /blog-adm/api/test-connection` - Teste de conexão

---

## 🎯 **Exemplo de Uso**

### **1. Fazer Login**
```javascript
// Acessar: seudominio.com/blog-adm
// Usuário: admbolado
// Senha: lmbolado
```

### **2. Criar Artigo**
```javascript
// 1. Preencher informações básicas
titulo: "Avanços na Cardiologia"
categoria: "Cardiologia"
autor: "Dr. João Silva"
coautor: "Dr. Maria Santos"
resumo: "Este artigo explora..."
destaque: true

// 2. Adicionar imagem principal
// Arrastar arquivo ou clicar para selecionar

// 3. Criar blocos de conteúdo
// Alternar entre texto e imagens

// 4. Publicar artigo
// Dados salvos no PostgreSQL
// Imagens no Backblaze B2
```

---

## 🔧 **Estrutura do Banco**

```sql
-- Tabela atualizada com novos campos
CREATE TABLE public.blog_artigos (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  autor VARCHAR(100),
  coautor VARCHAR(100),           -- ✨ NOVO
  resumo VARCHAR(500),            -- ✨ NOVO
  destaque BOOLEAN DEFAULT FALSE, -- ✨ NOVO
  imagem_principal VARCHAR,       -- ✨ NOVO
  data_criacao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_atualizacao DATE DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'publicado',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🛠️ **Tecnologias Utilizadas**

### **Backend**
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Banco de dados
- **AWS SDK** - Integração Backblaze B2
- **Multer** - Upload de arquivos
- **Helmet** - Segurança
- **Express-session** - Gerenciamento de sessões

### **Frontend**
- **HTML5** - Estrutura
- **CSS3** - Estilos responsivos
- **JavaScript ES6+** - Lógica da aplicação
- **Fetch API** - Comunicação com backend

### **Infraestrutura**
- **Backblaze B2** - Armazenamento de imagens
- **PostgreSQL** - Banco de dados
- **Nginx** - Servidor web (produção)

---

## 📊 **Exemplo de Artigo Gerado**

```html
<div class="imagem-principal">
    <img src="https://imagensblog.s3.us-east-005.backblazeb2.com/uuid.jpg" 
         alt="Avanços na Cardiologia" 
         style="width: 100%; height: auto; margin-bottom: 1rem;">
</div>

<div class="resumo">
    <p><strong>Resumo:</strong> Este artigo explora os mais recentes avanços...</p>
</div>

<h1>Introdução</h1>
<p>A cardiologia moderna tem evoluído rapidamente...</p>

<div class="imagem-bloco">
    <img src="https://imagensblog.s3.us-east-005.backblazeb2.com/diagram.jpg" 
         alt="Imagem do artigo" 
         style="width: 100%; height: auto; margin: 1rem 0;">
</div>

<h2>Novas Tecnologias</h2>
<p>As inovações tecnológicas têm revolucionado...</p>

<div class="autor-info">
    <p><strong>Autor:</strong> Dr. João Silva | <strong>Co-autor:</strong> Dr. Maria Santos</p>
    <p><strong>Categoria:</strong> Cardiologia</p>
    <p><strong>✨ Artigo em Destaque</strong></p>
</div>
```

---

## 🔒 **Segurança em Produção**

### **Recomendações Importantes**

1. **Alterar credenciais padrão**
2. **Configurar HTTPS obrigatório**
3. **Usar variáveis de ambiente para senhas**
4. **Configurar firewall adequadamente**
5. **Monitorar logs de acesso**
6. **Fazer backup regular do banco**

### **Variáveis de Ambiente**
```bash
# Criar arquivo .env
NODE_ENV=production
PORT=3000
SESSION_SECRET=sua-chave-secreta-super-forte
DB_PASSWORD=sua-senha-do-banco
B2_ACCESS_KEY=sua-chave-backblaze
B2_SECRET_KEY=sua-chave-secreta-backblaze
```

---

## 📈 **Monitoramento**

### **Logs Importantes**
- Tentativas de login
- Uploads de imagem
- Criação de artigos
- Erros de conexão

### **Métricas**
- Tempo de resposta das APIs
- Taxa de sucesso de uploads
- Uso de armazenamento B2
- Conexões simultâneas

---

## 🎉 **Benefícios**

### **Para Administradores**
- ✅ Interface web moderna e intuitiva
- ✅ Acesso de qualquer dispositivo
- ✅ Upload de imagens simplificado
- ✅ Preview em tempo real
- ✅ Sistema de rascunhos

### **Para o Sistema**
- ✅ Arquitetura escalável
- ✅ Armazenamento otimizado (B2)
- ✅ Segurança robusta
- ✅ Performance otimizada
- ✅ Fácil manutenção

### **Para os Leitores**
- ✅ Artigos mais ricos visualmente
- ✅ Carregamento rápido de imagens
- ✅ Conteúdo bem estruturado
- ✅ Metadados informativos

---

**🌐 Aplicação web completa e pronta para produção!**
