const state = {
  token: localStorage.getItem('adminToken') || '',
  products: [],
  licenses: []
};

// ---- Helpers --------------------------------------------------------------

async function api(path, options = {}) {
  const res = await fetch('/api/admin' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + state.token,
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }
  return res.json();
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'Z').toLocaleString();
}

// ---- Auth -------------------------------------------------------------

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  refreshAll();
}

function showLogin() {
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

function logout() {
  state.token = '';
  localStorage.removeItem('adminToken');
  showLogin();
}

document.getElementById('login-btn').addEventListener('click', async () => {
  const value = document.getElementById('token-input').value.trim();
  if (!value) return;

  state.token = value;
  try {
    await api('/products'); // test call to verify token works
    localStorage.setItem('adminToken', value);
    showApp();
  } catch (e) {
    document.getElementById('login-error').textContent = 'Invalid token.';
  }
});

document.getElementById('logout-btn').addEventListener('click', logout);

// ---- Products -----------------------------------------------------------

async function loadProducts() {
  state.products = await api('/products');

  const tbody = document.querySelector('#products-table tbody');
  tbody.innerHTML = state.products.map(p => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td><code>${p.product_key}</code></td>
      <td>${fmtDate(p.created_at)}</td>
    </tr>
  `).join('');

  const select = document.getElementById('license-product-select');
  select.innerHTML = state.products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
}

document.getElementById('create-product-btn').addEventListener('click', async () => {
  const name = document.getElementById('new-product-name').value.trim();
  if (!name) return;

  await api('/products', { method: 'POST', body: JSON.stringify({ name }) });
  document.getElementById('new-product-name').value = '';
  await loadProducts();
});

// ---- Licenses -----------------------------------------------------------

async function loadLicenses() {
  state.licenses = await api('/licenses');

  const tbody = document.querySelector('#licenses-table tbody');
  tbody.innerHTML = state.licenses.map(l => `
    <tr>
      <td>${escapeHtml(l.product_name)}</td>
      <td>${escapeHtml(l.customer_name || '—')}</td>
      <td><code>${l.license_key}</code></td>
      <td class="status-${l.status}">${l.status}</td>
      <td>${l.bound_ip || '<em>not yet bound</em>'}</td>
      <td>${fmtDate(l.last_seen_at)}</td>
      <td>
        ${l.status === 'active'
          ? `<button class="small danger" onclick="revokeLicense(${l.id})">Revoke</button>`
          : `<button class="small success" onclick="reactivateLicense(${l.id})">Reactivate</button>`}
        <button class="small secondary" onclick="rebindLicense(${l.id})">Rebind</button>
        <button class="small secondary" onclick="viewLogs(${l.id}, '${escapeHtml(l.customer_name || l.license_key)}')">Logs</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('create-license-btn').addEventListener('click', async () => {
  const productId = document.getElementById('license-product-select').value;
  const customerName = document.getElementById('new-license-customer').value.trim();
  const boundCidr = document.getElementById('new-license-cidr').value.trim();
  if (!productId) return;

  await api('/licenses', {
    method: 'POST',
    body: JSON.stringify({ productId, customerName, boundCidr })
  });

  document.getElementById('new-license-customer').value = '';
  document.getElementById('new-license-cidr').value = '';
  await loadLicenses();
});

async function revokeLicense(id) {
  if (!confirm('Revoke this license? The server using it will lock down on its next heartbeat.')) return;
  await api(`/licenses/${id}/revoke`, { method: 'POST' });
  await loadLicenses();
}

async function reactivateLicense(id) {
  await api(`/licenses/${id}/reactivate`, { method: 'POST' });
  await loadLicenses();
}

async function rebindLicense(id) {
  if (!confirm('Clear the IP binding? The next server to validate this key will be auto-bound.')) return;
  await api(`/licenses/${id}/rebind`, { method: 'POST' });
  await loadLicenses();
}

async function viewLogs(id, label) {
  const logs = await api(`/licenses/${id}/logs`);
  document.getElementById('logs-license-label').textContent = `— ${label}`;

  const tbody = document.querySelector('#logs-table tbody');
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td>${fmtDate(l.created_at)}</td>
      <td>${l.ip}</td>
      <td>${escapeHtml(l.resource_name)}</td>
      <td class="${l.valid ? 'status-active' : 'status-revoked'}">${l.valid ? 'yes' : 'no'}</td>
      <td>${escapeHtml(l.reason || '')}</td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function refreshAll() {
  await loadProducts();
  await loadLicenses();
}

// ---- Boot -----------------------------------------------------------

if (state.token) {
  api('/products').then(showApp).catch(showLogin);
} else {
  showLogin();
}