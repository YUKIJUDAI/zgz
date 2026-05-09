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
  let jobListObserver = null; // 职位列表滚动加载观察器
  let processedJobIds = new Set(); // 已处理的职位ID，避免重复标记

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
    console.log('[匹配调试] 1. 开始处理职位列表页');
    BossUtils.log('info', '开始处理职位列表页');

    // 等待职位列表加载
    await BossUtils.randomDelay(1000, 2000);

    // 扫描职位
    console.log('[匹配调试] 2. 开始扫描职位...');
    const jobs = await scanJobs();
    console.log('[匹配调试] 3. 扫描结果:', {
      职位数量: jobs.length,
      第一个职位: jobs[0] ? {
        标题: jobs[0].title,
        公司: jobs[0].company,
        薪资: jobs[0].salary
      } : '无'
    });
    BossUtils.log('info', `扫描到 ${jobs.length} 个职位`);

    if (jobs.length === 0) {
      console.warn('[匹配调试] ⚠ 没有扫描到任何职位！');
      BossUtils.showToast('未扫描到职位，请刷新页面重试', 'warning');
      return;
    }

    // 匹配职位
    console.log('[匹配调试] 4. 开始匹配职位，配置:', {
      必备技能: config.requiredSkills,
      加分技能: config.bonusSkills,
      匹配阈值: config.matchThreshold,
      排除关键词: config.excludedKeywords
    });

    const matchedJobs = await JobMatcher.matchBatch(jobs, config);

    console.log('[匹配调试] 5. 匹配结果:', {
      匹配数量: matchedJobs.length,
      总职位数: jobs.length,
      匹配率: `${((matchedJobs.length / jobs.length) * 100).toFixed(1)}%`
    });

    BossUtils.log('info', `匹配到 ${matchedJobs.length} 个合适职位`);

    if (matchedJobs.length === 0) {
      console.warn('[匹配调试] ⚠ 没有职位通过匹配！');

      // 显示详细信息
      const msg = `扫描了${jobs.length}个职位，但没有符合条件的\n\n当前配置：\n` +
        `• 必备技能：${config.requiredSkills?.join(', ') || '未设置'}\n` +
        `• 匹配阈值：${config.matchThreshold || 60}分\n` +
        `• 排除词：${config.excludedKeywords?.join(', ') || '无'}\n\n` +
        `建议：降低匹配阈值或检查技能配置`;

      BossUtils.showToast(`扫描了${jobs.length}个职位，0个匹配`, 'warning');

      // 记录到日志
      BossUtils.log('warn', `匹配失败：扫描${jobs.length}个职位，0个匹配`);
      BossUtils.log('info', `配置：技能[${config.requiredSkills?.join(',')}] 阈值[${config.matchThreshold}]`);
    } else {
      // 匹配成功，显示摘要
      const highScore = matchedJobs.filter(j => j.matchResult.score >= 80).length;
      const msg = `✓ 找到${matchedJobs.length}个匹配职位（${highScore}个高分）`;
      BossUtils.showToast(msg, 'success');
      BossUtils.log('info', msg);
    }

    // 在页面上标记匹配度（标记所有职位，包括不匹配的）
    console.log('[匹配调试] 6. 开始标记职位');
    markAllJobsOnPage(jobs, config);

    // 通知高分职位
    for (const job of matchedJobs) {
      if (job.matchResult.score >= 80) {
        await BossNotifier.notifyHighScoreJob(job, job.matchResult.score);
      }
    }

    console.log('[匹配调试] 7. ✓ 职位列表页处理完成');

    // 显示诊断面板（第一个职位的详细信息）
    if (jobs.length > 0) {
      showDiagnosticPanel(jobs[0], config);
    }

    // 启动职位列表滚动加载监听
    startJobListObserver();
  }

  /**
   * 显示诊断面板（无需 F12）
   */
  function showDiagnosticPanel(firstJob, config) {
    // 移除旧面板
    const oldPanel = document.getElementById('boss-diagnostic-panel');
    if (oldPanel) oldPanel.remove();

    // 为第一个职位评分
    const matchResult = JobMatcher.match(firstJob, config);

    const panel = document.createElement('div');
    panel.id = 'boss-diagnostic-panel';
    panel.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        z-index: 99999;
        max-width: 400px;
        font-size: 12px;
        font-family: monospace;
        border: 2px solid #1890ff;
      ">
        <div style="font-weight: bold; margin-bottom: 10px; color: #1890ff; display: flex; justify-content: space-between; align-items: center;">
          <span>🔍 匹配诊断</span>
          <button id="close-diagnostic" style="border: none; background: none; cursor: pointer; font-size: 18px;">×</button>
        </div>
        <div style="margin-bottom: 8px;">
          <strong>示例职位:</strong> ${firstJob.title}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>公司:</strong> ${firstJob.company}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>标签:</strong> ${firstJob.tags.join(', ') || '(无)'}
        </div>
        <div style="margin-bottom: 8px;">
          <strong>经验:</strong> ${firstJob.experience || '(无)'}
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 8px; margin-top: 8px;">
          <strong>您的配置:</strong>
        </div>
        <div style="margin: 4px 0;">必备: ${config.requiredSkills?.join(', ') || '(未设置)'}</div>
        <div style="margin: 4px 0;">加分: ${config.bonusSkills?.join(', ') || '(未设置)'}</div>
        <div style="margin: 4px 0;">阈值: ${config.matchThreshold || 60}分</div>
        <div style="border-top: 1px solid #eee; padding-top: 8px; margin-top: 8px;">
          <strong>评分结果:</strong>
        </div>
        <div style="margin: 4px 0; ${matchResult.details.skillScore === 0 ? 'color: red; font-weight: bold;' : ''}">
          技能: ${matchResult.details.skillScore || 0}/${config.requiredSkills?.length ? 50 : 50}分
        </div>
        <div style="margin: 4px 0;">加分: ${matchResult.details.bonusScore || 0}/20分</div>
        <div style="margin: 4px 0;">薪资: ${matchResult.details.salaryScore || 0}/15分</div>
        <div style="margin: 4px 0;">地点: ${matchResult.details.locationScore || 0}/10分</div>
        <div style="margin: 4px 0; font-weight: bold; color: ${matchResult.score >= 60 ? '#52c41a' : '#f5222d'};">
          总分: ${matchResult.score}/100
        </div>
        <div style="margin-top: 8px; font-size: 10px; color: #999;">
          鼠标悬停职位标签可看详情
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // 添加关闭按钮事件
    document.getElementById('close-diagnostic').addEventListener('click', () => {
      panel.remove();
    });

    // 5秒后自动缩小
    setTimeout(() => {
      panel.querySelector('div').style.transform = 'scale(0.85)';
      panel.querySelector('div').style.transition = 'transform 0.3s';
    }, 3000);
  }

  /**
   * 监听职位列表的滚动加载
   */
  function startJobListObserver() {
    // 如果已有观察器，先断开
    if (jobListObserver) {
      jobListObserver.disconnect();
    }

    console.log('[滚动加载] 启动职位列表观察器...');

    // 找到职位列表容器
    const jobListContainer = document.querySelector('.job-list-box, [class*="job-list"]') || document.body;

    jobListObserver = new MutationObserver((mutations) => {
      let hasNewJobs = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          // 检查新增的节点是否包含职位卡片
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              // 检查节点本身或其子节点是否是职位卡片
              const isJobCard = node.className && (
                node.className.includes('job-card') ||
                node.className.includes('job-list')
              );

              const hasJobCards = node.querySelectorAll &&
                node.querySelectorAll('[class*="job-card"], li[class*="job"]').length > 0;

              if (isJobCard || hasJobCards) {
                hasNewJobs = true;
              }
            }
          });
        }
      }

      if (hasNewJobs) {
        console.log('[滚动加载] 检测到新职位，准备评分...');
        // 延迟一点确保 DOM 完全加载
        setTimeout(() => {
          handleNewJobs();
        }, 500);
      }
    });

    jobListObserver.observe(jobListContainer, {
      childList: true,
      subtree: true
    });

    console.log('[滚动加载] ✓ 观察器已启动');
    BossUtils.log('info', '滚动加载监听已启动');
  }

  /**
   * 处理新加载的职位
   */
  async function handleNewJobs() {
    console.log('[滚动加载] 开始扫描新职位...');

    const jobs = await scanJobs();

    // 过滤出新职位（之前没处理过的）
    const newJobs = jobs.filter(job => !processedJobIds.has(job.id));

    if (newJobs.length === 0) {
      console.log('[滚动加载] 没有发现新职位');
      return;
    }

    console.log(`[滚动加载] 发现 ${newJobs.length} 个新职位`);
    BossUtils.showToast(`发现 ${newJobs.length} 个新职位，正在评分...`, 'info');

    // 标记新职位
    markAllJobsOnPage(newJobs, config);

    console.log('[滚动加载] ✓ 新职位处理完成');
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

    // 尝试多种选择器（Boss直聘页面结构可能变化）
    const selectors = [
      '.job-card-wrapper',
      '.job-card-box',
      'li.job-card',
      '.job-list-box li',
      '[class*="job-card"]',
      'li[class*="job"]',
    ];

    console.log('[扫描调试] 开始尝试多种选择器...');
    let jobCards = null;

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`[扫描调试] 选择器 "${selector}" 找到 ${elements.length} 个元素`);

      if (elements.length > 0) {
        jobCards = elements;
        console.log(`[扫描调试] ✓ 使用选择器: ${selector}`);
        BossUtils.log('info', `使用选择器: ${selector}`);
        break;
      }
    }

    if (!jobCards || jobCards.length === 0) {
      console.error('[扫描调试] ✗ 所有选择器都没找到职位元素');
      console.log('[扫描调试] 页面可能的职位容器:', document.querySelectorAll('[class*="job"]'));

      BossUtils.showToast('⚠ 无法识别页面结构，请刷新页面或联系开发者', 'error');
      BossUtils.log('error', '无法识别页面职位列表结构');
      return jobs;
    }

    console.log(`[扫描调试] 开始解析 ${jobCards.length} 个职位卡片...`);

    for (const card of jobCards) {
      try {
        const job = {
          id: card.getAttribute('data-jid') || card.getAttribute('data-job-id') || Math.random().toString(36),
          title: card.querySelector('.job-title, .job-name, [class*="job-title"], [class*="job-name"]')?.textContent.trim() || '',
          company: card.querySelector('.company-name, [class*="company"]')?.textContent.trim() || '',
          salary: card.querySelector('.salary, .job-salary, [class*="salary"]')?.textContent.trim() || '',
          location: card.querySelector('.job-area, .job-location, [class*="location"], [class*="area"]')?.textContent.trim() || '',
          tags: Array.from(card.querySelectorAll('.tag-list li, .job-tags span, [class*="tag"] span')).map(t => t.textContent.trim()),
          experience: card.querySelector('.job-experience, .job-limit-experience, [class*="experience"]')?.textContent.trim() || '',
          element: card,
        };

        if (job.title && job.company) {
          jobs.push(job);
          console.log(`[扫描调试] ✓ 成功解析:`, {
            标题: job.title,
            公司: job.company,
            薪资: job.salary,
            地点: job.location,
            经验: job.experience,
            标签数量: job.tags.length,
            标签内容: job.tags.join(', ')
          });
        } else {
          console.warn(`[扫描调试] ✗ 跳过无效职位:`, {
            有标题: !!job.title,
            有公司: !!job.company,
            元素HTML: card.innerHTML.substring(0, 100)
          });
        }
      } catch (error) {
        console.error('[扫描调试] 解析职位卡片失败:', error);
        BossUtils.log('warn', '解析职位卡片失败', error.message);
      }
    }

    console.log(`[扫描调试] ✓ 成功解析 ${jobs.length} 个有效职位`);
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
   * 在页面上标记所有职位（包括不匹配的）
   */
  function markAllJobsOnPage(jobs, config) {
    let markedCount = 0;

    for (const job of jobs) {
      if (!job.element) continue;

      // 检查是否已经标记过
      const existingBadge = job.element.querySelector('.boss-assistant-badge');
      if (existingBadge) {
        // 移除旧标签（可能配置已更新）
        existingBadge.remove();
        // 移除旧边框样式
        job.element.style.border = '';
        job.element.style.boxShadow = '';
      }

      // 为每个职位评分
      const matchResult = JobMatcher.match(job, config);

      // 添加匹配度标签
      const badge = document.createElement('div');
      badge.className = 'boss-assistant-badge';
      badge.textContent = `${matchResult.score}分`;

      // 根据分数设置颜色
      let bgColor, textColor;
      if (matchResult.score >= 80) {
        bgColor = '#52c41a';  // 绿色 - 强烈推荐
        textColor = 'white';
      } else if (matchResult.score >= 60) {
        bgColor = '#1890ff';  // 蓝色 - 推荐
        textColor = 'white';
      } else if (matchResult.score >= 40) {
        bgColor = '#faad14';  // 橙色 - 一般
        textColor = 'white';
      } else {
        bgColor = '#d9d9d9';  // 灰色 - 不推荐
        textColor = '#666';
      }

      badge.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: ${bgColor};
        color: ${textColor};
        padding: 6px 12px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: bold;
        z-index: 10;
        cursor: help;
      `;

      // 添加详细信息提示
      badge.title = `匹配详情：\n` +
        `总分：${matchResult.score}/100\n` +
        `技能：${matchResult.details.skillScore || 0}分\n` +
        `加分：${matchResult.details.bonusScore || 0}分\n` +
        `薪资：${matchResult.details.salaryScore || 0}分\n` +
        `地点：${matchResult.details.locationScore || 0}分\n` +
        `${matchResult.passed ? '✓ 达到阈值' : '✗ 未达到阈值(' + (config.matchThreshold || 60) + '分)'}`;

      job.element.style.position = 'relative';
      job.element.appendChild(badge);

      // 高分职位高亮边框
      if (matchResult.score >= 80) {
        job.element.style.border = '2px solid #52c41a';
        job.element.style.boxShadow = '0 2px 8px rgba(82, 196, 26, 0.3)';
      } else if (matchResult.score >= 60) {
        job.element.style.border = '1px solid #1890ff';
      }

      // 记录已处理的职位ID
      processedJobIds.add(job.id);

      markedCount++;
    }

    console.log(`[匹配调试] 已标记 ${markedCount} 个职位`);
    BossUtils.log('info', `已为 ${markedCount} 个职位添加匹配度标签`);
  }

  /**
   * 在页面上标记匹配的职位（旧方法，保留兼容性）
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

    // 点击控制面板时，提示用户点击扩展图标
    panel.onclick = () => {
      BossUtils.showToast('请点击浏览器右上角的扩展图标打开配置面板', 'info');
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
      console.log('[配置更新] 收到配置刷新请求');

      // 清空已处理职位列表，以便重新评分
      processedJobIds.clear();
      console.log('[配置更新] 已清空已处理职位列表');

      // 重新初始化（会重新加载配置）
      initialize().then(() => {
        // 如果在职位列表页，重新处理
        if (currentPage === 'job-list') {
          console.log('[配置更新] 重新处理职位列表页');
          BossUtils.showToast('配置已更新，正在重新评分...', 'info');
          handleJobListPage();
        }
      });
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
