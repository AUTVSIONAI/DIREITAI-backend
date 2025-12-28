-- Store Tables
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  image_url TEXT,
  type VARCHAR(20) DEFAULT 'physical',
  stock_quantity INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  affiliate_enabled BOOLEAN DEFAULT true,
  affiliate_rate_percent DECIMAL(5,2) DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Content Moderation Tables
CREATE TABLE IF NOT EXISTS content_moderation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  content_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  author_id UUID REFERENCES users(id),
  target_id UUID,
  content_id UUID,
  ai_template TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  moderated_at TIMESTAMPTZ,
  moderator_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID,
  content_type VARCHAR(50),
  reporter_id UUID REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users columns check
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_plan') THEN
        ALTER TABLE users ADD COLUMN subscription_plan VARCHAR(50) DEFAULT 'free';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_admin') THEN
        ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Adjust as needed)
-- Products
DROP POLICY IF EXISTS "Public read products" ON products;
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage products" ON products;
CREATE POLICY "Admin manage products" ON products FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE is_admin = true));

-- Cart Items
DROP POLICY IF EXISTS "Users manage own cart" ON cart_items;
CREATE POLICY "Users manage own cart" ON cart_items FOR ALL USING (auth.uid() = user_id);

-- Content Moderation
DROP POLICY IF EXISTS "Admins manage moderation" ON content_moderation;
CREATE POLICY "Admins manage moderation" ON content_moderation FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE is_admin = true));
