# 🚨 INSTRUÇÕES URGENTES - Criar Tabelas RSVP

As tabelas de RSVP não existem no banco de dados, causando os erros 404. Você precisa criar essas tabelas manualmente no Supabase Dashboard.

## ⚡ Como Resolver AGORA:

### 1. Acesse o Supabase Dashboard
- Vá para: https://supabase.com/dashboard
- Selecione seu projeto DireitaAI
- Clique em **SQL Editor** no menu lateral

### 2. Execute este SQL (copie e cole):

```sql
-- Criar tabela para RSVP de eventos
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

-- Criar tabela para RSVP de manifestações
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

-- Habilitar RLS (Row Level Security)
ALTER TABLE event_rsvp ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifestation_rsvp ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para event_rsvp
CREATE POLICY "Users can view own event rsvps" ON event_rsvp
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own event rsvps" ON event_rsvp
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own event rsvps" ON event_rsvp
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own event rsvps" ON event_rsvp
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas de segurança para manifestation_rsvp
CREATE POLICY "Users can view own manifestation rsvps" ON manifestation_rsvp
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own manifestation rsvps" ON manifestation_rsvp
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own manifestation rsvps" ON manifestation_rsvp
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own manifestation rsvps" ON manifestation_rsvp
    FOR DELETE USING (auth.uid() = user_id);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_event_rsvp_user ON event_rsvp(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_event ON event_rsvp(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_status ON event_rsvp(status);

CREATE INDEX IF NOT EXISTS idx_manifestation_rsvp_user ON manifestation_rsvp(user_id);
CREATE INDEX IF NOT EXISTS idx_manifestation_rsvp_manifestation ON manifestation_rsvp(manifestation_id);
CREATE INDEX IF NOT EXISTS idx_manifestation_rsvp_status ON manifestation_rsvp(status);
```

### 3. Clique em "RUN" para executar

### 4. Verifique se funcionou:
- Vá para a aba **Table Editor**
- Você deve ver as tabelas `event_rsvp` e `manifestation_rsvp`

## ✅ Status Atual:

- ❌ **Tabelas RSVP**: NÃO EXISTEM (causando erros 404)
- ✅ **Rotas Backend**: Configuradas com fallback temporário
- ✅ **Frontend**: Funcionando, mas sem confirmação de presença

## 🔧 Workaround Temporário:

Enquanto as tabelas não são criadas:
- ✅ As APIs retornam dados vazios em vez de erro 404
- ✅ O frontend não quebra
- ❌ Usuários não conseguem confirmar presença

## 🚨 URGENTE:

**Execute o SQL acima AGORA para resolver completamente o problema!**

Após criar as tabelas, o sistema de confirmação de presença funcionará perfeitamente.