/* ============================================
   VibeShop Admin Panel
   ============================================ */

var adminPaymentFilter = null;

var ADMIN_STATUS_LABELS = {
  pending: 'Ожидание',
  awaiting_admin: 'Проверка',
  success: 'Успешно',
  failed: 'Отклонено',
  expired: 'Истекло'
};

var ADMIN_METHOD_LABELS = {
  bankomat: '🏧 Банкомат',
  card_to_card: '💳 Карта-карта',
  balance: '💰 Баланс'
};

var ADMIN_PURPOSE_LABELS = {
  topup: 'Пополнение',
  product: 'Покупка'
};

/**
 * Admin API request helper
 */
function adminRequest(path, options) {
  return apiRequest('/api/admin' + path, options);
}

/**
 * Check admin access and init panel
 */
function initAdminPanel() {
  if (!document.getElementById('adminPanel')) return;

  adminRequest('/check').then(function (data) {
    if (!data.is_admin) {
      showAccessDenied();
      return;
    }
    showAdminPanel();
    loadAdminStats();
    loadAdminPayments();
    loadAdminOrders();
    loadAdminUsers();
    loadAdminCardSettings();
  }).catch(function () {
    showAccessDenied();
  });
}

function showAccessDenied() {
  document.getElementById('accessDenied').classList.remove('hidden');
  document.getElementById('adminPanel').classList.add('hidden');
}

function showAdminPanel() {
  document.getElementById('accessDenied').classList.add('hidden');
  document.getElementById('adminPanel').classList.remove('hidden');
}

/**
 * Show admin link in settings for admins only (admin.js also defines this when loaded)
 */
function showAdminLinkIfNeeded() {
  var link = document.getElementById('adminPanelLink');
  if (!link) return;
  if (userData.isAdmin) link.classList.remove('hidden');
  else link.classList.add('hidden');
}

/**
 * Switch admin tabs
 */
function switchAdminTab(tab) {
  var tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach(function (t) {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  document.querySelectorAll('.admin-tab-content').forEach(function (el) {
    el.classList.add('hidden');
  });

  var content = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (content) content.classList.remove('hidden');
}

/**
 * Load dashboard stats
 */
function loadAdminStats() {
  adminRequest('/stats').then(function (data) {
    document.getElementById('statUsers').textContent = data.users_count;
    document.getElementById('statOrders').textContent = data.orders_count;
    document.getElementById('statPending').textContent = data.pending_payments;
    document.getElementById('statRevenue').textContent = formatPrice(data.total_revenue) + ' so\'m';
    document.getElementById('statSuccess').textContent = data.success_orders;
  }).catch(function (err) {
    showToast(err.message, 'error');
  });
}

/**
 * Load payments list
 */
function loadAdminPayments() {
  var path = '/payments' + (adminPaymentFilter ? '?status=' + adminPaymentFilter : '');
  adminRequest(path).then(function (data) {
    renderAdminPayments(data.payments);
  }).catch(function (err) {
    showToast(err.message, 'error');
  });
}

function filterAdminPayments(status) {
  adminPaymentFilter = status;
  var buttons = document.querySelectorAll('#tabPayments .filter-btn');
  buttons.forEach(function (btn, i) {
    var filters = [null, 'awaiting_admin', 'pending', 'success'];
    btn.classList.toggle('active', filters[i] === status);
  });
  loadAdminPayments();
}

function renderAdminPayments(payments) {
  var list = document.getElementById('adminPaymentsList');
  if (!list) return;

  if (!payments.length) {
    list.innerHTML = '<div class="no-products">Платежей нет</div>';
    return;
  }

  list.innerHTML = payments.map(function (p) {
    var screenshotHtml = '';
    if (p.screenshot_path) {
      screenshotHtml = '<img class="admin-screenshot" src="/uploads/' + p.screenshot_path + '" alt="Screenshot">';
    }

    var actionsHtml = '';
    if (p.status === 'awaiting_admin' || p.status === 'pending') {
      actionsHtml =
        '<div class="admin-actions">' +
          '<button class="admin-btn admin-btn--success" onclick="adminApprovePayment(' + p.id + ')">✅</button>' +
          '<button class="admin-btn admin-btn--danger" onclick="adminRejectPayment(' + p.id + ')">❌</button>' +
        '</div>';
    }

    return '<div class="admin-card admin-card--' + p.status + '">' +
      '<div class="admin-card__top">' +
        '<span class="admin-card__id">#' + p.id + '</span>' +
        '<span class="admin-card__status admin-card__status--' + p.status + '">' +
          (ADMIN_STATUS_LABELS[p.status] || p.status) +
        '</span>' +
      '</div>' +
      '<div class="admin-card__user">👤 ' + (p.first_name || '—') +
        ' (@' + (p.username || '—') + ')</div>' +
      '<div class="admin-card__info">' +
        '💰 ' + formatPrice(p.amount) + ' сум · ' +
        (ADMIN_METHOD_LABELS[p.payment_method] || p.payment_method) + ' · ' +
        (ADMIN_PURPOSE_LABELS[p.purpose] || p.purpose) +
      '</div>' +
      '<div class="admin-card__date">' + (p.date || '') + '</div>' +
      screenshotHtml +
      actionsHtml +
    '</div>';
  }).join('');
}

function adminApprovePayment(id) {
  adminRequest('/payments/' + id + '/approve', { method: 'POST' }).then(function () {
    showToast('✅ Платёж одобрен', 'success');
    loadAdminStats();
    loadAdminPayments();
  }).catch(function (err) {
    showToast(err.message, 'error');
  });
}

function adminRejectPayment(id) {
  adminRequest('/payments/' + id + '/reject', { method: 'POST' }).then(function () {
    showToast('❌ Платёж отклонён', 'error');
    loadAdminStats();
    loadAdminPayments();
  }).catch(function (err) {
    showToast(err.message, 'error');
  });
}

/**
 * Load orders
 */
function loadAdminOrders() {
  adminRequest('/orders').then(function (data) {
    renderAdminOrders(data.orders);
  }).catch(function (err) {
    showToast(err.message, 'error');
  });
}

function renderAdminOrders(orders) {
  var list = document.getElementById('adminOrdersList');
  if (!list) return;

  if (!orders.length) {
    list.innerHTML = '<div class="no-products">Заказов нет</div>';
    return;
  }

  list.innerHTML = orders.map(function (o) {
    return '<div class="admin-card admin-card--' + o.status + '">' +
      '<div class="admin-card__top">' +
        '<span class="admin-card__id">#' + o.id + '</span>' +
        '<span class="admin-card__status admin-card__status--' + o.status + '">' +
          (ADMIN_STATUS_LABELS[o.status] || o.status) +
        '</span>' +
      '</div>' +
      '<div class="admin-card__info">📦 ' + o.product_name + '</div>' +
      '<div class="admin-card__info">💰 ' + formatPrice(o.amount) + ' сум · ' +
        (ADMIN_METHOD_LABELS[o.payment_method] || o.payment_method) + '</div>' +
      '<div class="admin-card__user">👤 ' + (o.first_name || '—') + '</div>' +
      '<div class="admin-card__date">' + (o.date || '') + '</div>' +
    '</div>';
  }).join('');
}

/**
 * Load users
 */
function loadAdminUsers() {
  adminRequest('/users').then(function (data) {
    renderAdminUsers(data.users);
  }).catch(function (err) {
    showToast(err.message, 'error');
  });
}

function renderAdminUsers(users) {
  var list = document.getElementById('adminUsersList');
  if (!list) return;

  if (!users.length) {
    list.innerHTML = '<div class="no-products">Пользователей нет</div>';
    return;
  }

  list.innerHTML = users.map(function (u) {
    return '<div class="admin-card">' +
      '<div class="admin-card__top">' +
        '<span class="admin-card__user">👤 ' + u.first_name + ' ' + (u.last_name || '') + '</span>' +
      '</div>' +
      '<div class="admin-card__info">@' + (u.username || '—') + ' · ID: ' + u.telegram_id + '</div>' +
      '<div class="admin-card__info">💰 Баланс: <b>' + formatPrice(u.balance) + ' сум</b></div>' +
      '<div class="admin-card__date">С ' + (u.date || '') + '</div>' +
    '</div>';
  }).join('');
}

/**
 * Load and save card settings
 */
function loadAdminCardSettings() {
  adminRequest('/settings/payment').then(function (data) {
    document.getElementById('adminCardNumber').value = data.card_number || '';
    document.getElementById('adminCardHolder').value = data.card_holder || '';
    document.getElementById('adminBankName').value = data.bank_name || '';
  }).catch(function () {});
}

function saveAdminCardSettings() {
  var cardNumber = document.getElementById('adminCardNumber').value.trim();
  var cardHolder = document.getElementById('adminCardHolder').value.trim();
  var bankName = document.getElementById('adminBankName').value.trim();

  if (!cardNumber || !cardHolder) {
    showToast('Заполните карту и имя', 'error');
    return;
  }

  adminRequest('/settings/payment', {
    method: 'PUT',
    body: {
      card_number: cardNumber.replace(/\s/g, ''),
      card_holder: cardHolder,
      bank_name: bankName
    }
  }).then(function () {
    showToast('✅ Карта сохранена', 'success');
  }).catch(function (err) {
    showToast(err.message, 'error');
  });
}

// Init admin panel when on admin.html (called from script.js after user loaded)