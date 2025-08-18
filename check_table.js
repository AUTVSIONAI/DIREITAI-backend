require('dotenv').config();
const { supabase } = require('./config/supabase');

async function checkTable() {
  try {
    console.log('=== Verificando foreign keys ===');
    
    // Verificar foreign keys da tabela geographic_checkins
    const { data: fkeys, error: fkError } = await supabase
      .rpc('get_foreign_keys', { table_name: 'geographic_checkins' })
      .select();
    
    if (fkError) {
      console.log('FK RPC error:', fkError.message);
      
      // Tentar query SQL direta
      const { data: fkData, error: sqlError } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, table_name, constraint_type')
        .eq('table_name', 'geographic_checkins')
        .eq('constraint_type', 'FOREIGN KEY');
      
      if (sqlError) {
        console.log('SQL FK error:', sqlError.message);
      } else {
        console.log('Foreign keys via SQL:', fkData);
      }
    } else {
      console.log('Foreign keys via RPC:', fkeys);
    }
    
    // Tentar join sem especificar o nome da foreign key
    console.log('\n=== Testando join sem nome específico ===');
    const { data: joinData, error: joinError } = await supabase
      .from('geographic_checkins')
      .select(`
        checked_in_at,
        latitude,
        longitude,
        user:users(id, username, full_name),
        manifestation:manifestations(name, city, state)
      `)
      .limit(1);
    
    if (joinError) {
      console.log('Join error:', joinError.message);
    } else {
      console.log('Join success:', joinData);
    }
    
    // Verificar se a tabela users tem auth_id em vez de id
    console.log('\n=== Verificando estrutura da tabela users ===');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (userError) {
      console.log('User error:', userError.message);
    } else if (userData && userData.length > 0) {
      console.log('User columns:', Object.keys(userData[0]));
    }
    
  } catch (err) {
    console.error('Script error:', err.message);
  }
}

checkTable();