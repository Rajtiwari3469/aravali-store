const Shop = {
  currentCategory: 'All',
  currentSearch: '',
  currentPage: 1,
  perPage: 12,
  sortBy: 'default',

  async init() {
    this.currentPage = 1;
    await this.renderCategories();
    await this.renderProducts();
    this.initSearch();
    this.initCategoryChips();
    this.initSort();
  },

  async renderCategories() {
    const container = document.querySelector('.categories-scroll');
    if (!container) return;

    const catalogs = (await DB.getAll('catalogs')).filter(c => c.active).sort((a, b) => (a.sort_order || a.order || 0) - (b.sort_order || b.order || 0));

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
      const products = await DB.getAll('products');
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

  async getFilteredProducts() {
    let products = await DB.getAll('products');

    if (this.currentCategory !== 'All') {
      products = products.filter(p => p.category === this.currentCategory);
    }

    if (this.currentSearch) {
      const term = this.currentSearch.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term))
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

  async renderProducts() {
    const container = document.querySelector('.product-grid');
    const countEl = document.querySelector('.product-count');
    if (!container) return;

    const products = await this.getFilteredProducts();
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
    const inWishlist = this._wishlistIds && this._wishlistIds.includes(p.id);
    const inCart = this._cartItems && this._cartItems.find(c => c.productId === p.id);
    const isOutOfStock = (p.stock || 0) <= 0;
    const isLowStock = (p.stock || 0) > 0 && (p.stock || 0) <= 5;

    return `
      <div class="product-card" data-id="${p.id}" onclick="${isOutOfStock ? '' : `window.location.href='product.html?id=${p.id}'`}" style="cursor:${isOutOfStock ? 'default' : 'pointer'}; ${isOutOfStock ? 'opacity:0.7;' : ''}">
        <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-wishlist="${p.id}" onclick="event.stopPropagation();">
          ${inWishlist ? '❤️' : '🤍'}
        </button>
        <div class="product-image" style="position:relative;">
          ${(p.image || (p.images && p.images[0])) ? `<img src="${p.image || p.images[0]}" style="width:100%;height:100%;object-fit:contain;border-radius:var(--border-radius-sm);background:#f8f8f8;">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(45,106,79,0.06),rgba(82,183,136,0.1));border-radius:var(--border-radius-sm);color:var(--text-muted);font-size:0.75rem;text-align:center;padding:8px;">No Image</div>`}
          ${isOutOfStock ? '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);border-radius:var(--border-radius-sm);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.85rem;">OUT OF STOCK</div>' : ''}
        </div>
        <div class="product-info">
          <div class="product-tags">
            <div class="product-category">${p.category}</div>
            ${isOutOfStock ? '<span class="product-badge" style="position:static;background:var(--danger);font-size:0.6rem;padding:2px 6px;">Out of Stock</span>' : (p.badge ? `<span class="product-badge" style="position:static;font-size:0.6rem;padding:2px 6px;">${p.badge}</span>` : '')}
            ${isLowStock && !isOutOfStock ? '<span class="product-badge" style="position:static;background:var(--accent);font-size:0.6rem;padding:2px 6px;">Low Stock</span>' : ''}
            ${p.offer && !isOutOfStock ? `<span class="product-badge" style="position:static;background:linear-gradient(135deg,#ff6b6b,#ee5a24);font-size:0.58rem;padding:2px 6px;">${p.offer.split(' ').slice(1).join(' ')}</span>` : ''}
          </div>
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${p.description || ''}</div>
          <div class="product-price">
            ${App.formatCurrency(p.price)}
            ${p.mrp && p.mrp > p.price ? `<span style="text-decoration:line-through;color:var(--text-muted);font-size:0.72rem;font-weight:400;margin-left:4px;">${App.formatCurrency(p.mrp)}</span><span style="font-size:0.68rem;color:var(--success);font-weight:700;margin-left:4px;">${Math.round(((p.mrp - p.price) / p.mrp) * 100)}% off</span>` : ''}
            <small>/${p.unit}</small>
          </div>
          <div class="product-action">
            ${isOutOfStock
              ? `<button class="btn-add-cart" disabled style="opacity:0.5;cursor:not-allowed;background:var(--text-muted);width:100%;">Sold Out</button>`
              : inCart
                ? `<div style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;">
                     <div class="qty-control" onclick="event.stopPropagation();">
                       <button onclick="event.stopPropagation();Shop.changeQty('${p.id}', -1)">−</button>
                       <span class="qty-val">${inCart.qty}</span>
                       <button onclick="event.stopPropagation();Shop.changeQty('${p.id}', 1)">+</button>
                     </div>
                     ${isLowStock ? `<span style="font-size:0.68rem;color:var(--accent);font-weight:600;">${p.stock} left</span>` : ''}
                   </div>`
                : `<button class="btn-add-cart" onclick="event.stopPropagation();Shop.addToCart('${p.id}')" style="width:100%;">Add +</button>`
            }
          </div>
        </div>
      </div>`;
  },

  async changeQty(productId, delta) {
    const cart = await App.getCart();
    const item = cart.find(c => c.productId === productId);
    if (item) {
      await App.updateCartQty(productId, item.qty + delta);
      await this.renderProducts();
    }
  },

  async addToCart(productId) {
    await App.addToCart(productId);
    await this.renderProducts();
  },

  renderPagination(totalPages) {
    const container = document.querySelector('.pagination');
    if (!container || totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    const cur = this.currentPage;
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (cur > 3) pages.push('...');
      const start = Math.max(2, cur - 1);
      const end = Math.min(totalPages - 1, cur + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (cur < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    let html = `<button class="page-nav" ${cur === 1 ? 'disabled' : ''} onclick="Shop.goToPage(${cur - 1})">‹</button>`;
    pages.forEach(p => {
      if (p === '...') {
        html += `<span class="page-dots">⋯</span>`;
      } else {
        html += `<button class="${p === cur ? 'active' : ''}" onclick="Shop.goToPage(${p})">${p}</button>`;
      }
    });
    html += `<button class="page-nav" ${cur === totalPages ? 'disabled' : ''} onclick="Shop.goToPage(${cur + 1})">›</button>`;
    container.innerHTML = html;
  },

  goToPage(page) {
    this.currentPage = page;
    this.renderProducts();
    window.scrollTo({ top: 300, behavior: 'smooth' });
  },

  attachCardEvents() {
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await App.toggleWishlist(btn.dataset.wishlist);
        await this.renderProducts();
      });
    });
  }
};
