#!/usr/bin/env node
const path = require('path');
const { adminSupabase } = require('../config/supabase');

async function recalcById(id) {
  const { data: ratings, error } = await adminSupabase
    .from('politician_ratings')
    .select('rating')
    .eq('politician_id', id);
  if (error) {
    console.error('Erro ao buscar avaliações:', error);
    return { id, error };
  }
  const totalVotes = ratings?.length || 0;
  const averageRating = totalVotes > 0
    ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalVotes
    : 0;
  const { error: updateError } = await adminSupabase
    .from('politicians')
    .update({
      total_votes: totalVotes,
      average_rating: Math.round(averageRating * 100) / 100
    })
    .eq('id', id);
  if (updateError) {
    console.error('Erro ao atualizar político:', updateError);
    return { id, error: updateError };
  }
  return { id, total_votes: totalVotes, average_rating: Math.round(averageRating * 100) / 100 };
}

async function main() {
  const args = process.argv.slice(2);
  let id = null;
  let name = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--id') id = args[++i];
    else if (args[i] === '--name') name = args[++i];
  }
  if (!id && !name) {
    console.error('Uso: node scripts/recalc_politician_stats.js --id <ID> | --name <parte do nome>');
    process.exit(1);
  }
  let ids = [];
  if (id) {
    ids = [id];
  } else if (name) {
    const { data: politicians, error } = await adminSupabase
      .from('politicians')
      .select('id,name')
      .ilike('name', `%${name}%`);
    if (error) {
      console.error('Erro ao buscar políticos por nome:', error);
      process.exit(1);
    }
    if (!politicians || politicians.length === 0) {
      console.error('Nenhum político encontrado com nome que contenha:', name);
      process.exit(1);
    }
    console.log('Encontrados:', politicians.map(p => `${p.id} - ${p.name}`).join(' | '));
    ids = politicians.map(p => p.id);
  }
  const results = [];
  for (const pid of ids) {
    const r = await recalcById(pid);
    results.push(r);
  }
  console.log('Recalculo concluído:', results);
}

main().catch(err => {
  console.error('Erro geral no recálculo:', err);
  process.exit(1);
});