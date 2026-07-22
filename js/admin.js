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

        if (App.loginAdmin(email, password)) {
          window.location.href = 'index.html';
        } else {
          const errorEl = document.getElementById('loginError');
          if (errorEl) {
            errorEl.textContent = 'Invalid credentials. Use admin@gmail.com';
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
        </div>`;
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
      return '<tr><td colspan="5" style="text-align:center;padding:40px;">No products found.</td></tr>';
    }
    return products.map(p => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.5rem;">${App.getProductEmoji(p.category)}</span>
            <div>
              <div style="font-weight:600;">${p.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${p.unit}</div>
            </div>
          </div>
        </td>
        <td>${p.category}</td>
        <td style="font-weight:600;color:var(--primary);">${App.formatCurrency(p.price)}</td>
        <td>${p.stock}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit" onclick="Admin.editProduct('${p.id}')">Edit</button>
            <button class="action-btn delete" onclick="Admin.deleteProduct('${p.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
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
    content.innerHTML = `
      <button class="modal-close" onclick="Admin.closeModal()">✕</button>
      <h2>Add New Product</h2>
      <form id="productForm" onsubmit="Admin.saveProduct(event)">
        <div class="form-group">
          <label>Product Name</label>
          <input type="text" id="pName" required>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="pCategory" required>
            <option value="Dairy">Dairy</option>
            <option value="Fruits">Fruits</option>
            <option value="Vegetables">Vegetables</option>
            <option value="Snacks">Snacks</option>
            <option value="Beverages">Beverages</option>
            <option value="Grains">Grains</option>
            <option value="Bakery">Bakery</option>
            <option value="Frozen">Frozen</option>
          </select>
        </div>
        <div class="form-group">
          <label>Price (₹)</label>
          <input type="number" id="pPrice" required min="1">
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
          <input type="text" id="pBadge" placeholder="e.g. Bestseller, New">
        </div>
        <input type="hidden" id="pEditId" value="">
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;">Save Product</button>
      </form>`;
    modal.classList.add('active');
  },

  editProduct(id) {
    const product = DB.getById('products', id);
    if (!product) return;

    this.showAddProduct();
    document.getElementById('productModalContent').querySelector('h2').textContent = 'Edit Product';
    document.getElementById('pName').value = product.name;
    document.getElementById('pCategory').value = product.category;
    document.getElementById('pPrice').value = product.price;
    document.getElementById('pUnit').value = product.unit;
    document.getElementById('pStock').value = product.stock;
    document.getElementById('pDesc').value = product.description || '';
    document.getElementById('pBadge').value = product.badge || '';
    document.getElementById('pEditId').value = id;
  },

  saveProduct(e) {
    e.preventDefault();
    const editId = document.getElementById('pEditId').value;
    const data = {
      name: document.getElementById('pName').value.trim(),
      category: document.getElementById('pCategory').value,
      price: parseFloat(document.getElementById('pPrice').value),
      unit: document.getElementById('pUnit').value.trim(),
      stock: parseInt(document.getElementById('pStock').value),
      description: document.getElementById('pDesc').value.trim(),
      badge: document.getElementById('pBadge').value.trim(),
      image: ''
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
    main.innerHTML = `
      <div style="max-width:500px;">
        <div class="glass-card" style="padding:30px;">
          <h3 style="margin-bottom:20px;color:var(--primary-dark);">Change Password</h3>
          <form id="settingsForm">
            <div class="form-group">
              <label>Current Password</label>
              <input type="password" id="currentPass" required>
            </div>
            <div class="form-group">
              <label>New Password</label>
              <input type="password" id="newPass" required>
            </div>
            <div class="form-group">
              <label>Confirm New Password</label>
              <input type="password" id="confirmPass" required>
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
