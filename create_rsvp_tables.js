const { supabase } = require('./config/supabase');

async function createRSVPTables() {
  console.log('🔧 Criando tabelas de RSVP...');
  
  try {
    // Criar tabela event_rsvp
    console.log('📝 Criando tabela event_rsvp...');
    const { error: eventRsvpError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS event_rsvp (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL CHECK (status IN ('vai', 'nao_vai', 'talvez')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          notes TEXT,
          notification_enabled BOOLEAN DEFAULT true,
          UNIQUE(user_id, event_id)
        );
      `
    });
    
    if (eventRsvpError) {
      console.error('❌ Erro ao criar event_rsvp:', eventRsvpError);
    } else {
      console.log('✅ Tabela event_rsvp criada com sucesso!');
    }
    
    // Criar tabela manifestation_rsvp
    console.log('📝 Criando tabela manifestation_rsvp...');
    const { error: manifestationRsvpError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS manifestation_rsvp (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          manifestation_id UUID NOT NULL REFERENCES manifestations(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL CHECK (status IN ('vai', 'nao_vai', 'talvez')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          notes TEXT,
          notification_enabled BOOLEAN DEFAULT true,
          UNIQUE(user_id, manifestation_id)
        );
      `
    });
    
    if (manifestationRsvpError) {
      console.error('❌ Erro ao criar manifestation_rsvp:', manifestationRsvpError);
    } else {
      console.log('✅ Tabela manifestation_rsvp criada com sucesso!');
    }
    
    // Habilitar RLS
    console.log('🔒 Habilitando RLS...');
    await supabase.rpc('exec', {
      sql: 'ALTER TABLE event_rsvp ENABLE ROW LEVEL SECURITY;'
    });
    
    await supabase.rpc('exec', {
      sql: 'ALTER TABLE manifestation_rsvp ENABLE ROW LEVEL SECURITY;'
    });
    
    console.log('🎉 Tabelas RSVP criadas com sucesso!');
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

createRSVPTables();