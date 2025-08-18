require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function populateBadges() {
  try {
    console.log('🏅 Iniciando população de badges...');
    
    // Buscar todos os usuários que têm pontos
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, auth_id, username, full_name')
      .not('id', 'is', null);
    
    if (usersError) {
      console.error('❌ Erro ao buscar usuários:', usersError);
      return;
    }
    
    console.log('👥 Usuários encontrados:', users?.length || 0);
    
    for (const user of users) {
      console.log(`\n🔍 Processando usuário: ${user.username || user.full_name} (${user.id})`);
      
      // Verificar se já tem badges
      const { data: existingBadges } = await supabase
        .from('badges')
        .select('*')
        .eq('user_id', user.id);
      
      if (existingBadges && existingBadges.length > 0) {
        console.log(`✅ Usuário já tem ${existingBadges.length} badges`);
        continue;
      }
      
      // Buscar pontos do usuário
      const { data: userPoints } = await supabase
        .from('points')
        .select('*')
        .eq('user_id', user.id);
      
      const totalPoints = userPoints?.reduce((sum, point) => sum + point.amount, 0) || 0;
      console.log(`💰 Total de pontos: ${totalPoints}`);
      
      // Badges iniciais para todos os usuários
      const initialBadges = [
        {
          user_id: user.id,
          badge_type: 'welcome',
          name: 'Bem-vindo!',
          description: 'Parabéns por se juntar à nossa comunidade!',
          icon: '👋',
          achievement_id: 'welcome',
          earned_at: new Date().toISOString()
        },
        {
          user_id: user.id,
          badge_type: 'login',
          name: 'Primeiro Acesso',
          description: 'Realizou seu primeiro login na plataforma',
          icon: '🚪',
          achievement_id: 'first_login',
          earned_at: new Date().toISOString()
        }
      ];
      
      // Badges baseados em pontos
      if (totalPoints >= 50) {
        initialBadges.push({
          user_id: user.id,
          badge_type: 'points',
          name: 'Colecionador de Pontos',
          description: 'Acumulou 50 pontos ou mais',
          icon: '💰',
          achievement_id: 'point_collector',
          earned_at: new Date().toISOString()
        });
      }
      
      if (totalPoints >= 100) {
        initialBadges.push({
          user_id: user.id,
          badge_type: 'points',
          name: 'Mestre dos Pontos',
          description: 'Acumulou 100 pontos ou mais',
          icon: '🏆',
          achievement_id: 'point_master',
          earned_at: new Date().toISOString()
        });
      }
      
      // Badges baseados em atividades específicas
      const aiPoints = userPoints?.filter(p => p.source === 'ai_chat') || [];
      if (aiPoints.length >= 3) {
        initialBadges.push({
          user_id: user.id,
          badge_type: 'ai',
          name: 'Entusiasta da IA',
          description: 'Realizou 3 ou mais conversas com IA',
          icon: '🤖',
          achievement_id: 'ai_enthusiast',
          earned_at: new Date().toISOString()
        });
      }
      
      const eventPoints = userPoints?.filter(p => p.source === 'event') || [];
      if (eventPoints.length >= 1) {
        initialBadges.push({
          user_id: user.id,
          badge_type: 'event',
          name: 'Participante de Eventos',
          description: 'Participou de pelo menos um evento',
          icon: '🎉',
          achievement_id: 'event_participant',
          earned_at: new Date().toISOString()
        });
      }
      
      // Inserir badges
      if (initialBadges.length > 0) {
        const { error: insertError } = await supabase
          .from('badges')
          .insert(initialBadges);
        
        if (insertError) {
          console.error(`❌ Erro ao inserir badges para ${user.username}:`, insertError);
        } else {
          console.log(`✅ ${initialBadges.length} badges adicionados para ${user.username}`);
        }
      }
    }
    
    console.log('\n🎉 População de badges concluída!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

populateBadges();