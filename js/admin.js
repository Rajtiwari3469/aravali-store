const Admin = {
  currentPage: 'dashboard',

  init() {
    const path = window.location.pathname;
    if (path.includes('login')) {
      this.initLogin();
      return;
    }

    if (!App.requireAdmin()) {
      this.renderLoginRequired();
      return;
    }

    this.renderAdminInfo();

    if (path.includes('products')) {
      this.currentPage = 'products';
      this.renderProducts();
    } else if (path.includes('orders')) {
      this.currentPage = 'orders';
      this.renderOrders();
    } else if (path.includes('users')) {
      this.currentPage = 'users';
      this.renderUsers();
    } else if (path.includes('banners')) {
      this.currentPage = 'banners';
      this.renderBanners();
    } else if (path.includes('catalogs')) {
      this.currentPage = 'catalogs';
      this.renderCatalogs();
    } else if (path.includes('settings')) {
      this.currentPage = 'settings';
      this.initSettings();
    } else if (path.includes('returns')) {
      this.currentPage = 'returns';
      this.renderReturns();
    } else if (path.includes('offers')) {
      this.currentPage = 'offers';
      this.renderOffers();
    } else if (path.includes('stock-logs')) {
      this.currentPage = 'stock-logs';
      this.renderStockLogs();
    } else if (path.includes('admins')) {
      this.currentPage = 'admins';
      this.renderAdmins();
    } else {
      this.currentPage = 'dashboard';
      this.renderDashboard();
    }

    this.highlightNav();
  },

  renderLoginRequired() {
    const main = document.querySelector('.admin-main');
    if (main) {
      main.innerHTML = `
        <div style="text-align:center;padding:80px 20px;">
          <div style="font-size:4rem;margin-bottom:16px;">🔒</div>
          <h2>Access Denied</h2>
          <p style="color:var(--text-muted);margin-bottom:20px;">Please login as admin to continue.</p>
          <a href="login.html" class="btn btn-primary">Admin Login</a>
        </div>`;
    }
  },

  initLogin() {
    const form = document.getElementById('adminLoginForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value.trim();

        const result = App.loginAdmin(email, password);
        if (result.success) {
          window.location.href = 'index.html';
        } else {
          const errorEl = document.getElementById('loginError');
          if (errorEl) {
            errorEl.textContent = result.message || 'Invalid credentials. Use admin@gmail.com';
            errorEl.style.display = 'block';
          }
        }
      });
    }
  },

  renderAdminInfo() {
    const infoEl = document.querySelector('.admin-info');
    if (infoEl && App.currentUser) {
      infoEl.textContent = App.currentUser.email || 'admin';
    }
  },

  highlightNav() {
    document.querySelectorAll('.admin-nav a').forEach(a => {
      a.classList.remove('active');
    });
    const activeLink = document.querySelector(`.admin-nav a[data-page="${this.currentPage}"]`);
    if (activeLink) activeLink.classList.add('active');
  },

  renderDashboard() {
    const main = document.querySelector('.admin-main');
    if (!main) return;

    const products = DB.getAll('products');
    const orders = DB.getAll('orders');
    const users = DB.getAll('users');
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const pendingReturns = DB.getAll('returns').filter(r => r.status === 'pending').length;
    const outOfStockProducts = DB.getOutOfStockProducts();
    const lowStockProducts = DB.getLowStockProducts(5);

    const statCards = document.querySelector('.stat-cards');
    if (statCards) {
      statCards.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-info"><h3>${products.length}</h3><p>Total Products</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🛒</div>
          <div class="stat-info"><h3>${orders.length}</h3><p>Total Orders</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-info"><h3>${users.length}</h3><p>Customers</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-info"><h3>${App.formatCurrency(totalRevenue)}</h3><p>Revenue</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(244,140,6,0.15);">⏳</div>
          <div class="stat-info"><h3>${pendingOrders}</h3><p>Pending Orders</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(82,183,136,0.15);">✅</div>
          <div class="stat-info"><h3>${deliveredOrders}</h3><p>Delivered</p></div>
        </div>
        ${pendingReturns > 0 ? `<div class="stat-card">
          <div class="stat-icon" style="background:rgba(255,152,0,0.15);">🔄</div>
          <div class="stat-info"><h3>${pendingReturns}</h3><p>Pending Returns</p></div>
        </div>` : ''}`;
    }

    // Stock Alert Banner (placed after stat-cards)
    const existingAlert = main.querySelector('.stock-alert-banner');
    if (existingAlert) existingAlert.remove();

    if (outOfStockProducts.length > 0 || lowStockProducts.length > 0) {
      const alertHtml = `
        <div class="stock-alert-banner" style="background:rgba(230,57,70,0.08);border:1px solid rgba(230,57,70,0.2);border-radius:var(--border-radius);padding:20px;margin-bottom:28px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <span style="font-size:1.5rem;">⚠️</span>
            <h3 style="color:var(--danger);font-size:1.05rem;">Stock Alerts</h3>
          </div>
          ${outOfStockProducts.length > 0 ? `
            <div style="margin-bottom:10px;">
              <p style="font-weight:600;color:var(--danger);font-size:0.88rem;margin-bottom:8px;">Out of Stock (${outOfStockProducts.length} products):</p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${outOfStockProducts.map(p => `
                  <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(230,57,70,0.1);border-radius:20px;font-size:0.78rem;">
                    ${p.name}
                    <button onclick="Admin.quickRestock('${p.id}')" style="border:none;background:var(--primary);color:white;border-radius:50%;width:18px;height:18px;font-size:0.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          ${lowStockProducts.length > 0 ? `
            <div>
              <p style="font-weight:600;color:var(--accent);font-size:0.88rem;margin-bottom:8px;">Low Stock (${lowStockProducts.length} products):</p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${lowStockProducts.map(p => `
                  <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(244,140,6,0.1);border-radius:20px;font-size:0.78rem;">
                    ${p.name} (${p.stock} left)
                    <button onclick="Admin.quickRestock('${p.id}')" style="border:none;background:var(--primary);color:white;border-radius:50%;width:18px;height:18px;font-size:0.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>`;

      if (statCards) {
        statCards.insertAdjacentHTML('afterend', alertHtml);
      } else {
        main.insertAdjacentHTML('afterbegin', alertHtml);
      }
    }

    // Sales chart - dynamic last 6 months
    const chartContainer = document.querySelector('.chart-bars');
    if (chartContainer) {
      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ label: d.toLocaleString('en', { month: 'short' }), month: d.getMonth(), year: d.getFullYear() });
      }

      const monthRevenues = months.map(m => {
        const monthOrders = orders.filter(o => {
          const d = new Date(o.orderDate || o.createdAt);
          return d.getMonth() === m.month && d.getFullYear() === m.year;
        });
        return monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      });

      const maxRevenue = Math.max(...monthRevenues, 100);
      chartContainer.innerHTML = months.map((m, i) => {
        const height = Math.max(8, (monthRevenues[i] / maxRevenue) * 150);
        return `
          <div class="chart-bar" style="height:${height}px;">
            <span class="bar-value">${App.formatCurrency(monthRevenues[i])}</span>
            <span class="bar-label">${m.label}</span>
          </div>`;
      }).join('');
    }

    // DBMS Folder - Database tables overview
    const dbmsGrid = document.querySelector('.dbms-tables-grid');
    if (dbmsGrid) {
      const tables = [
        { name: 'products', icon: '📦', label: 'Products', link: 'products.html', color: '#2d6a4f' },
        { name: 'catalogs', icon: '📂', label: 'Catalogs', link: 'catalogs.html', color: '#40916c' },
        { name: 'orders', icon: '🛒', label: 'Orders', link: 'orders.html', color: '#f48c06' },
        { name: 'users', icon: '👥', label: 'Users', link: 'users.html', color: '#e63946' },
        { name: 'banners', icon: '🖼️', label: 'Banners', link: 'banners.html', color: '#6a4c93' },
        { name: 'stock_logs', icon: '📋', label: 'Stock Logs', link: 'stock-logs.html', color: '#457b9d' },
        { name: 'returns', icon: '🔄', label: 'Returns', link: 'returns.html', color: '#e76f51' },
        { name: 'admins', icon: '🔑', label: 'Admins', link: 'admins.html', color: '#264653' },
        { name: 'settings', icon: '⚙️', label: 'Settings', link: 'settings.html', color: '#6c757d' }
      ];

      dbmsGrid.innerHTML = tables.map(t => {
        const count = DB.getAll(t.name).length;
        const isActive = count > 0;
        const clickAttr = t.link ? `onclick="window.location.href='${t.link}'" style="cursor:pointer;"` : '';
        return `
          <div class="dbms-table-card" ${clickAttr} style="background:white;border:1px solid rgba(0,0,0,0.06);border-radius:14px;padding:18px;display:flex;align-items:center;gap:14px;transition:all 0.25s;box-shadow:0 1px 3px rgba(0,0,0,0.04);" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 25px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'">
            <div style="width:48px;height:48px;border-radius:12px;background:${t.color}15;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">${t.icon}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:0.95rem;color:var(--text);margin-bottom:2px;">${t.label}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">${count} record${count !== 1 ? 's' : ''}</div>
            </div>
            ${t.link ? `<div style="width:32px;height:32px;border-radius:8px;background:${isActive ? t.color + '12' : 'rgba(0,0,0,0.03)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span style="color:${isActive ? t.color : '#aaa'};font-size:0.85rem;">→</span></div>` : ''}
          </div>`;
      }).join('');
    }

    // Recent orders (sorted by date, newest first)
    const recentContainer = document.querySelector('.recent-orders-list');
    if (recentContainer) {
      const sorted = [...orders].sort((a, b) => new Date(b.orderDate || b.createdAt) - new Date(a.orderDate || a.createdAt));
      const recent = sorted.slice(0, 5);
      if (recent.length === 0) {
        recentContainer.innerHTML = '<p style="color:var(--text-muted);padding:16px;">No orders yet.</p>';
      } else {
        recentContainer.innerHTML = recent.map(o => `
          <div class="recent-order-item">
            <div class="order-info">
              <span class="order-id">#${o.id.slice(-6).toUpperCase()}</span>
              <span class="order-date">${o.userName || 'Guest'} • ${App.formatDate(o.orderDate || o.createdAt)}</span>
            </div>
            <span class="order-status ${o.status}">${o.status}</span>
            <span style="font-weight:600;">${App.formatCurrency(o.total)}</span>
          </div>
        `).join('');
      }
    }
  },

  // Products
  renderProducts() {
    const main = document.querySelector('.admin-content');
    if (!main) return;

    const products = DB.getAll('products');

    main.innerHTML = `
      <div class="admin-table-wrapper">
        <div class="admin-table-header">
          <h3>All Products (${products.length})</h3>
          <div style="display:flex;gap:10px;align-items:center;">
            <input type="text" class="search-input" placeholder="Search products..." oninput="Admin.filterProducts(this.value)">
            <button class="btn btn-secondary btn-sm" onclick="Admin.showStockHistory()">📋 Stock Log</button>
            <button class="btn btn-primary btn-sm" onclick="Admin.showAddProduct()">+ Add Product</button>
          </div>
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Stock Control</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="productsTableBody">
            ${this.renderProductRows(products)}
          </tbody>
        </table>
      </div>
      <div id="productModal" class="modal-overlay" onclick="if(event.target===this)this.classList.remove('active')">
        <div class="modal" id="productModalContent"></div>
      </div>`;
  },

  renderProductRows(products) {
    if (products.length === 0) {
      return '<tr><td colspan="6" style="text-align:center;padding:40px;">No products found.</td></tr>';
    }
    return products.map(p => {
      const stock = p.stock || 0;
      let stockBadge = '';
      let stockColor = '';
      if (stock <= 0) {
        stockBadge = 'Out of Stock';
        stockColor = 'var(--danger)';
      } else if (stock <= 5) {
        stockBadge = 'Low';
        stockColor = 'var(--accent)';
      } else {
        stockBadge = 'In Stock';
        stockColor = 'var(--success)';
      }
      return `
      <tr style="${stock <= 0 ? 'background:rgba(230,57,70,0.03);' : stock <= 5 ? 'background:rgba(244,140,6,0.03);' : ''}">
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            ${p.image || (p.images && p.images[0])
              ? `<img src="${p.image || p.images[0]}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;">`
              : `<div style="width:40px;height:40px;border-radius:8px;background:rgba(45,106,79,0.08);display:flex;align-items:center;justify-content:center;font-size:0.65rem;color:var(--text-muted);">No Img</div>`
            }
            <div>
              <div style="font-weight:600;">${p.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${p.unit}</div>
              ${p.offer ? `<div style="font-size:0.68rem;margin-top:3px;display:inline-block;padding:2px 8px;background:rgba(230,57,70,0.08);color:var(--danger);border-radius:8px;font-weight:600;">${p.offer}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="font-size:0.82rem;">${p.category}</td>
        <td style="font-weight:600;color:var(--primary);">${App.formatCurrency(p.price)}${p.mrp && p.mrp > p.price ? ` <span style="text-decoration:line-through;color:var(--text-muted);font-weight:400;font-size:0.78rem;">${App.formatCurrency(p.mrp)}</span> <span style="font-size:0.72rem;color:var(--success);font-weight:600;">${Math.round((p.mrp - p.price) / p.mrp * 100)}% off</span>` : ''}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;color:white;background:${stockColor};">${stockBadge}</span>
            <span style="font-size:0.82rem;color:var(--text-muted);">(${stock})</span>
          </div>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:4px;">
            <button onclick="Admin.adjustStock('${p.id}', -1)" style="width:24px;height:24px;border:1px solid rgba(45,106,79,0.15);border-radius:4px;background:white;cursor:pointer;font-size:0.8rem;display:flex;align-items:center;justify-content:center;" title="Decrease stock">−</button>
            <input type="number" value="${stock}" min="0" style="width:50px;text-align:center;border:1px solid rgba(45,106,79,0.15);border-radius:4px;padding:2px;font-size:0.82rem;font-family:var(--font);" onchange="Admin.setStock('${p.id}', this.value)">
            <button onclick="Admin.adjustStock('${p.id}', 1)" style="width:24px;height:24px;border:1px solid rgba(45,106,79,0.15);border-radius:4px;background:white;cursor:pointer;font-size:0.8rem;display:flex;align-items:center;justify-content:center;" title="Increase stock">+</button>
          </div>
        </td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit" onclick="Admin.editProduct('${p.id}')">Edit</button>
            <button class="action-btn delete" onclick="Admin.deleteProduct('${p.id}')">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  filterProducts(term) {
    let products = DB.getAll('products');
    if (term) {
      const t = term.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(t) ||
        p.category.toLowerCase().includes(t)
      );
    }
    document.getElementById('productsTableBody').innerHTML = this.renderProductRows(products);
  },

  showAddProduct() {
    const modal = document.getElementById('productModal');
    const content = document.getElementById('productModalContent');
    const categories = DB.getAll('catalogs').filter(c => c.active).map(c => c.name);
    if (categories.length === 0) {
      categories.push('Dairy','Fruits','Vegetables','Snacks','Beverages','Grains','Bakery','Frozen');
    }
    content.innerHTML = `
      <button class="modal-close" onclick="Admin.closeModal()">✕</button>
      <h2>Add New Product</h2>
      <form id="productForm" onsubmit="Admin.saveProduct(event)">
        <div class="form-group">
          <label>Product Images (max 5)</label>
          <input type="file" id="pImages" accept="image/*" multiple style="margin-bottom:8px;">
          <div id="pImagesPreview" style="display:flex;gap:8px;flex-wrap:wrap;min-height:10px;"></div>
        </div>
        <div class="form-group">
          <label>Product Name</label>
          <input type="text" id="pName" required>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="pCategory" required>
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Selling Price (₹)</label>
          <input type="number" id="pPrice" required min="1">
        </div>
        <div class="form-group">
          <label>MRP (₹) (optional)</label>
          <input type="number" id="pMrp" min="0" placeholder="Must be ≥ selling price">
        </div>
        <div class="form-group">
          <label>Unit</label>
          <input type="text" id="pUnit" placeholder="e.g. 1kg, 500ml" required>
        </div>
        <div class="form-group">
          <label>Stock</label>
          <input type="number" id="pStock" required min="0">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="pDesc" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label>Badge (optional)</label>
          <input type="text" id="pBadge" placeholder="e.g. Top Rated, New">
        </div>
        <div class="form-group">
          <label>Add to Offer Section (optional)</label>
          <select id="pOffer">
            <option value="">None</option>
            <option value="🔥 Today's Deals">🔥 Today's Deals</option>
            <option value="⚡ Flash Sale">⚡ Flash Sale</option>
            <option value="💸 Up to 50% OFF">💸 Up to 50% OFF</option>
            <option value="🛍️ Buy 1 Get 1 Free">🛍️ Buy 1 Get 1 Free</option>
            <option value="🎁 Combo Packs">🎁 Combo Packs</option>
            <option value="🥦 Fresh Produce Deals">🥦 Fresh Produce Deals</option>
            <option value="🥛 Dairy Specials">🥛 Dairy Specials</option>
            <option value="🍿 Snack Offers">🍿 Snack Offers</option>
            <option value="🧴 Personal Care Discounts">🧴 Personal Care Discounts</option>
            <option value="🧹 Household Essentials Sale">🧹 Household Essentials Sale</option>
            <option value="🆕 New Arrival Offers">🆕 New Arrival Offers</option>
            <option value="⭐ Best Value Deals">⭐ Best Value Deals</option>
            <option value="🎉 Festival Offers">🎉 Festival Offers</option>
            <option value="💳 Bank & Wallet Offers">💳 Bank & Wallet Offers</option>
            <option value="🚚 Free Delivery on ₹499+">🚚 Free Delivery on ₹499+</option>
          </select>
        </div>
        <input type="hidden" id="pEditId" value="">
        <input type="hidden" id="pExistingImages" value="">
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;">Save Product</button>
      </form>`;
    modal.classList.add('active');
    const prevContainer = document.getElementById('pImagesPreview');
    if (prevContainer) prevContainer._images = [];
    App.handleMultiImageUpload('pImages', 'pImagesPreview', 300);
  },

  editProduct(id) {
    const product = DB.getById('products', id);
    if (!product) return;

    this.showAddProduct();
    document.getElementById('productModalContent').querySelector('h2').textContent = 'Edit Product';
    document.getElementById('pName').value = product.name;
    document.getElementById('pCategory').value = product.category;
    document.getElementById('pPrice').value = product.price;
    document.getElementById('pMrp').value = product.mrp || '';
    document.getElementById('pUnit').value = product.unit;
    document.getElementById('pStock').value = product.stock;
    document.getElementById('pDesc').value = product.description || '';
    document.getElementById('pBadge').value = product.badge || '';
    document.getElementById('pOffer').value = product.offer || '';
    document.getElementById('pEditId').value = id;

    const existingImages = (product.images && product.images.length > 0) ? product.images : (product.image ? [product.image] : []);
    document.getElementById('pExistingImages').value = JSON.stringify(existingImages);

    const prevContainer = document.getElementById('pImagesPreview');
    if (prevContainer) {
      prevContainer._images = [...existingImages];
      this.renderImagePreviews();
    }
  },

  renderImagePreviews() {
    const container = document.getElementById('pImagesPreview');
    if (!container) return;
    const images = container._images || [];
    container.innerHTML = images.map((img, i) => `
      <div style="position:relative;width:70px;height:70px;border-radius:8px;overflow:hidden;border:2px solid ${i === 0 ? 'var(--primary)' : 'rgba(45,106,79,0.15)'};">
        <img src="${img}" style="width:100%;height:100%;object-fit:cover;">
        ${i === 0 ? '<span style="position:absolute;bottom:0;left:0;right:0;background:var(--primary);color:white;font-size:0.55rem;text-align:center;padding:1px 0;font-weight:600;">MAIN</span>' : ''}
        <button type="button" onclick="App.removeMultiImage('pImagesPreview',${i})" style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(230,57,70,0.9);color:white;border:none;font-size:0.65rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>
      </div>
    `).join('');
  },

  saveProduct(e) {
    e.preventDefault();
    const editId = document.getElementById('pEditId').value;
    const newImages = App.getMultiImageData('pImagesPreview');
    let existingImages = [];
    try { existingImages = JSON.parse(document.getElementById('pExistingImages').value || '[]'); } catch {}

    const allImages = [...existingImages, ...newImages].slice(0, 5);

    const mrpVal = parseFloat(document.getElementById('pMrp').value) || 0;
    const priceVal = parseFloat(document.getElementById('pPrice').value);

    const data = {
      name: document.getElementById('pName').value.trim(),
      category: document.getElementById('pCategory').value,
      price: priceVal,
      mrp: mrpVal > priceVal ? mrpVal : 0,
      unit: document.getElementById('pUnit').value.trim(),
      stock: parseInt(document.getElementById('pStock').value),
      description: document.getElementById('pDesc').value.trim(),
      badge: document.getElementById('pBadge').value.trim(),
      offer: document.getElementById('pOffer').value,
      images: allImages,
      image: allImages[0] || ''
    };

    if (editId) {
      DB.update('products', editId, data);
      App.showToast('Product updated!', 'success');
    } else {
      DB.insert('products', data);
      App.showToast('Product added!', 'success');
    }

    this.closeModal();
    this.renderProducts();
  },

  deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
      DB.delete('products', id);
      App.showToast('Product deleted', 'info');
      this.renderProducts();
    }
  },

  // Orders
  renderOrders(filterStatus) {
    const main = document.querySelector('.admin-content');
    if (!main) return;

    const allOrders = DB.getAll('orders').reverse();
    const statusCounts = { all: allOrders.length, pending: 0, confirmed: 0, delivered: 0, cancelled: 0 };
    allOrders.forEach(o => {
      if (statusCounts[o.status] !== undefined) statusCounts[o.status]++;
    });

    const activeTab = filterStatus || 'all';
    const filtered = activeTab === 'all' ? allOrders : allOrders.filter(o => o.status === activeTab);

    main.innerHTML = `
      <div class="admin-table-wrapper">
        <div class="admin-table-header">
          <h3>Orders</h3>
          <div style="display:flex;gap:10px;align-items:center;">
            <input type="text" class="search-input" placeholder="Search by ID, name, phone..." oninput="Admin.filterOrders(this.value)">
            ${allOrders.length > 0 ? `<button class="btn btn-sm" onclick="Admin.deleteAllOrders()" style="background:rgba(230,57,70,0.1);color:var(--danger);font-weight:600;padding:6px 14px;border-radius:8px;border:none;cursor:pointer;font-family:var(--font);font-size:0.82rem;">🗑️ Clear All</button>` : ''}
          </div>
        </div>

        <div style="display:flex;gap:6px;padding:0 0 16px;flex-wrap:wrap;">
          <button onclick="Admin.renderOrders('all')" style="padding:7px 16px;border-radius:20px;border:none;cursor:pointer;font-family:var(--font);font-size:0.8rem;font-weight:600;transition:0.2s;${activeTab==='all'?'background:var(--primary);color:white;':'background:rgba(45,106,79,0.06);color:var(--text-light);'}">All <span style="margin-left:4px;opacity:0.8;">${statusCounts.all}</span></button>
          <button onclick="Admin.renderOrders('pending')" style="padding:7px 16px;border-radius:20px;border:none;cursor:pointer;font-family:var(--font);font-size:0.8rem;font-weight:600;transition:0.2s;${activeTab==='pending'?'background:#ff9800;color:white;':'background:rgba(255,152,0,0.08);color:#e67e22;'}">⏳ Pending <span style="margin-left:4px;">${statusCounts.pending}</span></button>
          <button onclick="Admin.renderOrders('confirmed')" style="padding:7px 16px;border-radius:20px;border:none;cursor:pointer;font-family:var(--font);font-size:0.8rem;font-weight:600;transition:0.2s;${activeTab==='confirmed'?'background:#2196f3;color:white;':'background:rgba(33,150,243,0.08);color:#2196f3;'}">✅ Confirmed <span style="margin-left:4px;">${statusCounts.confirmed}</span></button>
          <button onclick="Admin.renderOrders('delivered')" style="padding:7px 16px;border-radius:20px;border:none;cursor:pointer;font-family:var(--font);font-size:0.8rem;font-weight:600;transition:0.2s;${activeTab==='delivered'?'background:#4caf50;color:white;':'background:rgba(76,175,80,0.08);color:#4caf50;'}">🚚 Delivered <span style="margin-left:4px;">${statusCounts.delivered}</span></button>
          <button onclick="Admin.renderOrders('cancelled')" style="padding:7px 16px;border-radius:20px;border:none;cursor:pointer;font-family:var(--font);font-size:0.8rem;font-weight:600;transition:0.2s;${activeTab==='cancelled'?'background:#f44336;color:white;':'background:rgba(244,67,54,0.08);color:#f44336;'}">❌ Cancelled <span style="margin-left:4px;">${statusCounts.cancelled}</span></button>
        </div>

        ${activeTab === 'pending' && filtered.length > 0 ? `
        <div style="background:linear-gradient(135deg,rgba(255,152,0,0.08),rgba(255,183,77,0.06));border:1px solid rgba(255,152,0,0.2);border-radius:12px;padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.3rem;">⏳</span>
          <div>
            <p style="margin:0;font-weight:700;color:#e67e22;font-size:0.9rem;">${filtered.length} pending order${filtered.length > 1 ? 's' : ''} awaiting action</p>
            <p style="margin:2px 0 0;font-size:0.78rem;color:#b7791f;">Review and confirm these orders to keep your store running smoothly.</p>
          </div>
        </div>` : ''}

        <table class="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="ordersTableBody">
            ${this.renderOrderRows(filtered)}
          </tbody>
        </table>
      </div>`;
  },

  parseOrderAddress(order) {
    const addr = order.address || '';
    const phoneMatch = addr.match(/Phone:\s*([^\s-]+)/);
    const phone = phoneMatch ? phoneMatch[1] : '';
    const parts = addr.split(' - ').map(s => s.trim()).filter(Boolean);
    let cleanAddress = addr;
    let customerName = order.userName || 'Guest';
    if (parts.length >= 3) {
      cleanAddress = parts[0];
      customerName = parts[parts.length - 1];
    } else if (parts.length === 2) {
      cleanAddress = parts[0];
    }
    return { phone, cleanAddress, customerName };
  },

  renderOrderRows(orders) {
    if (orders.length === 0) {
      return '<tr><td colspan="9" style="text-align:center;padding:40px;">No orders yet.</td></tr>';
    }
    return orders.map(o => {
      const parsed = this.parseOrderAddress(o);
      return `
      <tr>
        <td style="font-weight:600;">#${o.id.slice(-6).toUpperCase()}</td>
        <td style="font-weight:600;">${parsed.customerName}</td>
        <td style="font-size:0.82rem;">${parsed.phone || 'N/A'}</td>
        <td style="font-size:0.78rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${parsed.cleanAddress}">${parsed.cleanAddress || 'N/A'}</td>
        <td>${(o.items || []).length} items</td>
        <td style="font-weight:600;color:var(--primary);">${App.formatCurrency(o.total || 0)}</td>
        <td>
          <select class="order-status-select" onchange="Admin.updateOrderStatus('${o.id}', this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid rgba(45,106,79,0.15);font-family:var(--font);font-size:0.78rem;">
            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            ${o.status === 'return_requested' ? '<option value="return_requested" selected>🔄 Return Requested</option>' : ''}
            ${o.status === 'return_approved' ? '<option value="return_approved" selected>✅ Return Approved</option>' : ''}
            ${o.status === 'refunded' ? '<option value="refunded" selected>💰 Refunded</option>' : ''}
          </select>
        </td>
        <td style="font-size:0.82rem;">${App.formatDate(o.orderDate || o.createdAt)}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn view" onclick="Admin.viewOrder('${o.id}')">View</button>
            <button class="action-btn delete" onclick="Admin.deleteOrder('${o.id}')">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  filterOrders(term) {
    let orders = DB.getAll('orders').reverse();
    if (term) {
      const t = term.toLowerCase();
      orders = orders.filter(o => {
        const parsed = this.parseOrderAddress(o);
        return o.id.toLowerCase().includes(t) ||
          (o.userName && o.userName.toLowerCase().includes(t)) ||
          o.status.toLowerCase().includes(t) ||
          parsed.phone.includes(t) ||
          parsed.cleanAddress.toLowerCase().includes(t) ||
          parsed.customerName.toLowerCase().includes(t);
      });
    }
    document.getElementById('ordersTableBody').innerHTML = this.renderOrderRows(orders);
  },

  updateOrderStatus(orderId, status) {
    DB.update('orders', orderId, { status });
    App.showToast(`Order status updated to ${status}`, 'success');
  },

  deleteOrder(orderId) {
    if (!confirm('Delete this order? This cannot be undone.')) return;
    DB.delete('orders', orderId);
    App.showToast('Order deleted', 'info');
    this.renderOrders();
  },

  deleteAllOrders() {
    const count = DB.getAll('orders').length;
    if (!confirm(`Delete ALL ${count} orders? This cannot be undone.`)) return;
    if (!confirm('Are you absolutely sure? This is permanent.')) return;
    DB.clearTable('orders');
    App.showToast('All orders deleted', 'success');
    this.renderOrders();
  },

  viewOrder(orderId) {
    const order = DB.getById('orders', orderId);
    if (!order) return;

    const modal = document.getElementById('productModal');
    if (!modal) return;
    const content = document.getElementById('productModalContent');
    const parsed = this.parseOrderAddress(order);

    const user = DB.getById('users', order.userId);
    const userPhone = user ? user.phone : parsed.phone;
    const userName = user ? user.name : parsed.customerName;
    const userEmail = user ? user.email : '';

    content.innerHTML = `
      <button class="modal-close" onclick="Admin.closeModal()">✕</button>
      <h2 style="margin-bottom:20px;">Order #${order.id.slice(-6).toUpperCase()}</h2>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">
        <div style="padding:12px;background:rgba(82,183,136,0.05);border-radius:10px;">
          <p style="font-size:0.72rem;color:var(--text-muted);margin:0 0 3px;">Customer</p>
          <p style="font-weight:700;margin:0;font-size:0.9rem;">${userName}</p>
        </div>
        <div style="padding:12px;background:rgba(82,183,136,0.05);border-radius:10px;">
          <p style="font-size:0.72rem;color:var(--text-muted);margin:0 0 3px;">Phone</p>
          <p style="font-weight:700;margin:0;font-size:0.9rem;">${userPhone || 'N/A'}</p>
        </div>
        ${userEmail ? `<div style="padding:12px;background:rgba(82,183,136,0.05);border-radius:10px;">
          <p style="font-size:0.72rem;color:var(--text-muted);margin:0 0 3px;">Email</p>
          <p style="font-weight:600;margin:0;font-size:0.82rem;">${userEmail}</p>
        </div>` : ''}
        <div style="padding:12px;background:rgba(82,183,136,0.05);border-radius:10px;">
          <p style="font-size:0.72rem;color:var(--text-muted);margin:0 0 3px;">Date</p>
          <p style="font-weight:600;margin:0;font-size:0.85rem;">${App.formatDate(order.orderDate || order.createdAt)}</p>
        </div>
      </div>

      <div style="padding:12px 14px;background:rgba(45,106,79,0.04);border-radius:10px;border-left:3px solid var(--primary);margin-bottom:16px;">
        <p style="font-size:0.72rem;color:var(--text-muted);margin:0 0 3px;">📍 Delivery Address</p>
        <p style="font-weight:600;margin:0;font-size:0.88rem;">${parsed.cleanAddress || order.address || 'N/A'}</p>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:16px;">
        <div style="flex:1;padding:10px;text-align:center;background:rgba(82,183,136,0.06);border-radius:8px;">
          <span class="order-status ${order.status}" style="font-size:0.78rem;">${order.status}</span>
        </div>
        <div style="flex:1;padding:10px;text-align:center;background:rgba(82,183,136,0.06);border-radius:8px;">
          <span style="font-size:0.78rem;color:var(--text-muted);">Payment</span><br>
          <span style="font-weight:600;font-size:0.85rem;">${order.paymentMethod === 'cod' ? '💵 COD' : '📱 UPI'}</span>
        </div>
      </div>

      <h3 style="font-size:0.9rem;margin-bottom:10px;color:var(--text);">📦 Items Ordered</h3>
      ${(order.items || []).map(item => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(45,106,79,0.06);">
          <div>
            <span style="font-weight:600;font-size:0.88rem;">${item.name}</span>
            <span style="font-size:0.78rem;color:var(--text-muted);margin-left:6px;">× ${item.qty}</span>
          </div>
          <span style="font-weight:600;">${App.formatCurrency(item.price * item.qty)}</span>
        </div>
      `).join('')}

      <div style="padding:12px 0;display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
          <span>Subtotal</span><span>${App.formatCurrency(order.subtotal || 0)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
          <span>Delivery</span><span>${order.delivery === 0 ? 'FREE' : App.formatCurrency(order.delivery || 0)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:2px solid rgba(45,106,79,0.1);font-weight:700;font-size:1.05rem;color:var(--primary-dark);">
          <span>Total</span>
          <span>${App.formatCurrency(order.total || 0)}</span>
        </div>
      </div>`;

    modal.classList.add('active');
  },

  // Users
  renderUsers() {
    const main = document.querySelector('.admin-content');
    if (!main) return;

    const users = DB.getAll('users');
    const orders = DB.getAll('orders');

    main.innerHTML = `
      <div class="admin-table-wrapper">
        <div class="admin-table-header">
          <h3>All Users (${users.length})</h3>
          <input type="text" class="search-input" placeholder="Search users..." oninput="Admin.filterUsers(this.value)">
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Spent</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="usersTableBody">
            ${this.renderUserRows(users, orders)}
          </tbody>
        </table>
      </div>
      <div id="productModal" class="modal-overlay" onclick="if(event.target===this)this.classList.remove('active')">
        <div class="modal" id="productModalContent"></div>
      </div>`;
  },

  renderUserRows(users, orders) {
    if (!orders) orders = DB.getAll('orders');
    if (users.length === 0) {
      return '<tr><td colspan="7" style="text-align:center;padding:40px;">No users registered yet.</td></tr>';
    }
    return users.map(u => {
      const userOrders = orders.filter(o => o.userId === u.id);
      const totalSpent = userOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      return `
        <tr>
          <td style="font-weight:600;">${u.name}</td>
          <td>${u.email}</td>
          <td>${u.phone || 'N/A'}</td>
          <td>${userOrders.length}</td>
          <td style="font-weight:600;color:var(--primary);">${totalSpent > 0 ? App.formatCurrency(totalSpent) : '-'}</td>
          <td style="font-size:0.82rem;">${App.formatDate(u.createdAt)}</td>
          <td>
            <div class="action-btns">
              <button class="action-btn view" onclick="Admin.viewUser('${u.id}')">View</button>
              <button class="action-btn delete" onclick="Admin.deleteUser('${u.id}')">Delete</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  filterUsers(term) {
    let users = DB.getAll('users');
    if (term) {
      const t = term.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(t) ||
        u.email.toLowerCase().includes(t) ||
        (u.phone && u.phone.includes(t))
      );
    }
    document.getElementById('usersTableBody').innerHTML = this.renderUserRows(users);
  },

  viewUser(userId) {
    const user = DB.getById('users', userId);
    if (!user) return;
    const modal = document.getElementById('productModal');
    const content = document.getElementById('productModalContent');
    const orders = DB.getAll('orders').filter(o => o.userId === userId).sort((a, b) => new Date(b.orderDate || b.createdAt) - new Date(a.orderDate || a.createdAt));
    const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const deliveredCount = orders.filter(o => o.status === 'delivered').length;
    const pendingCount = orders.filter(o => o.status === 'pending').length;

    const addresses = [...new Set(orders.map(o => o.address).filter(Boolean))];

    content.innerHTML = `
      <button class="modal-close" onclick="Admin.closeModal()">✕</button>
      <h2 style="margin-bottom:20px;">${user.name}</h2>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
        <div style="padding:14px;background:rgba(82,183,136,0.05);border-radius:10px;">
          <p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 4px;">Email</p>
          <p style="font-weight:600;margin:0;font-size:0.88rem;">${user.email}</p>
        </div>
        <div style="padding:14px;background:rgba(82,183,136,0.05);border-radius:10px;">
          <p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 4px;">Phone</p>
          <p style="font-weight:600;margin:0;font-size:0.88rem;">${user.phone || 'N/A'}</p>
        </div>
        <div style="padding:14px;background:rgba(82,183,136,0.05);border-radius:10px;">
          <p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 4px;">Joined</p>
          <p style="font-weight:600;margin:0;font-size:0.88rem;">${App.formatDate(user.createdAt)}</p>
        </div>
        <div style="padding:14px;background:rgba(82,183,136,0.05);border-radius:10px;">
          <p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 4px;">Total Spent</p>
          <p style="font-weight:700;margin:0;font-size:1rem;color:var(--primary);">${totalSpent > 0 ? App.formatCurrency(totalSpent) : '-'}</p>
        </div>
      </div>

      <div style="display:flex;gap:12px;margin-bottom:20px;">
        <div style="flex:1;padding:12px;text-align:center;background:rgba(82,183,136,0.08);border-radius:10px;">
          <div style="font-size:1.4rem;font-weight:700;color:var(--primary);">${orders.length}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Total Orders</div>
        </div>
        <div style="flex:1;padding:12px;text-align:center;background:rgba(82,183,136,0.08);border-radius:10px;">
          <div style="font-size:1.4rem;font-weight:700;color:var(--success);">${deliveredCount}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Delivered</div>
        </div>
        <div style="flex:1;padding:12px;text-align:center;background:rgba(244,140,6,0.08);border-radius:10px;">
          <div style="font-size:1.4rem;font-weight:700;color:var(--accent);">${pendingCount}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">Pending</div>
        </div>
      </div>

      ${addresses.length > 0 ? `
        <div style="margin-bottom:20px;">
          <h3 style="font-size:0.9rem;margin-bottom:10px;color:var(--text);">📍 Saved Addresses</h3>
          ${addresses.map(a => `
            <div style="padding:10px 14px;background:rgba(82,183,136,0.04);border-radius:8px;margin-bottom:6px;font-size:0.85rem;border-left:3px solid var(--primary);">
              ${a}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${orders.length > 0 ? `
        <h3 style="font-size:0.9rem;margin-bottom:10px;color:var(--text);">📦 Order History</h3>
        <div style="max-height:260px;overflow-y:auto;">
          ${orders.slice(0, 10).map(o => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid rgba(45,106,79,0.06);gap:10px;">
              <div style="flex:1;">
                <span style="font-weight:600;font-size:0.85rem;">#${o.id.slice(-6).toUpperCase()}</span>
                <span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px;">${App.formatDate(o.orderDate || o.createdAt)}</span>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${(o.items || []).length} items</div>
              </div>
              <span class="order-status ${o.status}" style="font-size:0.72rem;">${o.status}</span>
              <span style="font-weight:600;font-size:0.85rem;color:var(--primary);">${App.formatCurrency(o.total || 0)}</span>
            </div>
          `).join('')}
        </div>
      ` : '<p style="color:var(--text-muted);font-size:0.85rem;">No orders yet.</p>'}`;

    modal.classList.add('active');
  },

  deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
      DB.delete('users', id);
      App.showToast('User deleted', 'info');
      this.renderUsers();
    }
  },

  // Settings
  initSettings() {
    const main = document.querySelector('.admin-content');
    if (!main) return;

    const admin = DB.getAll('admins')[0];
    const settings = DB.getSettings();
    main.innerHTML = `
      <div style="max-width:500px;">
        <div class="glass-card" style="padding:30px;">
          <h3 style="margin-bottom:20px;color:var(--primary-dark);">Banner Settings</h3>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:rgba(82,183,136,0.05);border-radius:12px;">
            <div>
              <p style="font-weight:600;margin:0;">Auto-Swipe Banners</p>
              <p style="color:var(--text-muted);font-size:0.82rem;margin:4px 0 0;">When ON, homepage banners swipe automatically. When OFF, banners are fixed in grid.</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="bannerSwipeToggle" ${settings.bannerSwipe !== false ? 'checked' : ''} onchange="Admin.toggleBannerSwipe(this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="glass-card" style="padding:30px;margin-top:20px;">
          <h3 style="margin-bottom:20px;color:var(--primary-dark);">Online Payment Settings</h3>
          <div class="form-group">
            <label>Admin UPI ID</label>
            <input type="text" id="adminUpi" value="${settings.upiId || ''}" placeholder="e.g. merchant@upi or 9876543210@paytm">
            <p style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">If set, customers can pay online via UPI. If empty, online payment is disabled and only COD is available.</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="Admin.saveUpiId()">Save UPI ID</button>
        </div>

        <div class="glass-card" style="padding:30px;margin-top:20px;">
          <h3 style="margin-bottom:20px;color:var(--primary-dark);">📍 Store Contact Info</h3>
          <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:16px;">This information is shown on the Contact Us page and footer. Update it anytime.</p>
          <div class="form-group">
            <label>Store Name</label>
            <input type="text" id="contactStoreName" value="${settings.contactStoreName || 'Aravali Store'}" placeholder="Your store name">
          </div>
          <div class="form-group">
            <label>📍 Store Address</label>
            <input type="text" id="contactAddress" value="${settings.contactAddress || '123 MG Road, Udaipur, Rajasthan - 313001, India'}" placeholder="Full store address">
          </div>
          <div class="form-group">
            <label>📞 Phone Number</label>
            <input type="tel" id="contactPhone" value="${settings.contactPhone || '+91 98765 43210'}" placeholder="+91 XXXXX XXXXX">
          </div>
          <div class="form-group">
            <label>✉️ Primary Email</label>
            <input type="email" id="contactEmail" value="${settings.contactEmail || 'hello@aravalistore.in'}" placeholder="hello@example.com">
          </div>
          <div class="form-group">
            <label>✉️ Support Email</label>
            <input type="email" id="contactSupportEmail" value="${settings.contactSupportEmail || 'support@aravalistore.in'}" placeholder="support@example.com">
          </div>
          <div class="form-group">
            <label>🕐 Weekday Hours</label>
            <input type="text" id="contactWeekdayHours" value="${settings.contactWeekdayHours || 'Monday - Saturday: 8:00 AM - 10:00 PM'}" placeholder="e.g. Mon-Sat: 9AM-9PM">
          </div>
          <div class="form-group">
            <label>🕐 Sunday Hours</label>
            <input type="text" id="contactSundayHours" value="${settings.contactSundayHours || 'Sunday: 9:00 AM - 8:00 PM'}" placeholder="e.g. Sunday: 10AM-6PM">
          </div>
          <button class="btn btn-primary btn-sm" onclick="Admin.saveContactInfo()">Save Contact Info</button>
        </div>

        <div class="glass-card" style="padding:30px;margin-top:20px;">
          <h3 style="margin-bottom:20px;color:var(--primary-dark);">Change Password</h3>
          <form id="settingsForm">
            <div class="form-group">
              <label>Current Password</label>
              <div class="password-wrapper">
                <input type="password" id="currentPass" required>
                <button type="button" class="password-toggle" onclick="App.togglePassword('currentPass')">👁️</button>
              </div>
            </div>
            <div class="form-group">
              <label>New Password</label>
              <div class="password-wrapper">
                <input type="password" id="newPass" required>
                <button type="button" class="password-toggle" onclick="App.togglePassword('newPass')">👁️</button>
              </div>
            </div>
            <div class="form-group">
              <label>Confirm New Password</label>
              <div class="password-wrapper">
                <input type="password" id="confirmPass" required>
                <button type="button" class="password-toggle" onclick="App.togglePassword('confirmPass')">👁️</button>
              </div>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">Update Password</button>
          </form>
        </div>

        <div class="glass-card" style="padding:30px;margin-top:20px;">
          <h3 style="margin-bottom:16px;color:var(--primary-dark);">Database Management</h3>
          <p style="color:var(--text-muted);font-size:0.88rem;margin-bottom:16px;">Export or import all data as JSON.</p>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-secondary btn-sm" onclick="Admin.exportData()">📤 Export Data</button>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('importFile').click()">📥 Import Data</button>
            <input type="file" id="importFile" accept=".json" style="display:none;" onchange="Admin.importData(event)">
          </div>
        </div>

        <div class="glass-card" style="padding:30px;margin-top:20px;">
          <h3 style="margin-bottom:6px;color:var(--primary-dark);">Manage Data</h3>
          <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:20px;">Select specific data types to delete, or delete everything at once.</p>

          <div style="border:1px solid rgba(45,106,79,0.1);border-radius:12px;overflow:hidden;margin-bottom:20px;">
            <label style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(45,106,79,0.04);border-bottom:1px solid rgba(45,106,79,0.1);cursor:pointer;user-select:none;" onmouseover="this.style.background='rgba(45,106,79,0.08)'" onmouseout="this.style.background='rgba(45,106,79,0.04)'">
              <input type="checkbox" id="selectAllData" style="width:18px;height:18px;accent-color:var(--primary);" onchange="Admin.toggleSelectAll(this.checked)">
              <span style="font-weight:700;font-size:0.9rem;">Select All</span>
            </label>
            <div id="dataCheckboxes" style="display:flex;flex-direction:column;">
              ${Admin.renderDataCheckboxes()}
            </div>
          </div>

          <div style="display:flex;gap:10px;margin-bottom:20px;">
            <button class="btn btn-secondary" onclick="Admin.deleteSelectedData()" id="deleteSelectedBtn" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;">
              🗑️ Delete Selected
            </button>
            <button class="btn" onclick="Admin.deleteAllData()" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;background:rgba(230,57,70,0.1);color:var(--danger);font-weight:700;border-radius:var(--border-radius);border:none;cursor:pointer;font-family:var(--font);font-size:0.88rem;transition:var(--transition);" onmouseover="this.style.background='rgba(230,57,70,0.2)'" onmouseout="this.style.background='rgba(230,57,70,0.1)'">
              💥 Delete ALL Data
            </button>
          </div>

          <div style="padding:14px;background:rgba(244,140,6,0.06);border-radius:10px;border:1px solid rgba(244,140,6,0.15);">
            <p style="font-size:0.8rem;color:var(--text);margin:0;line-height:1.5;">
              ⚠️ <strong>Delete Selected</strong> removes only checked items. <strong>Delete ALL</strong> wipes everything except admin account. Export your data first as backup. This action cannot be undone.
            </p>
          </div>
        </div>
      </div>`;

    document.getElementById('settingsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.changePassword(admin.id);
    });
  },

  changePassword(adminId) {
    const current = document.getElementById('currentPass').value;
    const newPass = document.getElementById('newPass').value;
    const confirm = document.getElementById('confirmPass').value;

    const admin = DB.getById('admins', adminId);
    if (admin.password !== current) {
      App.showToast('Current password is incorrect', 'error');
      return;
    }
    if (newPass !== confirm) {
      App.showToast('New passwords do not match', 'error');
      return;
    }
    if (newPass.length < 6) {
      App.showToast('Password must be at least 6 characters', 'error');
      return;
    }

    DB.update('admins', adminId, { password: newPass });
    App.showToast('Password updated successfully!', 'success');
    document.getElementById('settingsForm').reset();
  },

  saveUpiId() {
    const upi = document.getElementById('adminUpi').value.trim();
    DB.saveSetting('upiId', upi);
    App.showToast(upi ? 'UPI ID saved — Online payment enabled' : 'UPI ID cleared — Only COD available', 'success');
  },

  toggleBannerSwipe(enabled) {
    DB.saveSetting('bannerSwipe', enabled);
    App.showToast(enabled ? 'Banner auto-swipe enabled' : 'Banner auto-swipe disabled — banners fixed in grid', 'success');
  },

  saveContactInfo() {
    DB.saveSetting('contactStoreName', document.getElementById('contactStoreName').value.trim());
    DB.saveSetting('contactAddress', document.getElementById('contactAddress').value.trim());
    DB.saveSetting('contactPhone', document.getElementById('contactPhone').value.trim());
    DB.saveSetting('contactEmail', document.getElementById('contactEmail').value.trim());
    DB.saveSetting('contactSupportEmail', document.getElementById('contactSupportEmail').value.trim());
    DB.saveSetting('contactWeekdayHours', document.getElementById('contactWeekdayHours').value.trim());
    DB.saveSetting('contactSundayHours', document.getElementById('contactSundayHours').value.trim());
    App.showToast('Contact info saved! Public pages will update instantly.', 'success');
  },

  exportData() {
    const data = DB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aravali_store_data.json';
    a.click();
    URL.revokeObjectURL(url);
    App.showToast('Data exported successfully!', 'success');
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        DB.importAll(data);
        App.showToast('Data imported successfully! Refreshing...', 'success');
        setTimeout(() => location.reload(), 1000);
      } catch {
        App.showToast('Invalid JSON file', 'error');
      }
    };
    reader.readAsText(file);
  },

  // Banners
  renderBanners() {
    const main = document.querySelector('.admin-content');
    if (!main) return;
    const banners = DB.getAll('banners').sort((a, b) => (a.order || 0) - (b.order || 0));

    main.innerHTML = `
      <div class="admin-table-wrapper">
        <div class="admin-table-header">
          <h3>Banners & Promotions (${banners.length})</h3>
          <button class="btn btn-primary btn-sm" onclick="Admin.showAddBanner()">+ Add Banner</button>
        </div>
        <table class="admin-table">
          <thead>
            <tr><th>Preview</th><th>Title</th><th>Subtitle</th><th>Link</th><th>Status</th><th>Order</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${banners.length === 0
              ? '<tr><td colspan="7" style="text-align:center;padding:40px;">No banners yet.</td></tr>'
              : banners.map(b => `
                <tr>
                  <td>
                    <div style="width:120px;height:60px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.75rem;background:${b.gradient};overflow:hidden;">
                      ${b.image ? `<img src="${b.image}" style="width:100%;height:100%;object-fit:cover;">` : b.title}
                    </div>
                  </td>
                  <td style="font-weight:600;">${b.title}</td>
                  <td style="font-size:0.82rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${b.subtitle}</td>
                  <td style="font-size:0.82rem;">${b.link}</td>
                  <td><span style="color:${b.active ? 'var(--success)' : 'var(--danger)'};font-weight:600;">${b.active ? 'Active' : 'Hidden'}</span></td>
                  <td>${b.order || '-'}</td>
                  <td>
                    <div class="action-btns">
                      <button class="action-btn edit" onclick="Admin.editBanner('${b.id}')">Edit</button>
                      <button class="action-btn delete" onclick="Admin.deleteBanner('${b.id}')">Delete</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
      <div id="productModal" class="modal-overlay" onclick="if(event.target===this)this.classList.remove('active')">
        <div class="modal" id="productModalContent"></div>
      </div>`;
  },

  showAddBanner() {
    const modal = document.getElementById('productModal');
    const content = document.getElementById('productModalContent');
    content.innerHTML = `
      <button class="modal-close" onclick="Admin.closeModal()">✕</button>
      <h2>Add Banner</h2>
      <form onsubmit="Admin.saveBanner(event)">
        <div class="form-group">
          <label>Banner Image (optional, overrides gradient)</label>
          <input type="file" id="bImage" accept="image/*" style="margin-bottom:8px;">
          <img id="bImagePreview" src="" style="max-height:80px;border-radius:8px;display:none;">
        </div>
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="bTitle" required placeholder="e.g. Fresh Fruits">
        </div>
        <div class="form-group">
          <label>Subtitle</label>
          <input type="text" id="bSubtitle" required placeholder="e.g. 20% off on all fruits">
        </div>
        <div class="form-group">
          <label>Link</label>
          <input type="text" id="bLink" placeholder="e.g. shop.html?cat=Fruits" required>
        </div>
        <div class="form-group">
          <label>Gradient</label>
          <select id="bGradient">
            <option value="linear-gradient(135deg, #2d6a4f, #40916c)">Green</option>
            <option value="linear-gradient(135deg, #f48c06, #f4a261)">Orange</option>
            <option value="linear-gradient(135deg, #40916c, #74c69d)">Light Green</option>
            <option value="linear-gradient(135deg, #1b4332, #2d6a4f)">Dark Green</option>
            <option value="linear-gradient(135deg, #0077b6, #00b4d8)">Blue</option>
            <option value="linear-gradient(135deg, #e63946, #f4a261)">Red-Orange</option>
          </select>
        </div>
        <div class="form-group">
          <label>Display Order</label>
          <input type="number" id="bOrder" min="1" value="1">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="bActive" checked> Active (visible on site)
          </label>
        </div>
        <input type="hidden" id="bEditId" value="">
        <input type="hidden" id="bExistingImage" value="">
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;">Save Banner</button>
      </form>`;
    modal.classList.add('active');
    App.handleImageUpload('bImage', 'bImagePreview', 500);
  },

  editBanner(id) {
    const banner = DB.getById('banners', id);
    if (!banner) return;
    this.showAddBanner();
    document.getElementById('productModalContent').querySelector('h2').textContent = 'Edit Banner';
    document.getElementById('bTitle').value = banner.title;
    document.getElementById('bSubtitle').value = banner.subtitle;
    document.getElementById('bLink').value = banner.link;
    document.getElementById('bGradient').value = banner.gradient;
    document.getElementById('bOrder').value = banner.order || 1;
    document.getElementById('bActive').checked = banner.active;
    document.getElementById('bEditId').value = id;
    document.getElementById('bExistingImage').value = banner.image || '';
    if (banner.image) {
      const preview = document.getElementById('bImagePreview');
      preview.src = banner.image;
      preview.style.display = 'block';
    }
  },

  saveBanner(e) {
    e.preventDefault();
    const editId = document.getElementById('bEditId').value;
    const imageData = App.getImageData('bImage');
    const existingImage = document.getElementById('bExistingImage').value;
    const data = {
      title: document.getElementById('bTitle').value.trim(),
      subtitle: document.getElementById('bSubtitle').value.trim(),
      link: document.getElementById('bLink').value.trim(),
      gradient: document.getElementById('bGradient').value,
      order: parseInt(document.getElementById('bOrder').value) || 1,
      active: document.getElementById('bActive').checked,
      image: imageData || existingImage || ''
    };
    if (editId) {
      DB.update('banners', editId, data);
      App.showToast('Banner updated!', 'success');
    } else {
      DB.insert('banners', data);
      App.showToast('Banner added!', 'success');
    }
    this.closeModal();
    this.renderBanners();
  },

  deleteBanner(id) {
    if (confirm('Delete this banner?')) {
      DB.delete('banners', id);
      App.showToast('Banner deleted', 'info');
      this.renderBanners();
    }
  },

  // Catalogs
  renderCatalogs() {
    const main = document.querySelector('.admin-content');
    if (!main) return;
    const catalogs = DB.getAll('catalogs').sort((a, b) => (a.order || 0) - (b.order || 0));

    main.innerHTML = `
      <div class="admin-table-wrapper">
        <div class="admin-table-header">
          <h3>Catalogs / Categories (${catalogs.length})</h3>
          <button class="btn btn-primary btn-sm" onclick="Admin.showAddCatalog()">+ Add Catalog</button>
        </div>
        <table class="admin-table">
          <thead>
            <tr><th>Icon/Image</th><th>Name</th><th>Description</th><th>Status</th><th>Order</th><th>Products</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${catalogs.length === 0
              ? '<tr><td colspan="7" style="text-align:center;padding:40px;">No catalogs yet.</td></tr>'
              : catalogs.map(c => {
                  const productCount = DB.getAll('products').filter(p => p.category === c.name).length;
                  return `
                    <tr>
                      <td style="font-size:2rem;text-align:center;">
                        ${c.image ? `<img src="${c.image}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;">` : `<div style="width:40px;height:40px;border-radius:8px;background:rgba(45,106,79,0.08);display:flex;align-items:center;justify-content:center;font-size:0.65rem;color:var(--text-muted);">No Img</div>`}
                      </td>
                      <td style="font-weight:600;">${c.name}</td>
                      <td style="font-size:0.82rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.description}</td>
                      <td><span style="color:${c.active ? 'var(--success)' : 'var(--danger)'};font-weight:600;">${c.active ? 'Active' : 'Hidden'}</span></td>
                      <td>${c.order || '-'}</td>
                      <td>${productCount}</td>
                      <td>
                        <div class="action-btns">
                          <button class="action-btn edit" onclick="Admin.editCatalog('${c.id}')">Edit</button>
                          <button class="action-btn delete" onclick="Admin.deleteCatalog('${c.id}')">Delete</button>
                        </div>
                      </td>
                    </tr>`;
                }).join('')}
          </tbody>
        </table>
      </div>
      <div id="productModal" class="modal-overlay" onclick="if(event.target===this)this.classList.remove('active')">
        <div class="modal" id="productModalContent"></div>
      </div>`;
  },

  showAddCatalog() {
    const modal = document.getElementById('productModal');
    const content = document.getElementById('productModalContent');
    content.innerHTML = `
      <button class="modal-close" onclick="Admin.closeModal()">✕</button>
      <h2>Add Catalog / Category</h2>
      <form onsubmit="Admin.saveCatalog(event)">
        <div class="form-group">
          <label>Catalog Image (optional, overrides emoji)</label>
          <input type="file" id="cImage" accept="image/*" style="margin-bottom:8px;">
          <img id="cImagePreview" src="" style="max-height:80px;border-radius:8px;display:none;">
        </div>
        <div class="form-group">
          <label>Category Name</label>
          <input type="text" id="cName" required placeholder="e.g. Dairy, Fruits">
        </div>
        <div class="form-group">
          <label>Emoji</label>
          <input type="text" id="cEmoji" placeholder="e.g. 🥛" maxlength="4">
        </div>
        <div class="form-group">
          <label>Description</label>
          <input type="text" id="cDesc" placeholder="Short description">
        </div>
        <div class="form-group">
          <label>Display Order</label>
          <input type="number" id="cOrder" min="1" value="1">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="cActive" checked> Active (visible on site)
          </label>
        </div>
        <input type="hidden" id="cEditId" value="">
        <input type="hidden" id="cExistingImage" value="">
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;">Save Catalog</button>
      </form>`;
    modal.classList.add('active');
    App.handleImageUpload('cImage', 'cImagePreview', 300);
  },

  editCatalog(id) {
    const catalog = DB.getById('catalogs', id);
    if (!catalog) return;
    this.showAddCatalog();
    document.getElementById('productModalContent').querySelector('h2').textContent = 'Edit Catalog';
    document.getElementById('cName').value = catalog.name;
    document.getElementById('cEmoji').value = catalog.emoji || '';
    document.getElementById('cDesc').value = catalog.description || '';
    document.getElementById('cOrder').value = catalog.order || 1;
    document.getElementById('cActive').checked = catalog.active;
    document.getElementById('cEditId').value = id;
    document.getElementById('cExistingImage').value = catalog.image || '';
    if (catalog.image) {
      const preview = document.getElementById('cImagePreview');
      preview.src = catalog.image;
      preview.style.display = 'block';
    }
  },

  saveCatalog(e) {
    e.preventDefault();
    const editId = document.getElementById('cEditId').value;
    const imageData = App.getImageData('cImage');
    const existingImage = document.getElementById('cExistingImage').value;
    const data = {
      name: document.getElementById('cName').value.trim(),
      emoji: document.getElementById('cEmoji').value.trim() || '📦',
      description: document.getElementById('cDesc').value.trim(),
      order: parseInt(document.getElementById('cOrder').value) || 1,
      active: document.getElementById('cActive').checked,
      image: imageData || existingImage || ''
    };
    if (editId) {
      DB.update('catalogs', editId, data);
      App.showToast('Catalog updated!', 'success');
    } else {
      DB.insert('catalogs', data);
      App.showToast('Catalog added!', 'success');
    }
    this.closeModal();
    this.renderCatalogs();
  },

  deleteCatalog(id) {
    if (confirm('Delete this catalog? Products in this category will not be deleted.')) {
      DB.delete('catalogs', id);
      App.showToast('Catalog deleted', 'info');
      this.renderCatalogs();
    }
  },

  // Stock Management
  adjustStock(productId, delta) {
    const product = DB.getById('products', productId);
    if (!product) return;
    const newStock = Math.max(0, (product.stock || 0) + delta);
    DB.update('products', productId, { stock: newStock });
    DB.logStockChange(productId, product.name, delta, delta > 0 ? 'Admin restock' : 'Admin adjustment');
    App.showToast(`${product.name}: stock ${delta > 0 ? 'increased' : 'decreased'} to ${newStock}`, delta > 0 ? 'success' : 'info');
    if (this.currentPage === 'products') {
      this.renderProducts();
    } else if (this.currentPage === 'dashboard') {
      this.renderDashboard();
    }
  },

  setStock(productId, newStockVal) {
    const product = DB.getById('products', productId);
    if (!product) return;
    const newStock = Math.max(0, parseInt(newStockVal) || 0);
    const oldStock = product.stock || 0;
    const change = newStock - oldStock;
    DB.update('products', productId, { stock: newStock });
    if (change !== 0) {
      DB.logStockChange(productId, product.name, change, 'Admin manual set');
    }
    App.showToast(`${product.name}: stock set to ${newStock}`, 'success');
    if (this.currentPage === 'products') {
      this.renderProducts();
    } else if (this.currentPage === 'dashboard') {
      this.renderDashboard();
    }
  },

  quickRestock(productId) {
    const product = DB.getById('products', productId);
    if (!product) return;
    const qty = prompt(`Restock "${product.name}"\nCurrent stock: ${product.stock}\nEnter quantity to add:`, '10');
    if (qty === null || qty === '') return;
    const num = parseInt(qty);
    if (isNaN(num) || num <= 0) {
      App.showToast('Invalid quantity', 'error');
      return;
    }
    DB.updateStock(productId, num);
    DB.logStockChange(productId, product.name, num, 'Quick restock');
    App.showToast(`${product.name}: +${num} units added (now ${(product.stock || 0) + num})`, 'success');
    if (this.currentPage === 'products') {
      this.renderProducts();
    } else {
      this.renderDashboard();
    }
  },

  showStockHistory() {
    const modal = document.getElementById('productModal');
    const content = document.getElementById('productModalContent');
    const logs = DB.getAll('stock_logs').slice(0, 50);

    content.innerHTML = `
      <button class="modal-close" onclick="Admin.closeModal()">✕</button>
      <h2>Stock Change History</h2>
      ${logs.length === 0
        ? '<p style="color:var(--text-muted);padding:20px 0;">No stock changes recorded yet.</p>'
        : `<div style="max-height:400px;overflow-y:auto;">
            ${logs.map(log => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(45,106,79,0.06);">
                <div>
                  <div style="font-weight:600;font-size:0.88rem;">${log.productName}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);">${log.reason} • ${App.formatDate(log.timestamp)}</div>
                </div>
                <span style="font-weight:700;font-size:0.9rem;color:${log.change > 0 ? 'var(--success)' : 'var(--danger)'};">
                  ${log.change > 0 ? '+' : ''}${log.change}
                </span>
              </div>
            `).join('')}
          </div>`
      }`;
    modal.classList.add('active');
  },

  renderDataCheckboxes() {
    const tables = [
      { key: 'orders', label: 'Orders', icon: '🛒', color: 'var(--accent)' },
      { key: 'returns', label: 'Returns', icon: '🔄', color: '#ff9800' },
      { key: 'users', label: 'Users', icon: '👥', color: 'var(--primary)' },
      { key: 'products', label: 'Products', icon: '📦', color: 'var(--secondary)' },
      { key: 'banners', label: 'Banners', icon: '🖼️', color: '#0077b6' },
      { key: 'catalogs', label: 'Catalogs', icon: '📂', color: '#9b5de5' },
      { key: 'stock_logs', label: 'Stock Logs', icon: '📋', color: '#8d99ae' }
    ];
    return tables.map((t, i) => {
      const count = DB.getAll(t.key).length;
      const isLast = i === tables.length - 1;
      return `<label class="data-row" style="display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;user-select:none;transition:background 0.15s;${!isLast ? 'border-bottom:1px solid rgba(45,106,79,0.06);' : ''}" onmouseover="this.style.background='rgba(45,106,79,0.04)'" onmouseout="this.style.background='transparent'">
        <input type="checkbox" class="data-checkbox" value="${t.key}" style="width:18px;height:18px;accent-color:var(--primary);" onchange="Admin.onCheckboxChange()">
        <span style="font-size:1.1rem;width:28px;text-align:center;">${t.icon}</span>
        <span style="font-weight:600;font-size:0.88rem;flex:1;">${t.label}</span>
        <span style="font-size:0.75rem;color:white;padding:2px 10px;border-radius:20px;background:${t.color};font-weight:600;">${count}</span>
      </label>`;
    }).join('');
  },

  toggleSelectAll(checked) {
    document.querySelectorAll('.data-checkbox').forEach(cb => {
      cb.checked = checked;
    });
  },

  onCheckboxChange() {
    const checkboxes = document.querySelectorAll('.data-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const selectAll = document.getElementById('selectAllData');
    if (selectAll) selectAll.checked = allChecked;
  },

  deleteSelectedData() {
    const checked = document.querySelectorAll('.data-checkbox:checked');
    if (checked.length === 0) {
      App.showToast('Please select at least one data type to delete', 'error');
      return;
    }
    const selected = Array.from(checked).map(cb => cb.value);
    const labels = selected.map(s => {
      const count = DB.getAll(s).length;
      return `${s} (${count})`;
    }).join(', ');
    if (!confirm(`⚠️ Are you sure you want to delete:\n\n${labels}?\n\nThis cannot be undone.`)) return;

    selected.forEach(table => {
      DB.clearTable(table);
    });
    App.showToast(`Deleted ${selected.length} data type(s) successfully`, 'success');
    this.initSettings();
  },

  deleteAllData() {
    if (!confirm('⚠️ DANGER ZONE ⚠️\n\nThis will DELETE ALL data:\n• Orders\n• Users\n• Products\n• Banners\n• Catalogs\n• Stock Logs\n• Settings\n\nOnly admin account will be kept.\n\nThis CANNOT be undone. Are you absolutely sure?')) return;
    if (!confirm('Last chance! Type OK to confirm deletion of ALL data.')) return;

    DB.clearAllData();
    App.showToast('All data deleted. Re-seeding products and catalogs...', 'success');
    setTimeout(() => location.reload(), 1200);
  },

  // Offer Management
  OFFER_CATEGORIES: [
    { id: 'today', label: "🔥 Today's Deals", gradient: 'linear-gradient(135deg, #ff6b6b, #ee5a24)', offerTag: "🔥 Today's Deals" },
    { id: 'flash', label: '⚡ Flash Sale', gradient: 'linear-gradient(135deg, #f9ca24, #f0932b)', offerTag: '⚡ Flash Sale' },
    { id: 'half', label: '💸 Up to 50% OFF', gradient: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', offerTag: '💸 Up to 50% OFF' },
    { id: 'bogo', label: '🛍️ Buy 1 Get 1 Free', gradient: 'linear-gradient(135deg, #fd79a8, #e84393)', offerTag: '🛍️ Buy 1 Get 1 Free' },
    { id: 'combo', label: '🎁 Combo Packs', gradient: 'linear-gradient(135deg, #00b894, #55efc4)', offerTag: '🎁 Combo Packs' },
    { id: 'fresh', label: '🥦 Fresh Produce Deals', gradient: 'linear-gradient(135deg, #00b894, #00cec9)', offerTag: '🥦 Fresh Produce Deals' },
    { id: 'dairy', label: '🥛 Dairy Specials', gradient: 'linear-gradient(135deg, #74b9ff, #0984e3)', offerTag: '🥛 Dairy Specials' },
    { id: 'snack', label: '🍿 Snack Offers', gradient: 'linear-gradient(135deg, #ffeaa7, #fdcb6e)', offerTag: '🍿 Snack Offers' },
    { id: 'personal', label: '🧴 Personal Care Discounts', gradient: 'linear-gradient(135deg, #dfe6e9, #b2bec3)', offerTag: '🧴 Personal Care Discounts' },
    { id: 'household', label: '🧹 Household Essentials Sale', gradient: 'linear-gradient(135deg, #a29bfe, #6c5ce7)', offerTag: '🧹 Household Essentials Sale' },
    { id: 'new', label: '🆕 New Arrival Offers', gradient: 'linear-gradient(135deg, #55efc4, #00b894)', offerTag: '🆕 New Arrival Offers' },
    { id: 'bestvalue', label: '⭐ Best Value Deals', gradient: 'linear-gradient(135deg, #ffeaa7, #f9ca24)', offerTag: '⭐ Best Value Deals' },
    { id: 'festival', label: '🎉 Festival Offers', gradient: 'linear-gradient(135deg, #fd79a8, #e84393)', offerTag: '🎉 Festival Offers' },
    { id: 'bank', label: '💳 Bank & Wallet Offers', gradient: 'linear-gradient(135deg, #636e72, #2d3436)', offerTag: '💳 Bank & Wallet Offers' },
    { id: 'delivery', label: '🚚 Free Delivery on ₹499+', gradient: 'linear-gradient(135deg, #00cec9, #0984e3)', offerTag: '🚚 Free Delivery on ₹499+' }
  ],

  renderOffers() {
    const main = document.querySelector('.admin-content');
    if (!main) return;

    const products = DB.getAll('products');
    const totalWithOffer = products.filter(p => p.offer).length;

    let html = `
      <div style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <h3 style="margin:0;color:var(--primary-dark);">Offer Categories</h3>
          <p style="margin:4px 0 0;font-size:0.82rem;color:var(--text-muted);">${totalWithOffer} product${totalWithOffer !== 1 ? 's' : ''} assigned across ${this.OFFER_CATEGORIES.length} categories</p>
        </div>
        <button class="btn btn-primary" style="padding:8px 20px;font-size:0.85rem;" onclick="Admin.showBulkOfferAssign()">📦 Bulk Assign Products</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:24px;">`;

    this.OFFER_CATEGORIES.forEach(cat => {
      const catProducts = products.filter(p => p.offer === cat.offerTag);
      html += `
        <div onclick="Admin.showOfferCategory('${cat.id}')" style="background:rgba(255,255,255,0.55);backdrop-filter:blur(8px);border:2px solid rgba(45,106,79,0.06);border-radius:14px;padding:18px;cursor:pointer;transition:all 0.25s;position:relative;overflow:hidden;"
          onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(45,106,79,0.12)'"
          onmouseout="this.style.transform='';this.style.boxShadow=''">
          <div style="width:52px;height:52px;border-radius:14px;background:${cat.gradient};display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:10px;">${cat.label.split(' ')[0]}</div>
          <div style="font-weight:700;font-size:0.9rem;color:var(--text);margin-bottom:4px;">${cat.label.split(' ').slice(1).join(' ')}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);">${catProducts.length} product${catProducts.length !== 1 ? 's' : ''}</div>
          ${catProducts.length > 0 ? `<div style="position:absolute;top:12px;right:12px;width:28px;height:28px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">${catProducts.length}</div>` : ''}
        </div>`;
    });

    html += `</div>`;
    main.innerHTML = html;
  },

  showOfferCategory(categoryId) {
    const cat = this.OFFER_CATEGORIES.find(c => c.id === categoryId);
    if (!cat) return;
    const products = DB.getAll('products');
    const catProducts = products.filter(p => p.offer === cat.offerTag);
    const allProducts = products.filter(p => !p.offer);

    const modal = document.getElementById('productModal');
    const content = document.getElementById('productModalContent');
    if (!modal || !content) return;

    content.innerHTML = `
      <button class="modal-close" onclick="Admin.closeModal()">✕</button>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
        <div style="width:50px;height:50px;border-radius:14px;background:${cat.gradient};display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">${cat.label.split(' ')[0]}</div>
        <div>
          <h2 style="margin:0;font-size:1.15rem;">${cat.label}</h2>
          <p style="margin:2px 0 0;font-size:0.82rem;color:var(--text-muted);">${catProducts.length} product${catProducts.length !== 1 ? 's' : ''} assigned</p>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <h4 style="margin:0 0 8px;font-size:0.88rem;color:var(--primary-dark);">Assign Products</h4>
        <div style="display:flex;gap:8px;">
          <select id="offerProductSelect" style="flex:1;padding:10px 14px;border:1px solid rgba(45,106,79,0.15);border-radius:10px;font-family:var(--font);font-size:0.88rem;">
            <option value="">Select a product to add...</option>
            ${allProducts.map(p => `<option value="${p.id}">${p.name} (${p.category}) — ₹${p.price}</option>`).join('')}
          </select>
          <button class="btn btn-primary" style="padding:10px 20px;white-space:nowrap;" onclick="Admin.assignProductToOffer('${categoryId}')">Add</button>
        </div>
      </div>

      <div style="border-top:1px solid rgba(45,106,79,0.08);padding-top:14px;">
        <h4 style="margin:0 0 10px;font-size:0.88rem;color:var(--primary-dark);">Assigned Products (${catProducts.length})</h4>
        ${catProducts.length === 0 ? '<p style="color:var(--text-muted);font-size:0.85rem;padding:16px 0;text-align:center;">No products assigned to this offer yet.</p>' : `
        <div style="max-height:300px;overflow-y:auto;">
          ${catProducts.map(p => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;margin-bottom:6px;background:rgba(82,183,136,0.04);border:1px solid rgba(45,106,79,0.06);">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:38px;height:38px;border-radius:8px;overflow:hidden;background:rgba(45,106,79,0.06);flex-shrink:0;">
                  ${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--text-muted);">📦</div>`}
                </div>
                <div>
                  <div style="font-weight:600;font-size:0.85rem;">${p.name}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);">${p.category} • ₹${p.price}</div>
                </div>
              </div>
              <button onclick="Admin.removeProductFromOffer('${p.id}')" style="width:30px;height:30px;border-radius:8px;border:1px solid rgba(244,67,54,0.15);background:rgba(244,67,54,0.06);color:var(--danger);cursor:pointer;font-size:0.85rem;display:flex;align-items:center;justify-content:center;transition:0.15s;"
                onmouseover="this.style.background='rgba(244,67,54,0.15)'" onmouseout="this.style.background='rgba(244,67,54,0.06)'">✕</button>
            </div>
          `).join('')}
        </div>`}
      </div>`;

    modal.classList.add('active');
  },

  assignProductToOffer(categoryId) {
    const cat = this.OFFER_CATEGORIES.find(c => c.id === categoryId);
    if (!cat) return;
    const select = document.getElementById('offerProductSelect');
    const productId = select ? select.value : '';
    if (!productId) {
      App.showToast('Please select a product', 'error');
      return;
    }
    DB.update('products', productId, { offer: cat.offerTag });
    App.showToast('Product added to offer!', 'success');
    this.showOfferCategory(categoryId);
    this.renderOffers();
  },

  removeProductFromOffer(productId) {
    DB.update('products', productId, { offer: '' });
    App.showToast('Product removed from offer', 'info');
    // Re-open the modal by re-rendering current category
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('active');
    this.renderOffers();
  },

  showBulkOfferAssign() {
    const products = DB.getAll('products');
    const categories = this.OFFER_CATEGORIES;

    const modal = document.getElementById('productModal');
    const content = document.getElementById('productModalContent');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="bulk-assign-modal">
        <div class="bulk-assign-header">
          <div>
            <h2>Bulk Assign Products to Offers</h2>
            <p>Select products and assign them to an offer category in one go.</p>
          </div>
          <button class="modal-close" onclick="Admin.closeModal()">✕</button>
        </div>

        <div class="bulk-assign-controls">
          <div class="modal-search-bar">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="bulkOfferSearch" placeholder="Search by name or category..." oninput="Admin.filterBulkProducts(this.value)">
            <button class="search-clear" onclick="document.getElementById('bulkOfferSearch').value='';Admin.filterBulkProducts('');" title="Clear search" style="display:none;" id="bulkSearchClear">✕</button>
          </div>
          <select id="bulkOfferCategory" class="modal-select">
            <option value="">Select offer category...</option>
            ${categories.map(c => `<option value="${c.offerTag}">${c.label}</option>`).join('')}
          </select>
        </div>

        <div class="bulk-assign-selectall">
          <input type="checkbox" id="bulkSelectAll" onchange="Admin.toggleBulkSelectAll(this.checked)">
          <span>Select All (${products.length} products)</span>
        </div>

        <div class="bulk-assign-divider"></div>

        <div id="bulkProductList" class="bulk-assign-list">
          ${this.renderBulkProductRows(products)}
        </div>

        <div class="bulk-assign-divider"></div>

        <div class="bulk-assign-footer">
          <button class="btn" onclick="Admin.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="Admin.applyBulkOffer()">✅ Assign Selected</button>
        </div>
      </div>`;

    modal.classList.add('active');
    const modalBox = modal.querySelector('.modal');
    if (modalBox) modalBox.classList.add('bulk-assign');
    document.body.classList.add('modal-open');
  },

  renderBulkProductRows(products) {
    return products.map(p => `
      <label class="bulk-product-row">
        <input type="checkbox" class="bulk-product-cb" value="${p.id}">
        <div class="bulk-product-thumb">
          ${p.image ? `<img src="${p.image}">` : `<span>📦</span>`}
        </div>
        <div class="bulk-product-info">
          <div class="bulk-product-name">${p.name}</div>
          <div class="bulk-product-meta">${p.category} • ₹${p.price}</div>
        </div>
        ${p.offer ? `<span class="bulk-product-badge">${p.offer.split(' ').slice(1).join(' ')}</span>` : ''}
      </label>
    `).join('');
  },

  filterBulkProducts(term) {
    const products = DB.getAll('products');
    const t = term.toLowerCase();
    const filtered = t ? products.filter(p => p.name.toLowerCase().includes(t) || p.category.toLowerCase().includes(t)) : products;
    document.getElementById('bulkProductList').innerHTML = this.renderBulkProductRows(filtered);
    const clearBtn = document.getElementById('bulkSearchClear');
    if (clearBtn) clearBtn.style.display = term ? 'flex' : 'none';
  },

  toggleBulkSelectAll(checked) {
    document.querySelectorAll('.bulk-product-cb').forEach(cb => cb.checked = checked);
  },

  applyBulkOffer() {
    const category = document.getElementById('bulkOfferCategory').value;
    if (!category) {
      App.showToast('Please select an offer category', 'error');
      return;
    }
    const checked = document.querySelectorAll('.bulk-product-cb:checked');
    if (checked.length === 0) {
      App.showToast('Please select at least one product', 'error');
      return;
    }
    const ids = Array.from(checked).map(cb => cb.value);
    ids.forEach(id => DB.update('products', id, { offer: category }));
    App.showToast(`${ids.length} product${ids.length > 1 ? 's' : ''} assigned to ${category}!`, 'success');
    this.closeModal();
    this.renderOffers();
  },

  // Returns & Refunds
  renderReturns(filterStatus) {
    const main = document.querySelector('.admin-content');
    if (!main) return;

    const allReturns = DB.getAll('returns').reverse();
    const statusCounts = { all: allReturns.length, pending: 0, approved: 0, rejected: 0, refunded: 0 };
    allReturns.forEach(r => {
      if (statusCounts[r.status] !== undefined) statusCounts[r.status]++;
    });

    const activeTab = filterStatus || 'all';
    const filtered = activeTab === 'all' ? allReturns : allReturns.filter(r => r.status === activeTab);

    main.innerHTML = `
      <div class="admin-table-wrapper">
        <div class="admin-table-header">
          <h3>Returns & Refunds</h3>
          <input type="text" class="search-input" placeholder="Search by order ID, customer, reason..." oninput="Admin.filterReturns(this.value)">
        </div>

        <div style="display:flex;gap:6px;padding:0 0 16px;flex-wrap:wrap;">
          <button onclick="Admin.renderReturns('all')" style="padding:7px 16px;border-radius:20px;border:none;cursor:pointer;font-family:var(--font);font-size:0.8rem;font-weight:600;transition:0.2s;${activeTab==='all'?'background:var(--primary);color:white;':'background:rgba(45,106,79,0.06);color:var(--text-light);'}">All <span style="margin-left:4px;">${statusCounts.all}</span></button>
          <button onclick="Admin.renderReturns('pending')" style="padding:7px 16px;border-radius:20px;border:none;cursor:pointer;font-family:var(--font);font-size:0.8rem;font-weight:600;transition:0.2s;${activeTab==='pending'?'background:#ff9800;color:white;':'background:rgba(255,152,0,0.08);color:#e67e22;'}">⏳ Pending <span style="margin-left:4px;">${statusCounts.pending}</span></button>
          <button onclick="Admin.renderReturns('approved')" style="padding:7px 16px;border-radius:20px;border:none;cursor:pointer;font-family:var(--font);font-size:0.8rem;font-weight:600;transition:0.2s;${activeTab==='approved'?'background:#2196f3;color:white;':'background:rgba(33,150,243,0.08);color:#2196f3;'}">✅ Approved <span style="margin-left:4px;">${statusCounts.approved}</span></button>
          <button onclick="Admin.renderReturns('rejected')" style="padding:7px 16px;border-radius:20px;border:none;cursor:pointer;font-family:var(--font);font-size:0.8rem;font-weight:600;transition:0.2s;${activeTab==='rejected'?'background:#f44336;color:white;':'background:rgba(244,67,54,0.08);color:#f44336;'}">❌ Rejected <span style="margin-left:4px;">${statusCounts.rejected}</span></button>
          <button onclick="Admin.renderReturns('refunded')" style="padding:7px 16px;border-radius:20px;border:none;cursor:pointer;font-family:var(--font);font-size:0.8rem;font-weight:600;transition:0.2s;${activeTab==='refunded'?'background:#9c27b0;color:white;':'background:rgba(156,39,176,0.08);color:#9c27b0;'}">💰 Refunded <span style="margin-left:4px;">${statusCounts.refunded}</span></button>
        </div>

        ${activeTab === 'pending' && filtered.length > 0 ? `
        <div style="background:linear-gradient(135deg,rgba(255,152,0,0.08),rgba(255,183,77,0.06));border:1px solid rgba(255,152,0,0.2);border-radius:12px;padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.3rem;">🔄</span>
          <div>
            <p style="margin:0;font-weight:700;color:#e67e22;font-size:0.9rem;">${filtered.length} return request${filtered.length > 1 ? 's' : ''} awaiting review</p>
            <p style="margin:2px 0 0;font-size:0.78rem;color:#b7791f;">Approve or reject these requests to process customer refunds.</p>
          </div>
        </div>` : ''}

        <table class="admin-table">
          <thead>
            <tr>
              <th>Return ID</th>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Item</th>
              <th>Reason</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="returnsTableBody">
            ${this.renderReturnRows(filtered)}
          </tbody>
        </table>
      </div>`;
  },

  renderReturnRows(returns) {
    if (returns.length === 0) {
      return '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted);"><div style="font-size:2rem;margin-bottom:8px;">📦</div>No return requests yet.</td></tr>';
    }
    const statusColors = { pending: '#ff9800', approved: '#2196f3', rejected: '#f44336', refunded: '#9c27b0' };
    return returns.map(r => `
      <tr>
        <td style="font-weight:600;">#${r.id.slice(-6).toUpperCase()}</td>
        <td style="font-weight:600;color:var(--primary);">#${(r.orderId || '').slice(-6).toUpperCase()}</td>
        <td style="font-size:0.85rem;">${r.customerName || 'Guest'}</td>
        <td style="font-size:0.85rem;">${r.productName || 'N/A'} ${r.qty > 1 ? '× ' + r.qty : ''}</td>
        <td style="font-size:0.78rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.reason}">${r.reason || 'N/A'}</td>
        <td style="font-weight:700;color:var(--danger);">${App.formatCurrency(r.refundAmount || 0)}</td>
        <td><span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;background:${statusColors[r.status] || '#999'}20;color:${statusColors[r.status] || '#999'};">${r.status}</span></td>
        <td style="font-size:0.82rem;">${App.formatDate(r.createdAt)}</td>
        <td>
          <div class="action-btns">
            ${r.status === 'pending' ? `
              <button class="action-btn view" onclick="Admin.approveReturn('${r.id}')" style="background:rgba(76,175,80,0.1);color:#4caf50;">Approve</button>
              <button class="action-btn delete" onclick="Admin.rejectReturn('${r.id}')" style="background:rgba(244,67,54,0.1);color:#f44336;">Reject</button>
            ` : ''}
            ${r.status === 'approved' ? `
              <button class="action-btn view" onclick="Admin.processRefund('${r.id}')" style="background:rgba(156,39,176,0.1);color:#9c27b0;">Refund</button>
            ` : ''}
            <button class="action-btn view" onclick="Admin.viewReturn('${r.id}')">View</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  filterReturns(term) {
    let returns = DB.getAll('returns').reverse();
    if (term) {
      const t = term.toLowerCase();
      returns = returns.filter(r =>
        r.id.toLowerCase().includes(t) ||
        (r.orderId && r.orderId.toLowerCase().includes(t)) ||
        (r.customerName && r.customerName.toLowerCase().includes(t)) ||
        (r.productName && r.productName.toLowerCase().includes(t)) ||
        (r.reason && r.reason.toLowerCase().includes(t))
      );
    }
    document.getElementById('returnsTableBody').innerHTML = this.renderReturnRows(returns);
  },

  approveReturn(returnId) {
    if (!confirm('Approve this return request? The order status will be updated.')) return;
    const ret = DB.getById('returns', returnId);
    if (!ret) return;
    DB.update('returns', returnId, { status: 'approved', reviewedAt: new Date().toISOString() });
    if (ret.orderId) {
      DB.update('orders', ret.orderId, { status: 'return_approved' });
    }
    App.showToast('Return approved!', 'success');
    this.renderReturns('pending');
  },

  rejectReturn(returnId) {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return;
    const ret = DB.getById('returns', returnId);
    if (!ret) return;
    DB.update('returns', returnId, { status: 'rejected', rejectReason: reason, reviewedAt: new Date().toISOString() });
    if (ret.orderId) {
      const order = DB.getById('orders', ret.orderId);
      if (order && order.status === 'return_requested') {
        DB.update('orders', ret.orderId, { status: 'delivered' });
      }
    }
    App.showToast('Return rejected', 'info');
    this.renderReturns('pending');
  },

  processRefund(returnId) {
    const ret = DB.getById('returns', returnId);
    if (!ret) return;
    if (!confirm(`Process refund of ${App.formatCurrency(ret.refundAmount || 0)}? This cannot be undone.`)) return;
    DB.update('returns', returnId, { status: 'refunded', refundedAt: new Date().toISOString() });
    if (ret.orderId) {
      DB.update('orders', ret.orderId, { status: 'refunded' });
    }
    App.showToast(`Refund of ${App.formatCurrency(ret.refundAmount || 0)} processed!`, 'success');
    this.renderReturns('approved');
  },

  viewReturn(returnId) {
    const ret = DB.getById('returns', returnId);
    if (!ret) return;
    const order = ret.orderId ? DB.getById('orders', ret.orderId) : null;
    const statusColors = { pending: '#ff9800', approved: '#2196f3', rejected: '#f44336', refunded: '#9c27b0' };

    const modal = document.getElementById('productModal');
    const content = document.getElementById('productModalContent');
    content.innerHTML = `
      <button class="modal-close" onclick="Admin.closeModal()">✕</button>
      <h2 style="margin-bottom:20px;">Return #${ret.id.slice(-6).toUpperCase()}</h2>

      <div style="text-align:center;margin-bottom:20px;">
        <span style="display:inline-block;padding:6px 18px;border-radius:20px;font-weight:700;font-size:0.88rem;background:${statusColors[ret.status] || '#999'}18;color:${statusColors[ret.status] || '#999'};">${ret.status.toUpperCase()}</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">
        <div style="padding:12px;background:rgba(82,183,136,0.05);border-radius:10px;">
          <p style="font-size:0.72rem;color:var(--text-muted);margin:0 0 3px;">Customer</p>
          <p style="font-weight:700;margin:0;font-size:0.9rem;">${ret.customerName || 'Guest'}</p>
        </div>
        <div style="padding:12px;background:rgba(82,183,136,0.05);border-radius:10px;">
          <p style="font-size:0.72rem;color:var(--text-muted);margin:0 0 3px;">Order</p>
          <p style="font-weight:700;margin:0;font-size:0.9rem;color:var(--primary);">#${(ret.orderId || '').slice(-6).toUpperCase()}</p>
        </div>
        <div style="padding:12px;background:rgba(82,183,136,0.05);border-radius:10px;">
          <p style="font-size:0.72rem;color:var(--text-muted);margin:0 0 3px;">Product</p>
          <p style="font-weight:700;margin:0;font-size:0.9rem;">${ret.productName || 'N/A'}</p>
        </div>
        <div style="padding:12px;background:rgba(82,183,136,0.05);border-radius:10px;">
          <p style="font-size:0.72rem;color:var(--text-muted);margin:0 0 3px;">Quantity</p>
          <p style="font-weight:700;margin:0;font-size:0.9rem;">${ret.qty || 1}</p>
        </div>
      </div>

      <div style="padding:14px;background:rgba(244,67,54,0.04);border-radius:10px;border-left:3px solid var(--danger);margin-bottom:16px;">
        <p style="font-size:0.72rem;color:var(--text-muted);margin:0 0 3px;">Reason for Return</p>
        <p style="font-weight:600;margin:0;font-size:0.9rem;">${ret.reason || 'No reason provided'}</p>
      </div>

      ${ret.additionalInfo ? `
      <div style="padding:14px;background:rgba(45,106,79,0.04);border-radius:10px;border-left:3px solid var(--primary);margin-bottom:16px;">
        <p style="font-size:0.72rem;color:var(--text-muted);margin:0 0 3px;">Additional Details</p>
        <p style="font-weight:600;margin:0;font-size:0.88rem;">${ret.additionalInfo}</p>
      </div>` : ''}

      <div style="display:flex;gap:12px;margin-bottom:16px;">
        <div style="flex:1;padding:12px;text-align:center;background:rgba(244,67,54,0.06);border-radius:10px;">
          <span style="font-size:0.75rem;color:var(--text-muted);">Refund Amount</span><br>
          <span style="font-weight:800;font-size:1.15rem;color:var(--danger);">${App.formatCurrency(ret.refundAmount || 0)}</span>
        </div>
        <div style="flex:1;padding:12px;text-align:center;background:rgba(45,106,79,0.06);border-radius:10px;">
          <span style="font-size:0.75rem;color:var(--text-muted);">Payment Method</span><br>
          <span style="font-weight:700;font-size:0.95rem;">${order ? (order.paymentMethod === 'cod' ? '💵 COD' : '📱 UPI') : 'N/A'}</span>
        </div>
      </div>

      <div style="font-size:0.78rem;color:var(--text-muted);">
        <p style="margin:4px 0;">Requested: ${App.formatDate(ret.createdAt)}</p>
        ${ret.reviewedAt ? `<p style="margin:4px 0;">Reviewed: ${App.formatDate(ret.reviewedAt)}</p>` : ''}
        ${ret.refundedAt ? `<p style="margin:4px 0;color:var(--primary);font-weight:600;">Refunded: ${App.formatDate(ret.refundedAt)}</p>` : ''}
        ${ret.rejectReason ? `<p style="margin:4px 0;color:var(--danger);">Rejection reason: ${ret.rejectReason}</p>` : ''}
      </div>

      ${ret.status === 'pending' ? `
      <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="btn btn-primary" style="flex:1;" onclick="Admin.approveReturn('${ret.id}');Admin.closeModal();">✅ Approve Return</button>
        <button class="btn" style="flex:1;background:rgba(244,67,54,0.1);color:var(--danger);" onclick="Admin.rejectReturn('${ret.id}');Admin.closeModal();">❌ Reject</button>
      </div>` : ''}
      ${ret.status === 'approved' ? `
      <div style="margin-top:20px;">
        <button class="btn btn-primary" style="width:100%;" onclick="Admin.processRefund('${ret.id}');Admin.closeModal();">💰 Process Refund — ${App.formatCurrency(ret.refundAmount || 0)}</button>
      </div>` : ''}`;

    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
      modal.classList.remove('active');
      const modalBox = modal.querySelector('.modal');
      if (modalBox) modalBox.classList.remove('bulk-assign');
    }
    document.body.classList.remove('modal-open');
  },

  toggleSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  },

  // Stock Logs
  renderStockLogs() {
    const main = document.querySelector('.admin-content');
    if (!main) return;

    const logs = DB.getAll('stock_logs').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (logs.length === 0) {
      main.innerHTML = `
        <div class="admin-table-wrapper">
          <div class="admin-table-header">
            <h3>Stock Logs</h3>
          </div>
          <p style="text-align:center;padding:40px;color:var(--text-muted);">No stock logs found.</p>
        </div>`;
      return;
    }

    main.innerHTML = `
      <div class="admin-table-wrapper">
        <div class="admin-table-header">
          <h3>Stock Logs (${logs.length})</h3>
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Change</th>
              <th>Reason</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(log => `
              <tr>
                <td style="font-weight:600;">${log.productName || '-'}</td>
                <td>
                  <span style="font-weight:700;color:${log.change > 0 ? 'var(--primary)' : 'var(--danger)'};">
                    ${log.change > 0 ? '+' : ''}${log.change}
                  </span>
                </td>
                <td style="font-size:0.85rem;">${log.reason || '-'}</td>
                <td style="font-size:0.82rem;">${App.formatDate(log.timestamp)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  },

  // Admins
  renderAdmins() {
    const main = document.querySelector('.admin-content');
    if (!main) return;

    const admins = DB.getAll('admins');

    if (admins.length === 0) {
      main.innerHTML = `
        <div class="admin-table-wrapper">
          <div class="admin-table-header">
            <h3>Admins</h3>
          </div>
          <p style="text-align:center;padding:40px;color:var(--text-muted);">No admins found.</p>
        </div>`;
      return;
    }

    main.innerHTML = `
      <div class="admin-table-wrapper">
        <div class="admin-table-header">
          <h3>Admins (${admins.length})</h3>
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            ${admins.map(a => `
              <tr>
                <td style="font-weight:600;">${a.name || '-'}</td>
                <td>${a.email || '-'}</td>
                <td>
                  <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;background:${a.role === 'superadmin' ? 'rgba(82,183,136,0.15)' : 'rgba(45,106,79,0.08)'};color:${a.role === 'superadmin' ? 'var(--primary)' : 'var(--text-light)'};">
                    ${a.role || '-'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }
};

function initAdminPage() {
  Admin.init();
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/admin')) {
    initAdminPage();
  }
});
