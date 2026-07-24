const Cart = {
  async init() {
    await this.renderCart();
  },

  async renderCart() {
    const container = document.querySelector('.cart-items');
    const summaryContainer = document.querySelector('.cart-summary-content');
    if (!container) return;

    const items = await App.getCartItems();

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add some fresh groceries to get started!</p>
          <a href="shop.html" class="btn btn-primary">Browse Products</a>
        </div>`;
      if (summaryContainer) summaryContainer.innerHTML = '';
      return;
    }

    container.innerHTML = items.map(item => {
      const isOutOfStock = (item.product.stock || 0) <= 0;
      const exceedsStock = item.qty > (item.product.stock || 0);
      return `
      <div class="cart-item" data-id="${item.productId}" style="${isOutOfStock || exceedsStock ? 'border-left:3px solid var(--danger);' : ''}">
        <div class="item-emoji" style="display:flex;align-items:center;justify-content:center;overflow:hidden;">
          ${(item.product.image || (item.product.images && item.product.images[0])) ? `<img src="${item.product.image || item.product.images[0]}" style="width:100%;height:100%;object-fit:contain;background:#f8f8f8;">` : `<span style="color:var(--text-muted);font-size:0.7rem;">No Image</span>`}
        </div>
        <div class="item-details">
          <div class="item-name">${item.product.name}</div>
          <div class="item-unit">${item.product.unit}${isOutOfStock ? ` <span style="color:var(--danger);font-weight:600;">• Out of Stock</span>` : exceedsStock ? ` <span style="color:var(--danger);font-weight:600;">• Only ${item.product.stock} available</span>` : ''}</div>
        </div>
        <div class="qty-control">
          <button onclick="Cart.changeQty('${item.productId}', -1)">−</button>
          <span class="qty-val">${item.qty}</span>
          <button onclick="Cart.changeQty('${item.productId}', 1)">+</button>
        </div>
        <div class="item-price">
          ${App.formatCurrency(item.product.price * item.qty)}
          ${item.product.mrp && item.product.mrp > item.product.price ? `<div style="text-decoration:line-through;color:var(--text-muted);font-size:0.7rem;font-weight:400;">${App.formatCurrency(item.product.mrp * item.qty)}</div>` : ''}
        </div>
        <button class="remove-btn" onclick="Cart.removeItem('${item.productId}')">✕</button>
      </div>`;
    }).join('');

    await this.renderSummary();
  },

  async renderSummary() {
    const summaryContainer = document.querySelector('.cart-summary-content');
    if (!summaryContainer) return;

    const subtotal = await App.getCartTotal();
    const cartItems = await App.getCartItems();
    const totalMrp = cartItems.reduce((sum, c) => sum + ((c.product.mrp && c.product.mrp > c.product.price ? c.product.mrp : c.product.price) * c.qty), 0);
    const savings = totalMrp - subtotal;
    const delivery = subtotal > 200 ? 0 : 30;
    const total = subtotal + delivery;

    summaryContainer.innerHTML = `
      <div class="summary-row">
        <span>Subtotal</span>
        <span>${App.formatCurrency(subtotal)}</span>
      </div>
      ${savings > 0 ? `<div class="summary-row" style="color:var(--success);font-weight:600;">
        <span>You Save</span>
        <span>- ${App.formatCurrency(savings)}</span>
      </div>` : ''}
      <div class="summary-row">
        <span>Delivery ${subtotal > 200 ? '(Free above ₹200)' : ''}</span>
        <span>${delivery === 0 ? 'FREE' : App.formatCurrency(delivery)}</span>
      </div>
      <div class="summary-row total">
        <span>Total</span>
        <span>${App.formatCurrency(total)}</span>
      </div>
      <a href="checkout.html" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;margin-top:16px;">
        Proceed to Checkout →
      </a>
    `;
  },

  async changeQty(productId, delta) {
    const cart = await App.getCart();
    const item = cart.find(c => c.productId === productId);
    if (item) {
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        await App.removeFromCart(productId);
      } else {
        await App.updateCartQty(productId, newQty);
      }
      await this.renderCart();
    }
  },

  async removeItem(productId) {
    await App.removeFromCart(productId);
    await this.renderCart();
    App.showToast('Item removed from cart', 'info');
  }
};

const Checkout = {
  async init() {
    if (!await App.requireAuth()) return;
    await this.renderOrderSummary();
    this.initPayment();
    this.initForm();
  },

  async renderOrderSummary() {
    const container = document.querySelector('.checkout-items');
    if (!container) return;

    const items = await App.getCartItems();

    if (items.length === 0) {
      window.location.href = 'cart.html';
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="order-item">
        <div>
          ${(item.product.image || (item.product.images && item.product.images[0])) ? `<img src="${item.product.image || item.product.images[0]}" style="width:20px;height:20px;border-radius:4px;object-fit:cover;vertical-align:middle;margin-right:4px;">` : ''}
          <span>${item.product.name}</span>
          <span style="color:var(--text-muted);font-size:0.8rem;"> × ${item.qty}</span>
        </div>
        <span style="font-weight:600;">${App.formatCurrency(item.product.price * item.qty)}</span>
      </div>
    `).join('');

    const subtotal = await App.getCartTotal();
    const delivery = subtotal > 200 ? 0 : 30;
    const total = subtotal + delivery;

    container.innerHTML += `
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(45,106,79,0.1);">
        <div class="order-item">
          <span>Subtotal</span><span>${App.formatCurrency(subtotal)}</span>
        </div>
        <div class="order-item">
          <span>Delivery</span><span>${delivery === 0 ? 'FREE' : App.formatCurrency(delivery)}</span>
        </div>
        <div class="order-item" style="font-weight:700;font-size:1.05rem;color:var(--primary-dark);">
          <span>Total</span><span>${App.formatCurrency(total)}</span>
        </div>
      </div>
    `;
  },

  initPayment() {
    document.querySelectorAll('.payment-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        opt.querySelector('input[type="radio"]').checked = true;
      });
    });
  },

  initForm() {
    const form = document.getElementById('checkoutForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.placeOrder();
      });
    }
  },

  async placeOrder() {
    const name = document.getElementById('checkoutName').value.trim();
    const address = document.getElementById('checkoutAddress').value.trim();
    const phone = document.getElementById('checkoutPhone').value.trim();
    const payment = document.querySelector('input[name="payment"]:checked');

    if (!name || !address || !phone) {
      App.showToast('Please fill all required fields', 'error');
      return;
    }

    if (!payment || !payment.value) {
      App.showToast('Please select a valid payment method', 'error');
      return;
    }

    const settings = await DB.getSettings();
    const hasUpi = !!(settings.upiId && settings.upiId.trim());
    if (!hasUpi && payment.value !== 'Cash on Delivery') {
      App.showToast('Online payment is not available. Please select Cash on Delivery.', 'error');
      return;
    }

    const cartItems = await App.getCartItems();
    const outOfStockItems = cartItems.filter(c => (c.product.stock || 0) <= 0);
    if (outOfStockItems.length > 0) {
      App.showToast(`${outOfStockItems[0].product.name} is out of stock. Please remove it from cart.`, 'error');
      return;
    }

    const order = await App.placeOrder(address + ' - Phone: ' + phone + ' - ' + name, payment.value);

    if (order) {
      window.location.href = 'order-success.html?id=' + (order.id || '');
    } else {
      App.showToast('Failed to place order', 'error');
    }
  }
};
