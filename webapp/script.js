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
  { id: 22, name: '2398 Diamonds',    emoji: '💎', category: 'freefire', price: 202000 },
  { id: 23, name: '341 Diamonds',     emoji: '💎', category: 'freefire', price: 32000 },
  { id: 24, name: '1166 Diamonds',    emoji: '💎', category: 'freefire', price: 105500 },
  { id: 25, name: '6160 Diamonds',    emoji: '💎', category: 'freefire', price: 511000 }
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

// Home page games (rasm joylari — images/games/ papkasiga qo'ying)
var homeGamesList = [
  { id: 'standoff2', name: 'STAND OFF 2', img: 'images/games/standoff2.png', needsId: true, badge: '', maintenance: true },
  { id: 'freefire', name: 'FREE FIRE', img: 'images/games/freefire.png', needsId: true, badge: 'AVTO' },
  { id: 'bloodstrike', name: 'Blood Strike', img: 'images/games/bloodstrike.svg', needsId: true, badge: 'Global' },
  { id: 'bigo', name: 'Bigo Live', img: 'images/games/bigo.svg', needsId: false, href: 'products.html?category=gifts' },
  { id: 'steam', name: 'STEAM', img: 'images/games/steam.png', needsId: false, href: 'products.html?category=all' },
  { id: 'magicchess', name: 'MAGIC CHESS', img: 'images/games/magicchess.svg', needsId: true, badge: 'SNG' },
  { id: 'deltaforce', name: 'DELTA FORCE', img: 'images/games/deltaforce.svg', needsId: true, badge: 'GIFTS' },
  { id: 'shootloot', name: 'SHOOT AND LOOT', img: 'images/games/shootloot.svg', needsId: true },
  { id: 'pubg', name: 'PUBG MOBILE', img: 'images/games/pubg.png', needsId: true, badge: 'AVTO' }
];

var homePromoList = [
  { id: 'tgstars', name: 'TG STARS', img: 'images/games/tgstars.png', href: 'products.html?category=stars' },
  { id: 'tgpremium', name: 'TG PREMIUM', img: 'images/games/tgpremium.png', href: 'products.html?category=premium' },
  { id: 'tggifts', name: "Telegram Sovg'alar", img: 'images/games/tggifts.png', href: 'products.html?category=gifts' }
];

// ID kerak bo'lgan o'yinlar sahifasi
var gameConfigs = {
  freefire: {
    title: 'FREE FIRE',
    subtitle: '💎 Almazlar',
    img: 'images/games/freefire.png',
    storageKey: 'freefire',
    tabs: [
      { id: 'diamonds', label: 'Алмазы', icon: '💎' },
      { id: 'passes', label: 'Пропуски', icon: '🎫' }
    ],
    tabProducts: {
      diamonds: [
        { productId: 20, label: '110', price: 10400 },
        { productId: 23, label: '341', price: 32000 },
        { productId: 21, label: '572', price: 52700 },
        { productId: 24, label: '1166', price: 105500 },
        { productId: 22, label: '2398', price: 202000 },
        { productId: 25, label: '6160', price: 511000 }
      ],
      passes: []
    }
  },
  pubg: {
    title: 'PUBG MOBILE',
    subtitle: '🎮 UC',
    img: 'images/games/pubg.png',
    storageKey: 'pubg',
    tabs: [
      { id: 'uc', label: 'UC', icon: '🎮' }
    ],
    tabProducts: {
      uc: [
        { productId: 16, label: '60 UC', price: 11600 },
        { productId: 17, label: '120 UC', price: 23200 },
        { productId: 18, label: '180 UC', price: 34800 },
        { productId: 19, label: '325 UC', price: 59000 }
      ]
    }
  },
  standoff2: {
    title: 'STAND OFF 2',
    subtitle: 'Gold',
    img: 'images/games/standoff2.png',
    storageKey: 'standoff2',
    maintenance: true,
    tabs: [{ id: 'gold', label: 'Gold', icon: '🪙' }],
    tabProducts: { gold: [] }
  },
  bloodstrike: {
    title: 'Blood Strike',
    subtitle: 'Global',
    img: 'images/games/bloodstrike.png',
    storageKey: 'bloodstrike',
    tabs: [{ id: 'items', label: 'Mahsulotlar', icon: '🎯' }],
    tabProducts: { items: [] }
  },
  magicchess: {
    title: 'MAGIC CHESS',
    subtitle: 'Diamonds',
    img: 'images/games/magicchess.png',
    storageKey: 'magicchess',
    tabs: [{ id: 'diamonds', label: 'Diamonds', icon: '💎' }],
    tabProducts: { diamonds: [] }
  },
  deltaforce: {
    title: 'DELTA FORCE',
    subtitle: 'GIFTS',
    img: 'images/games/deltaforce.png',
    storageKey: 'deltaforce',
    tabs: [{ id: 'items', label: 'Mahsulotlar', icon: '🎁' }],
    tabProducts: { items: [] }
  },
  shootloot: {
    title: 'SHOOT AND LOOT',
    subtitle: 'Top-up',
    img: 'images/games/shootloot.png',
    storageKey: 'shootloot',
    tabs: [{ id: 'items', label: 'Mahsulotlar', icon: '🔫' }],
    tabProducts: { items: [] }
  }
};

var currentGameId = null;
var currentGameTab = null;
var selectedGameProductId = null;
var verifiedPlayerId = null;
var verifiedPlayerName = null;
var isVerifyingPlayer = false;
var currentHomeTab = 'games';

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
    .then(function () {
      renderProducts();
      renderHomeGames();
      initGamePage();
    });
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
function getProductImagePath(product) {
  if (!product) return '';
  var id = product.id;
  var name = product.name || '';
  if (product.category === 'gifts') {
    return 'images/products/gifts/' + id + '.png';
  }
  if (product.category === 'pubg') {
    return 'images/products/pubg/' + name.replace(/\s/g, '') + '.png';
  }
  if (product.category === 'freefire') {
    var qty = name.split(' ')[0];
    return 'images/products/freefire/' + qty + '.png';
  }
  if (product.category === 'stars') {
    return 'images/products/stars/' + id + '.png';
  }
  if (product.category === 'premium') {
    return 'images/products/premium/' + id + '.png';
  }
  return '';
}

function getProductImageFallback(product) {
  var primary = getProductImagePath(product);
  if (!primary) return '';
  if (product.category === 'gifts') {
    return primary.replace('.png', '.svg');
  }
  if (product.category === 'pubg') {
    return primary.replace('.png', '.svg');
  }
  return primary.replace('.png', '.svg');
}

function productCardImageHtml(product) {
  var src = getProductImagePath(product);
  var fallback = getProductImageFallback(product);
  if (!src) {
    return '<div class="product-card__emoji">' + (product.emoji || '🛍️') + '</div>';
  }
  return '<div class="product-card__img">' +
    '<img src="' + src + '" alt="' + product.name + '" onerror="this.onerror=null;this.src=\'' + fallback + '\';">' +
    '</div>';
}

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
      productCardImageHtml(p) +
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

  selectedProduct.img = getProductImagePath(selectedProduct) || selectedProduct.img;

  selectedPaymentMethod = null;
  resetPaymentModal();

  var modal = document.getElementById('paymentModal');
  if (!modal) return;

  document.getElementById('modalProductName').textContent = selectedProduct.name;
  document.getElementById('modalProductPrice').textContent = formatPrice(selectedProduct.price) + ' so\'m';

  var modalImg = document.getElementById('modalProductImg');
  var modalEmoji = document.getElementById('modalProductEmoji');
  if (modalImg && modalEmoji) {
    if (selectedProduct.img) {
      modalImg.src = selectedProduct.img;
      modalImg.classList.remove('hidden');
      modalEmoji.classList.add('hidden');
    } else {
      modalImg.classList.add('hidden');
      modalEmoji.classList.remove('hidden');
      modalEmoji.textContent = selectedProduct.emoji || '🛍️';
    }
  } else if (modalEmoji) {
    modalEmoji.textContent = selectedProduct.emoji || '🛍️';
  } else if (modalImg && selectedProduct.img) {
    modalImg.src = selectedProduct.img;
    modalImg.classList.remove('hidden');
  }

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
    body: Object.assign({
      amount: selectedProduct.price,
      payment_method: selectedPaymentMethod,
      purpose: 'product',
      product_id: selectedProduct.id
    }, getPlayerOrderMeta())
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
    body: Object.assign({ product_id: selectedProduct.id }, getPlayerOrderMeta())
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
  currentHomeTab = tab;
  var gamesEl = document.getElementById('homeGames');
  var promoEl = document.getElementById('homePromo');
  var tabs = document.querySelectorAll('.cat-tab');

  tabs.forEach(function (btn) {
    var isGames = btn.dataset.tab === 'games' || btn.textContent.indexOf('O\'yinlar') !== -1;
    btn.classList.toggle('active', (tab === 'games' && isGames) || (tab === 'promo' && !isGames));
  });

  if (gamesEl) gamesEl.classList.toggle('hidden', tab !== 'games');
  if (promoEl) promoEl.classList.toggle('hidden', tab !== 'promo');
  if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function imgPlaceholderHtml(src, alt) {
  return '<div class="img-placeholder">' +
    '<img src="' + src + '" alt="' + (alt || '') + '" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'img-placeholder--empty\')">' +
    '</div>';
}

function renderHomeGameTile(item) {
  var href = item.needsId ? 'game.html?game=' + item.id : (item.href || 'products.html');
  var badgeHtml = item.badge ? '<span class="game-tile__badge">' + item.badge + '</span>' : '';
  var maintHtml = item.maintenance ? '<div class="game-tile__overlay">TEXNIK ISH</div>' : '';
  return '<a class="game-tile' + (item.maintenance ? ' game-tile--disabled' : '') + '" href="' + (item.maintenance ? '#' : href) + '"' +
    (item.maintenance ? ' onclick="showToast(\'Texnik ishlar davom etmoqda\',\'error\');return false;"' : '') + '>' +
    badgeHtml +
    '<div class="game-tile__img-wrap">' + imgPlaceholderHtml(item.img, item.name) + maintHtml + '</div>' +
    '<div class="game-tile__name">' + item.name + '</div>' +
    '</a>';
}

function renderHomeGames() {
  var gamesGrid = document.getElementById('homeGames');
  var promoGrid = document.getElementById('homePromo');
  if (gamesGrid) {
    gamesGrid.innerHTML = homeGamesList.map(renderHomeGameTile).join('');
  }
  if (promoGrid) {
    promoGrid.innerHTML = homePromoList.map(renderHomeGameTile).join('');
  }
}

function getPlayerOrderMeta() {
  if (!verifiedPlayerId) return {};
  return {
    player_id: verifiedPlayerId,
    player_name: verifiedPlayerName || verifiedPlayerId
  };
}

function setGameProductsVisible(show) {
  var section = document.getElementById('gameProductsSection');
  if (section) section.classList.toggle('hidden', !show);
  if (!show) {
    selectedGameProductId = null;
    updateGameBuyButton();
  }
}

function showPlayerIdError(message) {
  var errEl = document.getElementById('playerIdError');
  if (errEl) {
    errEl.textContent = message;
    errEl.classList.remove('hidden');
  }
}

function hidePlayerIdError() {
  var errEl = document.getElementById('playerIdError');
  if (errEl) errEl.classList.add('hidden');
}

function showVerifiedPlayerCard(nickname, playerId) {
  var inputBlock = document.getElementById('playerIdInputBlock');
  var verifiedEl = document.getElementById('playerIdVerified');
  var nameEl = document.getElementById('verifiedPlayerName');
  var idEl = document.getElementById('verifiedPlayerIdDisplay');

  if (inputBlock) inputBlock.classList.add('hidden');
  if (verifiedEl) verifiedEl.classList.remove('hidden');
  if (nameEl) nameEl.textContent = nickname;
  if (idEl) idEl.textContent = playerId;
  hidePlayerIdError();
  setGameProductsVisible(true);
}

function resetPlayerVerification() {
  verifiedPlayerId = null;
  verifiedPlayerName = null;
  selectedGameProductId = null;

  var inputBlock = document.getElementById('playerIdInputBlock');
  var verifiedEl = document.getElementById('playerIdVerified');
  var input = document.getElementById('playerIdInput');

  if (inputBlock) inputBlock.classList.remove('hidden');
  if (verifiedEl) verifiedEl.classList.add('hidden');
  if (input) input.focus();
  hidePlayerIdError();
  setGameProductsVisible(false);
  updateGameBuyButton();
  document.querySelectorAll('.game-product-card').forEach(function (card) {
    card.classList.remove('selected');
  });
}

function getSavedPlayerIds(gameKey) {
  try {
    var raw = localStorage.getItem('savedIds_' + gameKey);
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    return parsed.map(function (item) {
      if (typeof item === 'string') return { id: item, nickname: '' };
      return { id: item.id, nickname: item.nickname || '' };
    });
  } catch (e) {
    return [];
  }
}

function savePlayerId(gameKey, id, nickname) {
  var ids = getSavedPlayerIds(gameKey).filter(function (item) { return item.id !== id; });
  ids.unshift({ id: id, nickname: nickname || '' });
  if (ids.length > 5) ids = ids.slice(0, 5);
  localStorage.setItem('savedIds_' + gameKey, JSON.stringify(ids));
}

function renderSavedIds(gameKey) {
  var container = document.getElementById('savedIds');
  if (!container) return;
  var ids = getSavedPlayerIds(gameKey);
  if (ids.length === 0) {
    container.innerHTML = '<span class="saved-ids__empty">Saqlangan ID yo\'q</span>';
    return;
  }
  container.innerHTML = ids.map(function (item) {
    return '<button type="button" class="saved-id-chip" onclick="selectSavedId(\'' + item.id + '\')">' + item.id + '</button>';
  }).join('');
}

function selectSavedId(id) {
  var input = document.getElementById('playerIdInput');
  if (input) input.value = id;
  resetPlayerVerification();
  verifyPlayerId();
}

function verifyPlayerId() {
  var input = document.getElementById('playerIdInput');
  var verifyBtn = document.getElementById('verifyBtn');
  if (!input || !currentGameId || isVerifyingPlayer) return;

  var id = input.value.trim().replace(/\s/g, '');
  if (!/^\d{5,15}$/.test(id)) {
    showPlayerIdError('To\'g\'ri o\'yinchi ID kiriting');
    verifiedPlayerId = null;
    verifiedPlayerName = null;
    setGameProductsVisible(false);
    updateGameBuyButton();
    return;
  }

  isVerifyingPlayer = true;
  if (verifyBtn) {
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Tekshirilmoqda...';
  }
  hidePlayerIdError();

  apiRequest('/api/games/verify-player', {
    method: 'POST',
    body: { game_id: currentGameId, player_id: id }
  }).then(function (data) {
    verifiedPlayerId = data.player_id;
    verifiedPlayerName = data.nickname;
    var config = gameConfigs[currentGameId];
    savePlayerId(config.storageKey, data.player_id, data.nickname);
    renderSavedIds(config.storageKey);
    showVerifiedPlayerCard(data.nickname, data.player_id);
    updateGameBuyButton();
    if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  }).catch(function (err) {
    verifiedPlayerId = null;
    verifiedPlayerName = null;
    setGameProductsVisible(false);
    showPlayerIdError(err.message || 'O\'yinchi topilmadi');
    if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
  }).finally(function () {
    isVerifyingPlayer = false;
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Tekshirish';
    }
  });
}

function switchGameTab(tabId) {
  currentGameTab = tabId;
  var tabsEl = document.getElementById('gameProductTabs');
  if (tabsEl) {
    tabsEl.querySelectorAll('.game-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
  }
  renderGameProducts();
}

function renderGameProducts() {
  var grid = document.getElementById('gameProductsGrid');
  if (!grid || !currentGameId || !currentGameTab) return;

  var config = gameConfigs[currentGameId];
  var items = (config.tabProducts && config.tabProducts[currentGameTab]) || [];

  if (items.length === 0) {
    grid.innerHTML = '<div class="no-products">Mahsulotlar tez orada qo\'shiladi</div>';
    selectedGameProductId = null;
    updateGameBuyButton();
    return;
  }

  grid.innerHTML = items.map(function (item) {
    var imgSrc = 'images/products/' + currentGameId + '/' + item.label.replace(/\s/g, '') + '.png';
    var selected = selectedGameProductId === item.productId ? ' selected' : '';
    return '<div class="game-product-card' + selected + '" data-id="' + item.productId + '" onclick="selectGameProduct(' + item.productId + ')">' +
      '<div class="game-product-card__img">' + imgPlaceholderHtml(imgSrc, item.label) + '</div>' +
      '<div class="game-product-card__body">' +
        '<div class="game-product-card__qty">' + item.label + '</div>' +
        '<div class="game-product-card__price">' + formatPrice(item.price) + ' so\'m</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function selectGameProduct(productId) {
  if (!verifiedPlayerId) {
    showToast('Avval o\'yinchi ID ni tekshiring', 'error');
    return;
  }
  selectedGameProductId = productId;
  document.querySelectorAll('.game-product-card').forEach(function (card) {
    card.classList.toggle('selected', parseInt(card.dataset.id) === productId);
  });
  updateGameBuyButton();
  if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function updateGameBuyButton() {
  var btn = document.getElementById('gameBuyBtn');
  if (!btn) return;
  btn.disabled = !(verifiedPlayerId && selectedGameProductId);
}

function buySelectedGameProduct() {
  if (!verifiedPlayerId) {
    showToast('Avval o\'yinchi ID ni tekshiring', 'error');
    return;
  }
  if (!selectedGameProductId) {
    showToast('Mahsulotni tanlang', 'error');
    return;
  }
  openPaymentModal(selectedGameProductId);
}

function initGamePage() {
  var params = new URLSearchParams(window.location.search);
  var gameId = params.get('game');
  if (!gameId || !gameConfigs[gameId]) return;

  currentGameId = gameId;
  var config = gameConfigs[gameId];

  if (config.maintenance) {
    showToast('Texnik ishlar davom etmoqda', 'error');
    setTimeout(function () { window.location.href = 'index.html'; }, 1500);
    return;
  }

  var titleEl = document.getElementById('gameTitle');
  var subEl = document.getElementById('gameSubtitle');
  var imgEl = document.getElementById('gameHeaderImg');
  if (titleEl) titleEl.textContent = config.title;
  if (subEl) subEl.textContent = config.subtitle;
  if (imgEl) {
    imgEl.src = config.img;
    imgEl.alt = config.title;
    imgEl.onerror = function () {
      imgEl.style.display = 'none';
      imgEl.parentElement.classList.add('img-placeholder--empty');
    };
  }

  renderSavedIds(config.storageKey);
  setGameProductsVisible(false);

  var tabsEl = document.getElementById('gameProductTabs');
  if (tabsEl && config.tabs.length) {
    tabsEl.innerHTML = config.tabs.map(function (tab, i) {
      return '<button type="button" class="game-tab' + (i === 0 ? ' active' : '') + '" data-tab="' + tab.id + '" onclick="switchGameTab(\'' + tab.id + '\')">' +
        tab.icon + ' ' + tab.label + '</button>';
    }).join('');
    currentGameTab = config.tabs[0].id;
    renderGameProducts();
  }

  var input = document.getElementById('playerIdInput');
  if (input) {
    input.addEventListener('input', function () {
      if (verifiedPlayerId) resetPlayerVerification();
    });
  }
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
    renderHomeGames();
    initGamePage();
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
