/**
 * Atualiza o campo position de um político por ID ou nome usando adminSupabase
 * Uso:
 *   node scripts/update_politician_position.js --id <uuid> --position "pré-candidato a deputado federal"
 *   node scripts/update_politician_position.js --name "Padre Kelmon" --position "pré-candidato a deputado federal"
 */
const { adminSupabase } = require('../config/supabase');

async function updatePosition({ id, name, position }) {
  if (!position || !position.trim()) {
    console.error('Posição (position) é obrigatória.');
    process.exit(1);
  }

  try {
    let politician;
    if (id) {
      const { data, error } = await adminSupabase
        .from('politicians')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) throw new Error('Político não encontrado por ID');
      politician = data;
    } else if (name) {
      const { data, error } = await adminSupabase
        .from('politicians')
        .select('*')
        .ilike('name', name)
        .limit(1);
      if (error || !data || data.length === 0) throw new Error('Político não encontrado por nome');
      politician = data[0];
    } else {
      throw new Error('Informe --id ou --name');
    }

    const { error: updError } = await adminSupabase
      .from('politicians')
      .update({ position })
      .eq('id', politician.id);
    if (updError) throw updError;

    console.log(`✅ Position atualizado para '${position}' para ${politician.name} (id: ${politician.id})`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Falha ao atualizar position:', err.message || err);
    process.exit(1);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--id') out.id = args[++i];
    else if (a === '--name') out.name = args[++i];
    else if (a === '--position') out.position = args[++i];
  }
  return out;
}

(async () => {
  const opts = parseArgs();
  await updatePosition(opts);
})();