const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://vussgslenvyztckeuyap.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_ANON_KEY não encontrada');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente admin para operações que precisam contornar RLS
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuração de CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://direitai.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  // Set CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'ID do político é obrigatório' });
  }

  try {
    if (req.method === 'GET') {
      // Buscar político específico com seu agente IA
      const { data: politician, error } = await supabase
        .from('politicians')
        .select(`
          *,
          politician_agents (
            id,
            trained_prompt,
            voice_id,
            personality_config,
            is_active
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Político não encontrado' });
        }
        console.error('Erro ao buscar político:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      return res.status(200).json({
        success: true,
        data: politician
      });
    }

    if (req.method === 'PUT') {
      // Verificar autenticação e permissão de admin
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      // Verificar se é admin usando service role para evitar RLS
      const { data: userProfile } = await adminSupabase
        .from('users')
        .select('role')
        .eq('auth_id', user.id)
        .single();

      if (!userProfile || userProfile.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem editar políticos.' });
      }

      // Atualizar político
      const {
        name,
        position,
        state,
        party,
        photo_url,
        short_bio,
        social_links,
        government_plan,
        government_plan_pdf_url,
        main_ideologies,
        is_active
      } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (position !== undefined) updateData.position = position;
      if (state !== undefined) updateData.state = state?.toUpperCase();
      if (party !== undefined) updateData.party = party;
      if (photo_url !== undefined) updateData.photo_url = photo_url;
      if (short_bio !== undefined) updateData.short_bio = short_bio;
      if (social_links !== undefined) updateData.social_links = social_links;
      if (government_plan !== undefined) updateData.government_plan = government_plan;
      if (government_plan_pdf_url !== undefined) updateData.government_plan_pdf_url = government_plan_pdf_url;
      if (main_ideologies !== undefined) updateData.main_ideologies = main_ideologies;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data: politician, error: updateError } = await supabase
        .from('politicians')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        if (updateError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Político não encontrado' });
        }
        console.error('Erro ao atualizar político:', updateError);
        return res.status(500).json({ error: 'Erro ao atualizar político' });
      }

      return res.status(200).json({
        success: true,
        data: politician,
        message: 'Político atualizado com sucesso'
      });
    }

    if (req.method === 'DELETE') {
      // Verificar autenticação e permissão de admin
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      // Verificar se é admin usando service role para evitar RLS
      const { data: userProfile } = await adminSupabase
        .from('users')
        .select('role')
        .eq('auth_id', user.id)
        .single();

      if (!userProfile || userProfile.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem deletar políticos.' });
      }

      // Soft delete - marcar como inativo
      const { data: politician, error: deleteError } = await supabase
        .from('politicians')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (deleteError) {
        if (deleteError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Político não encontrado' });
        }
        console.error('Erro ao deletar político:', deleteError);
        return res.status(500).json({ error: 'Erro ao deletar político' });
      }

      return res.status(200).json({
        success: true,
        message: 'Político removido com sucesso'
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error) {
    console.error('Erro na API de político específico:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};