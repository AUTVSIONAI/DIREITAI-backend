-- Corrigir URLs de imagens inválidas nos produtos
-- Substituir URLs de exemplo por URLs de placeholder válidas ou NULL

-- Atualizar produtos com URLs de exemplo para usar placeholders válidos
UPDATE products 
SET image = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center'
WHERE image LIKE '%example.com%';

-- Atualizar array de imagens também se necessário
UPDATE products 
SET images = ARRAY['https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center']
WHERE images::text LIKE '%example.com%';

-- Verificar produtos atualizados
SELECT id, name, image, images 
FROM products 
WHERE image LIKE '%unsplash%' OR images::text LIKE '%unsplash%';