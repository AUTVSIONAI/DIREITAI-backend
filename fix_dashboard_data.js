const { supabase } = require('./config/supabase');
const { createClient } = require('@supabase/supabase-js');

// Cliente admin para operações que precisam contornar RLS
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixDashboardData() {
  console.log('🔧 Iniciando correção dos dados do dashboard...');
  
  try {
    // 1. Analisar inconsistências nas tabelas
    console.log('\n📊 ANÁLISE DAS INCONSISTÊNCIAS:');
    
    // Buscar usuários das duas tabelas
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
    const { data: publicUsers } = await adminSupabase
      .from('users')
      .select('*');
    
    console.log(`👥 Usuários em auth.users: ${authUsers?.users?.length || 0}`);
    console.log(`👥 Usuários em public.users: ${publicUsers?.length || 0}`);
    
    // Analisar tabela points (usa auth_id como user_id)
    const { data: pointsData } = await adminSupabase
      .from('points')
      .select('user_id, amount, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`\n💰 TABELA POINTS (${pointsData?.length || 0} registros):`);
    if (pointsData?.length > 0) {
      console.log('Exemplo de registros:');
      pointsData.slice(0, 3).forEach(point => {
        console.log(`  - user_id: ${point.user_id}, amount: ${point.amount}, reason: ${point.reason}`);
      });
      
      // Verificar se os user_ids existem em auth.users
      const uniqueUserIds = [...new Set(pointsData.map(p => p.user_id))];
      console.log(`\n🔍 Verificando ${uniqueUserIds.length} user_ids únicos na tabela points:`);
      
      for (const userId of uniqueUserIds.slice(0, 5)) {
        const authUser = authUsers?.users?.find(u => u.id === userId);
        const publicUser = publicUsers?.find(u => u.auth_id === userId);
        
        console.log(`  - ${userId}:`);
        console.log(`    Auth: ${authUser ? '✅ Existe' : '❌ Não existe'}`);
        console.log(`    Public: ${publicUser ? '✅ Existe' : '❌ Não existe'}`);
      }
    }
    
    // Analisar tabela badges (usa auth_id como user_id)
    const { data: badgesData } = await adminSupabase
      .from('badges')
      .select('user_id, badge_type, name, earned_at')
      .order('earned_at', { ascending: false })
      .limit(10);
    
    console.log(`\n🏆 TABELA BADGES (${badgesData?.length || 0} registros):`);
    if (badgesData?.length > 0) {
      console.log('Exemplo de registros:');
      badgesData.slice(0, 3).forEach(badge => {
        console.log(`  - user_id: ${badge.user_id}, type: ${badge.badge_type}, name: ${badge.name}`);
      });
    }
    
    // Analisar tabela checkins (usa public.users.id como user_id)
    const { data: checkinsData } = await adminSupabase
      .from('checkins')
      .select('user_id, event_id, checked_in_at')
      .order('checked_in_at', { ascending: false })
      .limit(10);
    
    console.log(`\n📍 TABELA CHECKINS (${checkinsData?.length || 0} registros):`);
    if (checkinsData?.length > 0) {
      console.log('Exemplo de registros:');
      checkinsData.slice(0, 3).forEach(checkin => {
        console.log(`  - user_id: ${checkin.user_id}, event_id: ${checkin.event_id}`);
      });
      
      // Verificar se os user_ids existem em public.users
      const uniqueUserIds = [...new Set(checkinsData.map(c => c.user_id))];
      console.log(`\n🔍 Verificando ${uniqueUserIds.length} user_ids únicos na tabela checkins:`);
      
      for (const userId of uniqueUserIds.slice(0, 5)) {
        const publicUser = publicUsers?.find(u => u.id === userId);
        const authUser = authUsers?.users?.find(u => u.id === publicUser?.auth_id);
        
        console.log(`  - ${userId}:`);
        console.log(`    Public: ${publicUser ? '✅ Existe' : '❌ Não existe'}`);
        console.log(`    Auth: ${authUser ? '✅ Existe' : '❌ Não existe'}`);
      }
    }
    
    // Analisar tabela ai_conversations (usa public.users.id como user_id)
    const { data: conversationsData } = await adminSupabase
      .from('ai_conversations')
      .select('user_id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`\n🤖 TABELA AI_CONVERSATIONS (${conversationsData?.length || 0} registros):`);
    if (conversationsData?.length > 0) {
      console.log('Exemplo de registros:');
      conversationsData.slice(0, 3).forEach(conv => {
        console.log(`  - user_id: ${conv.user_id}, title: ${conv.title || 'Sem título'}`);
      });
    }
    
    // 2. Propor soluções
    console.log('\n🔧 SOLUÇÕES PROPOSTAS:');
    console.log('\n1. PADRONIZAR REFERÊNCIAS:');
    console.log('   - Tabelas points e badges: Usar public.users.id em vez de auth_id');
    console.log('   - Tabelas checkins e ai_conversations: Já usam public.users.id (correto)');
    
    console.log('\n2. ATUALIZAR MIDDLEWARE DE AUTENTICAÇÃO:');
    console.log('   - Garantir que resolveUserId funcione corretamente');
    console.log('   - Usar public.users.id consistentemente nas APIs');
    
    console.log('\n3. CORRIGIR DADOS EXISTENTES:');
    console.log('   - Migrar user_ids na tabela points de auth_id para public.users.id');
    console.log('   - Migrar user_ids na tabela badges de auth_id para public.users.id');
    
    // 3. Executar correções se solicitado
    const shouldFix = process.argv.includes('--fix');
    
    if (shouldFix) {
      console.log('\n🔧 EXECUTANDO CORREÇÕES...');
      console.log('\n⚠️ IMPORTANTE: Antes de executar as correções de dados, você deve:');
      console.log('1. Executar o arquivo fix_points_constraint.sql no painel do Supabase');
      console.log('2. Executar o arquivo fix_badges_constraint.sql no painel do Supabase');
      console.log('3. Depois executar este script novamente com --migrate-data');
      
      if (process.argv.includes('--migrate-data')) {
        // Corrigir tabela points
        console.log('\n💰 Migrando dados da tabela points...');
        if (pointsData?.length > 0) {
          // Agrupar por auth_id para fazer updates em lote
          const authIdGroups = {};
          pointsData.forEach(point => {
            if (!authIdGroups[point.user_id]) {
              authIdGroups[point.user_id] = [];
            }
            authIdGroups[point.user_id].push(point);
          });
          
          for (const [authId, points] of Object.entries(authIdGroups)) {
            const publicUser = publicUsers?.find(u => u.auth_id === authId);
            if (publicUser && publicUser.id !== authId) {
              console.log(`  Migrando ${points.length} pontos: ${authId} -> ${publicUser.id}`);
              
              const { error } = await adminSupabase
                .from('points')
                .update({ user_id: publicUser.id })
                .eq('user_id', authId);
              
              if (error) {
                console.error(`  ❌ Erro ao migrar pontos:`, error.message);
              } else {
                console.log(`  ✅ ${points.length} pontos migrados com sucesso`);
              }
            }
          }
        }
        
        // Corrigir tabela badges
        console.log('\n🏆 Migrando dados da tabela badges...');
        if (badgesData?.length > 0) {
          // Agrupar por auth_id para fazer updates em lote
          const authIdGroups = {};
          badgesData.forEach(badge => {
            if (!authIdGroups[badge.user_id]) {
              authIdGroups[badge.user_id] = [];
            }
            authIdGroups[badge.user_id].push(badge);
          });
          
          for (const [authId, badges] of Object.entries(authIdGroups)) {
            const publicUser = publicUsers?.find(u => u.auth_id === authId);
            if (publicUser && publicUser.id !== authId) {
              console.log(`  Migrando ${badges.length} badges: ${authId} -> ${publicUser.id}`);
              
              const { error } = await adminSupabase
                .from('badges')
                .update({ user_id: publicUser.id })
                .eq('user_id', authId);
              
              if (error) {
                console.error(`  ❌ Erro ao migrar badges:`, error.message);
              } else {
                console.log(`  ✅ ${badges.length} badges migrados com sucesso`);
              }
            }
          }
        }
        
        console.log('\n✅ Migração de dados concluída!');
      }
    } else {
      console.log('\n💡 Para executar as correções:');
      console.log('   1. Execute os arquivos SQL no Supabase:');
      console.log('      - fix_points_constraint.sql');
      console.log('      - fix_badges_constraint.sql');
      console.log('   2. Depois execute: node fix_dashboard_data.js --fix --migrate-data');
    }
    
    // 4. Testar APIs após correção
    if (shouldFix) {
      console.log('\n🧪 TESTANDO APIS APÓS CORREÇÃO...');
      
      // Pegar um usuário de exemplo
      const testUser = publicUsers?.[0];
      if (testUser) {
        console.log(`\n🧪 Testando com usuário: ${testUser.email} (ID: ${testUser.id})`);
        
        // Testar pontos
        const { data: userPoints } = await adminSupabase
          .from('points')
          .select('amount')
          .eq('user_id', testUser.id);
        
        const totalPoints = userPoints?.reduce((sum, point) => sum + point.amount, 0) || 0;
        console.log(`  💰 Pontos totais: ${totalPoints}`);
        
        // Testar badges
        const { count: badgesCount } = await adminSupabase
          .from('badges')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', testUser.id);
        
        console.log(`  🏆 Badges: ${badgesCount || 0}`);
        
        // Testar checkins
        const { count: checkinsCount } = await adminSupabase
          .from('checkins')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', testUser.id);
        
        console.log(`  📍 Check-ins: ${checkinsCount || 0}`);
        
        // Testar conversas IA
        const { count: conversationsCount } = await adminSupabase
          .from('ai_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', testUser.id);
        
        console.log(`  🤖 Conversas IA: ${conversationsCount || 0}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  }
}

// Executar o script
fixDashboardData().then(() => {
  console.log('\n🎉 Script concluído!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});