/**
 * Boss直聘求职助手 - 主内容脚本
 * 在Boss直聘页面上注入功能
 */

(async function() {
  'use strict';

  // 避免重复注入
  if (window.bossAssistantInjected) {
    return;
  }
  window.bossAssistantInjected = true;

  let config = null;
  let isRunning = false;
  let currentPage = null;
  let isInitialized = false;  // 防止重复初始化
  let pageObserver = null;    // 保存MutationObserver引用

  /**
   * 初始化扩展
   */
  async function initialize() {
    try {
      // 如果已经初始化过，只重新加载配置
      if (isInitialized) {
        BossUtils.log('info', 'Boss助手已初始化，仅刷新配置');
        config = await BossUtils.getConfig();
        await BossChatbot.initialize(config);
        await BossNotifier.initialize(config);
        return;
      }

      // 加载配置
      config = await BossUtils.getConfig();

      if (!config.enabled) {
        BossUtils.log('info', 'Boss助手已禁用');
        return;
      }

      // 初始化子模块
      await BossChatbot.initialize(config);
      await BossNotifier.initialize(config);

      // 检测当前页面
      detectPage();

      // 添加控制面板
      addControlPanel();

      // 页面变化监听
      observePageChanges();

      isInitialized = true;  // 标记为已初始化
      BossUtils.log('info', 'Boss助手初始化成功');
      BossUtils.showToast('Boss求职助手已启动', 'success');
    } catch (error) {
      BossUtils.log('error', '初始化失败', error.message);
      BossUtils.showToast('Boss助手启动失败', 'error');
    }
  }

  /**
   * 检测当前页面类型
   */
  function detectPage() {
    const url = window.location.href;
    const pathname = window.location.pathname;

    if (url.includes('/web/geek/job')) {
      currentPage = 'job-list';
      BossUtils.log('info', '当前页面: 职位列表');
      handleJobListPage();
    } else if (url.includes('/job_detail/')) {
      currentPage = 'job-detail';
      BossUtils.log('info', '当前页面: 职位详情');
      handleJobDetailPage();
    } else if (url.includes('/web/geek/chat')) {
      currentPage = 'chat';
      BossUtils.log('info', '当前页面: 聊天页面');
      handleChatPage();
    } else {
      currentPage = 'unknown';
      BossUtils.log('debug', '未识别的页面类型');
    }
  }

  /**
   * 处理职位列表页
   */
  async function handleJobListPage() {
    BossUtils.log('info', '开始处理职位列表页');

    // 等待职位列表加载
    await BossUtils.randomDelay(1000, 2000);

    // 扫描职位
    const jobs = await scanJobs();
    BossUtils.log('info', `扫描到 ${jobs.length} 个职位`);

    // 匹配职位
    const matchedJobs = await JobMatcher.matchBatch(jobs, config);
    BossUtils.log('info', `匹配到 ${matchedJobs.length} 个合适职位`);

    // 在页面上标记匹配度
    markJobsOnPage(matchedJobs);

    // 通知高分职位
    for (const job of matchedJobs) {
      if (job.matchResult.score >= 80) {
        await BossNotifier.notifyHighScoreJob(job, job.matchResult.score);
      }
    }
  }

  /**
   * 处理职位详情页
   */
  async function handleJobDetailPage() {
    BossUtils.log('info', '开始处理职位详情页');

    // 等待页面加载
    await BossUtils.randomDelay(1000, 2000);

    // 提取职位信息
    const jobInfo = extractJobDetail();
    if (!jobInfo) {
      BossUtils.log('warn', '无法提取职位信息');
      return;
    }

    // 匹配评分
    const matchResult = JobMatcher.match(jobInfo, config);
    BossUtils.log('info', `职位匹配度: ${matchResult.score}/100`);

    // 在页面上显示匹配度
    showMatchScoreOnPage(matchResult);

    // 如果匹配度高且启用了自动打招呼
    if (matchResult.passed && config.greetingEnabled) {
      const todayCount = await BossUtils.getTodayGreetCount();
      if (todayCount < config.dailyLimit) {
        // 添加一键打招呼按钮
        addQuickGreetButton(jobInfo);
      }
    }
  }

  /**
   * 处理聊天页面
   */
  async function handleChatPage() {
    BossUtils.log('info', '开始监控聊天页面');

    // 监控新消息
    monitorNewMessages();
  }

  /**
   * 扫描职位列表
   */
  async function scanJobs() {
    const jobs = [];
    const jobCards = document.querySelectorAll('.job-card-wrapper, .job-card-box, li.job-card');

    for (const card of jobCards) {
      try {
        const job = {
          id: card.getAttribute('data-jid') || card.getAttribute('data-job-id') || Math.random().toString(36),
          title: card.querySelector('.job-title, .job-name')?.textContent.trim() || '',
          company: card.querySelector('.company-name')?.textContent.trim() || '',
          salary: card.querySelector('.salary, .job-salary')?.textContent.trim() || '',
          location: card.querySelector('.job-area, .job-location')?.textContent.trim() || '',
          tags: Array.from(card.querySelectorAll('.tag-list li, .job-tags span')).map(t => t.textContent.trim()),
          experience: card.querySelector('.job-experience, .job-limit-experience')?.textContent.trim() || '',
          element: card,
        };

        if (job.title && job.company) {
          jobs.push(job);
        }
      } catch (error) {
        BossUtils.log('warn', '解析职位卡片失败', error.message);
      }
    }

    return jobs;
  }

  /**
   * 提取职位详情
   */
  function extractJobDetail() {
    try {
      return {
        id: window.location.pathname.split('/').pop() || Math.random().toString(36),
        title: document.querySelector('.job-title, .name, h1.job-name')?.textContent.trim() || '',
        company: document.querySelector('.company-name, .name')?.textContent.trim() || '',
        salary: document.querySelector('.salary, .job-salary')?.textContent.trim() || '',
        location: document.querySelector('.job-location, .location-address')?.textContent.trim() || '',
        tags: Array.from(document.querySelectorAll('.tag-list li, .job-tags span')).map(t => t.textContent.trim()),
        description: document.querySelector('.job-sec-text, .job-detail-section, .job-description')?.textContent.trim() || '',
        experience: document.querySelector('.job-experience')?.textContent.trim() || '',
      };
    } catch (error) {
      BossUtils.log('error', '提取职位详情失败', error.message);
      return null;
    }
  }

  /**
   * 在页面上标记匹配的职位
   */
  function markJobsOnPage(matchedJobs) {
    for (const job of matchedJobs) {
      if (!job.element) continue;

      // 添加匹配度标签
      const badge = document.createElement('div');
      badge.className = 'boss-assistant-badge';
      badge.textContent = `匹配度 ${job.matchResult.score}%`;
      badge.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: ${job.matchResult.score >= 80 ? '#52c41a' : '#1890ff'};
        color: white;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10;
      `;

      job.element.style.position = 'relative';
      job.element.appendChild(badge);

      // 高亮边框
      if (job.matchResult.score >= 80) {
        job.element.style.border = '2px solid #52c41a';
        job.element.style.boxShadow = '0 2px 8px rgba(82, 196, 26, 0.3)';
      }
    }
  }

  /**
   * 在详情页显示匹配度
   */
  function showMatchScoreOnPage(matchResult) {
    const scorePanel = document.createElement('div');
    scorePanel.className = 'boss-assistant-score-panel';
    scorePanel.innerHTML = `
      <div style="
        position: fixed;
        top: 100px;
        right: 20px;
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        z-index: 9999;
        min-width: 250px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">职位匹配度分析</h3>
        <div style="font-size: 32px; font-weight: bold; color: ${matchResult.score >= 80 ? '#52c41a' : matchResult.score >= 60 ? '#1890ff' : '#faad14'}; text-align: center; margin: 10px 0;">
          ${matchResult.score}
        </div>
        <div style="text-align: center; color: #999; margin-bottom: 15px;">满分100</div>
        <div style="border-top: 1px solid #f0f0f0; padding-top: 15px; font-size: 13px; color: #666;">
          <div style="margin: 8px 0;">技能: ${matchResult.details.skillScore || 0}分</div>
          <div style="margin: 8px 0;">加分项: ${matchResult.details.bonusScore || 0}分</div>
          <div style="margin: 8px 0;">薪资: ${matchResult.details.salaryScore || 0}分</div>
          <div style="margin: 8px 0;">地点: ${matchResult.details.locationScore || 0}分</div>
        </div>
        <div style="margin-top: 15px; padding: 10px; background: ${matchResult.passed ? '#f6ffed' : '#fff7e6'}; border-radius: 6px; font-size: 13px; color: ${matchResult.passed ? '#52c41a' : '#faad14'}; text-align: center;">
          ${matchResult.passed ? '✓ 推荐投递' : '△ 匹配度较低'}
        </div>
      </div>
    `;

    document.body.appendChild(scorePanel);

    // 5秒后自动缩小到角落
    setTimeout(() => {
      scorePanel.querySelector('div').style.cssText += 'transform: scale(0.8); transition: transform 0.3s;';
    }, 5000);
  }

  /**
   * 添加一键打招呼按钮
   */
  function addQuickGreetButton(jobInfo) {
    const button = document.createElement('button');
    button.className = 'boss-assistant-quick-greet';
    button.textContent = '🤖 一键打招呼';
    button.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      padding: 14px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 25px;
      font-size: 15px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      z-index: 9999;
      transition: all 0.3s;
    `;

    button.onmouseover = () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
    };

    button.onmouseout = () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    };

    button.onclick = async () => {
      button.disabled = true;
      button.textContent = '发送中...';

      const result = await BossChatbot.sendGreeting(jobInfo.id, jobInfo);

      if (result.success) {
        button.textContent = '✓ 已发送';
        button.style.background = '#52c41a';
        setTimeout(() => button.remove(), 2000);
      } else {
        button.textContent = '✗ 发送失败';
        button.style.background = '#f5222d';
        button.disabled = false;
        setTimeout(() => {
          button.textContent = '🤖 一键打招呼';
          button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }, 2000);
      }
    };

    document.body.appendChild(button);
  }

  /**
   * 添加控制面板
   */
  function addControlPanel() {
    // 检查是否已存在，避免重复创建
    if (document.getElementById('boss-assistant-panel')) {
      BossUtils.log('debug', '控制面板已存在，跳过创建');
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'boss-assistant-panel';
    panel.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        background: white;
        padding: 10px;
        border-radius: 8px 0 0 8px;
        box-shadow: -2px 0 10px rgba(0,0,0,0.1);
        z-index: 10000;
        cursor: pointer;
      ">
        <div style="writing-mode: vertical-rl; font-size: 12px; color: #666; font-weight: bold;">
          Boss助手
        </div>
      </div>
    `;

    panel.onclick = () => {
      chrome.runtime.sendMessage({ action: 'openPopup' });
    };

    document.body.appendChild(panel);
  }

  /**
   * 监控新消息
   */
  function monitorNewMessages() {
    let lastMessageCount = 0;

    setInterval(async () => {
      const messages = await BossChatbot.checkNewMessages();

      if (messages.length > lastMessageCount) {
        const newMessages = messages.slice(lastMessageCount);

        for (const msg of newMessages) {
          BossUtils.log('info', `新消息来自 ${msg.sender}: ${msg.content.substring(0, 30)}...`);

          // 发送通知
          await BossNotifier.notifyNewMessage(msg.sender, msg.content);

          // 检查是否包含面试关键词
          if (msg.content.includes('面试') || msg.content.includes('邀请')) {
            await BossNotifier.notifyInterviewInvite(msg.sender, '面试邀请', msg.content);
          }

          // 自动回复
          if (config.autoReplyEnabled) {
            await BossChatbot.autoReply(msg);
          }
        }

        lastMessageCount = messages.length;
      }
    }, 10000);  // 每10秒检查一次
  }

  /**
   * 监听页面变化
   */
  function observePageChanges() {
    // 如果已有observer，先断开
    if (pageObserver) {
      pageObserver.disconnect();
      BossUtils.log('debug', '断开旧的页面监听器');
    }

    let lastUrl = window.location.href;

    pageObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        BossUtils.log('info', '页面URL变化，重新检测页面');
        detectPage();
      }
    });

    pageObserver.observe(document.body, { childList: true, subtree: true });
    BossUtils.log('debug', '页面变化监听器已启动');
  }

  /**
   * 监听来自popup的消息
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startAutoGreet') {
      handleAutoGreet();
      sendResponse({ success: true });
    } else if (request.action === 'refreshConfig') {
      initialize();
      sendResponse({ success: true });
    }
  });

  /**
   * 自动打招呼流程
   */
  async function handleAutoGreet() {
    if (isRunning) {
      BossUtils.showToast('自动打招呼正在进行中', 'warning');
      return;
    }

    isRunning = true;
    BossUtils.showToast('开始自动打招呼', 'info');

    try {
      const jobs = await scanJobs();
      const matchedJobs = await JobMatcher.matchBatch(jobs, config);

      const results = await BossChatbot.greetBatch(matchedJobs);

      const successCount = results.filter(r => r.result.success).length;
      BossUtils.showToast(`自动打招呼完成: ${successCount}/${results.length}`, 'success');
    } catch (error) {
      BossUtils.log('error', '自动打招呼失败', error.message);
      BossUtils.showToast('自动打招呼失败', 'error');
    } finally {
      isRunning = false;
    }
  }

  // 启动
  initialize();
})();
