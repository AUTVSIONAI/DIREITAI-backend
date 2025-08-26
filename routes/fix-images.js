const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');
const router = express.Router();

// Rota temporária para corrigir URLs de imagens inválidas
router.post('/fix-product-images', async (req, res) => {
  try {
    // Buscar produtos com URLs de exemplo
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, image, images')
      .like('image', '%example.com%');

    if (fetchError) {
      return res.status(400).json({ error: fetchError.message });
    }

    console.log('Produtos encontrados com URLs inválidas:', products.length);

    // Atualizar cada produto
    const updates = [];
    for (const product of products) {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center',
          images: ['https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center']
        })
        .eq('id', product.id);

      if (updateError) {
        console.error(`Erro ao atualizar produto ${product.id}:`, updateError);
        updates.push({ id: product.id, name: product.name, status: 'error', error: updateError.message });
      } else {
        console.log(`Produto ${product.name} atualizado com sucesso`);
        updates.push({ id: product.id, name: product.name, status: 'success' });
      }
    }

    res.json({
      message: 'Correção de imagens concluída',
      totalProducts: products.length,
      updates
    });
  } catch (error) {
    console.error('Erro ao corrigir imagens:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;