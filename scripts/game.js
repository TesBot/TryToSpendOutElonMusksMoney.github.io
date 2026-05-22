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
  pendingBetAction: null,
  // 被动增收系统
  lastIncomeTick: 0,
  teslaHourlyTime: 0,
  spaceXHourlyTime: 0,
  subsidiaryTime: 0,
  todayDay: 0,
  optionsVested: false,
  optionsVested2: false
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

  // Passive income system - 基于实时时间差计算被动收入
  if (gameState.lastIncomeTick === 0) {
    gameState.lastIncomeTick = Date.now();
  }
  const now = Date.now();
  const deltaRealTime = now - gameState.lastIncomeTick;
  const deltaGameTime = deltaRealTime * gameState.speed;
  if (deltaGameTime > 0) {
    calculatePassiveIncome(deltaGameTime);
    gameState.lastIncomeTick = now;
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

  // 钱不够支付？直接扣到负资产并结束游戏
  if (gameState.money < cost) {
    const finalMoney = gameState.money - cost;
    gameState.money = finalMoney;
    gameState.operations++;
    gameState.moneySpentCount[action.id] = (gameState.moneySpentCount[action.id] || 0) + 1;
    addLog(`💸 ${action.name} 花费${formatMoney(cost)}，余额不足触发破产！`, finalMoney, 'bad');

    // 立即触发游戏结束
    setTimeout(() => {
      endGame();
    }, 100);
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
      addLog(`🎰 赌场大胜！本金${formatMoney(cost)} → 赢${formatMoney(win - cost)}（含本金）`, win - cost, 'good');
    } else {
      addLog(`🎰 赌场落败，亏损本金${formatMoney(cost)}`, -cost, 'bad');
    }
  } else if (action.id === 'match') {
    if (roll < 0.33) {
      const win = cost * 2;
      gameState.money += win;
      addLog(`🏆 赛事爆冷！本金${formatMoney(cost)} → 赢${formatMoney(cost)}（含本金）`, cost, 'good');
    } else {
      addLog(`🏆 赛事落败，亏损本金${formatMoney(cost)}`, -cost, 'bad');
    }
  } else if (action.gamble) {
    if (roll < action.winRate) {
      const win = Math.floor(cost * action.winMultiplier);
      gameState.money += win;
      addLog(`🎁 盲盒暴击！本金${formatMoney(cost)} → 赢得${formatMoney(win - cost)}（含本金）`, win - cost, 'good');
    } else {
      addLog(`📦 盲盒未中，亏损本金${formatMoney(cost)}`, -cost, 'bad');
    }
  }
}

function handleBigInvestResult(action) {
  const roll = Math.random();

  if (roll < 0.7) {
    // 70% - 亏损
    const loss = action.baseCost;
    gameState.money -= loss;
    addLog(`💸 风投项目烂尾！亏损${formatMoney(loss)}，余额${formatMoney(gameState.money)}`, -loss, 'bad');
  } else if (roll < 0.9) {
    // 20% - 保本
    addLog(`📊 风投项目保本，余额${formatMoney(gameState.money)}`, 0, 'neutral');
    // 保本不退款，本金已扣
  } else {
    // 10% - 翻倍
    const profit = action.baseCost;
    gameState.money += profit * 2;
    addLog(`🚀 风投大成功！本金${formatMoney(action.baseCost)} → 盈利${formatMoney(profit)}（含本金），余额${formatMoney(gameState.money)}`, profit, 'good');
    // 盈利税
    const tax = Math.floor(profit * 0.5);
    gameState.money -= tax;
    addLog(`🏛️ 盈利税${formatMoney(tax)}，余额${formatMoney(gameState.money)}`, -tax, 'bad');
  }
}

function handleInvestResult(action) {
  const multiplier = 1 + (Math.random() - 0.5) * action.volatility * 2;
  const result = Math.floor(action.baseCost * multiplier);
  const diff = result - action.baseCost;

  if (diff > 0) {
    const tax = Math.floor(diff * 0.5);
    const netProfit = result - tax;
    gameState.money += netProfit;
    addLog(`📈 ${action.name} 盈利${formatMoney(diff)}（税后${formatMoney(netProfit)}），余额${formatMoney(gameState.money)}`, netProfit, 'good');
  } else {
    addLog(`📉 ${action.name} 亏损${formatMoney(Math.abs(diff))}，余额${formatMoney(gameState.money)}`, diff, 'bad');
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
  // 重置收入计时：lastIncomeTick用Date.now()记录，下次计算deltaGameTime时能正确反映时间差
  gameState.lastIncomeTick = Date.now();
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

// ===== PASSIVE INCOME SYSTEM =====
// 复刻马斯克真实财富模式：股权增值、企业估值、期权激励、经营收益
// 高频收入不写日志，只在资金面板显示；大额事件才记录
// 使用"计时器"方式而非"累积器"方式，避免速度切换时的时间遗留问题
function calculatePassiveIncome(deltaGameTime) {
  if (deltaGameTime <= 0) return;

  // 1. 特斯拉股权秒级被动增收：$42,000/秒（不记日志）
  gameState.money += deltaGameTime * 42;

  // 2. 特斯拉小时级波动增收：每游戏小时70%概率+$50万-$200万（记日志）
  // 使用计时器方式：记录上次触发的游戏时间，每次增加一小时游戏时间后触发
  gameState.teslaHourlyTime += deltaGameTime;
  const hourMs = 3600000;
  while (gameState.teslaHourlyTime >= hourMs) {
    gameState.teslaHourlyTime -= hourMs;
    if (Math.random() < 0.7) {
      const bonus = 5000000 + Math.random() * 15000000;
      gameState.money += bonus;
      addLog(`📈 特斯拉股价小涨 +${formatMoney(bonus)}`, bonus, 'good');
    }
  }

  // 3. SpaceX私人股权估值上涨：每游戏小时+$12,000,000（记日志）
  gameState.spaceXHourlyTime += deltaGameTime;
  while (gameState.spaceXHourlyTime >= hourMs) {
    gameState.spaceXHourlyTime -= hourMs;
    gameState.money += 12000000;
    addLog(`🚀 SpaceX股权估值上涨 +$12,000,000`, 12000000, 'good');
  }

  // 4. 旗下科创公司经营性收益：每5分钟+$150,000（不记日志）
  const fiveMinMs = 300000;
  gameState.subsidiaryTime += deltaGameTime;
  while (gameState.subsidiaryTime >= fiveMinMs) {
    gameState.subsidiaryTime -= fiveMinMs;
    gameState.money += 150000;
  }

  // 5. 每日特斯拉市值公允上涨：$520,000,000（记日志）
  const currentDay = Math.floor(getGameTime() / 86400000);
  if (currentDay > gameState.todayDay && currentDay > 0) {
    gameState.money += 520000000;
    addLog(`💹 每日特斯拉市值公允上涨 +$520,000,000`, 520000000, 'good');
    gameState.todayDay = currentDay;
  }

  // 6. 随机爆发式增收事件（难度拔高核心）
  // 贴合现实资本市场：航天突破/特斯拉爆单/科创融资（记日志）
  const incomeEventChance = 0.00003 * (1 + (1 - Math.min(1, gameState.money / INITIAL_MONEY)) * 3);
  if (Math.random() < incomeEventChance) {
    const roll = Math.random();
    if (roll < 0.33) {
      gameState.money += 3000000000;
      addLog(`🚀 SpaceX火箭回收成功！资产暴涨 +${formatMoney(3000000000)}`, 3000000000, 'good');
    } else if (roll < 0.66) {
      gameState.money += 2500000000;
      addLog(`🚗 特斯拉AI自动驾驶爆单！资产暴涨 +${formatMoney(2500000000)}`, 2500000000, 'good');
    } else {
      gameState.money += 1800000000;
      addLog(`💻 xAI/Neuralink新一轮融资！资产暴涨 +${formatMoney(1800000000)}`, 1800000000, 'good');
    }
  }

  // 7. 期权归属：7天内随机触发2次（复刻史诗级薪酬方案）（记日志）
  const gameTimeHours = getGameTime() / 3600000;
  if (!gameState.optionsVested && gameTimeHours > 24 && Math.random() < 0.002) {
    const vest1 = 12000000000 + Math.random() * 8000000000;
    gameState.money += vest1;
    addLog(`🏛️ 特斯拉期权第一次归属！+${formatMoney(vest1)}`, vest1, 'good');
    gameState.optionsVested = true;
  }
  if (!gameState.optionsVested2 && gameTimeHours > 120 && Math.random() < 0.002) {
    const vest2 = 12000000000 + Math.random() * 8000000000;
    gameState.money += vest2;
    addLog(`🏛️ 特斯拉期权第二次归属！+${formatMoney(vest2)}`, vest2, 'good');
    gameState.optionsVested2 = true;
  }
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
    pendingBetAction: null,
    // 被动增收系统
    lastIncomeTick: 0,
    teslaHourlyTime: 0,
    spaceXHourlyTime: 0,
    subsidiaryTime: 0,
    todayDay: 0,
    optionsVested: false,
    optionsVested2: false
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
  gameState.lastIncomeTick = getGameTime();

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

    // 确保新增字段有默认值
    gameState.lastIncomeTick = gameState.lastIncomeTick || Date.now();
    gameState.teslaHourlyTime = gameState.teslaHourlyTime || 0;
    gameState.spaceXHourlyTime = gameState.spaceXHourlyTime || 0;
    gameState.subsidiaryTime = gameState.subsidiaryTime || 0;
    gameState.todayDay = gameState.todayDay || 0;
    gameState.optionsVested = gameState.optionsVested || false;
    gameState.optionsVested2 = gameState.optionsVested2 || false;

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