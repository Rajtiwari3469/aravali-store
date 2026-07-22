const Shop = {
  currentCategory: 'All',
  currentSearch: '',
  currentPage: 1,
  perPage: 12,
  sortBy: 'default',

  init() {
    this.renderCategories();
    this.renderProducts();
    this.initSearch();
    this.initCategoryChips();
    this.initSort();
  },

  renderCategories() {
    const container = document.querySelector('.categories-scroll');
    if (!container) return;

    const catalogs = DB.getAll('catalogs').filter(c => c.active).sort((a, b) => (a.order || 0) - (b.order || 0));

    if (catalogs.length > 0) {
      const allActive = !this.currentCategory || this.currentCategory === 'All';
      container.innerHTML = `
        <button class="category-chip ${allActive ? 'active' : ''}" data-category="All">
          <span class="emoji">🏪</span>
          All
        </button>
        ${catalogs.map(cat => `
          <button class="category-chip ${cat.name === this.currentCategory ? 'active' : ''}" data-category="${cat.name}">
            ${cat.image ? `<img src="${cat.image}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;">` : `<span class="emoji">${cat.emoji || CATEGORY_EMOJIS[cat.name] || '📦'}</span>`}
            ${cat.name}
          </button>
        `).join('')}
      `;
    } else {
      const products = DB.getAll('products');
      const categories = ['All', ...new Set(products.map(p => p.category))];
      container.innerHTML = categories.map(cat => `
        <button class="category-chip ${cat === this.currentCategory ? 'active' : ''}" data-category="${cat}">
          <span class="emoji">${CATEGORY_EMOJIS[cat] || '📦'}</span>
          ${cat}
        </button>
      `).join('');
    }
  },

  initCategoryChips() {
    document.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.currentCategory = chip.dataset.category;
        this.currentPage = 1;
        document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.renderProducts();
      });
    });
  },

  initSearch() {
    const searchInput = document.querySelector('.search-bar input');
    const searchBtn = document.querySelector('.search-btn');
    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          this.currentSearch = searchInput.value.trim();
          this.currentPage = 1;
          this.renderProducts();
        }, 300);
      });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.currentSearch = searchInput.value.trim();
          this.currentPage = 1;
          this.renderProducts();
        }
      });
    }
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
          this.currentSearch = searchInput.value.trim();
          this.currentPage = 1;
          this.renderProducts();
        }
      });
    }
  },

  initSort() {
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        this.sortBy = sortSelect.value;
        this.renderProducts();
      });
    }
  },

  getFilteredProducts() {
    let products = DB.getAll('products');

    if (this.currentCategory !== 'All') {
      products = products.filter(p => p.category === this.currentCategory);
    }

    if (this.currentSearch) {
      const term = this.currentSearch.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
      );
    }

    switch (this.sortBy) {
      case 'price-low': products.sort((a, b) => a.price - b.price); break;
      case 'price-high': products.sort((a, b) => b.price - a.price); break;
      case 'name': products.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: break;
    }

    return products;
  },

  renderProducts() {
    const container = document.querySelector('.product-grid');
    const countEl = document.querySelector('.product-count');
    if (!container) return;

    const products = this.getFilteredProducts();
    const total = products.length;
    const totalPages = Math.ceil(total / this.perPage);
    const start = (this.currentPage - 1) * this.perPage;
    const paginatedProducts = products.slice(start, start + this.perPage);

    if (countEl) countEl.textContent = `${total} products found`;

    if (paginatedProducts.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-icon">🔍</div>
          <h3>No products found</h3>
          <p>Try a different search or category</p>
        </div>`;
      const pagContainer = document.querySelector('.pagination');
      if (pagContainer) pagContainer.innerHTML = '';
      return;
    }

    container.innerHTML = paginatedProducts.map(p => this.renderProductCard(p)).join('');
    this.renderPagination(totalPages);
    this.attachCardEvents();
  },

  renderProductCard(p) {
    const inWishlist = App.isInWishlist(p.id);
    const cart = App.getCart();
    const inCart = cart.find(c => c.productId === p.id);

    return `
      <div class="product-card" data-id="${p.id}">
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
        <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-wishlist="${p.id}">
          ${inWishlist ? '❤️' : '🤍'}
        </button>
        <div class="product-image">
          ${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--border-radius-sm);">` : App.getProductEmoji(p.category)}
        </div>
        <div class="product-info">
          <div class="product-category">${p.category}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-unit">${p.unit}</div>
          <div class="product-bottom">
            <div class="product-price">${App.formatCurrency(p.price)} <small>/${p.unit}</small></div>
            ${inCart
              ? `<div class="qty-control">
                   <button onclick="Shop.changeQty('${p.id}', -1)">−</button>
                   <span class="qty-val">${inCart.qty}</span>
                   <button onclick="Shop.changeQty('${p.id}', 1)">+</button>
                 </div>`
              : `<button class="btn-add-cart" onclick="Shop.addToCart('${p.id}')">Add +</button>`
            }
          </div>
        </div>
      </div>`;
  },

  changeQty(productId, delta) {
    const cart = App.getCart();
    const item = cart.find(c => c.productId === productId);
    if (item) {
      App.updateCartQty(productId, item.qty + delta);
      this.renderProducts();
    }
  },

  addToCart(productId) {
    App.addToCart(productId);
    this.renderProducts();
  },

  renderPagination(totalPages) {
    const container = document.querySelector('.pagination');
    if (!container || totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    let html = `<button ${this.currentPage === 1 ? 'disabled' : ''} onclick="Shop.goToPage(${this.currentPage - 1})">← Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === this.currentPage ? 'active' : ''}" onclick="Shop.goToPage(${i})">${i}</button>`;
    }
    html += `<button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="Shop.goToPage(${this.currentPage + 1})">Next →</button>`;
    container.innerHTML = html;
  },

  goToPage(page) {
    this.currentPage = page;
    this.renderProducts();
    window.scrollTo({ top: 300, behavior: 'smooth' });
  },

  attachCardEvents() {
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        App.toggleWishlist(btn.dataset.wishlist);
        this.renderProducts();
      });
    });
  }
};
