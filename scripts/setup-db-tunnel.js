const { spawn } = require('child_process');
const { Client } = require('pg');

console.log('🔧 Configurador de Túnel SSH para PostgreSQL');
console.log('============================================');
console.log();

// Configurações
const SSH_CONFIG = {
  host: '35.199.101.38',
  user: 'vinilean', // Ajuste conforme necessário
  localPort: 5433, // Porta local diferente para evitar conflitos
  remotePort: 5432
};

const DB_CONFIG = {
  host: 'localhost',
  port: SSH_CONFIG.localPort,
  database: 'liberdade-medica',
  user: 'vinilean',
  password: '-Infra55LM-'
};

async function setupTunnel() {
  console.log('🔄 Configurando túnel SSH...');
  console.log(`📍 SSH: ${SSH_CONFIG.user}@${SSH_CONFIG.host}`);
  console.log(`🔗 Túnel: localhost:${SSH_CONFIG.localPort} -> ${SSH_CONFIG.host}:${SSH_CONFIG.remotePort}`);
  console.log();
  
  // Comando SSH para criar túnel
  const sshCommand = [
    '-L', `${SSH_CONFIG.localPort}:localhost:${SSH_CONFIG.remotePort}`,
    '-N', // Não executar comando remoto
    '-f', // Executar em background
    `${SSH_CONFIG.user}@${SSH_CONFIG.host}`
  ];
  
  console.log('💡 Para configurar o túnel SSH manualmente, execute:');
  console.log(`ssh ${sshCommand.join(' ')}`);
  console.log();
  
  console.log('📝 Depois, atualize seu arquivo .env:');
  console.log('DB_HOST=localhost');
  console.log(`DB_PORT=${SSH_CONFIG.localPort}`);
  console.log('DB_NAME=liberdade-medica');
  console.log('DB_USER=vinilean');
  console.log('DB_PASSWORD=-Infra55LM-');
  console.log();
  
  // Testar conexão através do túnel
  console.log('🧪 Para testar a conexão, execute:');
  console.log('node scripts/test-db-connection.js');
  console.log();
}

async function testConnection() {
  console.log('🔍 Testando conexão PostgreSQL...');
  
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');
    
    const result = await client.query('SELECT version()');
    console.log('📊 Versão PostgreSQL:', result.rows[0].version);
    
    const tableCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'blog_artigos'
    `);
    
    if (tableCheck.rows[0].count > 0) {
      console.log('✅ Tabela blog_artigos encontrada');
      
      const countResult = await client.query('SELECT COUNT(*) as total FROM public.blog_artigos');
      console.log('📄 Total de artigos:', countResult.rows[0].total);
    } else {
      console.log('⚠️ Tabela blog_artigos não encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.log();
    console.log('💡 Possíveis soluções:');
    console.log('1. Verificar se o túnel SSH está ativo');
    console.log('2. Verificar credenciais no arquivo .env');
    console.log('3. Verificar se a porta local está livre');
    console.log('4. Usar modo fallback: npm run start:fallback');
  } finally {
    await client.end();
  }
}

// Verificar argumentos da linha de comando
const command = process.argv[2];

if (command === 'test') {
  testConnection();
} else {
  setupTunnel();
}
