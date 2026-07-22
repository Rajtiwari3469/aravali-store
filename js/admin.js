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
    const main = document.querySelector('.admin-content');
    if (!main) return;

    const products = DB.getAll('products');
    const orders = DB.getAll('orders');
    const users = DB.getAll('users');
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const stockSummary = DB.getStockSummary();
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
          <div class="stat-icon" style="background:rgba(230,57,70,0.15);">⚠️</div>
          <div class="stat-info"><h3>${outOfStockProducts.length}</h3><p>Out of Stock</p></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(244,140,6,0.15);">📉</div>
          <div class="stat-info"><h3>${lowStockProducts.length}</h3><p>Low Stock (≤5)</p></div>
        </div>`;
    }

    // Stock Alert Banner
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
      main.insertAdjacentHTML('afterbegin', alertHtml);
    }

    // Sales chart
    const chartContainer = document.querySelector('.chart-bars');
    if (chartContainer) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const maxRevenue = Math.max(...orders.map(o => o.total || 0), 100);
      chartContainer.innerHTML = months.map((m, i) => {
        const monthOrders = orders.filter(o => {
          const d = new Date(o.orderDate || o.createdAt);
          return d.getMonth() === i;
        });
        const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const height = Math.max(8, (monthRevenue / maxRevenue) * 150);
        return `
          <div class="chart-bar" style="height:${height}px;">
            <span class="bar-value">${App.formatCurrency(monthRevenue)}</span>
            <span class="bar-label">${m}</span>
          </div>`;
      }).join('');
    }

    // Recent orders
    const recentContainer = document.querySelector('.recent-orders-list');
    if (recentContainer) {
      const recent = orders.slice(-5).reverse();
      if (recent.length === 0) {
        recentContainer.innerHTML = '<p style="color:var(--text-muted);padding:16px;">No orders yet.</p>';
      } else {
        recentContainer.innerHTML = recent.map(o => `
          <div class="recent-order-item">
            <div class="order-info">
              <span class="order-id">#${o.id.slice(-6).toUpperCase()}</span>
              <span class="order-date">${App.formatDate(o.orderDate || o.createdAt)}</span>
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
            ${p.image
              ? `<img src="${p.image}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;">`
              : `<div style="width:40px;height:40px;border-radius:8px;background:rgba(45,106,79,0.08);display:flex;align-items:center;justify-content:center;font-size:0.65rem;color:var(--text-muted);">No Img</div>`
            }
            <div>
              <div style="font-weight:600;">${p.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${p.unit}</div>
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
          <label>Product Image</label>
          <input type="file" id="pImage" accept="image/*" style="margin-bottom:8px;">
          <img id="pImagePreview" src="" alt="" style="max-height:80px;border-radius:8px;display:none;">
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
        <input type="hidden" id="pEditId" value="">
        <input type="hidden" id="pExistingImage" value="">
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;">Save Product</button>
      </form>`;
    modal.classList.add('active');
    App.handleImageUpload('pImage', 'pImagePreview', 300);
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
    document.getElementById('pEditId').value = id;
    document.getElementById('pExistingImage').value = product.image || '';

    if (product.image) {
      const preview = document.getElementById('pImagePreview');
      preview.src = product.image;
      preview.style.display = 'block';
    }
  },

  saveProduct(e) {
    e.preventDefault();
    const editId = document.getElementById('pEditId').value;
    const imageData = App.getImageData('pImage');
    const existingImage = document.getElementById('pExistingImage').value;

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
      image: imageData || existingImage || ''
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
  renderOrders() {
    const main = document.querySelector('.admin-content');
    if (!main) return;

    const orders = DB.getAll('orders').reverse();

    main.innerHTML = `
      <div class="admin-table-wrapper">
        <div class="admin-table-header">
          <h3>All Orders (${orders.length})</h3>
          <input type="text" class="search-input" placeholder="Search orders..." oninput="Admin.filterOrders(this.value)">
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="ordersTableBody">
            ${this.renderOrderRows(orders)}
          </tbody>
        </table>
      </div>`;
  },

  renderOrderRows(orders) {
    if (orders.length === 0) {
      return '<tr><td colspan="7" style="text-align:center;padding:40px;">No orders yet.</td></tr>';
    }
    return orders.map(o => `
      <tr>
        <td style="font-weight:600;">#${o.id.slice(-6).toUpperCase()}</td>
        <td>${o.userName || 'Guest'}</td>
        <td>${(o.items || []).length} items</td>
        <td style="font-weight:600;color:var(--primary);">${App.formatCurrency(o.total || 0)}</td>
        <td>
          <select class="order-status-select" onchange="Admin.updateOrderStatus('${o.id}', this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid rgba(45,106,79,0.15);font-family:var(--font);font-size:0.78rem;">
            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td style="font-size:0.82rem;">${App.formatDate(o.orderDate || o.createdAt)}</td>
        <td>
          <button class="action-btn view" onclick="Admin.viewOrder('${o.id}')">View</button>
        </td>
      </tr>
    `).join('');
  },

  filterOrders(term) {
    let orders = DB.getAll('orders').reverse();
    if (term) {
      const t = term.toLowerCase();
      orders = orders.filter(o =>
        o.id.toLowerCase().includes(t) ||
        (o.userName && o.userName.toLowerCase().includes(t)) ||
        o.status.toLowerCase().includes(t)
      );
    }
    document.getElementById('ordersTableBody').innerHTML = this.renderOrderRows(orders);
  },

  updateOrderStatus(orderId, status) {
    DB.update('orders', orderId, { status });
    App.showToast(`Order status updated to ${status}`, 'success');
  },

  viewOrder(orderId) {
    const order = DB.getById('orders', orderId);
    if (!order) return;

    const modal = document.getElementById('productModal');
    if (!modal) return;
    const content = document.getElementById('productModalContent');

    content.innerHTML = `
      <button class="modal-close" onclick="Admin.closeModal()">✕</button>
      <h2>Order #${order.id.slice(-6).toUpperCase()}</h2>
      <div style="margin-bottom:16px;">
        <strong>Customer:</strong> ${order.userName || 'Guest'}<br>
        <strong>Date:</strong> ${App.formatDate(order.orderDate || order.createdAt)}<br>
        <strong>Status:</strong> <span class="order-status ${order.status}">${order.status}</span><br>
        <strong>Address:</strong> ${order.address || 'N/A'}<br>
        <strong>Payment:</strong> ${order.paymentMethod || 'N/A'}
      </div>
      <h3 style="font-size:0.95rem;margin-bottom:8px;">Items</h3>
      ${(order.items || []).map(item => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(45,106,79,0.06);">
          <span>${item.name} × ${item.qty}</span>
          <span style="font-weight:600;">${App.formatCurrency(item.price * item.qty)}</span>
        </div>
      `).join('')}
      <div style="display:flex;justify-content:space-between;padding:12px 0;font-weight:700;font-size:1.05rem;color:var(--primary-dark);">
        <span>Total</span>
        <span>${App.formatCurrency(order.total || 0)}</span>
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
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.length === 0
              ? '<tr><td colspan="6" style="text-align:center;padding:40px;">No users registered yet.</td></tr>'
              : users.map(u => {
                  const userOrders = orders.filter(o => o.userId === u.id);
                  return `
                    <tr>
                      <td style="font-weight:600;">${u.name}</td>
                      <td>${u.email}</td>
                      <td>${u.phone || 'N/A'}</td>
                      <td>${userOrders.length}</td>
                      <td style="font-size:0.82rem;">${App.formatDate(u.createdAt)}</td>
                      <td>
                        <button class="action-btn delete" onclick="Admin.deleteUser('${u.id}')">Delete</button>
                      </td>
                    </tr>`;
                }).join('')
            }
          </tbody>
        </table>
      </div>`;
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

  closeModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('active');
  },

  toggleSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar) sidebar.classList.toggle('open');
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
