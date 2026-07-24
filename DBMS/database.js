const DB = {
  async _fetch(url, opts = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  async getAll(table) {
    const endpoint = table === 'stock_logs' ? 'stock-logs' : table;
    try {
      const data = await this._fetch(`/api/${endpoint}`);
      return Array.isArray(data) ? data : (data.items || []);
    } catch { return []; }
  },

  async getById(table, id) {
    const items = await this.getAll(table);
    return items.find(item => item.id === id) || null;
  },

  async insert(table, record) {
    const endpoint = table === 'stock_logs' ? 'stock-logs' : table;
    const data = await this._fetch(`/api/${endpoint}`, {
      method: 'POST',
      body: record,
    });
    return data.record || data;
  },

  async update(table, id, data) {
    const endpoint = table === 'stock_logs' ? 'stock-logs' : table;
    if (table === 'products' || table === 'orders' || table === 'returns' || table === 'banners' || table === 'catalogs' || table === 'admins') {
      const result = await this._fetch(`/api/${endpoint}/${id}`, {
        method: 'PUT',
        body: data,
      });
      return result.record || result;
    }
    const result = await this._fetch(`/api/${endpoint}`, {
      method: 'PUT',
      body: { id, ...data },
    });
    return result.record || result;
  },

  async delete(table, id) {
    const endpoint = table === 'stock_logs' ? 'stock-logs' : table;
    if (table === 'products' || table === 'orders' || table === 'returns' || table === 'banners' || table === 'catalogs' || table === 'admins') {
      await this._fetch(`/api/${endpoint}/${id}`, { method: 'DELETE' });
    } else {
      await this._fetch(`/api/${endpoint}`, {
        method: 'DELETE',
        body: { id },
      });
    }
    return true;
  },

  async query(table, filterFn) {
    const items = await this.getAll(table);
    return items.filter(filterFn);
  },

  async count(table) {
    const items = await this.getAll(table);
    return items.length;
  },

  async search(table, searchTerm, fields) {
    const items = await this.getAll(table);
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      fields.some(field => item[field] && item[field].toString().toLowerCase().includes(term))
    );
  },

  async paginate(table, page, perPage, filterFn) {
    let items = await this.getAll(table);
    if (filterFn) items = items.filter(filterFn);
    const total = items.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    return { items: items.slice(start, start + perPage), total, totalPages, page, perPage };
  },

  async getSettings() {
    try {
      const data = await this._fetch('/api/settings');
      return data || {};
    } catch { return {}; }
  },

  async saveSetting(key, value) {
    await this._fetch('/api/settings', {
      method: 'PUT',
      body: { key, value: String(value) },
    });
  },

  async updateStock(productId, qtyChange) {
    const product = await this.getById('products', productId);
    if (!product) return false;
    const newStock = Math.max(0, (product.stock || 0) + qtyChange);
    await this.update('products', productId, { stock: newStock });
    return true;
  },

  async setStock(productId, newStock) {
    const product = await this.getById('products', productId);
    if (!product) return false;
    await this.update('products', productId, { stock: Math.max(0, parseInt(newStock) || 0) });
    return true;
  },

  async getOutOfStockProducts() {
    const items = await this.getAll('products');
    return items.filter(p => (p.stock || 0) <= 0);
  },

  async getLowStockProducts(threshold = 5) {
    const items = await this.getAll('products');
    return items.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= threshold);
  },

  async getStockSummary() {
    const products = await this.getAll('products');
    const total = products.length;
    const outOfStock = products.filter(p => (p.stock || 0) <= 0).length;
    const lowStock = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 5).length;
    return { total, outOfStock, lowStock, inStock: total - outOfStock };
  },

  async clearTable(table) {
    const items = await this.getAll(table);
    for (const item of items) {
      await this.delete(table, item.id);
    }
  },

  async clearAllData() {
    const tables = ['products', 'banners', 'catalogs', 'orders', 'users', 'stock_logs', 'settings', 'returns'];
    for (const t of tables) {
      await this.clearTable(t);
    }
  },

  async logStockChange(productId, productName, change, reason) {
    await this.insert('stock_logs', {
      productId,
      productName,
      change_val: change,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  async exportAll() {
    return this._fetch('/api/export');
  },

  async importAll(data) {
    return this._fetch('/api/import', { method: 'POST', body: data });
  },

  async seed(table, data) {
    const existing = await this.getAll(table);
    if (existing.length === 0 && data.length > 0) {
      for (const item of data) {
        await this.insert(table, item);
      }
      return true;
    }
    return false;
  },
};

if (typeof window !== 'undefined') {
  window.DB = DB;
}
