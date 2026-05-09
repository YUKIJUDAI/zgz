/**
 * Boss直聘求职助手 - 通知系统
 * 支持多种通知渠道：浏览器通知、微信、Server酱、Bark
 */

const BossNotifier = {
  config: null,

  /**
   * 初始化通知系统
   */
  async initialize(config) {
    this.config = config;

    // 请求浏览器通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    BossUtils.log('info', '通知系统初始化完成');
  },

  /**
   * 发送通知（多渠道）
   */
  async notify(title, message, options = {}) {
    const tasks = [];

    // 1. 浏览器通知
    if (options.browser !== false) {
      tasks.push(this.sendBrowserNotification(title, message, options));
    }

    // 2. 微信通知（企业微信机器人）
    if (this.config.wechatWebhook) {
      tasks.push(this.sendWechatNotification(title, message));
    }

    // 3. Server酱通知
    if (this.config.serverChanKey) {
      tasks.push(this.sendServerChanNotification(title, message));
    }

    // 4. Bark通知（iOS推送）
    if (this.config.barkKey) {
      tasks.push(this.sendBarkNotification(title, message));
    }

    // 并发发送所有通知
    const results = await Promise.allSettled(tasks);

    // 统计成功/失败
    const success = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value).length;

    BossUtils.log('info', `通知发送完成: 成功${success}个, 失败${failed}个`);

    return { success, failed, results };
  },

  /**
   * 浏览器通知
   */
  async sendBrowserNotification(title, message, options = {}) {
    if (!('Notification' in window)) {
      BossUtils.log('warn', '浏览器不支持通知');
      return false;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        BossUtils.log('warn', '用户拒绝了通知权限');
        return false;
      }
    }

    try {
      const notification = new Notification(title, {
        body: message,
        icon: options.icon || '/icons/icon128.png',
        badge: '/icons/icon48.png',
        tag: options.tag || 'boss-assistant',
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      });

      // 点击通知时的行为
      notification.onclick = () => {
        window.focus();
        if (options.url) {
          window.location.href = options.url;
        }
        notification.close();
      };

      // 自动关闭
      setTimeout(() => notification.close(), 10000);

      return true;
    } catch (error) {
      BossUtils.log('error', '浏览器通知发送失败', error.message);
      return false;
    }
  },

  /**
   * 微信通知（企业微信机器人）
   */
  async sendWechatNotification(title, message) {
    if (!this.config.wechatWebhook) {
      return false;
    }

    try {
      const response = await fetch(this.config.wechatWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'markdown',
          markdown: {
            content: `# ${title}\n\n${message}\n\n> 来自Boss直聘求职助手`,
          },
        }),
      });

      const result = await response.json();

      if (result.errcode === 0) {
        BossUtils.log('info', '微信通知发送成功');
        return true;
      } else {
        BossUtils.log('warn', `微信通知发送失败: ${result.errmsg}`);
        return false;
      }
    } catch (error) {
      BossUtils.log('error', '微信通知发送失败', error.message);
      return false;
    }
  },

  /**
   * Server酱通知（微信推送）
   */
  async sendServerChanNotification(title, message) {
    if (!this.config.serverChanKey) {
      return false;
    }

    try {
      // Server酱 Turbo版 API
      const url = `https://sctapi.ftqq.com/${this.config.serverChanKey}.send`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          desp: message,
        }),
      });

      const result = await response.json();

      if (result.code === 0) {
        BossUtils.log('info', 'Server酱通知发送成功');
        return true;
      } else {
        BossUtils.log('warn', `Server酱通知发送失败: ${result.message}`);
        return false;
      }
    } catch (error) {
      BossUtils.log('error', 'Server酱通知发送失败', error.message);
      return false;
    }
  },

  /**
   * Bark通知（iOS推送）
   */
  async sendBarkNotification(title, message) {
    if (!this.config.barkKey) {
      return false;
    }

    try {
      // Bark API格式: https://api.day.app/{key}/{title}/{body}
      const url = `https://api.day.app/${this.config.barkKey}/${encodeURIComponent(title)}/${encodeURIComponent(message)}`;

      const response = await fetch(url, {
        method: 'GET',
      });

      const result = await response.json();

      if (result.code === 200) {
        BossUtils.log('info', 'Bark通知发送成功');
        return true;
      } else {
        BossUtils.log('warn', `Bark通知发送失败: ${result.message}`);
        return false;
      }
    } catch (error) {
      BossUtils.log('error', 'Bark通知发送失败', error.message);
      return false;
    }
  },

  /**
   * 快捷通知：新消息提醒
   */
  async notifyNewMessage(sender, message) {
    const title = `新消息来自 ${sender}`;
    const body = message.substring(0, 100);

    await this.notify(title, body, {
      tag: 'new-message',
      requireInteraction: true,
    });
  },

  /**
   * 快捷通知：面试邀请
   */
  async notifyInterviewInvite(company, jobTitle, details) {
    const title = `面试邀请：${company}`;
    const body = `职位：${jobTitle}\n\n${details}`;

    await this.notify(title, body, {
      tag: 'interview-invite',
      requireInteraction: true,
      icon: '/icons/icon128.png',
    });

    // 面试邀请一定要发送微信/Server酱通知
    if (this.config.wechatWebhook) {
      await this.sendWechatNotification(title, body);
    }
    if (this.config.serverChanKey) {
      await this.sendServerChanNotification(title, body);
    }
    if (this.config.barkKey) {
      await this.sendBarkNotification(title, body);
    }
  },

  /**
   * 快捷通知：匹配到高分职位
   */
  async notifyHighScoreJob(job, score) {
    const title = `发现高匹配职位 (${score}分)`;
    const body = `公司：${job.company}\n职位：${job.title}\n薪资：${job.salary}\n地点：${job.location}`;

    await this.notify(title, body, {
      tag: 'high-score-job',
      requireInteraction: false,
    });
  },

  /**
   * 快捷通知：每日统计
   */
  async notifyDailySummary(stats) {
    const title = '今日求职统计';
    const body = `
浏览职位：${stats.viewed || 0}个
匹配职位：${stats.matched || 0}个
打招呼：${stats.greeted || 0}个
收到回复：${stats.replied || 0}个
面试邀请：${stats.interviews || 0}个
    `.trim();

    await this.notify(title, body, {
      tag: 'daily-summary',
      requireInteraction: false,
    });
  },

  /**
   * 快捷通知：错误提醒
   */
  async notifyError(errorMessage) {
    const title = 'Boss助手运行错误';
    const body = errorMessage;

    await this.notify(title, body, {
      tag: 'error',
      requireInteraction: false,
    });
  },

  /**
   * Chrome通知（适用于background script）
   */
  async sendChromeNotification(title, message, options = {}) {
    if (!chrome.notifications) {
      return this.sendBrowserNotification(title, message, options);
    }

    try {
      return new Promise((resolve) => {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: options.icon || '/icons/icon128.png',
          title: title,
          message: message,
          priority: options.priority || 1,
          requireInteraction: options.requireInteraction || false,
        }, (notificationId) => {
          if (chrome.runtime.lastError) {
            BossUtils.log('error', 'Chrome通知失败', chrome.runtime.lastError.message);
            resolve(false);
          } else {
            BossUtils.log('info', `Chrome通知已发送: ${notificationId}`);
            resolve(true);
          }
        });
      });
    } catch (error) {
      BossUtils.log('error', 'Chrome通知发送失败', error.message);
      return false;
    }
  },
};
