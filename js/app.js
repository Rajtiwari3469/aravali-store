const App = {
  currentUser: null,

  init() {
    this.currentUser = JSON.parse(localStorage.getItem('aravali_currentUser') || 'null');
    this.updateNav();
    this.initSearchCycle();
    this.initHamburger();
    this.initToast();
    this.initSupportWidget();
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
              <a href="dashboard.html?section=support">💬 Customer Support</a>
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

  login(email, password) {
    const users = DB.getAll('users');
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      this.currentUser = user;
      localStorage.setItem('aravali_currentUser', JSON.stringify(user));
      return { success: true, user };
    }
    return { success: false, message: 'Invalid email or password' };
  },

  loginAdmin(email, password) {
    const admins = DB.getAll('admins');
    const admin = admins.find(a => a.email === email && a.password === password);
    if (admin) {
      this.currentUser = { ...admin, isAdmin: true };
      localStorage.setItem('aravali_currentUser', JSON.stringify(this.currentUser));
      return { success: true };
    }
    return { success: false, message: 'Invalid admin credentials' };
  },

  register(name, email, password, phone) {
    const users = DB.getAll('users');
    if (users.find(u => u.email === email)) {
      return { success: false, message: 'Email already registered' };
    }
    const user = DB.insert('users', { name, email, password, phone });
    this.currentUser = user;
    localStorage.setItem('aravali_currentUser', JSON.stringify(user));
    return { success: true, user };
  },

  logout() {
    this.currentUser = null;
    localStorage.removeItem('aravali_currentUser');
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

  updateCurrentUser(data) {
    this.currentUser = { ...this.currentUser, ...data };
    localStorage.setItem('aravali_currentUser', JSON.stringify(this.currentUser));
    // Also update in users DB
    if (this.currentUser.id && !this.currentUser.isAdmin) {
      DB.update('users', this.currentUser.id, data);
    }
  },

  getOrders() {
    if (!this.currentUser) return [];
    return DB.query('orders', o => o.userId === this.currentUser.id);
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  requireAdmin() {
    const user = JSON.parse(localStorage.getItem('aravali_currentUser') || 'null');
    if (!user || !user.isAdmin) {
      window.location.href = window.location.pathname.includes('/admin/') ? 'login.html' : '../admin/login.html';
      return false;
    }
    return true;
  },

  // Cart
  getCart() {
    return JSON.parse(localStorage.getItem('aravali_cart') || '[]');
  },

  saveCart(cart) {
    localStorage.setItem('aravali_cart', JSON.stringify(cart));
    this.updateCartBadge();
  },

  addToCart(productId, qty = 1) {
    const product = DB.getById('products', productId);
    if (!product) return;

    // Check stock
    const cart = this.getCart();
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
    this.saveCart(cart);
    this.showToast('Added to cart!', 'success');
  },

  removeFromCart(productId) {
    let cart = this.getCart();
    cart = cart.filter(c => c.productId !== productId);
    this.saveCart(cart);
  },

  updateCartQty(productId, qty) {
    const cart = this.getCart();
    const item = cart.find(c => c.productId === productId);
    if (item) {
      if (qty <= 0) {
        this.removeFromCart(productId);
      } else {
        const product = DB.getById('products', productId);
        if (product && qty > (product.stock || 0)) {
          this.showToast(`Only ${product.stock} units available for ${product.name}`, 'error');
          qty = product.stock || 0;
          if (qty <= 0) {
            this.removeFromCart(productId);
            return;
          }
        }
        item.qty = qty;
        this.saveCart(cart);
      }
    }
  },

  getCartCount() {
    return this.getCart().reduce((sum, c) => sum + c.qty, 0);
  },

  getCartTotal() {
    const cart = this.getCart();
    let total = 0;
    cart.forEach(c => {
      const product = DB.getById('products', c.productId);
      if (product) total += product.price * c.qty;
    });
    return total;
  },

  getCartItems() {
    const cart = this.getCart();
    return cart.map(c => {
      const product = DB.getById('products', c.productId);
      return { ...c, product };
    }).filter(c => c.product);
  },

  updateCartBadge() {
    const count = this.getCartCount();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  clearCart() {
    localStorage.removeItem('aravali_cart');
    this.updateCartBadge();
  },

  // Wishlist
  getWishlist() {
    return JSON.parse(localStorage.getItem('aravali_wishlist') || '[]');
  },

  toggleWishlist(productId) {
    let wishlist = this.getWishlist();
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

  isInWishlist(productId) {
    return this.getWishlist().includes(productId);
  },

  getWishlistCount() {
    return this.getWishlist().length;
  },

  updateWishlistBadge() {
    const count = this.getWishlistCount();
    document.querySelectorAll('.wishlist-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  // Orders
  placeOrder(address, paymentMethod) {
    const cartItems = this.getCartItems();
    if (cartItems.length === 0) return null;

    // Check stock for all items
    for (const item of cartItems) {
      if ((item.product.stock || 0) < item.qty) {
        App.showToast(`${item.product.name} is out of stock (only ${item.product.stock} left)`, 'error');
        return null;
      }
    }

    const subtotal = this.getCartTotal();
    const delivery = subtotal > 200 ? 0 : 30;
    const total = subtotal + delivery;

    const order = DB.insert('orders', {
      userId: this.currentUser ? this.currentUser.id : 'guest',
      userName: this.currentUser ? this.currentUser.name : 'Guest',
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
    });

    // Deduct stock for each product
    for (const item of cartItems) {
      DB.updateStock(item.productId, -(item.qty));
      DB.logStockChange(item.productId, item.product.name, -(item.qty), `Order #${order.id.slice(-6).toUpperCase()}`);
    }

    this.clearCart();
    return order;
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

  // Product image (emoji fallback)
  getProductEmoji(category) {
    return CATEGORY_EMOJIS[category] || '🛒';
  },

  getProductEmojiLarge(category) {
    return CATEGORY_EMOJIS[category] || '🛒';
  },

  // Search placeholder auto-cycle (Blinkit-style slow swipe)
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

  // Hamburger
  initHamburger() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
      });
    }
  },

  // Toast
  initToast() {
    if (!document.querySelector('.toast-container')) {
      const container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
  },

  initSupportWidget() {
    if (document.querySelector('.support-fab')) return;
    if (window.location.pathname.includes('/admin')) return;

    const widget = document.createElement('div');
    widget.className = 'support-fab';
    widget.innerHTML = `
      <div class="support-popup" id="supportPopup">
        <div class="support-popup-header">
          <h3>💬 Customer Support</h3>
          <button onclick="App.toggleSupportPopup()">✕</button>
        </div>
        <div class="support-popup-body" id="supportPopupBody"></div>
      </div>
      <button class="support-fab-btn" onclick="App.toggleSupportPopup()" title="Need Help?">💬</button>
    `;
    document.body.appendChild(widget);
  },

  toggleSupportPopup() {
    const popup = document.getElementById('supportPopup');
    if (!popup) return;
    const isOpen = popup.classList.contains('open');
    popup.classList.toggle('open');
    if (!isOpen) {
      this.renderSupportPopupBody();
    }
  },

  renderSupportPopupBody() {
    const body = document.getElementById('supportPopupBody');
    if (!body) return;

    if (!this.isLoggedIn()) {
      body.innerHTML = `
        <div class="support-logged-out-msg">
          <div style="font-size:2.5rem;margin-bottom:10px;">💬</div>
          <h3 style="font-size:1rem;color:var(--primary-dark);margin-bottom:6px;">Need Help?</h3>
          <p style="font-size:0.82rem;color:var(--text-muted);line-height:1.5;">Login to create a support ticket and our team will assist you right away.</p>
          <a href="login.html" class="btn btn-primary" style="display:inline-block;text-decoration:none;">Login to Get Help</a>
        </div>`;
      return;
    }

    const categoryLabels = {
      open: '🟢 Open',
      replied: '🔵 Replied',
      closed: '✅ Closed'
    };

    const userTickets = DB.query('support_tickets', t => t.userId === this.currentUser.id);
    const openCount = userTickets.filter(t => t.status === 'open').length;
    const repliedCount = userTickets.filter(t => t.status === 'replied').length;

    body.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <div style="flex:1;padding:10px;text-align:center;background:rgba(255,152,0,0.08);border-radius:10px;">
          <div style="font-size:1.2rem;font-weight:700;color:#e67e22;">${openCount}</div>
          <div style="font-size:0.68rem;color:var(--text-muted);">Open</div>
        </div>
        <div style="flex:1;padding:10px;text-align:center;background:rgba(33,150,243,0.08);border-radius:10px;">
          <div style="font-size:1.2rem;font-weight:700;color:#2196f3;">${repliedCount}</div>
          <div style="font-size:0.68rem;color:var(--text-muted);">Replied</div>
        </div>
      </div>

      <div id="supportPopupForm">
        <div class="form-group">
          <label>Subject</label>
          <input type="text" id="sp-subject" placeholder="Brief issue description" required>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="sp-category">
            <option value="order_issue">📦 Order Issue</option>
            <option value="refund">💰 Refund / Return</option>
            <option value="product">🏷️ Product Issue</option>
            <option value="technical">⚙️ Technical Problem</option>
            <option value="other">📝 Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Message</label>
          <textarea id="sp-message" rows="3" placeholder="Describe your issue..."></textarea>
        </div>
        <div class="support-popup-footer">
          <button class="btn btn-primary" onclick="App.submitSupportTicket()">Submit Ticket</button>
        </div>
      </div>

      ${userTickets.length > 0 ? `
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(45,106,79,0.08);">
        <p style="font-size:0.75rem;font-weight:600;color:var(--text-muted);margin-bottom:8px;">Recent Tickets</p>
        ${userTickets.slice(-3).reverse().map(t => `
          <div style="padding:8px 10px;background:rgba(82,183,136,0.04);border-radius:8px;margin-bottom:6px;font-size:0.78rem;border-left:3px solid ${t.status === 'open' ? '#ff9800' : t.status === 'replied' ? '#2196f3' : '#4caf50'};">
            <div style="font-weight:600;color:var(--text);">${t.subject}</div>
            <div style="color:var(--text-muted);margin-top:2px;">${categoryLabels[t.status] || t.status} • ${App.formatDate(t.createdAt)}</div>
          </div>
        `).join('')}
        <a href="dashboard.html?section=support" style="display:block;text-align:center;font-size:0.78rem;color:var(--primary);font-weight:600;margin-top:8px;text-decoration:none;">View All →</a>
      </div>` : ''}
    `;
  },

  submitSupportTicket() {
    const subject = document.getElementById('sp-subject').value.trim();
    const category = document.getElementById('sp-category').value;
    const message = document.getElementById('sp-message').value.trim();

    if (!subject || !message) {
      this.showToast('Subject and message are required', 'error');
      return;
    }

    DB.insert('support_tickets', {
      userId: this.currentUser.id,
      customerName: this.currentUser.name,
      customerEmail: this.currentUser.email,
      subject,
      category,
      message,
      orderId: '',
      status: 'open',
      adminReply: '',
      updatedAt: null
    });

    document.getElementById('sp-subject').value = '';
    document.getElementById('sp-message').value = '';
    this.showToast('Support ticket submitted!', 'success');
    this.renderSupportPopupBody();
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

  // URL params
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
    return '₹' + amount.toFixed(0);
  },

  // Close dropdowns on outside click
  initGlobalClick() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-dropdown')) {
        const dd = document.getElementById('userDropdown');
        if (dd) dd.classList.remove('active');
      }
    });
  }
};

// Category emojis map
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
  App.init();
  App.initGlobalClick();
  App.updateCartBadge();
  App.updateWishlistBadge();
});
