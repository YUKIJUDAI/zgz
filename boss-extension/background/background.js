/**
 * Boss直聘求职助手 - 后台服务脚本
 * 处理定时任务、消息通知、数据同步
 */

// 扩展安装/更新时触发
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Boss求职助手已安装');

    // 初始化默认配置
    await initializeDefaultConfig();

    // 打开欢迎页面
    chrome.tabs.create({
      url: 'https://www.zhipin.com/web/geek/job',
    });

    // 显示欢迎通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '/icons/icon128.png',
      title: 'Boss求职助手已安装',
      message: '点击扩展图标开始配置，开启智能求职之旅！',
      priority: 2,
    });
  } else if (details.reason === 'update') {
    console.log('Boss求职助手已更新到版本', chrome.runtime.getManifest().version);
  }
});

/**
 * 初始化默认配置
 */
async function initializeDefaultConfig() {
  const defaultConfig = {
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
      github: '',
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

  await chrome.storage.local.set({ bossConfig: defaultConfig });
}

/**
 * 监听来自content script和popup的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPopup') {
    // 打开扩展popup
    chrome.action.openPopup();
    sendResponse({ success: true });
  } else if (request.action === 'notify') {
    // 发送通知
    sendNotification(request.title, request.message, request.options);
    sendResponse({ success: true });
  } else if (request.action === 'getStats') {
    // 获取统计数据
    getStats().then(stats => sendResponse(stats));
    return true;  // 异步响应
  } else if (request.action === 'clearStats') {
    // 清除统计数据
    clearStats().then(() => sendResponse({ success: true }));
    return true;
  } else if (request.action === 'exportLogs') {
    // 导出日志
    exportLogs().then(logs => sendResponse({ logs }));
    return true;
  }
});

/**
 * 发送通知
 */
function sendNotification(title, message, options = {}) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: options.icon || '/icons/icon128.png',
    title: title,
    message: message,
    priority: options.priority || 1,
    requireInteraction: options.requireInteraction || false,
  }, (notificationId) => {
    console.log('通知已发送:', notificationId);
  });
}

/**
 * 获取统计数据
 */
async function getStats() {
  return new Promise((resolve) => {
    const today = new Date().toDateString();

    chrome.storage.local.get(['bossGreetStats', 'bossProcessedJobs', 'bossLogs'], (result) => {
      const greetStats = result.bossGreetStats || {};
      const processedJobs = result.bossProcessedJobs || {};
      const logs = result.bossLogs || [];

      const stats = {
        todayGreeted: greetStats[today] || 0,
        todayProcessed: (processedJobs[today] || []).length,
        totalGreeted: Object.values(greetStats).reduce((sum, val) => sum + val, 0),
        recentLogs: logs.slice(0, 10),
      };

      resolve(stats);
    });
  });
}

/**
 * 清除统计数据
 */
async function clearStats() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['bossGreetStats', 'bossProcessedJobs', 'bossLogs'], () => {
      console.log('统计数据已清除');
      resolve();
    });
  });
}

/**
 * 导出日志
 */
async function exportLogs() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['bossLogs'], (result) => {
      const logs = result.bossLogs || [];
      resolve(logs);
    });
  });
}

/**
 * 定时任务：每日统计和清理
 */
chrome.alarms.create('dailyMaintenance', {
  when: Date.now() + 1000,  // 1秒后开始
  periodInMinutes: 24 * 60,  // 每24小时执行一次
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyMaintenance') {
    console.log('执行每日维护任务');

    // 获取统计数据
    const stats = await getStats();

    // 发送每日统计通知
    if (stats.todayGreeted > 0) {
      sendNotification(
        '今日求职统计',
        `今日共向 ${stats.todayGreeted} 家公司打招呼，处理了 ${stats.todayProcessed} 个职位。`,
        { priority: 1 }
      );
    }

    // 清理过期数据（7天前）
    chrome.storage.local.get(['bossGreetStats', 'bossProcessedJobs'], (result) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const greetStats = result.bossGreetStats || {};
      const processedJobs = result.bossProcessedJobs || {};

      // 清理旧数据
      for (const date in greetStats) {
        if (new Date(date) < sevenDaysAgo) {
          delete greetStats[date];
        }
      }

      for (const date in processedJobs) {
        if (new Date(date) < sevenDaysAgo) {
          delete processedJobs[date];
        }
      }

      chrome.storage.local.set({ bossGreetStats: greetStats, bossProcessedJobs: processedJobs });
      console.log('过期数据已清理');
    });
  }
});

/**
 * 监听扩展图标点击
 */
chrome.action.onClicked.addListener((tab) => {
  // 如果当前页面是Boss直聘，注入脚本
  if (tab.url && tab.url.includes('zhipin.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
  }
});

/**
 * 监听标签页更新
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当Boss直聘页面加载完成时
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('zhipin.com')) {
    console.log('Boss直聘页面已加载:', tab.url);

    // 可以在这里触发一些自动化任务
    // 例如：检查是否有新消息、自动匹配职位等
  }
});

/**
 * 监听存储变化
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
      console.log(`存储已更新: ${key}`, { oldValue, newValue });

      // 如果配置更新，通知所有标签页刷新配置
      if (key === 'bossConfig') {
        chrome.tabs.query({ url: 'https://www.zhipin.com/*' }, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: 'refreshConfig' });
          });
        });
      }
    }
  }
});

/**
 * 保持Service Worker活跃
 */
let keepAliveInterval;

function keepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }

  keepAliveInterval = setInterval(() => {
    console.log('Keep alive ping');
  }, 20000);  // 每20秒ping一次
}

keepAlive();

// 监听Service Worker激活
self.addEventListener('activate', (event) => {
  console.log('Service Worker激活');
  keepAlive();
});

/**
 * 快捷命令处理
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-assistant') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url.includes('zhipin.com')) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' });
    }
  } else if (command === 'start-auto-greet') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url.includes('zhipin.com')) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startAutoGreet' });
    }
  }
});

console.log('Boss求职助手后台服务已启动');
