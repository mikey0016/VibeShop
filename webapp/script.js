/* ============================================
   VibeShop Mini App - Main Script
   ============================================ */

// Global Telegram WebApp instance
var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

// Backend API base URL
var API_BASE = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : window.location.origin;

// User data (populated from Telegram or fallback)
var userData = {
  id: 0,
  firstName: 'Гость',
  lastName: '',
  username: 'guest',
  photoUrl: '',
  balance: 0,
  isAdmin: false
};

// Current selected payment method
var selectedPaymentMethod = null;

// Currently selected product for purchase
var selectedProduct = null;

// All products data (22 items)
var products = [
  { id: 1,  name: 'Flover Bear',      emoji: '🌸', category: 'gifts',    price: 14000 },
  { id: 2,  name: 'Omadli Bear',      emoji: '🍀', category: 'gifts',    price: 14000 },
  { id: 3,  name: 'Rabbit Bear',      emoji: '🐰', category: 'gifts',    price: 14000 },
  { id: 4,  name: 'Usta Bear',        emoji: '🔧', category: 'gifts',    price: 14000 },
  { id: 5,  name: 'Yurakli Ayiq',     emoji: '💝', category: 'gifts',    price: 14000 },
  { id: 6,  name: 'Clown Bear',       emoji: '🤡', category: 'gifts',    price: 14000 },
  { id: 7,  name: 'Yangi Yil Bear',   emoji: '🎄', category: 'gifts',    price: 14000 },
  { id: 8,  name: 'Yurak "LOVE"',     emoji: '❤️', category: 'gifts',    price: 14000 },
  { id: 9,  name: 'Archa',            emoji: '🌲', category: 'gifts',    price: 14000 },
  { id: 10, name: '3 Oylik Premium',  emoji: '⭐', category: 'premium',  price: 169000 },
  { id: 11, name: '6 Oylik Premium',  emoji: '⭐', category: 'premium',  price: 225000 },
  { id: 12, name: '12 Oylik Premium', emoji: '⭐', category: 'premium',  price: 409000 },
  { id: 13, name: '50 Stars',         emoji: '✨', category: 'stars',    price: 10750 },
  { id: 14, name: '100 Stars',        emoji: '✨', category: 'stars',    price: 21500 },
  { id: 15, name: '250 Stars',        emoji: '✨', category: 'stars',    price: 53750 },
  { id: 16, name: '60 UC',            emoji: '🎮', category: 'pubg',     price: 11600 },
  { id: 17, name: '120 UC',           emoji: '🎮', category: 'pubg',     price: 23200 },
  { id: 18, name: '180 UC',           emoji: '🎮', category: 'pubg',     price: 34800 },
  { id: 19, name: '325 UC',           emoji: '🎮', category: 'pubg',     price: 59000 },
  { id: 20, name: '110 Diamonds',     emoji: '💎', category: 'freefire', price: 10400 },
  { id: 21, name: '572 Diamonds',     emoji: '💎', category: 'freefire', price: 52700 },
  { id: 22, name: '2398 Diamonds',    emoji: '💎', category: 'freefire', price: 202000 }
];

// Category labels mapping
var categoryLabels = {
  all: 'Barchasi',
  gifts: 'Sog\'alar',
  premium: 'Premium',
  stars: 'TG Stars',
  pubg: 'PUBG Mobile',
  freefire: 'Free Fire'
};

var categoryEmojis = {
  all: '🛍️',
  gifts: '🎁',
  premium: '⭐',
  stars: '✨',
  pubg: '🎮',
  freefire: '💎'
};

// History records
var historyRecords = [
  { id: 1, product: '100 Stars',       date: '05.07.2026', amount: 21500,  status: 'success' },
  { id: 2, product: 'Flover Bear',     date: '03.07.2026', amount: 14000,  status: 'success' },
  { id: 3, product: '3 Oylik Premium', date: '01.07.2026', amount: 169000, status: 'pending' },
  { id: 4, product: '60 UC',           date: '28.06.2026', amount: 11600,  status: 'failed' }
];

// Status labels
var statusLabels = {
  success: 'Bajarildi',
  pending: 'Kutilmoqda',
  failed: 'Muvaffaqiyatsiz'
};

var currentCategory = 'all';
var currentSearch = '';
var currentHistoryTab = 'orders';
var currentHistoryFilter = 'all';
var financeRecords = [];

// Payment state
var currentPayment = null;
var paymentTimerInterval = null;
var selectedScreenshotFile = null;
var topupAmount = 0;
var topupMethod = null;
var topupScreenshotFile = null;

/* ============================================
   Backend API
   ============================================ */

/**
 * Build headers for authenticated API requests
 */
function getApiHeaders() {
  var headers = { 'Content-Type': 'application/json' };
  if (tg && tg.initData) {
    headers['X-Telegram-Init-Data'] = tg.initData;
  }
  return headers;
}

/**
 * Generic API fetch helper
 */
function apiRequest(path, options) {
  options = options || {};
  var fetchOptions = {
    method: options.method || 'GET',
    headers: getApiHeaders()
  };
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }
  return fetch(API_BASE + path, fetchOptions).then(function (res) {
    if (!res.ok) {
      return res.text().then(function (text) {
        var err = {};
        try { err = JSON.parse(text); } catch (e) { /* not json */ }
        var msg = err.detail || err.message;
        if (!msg && text && text.length < 150) msg = text;
        if (!msg) {
          if (res.status === 405) msg = 'Server xatosi (405). Keyinroq urinib ko\'ring.';
          else if (res.status === 401) msg = 'Telegram orqali qayta oching';
          else if (res.status === 502 || res.status === 503) msg = 'Server vaqtincha ishlamayapti';
          else msg = res.statusText || 'API xatosi';
        }
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      });
    }
    return res.json();
  });
}

/**
 * Load products from backend API
 */
function loadProductsFromAPI() {
  return apiRequest('/api/products').then(function (data) {
    if (data.products && data.products.length) {
      products = data.products;
    }
  }).catch(function (err) {
    console.warn('Products API fallback:', err.message);
  });
}

/**
 * Load user profile and balance from backend
 */
function loadUserFromAPI() {
  if (!tg || !tg.initData) return Promise.resolve();

  return apiRequest('/api/user/me').then(function (data) {
    userData.id = data.id;
    userData.firstName = data.first_name || userData.firstName;
    userData.lastName = data.last_name || '';
    userData.username = data.username ? '@' + data.username : userData.username;
    userData.balance = data.balance || 0;
    userData.isAdmin = data.is_admin || false;
    if (data.photo_url) userData.photoUrl = data.photo_url;
    updateUserUI();
    if (typeof showAdminLinkIfNeeded === 'function') showAdminLinkIfNeeded();
  }).catch(function (err) {
    console.warn('User API fallback:', err.message);
  });
}

/**
 * Load order history from backend
 */
function loadHistoryFromAPI() {
  if (!tg || !tg.initData) return Promise.resolve();

  return apiRequest('/api/user/history').then(function (data) {
    if (data.history) {
      historyRecords = data.history.map(function (item) {
        return {
          id: item.id,
          product: item.product_name,
          date: item.date,
          amount: item.amount,
          status: item.status
        };
      });
      renderHistory();
    }
  }).catch(function (err) {
    console.warn('History API fallback:', err.message);
  });
}

function loadFinanceFromAPI() {
  if (!tg || !tg.initData) return Promise.resolve();

  return apiRequest('/api/user/finance').then(function (data) {
    if (data.finance) {
      financeRecords = data.finance;
      if (currentHistoryTab === 'finance') renderHistory();
    }
  }).catch(function (err) {
    console.warn('Finance API fallback:', err.message);
  });
}

/**
 * Load all backend data after Telegram init
 */
function loadBackendData() {
  return loadProductsFromAPI()
    .then(function () { return loadUserFromAPI(); })
    .then(function () { return loadHistoryFromAPI(); })
    .then(function () { return loadFinanceFromAPI(); })
    .then(function () { renderProducts(); });
}

/* ============================================
   Initialization
   ============================================ */

/**
 * Initialize Telegram WebApp and load user data
 */
function initTelegramApp() {
  if (tg) {
    tg.ready();
    tg.expand();

    if (tg.themeParams) {
      document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#0f0f1a');
    }

    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      var user = tg.initDataUnsafe.user;
      userData.id = user.id;
      userData.firstName = user.first_name || 'Пользователь';
      userData.lastName = user.last_name || '';
      userData.username = user.username ? '@' + user.username : '';
      userData.photoUrl = user.photo_url || '';
    }

    // Yopishda tasdiqlash so'ramaslik — ma'lumotlar saqlanadi
    if (tg.disableClosingConfirmation) {
      tg.disableClosingConfirmation();
    }
  }

  loadSettings();
  updateUserUI();
  setActiveNav();
}

/**
 * Load theme and notification settings from localStorage
 */
function loadSettings() {
  var savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  }

  var darkToggle = document.getElementById('darkThemeToggle');
  if (darkToggle) {
    darkToggle.checked = savedTheme !== 'light';
  }

  var notifToggle = document.getElementById('notificationsToggle');
  if (notifToggle) {
    notifToggle.checked = localStorage.getItem('notifications') !== 'false';
  }
}

/**
 * Update user avatar, name, balance in header and profile
 */
function updateUserUI() {
  var fullName = userData.firstName + (userData.lastName ? ' ' + userData.lastName : '');
  var avatarSrc = userData.photoUrl || getDefaultAvatar(fullName);
  var balanceFormatted = formatPrice(userData.balance);

  document.querySelectorAll('.header__avatar, .topbar__avatar, .profile-card__avatar').forEach(function (el) {
    el.src = avatarSrc;
  });
  document.querySelectorAll('.header__name, .topbar__name, .profile-card__name').forEach(function (el) {
    el.textContent = fullName;
  });
  document.querySelectorAll('.header__username, .topbar__username, .profile-card__username').forEach(function (el) {
    el.textContent = userData.username || '';
  });

  document.querySelectorAll('.topbar__coin .header__balance-value').forEach(function (el) {
    el.textContent = balanceFormatted;
  });
  document.querySelectorAll('.balance-hero__amount .header__balance-value').forEach(function (el) {
    el.textContent = balanceFormatted;
  });
  document.querySelectorAll('.profile-card__balance').forEach(function (el) {
    el.textContent = balanceFormatted;
  });
}

/**
 * Generate default avatar URL from name initials
 */
function getDefaultAvatar(name) {
  var initials = name.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase();
  return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(initials) + '&background=8b5cf6&color=fff&size=128';
}

/**
 * Format number as price with spaces
 */
function formatPrice(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Highlight active navigation item
 */
function setActiveNav() {
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  var navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(function (item) {
    var href = item.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/* ============================================
   Products Page Functions
   ============================================ */

/**
 * Render products grid based on filters
 */
function renderProducts() {
  var grid = document.getElementById('productsGrid');
  var countEl = document.getElementById('productsCount');
  if (!grid) return;

  var filtered = products.filter(function (p) {
    var matchCategory = currentCategory === 'all' || p.category === currentCategory;
    var matchSearch = currentSearch === '' || p.name.toLowerCase().indexOf(currentSearch.toLowerCase()) !== -1;
    return matchCategory && matchSearch;
  });

  if (countEl) {
    countEl.textContent = filtered.length + ' ta mahsulot';
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="no-products">😔 Mahsulot topilmadi</div>';
    return;
  }

  grid.innerHTML = filtered.map(function (p) {
    return '<div class="product-card">' +
      '<div class="product-card__emoji">' + p.emoji + '</div>' +
      '<div class="product-card__name">' + p.name + '</div>' +
      '<div class="product-card__price">' + formatPrice(p.price) + ' so\'m</div>' +
      '<button class="product-card__buy" onclick="openPaymentModal(' + p.id + ')">Sotib olish</button>' +
      '</div>';
  }).join('');
}

/**
 * Filter products by category
 */
function filterByCategory(category) {
  currentCategory = category;

  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.category === category);
  });

  updateCategoryHeader(category);
  renderProducts();
}

/**
 * Search products by name
 */
function searchProducts(query) {
  currentSearch = query;
  renderProducts();
}

/* ============================================
   Payment Modal
   ============================================ */

function showElement(id, show) {
  var el = document.getElementById(id);
  if (el) el.classList.toggle('hidden', !show);
}

function resetPaymentModal() {
  stopPaymentTimer();
  currentPayment = null;
  selectedScreenshotFile = null;
  showElement('paymentStep1', true);
  showElement('paymentStep2', false);
  showElement('bankomatSection', false);
  showElement('cardToCardSection', false);
  var preview = document.getElementById('screenshotPreview');
  if (preview) { preview.src = ''; preview.classList.add('hidden'); }
  var uploadBtn = document.getElementById('uploadBtn');
  if (uploadBtn) uploadBtn.disabled = true;
}

function openPaymentModal(productId) {
  selectedProduct = products.find(function (p) { return p.id === productId; });
  if (!selectedProduct) return;

  selectedPaymentMethod = null;
  resetPaymentModal();

  var modal = document.getElementById('paymentModal');
  if (!modal) return;

  document.getElementById('modalProductEmoji').textContent = selectedProduct.emoji;
  document.getElementById('modalProductName').textContent = selectedProduct.name;
  document.getElementById('modalProductPrice').textContent = formatPrice(selectedProduct.price) + ' so\'m';

  var methods = document.querySelectorAll('#paymentStep1 .payment-method');
  methods.forEach(function (m) { m.classList.remove('selected'); });

  document.getElementById('payButton').disabled = true;
  modal.classList.add('active');

  if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
}

function closePaymentModal() {
  var modal = document.getElementById('paymentModal');
  if (modal) modal.classList.remove('active');
  resetPaymentModal();
  selectedProduct = null;
  selectedPaymentMethod = null;
}

function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  var methods = document.querySelectorAll('#paymentStep1 .payment-method');
  methods.forEach(function (m) {
    m.classList.toggle('selected', m.dataset.method === method);
  });
  document.getElementById('payButton').disabled = false;
  if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function startProductPayment() {
  if (!selectedProduct || !selectedPaymentMethod) {
    showToast('To\'lov usulini tanlang', 'error');
    return;
  }

  if (selectedPaymentMethod === 'balance') {
    buyProductWithBalance();
    return;
  }

  apiRequest('/api/payments', {
    method: 'POST',
    body: {
      amount: selectedProduct.price,
      payment_method: selectedPaymentMethod,
      purpose: 'product',
      product_id: selectedProduct.id
    }
  }).then(function (data) {
    currentPayment = data;
    showPaymentStep2(data, 'pay');
  }).catch(function (err) {
    showToast(err.message || 'To\'lov xatosi', 'error');
  });
}

function buyProductWithBalance() {
  apiRequest('/api/orders/balance', {
    method: 'POST',
    body: { product_id: selectedProduct.id }
  }).then(function (data) {
    userData.balance = data.balance;
    updateUserUI();
    showToast('✅ Mahsulot sotib olindi!', 'success');
    closePaymentModal();
    loadHistoryFromAPI();
  }).catch(function (err) {
    showToast(err.message || 'Balans yetarli emas', 'error');
  });
}

function showPaymentStep2(payment, prefix) {
  prefix = prefix || 'pay';

  if (prefix === 'pay') {
    showElement('paymentStep1', false);
    showElement('paymentStep2', true);
  } else {
    showElement('topupStep1', false);
    showElement('topupStep2', true);
  }

  var cardNumEl = document.getElementById(prefix === 'topup' ? 'topupCardNumber' : 'payCardNumber');
  var cardHolderEl = document.getElementById(prefix === 'topup' ? 'topupCardHolder' : 'payCardHolder');
  var amountEl = document.getElementById(prefix === 'topup' ? 'topupPayAmount' : 'payAmount');
  var timerEl = document.getElementById(prefix === 'topup' ? 'topupTimer' : 'paymentTimer');

  if (cardNumEl) cardNumEl.textContent = formatCardNumber(payment.card_number);
  if (cardHolderEl) cardHolderEl.textContent = payment.card_holder;
  if (amountEl) amountEl.textContent = formatPrice(payment.amount) + ' so\'m';

  if (payment.payment_method === 'bankomat') {
    showElement(prefix === 'topup' ? 'topupBankomatSection' : 'bankomatSection', true);
    showElement(prefix === 'topup' ? 'topupCardSection' : 'cardToCardSection', false);
  } else {
    showElement(prefix === 'topup' ? 'topupBankomatSection' : 'bankomatSection', false);
    showElement(prefix === 'topup' ? 'topupCardSection' : 'cardToCardSection', true);
  }

  startPaymentTimer(payment.expires_at, timerEl);
}

function formatCardNumber(num) {
  return num.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function copyText(elementId) {
  var el = document.getElementById(elementId);
  if (!el) return;
  var text = el.textContent.replace(/\s/g, '');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    showToast('Nusxa olindi!', 'success');
  }
}

function startPaymentTimer(expiresAt, timerEl) {
  stopPaymentTimer();
  if (!timerEl) return;

  var expires = new Date(expiresAt.replace(' ', 'T') + 'Z');
  if (isNaN(expires.getTime())) {
    expires = new Date(Date.now() + 5 * 60 * 1000);
  }

  function tick() {
    var diff = expires - Date.now();
    if (diff <= 0) {
      timerEl.textContent = '00:00';
      timerEl.classList.add('payment-timer__value--expired');
      stopPaymentTimer();
      showToast('To\'lov vaqti tugadi', 'error');
      return;
    }
    var mins = Math.floor(diff / 60000);
    var secs = Math.floor((diff % 60000) / 1000);
    timerEl.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  tick();
  paymentTimerInterval = setInterval(tick, 1000);
}

function stopPaymentTimer() {
  if (paymentTimerInterval) {
    clearInterval(paymentTimerInterval);
    paymentTimerInterval = null;
  }
}

function onScreenshotSelected(event) {
  var file = event.target.files[0];
  if (!file) return;
  selectedScreenshotFile = file;
  var preview = document.getElementById('screenshotPreview');
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('hidden');
  document.getElementById('uploadLabel').textContent = '✅ ' + file.name;
  document.getElementById('uploadBtn').disabled = false;
}

function submitBankomatPayment() {
  if (!currentPayment || !selectedScreenshotFile) {
    showToast('Skrinshot yuklang', 'error');
    return;
  }

  var formData = new FormData();
  formData.append('file', selectedScreenshotFile);

  var headers = getApiHeaders();
  delete headers['Content-Type'];

  fetch(API_BASE + '/api/payments/' + currentPayment.payment_id + '/screenshot', {
    method: 'POST',
    headers: headers,
    body: formData
  }).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      return data;
    });
  }).then(function () {
    showToast('✅ Skrinshot yuborildi! Tasdiqlashni kuting.', 'success');
    closePaymentModal();
  }).catch(function (err) {
    showToast(err.message, 'error');
  });
}

function confirmCardPayment() {
  if (!currentPayment) return;

  apiRequest('/api/payments/' + currentPayment.payment_id + '/confirm', {
    method: 'POST'
  }).then(function (data) {
    if (data.new_balance !== undefined) userData.balance = data.new_balance;
    updateUserUI();
    showToast('✅ To\'lov tasdiqlandi!', 'success');
    closePaymentModal();
    loadHistoryFromAPI();
  }).catch(function (err) {
    showToast(err.message, 'error');
  });
}

/* ============================================
   Top-up Page
   ============================================ */

function selectTopupAmount(amount) {
  topupAmount = amount;
  document.getElementById('topupAmountInput').value = amount;
  var buttons = document.querySelectorAll('.amount-btn');
  buttons.forEach(function (btn) {
    btn.classList.toggle('active', parseInt(btn.textContent.replace(/\s/g, '')) === amount);
  });
  updateTopupButton();
}

function selectTopupMethod(method) {
  topupMethod = method;
  document.querySelectorAll('#topupStep1 .pay-tile').forEach(function (m) {
    m.classList.toggle('selected', m.dataset.method === method);
  });
  updateTopupButton();
}

function updateTopupButton() {
  var input = document.getElementById('topupAmountInput');
  if (input && input.value) topupAmount = parseInt(input.value) || 0;
  var btn = document.getElementById('topupStartBtn');
  if (btn) btn.disabled = !(topupAmount >= 1000 && topupMethod);
}

function startTopupPayment() {
  var input = document.getElementById('topupAmountInput');
  topupAmount = parseInt(input.value) || topupAmount;
  if (topupAmount < 1000 || !topupMethod) {
    showToast('Summa va usulni tanlang', 'error');
    return;
  }

  apiRequest('/api/payments', {
    method: 'POST',
    body: {
      amount: topupAmount,
      payment_method: topupMethod,
      purpose: 'topup'
    }
  }).then(function (data) {
    currentPayment = data;
    showElement('topupStep1', false);
    showElement('topupStep2', true);
    showPaymentStep2(data, 'topup');
  }).catch(function (err) {
    showToast(err.message || 'Ошибка', 'error');
  });
}

function onTopupScreenshotSelected(event) {
  var file = event.target.files[0];
  if (!file) return;
  topupScreenshotFile = file;
  var preview = document.getElementById('topupScreenshotPreview');
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('hidden');
  document.getElementById('topupUploadLabel').textContent = '✅ ' + file.name;
  document.getElementById('topupUploadBtn').disabled = false;
}

function submitTopupBankomat() {
  if (!currentPayment || !topupScreenshotFile) {
    showToast('Skrinshot yuklang', 'error');
    return;
  }

  var formData = new FormData();
  formData.append('file', topupScreenshotFile);
  var headers = getApiHeaders();
  delete headers['Content-Type'];

  fetch(API_BASE + '/api/payments/' + currentPayment.payment_id + '/screenshot', {
    method: 'POST',
    headers: headers,
    body: formData
  }).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      return data;
    });
  }).then(function () {
    showToast('✅ Скриншот отправлен! Admin tasdiqlashini kuting.', 'success');
    resetTopup();
  }).catch(function (err) {
    showToast(err.message, 'error');
  });
}

function confirmTopupCard() {
  if (!currentPayment) return;

  apiRequest('/api/payments/' + currentPayment.payment_id + '/confirm', {
    method: 'POST'
  }).then(function (data) {
    userData.balance = data.new_balance;
    updateUserUI();
    showToast('✅ Balans yangilandi!', 'success');
    resetTopup();
  }).catch(function (err) {
    showToast(err.message, 'error');
  });
}

function resetTopup() {
  stopPaymentTimer();
  currentPayment = null;
  topupScreenshotFile = null;
  topupAmount = 0;
  topupMethod = null;
  showElement('topupStep1', true);
  showElement('topupStep2', false);
  var input = document.getElementById('topupAmountInput');
  if (input) input.value = '';
  document.querySelectorAll('.amount-btn').forEach(function (b) { b.classList.remove('active'); });
  document.querySelectorAll('#topupStep1 .pay-tile').forEach(function (m) { m.classList.remove('selected'); });
  var btn = document.getElementById('topupStartBtn');
  if (btn) btn.disabled = true;
}

/* ============================================
   History Page
   ============================================ */

function getProductEmoji(name) {
  var lower = (name || '').toLowerCase();
  if (lower.indexOf('diamond') !== -1 || lower.indexOf('free fire') !== -1) return '💎';
  if (lower.indexOf('uc') !== -1 || lower.indexOf('pubg') !== -1) return '🎮';
  if (lower.indexOf('star') !== -1) return '✨';
  if (lower.indexOf('premium') !== -1) return '⭐';
  if (lower.indexOf('bear') !== -1 || lower.indexOf('yurak') !== -1) return '🎁';
  return '🛍️';
}

function getFinanceIcon(method) {
  if (method === 'bankomat') return '🏧';
  if (method === 'card_to_card') return '💳';
  return '💰';
}

function getFinanceTitle(item) {
  if (item.purpose === 'topup') {
    if (item.payment_method === 'bankomat') return 'Bankomat orqali to\'ldirish';
    if (item.payment_method === 'card_to_card') return 'Karta orqali to\'ldirish';
    return 'Balans to\'ldirish';
  }
  return 'Mahsulot xaridi';
}

function switchHistoryTab(tab) {
  currentHistoryTab = tab;
  document.querySelectorAll('.segmented__btn').forEach(function (btn) {
    var isOrders = btn.textContent.indexOf('Buyurtmalar') !== -1;
    btn.classList.toggle('active', (tab === 'orders' && isOrders) || (tab === 'finance' && !isOrders));
  });
  renderHistory();
}

function filterHistory(status) {
  currentHistoryFilter = status;
  document.querySelectorAll('#historyFilters .filter-btn').forEach(function (btn) {
    var labels = { all: 'Barchasi', success: 'Bajarildi', pending: 'Kutilmoqda', failed: 'Muvaffaqiyatsiz' };
    btn.classList.toggle('active', btn.textContent === labels[status]);
  });
  renderHistory();
}

function renderHistory() {
  var list = document.getElementById('historyList');
  var countEl = document.getElementById('historyCount');
  if (!list) return;

  if (currentHistoryTab === 'finance') {
    renderFinanceHistory(list, countEl);
    return;
  }

  var filtered = historyRecords.filter(function (item) {
    return currentHistoryFilter === 'all' || item.status === currentHistoryFilter;
  });

  if (countEl) {
    countEl.textContent = filtered.length + ' ta buyurtma';
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="no-products">📭 Buyurtmalar yo\'q</div>';
    return;
  }

  list.innerHTML = filtered.map(function (item) {
    var emoji = getProductEmoji(item.product);
    return '<div class="history-item">' +
      '<div class="history-item__header">' +
        '<div class="history-item__icon">' + emoji + '</div>' +
        '<div class="history-item__info">' +
          '<div class="history-item__name">' + item.product + '</div>' +
          '<div class="history-item__sub">' + emoji + ' mahsulot</div>' +
        '</div>' +
        '<div class="history-item__amount history-item__amount--negative">-' + formatPrice(item.amount) + ' so\'m</div>' +
      '</div>' +
      '<div class="history-item__rows">' +
        '<div class="history-item__row">' +
          '<span class="history-item__row-label">Holat</span>' +
          '<span class="history-item__status history-item__status--' + item.status + '">' + statusLabels[item.status] + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="history-item__footer">' +
        '<span>' + item.date + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderFinanceHistory(list, countEl) {
  var filtered = financeRecords.filter(function (item) {
    return currentHistoryFilter === 'all' || item.status === currentHistoryFilter;
  });

  if (countEl) {
    countEl.textContent = filtered.length + ' ta operatsiya';
  }

  if (filtered.length === 0) {
    list.innerHTML = '<div class="no-products">📭 Moliya yozuvlari yo\'q</div>';
    return;
  }

  list.innerHTML = filtered.map(function (item) {
    var icon = getFinanceIcon(item.payment_method);
    var title = getFinanceTitle(item);
    var status = item.status === 'awaiting_admin' ? 'pending' : item.status;
    var statusText = statusLabels[status] || item.status;
    var amountClass = item.status === 'success' ? 'history-item__amount--positive' : '';

    return '<div class="history-item">' +
      '<div class="history-item__header">' +
        '<div class="history-item__icon">' + icon + '</div>' +
        '<div class="history-item__info">' +
          '<div class="history-item__name">' + title + '</div>' +
          '<div class="history-item__sub">' + (item.payment_method || '') + '</div>' +
        '</div>' +
        '<div class="history-item__amount ' + amountClass + '">+' + formatPrice(item.amount) + ' so\'m</div>' +
      '</div>' +
      '<div class="history-item__rows">' +
        '<div class="history-item__row">' +
          '<span class="history-item__row-label">Holat</span>' +
          '<span class="history-item__status history-item__status--' + status + '">' + statusText + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="history-item__footer">' +
        '<span>' + item.date + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function showAdminLinkIfNeeded() {
  var link = document.getElementById('adminPanelLink');
  if (!link) return;

  if (userData.isAdmin) {
    link.classList.remove('hidden');
  } else {
    link.classList.add('hidden');
  }
}

/* ============================================
   Settings Page
   ============================================ */

/**
 * Toggle dark/light theme
 */
function toggleTheme(isDark) {
  if (isDark) {
    document.body.classList.remove('light-theme');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
  }

  if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

/**
 * Toggle notifications setting
 */
function toggleNotifications(enabled) {
  localStorage.setItem('notifications', enabled ? 'true' : 'false');
  showToast(enabled ? 'Уведомления включены' : 'Уведомления выключены', 'success');
}

/**
 * Close Telegram Mini App
 */
function closeApp() {
  if (tg) {
    tg.close();
  } else {
    showToast('Приложение закрыто (Demo mode)', 'success');
  }
}

/**
 * Close WebApp from profile page
 */
function closeProfile() {
  closeApp();
}

/* ============================================
   Profile Menu Actions
   ============================================ */

function switchHomeTab(tab) {
  var gamesEl = document.getElementById('homeGames');
  var telegramEl = document.getElementById('homeTelegram');
  var tabs = document.querySelectorAll('.cat-tab');

  tabs.forEach(function (btn) {
    var isGames = btn.textContent.indexOf('O\'yinlar') !== -1;
    btn.classList.toggle('active', (tab === 'games' && isGames) || (tab === 'telegram' && !isGames));
  });

  if (gamesEl) gamesEl.classList.toggle('hidden', tab !== 'games');
  if (telegramEl) telegramEl.classList.toggle('hidden', tab !== 'telegram');
  if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function openTopUp() {
  window.location.href = 'topup.html';
}

function openBalance() {
  showToast('Balans: ' + formatPrice(userData.balance) + ' so\'m', 'success');
}

function openBonusCodes() {
  var input = document.getElementById('bonusCodeInput');
  var code = input ? input.value.trim() : '';
  if (!code) {
    showToast('Bonus kodini kiriting', 'error');
    return;
  }
  showToast('Bonus kod tez orada faollashtiriladi', 'success');
}

/* ============================================
   Home Page - Category Navigation
   ============================================ */

function goToCategory(category) {
  window.location.href = 'products.html?category=' + category;
}

function updateCategoryHeader(category) {
  var titleEl = document.getElementById('categoryTitle');
  var subEl = document.getElementById('categorySub');
  var emojiEl = document.getElementById('categoryEmoji');
  if (!titleEl) return;

  var label = categoryLabels[category] || categoryLabels.all;
  titleEl.textContent = label.toUpperCase();
  if (subEl) subEl.textContent = category === 'all' ? 'Barcha toifalar' : label;
  if (emojiEl) emojiEl.textContent = categoryEmojis[category] || categoryEmojis.all;
}

function initProductsFromURL() {
  var params = new URLSearchParams(window.location.search);
  var category = params.get('category');
  if (category && categoryLabels[category]) {
    currentCategory = category;
    document.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    updateCategoryHeader(category);
  } else {
    updateCategoryHeader('all');
  }
}

function openSupport() {
  if (tg) {
    tg.openTelegramLink('https://t.me/VibeShop_support');
  } else {
    showToast('Qo\'llab-quvvatlash: @VibeShop_support', 'success');
  }
}

/* ============================================
   Toast Notifications
   ============================================ */

/**
 * Show a toast message
 */
function showToast(message, type) {
  var toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = 'toast show ' + (type || '');

  setTimeout(function () {
    toast.classList.remove('show');
  }, 3000);
}

/* ============================================
   DOM Ready
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  initTelegramApp();
  initProductsFromURL();

  loadBackendData().then(function () {
    renderProducts();
    renderHistory();
    if (typeof initAdminPanel === 'function') initAdminPanel();
  });

  var searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      searchProducts(e.target.value);
    });
  }

  var topupInput = document.getElementById('topupAmountInput');
  if (topupInput) {
    topupInput.addEventListener('input', updateTopupButton);
  }

  var modalOverlay = document.getElementById('paymentModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) closePaymentModal();
    });
  }
});
