const express = require('express');
const { supabase } = require('../config/supabase');
const { authenticateUser } = require('../middleware/auth');
const router = express.Router();

// Get all products
router.get('/products', async (req, res) => {
  try {
    const { category, search, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: products, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('active', true)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product categories
router.get('/categories', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('products')
      .select('category')
      .eq('active', true);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const uniqueCategories = [...new Set(categories.map(p => p.category))];
    res.json({ categories: uniqueCategories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to cart
router.post('/cart', authenticateUser, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const userId = req.user.id;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if product exists and is active
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('active', true)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check stock
    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Check if item already in cart
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', product_id)
      .single();

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }

      const { data: updatedItem, error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      res.json({ cart_item: updatedItem });
    } else {
      // Add new item
      const { data: cartItem, error: cartError } = await supabase
        .from('cart_items')
        .insert([
          {
            user_id: userId,
            product_id,
            quantity,
            price: product.price,
          },
        ])
        .select()
        .single();

      if (cartError) {
        return res.status(400).json({ error: cartError.message });
      }

      res.status(201).json({ cart_item: cartItem });
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's cart
router.get('/cart', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (
          id,
          name,
          description,
          price,
          image_url,
          category,
          stock
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => {
      const itemPrice = item.price || item.products.price;
      console.log(`💰 Item: ${item.products.name}, Price: ${itemPrice}, Quantity: ${item.quantity}`);
      return sum + (itemPrice * item.quantity);
    }, 0);
    
    console.log('💰 Subtotal calculated:', subtotal);
    const shipping = subtotal > 100 ? 0 : 15; // Free shipping over R$ 100
    const total = subtotal + shipping;

    res.json({
      cart_items: cartItems,
      summary: {
        subtotal,
        shipping,
        total,
        items_count: cartItems.length,
      },
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update cart item quantity
router.put('/cart/:itemId', authenticateUser, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    // Get cart item with product info
    const { data: cartItem, error: itemError } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (
          stock
        )
      `)
      .eq('id', itemId)
      .eq('user_id', userId)
      .single();

    if (itemError || !cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Check stock
    if (quantity > cartItem.products.stock) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Update quantity
    const { data: updatedItem, error: updateError } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ cart_item: updatedItem });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from cart
router.delete('/cart/:itemId', authenticateUser, async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear cart
router.delete('/cart', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create Stripe checkout session for products
router.post('/checkout', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    console.log('🛒 Getting cart items for user:', userId);
    
    // Get cart items
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (
          id,
          name,
          price,
          stock_quantity,
          image,
          images
        )
      `)
      .eq('user_id', userId);
      
    console.log('🛒 Cart items result:', { cartItems, cartError });

    if (cartError) {
      console.error('❌ Cart error:', cartError);
      return res.status(400).json({ 
        success: false,
        error: 'Erro ao buscar carrinho: ' + cartError.message 
      });
    }
    
    if (!cartItems || cartItems.length === 0) {
      console.log('🛒 Cart is empty for user:', userId);
      return res.status(400).json({ 
        success: false,
        error: 'Carrinho está vazio' 
      });
    }

    // Validate stock for all items
    for (const item of cartItems) {
      const availableStock = item.products.stock_quantity;
      console.log(`📦 Checking stock for ${item.products.name}: ${item.quantity} requested, ${availableStock} available`);
      
      if (item.quantity > availableStock) {
        return res.status(400).json({ 
          success: false,
          error: `Estoque insuficiente para ${item.products.name}. Disponível: ${availableStock}, Solicitado: ${item.quantity}` 
        });
      }
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 100 ? 0 : 15;
    const total = subtotal + shipping;

    // Create line items for Stripe
    const lineItems = cartItems.map(item => ({
      price_data: {
        currency: 'brl',
        product_data: {
          name: item.products.name,
          images: item.products.image ? [item.products.image] : 
                item.products.images && Array.isArray(item.products.images) ? item.products.images.slice(0, 1) : [],
        },
        unit_amount: Math.round((item.price || item.products.price) * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Add shipping if applicable
    if (shipping > 0) {
      lineItems.push({
        price_data: {
          currency: 'brl',
          product_data: {
            name: 'Frete',
          },
          unit_amount: Math.round(shipping * 100), // Convert to cents
        },
        quantity: 1,
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5121'}/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5121'}/store`,
      metadata: {
        userId: userId,
        type: 'store_purchase',
        cartItems: JSON.stringify(cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        })))
      },
      customer_email: req.user.email,
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });

  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});



// Create order (checkout)
router.post('/orders', authenticateUser, async (req, res) => {
  try {
    const { shipping_address, payment_method } = req.body;
    const userId = req.user.id;

    if (!shipping_address || !payment_method) {
      return res.status(400).json({ error: 'Shipping address and payment method are required' });
    }

    // Get cart items
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (
          id,
          name,
          price,
          stock
        )
      `)
      .eq('user_id', userId);

    if (cartError || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Validate stock for all items
    for (const item of cartItems) {
      if (item.quantity > item.products.stock) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${item.products.name}` 
        });
      }
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 100 ? 0 : 15;
    const total = subtotal + shipping;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: userId,
          status: 'pending',
          subtotal,
          shipping_cost: shipping,
          total,
          shipping_address,
          payment_method,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (orderError) {
      return res.status(400).json({ error: orderError.message });
    }

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      product_name: item.products.name,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      // Rollback order creation
      await supabase.from('orders').delete().eq('id', order.id);
      return res.status(400).json({ error: itemsError.message });
    }

    // Update product stock
    for (const item of cartItems) {
      await supabase
        .from('products')
        .update({ stock: item.products.stock - item.quantity })
        .eq('id', item.product_id);
    }

    // Clear cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    // Award points for purchase
    const pointsAwarded = Math.floor(total / 10); // 1 point per R$ 10
    await supabase
      .from('points')
      .insert([
        {
          user_id: userId,
          amount: pointsAwarded,
          source: 'purchase',
          description: `Compra #${order.id}`,
          created_at: new Date().toISOString(),
        },
      ]);

    // Update user's total points
    const { data: currentUser } = await supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single();

    await supabase
      .from('users')
      .update({ points: (currentUser?.points || 0) + pointsAwarded })
      .eq('id', userId);

    res.status(201).json({
      order,
      points_awarded: pointsAwarded,
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's orders
router.get('/orders', authenticateUser, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user.id;

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order by ID
router.get('/orders/:orderId', authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *
        )
      `)
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;