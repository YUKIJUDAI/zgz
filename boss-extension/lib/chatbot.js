/**
 * Boss直聘求职助手 - 智能聊天机器人
 * 自动打招呼、智能回复
 */

const BossChatbot = {
  config: null,
  greetingSent: false,

  /**
   * 初始化聊天机器人
   */
  async initialize(config) {
    this.config = config;
    BossUtils.log('info', '聊天机器人初始化完成');
  },

  /**
   * 生成个性化打招呼语
   */
  async generateGreeting(jobInfo) {
    // 如果有自定义开场白，直接使用
    if (this.config.customIntro && this.config.customIntro.trim()) {
      return this.config.customIntro;
    }

    // 否则根据职位信息智能生成
    const profile = this.config.profile || {};
    const greeting = this.buildGreetingTemplate(jobInfo, profile);

    // TODO: 未来可以接入AI生成更个性化的打招呼语
    // if (AIService && this.config.useAIGreeting) {
    //   return await AIService.call(this.buildGreetingPrompt(jobInfo, profile));
    // }

    return greeting;
  },

  /**
   * 构建打招呼模板
   */
  buildGreetingTemplate(jobInfo, profile) {
    const templates = [
      // 简洁型
      `您好！我是${profile.name || '求职者'}，有${profile.yearsExperience || 'X'}年${profile.techStack || '前端'}开发经验，对贵司的${jobInfo.title || '这个职位'}很感兴趣。我熟悉${profile.techStack || 'Vue/React/TypeScript'}等技术栈，期望薪资${profile.expectedSalary || 'X-X'}K，${profile.availability || '随时可到岗'}。期待和您详细沟通！`,

      // 技术型
      `您好！看到贵司招聘${jobInfo.title || '前端工程师'}，我觉得很匹配。我有${profile.yearsExperience || 'X'}年开发经验，主要使用${profile.techStack || 'Vue3/TypeScript/JavaScript'}，擅长${this.extractSkillFromJob(jobInfo)}。目前${profile.availability || '随时可到岗'}，期望薪资${profile.expectedSalary || 'X-X'}K。方便的话可以详聊一下岗位详情吗？`,

      // 诚恳型
      `您好！我是一名有${profile.yearsExperience || 'X'}年经验的${profile.currentRole || '前端工程师'}，看到贵司的职位觉得很适合我。我的技术栈是${profile.techStack || 'Vue/TS/JS'}，${profile.availability || '目前可随时到岗'}，期望${profile.expectedSalary || 'X-X'}K。如果合适的话，希望能有机会深入了解一下这个岗位。期待您的回复！`,
    ];

    // 随机选择一个模板，增加多样性
    const template = templates[Math.floor(Math.random() * templates.length)];
    return template;
  },

  /**
   * 从职位信息中提取关键技能
   */
  extractSkillFromJob(jobInfo) {
    const skills = ['组件开发', '性能优化', '工程化建设', '中后台系统', '移动端开发'];
    const text = `${jobInfo.title} ${jobInfo.description || ''}`.toLowerCase();

    for (const skill of skills) {
      if (text.includes(skill.toLowerCase())) {
        return skill;
      }
    }

    return '前端开发';
  },

  /**
   * 发送打招呼消息
   */
  async sendGreeting(jobId, jobInfo) {
    if (!this.config.greetingEnabled) {
      BossUtils.log('debug', '打招呼功能未启用');
      return { success: false, reason: '功能未启用' };
    }

    // 检查每日限制
    const todayCount = await BossUtils.getTodayGreetCount();
    if (todayCount >= this.config.dailyLimit) {
      BossUtils.log('warn', `今日已达打招呼上限: ${this.config.dailyLimit}`);
      return { success: false, reason: '达到每日上限' };
    }

    // 检查是否已处理
    const processed = await BossUtils.isJobProcessed(jobId);
    if (processed) {
      BossUtils.log('debug', '该职位今日已处理过');
      return { success: false, reason: '今日已处理' };
    }

    try {
      // 生成打招呼内容
      const greeting = await this.generateGreeting(jobInfo);

      // 查找打招呼按钮
      const chatButton = await this.findChatButton();
      if (!chatButton) {
        BossUtils.log('warn', '未找到聊天按钮');
        return { success: false, reason: '未找到聊天按钮' };
      }

      // 点击打招呼按钮
      await BossUtils.safeClick(chatButton);
      await BossUtils.randomDelay(1000, 2000);

      // 等待输入框出现
      const inputBox = await BossUtils.waitForElement(
        'textarea[placeholder*="聊天"], textarea[placeholder*="消息"], .chat-input textarea, #chat-input',
        5000
      );

      if (!inputBox) {
        BossUtils.log('warn', '未找到输入框');
        return { success: false, reason: '未找到输入框' };
      }

      // 输入打招呼内容
      await BossUtils.typeLikeHuman(inputBox, greeting);
      await BossUtils.randomDelay(500, 1000);

      // 查找发送按钮
      const sendButton = await BossUtils.waitForElement(
        'button[type="submit"], .chat-send-btn, .send-btn, button:has-text("发送")',
        3000
      );

      if (sendButton) {
        await BossUtils.safeClick(sendButton, false);
        await BossUtils.randomDelay(1000, 2000);
      } else {
        // 如果没找到按钮，尝试按回车
        inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await BossUtils.randomDelay(1000, 2000);
      }

      // 记录打招呼
      await BossUtils.recordGreet();
      await BossUtils.markJobProcessed(jobId);

      BossUtils.log('info', `✅ 成功向 [${jobInfo.company}] ${jobInfo.title} 发送打招呼`);
      BossUtils.showToast(`已向 ${jobInfo.company} 打招呼 (${todayCount + 1}/${this.config.dailyLimit})`, 'success');

      return { success: true, message: greeting };
    } catch (error) {
      BossUtils.log('error', '发送打招呼失败', error.message);
      return { success: false, reason: error.message };
    }
  },

  /**
   * 查找聊天/打招呼按钮
   */
  async findChatButton() {
    const selectors = [
      '.job-detail .btn-startchat',
      '.job-detail .start-chat-btn',
      '.op-btn-chat',
      'a[ka="job-detail-chat"]',
      'button:has-text("立即沟通")',
      'button:has-text("开始聊天")',
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button && button.offsetParent !== null) {
        return button;
      }
    }

    return null;
  },

  /**
   * 检测新消息
   */
  async checkNewMessages() {
    // 查找消息列表中的未读消息
    const unreadMessages = document.querySelectorAll('.chat-conversation-list .unread, .message-item.unread');

    if (unreadMessages.length === 0) {
      return [];
    }

    const messages = [];
    for (const msg of unreadMessages) {
      const sender = msg.querySelector('.name, .sender-name')?.textContent || '未知';
      const content = msg.querySelector('.content, .message-text')?.textContent || '';
      const time = msg.querySelector('.time, .message-time')?.textContent || '';

      messages.push({ sender, content, time });
    }

    return messages;
  },

  /**
   * 自动回复消息
   */
  async autoReply(message) {
    if (!this.config.autoReplyEnabled) {
      return { success: false, reason: '自动回复未启用' };
    }

    try {
      // 根据消息内容生成回复
      const reply = await this.generateReply(message);

      if (!reply) {
        BossUtils.log('debug', '无需回复此消息');
        return { success: false, reason: '无需回复' };
      }

      // 模拟延迟（更像人类）
      const delay = (this.config.replyDelayMin + Math.random() * (this.config.replyDelayMax - this.config.replyDelayMin)) * 60 * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      // 查找输入框并发送回复
      const inputBox = document.querySelector('textarea[placeholder*="聊天"], .chat-input textarea');
      if (!inputBox) {
        return { success: false, reason: '未找到输入框' };
      }

      await BossUtils.typeLikeHuman(inputBox, reply);
      await BossUtils.randomDelay(500, 1000);

      const sendButton = document.querySelector('button[type="submit"], .chat-send-btn');
      if (sendButton) {
        await BossUtils.safeClick(sendButton, false);
      } else {
        inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }

      BossUtils.log('info', `自动回复: ${reply.substring(0, 30)}...`);
      return { success: true, reply };
    } catch (error) {
      BossUtils.log('error', '自动回复失败', error.message);
      return { success: false, reason: error.message };
    }
  },

  /**
   * 生成智能回复
   */
  async generateReply(message) {
    const content = message.content.toLowerCase();
    const profile = this.config.profile || {};

    // 问电话
    if (content.includes('电话') || content.includes('联系方式') || content.includes('手机')) {
      return `我的联系方式是：${profile.phone || '手机号码'}，方便的话可以电话或微信沟通。`;
    }

    // 问薪资
    if (content.includes('期望薪资') || content.includes('薪资要求') || content.includes('expected salary')) {
      return `我的期望薪资是${profile.expectedSalary || 'X-X'}K，具体可以根据岗位职责和福利待遇面议。`;
    }

    // 问到岗时间
    if (content.includes('到岗') || content.includes('入职') || content.includes('什么时候')) {
      return `我目前${profile.availability || '随时可到岗'}，如果合适的话可以尽快安排面试。`;
    }

    // 邀请面试
    if (content.includes('面试') || content.includes('来公司') || content.includes('约个时间')) {
      return `好的，我这边时间比较灵活，您看什么时间方便？我可以配合您的安排。`;
    }

    // 问项目经验
    if (content.includes('项目') || content.includes('经验') || content.includes('做过')) {
      return `我有${profile.yearsExperience || 'X'}年${profile.currentRole || '前端开发'}经验，主要负责过${this.config.requiredSkills?.[0] || '前端'}相关的项目。具体可以面试时详细沟通。`;
    }

    // 问技术栈
    if (content.includes('技术栈') || content.includes('熟悉') || content.includes('会不会')) {
      return `我主要的技术栈是${profile.techStack || 'Vue/TypeScript/JavaScript'}，有比较丰富的实战经验。`;
    }

    // 默认礼貌回复
    return null;  // 不自动回复，避免过于机械
  },

  /**
   * 批量打招呼
   */
  async greetBatch(jobs) {
    const results = [];
    const todayCount = await BossUtils.getTodayGreetCount();
    const remaining = this.config.dailyLimit - todayCount;

    if (remaining <= 0) {
      BossUtils.showToast('今日打招呼次数已用完', 'warning');
      return results;
    }

    const toGreet = jobs.slice(0, remaining);
    BossUtils.log('info', `开始批量打招呼: ${toGreet.length}个职位`);

    for (let i = 0; i < toGreet.length; i++) {
      const job = toGreet[i];
      BossUtils.log('info', `[${i + 1}/${toGreet.length}] 正在处理: ${job.company} - ${job.title}`);

      const result = await this.sendGreeting(job.id, job);
      results.push({ job, result });

      // 随机延迟，避免被检测
      await BossUtils.randomDelay(
        this.config.actionDelayMin * 1000,
        this.config.actionDelayMax * 1000
      );
    }

    return results;
  },
};
