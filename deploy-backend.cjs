const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando deploy do backend...');

// Verificar se estamos no diretório correto
if (!fs.existsSync('./backend')) {
  console.error('❌ Pasta backend não encontrada!');
  process.exit(1);
}

try {
  // Navegar para a pasta backend
  process.chdir('./backend');
  
  console.log('📦 Instalando dependências do backend...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('🔧 Verificando configuração do Vercel...');
  if (!fs.existsSync('./vercel.json')) {
    console.error('❌ Arquivo vercel.json não encontrado no backend!');
    process.exit(1);
  }
  
  console.log('🌐 Fazendo deploy no Vercel...');
  try {
    execSync('npx vercel --prod', { stdio: 'inherit' });
    console.log('✅ Deploy do backend concluído com sucesso!');
  } catch (error) {
    console.log('⚠️  Tentando fazer login no Vercel primeiro...');
    execSync('npx vercel login', { stdio: 'inherit' });
    execSync('npx vercel --prod', { stdio: 'inherit' });
    console.log('✅ Deploy do backend concluído com sucesso!');
  }
  
} catch (error) {
  console.error('❌ Erro durante o deploy:', error.message);
  process.exit(1);
}

console.log('\n🎉 Deploy do backend finalizado!');
console.log('📝 Não esqueça de atualizar a VITE_API_URL no frontend com a nova URL do backend.');