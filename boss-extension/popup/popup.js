/**
 * Boss直聘求职助手 - Popup界面脚本
 */

let config = null;
let isInitializing = true;  // 防止初始化时触发change事件保存

// 页面加载完成
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] DOMContentLoaded 触发');

  try {
    await loadConfig();
    console.log('[Popup] 配置加载完成');

    await loadStats();
    console.log('[Popup] 统计加载完成');

    initEventListeners();
    console.log('[Popup] 事件监听器初始化完成');

    initTabSwitching();
    console.log('[Popup] 标签切换初始化完成');

    // 初始化完成后，允许保存配置
    setTimeout(() => {
      isInitializing = false;
      console.log('[Popup] ✓ Popup 初始化完成');
    }, 100);
  } catch (error) {
    console.error('[Popup] ✗ 初始化失败:', error);
  }
});

/**
 * 加载配置
 */
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['bossConfig'], (result) => {
      config = result.bossConfig || getDefaultConfig();
      populateConfigForm(config);
      document.getElementById('enableSwitch').checked = config.enabled;
      resolve();
    });
  });
}

/**
 * 保存配置
 */
async function saveConfig() {
  config = collectConfigFromForm();

  return new Promise((resolve) => {
    chrome.storage.local.set({ bossConfig: config }, async () => {
      showToast('配置已保存', 'success');

      // 通知所有Boss直聘标签页刷新配置
      const tabs = await chrome.tabs.query({ url: 'https://www.zhipin.com/*' });
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'refreshConfig' }, () => {
          // 忽略错误（标签页可能已关闭）
          if (chrome.runtime.lastError) {
            console.log('[Popup] 发送refreshConfig失败:', chrome.runtime.lastError.message);
          }
        });
      });

      resolve();
    });
  });
}

/**
 * 填充配置表单
 */
function populateConfigForm(cfg) {
  document.getElementById('salaryMin').value = cfg.salaryMin || '';
  document.getElementById('requiredSkills').value = (cfg.requiredSkills || []).join(',');
  document.getElementById('bonusSkills').value = (cfg.bonusSkills || []).join(',');
  document.getElementById('excludedKeywords').value = (cfg.excludedKeywords || []).join(',');
  document.getElementById('matchThreshold').value = cfg.matchThreshold || 60;

  document.getElementById('greetingEnabled').checked = cfg.greetingEnabled !== false;
  document.getElementById('dailyLimit').value = cfg.dailyLimit || 30;
  document.getElementById('customIntro').value = cfg.customIntro || '';

  const profile = cfg.profile || {};
  document.getElementById('profileName').value = profile.name || '';
  document.getElementById('profileYears').value = profile.yearsExperience || '';
  document.getElementById('profileTechStack').value = profile.techStack || '';
  document.getElementById('profilePhone').value = profile.phone || '';
  document.getElementById('profileSalary').value = profile.expectedSalary || '';

  document.getElementById('wechatWebhook').value = cfg.wechatWebhook || '';
  document.getElementById('serverChanKey').value = cfg.serverChanKey || '';
  document.getElementById('barkKey').value = cfg.barkKey || '';
}

/**
 * 从表单收集配置
 */
function collectConfigFromForm() {
  return {
    ...config,
    enabled: document.getElementById('enableSwitch').checked,
    salaryMin: parseInt(document.getElementById('salaryMin').value) || 0,
    requiredSkills: document.getElementById('requiredSkills').value.split(',').map(s => s.trim()).filter(Boolean),
    bonusSkills: document.getElementById('bonusSkills').value.split(',').map(s => s.trim()).filter(Boolean),
    excludedKeywords: document.getElementById('excludedKeywords').value.split(',').map(s => s.trim()).filter(Boolean),
    matchThreshold: parseInt(document.getElementById('matchThreshold').value) || 60,

    greetingEnabled: document.getElementById('greetingEnabled').checked,
    dailyLimit: parseInt(document.getElementById('dailyLimit').value) || 30,
    customIntro: document.getElementById('customIntro').value.trim(),

    profile: {
      ...config.profile,
      name: document.getElementById('profileName').value.trim(),
      yearsExperience: parseInt(document.getElementById('profileYears').value) || 0,
      techStack: document.getElementById('profileTechStack').value.trim(),
      phone: document.getElementById('profilePhone').value.trim(),
      expectedSalary: document.getElementById('profileSalary').value.trim(),
    },

    wechatWebhook: document.getElementById('wechatWebhook').value.trim(),
    serverChanKey: document.getElementById('serverChanKey').value.trim(),
    barkKey: document.getElementById('barkKey').value.trim(),
  };
}

/**
 * 加载统计数据
 */
async function loadStats() {
  return new Promise((resolve) => {
    console.log('[Popup] 发送 getStats 消息到 background');

    chrome.runtime.sendMessage({ action: 'getStats' }, (stats) => {
      console.log('[Popup] 收到 getStats 响应:', stats);

      // 检查是否有错误
      if (chrome.runtime.lastError) {
        console.error('[Popup] getStats 错误:', chrome.runtime.lastError.message);
        resolve();
        return;
      }

      if (!stats) {
        console.log('[Popup] stats 为空，跳过');
        resolve();
        return;
      }

      try {
        document.getElementById('statGreeted').textContent = stats.todayGreeted || 0;
        document.getElementById('statProcessed').textContent = stats.todayProcessed || 0;
        document.getElementById('statMatched').textContent = '0';  // TODO: 实现匹配统计

        // 显示最近日志
        const logsList = document.getElementById('recentLogsList');
        if (stats.recentLogs && stats.recentLogs.length > 0) {
          logsList.innerHTML = stats.recentLogs.slice(0, 5).map(log => `
            <div class="log-item log-${log.level}">
              <span class="log-time">${log.time}</span>
              <span class="log-message">${log.message}</span>
            </div>
          `).join('');
        }

        console.log('[Popup] 统计数据更新完成');
      } catch (error) {
        console.error('[Popup] 更新统计数据失败:', error);
      }

      resolve();
    });

    // 添加超时保护，防止卡住
    setTimeout(() => {
      console.warn('[Popup] getStats 超时，继续初始化');
      resolve();
    }, 2000);
  });
}

/**
 * 初始化事件监听
 */
function initEventListeners() {
  console.log('[Popup] 开始绑定事件监听器...');

  // 启用/禁用开关
  const enableSwitch = document.getElementById('enableSwitch');
  console.log('[Popup] enableSwitch 元素:', enableSwitch);
  if (enableSwitch) {
    enableSwitch.addEventListener('change', async (e) => {
      console.log('[Popup] enableSwitch 点击', e.target.checked);
      if (isInitializing) return;  // 初始化阶段不保存
      config.enabled = e.target.checked;
      await chrome.storage.local.set({ bossConfig: config });
      showToast(config.enabled ? '助手已启用' : '助手已禁用', 'info');
    });
  }

  // 自动打招呼
  const btnAutoGreet = document.getElementById('btnAutoGreet');
  console.log('[Popup] btnAutoGreet 元素:', btnAutoGreet);
  if (btnAutoGreet) {
    btnAutoGreet.addEventListener('click', async () => {
      console.log('[Popup] btnAutoGreet 被点击');
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('zhipin.com')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'startAutoGreet' });
        showToast('已开始自动打招呼', 'success');
        window.close();
      } else {
        showToast('请先打开Boss直聘页面', 'warning');
      }
    });
  }

  // 打开Boss直聘
  const btnOpenBoss = document.getElementById('btnOpenBoss');
  console.log('[Popup] btnOpenBoss 元素:', btnOpenBoss);
  if (btnOpenBoss) {
    btnOpenBoss.addEventListener('click', () => {
      console.log('[Popup] btnOpenBoss 被点击');
      chrome.tabs.create({ url: 'https://www.zhipin.com/web/geek/job' });
    });
  }

  // 刷新统计
  const btnRefresh = document.getElementById('btnRefresh');
  console.log('[Popup] btnRefresh 元素:', btnRefresh);
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      console.log('[Popup] btnRefresh 被点击');
      await loadStats();
      showToast('统计已刷新', 'success');
    });
  }

  // 保存配置
  const btnSaveConfig = document.getElementById('btnSaveConfig');
  console.log('[Popup] btnSaveConfig 元素:', btnSaveConfig);
  if (btnSaveConfig) {
    btnSaveConfig.addEventListener('click', async () => {
      console.log('[Popup] btnSaveConfig 被点击');
      await saveConfig();
    });
  }

  // 恢复默认配置
  const btnResetConfig = document.getElementById('btnResetConfig');
  console.log('[Popup] btnResetConfig 元素:', btnResetConfig);
  if (btnResetConfig) {
    btnResetConfig.addEventListener('click', async () => {
      console.log('[Popup] btnResetConfig 被点击');
      if (confirm('确定要恢复默认配置吗？这将覆盖当前所有设置。')) {
        config = getDefaultConfig();
        populateConfigForm(config);
        await chrome.storage.local.set({ bossConfig: config });
        showToast('已恢复默认配置', 'success');
      }
    });
  }

  // 清空日志
  const btnClearLogs = document.getElementById('btnClearLogs');
  console.log('[Popup] btnClearLogs 元素:', btnClearLogs);
  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', async () => {
      console.log('[Popup] btnClearLogs 被点击');
      if (confirm('确定要清空所有日志吗？')) {
        await chrome.storage.local.remove(['bossLogs']);
        document.getElementById('logsList').innerHTML = '<div class="empty-state">暂无日志</div>';
        showToast('日志已清空', 'success');
      }
    });
  }

  // 导出日志
  const btnExportLogs = document.getElementById('btnExportLogs');
  console.log('[Popup] btnExportLogs 元素:', btnExportLogs);
  if (btnExportLogs) {
    btnExportLogs.addEventListener('click', async () => {
      console.log('[Popup] btnExportLogs 被点击');
      chrome.runtime.sendMessage({ action: 'exportLogs' }, (response) => {
        if (response && response.logs) {
          const blob = new Blob([JSON.stringify(response.logs, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `boss-assistant-logs-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          showToast('日志已导出', 'success');
        }
      });
    });
  }

  // 日志级别过滤
  const logLevelFilter = document.getElementById('logLevelFilter');
  console.log('[Popup] logLevelFilter 元素:', logLevelFilter);
  if (logLevelFilter) {
    logLevelFilter.addEventListener('change', (e) => {
      console.log('[Popup] logLevelFilter 改变:', e.target.value);
      loadLogs(e.target.value);
    });
  }

  // 帮助链接（如果存在）
  const linkHelp = document.getElementById('linkHelp');
  if (linkHelp) {
    console.log('[Popup] linkHelp 元素:', linkHelp);
    linkHelp.addEventListener('click', (e) => {
      console.log('[Popup] linkHelp 被点击');
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/YUKIJUDAI/boss-assistant' });
    });
  }

  console.log('[Popup] ✓ 所有事件监听器绑定完成');
}

/**
 * 初始化标签页切换
 */
function initTabSwitching() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      // 更新按钮状态
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 更新内容显示
      tabContents.forEach(content => {
        if (content.id === tabName) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });

      // 如果切换到日志页，加载日志
      if (tabName === 'logs') {
        loadLogs();
      }
    });
  });
}

/**
 * 加载日志
 */
function loadLogs(level = 'all') {
  chrome.storage.local.get(['bossLogs'], (result) => {
    const logs = result.bossLogs || [];
    const logsList = document.getElementById('logsList');

    if (logs.length === 0) {
      logsList.innerHTML = '<div class="empty-state">暂无日志</div>';
      return;
    }

    const filteredLogs = level === 'all' ? logs : logs.filter(log => log.level === level);

    logsList.innerHTML = filteredLogs.map(log => `
      <div class="log-item log-${log.level}">
        <div class="log-header">
          <span class="log-time">${log.time}</span>
          <span class="log-level">${log.level.toUpperCase()}</span>
        </div>
        <div class="log-message">${escapeHtml(log.message)}</div>
        ${log.data ? `<div class="log-data">${escapeHtml(JSON.stringify(log.data))}</div>` : ''}
      </div>
    `).join('');
  });
}

/**
 * 获取默认配置
 */
function getDefaultConfig() {
  return {
    enabled: true,
    keywords: ['前端开发', 'Vue开发', 'React开发'],
    locations: ['杭州'],
    salaryMin: 20000,
    experience: '3-5年',
    requiredSkills: ['Vue', 'JavaScript', 'TypeScript'],
    bonusSkills: ['React', 'Node.js', 'Webpack'],
    excludedKeywords: ['外包', '驻场', '996'],
    matchThreshold: 60,
    greetingEnabled: true,
    dailyLimit: 30,
    customIntro: '',
    profile: {
      name: '求职者',
      yearsExperience: 3,
      currentRole: '前端工程师',
      techStack: 'Vue/JavaScript/TypeScript',
      phone: '',
      expectedSalary: '20-30',
      availability: '随时可到岗',
      city: '杭州',
      github: 'https://github.com/YUKIJUDAI',
    },
    autoReplyEnabled: false,
    replyDelayMin: 5,
    replyDelayMax: 15,
    wechatWebhook: '',
    serverChanKey: '',
    barkKey: '',
    actionDelayMin: 3,
    actionDelayMax: 8,
  };
}

/**
 * 显示提示消息
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * HTML转义
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
