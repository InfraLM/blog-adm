const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Client } = require('pg');
const AWS = require('aws-sdk');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');

console.log('========================================');
console.log(' BLOG ADMINISTRAÇÃO WEB (MODO FALLBACK)');
console.log(' Sistema de Gestão - Liberdade Médica');
console.log('========================================');
console.log();

// Carregar variáveis de ambiente
require('dotenv').config();

// Configuração do servidor
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do banco PostgreSQL
const dbConfig = {
  host: process.env.DB_HOST || '35.199.101.38',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'liberdade-medica',
  user: process.env.DB_USER || 'vinilean',
  password: process.env.DB_PASSWORD || '-Infra55LM-',
  ssl: false,
  connectionTimeoutMillis: 5000, // Timeout mais curto
  query_timeout: 5000,
  statement_timeout: 5000,
  idle_in_transaction_session_timeout: 5000
};

// Configuração do Backblaze B2
const b2Config = {
  accessKeyId: process.env.B2_ACCESS_KEY_ID || '005130cedd268650000000004',
  secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || 'K005h8RBjbhsVX5NieckVPQ0ZKGHSAc',
  endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
  region: process.env.B2_REGION || 'us-east-005',
  bucket: process.env.B2_BUCKET || 'imagensblog'
};

// Configurar AWS SDK para Backblaze B2
const s3 = new AWS.S3({
  accessKeyId: b2Config.accessKeyId,
  secretAccessKey: b2Config.secretAccessKey,
  endpoint: b2Config.endpoint,
  region: b2Config.region,
  s3ForcePathStyle: true
});

// Configurar multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'), false);
    }
  }
});

// Credenciais de acesso
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admbolado',
  password: process.env.ADMIN_PASSWORD || 'lmbolado'
};

// Cliente PostgreSQL e estado da conexão
let pgClient = null;
let dbConnected = false;
let dbMode = 'offline'; // 'postgresql', 'offline'

// Armazenamento local para modo offline
const localDataFile = path.join(__dirname, '../data/articles.json');
let localArticles = [];

// Middlewares de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "*.backblazeb2.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas tentativas. Tente novamente em 15 minutos.'
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
});

app.use('/blog-adm/api/login', loginLimiter);
app.use('/blog-adm/api/', limiter);

// Configuração de sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'liberdade-medica-blog-admin-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
  origin: true,
  credentials: true
}));

// Servir arquivos estáticos
app.use('/blog-adm', express.static(path.join(__dirname, '../public/blog-adm')));

// Middleware de autenticação
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  } else {
    return res.status(401).json({
      success: false,
      message: 'Acesso negado. Faça login primeiro.'
    });
  }
}

// Inicializar armazenamento local
function initLocalStorage() {
  const dataDir = path.dirname(localDataFile);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (fs.existsSync(localDataFile)) {
    try {
      const data = fs.readFileSync(localDataFile, 'utf8');
      localArticles = JSON.parse(data);
      console.log('📄 Artigos locais carregados:', localArticles.length);
    } catch (error) {
      console.log('⚠️ Erro ao carregar artigos locais, iniciando vazio');
      localArticles = [];
    }
  } else {
    localArticles = [];
    saveLocalArticles();
  }
}

function saveLocalArticles() {
  try {
    fs.writeFileSync(localDataFile, JSON.stringify(localArticles, null, 2));
  } catch (error) {
    console.error('❌ Erro ao salvar artigos locais:', error);
  }
}

// Conectar ao PostgreSQL com fallback
async function connectPostgreSQL() {
  try {
    console.log('🔄 Tentando conectar ao PostgreSQL...');
    console.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`📊 Database: ${dbConfig.database}`);
    
    pgClient = new Client(dbConfig);
    await pgClient.connect();
    
    const result = await pgClient.query('SELECT version()');
    console.log('✅ PostgreSQL conectado:', new Date().toISOString());
    console.log('📊 Versão:', result.rows[0].version.split(' ')[0], result.rows[0].version.split(' ')[1]);
    
    const tableCheck = await pgClient.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'blog_artigos'
    `);
    
    if (tableCheck.rows[0].count > 0) {
      console.log('✅ Tabela blog_artigos encontrada');
      
      const countResult = await pgClient.query('SELECT COUNT(*) as total FROM public.blog_artigos');
      console.log('📄 Artigos no banco:', countResult.rows[0].total);
      
      dbConnected = true;
      dbMode = 'postgresql';
      return true;
    } else {
      console.log('⚠️ Tabela blog_artigos não encontrada');
      throw new Error('Tabela não encontrada');
    }
    
  } catch (error) {
    console.log('❌ Falha na conexão PostgreSQL:', error.message);
    console.log('🔄 Ativando modo offline...');
    
    pgClient = null;
    dbConnected = false;
    dbMode = 'offline';
    
    initLocalStorage();
    console.log('✅ Modo offline ativado');
    return false;
  }
}

// Função para fazer upload de imagem para Backblaze B2
async function uploadImageToB2(file, filename) {
  try {
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = filename || `${crypto.randomUUID()}${fileExtension}`;
    
    const uploadParams = {
      Bucket: b2Config.bucket,
      Key: uniqueFilename,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    };

    console.log('🔄 Fazendo upload para Backblaze B2:', uniqueFilename);
    
    const result = await s3.upload(uploadParams).promise();
    
    const publicUrl = `https://${b2Config.bucket}.s3.us-east-005.backblazeb2.com/${uniqueFilename}`;
    
    console.log('✅ Upload concluído:', publicUrl);
    
    return {
      success: true,
      url: publicUrl,
      key: uniqueFilename,
      size: file.size,
      mimetype: file.mimetype
    };
  } catch (error) {
    console.error('❌ Erro no upload para B2:', error);
    throw error;
  }
}

// Rotas de autenticação
app.post('/blog-adm/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Tentativa de login:', { username, timestamp: new Date().toISOString() });
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      req.session.authenticated = true;
      req.session.username = username;
      
      console.log('✅ Login bem-sucedido:', username);
      
      res.json({
        success: true,
        message: 'Login realizado com sucesso!',
        user: { username },
        mode: dbMode
      });
    } else {
      console.log('❌ Credenciais inválidas:', username);
      
      res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }
  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

app.post('/blog-adm/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Erro ao fazer logout:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro ao fazer logout'
      });
    }
    
    console.log('✅ Logout realizado');
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  });
});

app.get('/blog-adm/api/auth-status', (req, res) => {
  res.json({
    authenticated: !!(req.session && req.session.authenticated),
    username: req.session ? req.session.username : null,
    mode: dbMode
  });
});

// Rotas da API (protegidas)
app.get('/blog-adm/api/health', requireAuth, (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    postgresql: dbConnected ? 'connected' : 'disconnected',
    mode: dbMode,
    session: req.session.username
  });
});

app.get('/blog-adm/api/test-connection', requireAuth, async (req, res) => {
  try {
    if (dbMode === 'postgresql' && pgClient) {
      await pgClient.query('SELECT 1');
      
      res.json({
        success: true,
        message: '✅ PostgreSQL conectado - dados salvos no banco',
        mode: 'postgresql',
        status: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: true,
        message: '✅ Modo offline ativo - dados salvos localmente',
        mode: 'offline',
        status: 'local_storage',
        timestamp: new Date().toISOString(),
        local_articles: localArticles.length
      });
    }
  } catch (error) {
    console.error('❌ Erro no teste de conexão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro na conexão: ' + error.message,
      mode: 'error'
    });
  }
});

// Upload de imagem
app.post('/blog-adm/api/upload-image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem foi enviada'
      });
    }

    console.log('📷 Nova requisição de upload de imagem:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      user: req.session.username
    });

    const uploadResult = await uploadImageToB2(req.file);

    res.json({
      success: true,
      message: '✅ Imagem enviada com sucesso!',
      image: uploadResult
    });

  } catch (error) {
    console.error('❌ Erro no upload de imagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer upload da imagem: ' + error.message
    });
  }
});

// Listar artigos
app.get('/blog-adm/api/articles', requireAuth, async (req, res) => {
  try {
    if (dbMode === 'postgresql' && pgClient) {
      // Modo PostgreSQL
      const result = await pgClient.query(`
        SELECT id, titulo, categoria, autor, coautor, resumo, destaque, 
               imagem_principal, data_criacao, status, slug, created_at
        FROM public.blog_artigos 
        ORDER BY created_at DESC 
        LIMIT 50
      `);

      const articles = result.rows.map(row => ({
        id: row.id,
        titulo: row.titulo,
        categoria: row.categoria,
        autor: row.autor,
        coautor: row.coautor,
        resumo: row.resumo,
        destaque: row.destaque,
        imagem_principal: row.imagem_principal,
        data_criacao: row.data_criacao,
        status: row.status,
        slug: row.slug,
        created_at: row.created_at
      }));

      res.json({
        success: true,
        articles: articles,
        total: articles.length,
        mode: 'postgresql'
      });
    } else {
      // Modo offline
      const articles = localArticles
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50);

      res.json({
        success: true,
        articles: articles,
        total: articles.length,
        mode: 'offline'
      });
    }

  } catch (error) {
    console.error('❌ Erro ao listar artigos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar artigos: ' + error.message,
      articles: []
    });
  }
});

// Criar artigo
app.post('/blog-adm/api/articles', requireAuth, async (req, res) => {
  try {
    const { titulo, categoria, autor, coautor, resumo, destaque, imagem_principal, content } = req.body;

    console.log('📝 Nova requisição de criação de artigo:', {
      titulo: titulo ? titulo.substring(0, 50) + '...' : 'N/A',
      categoria: categoria || 'N/A',
      autor: autor || 'N/A',
      coautor: coautor || 'N/A',
      resumo: resumo ? resumo.substring(0, 50) + '...' : 'N/A',
      destaque: destaque || false,
      imagem_principal: imagem_principal ? 'Sim' : 'Não',
      content_length: content ? content.length : 0,
      user: req.session.username,
      mode: dbMode
    });

    // Validação
    const errors = [];
    if (!titulo || titulo.trim().length === 0) errors.push('Título é obrigatório');
    if (!categoria || categoria.trim().length === 0) errors.push('Categoria é obrigatória');
    if (!autor || autor.trim().length === 0) errors.push('Autor é obrigatório');
    if (!content || content.trim().length === 0) errors.push('Conteúdo é obrigatório');
    
    if (titulo && titulo.length > 255) errors.push('Título muito longo (máximo 255 caracteres)');
    if (categoria && categoria.length > 100) errors.push('Categoria muito longa (máximo 100 caracteres)');
    if (autor && autor.length > 100) errors.push('Nome do autor muito longo (máximo 100 caracteres)');
    if (coautor && coautor.length > 100) errors.push('Nome do co-autor muito longo (máximo 100 caracteres)');
    if (resumo && resumo.length > 500) errors.push('Resumo muito longo (máximo 500 caracteres)');

    if (errors.length > 0) {
      console.log('❌ Validação falhou:', errors);
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos: ' + errors.join(', '),
        errors: errors
      });
    }

    // Gerar slug único
    function generateSlug(text) {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')  // Alterado de '_' para '-'
        .replace(/-+/g, '-')   // Alterado de '_' para '-'
        .replace(/^-|-$/g, ''); // Alterado de '_' para '-'
    }

    const baseSlug = generateSlug(titulo.trim());
    const now = new Date();

    if (dbMode === 'postgresql' && pgClient) {
      // Modo PostgreSQL
      async function ensureUniqueSlug(baseSlug) {
        let slug = baseSlug;
        let counter = 1;
        
        while (true) {
          const existingSlug = await pgClient.query(
            'SELECT id FROM public.blog_artigos WHERE slug = $1',
            [slug]
          );
          
          if (existingSlug.rows.length === 0) {
            return slug;
          }
          
          counter++;
          slug = `${baseSlug}-${counter}`; // Alterado de '_' para '-'
        }
      }

      const finalSlug = await ensureUniqueSlug(baseSlug);

      console.log('🔄 Inserindo artigo no PostgreSQL:', {
        titulo: titulo.trim(),
        slug: finalSlug,
        categoria: categoria.trim(),
        autor: autor.trim()
      });

      const insertQuery = `
        INSERT INTO public.blog_artigos 
        (titulo, slug, categoria, autor, coautor, resumo, destaque, imagem_principal, 
         data_criacao, data_atualizacao, content, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, slug, titulo, categoria, autor, coautor, resumo, destaque, imagem_principal, created_at
      `;

      const values = [
        titulo.trim(),
        finalSlug,
        categoria.trim(),
        autor.trim(),
        coautor ? coautor.trim() : null,
        resumo ? resumo.trim() : null,
        destaque || false,
        imagem_principal || null,
        now.toISOString().split('T')[0],
        now.toISOString().split('T')[0],
        content.trim(),
        'publicado',
        now.toISOString(),
        now.toISOString()
      ];

      const result = await pgClient.query(insertQuery, values);
      const insertedArticle = result.rows[0];
      
      console.log('✅ Artigo inserido no PostgreSQL:', {
        id: insertedArticle.id,
        slug: insertedArticle.slug,
        titulo: insertedArticle.titulo
      });

      res.json({
        success: true,
        id: insertedArticle.id,
        slug: insertedArticle.slug,
        message: '✅ Artigo publicado no blog com sucesso!',
        mode: 'postgresql',
        timestamp: now.toISOString(),
        article: insertedArticle
      });

    } else {
      // Modo offline
      function ensureUniqueSlugLocal(baseSlug) {
        let slug = baseSlug;
        let counter = 1;
        
        while (localArticles.some(article => article.slug === slug)) {
          counter++;
          slug = `${baseSlug}-${counter}`; // Alterado de '_' para '-'
        }
        
        return slug;
      }

      const finalSlug = ensureUniqueSlugLocal(baseSlug);
      const newId = localArticles.length > 0 ? Math.max(...localArticles.map(a => a.id)) + 1 : 1;

      const newArticle = {
        id: newId,
        titulo: titulo.trim(),
        slug: finalSlug,
        categoria: categoria.trim(),
        autor: autor.trim(),
        coautor: coautor ? coautor.trim() : null,
        resumo: resumo ? resumo.trim() : null,
        destaque: destaque || false,
        imagem_principal: imagem_principal || null,
        data_criacao: now.toISOString().split('T')[0],
        data_atualizacao: now.toISOString().split('T')[0],
        content: content.trim(),
        status: 'publicado',
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      localArticles.push(newArticle);
      saveLocalArticles();

      console.log('✅ Artigo salvo localmente:', {
        id: newArticle.id,
        slug: newArticle.slug,
        titulo: newArticle.titulo
      });

      res.json({
        success: true,
        id: newArticle.id,
        slug: newArticle.slug,
        message: '✅ Artigo salvo localmente com sucesso!',
        mode: 'offline',
        timestamp: now.toISOString(),
        article: newArticle
      });
    }

  } catch (error) {
    console.error('❌ Erro ao criar artigo:', error.message);
    console.error('🔍 Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro ao publicar artigo: ' + error.message
    });
  }
});

// Rota principal
app.get('/blog-adm', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/blog-adm/index.html'));
});

app.get('/blog-adm/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/blog-adm/index.html'));
});

app.get('/', (req, res) => {
  res.redirect('/blog-adm');
});

// Inicializar servidor
async function startServer() {
  try {
    // Tentar conectar ao PostgreSQL
    await connectPostgreSQL();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log();
      console.log('✅ Servidor web iniciado com sucesso!');
      console.log(`🌐 URL: http://localhost:${PORT}/blog-adm`);
      console.log(`🔐 Login: ${ADMIN_CREDENTIALS.username} / ${ADMIN_CREDENTIALS.password}`);
      console.log(`📊 Modo: ${dbMode.toUpperCase()}`);
      console.log();
      console.log('📋 Funcionalidades disponíveis:');
      console.log('   ✅ Sistema de autenticação');
      console.log('   ✅ Upload de imagens para Backblaze B2');
      console.log('   ✅ Criação de artigos com novos campos');
      console.log('   ✅ Interface web responsiva');
      if (dbMode === 'offline') {
        console.log('   ⚠️ Modo offline: dados salvos localmente');
        console.log(`   📄 Artigos locais: ${localArticles.length}`);
      }
      console.log();
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Tratamento de erros
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Encerrando servidor...');
  
  if (pgClient) {
    await pgClient.end();
    console.log('✅ Conexão PostgreSQL encerrada');
  }
  
  if (dbMode === 'offline') {
    saveLocalArticles();
    console.log('✅ Artigos locais salvos');
  }
  
  console.log('✅ Servidor encerrado');
  process.exit(0);
});

// Iniciar aplicação
startServer();
