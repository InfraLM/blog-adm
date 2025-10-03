const fs = require('fs');
const path = require('path');

console.log('🔨 Construindo versão estática para produção...');
console.log();

const sourceDir = path.join(__dirname, '../public/blog-adm');
const distDir = path.join(__dirname, '../dist');

// Criar diretório dist
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Copiar arquivos estáticos
const filesToCopy = [
    'index.html',
    'app.js',
    'styles.css',
    'styles-upload.css',
    'styles-auth.css'
];

console.log('📁 Copiando arquivos estáticos...');

filesToCopy.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(distDir, file);
    
    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ ${file} copiado`);
    } else {
        console.log(`⚠️ ${file} não encontrado`);
    }
});

// Criar arquivo de configuração para servidor web
const nginxConfig = `# Configuração Nginx para Blog Administração
# Adicione este bloco ao seu arquivo de configuração do Nginx

location /blog-adm {
    alias /caminho/para/dist;
    try_files $uri $uri/ /blog-adm/index.html;
    
    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Cache para arquivos estáticos
    location ~* \\.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Proxy para API (ajuste a URL do seu servidor backend)
location /blog-adm/api {
    proxy_pass http://localhost:3000/blog-adm/api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}`;

fs.writeFileSync(path.join(distDir, 'nginx.conf'), nginxConfig);
console.log('✅ nginx.conf criado');

// Criar arquivo de instruções
const instructions = `# 🚀 Blog Administração - Instruções de Deploy

## Arquivos Gerados

- \`index.html\` - Página principal da aplicação
- \`app.js\` - JavaScript da aplicação
- \`styles.css\` - Estilos principais
- \`styles-upload.css\` - Estilos para upload
- \`styles-auth.css\` - Estilos para autenticação
- \`nginx.conf\` - Configuração de exemplo para Nginx

## Deploy para Produção

### 1. Servidor Backend

O servidor backend (src/server.js) deve estar rodando em produção:

\`\`\`bash
# Instalar dependências
npm install

# Executar em produção
NODE_ENV=production npm start

# Ou usar PM2
pm2 start src/server.js --name "blog-admin"
\`\`\`

### 2. Arquivos Estáticos

Copie os arquivos desta pasta \`dist/\` para seu servidor web:

\`\`\`bash
# Exemplo para servidor com Nginx
sudo cp -r dist/* /var/www/html/blog-adm/
sudo chown -R www-data:www-data /var/www/html/blog-adm/
\`\`\`

### 3. Configuração do Nginx

Adicione a configuração do arquivo \`nginx.conf\` ao seu site:

\`\`\`bash
# Editar configuração do site
sudo nano /etc/nginx/sites-available/seu-site

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
\`\`\`

### 4. HTTPS (Recomendado)

Configure SSL/TLS para segurança:

\`\`\`bash
# Usando Certbot (Let's Encrypt)
sudo certbot --nginx -d seudominio.com
\`\`\`

### 5. Variáveis de Ambiente

Configure as variáveis no servidor backend:

\`\`\`bash
# Criar arquivo .env
NODE_ENV=production
PORT=3000
SESSION_SECRET=sua-chave-secreta-super-forte
\`\`\`

## Estrutura Final

\`\`\`
seudominio.com/
├── blog-adm/           # Frontend (arquivos estáticos)
│   ├── index.html
│   ├── app.js
│   └── *.css
└── blog-adm/api/       # Backend (proxy para servidor Node.js)
    ├── login
    ├── articles
    └── upload-image
\`\`\`

## Credenciais de Acesso

- **Usuário:** admbolado
- **Senha:** lmbolado

⚠️ **IMPORTANTE:** Altere as credenciais no código antes do deploy em produção!

## Funcionalidades

✅ Sistema de autenticação seguro
✅ Upload de imagens para Backblaze B2
✅ Criação de artigos com novos campos
✅ Interface responsiva
✅ Conexão com PostgreSQL
✅ Sessões seguras
✅ Rate limiting
✅ Headers de segurança

## Suporte

Para dúvidas ou problemas, verifique:
1. Logs do servidor backend
2. Console do navegador (F12)
3. Logs do Nginx
4. Conectividade com PostgreSQL e Backblaze B2
`;

fs.writeFileSync(path.join(distDir, 'INSTRUCOES-DEPLOY.md'), instructions);
console.log('✅ INSTRUCOES-DEPLOY.md criado');

console.log();
console.log('🎉 Build concluído com sucesso!');
console.log();
console.log('📁 Arquivos gerados em:', distDir);
console.log('📋 Próximos passos:');
console.log('   1. Execute o servidor backend: npm start');
console.log('   2. Copie os arquivos dist/ para seu servidor web');
console.log('   3. Configure o Nginx conforme nginx.conf');
console.log('   4. Acesse: seudominio.com/blog-adm');
console.log();
