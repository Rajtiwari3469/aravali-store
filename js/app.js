const App = {
  currentUser: null,

  init() {
    this.currentUser = JSON.parse(localStorage.getItem('aravali_currentUser') || 'null');
    this.updateNav();
    this.initSearchCycle();
    this.initHamburger();
    this.initToast();
  },

  updateNav() {
    document.querySelectorAll('.nav-user-section').forEach(el => {
      if (this.currentUser) {
        el.innerHTML = `
          <div class="user-dropdown">
            <button class="nav-icon-btn" onclick="App.toggleUserDropdown()">
              <span>👤</span>
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

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  requireAdmin() {
    const admins = DB.getAll('admins');
    const user = JSON.parse(localStorage.getItem('aravali_currentUser') || 'null');
    if (!user || !user.isAdmin) {
      window.location.href = 'login.html';
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
    const cart = this.getCart();
    const existing = cart.find(c => c.productId === productId);
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
    const toggle = input.parentElement.querySelector('.password-toggle');
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
