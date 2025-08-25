const { supabase } = require('./supabase');

// Wrapper simples que retorna o supabase diretamente
// O código existente precisa ser refatorado para usar supabase ao invés de pool.query
const pool = supabase;

module.exports = pool;