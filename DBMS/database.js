const DB = {
  _prefix: 'aravali_',

  _key(table) {
    return this._prefix + table;
  },

  getAll(table) {
    try {
      const data = localStorage.getItem(this._key(table));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getById(table, id) {
    const items = this.getAll(table);
    return items.find(item => item.id === id) || null;
  },

  insert(table, record) {
    const items = this.getAll(table);
    if (!record.id) {
      record.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    record.createdAt = record.createdAt || new Date().toISOString();
    items.push(record);
    localStorage.setItem(this._key(table), JSON.stringify(items));
    return record;
  },

  update(table, id, data) {
    const items = this.getAll(table);
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem(this._key(table), JSON.stringify(items));
    return items[index];
  },

  delete(table, id) {
    const items = this.getAll(table);
    const filtered = items.filter(item => item.id !== id);
    if (filtered.length === items.length) return false;
    localStorage.setItem(this._key(table), JSON.stringify(filtered));
    return true;
  },

  query(table, filterFn) {
    const items = this.getAll(table);
    return items.filter(filterFn);
  },

  count(table) {
    return this.getAll(table).length;
  },

  clear(table) {
    localStorage.removeItem(this._key(table));
  },

  seed(table, data) {
    if (this.getAll(table).length === 0) {
      localStorage.setItem(this._key(table), JSON.stringify(data));
      return true;
    }
    return false;
  },

  search(table, searchTerm, fields) {
    const items = this.getAll(table);
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      fields.some(field =>
        item[field] && item[field].toString().toLowerCase().includes(term)
      )
    );
  },

  paginate(table, page, perPage, filterFn) {
    let items = this.getAll(table);
    if (filterFn) items = items.filter(filterFn);
    const total = items.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const paginatedItems = items.slice(start, start + perPage);
    return { items: paginatedItems, total, totalPages, page, perPage };
  },

  getSettings() {
    try {
      const data = localStorage.getItem(this._prefix + 'settings');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveSetting(key, value) {
    const settings = this.getSettings();
    settings[key] = value;
    localStorage.setItem(this._prefix + 'settings', JSON.stringify(settings));
  },

  // Stock Management
  updateStock(productId, qtyChange) {
    const product = this.getById('products', productId);
    if (!product) return false;
    const newStock = Math.max(0, (product.stock || 0) + qtyChange);
    this.update('products', productId, { stock: newStock });
    return true;
  },

  setStock(productId, newStock) {
    const product = this.getById('products', productId);
    if (!product) return false;
    this.update('products', productId, { stock: Math.max(0, parseInt(newStock) || 0) });
    return true;
  },

  getOutOfStockProducts() {
    return this.getAll('products').filter(p => (p.stock || 0) <= 0);
  },

  getLowStockProducts(threshold = 5) {
    return this.getAll('products').filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= threshold);
  },

  getStockSummary() {
    const products = this.getAll('products');
    const total = products.length;
    const outOfStock = products.filter(p => (p.stock || 0) <= 0).length;
    const lowStock = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5).length;
    const inStock = total - outOfStock;
    return { total, outOfStock, lowStock, inStock };
  },

  logStockChange(productId, productName, change, reason) {
    const logs = this.getAll('stock_logs');
    logs.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      productId,
      productName,
      change,
      reason,
      timestamp: new Date().toISOString()
    });
    if (logs.length > 200) logs.length = 200;
    localStorage.setItem(this._key('stock_logs'), JSON.stringify(logs));
  }
};

function initDB() {
  if (typeof SEED_DATA !== 'undefined') {
    DB.seed('products', SEED_DATA.products);
    DB.seed('banners', SEED_DATA.banners);
    DB.seed('catalogs', SEED_DATA.catalogs);
  }

  const adminExists = DB.getAll('admins').length > 0;
  if (!adminExists) {
    DB.insert('admins', {
      id: 'admin_001',
      email: 'admin@gmail.com',
      password: 'gateout@123#',
      name: 'Admin',
      role: 'superadmin'
    });
  }

  if (DB.getAll('orders').length === 0) {
    DB.seed('orders', []);
  }

  if (DB.getAll('users').length === 0) {
    DB.seed('users', []);
  }

  if (DB.getAll('stock_logs').length === 0) {
    DB.seed('stock_logs', []);
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initDB);
}
