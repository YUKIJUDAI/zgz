/**
 * Boss直聘求职助手 - 工具函数库
 * 作者：金超宇
 */

const BossUtils = {
  /**
   * 随机延迟（模拟人类操作间隔）
   */
  async randomDelay(min = 2000, max = 5000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  },

  /**
   * 随机滚动
   */
  async randomScroll() {
    const amount = Math.floor(Math.random() * 500) + 200;
    const direction = Math.random() > 0.3 ? 1 : -1;
    window.scrollBy({ top: amount * direction, behavior: 'smooth' });
    await this.randomDelay(500, 1500);
  },

  /**
   * 安全点击（等待元素可见后点击）
   */
  async safeClick(element, delay = true) {
    if (!element) return false;

    if (delay) {
      await this.randomDelay(800, 2000);
    }

    // 滚动到元素可见
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.randomDelay(300, 800);

    // 模拟真实点击
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + (Math.random() * 10 - 5);
    const y = rect.top + rect.height / 2 + (Math.random() * 6 - 3);

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
    });

    element.dispatchEvent(clickEvent);
    await this.randomDelay(1000, 2500);
    return true;
  },

  /**
   * 等待元素出现
   */
  async waitForElement(selector, timeout = 10000, parent = document) {
    return new Promise((resolve) => {
      const el = parent.querySelector(selector);
      if (el) {
        resolve(el);
        return;
      }

      const observer = new MutationObserver(() => {
        const el = parent.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(parent, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  },

  /**
   * 等待多个选择器中的任意一个
   */
  async waitForAnySelector(selectors, timeout = 10000, parent = document) {
    return new Promise((resolve) => {
      for (const selector of selectors) {
        const el = parent.querySelector(selector);
        if (el) {
          resolve({ element: el, selector });
          return;
        }
      }

      const observer = new MutationObserver(() => {
        for (const selector of selectors) {
          const el = parent.querySelector(selector);
          if (el) {
            observer.disconnect();
            resolve({ element: el, selector });
            return;
          }
        }
      });

      observer.observe(parent, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve({ element: null, selector: null });
      }, timeout);
    });
  },

  /**
   * 解析薪资字符串
   */
  parseSalary(salaryText) {
    if (!salaryText) return null;

    const text = salaryText.toUpperCase().replace(/[·•]/g, '');

    // 匹配 "15-30K" 或 "25K"
    const match = text.match(/(\d+)(?:-(\d+))?\s*K/);
    if (match) {
      const min = parseInt(match[1]) * 1000;
      const max = match[2] ? parseInt(match[2]) * 1000 : min;
      return { min, max };
    }

    // 匹配纯数字
    const numMatch = text.match(/(\d{4,6})\s*-\s*(\d{4,6})/);
    if (numMatch) {
      return { min: parseInt(numMatch[1]), max: parseInt(numMatch[2]) };
    }

    return null;
  },

  /**
   * 从Chrome Storage读取配置
   */
  async getConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['bossConfig'], (result) => {
        resolve(result.bossConfig || this.getDefaultConfig());
      });
    });
  },

  /**
   * 保存配置到Chrome Storage
   */
  async saveConfig(config) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ bossConfig: config }, resolve);
    });
  },

  /**
   * 获取默认配置（从config.js读取）
   */
  getDefaultConfig() {
    // 优先使用config.js中的配置
    if (typeof BossConfig !== 'undefined') {
      return BossConfig.defaults;
    }

    // 降级方案：内置配置
    return {
      enabled: true,
      keywords: ['前端开发', '高级前端工程师', 'Vue前端工程师'],
      locations: ['杭州'],
      salaryMin: 25000,
      experience: '5-10年',
      requiredSkills: ['Vue', 'TypeScript', 'JavaScript'],
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
  },

  /**
   * 日志记录
   */
  log(level, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = { time: timestamp, level, message, data };

    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `[Boss助手] ${message}`, data || ''
    );

    // Only use chrome.storage if in extension context
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['bossLogs'], (result) => {
        const logs = result.bossLogs || [];
        logs.unshift(entry);
        if (logs.length > 200) logs.length = 200;
        chrome.storage.local.set({ bossLogs: logs });
      });
    }
  },

  /**
   * 显示页面内浮动提示
   */
  showToast(message, type = 'info') {
    const colors = {
      info: '#1890ff',
      success: '#52c41a',
      warning: '#faad14',
      error: '#f5222d',
    };

    const toast = document.createElement('div');
    toast.className = 'boss-toast';
    toast.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${colors[type] || colors.info};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: bossToastSlideIn 0.3s ease;
      max-width: 350px;
      word-break: break-word;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    toast.textContent = message;

    // 添加动画样式
    if (!document.getElementById('boss-toast-style')) {
      const style = document.createElement('style');
      style.id = 'boss-toast-style';
      style.textContent = `
        @keyframes bossToastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes bossToastSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'bossToastSlideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  /**
   * 模拟人类逐字输入
   */
  async typeLikeHuman(element, text) {
    if (!element) return;

    element.focus();
    element.value = '';

    for (const char of text) {
      element.value += char;
      // 触发 input 事件
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await this.randomDelay(30, 120);
    }

    await this.randomDelay(300, 800);
  },

  /**
   * 获取今日已打招呼数量
   */
  async getTodayGreetCount() {
    return new Promise((resolve) => {
      const today = new Date().toDateString();
      chrome.storage.local.get(['bossGreetStats'], (result) => {
        const stats = result.bossGreetStats || {};
        resolve(stats[today] || 0);
      });
    });
  },

  /**
   * 记录一次打招呼
   */
  async recordGreet() {
    const today = new Date().toDateString();
    chrome.storage.local.get(['bossGreetStats'], (result) => {
      const stats = result.bossGreetStats || {};
      stats[today] = (stats[today] || 0) + 1;
      chrome.storage.local.set({ bossGreetStats: stats });
    });
  },

  /**
   * 检查今日是否已处理过该职位
   */
  async isJobProcessed(jobId) {
    return new Promise((resolve) => {
      const today = new Date().toDateString();
      chrome.storage.local.get(['bossProcessedJobs'], (result) => {
        const jobs = result.bossProcessedJobs || {};
        const todayJobs = jobs[today] || [];
        resolve(todayJobs.includes(jobId));
      });
    });
  },

  /**
   * 标记职位已处理
   */
  async markJobProcessed(jobId) {
    const today = new Date().toDateString();
    chrome.storage.local.get(['bossProcessedJobs'], (result) => {
      const jobs = result.bossProcessedJobs || {};
      if (!jobs[today]) jobs[today] = [];
      if (!jobs[today].includes(jobId)) {
        jobs[today].push(jobId);
      }
      // 清理7天前的数据
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      for (const date in jobs) {
        if (new Date(date) < sevenDaysAgo) {
          delete jobs[date];
        }
      }
      chrome.storage.local.set({ bossProcessedJobs: jobs });
    });
  },
};
