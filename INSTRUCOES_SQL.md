# Instruções para Criar Tabelas no Supabase

Como o Supabase não permite execução direta de SQL via API, você precisa executar os comandos SQL manualmente no Supabase Dashboard.

## Como executar:

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **SQL Editor** no menu lateral
4. Cole e execute o conteúdo do arquivo `create-store-events-tables.sql`

## O que será criado:

### Tabelas:
- **products** - Produtos da loja com coluna `image_url` para imagens
- **events** - Eventos com coluna `image_url` para imagens
- **cart_items** - Itens do carrinho de compras
- **orders** - Pedidos realizados
- **order_items** - Itens dos pedidos
- **event_checkins** - Check-ins em eventos

### Recursos adicionais:
- Índices para melhor performance
- Triggers para atualizar `updated_at` automaticamente
- Políticas de segurança (RLS)
- Dados de exemplo para teste

## Colunas para imagens:

✅ **Já existem e estão prontas para uso:**
- `politicians.photo_url` - Fotos dos políticos
- `politician_posts.cover_image_url` - Imagens de capa dos posts
- `products.image_url` - Imagens dos produtos (será criada)
- `events.image_url` - Imagens dos eventos (será criada)

## ⚠️ IMPORTANTE

Este script deve ser executado **MANUALMENTE** no Supabase Dashboard porque:
- A função `exec_sql` não está disponível no RPC
- É necessário executar os comandos um por vez para verificar erros
- Algumas tabelas podem já existir (o script usa `IF NOT EXISTS`)

## 🔧 CORREÇÃO APLICADA

**ERRO CORRIGIDO**: `ERROR: 42703: column "status" does not exist`

- ✅ Corrigidas as referências de `users(id)` para `auth.users(id)`
- ✅ O script agora está compatível com a estrutura do Supabase
- ✅ Todas as foreign keys apontam corretamente para `auth.users(id)`

## 🔧 Solução para Erros de Constraint

### Erro 1: "column status does not exist"

O erro `ERROR: 42703: column "status" does not exist` ocorre porque as tabelas existentes no seu banco de dados têm uma estrutura ligeiramente diferente do que o script `create-store-events-tables.sql` espera:

- **Tabela `products`**: Não tem coluna `status`, mas tem coluna `active`
- **Tabela `events`**: Tem coluna `status`, mas o script espera `event_status`

### Erro 2: "violates check constraint events_event_status_check"

O erro `ERROR: 23514: new row for relation "events" violates check constraint "events_event_status_check"` ocorre quando há valores inválidos na coluna `event_status` que não correspondem aos valores permitidos pela constraint (`'active'`, `'cancelled'`, `'completed'`).

### 📋 Passos para Resolver:

#### Passo 1: Corrigir estrutura das colunas

1. **Acesse o painel do Supabase** → SQL Editor
2. **Execute o arquivo `manual-fix-columns.sql`** que foi criado automaticamente
3. **Ou copie e cole este código SQL**:

```sql
-- 1. Adicionar coluna status à tabela products
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE products ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        ALTER TABLE products ADD CONSTRAINT products_status_check
            CHECK (status IN ('active', 'inactive', 'out_of_stock'));
        UPDATE products SET status = CASE
            WHEN active = true THEN 'active'
            ELSE 'inactive'
        END;
        RAISE NOTICE 'Coluna status adicionada à tabela products';
    END IF;
END $$;

-- 2. Adicionar coluna event_status à tabela events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events'
        AND column_name = 'event_status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE events ADD COLUMN event_status VARCHAR(20) DEFAULT 'active';
        ALTER TABLE events ADD CONSTRAINT events_event_status_check
            CHECK (event_status IN ('active', 'cancelled', 'completed'));
        UPDATE events SET event_status = status;
        RAISE NOTICE 'Coluna event_status adicionada à tabela events';
    END IF;
END $$;

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_events_event_status ON events(event_status);
```

#### Passo 2: Corrigir valores inválidos na constraint

Se você receber o erro `violates check constraint events_event_status_check`, execute este script:

```sql
-- Corrigir valores inválidos na coluna event_status
UPDATE events 
SET event_status = CASE 
    WHEN event_status = 'ativo' THEN 'active'
    WHEN event_status = 'cancelado' THEN 'cancelled'
    WHEN event_status = 'concluido' OR event_status = 'concluído' THEN 'completed'
    WHEN event_status IS NULL THEN 'active'
    ELSE event_status
END
WHERE event_status NOT IN ('active', 'cancelled', 'completed') OR event_status IS NULL;

-- Recriar constraint se necessário
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'events_event_status_check' 
        AND table_name = 'events'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE events DROP CONSTRAINT events_event_status_check;
    END IF;
    
    ALTER TABLE events ADD CONSTRAINT events_event_status_check 
        CHECK (event_status IN ('active', 'cancelled', 'completed'));
END $$;
```

### ✅ Verificação

Após executar os comandos acima, execute esta query para verificar se as correções foram aplicadas:

```sql
-- Verificar se as colunas foram criadas
SELECT 
    'products' as tabela,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('status', 'active')
AND table_schema = 'public'

UNION ALL

SELECT 
    'events' as tabela,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('status', 'event_status')
AND table_schema = 'public'
ORDER BY tabela, column_name;

-- Verificar valores válidos na coluna event_status
SELECT DISTINCT event_status, COUNT(*) as quantidade 
FROM events 
GROUP BY event_status;
```

### 🧪 Verificar se funcionou:

Após executar o SQL acima, teste com:
```bash
node run-fix-columns.js
```

Se tudo estiver correto, você verá:
- ✅ products.status: OK
- ✅ events.event_status: OK

### 📁 Scripts Disponíveis:

- `manual-fix-columns.sql` - Comandos para corrigir as colunas
- `add-featured-column.sql` - **NOVO**: Adiciona a coluna featured à tabela products
- `add-is-active-column.sql` - **NOVO**: Adiciona colunas is_active e is_public à tabela events
- `add-image-url-column.sql` - **NOVO**: Adiciona a coluna image_url à tabela products
- `add-image-column.sql` - **NOVO**: Adiciona a coluna image (TEXT) e converte images para JSONB
- `add-date-column.sql` - **NOVO**: Adiciona a coluna date (obrigatória) e outras colunas à tabela events
- `add-event-status-column.sql` - Adiciona a coluna event_status à tabela events
- `check-event-status-column.sql` - Verifica se a coluna event_status existe
- `fix-event-status-constraint.sql` - Corrige valores inválidos na constraint event_status
- `debug-status-error.sql` - Script de depuração (opcional)
- `cleanup-tables.sql` - Limpeza completa (opcional, use com cuidado)
- `run-fix-columns.js` - Script Node.js para diagnóstico
- `test-direct-sql.js` - Script de teste de conectividade

## 🔧 NOVO ERRO: "column featured does not exist"

**ERRO**: `ERROR: 42703: column "featured" does not exist`

Este erro indica que a coluna `featured` não existe na tabela `products`. Isso acontece quando a tabela `products` foi criada sem esta coluna.

### 🛠️ Solução Rápida:

**Execute este comando SQL no Supabase Dashboard:**

```sql
-- Adicionar coluna featured à tabela products
ALTER TABLE products ADD COLUMN featured BOOLEAN DEFAULT false;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
```

## 🔧 NOVO ERRO: "column is_active does not exist"

**ERRO**: `ERROR: 42703: column "is_active" does not exist`

Este erro indica que as colunas `is_active` e `is_public` não existem na tabela `events`. Isso acontece quando a tabela `events` foi criada sem essas colunas.

### 🛠️ Solução Rápida:

**Execute este comando SQL no Supabase Dashboard:**

```sql
-- Adicionar colunas is_active e is_public à tabela events
ALTER TABLE events ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE events ADD COLUMN is_public BOOLEAN DEFAULT true;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_public ON events(is_public);
```

## 🔧 ERRO CORRIGIDO: "column image_url does not exist"

**ERRO**: `ERROR: 42703: column "image_url" of relation "products" does not exist`

**✅ SOLUÇÃO APLICADA**: O script foi corrigido para usar a coluna `images` (JSONB) que já existe na tabela `products`, em vez de `image_url` (TEXT).

### 📋 Correção Implementada:

- Alterado `INSERT INTO products (..., image_url, ...)` para `INSERT INTO products (..., images, ...)`
- Convertido valores de string para array JSONB: `'["https://exemplo.com/imagem.jpg"]'::jsonb`
- A coluna `images` permite armazenar múltiplas URLs de imagens em formato JSON

### 🔍 Estrutura das Colunas de Imagem:

```sql
-- A tabela products possui três colunas para imagens:
image TEXT        -- URL da imagem principal (compatibilidade)
image_url TEXT    -- URL da imagem principal
images JSONB      -- Array de URLs de imagens em formato JSON
-- Exemplo images: '["url1.jpg", "url2.jpg"]'
```

### 📋 Sobre as Colunas de Imagem:

- **`image`**: Coluna de compatibilidade do tipo TEXT para uma única URL de imagem
- **`image_url`**: Coluna principal do tipo TEXT para uma única URL de imagem  
- **`images`**: Coluna do tipo JSONB para múltiplas URLs de imagens em formato array JSON

**Script disponível**: `add-image-column.sql` - Adiciona a coluna `image` e converte `images` de TEXT[] para JSONB se necessário.

## 🔧 ERRO: "null value in column date violates not-null constraint"

**ERRO**: `ERROR: 23502: null value in column "date" of relation "events" violates not-null constraint`

Este erro indica que a tabela `events` possui uma coluna `date` com constraint NOT NULL, mas o script não está fornecendo valores para ela.

### 🛠️ Solução Rápida:

**Execute este comando SQL no Supabase Dashboard:**

```sql
-- Se a coluna date não existir, adicione:
ALTER TABLE events ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Se existir mas estiver vazia, preencha:
UPDATE events SET date = start_date::DATE WHERE date IS NULL;
ALTER TABLE events ALTER COLUMN date SET NOT NULL;
```

**Solução Completa:** Execute o script `add-date-column.sql`

## 🔧 ERRO: "trigger already exists"

**ERRO**: `ERROR: 42710: trigger "update_products_updated_at" already exists`

Este erro indica que o trigger já foi criado em uma execução anterior do script.

### 🛠️ Solução:

Este erro foi corrigido no script principal `create-store-events-tables.sql` usando `CREATE OR REPLACE TRIGGER`. Se ainda encontrar este erro, execute:

```sql
-- Remover triggers existentes e recriar
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;

-- Recriar triggers
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 🔧 ERRO: "column stock does not exist"

**ERRO**: `ERROR: 42703: column "stock" does not exist`

Este erro indica que o script está tentando inserir dados na coluna `stock`, mas a tabela `products` usa `stock_quantity`.

### 🛠️ Solução:

Este erro foi corrigido no script principal `create-store-events-tables.sql`. A tabela `products` tem duas colunas de estoque:
- `stock` INTEGER DEFAULT 0
- `stock_quantity` INTEGER DEFAULT 0 (alias para compatibilidade)

Se ainda encontrar este erro, verifique se a tabela foi criada corretamente ou execute:

```sql
-- Verificar estrutura da tabela products
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' AND table_schema = 'public'
ORDER BY ordinal_position;
```

## 🔧 ERRO: "invalid input value for enum event_category: \"encontro\""

**ERRO**: `ERROR: 22P02: invalid input value for enum event_category: "encontro"`

Este erro indica que o valor 'encontro' não é aceito pelo ENUM `event_category`. Os valores aceitos são:
- `palestra`
- `debate` 
- `manifestacao`
- `reuniao`
- `workshop`
- `outro`

### 🛠️ Solução Rápida:

**Execute este comando SQL no Supabase Dashboard:**

```sql
-- Atualizar categoria inválida para valor aceito
UPDATE events SET category = 'outro' WHERE category = 'encontro';
```

**Solução Completa:** Execute o script `fix-event-category-enum.sql`

## 🔧 ERRO: "null value in column secret_code violates not-null constraint"

**ERRO**: `ERROR: 23502: null value in column "secret_code" of relation "events" violates not-null constraint`

Este erro indica que a coluna `secret_code` está definida como NOT NULL no banco de dados, mas o script de inserção não fornece valores para ela.

### 🛠️ Solução Rápida:

**Execute este comando SQL no Supabase Dashboard:**

```sql
-- Tornar a coluna secret_code nullable
ALTER TABLE events ALTER COLUMN secret_code DROP NOT NULL;

-- Gerar códigos para registros existentes sem secret_code
UPDATE events 
SET secret_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6))
WHERE secret_code IS NULL;
```

**Solução Completa:** Execute o script `fix-secret-code-constraint.sql`

## 🔧 ERRO: "value too long for type character varying(7)"

**ERRO**: `ERROR: 22001: value too long for type character varying(7)`

Este erro indica que um valor está sendo inserido em uma coluna com tamanho limitado, mas o valor excede o limite. Geralmente ocorre na coluna `color` da tabela `politician_tags` que está definida como `VARCHAR(7)` mas recebe cores hex com 7 caracteres (#RRGGBB).

### 🛠️ Solução Rápida:

**Execute este comando SQL no Supabase Dashboard:**

```sql
-- Aumentar o tamanho da coluna color para VARCHAR(8)
ALTER TABLE politician_tags 
ALTER COLUMN color TYPE VARCHAR(8);
```

**Solução Completa:** Execute o script `fix-color-column-length.sql`

---

## 🔧 ERRO ANTERIOR: "column event_status does not exist"

**ERRO**: `ERROR: 42703: column "event_status" does not exist`

Este erro indica que a coluna `event_status` não foi criada na tabela `events`. Isso pode acontecer se:
- O script `manual-fix-columns.sql` não foi executado
- A tabela `events` não tinha uma coluna `status` original para migrar
- Houve algum erro na execução anterior

### 🛠️ Solução Rápida:

**Execute este comando SQL no Supabase Dashboard:**

```sql
-- Adicionar coluna event_status à tabela events
ALTER TABLE events ADD COLUMN event_status VARCHAR(20) DEFAULT 'active';

-- Adicionar constraint
ALTER TABLE events ADD CONSTRAINT events_event_status_check
    CHECK (event_status IN ('active', 'cancelled', 'completed'));

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_events_event_status ON events(event_status);
```

### 🚨 Ordem de Execução Recomendada:

1. **Primeiro**: Execute `add-featured-column.sql` (cria a coluna featured na tabela products)
2. **Segundo**: Execute `add-is-active-column.sql` (cria as colunas is_active e is_public na tabela events)
3. **Terceiro**: Execute `add-image-column.sql` (cria a coluna image e converte images para JSONB)
4. **Quarto**: Execute `add-date-column.sql` (adiciona a coluna date obrigatória e outras colunas à tabela events)
5. **Quinto**: Execute `fix-event-category-enum.sql` (corrige valores inválidos no ENUM event_category)
6. **Sexto**: Execute `fix-secret-code-constraint.sql` (corrige constraint NOT NULL da coluna secret_code)
7. **Sétimo**: Execute `fix-color-column-length.sql` (corrige tamanho da coluna color na tabela politician_tags)
8. **Oitavo**: Execute `add-event-status-column.sql` (cria a coluna event_status na tabela events)
9. **Nono**: Execute `manual-fix-columns.sql` (corrige estrutura das outras colunas)
10. **Décimo**: Execute `fix-event-status-constraint.sql` (corrige valores inválidos)
11. **Por último**: Execute `create-store-events-tables.sql` (script principal)

### 🔧 Scripts de Depuração (Opcionais):

Se ainda houver problemas, use os scripts de diagnóstico:

```bash
# Verificar estrutura atual das tabelas
node test-direct-sql.js

# Diagnóstico completo
node run-sql.js debug-status-error.sql

# Limpeza completa (⚠️ Remove todas as tabelas!)
node run-sql.js cleanup-tables.sql
```

## Status:

- ✅ Estrutura do banco verificada
- ✅ Script SQL criado
- ⚠️  **Pendente:** Execução manual no Supabase Dashboard

## Próximos passos:

1. Execute o SQL no Supabase Dashboard
2. Teste o upload de imagens nos componentes
3. Verifique se as URLs estão sendo salvas corretamente