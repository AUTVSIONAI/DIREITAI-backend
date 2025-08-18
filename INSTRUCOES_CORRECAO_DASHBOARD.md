# 🔧 Correção dos Dados do Dashboard

## 📋 Problema Identificado

O dashboard do usuário está exibindo dados zerados porque existe uma inconsistência nas referências de `user_id` entre as tabelas:

- **Tabelas `points` e `badges`**: Usam `auth_id` (referência para `auth.users(id)`)
- **Tabelas `checkins` e `ai_conversations`**: Usam `public.users.id` (correto)
- **Sistema esperado**: Todas as tabelas deveriam usar `public.users.id`

## 🎯 Solução

A solução envolve 2 passos principais:

### Passo 1: Executar Scripts SQL no Supabase

**IMPORTANTE: Execute estes scripts SQL no painel do Supabase na ordem correta!**

1. **Primeiro**, execute o script `fix_points_constraint.sql` no painel SQL do Supabase
2. **Depois**, execute o script `fix_badges_constraint.sql` no painel SQL do Supabase

Estes scripts irão:
- **Migrar automaticamente** os dados existentes de `auth_id` para `public.users.id`
- Alterar as foreign keys das tabelas `points` e `badges` para referenciar `public.users(id)` em vez de `auth.users(id)`
- Atualizar as políticas RLS para funcionar corretamente com as novas referências
- Verificar se a migração foi bem-sucedida

**NOTA**: Os scripts agora incluem a migração de dados, então não é mais necessário executar o script JavaScript separadamente para migração.

### Passo 2: Verificar a Correção

Para verificar se tudo foi corrigido:

```bash
cd backend
node fix_dashboard_data.js
```

Este comando irá mostrar um relatório de diagnóstico confirmando que os dados estão consistentes.

## 📊 Arquivos Criados

- `fix_points_constraint.sql` - Corrige constraint da tabela points
- `fix_badges_constraint.sql` - Corrige constraint da tabela badges
- `fix_dashboard_data.js` - Script de diagnóstico e migração de dados
- `INSTRUCOES_CORRECAO_DASHBOARD.md` - Este arquivo de instruções

## 🔍 O que será corrigido

### Antes da correção:
- Tabela `points`: `user_id` → `auth.users(id)` (auth_id)
- Tabela `badges`: `user_id` → `auth.users(id)` (auth_id)
- Dashboard mostra dados zerados

### Depois da correção:
- Tabela `points`: `user_id` → `public.users(id)`
- Tabela `badges`: `user_id` → `public.users(id)`
- Dashboard mostra dados reais do usuário

## ⚠️ AVISOS IMPORTANTES

1. **Execute os scripts SQL na ordem correta** (primeiro points, depois badges)
2. **Faça backup dos dados** antes de executar os scripts
3. **Os scripts incluem migração automática** de dados de `auth_id` para `public.users.id`
4. **Os scripts removem registros órfãos** (pontos/badges de usuários que não existem mais)
5. **Teste em ambiente de desenvolvimento** primeiro, se possível

## 🧪 Teste Final

Após a correção, acesse o dashboard do usuário e verifique se os dados estão sendo exibidos corretamente:

- ✅ Check-ins
- ✅ Conversas de IA
- ✅ Ranking
- ✅ Conquistas
- ✅ Progresso semanal
- ✅ Meta mensal
- ✅ Atividades recentes

## 🆘 Em caso de problemas

Se houver erros durante a execução:

1. Verifique se os scripts SQL foram executados corretamente
2. Verifique se não há erros de constraint no console do Supabase
3. Execute `node fix_dashboard_data.js` para diagnóstico
4. Entre em contato para suporte adicional

---

**Status**: ⏳ Aguardando execução manual dos scripts SQL no Supabase