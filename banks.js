/* Qarajat — Раздел «Банки» v2
 * Изолированный модуль. Перехватывает навигацию.
 * Открывается по ссылке: .../#banks
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'qarajat_accounts_v1';
  var SCREEN_ID = 'qarajat-banks-screen';

  /* ---------- Справочник банков РК ---------- */
  var BANKS = [
    { id: 'kaspi',      name: 'Kaspi Bank',        color: '#e4002b', short: 'K' },
    { id: 'halyk',      name: 'Halyk Bank',        color: '#00693e', short: 'H' },
    { id: 'forte',      name: 'ForteBank',         color: '#0055a5', short: 'F' },
    { id: 'jusan',      name: 'Jusan Bank',        color: '#00a0df', short: 'J' },
    { id: 'freedom',    name: 'Freedom Bank',      color: '#ff5c00', short: 'F' },
    { id: 'bcc',        name: 'Bank CenterCredit', color: '#f5a800', short: 'C' },
    { id: 'bereke',     name: 'Bereke Bank',       color: '#00a651', short: 'B' },
    { id: 'homecredit', name: 'Home Credit Bank',  color: '#ff6b00', short: 'H' },
    { id: 'altyn',      name: 'Altyn Bank',        color: '#b78e2f', short: 'A' },
    { id: 'rbk',        name: 'RBK Bank',          color: '#1a3c8c', short: 'R' },
    { id: 'nurbank',    name: 'Nurbank',           color: '#00448c', short: 'N' },
    { id: 'eurasian',   name: 'Eurasian Bank',     color: '#e30613', short: 'E' },
    { id: 'vtb',        name: 'VTB Kazakhstan',    color: '#0033a0', short: 'V' },
    { id: 'citi',       name: 'Citibank KZ',       color: '#0a5c9c', short: 'C' },
    { id: 'bock',       name: 'Bank of China KZ',  color: '#8b0000', short: 'B' },
    { id: 'alhilal',    name: 'Al Hilal Bank',     color: '#0b6b3a', short: 'A' },
    { id: 'capital',    name: 'Capital Bank',      color: '#1a3d7c', short: 'C' },
    { id: 'kzi',        name: 'KZI Bank',          color: '#2c5aa0', short: 'K' },
    { id: 'shinhan',    name: 'Shinhan Bank KZ',   color: '#0046ff', short: 'S' },
    { id: 'other',      name: 'Другой банк',       color: '#555',    short: '?' }
  ];

  var TYPES = {
    card:        { label: 'Банковская карта', icon: '💳', group: 'own' },
    current:     { label: 'Текущий счёт',     icon: '🏦', group: 'own' },
    deposit:     { label: 'Депозит',          icon: '💰', group: 'deposit' },
    credit:      { label: 'Кредит',           icon: '📉', group: 'debt' },
    installment: { label: 'Рассрочка',        icon: '🧾', group: 'debt' }
  };

  var CURRENCIES = ['KZT', 'USD', 'EUR', 'RUB'];

  /* ---------- Хранилище ---------- */
  function loadAccounts() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function saveAccounts(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function uid() {
    return 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function bankById(id) {
    for (var i = 0; i < BANKS.length; i++) if (BANKS[i].id === id) return BANKS[i];
    return BANKS[BANKS.length - 1];
  }

  function fmtMoney(n, cur) {
    n = Number(n) || 0;
    var s = Math.abs(n).toLocaleString('ru-RU');
    return (n < 0 ? '-' : '') + s + ' ' + (cur || 'KZT');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Экран ---------- */
  var root = null;

  function ensureRoot() {
    var el = document.getElementById(SCREEN_ID);
    if (el) { root = el; return; }
    el = document.createElement('div');
    el.id = SCREEN_ID;
    el.style.cssText = [
      'display:none', 'position:fixed', 'inset:0', 'z-index:9998',
      'background:#0b2b1e', 'color:#fff', 'overflow-y:auto',
      "font:16px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      '-webkit-overflow-scrolling:touch'
    ].join(';');
    document.body.appendChild(el);
    root = el;
  }

  function open() {
    ensureRoot();
    root.style.display = 'block';
    render();
    // Скрываем остальной интерфейс Qarajat, если он есть
    var appRoot = document.getElementById('app') || document.body;
    // Здесь можно добавить логику скрытия, если нужно
  }

  function close() {
    if (root) root.style.display = 'none';
    if (location.hash === '#banks') {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
    }
  }

  /* ---------- Рендер ---------- */
  function totals(list) {
    var own = 0, deposit = 0, debt = 0;
    list.forEach(function (a) {
      if (a.status === 'closed') return;
      var b = Number(a.balance) || 0;
      var g = TYPES[a.type] ? TYPES[a.type].group : 'own';
      if (g === 'own') own += b;
      else if (g === 'deposit') deposit += b;
      else if (g === 'debt') debt += Math.abs(b);
    });
    return { own: own, deposit: deposit, debt: debt, total: own + deposit - debt };
  }

  function statCard(label, value, color) {
    return '<div style="background:rgba(255,255,255,.04);border-radius:12px;padding:12px">' +
      '<div style="font-size:12px;opacity:.6;margin-bottom:4px">' + label + '</div>' +
      '<div style="font-size:15px;font-weight:700;color:' + color + '">' + fmtMoney(value, 'KZT') + '</div>' +
      '</div>';
  }

  function accountRow(a) {
    var t = TYPES[a.type] || TYPES.card;
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;' +
      'background:rgba(0,0,0,.2);margin-top:8px">' +
      '<div style="font-size:22px">' + t.icon + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(a.name) + '</div>' +
        '<div style="font-size:12px;opacity:.55">' + t.label + ' · ' + a.currency + '</div>' +
      '</div>' +
      '<div style="text-align:right;font-weight:600;color:' + (Number(a.balance) < 0 ? '#ff9b9b' : '#fff') + '">' +
        fmtMoney(a.balance, a.currency) +
      '</div>' +
      '<button data-edit="' + a.id + '" style="background:transparent;border:none;color:#ffd77a;font-size:16px;cursor:pointer;padding:6px">✏️</button>' +
      '<button data-del="' + a.id + '" style="background:transparent;border:none;color:#ff9b9b;font-size:16px;cursor:pointer;padding:6px">🗑</button>' +
      '</div>';
  }

  function render() {
    if (!root) return;
    var list = loadAccounts();
    var t = totals(list);
    var byBank = {};
    list.forEach(function (a) {
      if (a.status === 'closed') return;
      if (!byBank[a.bankId]) byBank[a.bankId] = [];
      byBank[a.bankId].push(a);
    });

    var banksHtml = '';
    if (list.length === 0) {
      banksHtml = '<div style="text-align:center;padding:40px 20px;opacity:.7">' +
        '<div style="font-size:48px;margin-bottom:12px">🏦</div>' +
        '<div style="margin-bottom:6px">Пока нет ни одного счёта</div>' +
        '<div style="font-size:14px;opacity:.7">Нажмите «+ Добавить счёт», чтобы начать</div>' +
        '</div>';
    } else {
      banksHtml = Object.keys(byBank).map(function (bankId) {
        var bank = bankById(bankId);
        var accs = byBank[bankId];
        var bankTotal = accs.reduce(function (s, a) {
          var b = Number(a.balance) || 0;
          var g = TYPES[a.type] ? TYPES[a.type].group : 'own';
          return s + (g === 'debt' ? -Math.abs(b) : b);
        }, 0);
        return '<div style="background:rgba(255,255,255,.04);border-radius:14px;padding:14px;margin-bottom:12px">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' +
            '<div style="width:42px;height:42px;border-radius:50%;background:' + bank.color + ';' +
              'display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;color:#fff">' + bank.short + '</div>' +
            '<div style="flex:1">' +
              '<div style="font-weight:600">' + bank.name + '</div>' +
              '<div style="font-size:13px;opacity:.6">' + accs.length + ' ' + (accs.length === 1 ? 'счёт' : 'счета') + '</div>' +
            '</div>' +
            '<div style="font-weight:600;color:' + (bankTotal < 0 ? '#ff9b9b' : '#ffd77a') + '">' + fmtMoney(bankTotal, 'KZT') + '</div>' +
          '</div>' +
          accs.map(accountRow).join('') +
          '</div>';
      }).join('');
    }

    root.innerHTML = '<div style="max-width:720px;margin:0 auto;padding:16px 16px 100px">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">' +
        '<button id="q-banks-close" style="background:rgba(255,255,255,.08);border:none;color:#fff;' +
          'width:40px;height:40px;border-radius:12px;font-size:20px;cursor:pointer">←</button>' +
        '<h1 style="margin:0;font-size:22px;font-weight:700;flex:1">Банки</h1>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">' +
        statCard('Общий баланс', t.total, '#ffd77a') +
        statCard('Собственные', t.own, '#a4e5b0') +
        statCard('Депозиты', t.deposit, '#a4c8e5') +
        statCard('Кредиты', -t.debt, '#ff9b9b') +
      '</div>' +
      '<button id="q-banks-add" style="width:100%;padding:14px;border:none;border-radius:12px;' +
        'background:linear-gradient(135deg,#c9a04e,#a8842e);color:#0b2b1e;font-weight:700;' +
        'font-size:16px;cursor:pointer;margin-bottom:20px">+ Добавить счёт</button>' +
      banksHtml +
      '</div>';

    document.getElementById('q-banks-close').onclick = close;
    document.getElementById('q-banks-add').onclick = function () { openForm(null); };
    var editBtns = root.querySelectorAll('[data-edit]');
    for (var i = 0; i < editBtns.length; i++) {
      editBtns[i].onclick = (function (el) {
        return function () { openForm(el.getAttribute('data-edit')); };
      })(editBtns[i]);
    }
    var delBtns = root.querySelectorAll('[data-del]');
    for (var j = 0; j < delBtns.length; j++) {
      delBtns[j].onclick = (function (el) {
        return function () { deleteAccount(el.getAttribute('data-del')); };
      })(delBtns[j]);
    }
  }

  /* ---------- Форма ---------- */
  function openForm(id) {
    var list = loadAccounts();
    var acc = id ? list.filter(function (x) { return x.id === id; })[0] : null;
    var isEdit = !!acc;

    var data = acc || {
      id: null, name: '', bankId: 'kaspi', type: 'card',
      currency: 'KZT', balance: '', status: 'active', note: ''
    };

    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7);' +
      'display:flex;align-items:flex-end;justify-content:center;';

    var banksOpts = BANKS.map(function (b) {
      return '<option value="' + b.id + '"' + (b.id === data.bankId ? ' selected' : '') + '>' + b.name + '</option>';
    }).join('');

    var typesOpts = Object.keys(TYPES).map(function (k) {
      return '<option value="' + k + '"' + (k === data.type ? ' selected' : '') + '>' + TYPES[k].icon + ' ' + TYPES[k].label + '</option>';
    }).join('');

    var currOpts = CURRENCIES.map(function (c) {
      return '<option' + (c === data.currency ? ' selected' : '') + '>' + c + '</option>';
    }).join('');

    modal.innerHTML =
      '<div style="background:#0f3627;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;' +
      'border-radius:20px 20px 0 0;padding:20px;color:#fff;' +
      "font:16px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
          '<h2 style="margin:0;font-size:20px">' + (isEdit ? 'Редактировать счёт' : 'Новый счёт') + '</h2>' +
          '<button id="q-f-close" style="background:rgba(255,255,255,.1);border:none;color:#fff;' +
            'width:36px;height:36px;border-radius:10px;font-size:20px;cursor:pointer">×</button>' +
        '</div>' +
        field('Название счёта', '<input id="q-f-name" value="' + escapeHtml(data.name) + '" placeholder="Например: Kaspi Gold" ' + inputStyle() + '>') +
        field('Банк', '<select id="q-f-bank" style="' + inputCss() + '">' + banksOpts + '</select>') +
        field('Тип счёта', '<select id="q-f-type" style="' + inputCss() + '">' + typesOpts + '</select>') +
        '<div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:14px">' +
          field('Баланс', '<input id="q-f-balance" type="number" step="0.01" value="' + (data.balance || '') + '" placeholder="0" ' + inputStyle() + '>') +
          field('Валюта', '<select id="q-f-currency" style="' + inputCss() + '">' + currOpts + '</select>') +
        '</div>' +
        field('Заметка', '<input id="q-f-note" value="' + escapeHtml(data.note || '') + '" placeholder="Необязательно" ' + inputStyle() + '>') +
        '<button id="q-f-save" style="width:100%;padding:16px;border:none;border-radius:12px;' +
          'background:linear-gradient(135deg,#c9a04e,#a8842e);color:#0b2b1e;font-weight:700;' +
          'font-size:16px;cursor:pointer;margin-bottom:10px">' + (isEdit ? 'Сохранить' : 'Добавить') + '</button>' +
        (isEdit ? '<button id="q-f-delete" style="width:100%;padding:14px;border:none;border-radius:12px;' +
          'background:rgba(255,120,120,.15);color:#ff9b9b;font-weight:600;font-size:15px;cursor:pointer">Удалить счёт</button>' : '') +
      '</div>';

    document.body.appendChild(modal);

    function closeModal() { if (modal.parentNode) modal.parentNode.removeChild(modal); }
    modal.querySelector('#q-f-close').onclick = closeModal;
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

    modal.querySelector('#q-f-save').onclick = function () {
      var name = modal.querySelector('#q-f-name').value.trim();
      var bankId = modal.querySelector('#q-f-bank').value;
      var type = modal.querySelector('#q-f-type').value;
      var balance = parseFloat(modal.querySelector('#q-f-balance').value) || 0;
      var currency = modal.querySelector('#q-f-currency').value;
      var note = modal.querySelector('#q-f-note').value.trim();

      if (!name) { alert('Введите название счёта'); return; }

      var all = loadAccounts();
      if (isEdit) {
        for (var i = 0; i < all.length; i++) {
          if (all[i].id === id) {
            all[i].name = name; all[i].bankId = bankId; all[i].type = type;
            all[i].balance = balance; all[i].currency = currency; all[i].note = note;
          }
        }
      } else {
        all.push({
          id: uid(), name: name, bankId: bankId, type: type, balance: balance,
          currency: currency, note: note, status: 'active',
          createdAt: new Date().toISOString().slice(0, 10)
        });
      }
      saveAccounts(all);
      closeModal();
      render();
    };

    var delBtn = modal.querySelector('#q-f-delete');
    if (delBtn) delBtn.onclick = function () { deleteAccount(id); closeModal(); };
  }

  function inputCss() {
    return 'width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:none;' +
      'background:rgba(255,255,255,.08);color:#fff;font-size:16px';
  }
  function inputStyle() { return 'style="' + inputCss() + '"'; }
  function field(label, input) {
    return '<label style="display:block;margin-bottom:14px">' +
      '<div style="font-size:13px;opacity:.7;margin-bottom:6px">' + label + '</div>' +
      input + '</label>';
  }

  function deleteAccount(id) {
    var list = loadAccounts();
    var acc = list.filter(function (x) { return x.id === id; })[0];
    if (!acc) return;
    if (!confirm('Удалить счёт «' + acc.name + '»?')) return;
    saveAccounts(list.filter(function (x) { return x.id !== id; }));
    render();
  }

  /* ---------- Перехват навигации ---------- */
  function handleHash() {
    if (location.hash === '#banks') {
      open();
    } else {
      if (root && root.style.display === 'block') {
        root.style.display = 'none';
      }
    }
  }

  // Перехватываем событие hashchange на фазе перехвата (capture),
  // чтобы наш обработчик сработал раньше основного роутера Qarajat.
  window.addEventListener('hashchange', function(e) {
    if (location.hash === '#banks') {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
    handleHash();
  }, true); // true = фаза перехвата

  // Также проверяем при загрузке
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleHash);
  } else {
    handleHash();
  }

  // Экспорт для ручного вызова
  window.QarajatBanks = { open: open, close: close, render: render };
})();
