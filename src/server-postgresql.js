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

console.log('========================================');
console.log(' BLOG ADMINISTRAÇÃO WEB - POSTGRESQL');
console.log(' Conexão Prioritária com Banco');
console.log('========================================');
console.log();

// Carregar variáveis de ambiente
require('dotenv').config();

// Configuração do servidor
const app = express();
const PORT = process.env.PORT || 3000;

// MÚLTIPLAS CONFIGURAÇÕES DE CONEXÃO POSTGRESQL
const DB_CONFIGS = [
  // Configuração 1: Direta (original)
  {
    name: 'Conexão Direta',
    config: {
      host: '35.199.101.38',
      port: 5432,
      database: 'liberdade-medica',
      user: 'vinilean',
      password: '-Infra55LM-',
      ssl: false,
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
      statement_timeout: 30000,
      idle_in_transaction_session_timeout: 30000
    }
  },
  // Configuração 2: Com SSL
  {
    name: 'Conexão com SSL',
    config: {
      host: '35.199.101.38',
      port: 5432,
      database: 'liberdade-medica',
      user: 'vinilean',
      password: '-Infra55LM-',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
      statement_timeout: 30000,
      idle_in_transaction_session_timeout: 30000
    }
  },
  // Configuração 3: Túnel SSH local (se configurado)
  {
    name: 'Túnel SSH Local',
    config: {
      host: 'localhost',
      port: 5433,
      database: 'liberdade-medica',
      user: 'vinilean',
      password: '-Infra55LM-',
      ssl: false,
      connectionTimeoutMillis: 5000,
      query_timeout: 30000,
      statement_timeout: 30000,
      idle_in_transaction_session_timeout: 30000
    }
  },
  // Configuração 4: Porta alternativa
  {
    name: 'Porta Alternativa',
    config: {
      host: '35.199.101.38',
      port: 5433,
      database: 'liberdade-medica',
      user: 'vinilean',
      password: '-Infra55LM-',
      ssl: false,
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
      statement_timeout: 30000,
      idle_in_transaction_session_timeout: 30000
    }
  }
];

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

// Cliente PostgreSQL
let pgClient = null;
let dbConnected = false;
let currentDbConfig = null;

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

// FUNÇÃO PARA TENTAR MÚLTIPLAS CONEXÕES POSTGRESQL
async function connectPostgreSQL() {
  console.log('🔄 Tentando conectar ao PostgreSQL...');
  console.log('📋 Testando múltiplas configurações de conexão...');
  console.log();

  for (let i = 0; i < DB_CONFIGS.length; i++) {
    const { name, config } = DB_CONFIGS[i];
    
    console.log(`🔍 Tentativa ${i + 1}/${DB_CONFIGS.length}: ${name}`);
    console.log(`📍 Host: ${config.host}:${config.port}`);
    console.log(`📊 Database: ${config.database}`);
    console.log(`🔐 SSL: ${config.ssl ? 'Habilitado' : 'Desabilitado'}`);
    
    try {
      const testClient = new Client(config);
      
      // Tentar conectar
      await testClient.connect();
      
      // Testar query básica
      const result = await testClient.query('SELECT version()');
      console.log('✅ CONEXÃO ESTABELECIDA!');
      console.log('📊 Versão:', result.rows[0].version.split(' ')[0], result.rows[0].version.split(' ')[1]);
      
      // Verificar tabela
      const tableCheck = await testClient.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blog_artigos'
      `);
      
      if (tableCheck.rows[0].count > 0) {
        console.log('✅ Tabela blog_artigos encontrada');
        
        const countResult = await testClient.query('SELECT COUNT(*) as total FROM public.blog_artigos');
        console.log('📄 Artigos existentes:', countResult.rows[0].total);
        
        // Sucesso! Usar esta configuração
        pgClient = testClient;
        dbConnected = true;
        currentDbConfig = { name, config };
        
        console.log();
        console.log('🎉 POSTGRESQL CONECTADO COM SUCESSO!');
        console.log(`✅ Usando: ${name}`);
        console.log(`📍 Endpoint: ${config.host}:${config.port}`);
        console.log();
        
        return true;
      } else {
        console.log('⚠️ Tabela blog_artigos não encontrada');
        await testClient.end();
      }
      
    } catch (error) {
      console.log(`❌ Falha: ${error.message}`);
      console.log();
    }
  }
  
  console.log('❌ TODAS AS TENTATIVAS DE CONEXÃO FALHARAM!');
  console.log();
  console.log('💡 SOLUÇÕES POSSÍVEIS:');
  console.log('1. Verificar se o servidor PostgreSQL está rodando');
  console.log('2. Verificar firewall/rede corporativa');
  console.log('3. Configurar túnel SSH:');
  console.log('   ssh -L 5433:localhost:5432 vinilean@35.199.101.38');
  console.log('4. Verificar credenciais no arquivo .env');
  console.log('5. Contatar administrador do servidor');
  console.log();
  
  return false;
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
        database: dbConnected ? 'PostgreSQL Conectado' : 'PostgreSQL Desconectado',
        connection: currentDbConfig ? currentDbConfig.name : 'Nenhuma'
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
    database: dbConnected ? 'connected' : 'disconnected',
    connection: currentDbConfig ? currentDbConfig.name : null
  });
});

// Rotas da API (protegidas)
app.get('/blog-adm/api/health', requireAuth, (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    postgresql: dbConnected ? 'connected' : 'disconnected',
    connection: currentDbConfig ? currentDbConfig.name : null,
    session: req.session.username
  });
});

app.get('/blog-adm/api/test-connection', requireAuth, async (req, res) => {
  try {
    if (!pgClient || !dbConnected) {
      return res.json({
        success: false,
        message: '❌ PostgreSQL desconectado - Reinicie o servidor para tentar reconectar',
        mode: 'disconnected',
        connection: null
      });
    }

    await pgClient.query('SELECT 1');
    
    res.json({
      success: true,
      message: '✅ PostgreSQL conectado - dados salvos no banco',
      mode: 'postgresql',
      status: 'connected',
      connection: currentDbConfig.name,
      endpoint: `${currentDbConfig.config.host}:${currentDbConfig.config.port}`,
      timestamp: new Date().toISOString()
    });
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
    if (!pgClient || !dbConnected) {
      return res.status(500).json({
        success: false,
        message: 'PostgreSQL desconectado. Reinicie o servidor.',
        articles: [],
        connection: null
      });
    }

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
      connection: currentDbConfig.name
    });

  } catch (error) {
    console.error('❌ Erro ao listar artigos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar artigos: ' + error.message,
      articles: []
    });
  }
});

// Criar artigo - FUNÇÃO PRINCIPAL!
app.post('/blog-adm/api/articles', requireAuth, async (req, res) => {
  try {
    if (!pgClient || !dbConnected) {
      return res.status(500).json({
        success: false,
        message: '❌ ERRO CRÍTICO: PostgreSQL desconectado! Reinicie o servidor para reconectar.',
        connection: null
      });
    }

    const { titulo, categoria, autor, coautor, resumo, destaque, imagem_principal, content } = req.body;

    console.log('📝 NOVA REQUISIÇÃO DE CRIAÇÃO DE ARTIGO:');
    console.log('==========================================');
    console.log('📍 Conexão:', currentDbConfig.name);
    console.log('📊 Endpoint:', `${currentDbConfig.config.host}:${currentDbConfig.config.port}`);
    console.log('👤 Usuário:', req.session.username);
    console.log('📝 Título:', titulo ? titulo.substring(0, 50) + '...' : 'N/A');
    console.log('📂 Categoria:', categoria || 'N/A');
    console.log('👨‍⚕️ Autor:', autor || 'N/A');
    console.log('👥 Co-autor:', coautor || 'N/A');
    console.log('📄 Resumo:', resumo ? resumo.substring(0, 50) + '...' : 'N/A');
    console.log('⭐ Destaque:', destaque || false);
    console.log('🖼️ Imagem:', imagem_principal ? 'Sim' : 'Não');
    console.log('📏 Conteúdo:', content ? content.length + ' caracteres' : '0');
    console.log('==========================================');

    // Validação rigorosa
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
      console.log('❌ VALIDAÇÃO FALHOU:', errors);
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
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    }

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
        slug = `${baseSlug}_${counter}`;
      }
    }

    const slug = generateSlug(titulo.trim());
    const finalSlug = await ensureUniqueSlug(slug);
    const now = new Date();

    console.log('🔄 INSERINDO ARTIGO NO POSTGRESQL:');
    console.log('==================================');
    console.log('📝 Título:', titulo.trim());
    console.log('🔗 Slug:', finalSlug);
    console.log('📂 Categoria:', categoria.trim());
    console.log('👨‍⚕️ Autor:', autor.trim());
    console.log('👥 Co-autor:', coautor ? coautor.trim() : 'N/A');
    console.log('⭐ Destaque:', destaque || false);
    console.log('🖼️ Imagem:', imagem_principal || 'N/A');
    console.log('==================================');

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
      now.toISOString().split('T')[0], // data_criacao
      now.toISOString().split('T')[0], // data_atualizacao
      content.trim(),
      'publicado',
      now.toISOString(), // created_at
      now.toISOString()  // updated_at
    ];

    console.log('💾 Executando INSERT no PostgreSQL...');
    const result = await pgClient.query(insertQuery, values);
    const insertedArticle = result.rows[0];
    
    console.log('🎉 ARTIGO INSERIDO COM SUCESSO NO POSTGRESQL!');
    console.log('=============================================');
    console.log('🆔 ID:', insertedArticle.id);
    console.log('🔗 Slug:', insertedArticle.slug);
    console.log('📝 Título:', insertedArticle.titulo);
    console.log('📂 Categoria:', insertedArticle.categoria);
    console.log('👨‍⚕️ Autor:', insertedArticle.autor);
    console.log('👥 Co-autor:', insertedArticle.coautor || 'N/A');
    console.log('⭐ Destaque:', insertedArticle.destaque);
    console.log('🖼️ Imagem:', insertedArticle.imagem_principal || 'N/A');
    console.log('📅 Criado em:', insertedArticle.created_at);
    console.log('📍 Conexão:', currentDbConfig.name);
    console.log('=============================================');

    res.json({
      success: true,
      id: insertedArticle.id,
      slug: insertedArticle.slug,
      message: '🎉 ARTIGO PUBLICADO NO BLOG COM SUCESSO!',
      mode: 'postgresql',
      connection: currentDbConfig.name,
      timestamp: now.toISOString(),
      article: {
        id: insertedArticle.id,
        titulo: insertedArticle.titulo,
        categoria: insertedArticle.categoria,
        autor: insertedArticle.autor,
        coautor: insertedArticle.coautor,
        resumo: insertedArticle.resumo,
        destaque: insertedArticle.destaque,
        imagem_principal: insertedArticle.imagem_principal,
        slug: insertedArticle.slug
      }
    });
  } catch (error) {
    console.error('❌ ERRO CRÍTICO AO CRIAR ARTIGO:', error.message);
    console.error('🔍 Stack trace:', error.stack);
    console.error('📍 Conexão:', currentDbConfig ? currentDbConfig.name : 'Nenhuma');
    
    res.status(500).json({
      success: false,
      message: 'ERRO CRÍTICO ao publicar artigo: ' + error.message,
      connection: currentDbConfig ? currentDbConfig.name : null
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
    console.log('🚀 INICIANDO SERVIDOR COM FOCO EM POSTGRESQL...');
    console.log();
    
    // PRIORIDADE MÁXIMA: Conectar ao PostgreSQL
    const connected = await connectPostgreSQL();
    
    if (!connected) {
      console.log('⚠️ ATENÇÃO: Servidor iniciará SEM conexão PostgreSQL!');
      console.log('❌ ARTIGOS NÃO PODERÃO SER SALVOS NO BANCO!');
      console.log();
    }
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('✅ Servidor web iniciado com sucesso!');
      console.log(`🌐 URL: http://localhost:${PORT}/blog-adm`);
      console.log(`🔐 Login: ${ADMIN_CREDENTIALS.username} / ${ADMIN_CREDENTIALS.password}`);
      console.log();
      
      if (dbConnected) {
        console.log('🎉 STATUS: POSTGRESQL CONECTADO!');
        console.log(`✅ Conexão: ${currentDbConfig.name}`);
        console.log(`📍 Endpoint: ${currentDbConfig.config.host}:${currentDbConfig.config.port}`);
        console.log('💾 Artigos serão salvos no banco de dados!');
      } else {
        console.log('❌ STATUS: POSTGRESQL DESCONECTADO!');
        console.log('⚠️ Artigos NÃO serão salvos!');
        console.log('💡 Reinicie o servidor para tentar reconectar');
      }
      
      console.log();
      console.log('📋 Funcionalidades disponíveis:');
      console.log('   ✅ Sistema de autenticação');
      console.log('   ✅ Upload de imagens para Backblaze B2');
      console.log('   ✅ Interface web responsiva');
      console.log(`   ${dbConnected ? '✅' : '❌'} Criação de artigos no PostgreSQL`);
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
  
  console.log('✅ Servidor encerrado');
  process.exit(0);
});

// Iniciar aplicação
startServer();
