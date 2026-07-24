const App = {
  currentUser: null,
  _initDone: false,
  _initPromise: null,

  initTheme() {
    const saved = localStorage.getItem('aravali-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this.injectThemeToggle();
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('aravali-theme', next);
    this.updateThemeIcon();
  },

  updateThemeIcon() {
    const btns = document.querySelectorAll('.theme-toggle-btn');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btns.forEach(btn => { btn.textContent = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'; });
  },

  injectThemeToggle() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const icon = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19';
    const html = `<button class="theme-toggle-btn" onclick="App.toggleTheme()" title="Toggle dark/light theme">${icon}</button>`;

    document.querySelectorAll('.nav-actions').forEach(el => {
      if (!el.querySelector('.theme-toggle-btn')) {
        el.insertAdjacentHTML('afterbegin', html);
      }
    });
    document.querySelectorAll('.topbar-actions').forEach(el => {
      if (!el.querySelector('.theme-toggle-btn')) {
        el.insertAdjacentHTML('afterbegin', html);
      }
    });
    document.querySelectorAll('.pd-topbar-actions').forEach(el => {
      if (!el.querySelector('.theme-toggle-btn')) {
        el.insertAdjacentHTML('afterbegin', html);
      }
    });
    const loginToggle = document.getElementById('loginThemeToggle');
    if (loginToggle && !loginToggle.querySelector('.theme-toggle-btn')) {
      loginToggle.innerHTML = html;
    }
  },

  async init() {
    if (this._initDone) return;
    if (this._initPromise) { await this._initPromise; return; }
    this._initPromise = (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.admin) {
            this.currentUser = { ...data.admin, isAdmin: true };
          } else {
            this.currentUser = data.user || null;
          }
        }
      } catch {}
      this._initDone = true;
      this.updateNav();
      this.initSearchCycle();
      this.initHamburger();
      this.initToast();
    })();
    await this._initPromise;
  },

  updateNav() {
    document.querySelectorAll('.nav-user-section').forEach(el => {
      if (this.currentUser && this.currentUser.isAdmin) {
        el.innerHTML = `
          <a href="/admin" class="btn btn-primary btn-sm" style="font-weight:700;">Admin Panel</a>
          <button onclick="App.logout()" class="btn btn-sm" style="border:1px solid var(--border-color);color:var(--danger);font-size:0.78rem;padding:5px 12px;border-radius:8px;background:transparent;cursor:pointer;font-family:var(--font);">Logout</button>`;
      } else if (this.currentUser) {
        const avatarHtml = this.currentUser.avatar
          ? `<img src="${this.currentUser.avatar}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid var(--white);box-shadow:0 2px 8px var(--shadow-sm);">`
          : `<span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));color:white;font-weight:800;font-size:0.85rem;border:2px solid var(--white);box-shadow:0 2px 8px var(--shadow-sm);">${(this.currentUser.name || 'U').charAt(0).toUpperCase()}</span>`;
        el.innerHTML = `
          <div class="user-dropdown">
            <button class="nav-icon-btn" onclick="App.toggleUserDropdown()" style="font-size:1rem;">
              ${avatarHtml}
            </button>
            <div class="user-dropdown-menu" id="userDropdown">
              <div style="padding:10px 14px;font-weight:600;font-size:0.88rem;border-bottom:1px solid var(--border-color);margin-bottom:4px;">
                ${this.currentUser.name}
              </div>
              <a href="/dashboard">👤 My Profile</a>
              <a href="/orders">📦 My Orders</a>
              <a href="/wishlist">❤️ Wishlist</a>
              <a href="/dashboard?section=addresses">📍 Addresses</a>
              <a href="/dashboard?section=settings">⚙️ Settings</a>
              <button onclick="App.logout()" style="color:var(--danger);">🚪 Logout</button>
            </div>
          </div>`;
      } else {
        el.innerHTML = `<a href="/login" class="btn btn-primary btn-sm">Login</a>`;
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
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.currentUser = data.user;
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || data.message || 'Invalid email or password' };
    } catch (e) {
      return { success: false, error: 'Login failed. Please try again.' };
    }
  },

  async loginAdmin(email, password) {
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.currentUser = { ...data.admin, isAdmin: true };
        return { success: true };
      }
      return { success: false, error: data.error || data.message || 'Invalid admin credentials' };
    } catch (e) {
      return { success: false, error: 'Login failed. Please try again.' };
    }
  },

  async register(name, email, password, phone) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, phone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.currentUser = data.user;
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || data.message || 'Registration failed' };
    } catch (e) {
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  },

  async logout() {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    this.currentUser = null;
    const path = window.location.pathname;
    if (path.includes('/admin/')) {
      window.location.href = '/admin/login';
    } else {
      window.location.href = '/';
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
    await this.init();
    if (!this.isLoggedIn()) {
      window.location.href = '/login';
      return false;
    }
    return true;
  },

  async requireAdmin() {
    await this.init();
    if (!this.currentUser || !this.currentUser.isAdmin) {
      window.location.href = window.location.pathname.includes('/admin/') ? '/admin/login' : '/admin/login';
      return false;
    }
    return true;
  },

  // Cart - always include localStorage items so nothing is lost
  async getCart() {
    const localCart = JSON.parse(localStorage.getItem('aravali_cart') || '[]');
    if (this.currentUser) {
      try {
        const res = await fetch('/api/cart', { credentials: 'include' });
        if (res.ok) {
          const serverCart = await res.json();
          const merged = [...serverCart];
          for (const lc of localCart) {
            const exists = merged.find(m => m.productId === lc.productId);
            if (!exists) merged.push(lc);
          }
          return merged;
        }
      } catch {}
    }
    return localCart;
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
          credentials: 'include',
          body: JSON.stringify({ productId, qty }),
        });
        if (res.ok) {
          const localCart = JSON.parse(localStorage.getItem('aravali_cart') || '[]');
          const existing = localCart.find(c => c.productId === productId);
          if (existing) { existing.qty += qty; } else { localCart.push({ productId, qty }); }
          localStorage.setItem('aravali_cart', JSON.stringify(localCart));
          this.showToast('Added to cart!', 'success');
          this.updateCartBadge();
          return;
        }
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
          credentials: 'include',
          body: JSON.stringify({ productId }),
        });
        let localCart = JSON.parse(localStorage.getItem('aravali_cart') || '[]');
        localCart = localCart.filter(c => c.productId !== productId);
        localStorage.setItem('aravali_cart', JSON.stringify(localCart));
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
          credentials: 'include',
          body: JSON.stringify({ productId, qty }),
        });
        let localCart = JSON.parse(localStorage.getItem('aravali_cart') || '[]');
        const localItem = localCart.find(c => c.productId === productId);
        if (localItem) localItem.qty = qty;
        else localCart.push({ productId, qty });
        localStorage.setItem('aravali_cart', JSON.stringify(localCart));
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
    const cart = JSON.parse(localStorage.getItem('aravali_cart') || '[]');
    if (this.currentUser) {
      fetch('/api/cart', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
        .then(serverCart => {
          const merged = [...(serverCart || [])];
          for (const lc of cart) {
            if (!merged.find(m => m.productId === lc.productId)) merged.push(lc);
          }
          const count = merged.reduce((sum, c) => sum + (c.qty || 0), 0);
          document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = count;
            el.style.display = count > 0 ? 'flex' : 'none';
          });
        });
    } else {
      const count = cart.reduce((sum, c) => sum + (c.qty || 0), 0);
      document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
      });
    }
  },

  async clearCart() {
    if (this.currentUser) {
      try {
        const cart = await this.getCart();
        for (const item of cart) {
          await fetch('/api/cart', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
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
        const res = await fetch('/api/wishlist', { credentials: 'include' });
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
          credentials: 'include',
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
          credentials: 'include',
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
    const wishlist = JSON.parse(localStorage.getItem('aravali_wishlist') || '[]');
    if (this.currentUser) {
      fetch('/api/wishlist', { credentials: 'include' })
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
        .then(serverList => {
          const count = (serverList || []).length;
          document.querySelectorAll('.wishlist-count').forEach(el => {
            el.textContent = count;
            el.style.display = count > 0 ? 'flex' : 'none';
          });
        });
    } else {
      const count = wishlist.length;
      document.querySelectorAll('.wishlist-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
      });
    }
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
        credentials: 'include',
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

  // Image upload to Cloudinary via API
  async uploadFile(file, maxSizeMB = 5) {
    if (file.size > maxSizeMB * 1024 * 1024) {
      App.showToast(`Image too large. Max ${maxSizeMB}MB.`, 'error');
      return null;
    }
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ file: base64 })
      });
      const data = await res.json();
      if (data.url) return data.url;
      App.showToast(data.error || 'Upload failed', 'error');
      return null;
    } catch (e) {
      App.showToast('Upload failed: ' + e.message, 'error');
      return null;
    }
  },

  handleImageUpload(inputId, previewId, maxSizeMB = 5) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      preview.src = '';
      preview.style.display = 'none';
      App.showToast('Uploading...', 'info');
      const url = await App.uploadFile(file, maxSizeMB);
      if (url) {
        preview.src = url;
        preview.style.display = 'block';
        input.dataset.imageData = url;
        App.showToast('Image uploaded!', 'success');
      } else {
        input.value = '';
      }
    });
  },

  getImageData(inputId) {
    const input = document.getElementById(inputId);
    return input && input.dataset.imageData ? input.dataset.imageData : '';
  },

  handleMultiImageUpload(inputId, previewContainerId, maxSizeMB = 5) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(previewContainerId);
    if (!input || !container) return;

    container._images = container._images || [];

    input.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      const remaining = 5 - container._images.length;
      if (remaining <= 0) {
        App.showToast('Maximum 5 images allowed', 'error');
        input.value = '';
        return;
      }

      const toProcess = files.slice(0, remaining);
      for (const file of toProcess) {
        App.showToast(`Uploading ${file.name}...`, 'info');
        const url = await App.uploadFile(file, maxSizeMB);
        if (url) {
          container._images.push(url);
          Admin.renderImagePreviews();
        }
      }
      input.value = '';
      App.showToast('All images uploaded!', 'success');
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
  App.initTheme();
  document.addEventListener('input', (e) => {
    if (e.target.matches('input[type="tel"][maxlength="10"]')) {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    }
  });
  if (!window.location.pathname.includes('/admin')) {
    App.init().then(() => {
      App.initGlobalClick();
      App.updateCartBadge();
      App.updateWishlistBadge();
    });
  }
});
