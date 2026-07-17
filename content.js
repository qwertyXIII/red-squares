// shared/red-squares/content.js
// Тестовое расширение: спавнит красные квадраты + попап для управления пресетами.
// Пресеты хранятся на сервере через window.extensionConfigs (тест загрузчика конфигов).
// Формат пресета: data = { squareCount: <int>, color: <hex> }.
(function () {
  'use strict';

  if (window.__RED_SQUARES_EXT_ACTIVE__) return;
  window.__RED_SQUARES_EXT_ACTIVE__ = true;

  // ==================== RUNTIME SETTINGS (применённый пресет) ====================
  const settings = {
    squareCount: 30,
    color: '#ffd900'
  };
  const SQUARE_SIZE = 80;
  const SPAWN_INTERVAL = 200;
  const MIN_LIFETIME = 3000;
  const MAX_LIFETIME = 7000;

  const hasConfigs = typeof window.extensionConfigs === 'function';
  const log = (m) => { if (typeof window.extensionLogs === 'function') window.extensionLogs(m); };

  // ==================== ДВИЖОК КВАДРАТОВ ====================
  let activeCount = 0;
  let intervalId = null;

  function getRandomInt(max) { return Math.floor(Math.random() * max); }

  function createSquare() {
    if (activeCount >= settings.squareCount) return;
    const el = document.createElement('div');
    const maxX = window.innerWidth - SQUARE_SIZE;
    const maxY = window.innerHeight - SQUARE_SIZE;
    const posX = getRandomInt(Math.max(0, maxX));
    const posY = getRandomInt(Math.max(0, maxY));

    Object.assign(el.style, {
      position: 'fixed',
      left: posX + 'px',
      top: posY + 'px',
      width: SQUARE_SIZE + 'px',
      height: SQUARE_SIZE + 'px',
      backgroundColor: settings.color,
      borderRadius: '8px',
      zIndex: '2147483000',
      pointerEvents: 'none',
      opacity: '0',
      transform: 'scale(0.5)',
      transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
    });

    document.body.appendChild(el);
    activeCount++;

    requestAnimationFrame(() => {
      el.style.opacity = '0.9';
      el.style.transform = 'scale(1)';
    });

    const lifetime = MIN_LIFETIME + Math.random() * (MAX_LIFETIME - MIN_LIFETIME);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'scale(0.5)';
      setTimeout(() => {
        if (el.parentNode) { el.parentNode.removeChild(el); activeCount--; }
      }, 300);
    }, lifetime);
  }

  function startEngine() {
    if (intervalId) return;
    intervalId = setInterval(createSquare, SPAWN_INTERVAL);
  }
  function stopEngine() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
  }

  // ==================== ПОПАП / UI ====================
  // Все стили инлайновые с !important-подобной изоляцией, чтобы CSS страницы
  // (покер-рума) не ломал внешний вид панели.
  const Z = '2147483647';
  let currentPresetId = null;

  function el(tag, styles, props) {
    const e = document.createElement(tag);
    if (styles) Object.assign(e.style, styles);
    if (props) Object.assign(e, props);
    return e;
  }

  const panel = el('div', {
    position: 'fixed', top: '16px', right: '16px', width: '260px',
    background: '#1c1c1e', color: '#f2f2f7', zIndex: Z,
    borderRadius: '12px', padding: '14px', boxShadow: '0 8px 30px rgba(0,0,0,.5)',
    font: '13px/1.4 -apple-system, Segoe UI, Roboto, sans-serif',
    boxSizing: 'border-box', border: '1px solid #333'
  });

  const fab = el('div', {
    position: 'fixed', top: '16px', right: '16px', width: '40px', height: '40px',
    background: settings.color, color: '#fff', zIndex: Z, borderRadius: '50%',
    display: 'none', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.4)', fontSize: '18px',
    userSelect: 'none'
  }, { textContent: '◱', title: 'Red Squares' });

  function showPanel() { panel.style.display = 'block'; fab.style.display = 'none'; }
  function hidePanel() { panel.style.display = 'none'; fab.style.display = 'flex'; }

  // --- header ---
  const header = el('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' });
  header.appendChild(el('div', { fontWeight: '700', fontSize: '14px' }, { textContent: '🟥 Red Squares' }));
  const closeBtn = el('div', { cursor: 'pointer', opacity: '0.6', fontSize: '18px', lineHeight: '1' }, { textContent: '×', title: 'Свернуть' });
  closeBtn.addEventListener('click', hidePanel);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  const labelStyle = { display: 'block', fontSize: '11px', color: '#8e8e93', margin: '8px 0 3px', textTransform: 'uppercase', letterSpacing: '.03em' };
  const inputStyle = { width: '100%', boxSizing: 'border-box', background: '#2c2c2e', color: '#fff', border: '1px solid #3a3a3c', borderRadius: '8px', padding: '7px 9px', font: 'inherit', outline: 'none' };
  const btnStyle = { boxSizing: 'border-box', border: 'none', borderRadius: '8px', padding: '8px 10px', font: 'inherit', fontWeight: '600', cursor: 'pointer' };

  // --- preset selector ---
  panel.appendChild(el('label', labelStyle, { textContent: 'Пресет' }));
  const rowSel = el('div', { display: 'flex', gap: '6px' });
  const presetSelect = el('select', { ...inputStyle, flex: '1' });
  const refreshBtn = el('button', { ...btnStyle, background: '#3a3a3c', color: '#fff', padding: '8px 10px' }, { textContent: '⟳', title: 'Обновить список' });
  rowSel.appendChild(presetSelect);
  rowSel.appendChild(refreshBtn);
  panel.appendChild(rowSel);

  const rowSelBtns = el('div', { display: 'flex', gap: '6px', marginTop: '6px' });
  const applyBtn = el('button', { ...btnStyle, background: settings.color, color: '#fff', flex: '1' }, { textContent: 'Применить' });
  const deleteBtn = el('button', { ...btnStyle, background: '#2c2c2e', color: '#ff453a', border: '1px solid #3a3a3c' }, { textContent: 'Удалить' });
  rowSelBtns.appendChild(applyBtn);
  rowSelBtns.appendChild(deleteBtn);
  panel.appendChild(rowSelBtns);

  // --- divider ---
  panel.appendChild(el('div', { height: '1px', background: '#333', margin: '12px 0' }));

  // --- create preset form ---
  panel.appendChild(el('div', { fontWeight: '600', marginBottom: '2px' }, { textContent: 'Новый пресет' }));

  panel.appendChild(el('label', labelStyle, { textContent: 'Название' }));
  const nameInput = el('input', inputStyle, { type: 'text', placeholder: 'напр. many-blue' });

  panel.appendChild(nameInput);

  const rowCC = el('div', { display: 'flex', gap: '8px' });
  const colCount = el('div', { flex: '1' });
  colCount.appendChild(el('label', labelStyle, { textContent: 'Кол-во квадратов' }));
  const countInput = el('input', inputStyle, { type: 'number', min: '1', max: '500', value: String(settings.squareCount) });
  colCount.appendChild(countInput);
  const colColor = el('div', { width: '70px' });
  colColor.appendChild(el('label', labelStyle, { textContent: 'Цвет' }));
  const colorInput = el('input', { ...inputStyle, padding: '2px', height: '34px' }, { type: 'color', value: settings.color });
  colColor.appendChild(colorInput);
  rowCC.appendChild(colCount);
  rowCC.appendChild(colColor);
  panel.appendChild(rowCC);

  const createBtn = el('button', { ...btnStyle, background: '#0a84ff', color: '#fff', width: '100%', marginTop: '10px' }, { textContent: 'Создать пресет' });
  panel.appendChild(createBtn);

  // --- status ---
  const status = el('div', { fontSize: '11px', color: '#8e8e93', marginTop: '10px', minHeight: '14px' });
  panel.appendChild(status);

  function setStatus(msg, isError) {
    status.textContent = msg || '';
    status.style.color = isError ? '#ff453a' : '#30d158';
  }

  // ==================== CONFIG-ЛОГИКА ====================
  function optionLabel(c) {
    return c.name;
  }

  async function refreshPresetList(selectId) {
    if (!hasConfigs) return;
    try {
      const { configs } = await extensionConfigs({ action: 'list' });
      presetSelect.innerHTML = '';
      if (!configs.length) {
        const o = el('option', null, { value: '', textContent: '— нет пресетов —', disabled: true });
        presetSelect.appendChild(o);
      } else {
        configs.forEach(c => {
          const o = el('option', null, { value: String(c.id), textContent: optionLabel(c) });
          presetSelect.appendChild(o);
        });
        if (selectId != null) presetSelect.value = String(selectId);
      }
      setStatus(`Пресетов: ${configs.length}`, false);
    } catch (e) {
      setStatus('Ошибка списка: ' + e.message, true);
    }
  }

  function applySettings(count, color) {
    settings.squareCount = Math.max(1, Math.min(500, parseInt(count, 10) || settings.squareCount));
    settings.color = color || settings.color;
    // отражаем в UI
    fab.style.background = settings.color;
    applyBtn.style.background = settings.color;
    log(`APPLY PRESET | count=${settings.squareCount} color=${settings.color}`);
  }

  async function applySelectedPreset() {
    const id = presetSelect.value;
    if (!id) { setStatus('Выберите пресет', true); return; }
    try {
      const { config } = await extensionConfigs({ action: 'get', id });
      const d = config.data || {};
      applySettings(d.squareCount, d.color);
      currentPresetId = config.id;
      setStatus(`Применён «${config.name}»`, false);
    } catch (e) {
      setStatus('Ошибка загрузки: ' + e.message, true);
    }
  }

  async function createPreset() {
    const name = nameInput.value.trim();
    if (!name) { setStatus('Введите название', true); return; }
    const data = {
      squareCount: Math.max(1, Math.min(500, parseInt(countInput.value, 10) || 30)),
      color: colorInput.value || '#ff453a'
    };
    createBtn.disabled = true;
    try {
      const res = await extensionConfigs({ action: 'create', name, data });
      setStatus(`Создан «${name}»`, false);
      nameInput.value = '';
      await refreshPresetList(res.config.id);
    } catch (e) {
      setStatus('Ошибка создания: ' + e.message, true);
    } finally {
      createBtn.disabled = false;
    }
  }

  async function deleteSelectedPreset() {
    const id = presetSelect.value;
    if (!id) { setStatus('Выберите пресет', true); return; }
    try {
      await extensionConfigs({ action: 'delete', id });
      if (String(currentPresetId) === String(id)) currentPresetId = null;
      setStatus('Пресет удалён', false);
      await refreshPresetList();
    } catch (e) {
      setStatus('Ошибка удаления: ' + e.message, true);
    }
  }

  // ==================== WIRING ====================
  refreshBtn.addEventListener('click', () => refreshPresetList());
  applyBtn.addEventListener('click', applySelectedPreset);
  deleteBtn.addEventListener('click', deleteSelectedPreset);
  createBtn.addEventListener('click', createPreset);
  fab.addEventListener('click', showPanel);

  if (!hasConfigs) {
    presetSelect.disabled = applyBtn.disabled = deleteBtn.disabled = refreshBtn.disabled = createBtn.disabled = true;
    setStatus('extensionConfigs недоступен (запусти через загрузчик)', true);
  }

  // ==================== INIT ====================
  function mount() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', mount); return; }
    document.body.appendChild(panel);
    document.body.appendChild(fab);
    startEngine();
    log('EXTENSION STARTED | Red Squares + presets');
    if (hasConfigs) refreshPresetList();
  }

  mount();

  window.addEventListener('beforeunload', () => {
    stopEngine();
    window.__RED_SQUARES_EXT_ACTIVE__ = false;
  });
})();
