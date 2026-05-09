/**
 * Boss直聘求职助手 - Popup界面脚本
 */

let config = null;

// 页面加载完成
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await loadStats();
  initEventListeners();
  initTabSwitching();
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
    chrome.storage.local.set({ bossConfig: config }, () => {
      showToast('配置已保存', 'success');
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
    chrome.runtime.sendMessage({ action: 'getStats' }, (stats) => {
      if (!stats) {
        resolve();
        return;
      }

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

      resolve();
    });
  });
}

/**
 * 初始化事件监听
 */
function initEventListeners() {
  // 启用/禁用开关
  document.getElementById('enableSwitch').addEventListener('change', async (e) => {
    config.enabled = e.target.checked;
    await chrome.storage.local.set({ bossConfig: config });
    showToast(config.enabled ? '助手已启用' : '助手已禁用', 'info');
  });

  // 自动打招呼
  document.getElementById('btnAutoGreet').addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('zhipin.com')) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startAutoGreet' });
      showToast('已开始自动打招呼', 'success');
      window.close();
    } else {
      showToast('请先打开Boss直聘页面', 'warning');
    }
  });

  // 打开Boss直聘
  document.getElementById('btnOpenBoss').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.zhipin.com/web/geek/job' });
  });

  // 刷新统计
  document.getElementById('btnRefresh').addEventListener('click', async () => {
    await loadStats();
    showToast('统计已刷新', 'success');
  });

  // 保存配置
  document.getElementById('btnSaveConfig').addEventListener('click', async () => {
    await saveConfig();
  });

  // 恢复默认配置
  document.getElementById('btnResetConfig').addEventListener('click', async () => {
    if (confirm('确定要恢复默认配置吗？这将覆盖当前所有设置。')) {
      config = getDefaultConfig();
      populateConfigForm(config);
      await chrome.storage.local.set({ bossConfig: config });
      showToast('已恢复默认配置', 'success');
    }
  });

  // 清空日志
  document.getElementById('btnClearLogs').addEventListener('click', async () => {
    if (confirm('确定要清空所有日志吗？')) {
      await chrome.storage.local.remove(['bossLogs']);
      document.getElementById('logsList').innerHTML = '<div class="empty-state">暂无日志</div>';
      showToast('日志已清空', 'success');
    }
  });

  // 导出日志
  document.getElementById('btnExportLogs').addEventListener('click', async () => {
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

  // 日志级别过滤
  document.getElementById('logLevelFilter').addEventListener('change', (e) => {
    loadLogs(e.target.value);
  });

  // 帮助链接
  document.getElementById('linkHelp').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/YUKIJUDAI/boss-assistant' });
  });
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
