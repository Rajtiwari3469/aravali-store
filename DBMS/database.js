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

  clearTable(table) {
    localStorage.removeItem(this._key(table));
  },

  clearAllData() {
    const tables = ['products', 'banners', 'catalogs', 'orders', 'users', 'stock_logs', 'settings'];
    tables.forEach(t => localStorage.removeItem(this._key(t)));
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

function generateSeedOrders() {
  const names = ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Gupta', 'Vikram Singh', 'Neha Reddy', 'Rohan Mehta', 'Ananya Das', 'Karan Bhatia', 'Pooja Nair', 'Suresh Iyer', 'Deepa Menon', 'Arun Tiwari', 'Kavita Joshi', 'Manoj Verma'];
  const addresses = ['12 MG Road, Jaipur', '45 Park Street, Delhi', '78 Civil Lines, Lucknow', '23 Gomti Nagar, Varanasi', '90 Hazratganj, Lucknow', '34 Aundh, Pune', '56 Whitefield, Bangalore', '67 Salt Lake, Kolkata', '81 Banjara Hills, Hyderabad', '14 Deccan, Pune'];
  const statuses = ['pending', 'confirmed', 'delivered', 'delivered', 'delivered', 'cancelled'];
  const paymentMethods = ['cod', 'cod', 'cod', 'upi'];

  const products = DB.getAll('products');
  if (products.length === 0) return [];

  const orders = [];
  const now = new Date();

  for (let m = 0; m < 6; m++) {
    const orderCount = m === 0 ? 8 : (m === 1 ? 10 : Math.floor(Math.random() * 8) + 5);
    for (let j = 0; j < orderCount; j++) {
      const itemCount = Math.floor(Math.random() * 5) + 1;
      const items = [];
      const usedProductIds = new Set();
      for (let k = 0; k < itemCount; k++) {
        let p;
        do { p = products[Math.floor(Math.random() * products.length)]; } while (usedProductIds.has(p.id) && usedProductIds.size < products.length);
        usedProductIds.add(p.id);
        const qty = Math.floor(Math.random() * 3) + 1;
        items.push({ productId: p.id, name: p.name, price: p.price, qty, unit: p.unit });
      }
      const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
      const delivery = subtotal > 200 ? 0 : 30;

      const dayOffset = Math.floor(Math.random() * 28);
      const orderDate = new Date(now.getFullYear(), now.getMonth() - m, Math.max(1, now.getDate() - dayOffset));

      const userIdx = j % 15;

      orders.push({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9) + m + j,
        userId: 'seed_user_' + userIdx,
        userName: names[userIdx],
        items,
        address: addresses[Math.floor(Math.random() * addresses.length)],
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        subtotal,
        delivery,
        total: subtotal + delivery,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        orderDate: orderDate.toISOString()
      });
    }
  }

  return orders;
}

function generateSeedUsers() {
  const users = [
    { id: 'seed_user_0', name: 'Rahul Sharma', email: 'rahul@example.com', phone: '9876543210', password: 'pass123' },
    { id: 'seed_user_1', name: 'Priya Patel', email: 'priya@example.com', phone: '9876543211', password: 'pass123' },
    { id: 'seed_user_2', name: 'Amit Kumar', email: 'amit@example.com', phone: '9876543212', password: 'pass123' },
    { id: 'seed_user_3', name: 'Sneha Gupta', email: 'sneha@example.com', phone: '9876543213', password: 'pass123' },
    { id: 'seed_user_4', name: 'Vikram Singh', email: 'vikram@example.com', phone: '9876543214', password: 'pass123' },
    { id: 'seed_user_5', name: 'Neha Reddy', email: 'neha@example.com', phone: '9876543215', password: 'pass123' },
    { id: 'seed_user_6', name: 'Rohan Mehta', email: 'rohan@example.com', phone: '9876543216', password: 'pass123' },
    { id: 'seed_user_7', name: 'Ananya Das', email: 'ananya@example.com', phone: '9876543217', password: 'pass123' },
    { id: 'seed_user_8', name: 'Karan Bhatia', email: 'karan@example.com', phone: '9876543218', password: 'pass123' },
    { id: 'seed_user_9', name: 'Pooja Nair', email: 'pooja@example.com', phone: '9876543219', password: 'pass123' },
    { id: 'seed_user_10', name: 'Suresh Iyer', email: 'suresh@example.com', phone: '9876543220', password: 'pass123' },
    { id: 'seed_user_11', name: 'Deepa Menon', email: 'deepa@example.com', phone: '9876543221', password: 'pass123' },
    { id: 'seed_user_12', name: 'Arun Tiwari', email: 'arun@example.com', phone: '9876543222', password: 'pass123' },
    { id: 'seed_user_13', name: 'Kavita Joshi', email: 'kavita@example.com', phone: '9876543223', password: 'pass123' },
    { id: 'seed_user_14', name: 'Manoj Verma', email: 'manoj@example.com', phone: '9876543224', password: 'pass123' }
  ];
  return users.map(u => ({ ...u, createdAt: new Date(Date.now() - Math.floor(Math.random() * 90) * 86400000).toISOString() }));
}

function generateSeedStockLogs() {
  const products = DB.getAll('products');
  if (products.length === 0) return [];
  const reasons = ['Admin restock', 'Admin adjustment', 'Order placed', 'Quick restock', 'Stock corrected'];
  const logs = [];
  const now = Date.now();
  for (let i = 0; i < 40; i++) {
    const p = products[Math.floor(Math.random() * products.length)];
    const change = Math.floor(Math.random() * 20) - 5;
    logs.push({
      id: now.toString(36) + Math.random().toString(36).substr(2, 8) + i,
      productId: p.id,
      productName: p.name,
      change,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      timestamp: new Date(now - Math.floor(Math.random() * 30) * 86400000).toISOString()
    });
  }
  return logs;
}

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
    DB.seed('orders', generateSeedOrders());
  }

  if (DB.getAll('users').length === 0) {
    DB.seed('users', generateSeedUsers());
  }

  if (DB.getAll('stock_logs').length === 0) {
    DB.seed('stock_logs', generateSeedStockLogs());
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initDB);
}
