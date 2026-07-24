const App = {
  currentUser: null,

  async init() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        this.currentUser = data.user || data.admin || null;
      }
    } catch {}
    this.updateNav();
    this.initSearchCycle();
    this.initHamburger();
    this.initToast();
  },

  updateNav() {
    document.querySelectorAll('.nav-user-section').forEach(el => {
      if (this.currentUser) {
        const avatarHtml = this.currentUser.avatar
          ? `<img src="${this.currentUser.avatar}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid white;box-shadow:0 2px 8px rgba(45,106,79,0.3);">`
          : `<span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));color:white;font-weight:800;font-size:0.85rem;border:2px solid white;box-shadow:0 2px 8px rgba(45,106,79,0.3);">${(this.currentUser.name || 'U').charAt(0).toUpperCase()}</span>`;
        el.innerHTML = `
          <div class="user-dropdown">
            <button class="nav-icon-btn" onclick="App.toggleUserDropdown()" style="font-size:1rem;">
              ${avatarHtml}
            </button>
            <div class="user-dropdown-menu" id="userDropdown">
              <div style="padding:10px 14px;font-weight:600;font-size:0.88rem;border-bottom:1px solid rgba(45,106,79,0.08);margin-bottom:4px;">
                ${this.currentUser.name}
              </div>
              <a href="dashboard.html">👤 My Profile</a>
              <a href="orders.html">📦 My Orders</a>
              <a href="wishlist.html">❤️ Wishlist</a>
              <a href="dashboard.html?section=addresses">📍 Addresses</a>
              <a href="dashboard.html?section=settings">⚙️ Settings</a>
              <button onclick="App.logout()" style="color:var(--danger);">🚪 Logout</button>
            </div>
          </div>`;
      } else {
        el.innerHTML = `<a href="login.html" class="btn btn-primary btn-sm">Login</a>`;
      }
    });

    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = this.getCartCount();
    });
    document.querySelectorAll('.wishlist-count').forEach(el => {
      el.textContent = this.getWishlistCount();
    });
  },

  toggleUserDropdown() {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.classList.toggle('active');
  },

  async login(email, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.currentUser = data.user;
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message || 'Invalid email or password' };
    } catch (e) {
      return { success: false, message: 'Login failed. Please try again.' };
    }
  },

  async loginAdmin(email, password) {
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.currentUser = { ...data.admin, isAdmin: true };
        return { success: true };
      }
      return { success: false, message: data.message || 'Invalid admin credentials' };
    } catch (e) {
      return { success: false, message: 'Login failed. Please try again.' };
    }
  },

  async register(name, email, password, phone) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.currentUser = data.user;
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message || 'Registration failed' };
    } catch (e) {
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  },

  async logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    this.currentUser = null;
    const path = window.location.pathname;
    if (path.includes('/admin/')) {
      window.location.href = '../login.html';
    } else {
      window.location.href = 'index.html';
    }
  },

  isLoggedIn() {
    return this.currentUser !== null;
  },

  isAdmin() {
    return this.currentUser && this.currentUser.isAdmin;
  },

  async updateCurrentUser(data) {
    this.currentUser = { ...this.currentUser, ...data };
    if (this.currentUser.id && !this.currentUser.isAdmin) {
      await DB.update('users', this.currentUser.id, data);
    }
  },

  async getOrders() {
    if (!this.currentUser) return [];
    return await DB.query('orders', o => o.user_id === this.currentUser.id || o.userId === this.currentUser.id);
  },

  async requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  async requireAdmin() {
    if (!this.currentUser || !this.currentUser.isAdmin) {
      window.location.href = window.location.pathname.includes('/admin/') ? 'login.html' : '../admin/login.html';
      return false;
    }
    return true;
  },

  // Cart - server-side for logged-in users, localStorage fallback for guests
  async getCart() {
    if (this.currentUser) {
      try {
        const res = await fetch('/api/cart');
        if (res.ok) return await res.json();
      } catch {}
    }
    return JSON.parse(localStorage.getItem('aravali_cart') || '[]');
  },

  async saveCart(cart) {
    localStorage.setItem('aravali_cart', JSON.stringify(cart));
    this.updateCartBadge();
  },

  async addToCart(productId, qty = 1) {
    if (this.currentUser) {
      try {
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, qty }),
        });
        if (res.ok) {
          this.showToast('Added to cart!', 'success');
          this.updateCartBadge();
          return;
        }
        const data = await res.json();
        this.showToast(data.error || 'Failed to add to cart', 'error');
        return;
      } catch {}
    }

    const product = await DB.getById('products', productId);
    if (!product) return;

    const cart = await this.getCart();
    const existing = cart.find(c => c.productId === productId);
    const currentQty = existing ? existing.qty : 0;
    const requestedQty = currentQty + qty;

    if ((product.stock || 0) <= 0) {
      this.showToast(`${product.name} is out of stock`, 'error');
      return;
    }
    if (requestedQty > product.stock) {
      this.showToast(`Only ${product.stock} units available for ${product.name}`, 'error');
      return;
    }

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ productId, qty });
    }
    await this.saveCart(cart);
    this.showToast('Added to cart!', 'success');
  },

  async removeFromCart(productId) {
    if (this.currentUser) {
      try {
        await fetch('/api/cart', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
        this.updateCartBadge();
        return;
      } catch {}
    }
    let cart = await this.getCart();
    cart = cart.filter(c => c.productId !== productId);
    await this.saveCart(cart);
  },

  async updateCartQty(productId, qty) {
    if (this.currentUser) {
      if (qty <= 0) {
        return this.removeFromCart(productId);
      }
      try {
        await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, qty }),
        });
        this.updateCartBadge();
        return;
      } catch {}
    }

    const cart = await this.getCart();
    const item = cart.find(c => c.productId === productId);
    if (item) {
      if (qty <= 0) {
        await this.removeFromCart(productId);
      } else {
        const product = await DB.getById('products', productId);
        if (product && qty > (product.stock || 0)) {
          this.showToast(`Only ${product.stock} units available for ${product.name}`, 'error');
          qty = product.stock || 0;
          if (qty <= 0) {
            await this.removeFromCart(productId);
            return;
          }
        }
        item.qty = qty;
        await this.saveCart(cart);
      }
    }
  },

  async getCartCount() {
    const cart = await this.getCart();
    return cart.reduce((sum, c) => sum + c.qty, 0);
  },

  async getCartTotal() {
    const cart = await this.getCart();
    let total = 0;
    for (const c of cart) {
      const product = await DB.getById('products', c.productId);
      if (product) total += product.price * c.qty;
    }
    return total;
  },

  async getCartItems() {
    const cart = await this.getCart();
    const items = [];
    for (const c of cart) {
      const product = await DB.getById('products', c.productId);
      if (product) items.push({ ...c, product });
    }
    return items;
  },

  updateCartBadge() {
    this.getCartCount().then(count => {
      document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
      });
    });
  },

  async clearCart() {
    if (this.currentUser) {
      try {
        const cart = await this.getCart();
        for (const item of cart) {
          await fetch('/api/cart', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: item.productId }),
          });
        }
      } catch {}
    }
    localStorage.removeItem('aravali_cart');
    this.updateCartBadge();
  },

  // Wishlist - server-side for logged-in users
  async getWishlist() {
    if (this.currentUser) {
      try {
        const res = await fetch('/api/wishlist');
        if (res.ok) return await res.json();
      } catch {}
    }
    return JSON.parse(localStorage.getItem('aravali_wishlist') || '[]');
  },

  async toggleWishlist(productId) {
    if (this.currentUser) {
      try {
        const res = await fetch('/api/wishlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
        if (res.ok) {
          this.showToast('Removed from wishlist', 'info');
          this.updateWishlistBadge();
          return false;
        }
      } catch {}
      try {
        const res = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
        if (res.ok) {
          this.showToast('Added to wishlist!', 'success');
          this.updateWishlistBadge();
          return true;
        }
      } catch {}
      return false;
    }

    let wishlist = await this.getWishlist();
    const index = wishlist.indexOf(productId);
    if (index > -1) {
      wishlist.splice(index, 1);
      this.showToast('Removed from wishlist', 'info');
    } else {
      wishlist.push(productId);
      this.showToast('Added to wishlist!', 'success');
    }
    localStorage.setItem('aravali_wishlist', JSON.stringify(wishlist));
    this.updateWishlistBadge();
    return wishlist.includes(productId);
  },

  async isInWishlist(productId) {
    const wishlist = await this.getWishlist();
    return wishlist.includes(productId);
  },

  async getWishlistCount() {
    const wishlist = await this.getWishlist();
    return wishlist.length;
  },

  updateWishlistBadge() {
    this.getWishlistCount().then(count => {
      document.querySelectorAll('.wishlist-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
      });
    });
  },

  // Orders
  async placeOrder(address, paymentMethod) {
    const cartItems = await this.getCartItems();
    if (cartItems.length === 0) return null;

    for (const item of cartItems) {
      if ((item.product.stock || 0) < item.qty) {
        App.showToast(`${item.product.name} is out of stock (only ${item.product.stock} left)`, 'error');
        return null;
      }
    }

    const subtotal = cartItems.reduce((sum, c) => sum + c.product.price * c.qty, 0);
    const delivery = subtotal > 200 ? 0 : 30;
    const total = subtotal + delivery;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(c => ({
            productId: c.productId,
            name: c.product.name,
            price: c.product.price,
            qty: c.qty,
            unit: c.product.unit
          })),
          address,
          paymentMethod,
          subtotal,
          delivery,
          total,
          status: 'pending',
          orderDate: new Date().toISOString()
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await this.clearCart();
        return data.record || data;
      }
    } catch {}

    return null;
  },

  // Image upload to base64
  handleImageUpload(inputId, previewId, maxSizeKB = 200) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > maxSizeKB * 1024) {
        App.showToast(`Image too large. Max ${maxSizeKB}KB.`, 'error');
        input.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.src = ev.target.result;
        preview.style.display = 'block';
        input.dataset.imageData = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  getImageData(inputId) {
    const input = document.getElementById(inputId);
    return input && input.dataset.imageData ? input.dataset.imageData : '';
  },

  handleMultiImageUpload(inputId, previewContainerId, maxSizeKB = 300) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(previewContainerId);
    if (!input || !container) return;

    container._images = container._images || [];

    input.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      const remaining = 5 - container._images.length;
      if (remaining <= 0) {
        App.showToast('Maximum 5 images allowed', 'error');
        input.value = '';
        return;
      }

      const toProcess = files.slice(0, remaining);
      toProcess.forEach(file => {
        if (file.size > maxSizeKB * 1024) {
          App.showToast(`${file.name} too large. Max ${maxSizeKB}KB.`, 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          container._images.push(ev.target.result);
          Admin.renderImagePreviews();
        };
        reader.readAsDataURL(file);
      });
      input.value = '';
    });
  },

  getMultiImageData(containerId) {
    const container = document.getElementById(containerId);
    return container && container._images ? [...container._images] : [];
  },

  removeMultiImage(containerId, index) {
    const container = document.getElementById(containerId);
    if (container && container._images) {
      container._images.splice(index, 1);
      Admin.renderImagePreviews();
    }
  },

  getProductEmoji(category) {
    return CATEGORY_EMOJIS[category] || '🛒';
  },

  getProductEmojiLarge(category) {
    return CATEGORY_EMOJIS[category] || '🛒';
  },

  // Search placeholder auto-cycle
  initSearchCycle() {
    const searchInput = document.querySelector('.search-bar input');
    if (!searchInput) return;

    const placeholders = [
      'Search milk, bread, eggs...',
      'Search vegetables & fruits...',
      'Search snacks & beverages...',
      'Search dairy products...',
      'Search frozen food...',
      'Search grains & spices...',
      'Search bakery items...',
      'Search organic products...'
    ];

    let currentIndex = 0;
    let cycleTimer = null;
    let typewriterTimer = null;

    const cycleEl = document.createElement('span');
    cycleEl.className = 'search-placeholder-cycle';
    searchInput.parentElement.appendChild(cycleEl);

    function typeText(text, el, callback) {
      let i = 0;
      el.textContent = '';
      el.classList.add('active');
      el.classList.remove('fade-out');

      function typeChar() {
        if (i < text.length) {
          el.textContent += text.charAt(i);
          i++;
          typewriterTimer = setTimeout(typeChar, 45);
        } else {
          if (callback) callback();
        }
      }
      typeChar();
    }

    function showNextPlaceholder() {
      if (document.activeElement === searchInput && searchInput.value) return;
      if (!searchInput.value && document.activeElement !== searchInput) {
        const text = placeholders[currentIndex];
        typeText(text, cycleEl, () => {
          setTimeout(() => {
            cycleEl.classList.add('fade-out');
            setTimeout(() => {
              currentIndex = (currentIndex + 1) % placeholders.length;
              showNextPlaceholder();
            }, 600);
          }, 3500);
        });
      }
    }

    searchInput.addEventListener('focus', () => {
      cycleEl.classList.remove('active');
      clearTimeout(cycleTimer);
      clearTimeout(typewriterTimer);
    });

    searchInput.addEventListener('blur', () => {
      if (!searchInput.value) {
        currentIndex = (currentIndex + 1) % placeholders.length;
        showNextPlaceholder();
      }
    });

    searchInput.addEventListener('input', () => {
      if (searchInput.value) {
        cycleEl.classList.remove('active');
        clearTimeout(cycleTimer);
        clearTimeout(typewriterTimer);
      }
    });

    showNextPlaceholder();
  },

  initHamburger() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
      });
    }
  },

  initToast() {
    if (!document.querySelector('.toast-container')) {
      const container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
  },

  showToast(message, type = 'success') {
    const container = document.querySelector('.toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  },

  getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },

  togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const wrapper = input.closest('.password-wrapper') || input.parentElement;
    const toggle = wrapper ? wrapper.querySelector('.password-toggle') : null;
    if (input.type === 'password') {
      input.type = 'text';
      if (toggle) toggle.textContent = '🙈';
    } else {
      input.type = 'password';
      if (toggle) toggle.textContent = '👁️';
    }
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  formatCurrency(amount) {
    return '₹' + Number(amount).toFixed(0);
  },

  initGlobalClick() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-dropdown')) {
        const dd = document.getElementById('userDropdown');
        if (dd) dd.classList.remove('active');
      }
    });
  }
};

const CATEGORY_EMOJIS = {
  'All': '🏪',
  'Fresh Fruits': '🍎',
  'Fresh Vegetables': '🥦',
  'Dairy & Eggs': '🥛',
  'Bakery & Bread': '🍞',
  'Rice, Atta & Grains': '🌾',
  'Pulses & Lentils': '🫘',
  'Cooking Oil & Ghee': '🫗',
  'Spices & Masalas': '🌶️',
  'Snacks & Namkeen': '🍿',
  'Biscuits & Cookies': '🍪',
  'Chocolates & Candy': '🍫',
  'Tea & Coffee': '☕',
  'Soft Drinks & Juices': '🥤',
  'Instant & Ready-to-Eat': '🍜',
  'Frozen Foods': '🧊',
  'Meat & Seafood': '🍗',
  'Personal Care': '🧴',
  'Baby Care': '👶',
  'Household Essentials': '🏠',
  'Cleaning Supplies': '🧹',
  'Pet Care': '🐾',
  'Organic Products': '🌿',
  'Dry Fruits & Nuts': '🥜',
  'Health & Wellness': '💊'
};

document.addEventListener('DOMContentLoaded', () => {
  App.init().then(() => {
    App.initGlobalClick();
    App.updateCartBadge();
    App.updateWishlistBadge();
  });
});
