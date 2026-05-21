// ===== GAME ENGINE =====
// Core game logic, state management, and UI rendering

// ===== GAME STATE =====
let gameState = {
  mode: 'classic',
  money: INITIAL_MONEY,
  startTime: null,
  elapsedTime: 0,
  speed: 1,
  operations: 0,
  activeCategory: 'consumption',
  cooldowns: {},
  stocks: {},
  logs: [],
  exclusiveOperation: null,
  moneySpentCount: {},
  pendingBetAction: null
};

let gameLoopInterval = null;

// ===== UTILITY FUNCTIONS =====
function formatMoney(amount) {
  const abs = Math.abs(amount);
  let sign = amount < 0 ? '-' : '';
  if (abs >= 1e12) return sign + '$' + (abs / 1e12).toFixed(2) + '万亿';
  if (abs >= 1e8) return sign + '$' + (abs / 1e8).toFixed(2) + '亿';
  if (abs >= 1e4) return sign + '$' + (abs / 1e4).toFixed(0) + '万';
  return sign + '$' + abs.toLocaleString();
}

function formatTime(ms) {
  if (gameState.mode === 'endless') return '无尽模式';
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}天 ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatTimeShort(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return m + '分' + (s % 60) + '秒';
  return s + '秒';
}

function getTimestamp() {
  const d = new Date();
  return d.getHours().toString().padStart(2, '0') + ':' +
         d.getMinutes().toString().padStart(2, '0') + ':' +
         d.getSeconds().toString().padStart(2, '0');
}

function getGameTime() {
  if (!gameState.startTime) return 0;
  return gameState.elapsedTime + (Date.now() - gameState.startTime) * gameState.speed;
}

function getRemainingTime() {
  if (gameState.mode === 'endless') return Infinity;
  return Math.max(0, 7 * 86400000 - getGameTime());
}

function getStock(actionId) {
  const stockData = gameState.stocks[actionId];
  if (!stockData) return null;

  // 使用游戏时间检查是否需要补货
  const gameTime = getGameTime();
  if (gameTime >= stockData.gameResetAt) {
    // 刷新库存并返回新对象
    gameState.stocks[actionId] = {
      count: stockData.max,
      max: stockData.max,
      cd: stockData.cd,
      gameResetAt: gameTime + stockData.cd * gameState.speed
    };
    // 从新对象返回count
    return gameState.stocks[actionId].count;
  }
  return stockData.count;
}

function getCostMultiplier(actionId) {
  const count = gameState.moneySpentCount[actionId] || 0;
  return Math.min(3, 1 + count * 0.15);
}

// ===== LOG SYSTEM =====
function addLog(text, amount, type = 'neutral') {
  const entry = {
    time: getTimestamp(),
    text: text,
    amount: amount,
    type: type
  };
  gameState.logs.unshift(entry);
  if (gameState.logs.length > 200) gameState.logs.pop();
  renderLogs();
}

function renderLogs() {
  const container = document.getElementById('logEntries');
  if (!container) return;

  container.innerHTML = gameState.logs.slice(0, 50).map(log => `
    <div class="log-entry ${log.type}">
      <div class="log-time">${log.time}</div>
      <div class="log-text">
        ${log.text}
        <span class="log-amount ${log.amount < 0 ? 'negative' : log.amount > 0 ? 'positive' : ''}">
          ${log.amount !== 0 ? formatMoney(log.amount) : ''}
        </span>
      </div>
    </div>
  `).join('');
}

function clearLog() {
  gameState.logs = [];
  renderLogs();
}

// ===== UI RENDERING =====
function renderCategories() {
  const container = document.getElementById('categoryTabs');
  if (!container) return;

  container.innerHTML = CATEGORIES.map(cat => `
    <div class="category-tab ${gameState.activeCategory === cat.id ? 'active' : ''}"
         data-category="${cat.id}">
      <span class="category-tab-icon">${cat.icon}</span>
      <span>${cat.name}</span>
    </div>
  `).join('');

  // Add click handlers
  container.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => selectCategory(tab.dataset.category));
  });
}

function renderActions() {
  const container = document.getElementById('actionsPanel');
  if (!container) return;

  const actions = ACTIONS[gameState.activeCategory] || [];
  const cat = CATEGORIES.find(c => c.id === gameState.activeCategory);

  let html = `<div class="section-title">${cat ? cat.name : ''} · 操作列表</div>`;

  actions.forEach(action => {
    const cdKey = action.id;
    const remaining = (gameState.cooldowns[cdKey] || 0) / gameState.speed;
    const isOnCd = remaining > 0;
    const isExclusiveBusy = gameState.exclusiveOperation !== null && action.type === 'exclusive';
    const isParallelBusy = gameState.exclusiveOperation !== null && action.type === 'parallel';
    const isDisabled = isOnCd || isExclusiveBusy || (isParallelBusy && action.type === 'parallel');
    const stockCount = getStock(action.id);
    const stockEmpty = action.stock > 0 && stockCount <= 0;
    const costMultiplier = getCostMultiplier(action.id);
    const displayCost = Math.floor(action.baseCost * costMultiplier);

    let footerHtml = '';
    if (isOnCd) {
      footerHtml = `<span class="cooldown-timer">⏳ ${formatTimeShort(remaining)}</span>`;
    } else {
      footerHtml = `<span class="action-cd">CD: ${formatTimeShort(action.cd / gameState.speed)}</span>`;
    }

    html += `
      <div class="action-card ${isDisabled || stockEmpty ? 'disabled' : ''} ${isOnCd ? 'on-cooldown' : ''}"
           data-action="${action.id}">
        <div class="action-header">
          <span class="action-name">${action.name}</span>
          <span class="action-badge ${action.type}">${action.type === 'exclusive' ? '独占' : '并行'}</span>
        </div>
        <div class="action-desc">${action.desc}</div>
        <div class="action-footer">
          <span class="action-cost">${formatMoney(displayCost)}</span>
          ${footerHtml}
        </div>
        ${stockCount !== null ? `<div class="stock-info">库存: ${stockCount}${action.stockCd ? ' (次日刷新)' : ''}</div>` : ''}
        ${costMultiplier > 1 ? `<div class="cost-multiplier">价格已上涨×${costMultiplier.toFixed(1)}</div>` : ''}
      </div>
    `;
  });

  container.innerHTML = html;

  // Add click handlers
  container.querySelectorAll('.action-card:not(.disabled)').forEach(card => {
    card.addEventListener('click', () => executeAction(card.dataset.action));
  });
}

function updateDisplay() {
  const remaining = getRemainingTime();
  const money = gameState.money;

  // Time display
  const timeEl = document.getElementById('timeDisplay');
  if (timeEl) timeEl.textContent = formatTime(remaining);

  // Money display
  const moneyEl = document.getElementById('moneyDisplay');
  if (moneyEl) {
    moneyEl.textContent = formatMoney(money);
    moneyEl.className = 'stat-value big' + (money < 0 ? ' danger' : '');
  }

  // Operation count
  const opEl = document.getElementById('opCount');
  if (opEl) opEl.textContent = gameState.operations;

  // Progress bar
  const spent = INITIAL_MONEY - money;
  const percent = Math.min(100, (spent / INITIAL_MONEY) * 100);
  const progressFill = document.getElementById('progressFill');
  if (progressFill) {
    progressFill.style.width = percent + '%';
    progressFill.className = 'progress-fill' + (percent > 80 ? ' danger' : '');
  }

  // Exclusive indicator
  const indicator = document.getElementById('exclusiveIndicator');
  const exclusiveText = document.getElementById('exclusiveText');
  if (indicator && exclusiveText) {
    if (gameState.exclusiveOperation) {
      indicator.classList.add('active');
      exclusiveText.textContent = `独占操作进行中: ${gameState.exclusiveOperation}`;
    } else {
      indicator.classList.remove('active');
    }
  }

  // Update cooldowns
  for (const key in gameState.cooldowns) {
    if (gameState.cooldowns[key] > 0) {
      gameState.cooldowns[key] = Math.max(0, gameState.cooldowns[key] - 50 * gameState.speed);
    }
  }
}

// ===== GAME ACTIONS =====
function findAction(actionId) {
  for (const cat of Object.values(ACTIONS)) {
    const found = cat.find(a => a.id === actionId);
    if (found) return found;
  }
  return null;
}

function executeAction(actionId) {
  const action = findAction(actionId);
  if (!action) return;

  // Check exclusive lock
  if (action.type === 'exclusive' && gameState.exclusiveOperation) {
    addLog('⚠️ 独占操作进行中，无法执行新操作', 0, 'bad');
    return;
  }

  if (action.type === 'parallel' && gameState.exclusiveOperation) {
    addLog('⚠️ 当前有独占操作进行中', 0, 'bad');
    return;
  }

  // Check stock
  if (action.stock > 0) {
    const stock = getStock(actionId);
    if (stock <= 0) {
      addLog(`⚠️ ${action.name} 库存已售罄，等待补货`, 0, 'bad');
      return;
    }
  }

  // Execute direct - skip bet modal for all modes
  doAction(action);
}

function doAction(action) {
  const costMultiplier = getCostMultiplier(action.id);
  const cost = Math.floor(action.baseCost * costMultiplier);

  if (gameState.money < cost) {
    addLog(`⚠️ 资金不足，无法执行 ${action.name}`, 0, 'bad');
    return;
  }

  gameState.money -= cost;
  gameState.operations++;
  gameState.moneySpentCount[action.id] = (gameState.moneySpentCount[action.id] || 0) + 1;

  // Handle exclusive operations
  if (action.type === 'exclusive') {
    gameState.exclusiveOperation = action.name;
    gameState.cooldowns[action.id] = action.cd;
    addLog(`▶️ 开始执行: ${action.name}`, -cost, 'neutral');

    // Money animation
    const moneyEl = document.getElementById('moneyDisplay');
    if (moneyEl) {
      moneyEl.classList.add('money-burn');
      setTimeout(() => moneyEl.classList.remove('money-burn'), 400);
    }

    setTimeout(() => {
      gameState.exclusiveOperation = null;
      // 显式清除cooldown
      delete gameState.cooldowns[action.id];

      // Handle investment results
      if (action.invest && action.bigInvest) {
        handleBigInvestResult(action);
      } else if (action.gamble) {
        handleGambleResult(action, cost);
      } else {
        addLog(`✅ ${action.name} 已完成`, 0, 'neutral');
      }

      renderActions();
    }, action.cd / gameState.speed);

  } else {
    // Parallel - immediate with cooldown
    gameState.cooldowns[action.id] = action.cd;
    addLog(`${action.name}`, -cost, 'neutral');

    // Update stock
    if (action.stock > 0 && gameState.stocks[action.id]) {
      gameState.stocks[action.id].count--;
    }

    // Money animation
    const moneyEl = document.getElementById('moneyDisplay');
    if (moneyEl) {
      moneyEl.classList.add('money-burn');
      setTimeout(() => moneyEl.classList.remove('money-burn'), 400);
    }

    // Investment returns after delay
    if (action.invest) {
      setTimeout(() => handleInvestResult(action), 2000 + Math.random() * 3000);
    }
  }
}

function handleGambleResult(action, cost) {
  const roll = Math.random();

  if (action.id === 'casino') {
    if (roll < 0.38) {
      const win = Math.floor(cost * 1.75);
      gameState.money += win;
      addLog(`🎰 幸运获胜！赢得 ${formatMoney(win - cost)}`, win - cost, 'good');
    } else {
      addLog(`🎰 庄家通吃，亏损 ${formatMoney(cost)}`, -cost, 'bad');
    }
  } else if (action.id === 'match') {
    if (roll < 0.33) {
      const win = cost * 2;
      gameState.money += win;
      addLog(`🏆 赛事爆冷！赢得 ${formatMoney(cost)}`, cost, 'good');
    } else {
      addLog(`🏆 赛事落败，亏损 ${formatMoney(cost)}`, -cost, 'bad');
    }
  } else if (action.gamble) {
    if (roll < action.winRate) {
      const win = Math.floor(cost * action.winMultiplier);
      gameState.money += win;
      addLog(`🎁 盲盒暴击！赢得 ${formatMoney(win - cost)}`, win - cost, 'good');
    } else {
      addLog(`📦 盲盒未中，亏损 ${formatMoney(cost)}`, -cost, 'bad');
    }
  }
}

function handleBigInvestResult(action) {
  const roll = Math.random();

  if (roll < 0.7) {
    addLog(`💸 风投项目烂尾，亏损全部投资`, -action.baseCost, 'bad');
  } else if (roll < 0.9) {
    addLog(`📊 风投项目保本，勉强维持`, 0, 'neutral');
    gameState.money += action.baseCost;
  } else {
    const profit = action.baseCost;
    gameState.money += profit * 2;
    addLog(`🚀 风投项目翻倍！盈利 ${formatMoney(profit)}`, profit, 'good');
    // Tax
    const tax = Math.floor(profit * 0.5);
    gameState.money -= tax;
    addLog(`🏛️ 盈利税扣除 ${formatMoney(tax)}`, -tax, 'bad');
  }
}

function handleInvestResult(action) {
  const multiplier = 1 + (Math.random() - 0.5) * action.volatility * 2;
  const result = Math.floor(action.baseCost * multiplier);
  const diff = result - action.baseCost;

  if (diff > 0) {
    const tax = Math.floor(diff * 0.5);
    gameState.money += result - tax;
    addLog(`📈 ${action.name} 盈利 ${formatMoney(diff - tax)} (税后)`, diff - tax, 'good');
  } else {
    addLog(`📉 ${action.name} 亏损 ${formatMoney(Math.abs(diff))}`, diff, 'bad');
  }

  updateDisplay();
}

// ===== BET MODAL =====
function openBetModal(action) {
  gameState.pendingBetAction = action;
  const modal = document.getElementById('betModal');
  const title = document.getElementById('betModalTitle');
  const hint = document.getElementById('betModalHint');
  const input = document.getElementById('betAmountInput');

  if (modal) modal.style.display = 'flex';
  if (title) title.textContent = action.name + ' - 设置投注';
  if (hint) hint.textContent = '可用资金: ' + formatMoney(gameState.money);
  if (input) {
    input.value = '';
    input.max = gameState.money;
    input.placeholder = '输入投注金额';
  }
}

function closeBetModal() {
  const modal = document.getElementById('betModal');
  if (modal) modal.style.display = 'none';
  gameState.pendingBetAction = null;
}

function confirmBet() {
  const action = gameState.pendingBetAction;
  if (!action) return;

  const input = document.getElementById('betAmountInput');
  const amount = parseInt(input.value.replace(/,/g, ''));

  if (isNaN(amount) || amount <= 0) {
    alert('请输入有效金额');
    return;
  }

  if (amount > gameState.money) {
    alert('资金不足');
    return;
  }

  closeBetModal();
  gameState.money -= amount;
  gameState.operations++;
  gameState.exclusiveOperation = action.name;
  gameState.cooldowns[action.id] = action.cd;

  addLog(`🎰 ${action.name} 投注 ${formatMoney(amount)}`, -amount, 'neutral');

  setTimeout(() => {
    gameState.exclusiveOperation = null;

    const roll = Math.random();
    let resultText = '';

    if (action.id === 'casino') {
      if (roll < 0.38) {
        const win = Math.floor(amount * 1.75);
        gameState.money += win;
        resultText = `🎰 幸运获胜！赢得 ${formatMoney(win - amount)}`;
        addLog(resultText, win - amount, 'good');
      } else {
        resultText = `🎰 庄家通吃，亏损 ${formatMoney(amount)}`;
        addLog(resultText, -amount, 'bad');
      }
    } else if (action.id === 'match') {
      if (roll < 0.33) {
        const win = amount * 2;
        gameState.money += win;
        resultText = `🏆 赛事爆冷！赢得 ${formatMoney(amount)}`;
        addLog(resultText, amount, 'good');
      } else {
        resultText = `🏆 赛事落败，亏损 ${formatMoney(amount)}`;
        addLog(resultText, -amount, 'bad');
      }
    }

    renderActions();
    updateDisplay();
    // 显式清除cooldown
    delete gameState.cooldowns[action.id];
  }, action.cd / gameState.speed);
}

// ===== CATEGORY SELECTION =====
function selectCategory(catId) {
  gameState.activeCategory = catId;
  renderCategories();
  renderActions();
}

// ===== SPEED CONTROL =====
function setSpeed(speed) {
  // 先冻结当前时间，避免计时错乱
  gameState.elapsedTime = getGameTime();
  gameState.startTime = Date.now();
  gameState.speed = speed;
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.speed) === speed);
  });
}

// ===== GAME LOOP =====
function startGameLoop() {
  if (gameLoopInterval) clearInterval(gameLoopInterval);

  gameLoopInterval = setInterval(() => {
    if (gameState.mode !== 'rush' && gameState.mode !== 'classic') return;

    const remaining = getRemainingTime();

    // Update timer display
    const timeEl = document.getElementById('timeDisplay');
    if (timeEl) timeEl.textContent = formatTime(remaining);

    // Random events (low probability)
    if (Math.random() < 0.0005) {
      triggerRandomEvent();
    }

    // Win/lose check for time-based modes
    if (remaining <= 0 && (gameState.mode === 'classic' || gameState.mode === 'rush')) {
      endGame();
    }

    // Always update display
    updateDisplay();
  }, 100);
}

// ===== RANDOM EVENTS =====
function triggerRandomEvent() {
  const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
  gameState.money += event.amount;
  gameState.operations++;
  addLog(`📢 突发事件: ${event.name} (${event.desc})`, event.amount, event.amount > 0 ? 'good' : 'bad');
}

// ===== GAME MODE MANAGEMENT =====
function initStocks() {
  const stocks = {};
  Object.keys(ACTIONS).forEach(cat => {
    ACTIONS[cat].forEach(action => {
      if (action.stock > 0) {
        stocks[action.id] = {
          count: action.stock,
          max: action.stock,
          cd: action.stockCd || 86400000,
          gameResetAt: action.stockCd || 86400000 // 初始补货时间
        };
      }
    });
  });
  return stocks;
}

function startGame(mode) {
  gameState = {
    mode: mode,
    money: INITIAL_MONEY,
    startTime: Date.now(),
    elapsedTime: 0,
    speed: 1,
    operations: 0,
    activeCategory: 'consumption',
    cooldowns: {},
    stocks: initStocks(),
    logs: [],
    exclusiveOperation: null,
    moneySpentCount: {},
    pendingBetAction: null
  };

  // Hide/show screens
  document.getElementById('modeScreen').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'none';
  document.getElementById('gameContainer').style.display = 'flex';

  // Show/hide controls based on mode
  const saveBtn = document.getElementById('btnSave');
  const loadBtn = document.getElementById('btnLoad');
  const timeBlock = document.getElementById('timeBlock');
  const speedControl = document.getElementById('speedControl');

  if (saveBtn) saveBtn.style.display = (mode === 'classic' || mode === 'endless') ? 'inline-block' : 'none';
  if (loadBtn) loadBtn.style.display = (mode === 'classic' || mode === 'endless') ? 'inline-block' : 'none';
  if (timeBlock) timeBlock.style.display = mode === 'endless' ? 'none' : 'block';
  if (speedControl) speedControl.style.display = mode === 'rush' ? 'flex' : 'none';

  renderCategories();
  renderActions();
  renderLogs();
  updateDisplay();
  startGameLoop();

  // Welcome messages
  if (mode === 'rush') {
    addLog('⚡ 快节奏模式已启动 - 点击右上角快进按钮加速', 0, 'neutral');
  } else if (mode === 'endless') {
    addLog('♾️ 无尽模式已启动 - 没有时间限制，尽情烧钱', 0, 'neutral');
  } else {
    addLog(`📅 经典七日记开始！你有7天时间烧光 ${formatMoney(INITIAL_MONEY)}`, 0, 'neutral');
  }
  addLog(`💰 游戏目标：花光所有资金，负债越多越厉害！`, 0, 'neutral');
}

function endGame() {
  if (gameLoopInterval) clearInterval(gameLoopInterval);

  const money = gameState.money;
  const elapsed = getGameTime();
  const days = Math.floor(elapsed / 86400000);
  const ops = gameState.operations;

  let title, subtitle, titleClass;
  if (money < -1e12) {
    title = '万亿败家大神';
    subtitle = '完美通关 · 负债超千亿';
    titleClass = 'result-title success gold-pulse';
  } else if (money < 0) {
    title = '优秀通关';
    subtitle = '优秀通关 · 负债百亿内';
    titleClass = 'result-title success';
  } else if (money === 0) {
    title = '普通通关';
    subtitle = '刚好花光，运气不错';
    titleClass = 'result-title success';
  } else {
    title = '烧钱失败';
    subtitle = '还剩 ' + formatMoney(money) + ' 未花完';
    titleClass = 'result-title fail';
  }

  const titleEl = document.getElementById('resultTitle');
  const subtitleEl = document.getElementById('resultSubtitle');
  const moneyEl = document.getElementById('resultFinalMoney');
  const daysEl = document.getElementById('resultDaysElapsed');
  const opsEl = document.getElementById('resultOperations');

  if (titleEl) {
    titleEl.textContent = title;
    titleEl.className = titleClass;
  }
  if (subtitleEl) subtitleEl.textContent = subtitle;
  if (moneyEl) moneyEl.textContent = formatMoney(money);
  if (daysEl) daysEl.textContent = days + '天';
  if (opsEl) opsEl.textContent = ops;

  document.getElementById('gameContainer').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'flex';
}

function resetGame() {
  if (confirm('确定要重置游戏吗？所有进度将丢失。')) {
    showModeScreen();
  }
}

function restartGame() {
  startGame(gameState.mode);
}

function showModeScreen() {
  if (gameLoopInterval) clearInterval(gameLoopInterval);

  document.getElementById('modeScreen').style.display = 'flex';
  document.getElementById('resultScreen').style.display = 'none';
  document.getElementById('gameContainer').style.display = 'none';
}

// ===== SAVE/LOAD =====
function saveGame() {
  // 先冻结当前时间，避免存档时时间跳变
  gameState.elapsedTime = getGameTime();
  gameState.startTime = Date.now();

  const saveData = {
    ...gameState,
    savedAt: Date.now()
  };

  try {
    localStorage.setItem('muskMoneyGame', JSON.stringify(saveData));
    addLog('💾 游戏已保存', 0, 'neutral');
  } catch (e) {
    console.error('存档失败:', e);
    addLog('❌ 存档失败', 0, 'bad');
  }
}

function loadGame() {
  const data = localStorage.getItem('muskMoneyGame');
  if (!data) {
    alert('没有找到存档');
    return;
  }

  try {
    const save = JSON.parse(data);
    // 恢复存档，startTime保持存档中的值以正确计算时间
    gameState = { ...save };

    document.getElementById('modeScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'flex';

    document.getElementById('btnSave').style.display = (gameState.mode === 'classic' || gameState.mode === 'endless') ? 'inline-block' : 'none';
    document.getElementById('btnLoad').style.display = (gameState.mode === 'classic' || gameState.mode === 'endless') ? 'inline-block' : 'none';
    document.getElementById('timeBlock').style.display = gameState.mode === 'endless' ? 'none' : 'block';
    document.getElementById('speedControl').style.display = gameState.mode === 'rush' ? 'flex' : 'none';

    renderCategories();
    renderActions();
    renderLogs();
    startGameLoop();
    updateDisplay();
    addLog('📂 游戏已读档', 0, 'neutral');
  } catch (e) {
    alert('存档读取失败');
    console.error(e);
  }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
  // Mode selection
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => startGame(card.dataset.mode));
  });

  // Speed buttons
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => setSpeed(parseInt(btn.dataset.speed)));
  });

  // Header buttons
  document.getElementById('btnSave')?.addEventListener('click', saveGame);
  document.getElementById('btnLoad')?.addEventListener('click', loadGame);
  document.getElementById('btnReset')?.addEventListener('click', resetGame);
  document.getElementById('btnClearLog')?.addEventListener('click', clearLog);

  // Result screen buttons
  document.getElementById('btnRestart')?.addEventListener('click', restartGame);
  document.getElementById('btnBackToMode')?.addEventListener('click', showModeScreen);

  // Bet modal
  document.getElementById('btnCancelBet')?.addEventListener('click', closeBetModal);
  document.getElementById('btnConfirmBet')?.addEventListener('click', confirmBet);

  // Close modal on overlay click
  document.getElementById('betModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'betModal') closeBetModal();
  });
});