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
    const tables = ['products', 'banners', 'catalogs', 'orders', 'users', 'stock_logs', 'settings', 'returns', 'support_tickets'];
    tables.forEach(t => localStorage.removeItem(this._key(t)));
    localStorage.removeItem('aravali_addresses');
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

function generateSeedReturns() {
  const orders = DB.getAll('orders');
  const users = DB.getAll('users');
  if (orders.length === 0) return [];

  const reasons = ['Damaged product', 'Wrong item received', 'Product quality issue', 'Expired product', 'Missing items', 'No longer needed'];
  const statuses = ['pending', 'pending', 'approved', 'approved', 'rejected', 'refunded'];
  const returns = [];
  const now = Date.now();

  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const sampleSize = Math.min(12, deliveredOrders.length);

  for (let i = 0; i < sampleSize; i++) {
    const order = deliveredOrders[Math.floor(Math.random() * deliveredOrders.length)];
    const user = order.userId ? users.find(u => u.id === order.userId) : null;
    const firstItem = (order.items || [])[0] || {};
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const createdDate = new Date(now - Math.floor(Math.random() * 20) * 86400000);

    returns.push({
      id: now.toString(36) + Math.random().toString(36).substr(2, 9) + i,
      orderId: order.id,
      userId: order.userId || null,
      customerName: user ? user.name : (order.userName || 'Guest'),
      productName: firstItem.name || 'Full Order',
      productId: firstItem.productId || null,
      qty: (order.items || []).reduce((s, i) => s + (i.qty || 1), 0),
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      additionalInfo: Math.random() > 0.6 ? 'Please resolve this quickly.' : '',
      refundAmount: order.total || 0,
      status: status,
      createdAt: createdDate.toISOString(),
      reviewedAt: status !== 'pending' ? new Date(createdDate.getTime() + Math.floor(Math.random() * 3) * 86400000).toISOString() : null,
      refundedAt: status === 'refunded' ? new Date(createdDate.getTime() + Math.floor(Math.random() * 5) * 86400000).toISOString() : null,
      rejectReason: status === 'rejected' ? 'Item is not eligible for return as per policy.' : null
    });
  }
  return returns;
}

function generateSeedAddresses() {
  const users = DB.getAll('users');
  if (users.length === 0) return;

  const addressTemplates = [
    { line: '12 MG Road, Near City Mall', city: 'Udaipur', state: 'Rajasthan', pincode: '313001' },
    { line: '45 Park Street, Block B', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
    { line: '78 Civil Lines, Sector 3', city: 'Delhi', state: 'Delhi', pincode: '110001' },
    { line: '23 Gomti Nagar, Phase 2', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226010' },
    { line: '90 Hazratganj, Main Road', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001' },
    { line: '34 Aundh, Baner Road', city: 'Pune', state: 'Maharashtra', pincode: '411007' },
    { line: '56 Whitefield, IT Park Road', city: 'Bangalore', state: 'Karnataka', pincode: '560066' },
    { line: '67 Salt Lake, Sector V', city: 'Kolkata', state: 'West Bengal', pincode: '700091' },
    { line: '81 Banjara Hills, Road No 12', city: 'Hyderabad', state: 'Telangana', pincode: '500034' },
    { line: '14 Deccan Gymkhana, FC Road', city: 'Pune', state: 'Maharashtra', pincode: '411004' },
    { line: '22 Anna Salai, T Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600017' },
    { line: '39 Lajpat Nagar, Part 1', city: 'Delhi', state: 'Delhi', pincode: '110024' },
    { line: '51 Koramangala, 5th Block', city: 'Bangalore', state: 'Karnataka', pincode: '560095' },
    { line: '63 Andheri West, Link Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400053' },
    { line: '76 DLF Phase 3', city: 'Gurgaon', state: 'Haryana', pincode: '122002' }
  ];

  users.forEach((user, i) => {
    const addrs = JSON.parse(localStorage.getItem('aravali_addresses') || '[]');
    const existing = addrs.filter(a => a.userId === user.id);
    if (existing.length > 0) return;

    const addr = addressTemplates[i % addressTemplates.length];
    addrs.push({
      userId: user.id,
      name: user.name || 'User',
      phone: user.phone || '',
      line: addr.line,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      type: i % 3 === 0 ? 'work' : 'home',
      isDefault: true
    });
    localStorage.setItem('aravali_addresses', JSON.stringify(addrs));
  });
}

function generateSeedSupportTickets() {
  const users = DB.getAll('users');
  if (users.length === 0) return [];

  const subjects = [
    'Order not delivered yet',
    'Wrong item received',
    'Refund not processed',
    'App crashing on checkout',
    'Coupon code not working',
    'Product quality complaint',
    'Delivery boy behavior',
    'Payment deducted but order failed',
    'Request for bulk order discount',
    'Missing items in order'
  ];

  const categories = ['order_issue', 'refund', 'product', 'technical', 'other'];
  const statuses = ['open', 'open', 'replied', 'replied', 'closed', 'closed'];

  const messages = [
    'I placed an order 3 days ago but haven\'t received it yet. Please check.',
    'I received tomatoes instead of potatoes. Please help.',
    'My refund for order #ABC123 was supposed to be processed 5 days ago.',
    'Every time I try to checkout, the app crashes. Please fix.',
    'The coupon NEWYEAR2025 is showing as invalid even though it should work.',
    'The milk I received was already expired. Very disappointed.',
    'The delivery person was very rude. Please take action.',
    'Money was deducted from my account but the order shows as failed.',
    'I want to place a bulk order for my store. Can I get a discount?',
    'I ordered 5 items but only received 3. Please send the rest.'
  ];

  const adminReplies = [
    '',
    '',
    'We apologize for the inconvenience. We will look into this right away.',
    '',
    'Thank you for reporting. Our team is looking into this issue.',
    'We are sorry about this. A replacement will be delivered tomorrow.',
    '',
    '',
    '',
    'We apologize for the missing items. They will be shipped separately.'
  ];

  const tickets = [];
  const now = Date.now();

  for (let i = 0; i < Math.min(10, users.length); i++) {
    const user = users[i % users.length];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const createdDate = new Date(now - Math.floor(Math.random() * 14) * 86400000);

    tickets.push({
      id: now.toString(36) + Math.random().toString(36).substr(2, 9) + i,
      userId: user.id,
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone || '',
      subject: subjects[i % subjects.length],
      category: categories[Math.floor(Math.random() * categories.length)],
      message: messages[i % messages.length],
      orderId: Math.random() > 0.5 ? 'seed_order_' + Math.floor(Math.random() * 5) : '',
      status: status,
      adminReply: adminReplies[i % adminReplies.length] || '',
      createdAt: createdDate.toISOString(),
      updatedAt: status !== 'open' ? new Date(createdDate.getTime() + 86400000).toISOString() : null
    });
  }
  return tickets;
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

  if (DB.getAll('returns').length === 0) {
    DB.seed('returns', generateSeedReturns());
  }

  generateSeedAddresses();

  if (DB.getAll('support_tickets').length === 0) {
    DB.seed('support_tickets', generateSeedSupportTickets());
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initDB);
}
