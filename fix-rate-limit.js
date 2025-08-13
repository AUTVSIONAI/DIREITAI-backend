const express = require('express');
const path = require('path');
const fs = require('fs');

console.log('🔧 Ajustando configurações de rate limiting...');

// Caminho para o arquivo de rotas da IA
const aiRoutesPath = path.join(__dirname, 'routes', 'ai.js');

try {
  // Ler o arquivo atual
  let content = fs.readFileSync(aiRoutesPath, 'utf8');
  
  console.log('📄 Arquivo ai.js lido com sucesso');
  
  // Fazer backup do arquivo original
  const backupPath = aiRoutesPath + '.backup';
  fs.writeFileSync(backupPath, content);
  console.log('💾 Backup criado em:', backupPath);
  
  // Substituir a configuração de rate limiting
  const oldRateLimit = `const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 requisições por minuto por IP
  message: {
    error: 'Muitas requisições. Tente novamente em 1 minuto.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limiting para usuários premium/líder
    return req.user && ['premium', 'lider'].includes(req.user.plan);
  }
});`;
  
  const newRateLimit = `const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requisições por minuto por IP (aumentado)
  message: {
    error: 'Muitas requisições. Tente novamente em 1 minuto.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limiting para usuários autenticados
    return req.user; // Qualquer usuário autenticado não tem rate limit
  }
});`;
  
  // Substituir no conteúdo
  const updatedContent = content.replace(oldRateLimit, newRateLimit);
  
  if (updatedContent === content) {
    console.log('⚠️ Nenhuma alteração foi feita - padrão não encontrado');
    console.log('Procurando por rate limiting...');
    
    if (content.includes('max: 10')) {
      console.log('✅ Encontrado rate limit com max: 10');
      const simpleUpdate = content.replace('max: 10', 'max: 100');
      fs.writeFileSync(aiRoutesPath, simpleUpdate);
      console.log('✅ Rate limit atualizado de 10 para 100 requisições por minuto');
    } else {
      console.log('❌ Configuração de rate limit não encontrada');
    }
  } else {
    // Escrever o arquivo atualizado
    fs.writeFileSync(aiRoutesPath, updatedContent);
    console.log('✅ Rate limiting atualizado com sucesso!');
  }
  
  console.log('\n📋 Alterações feitas:');
  console.log('- Limite aumentado de 10 para 100 requisições por minuto');
  console.log('- Rate limiting desabilitado para usuários autenticados');
  console.log('\n🔄 Reinicie o servidor para aplicar as mudanças');
  
} catch (error) {
  console.error('❌ Erro ao ajustar rate limiting:', error.message);
  process.exit(1);
}

console.log('\n✅ Script concluído com sucesso!');