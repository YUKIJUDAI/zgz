/**
 * Boss直聘求职助手 - 核心配置文件
 *
 * 说明：
 * 1. 这个文件包含了扩展的所有关键参数
 * 2. 修改此文件后需要重新加载扩展才能生效
 * 3. UI配置会覆盖部分默认值，但不会覆盖行为参数
 */

const BossConfig = {

  // ============================================
  // 1. 用户默认配置（可通过UI修改）
  // ============================================
  defaults: {
    // 基本开关
    enabled: true,

    // 搜索条件
    keywords: ['前端开发', '高级前端工程师', 'Vue前端工程师', '前端架构师', '中后台前端', 'H5开发', '移动端前端'],
    locations: ['杭州'],
    salaryMin: 15000,  // 最低期望薪资（元/月）
    experience: '3-10年',

    // 匹配规则
    requiredSkills: [
      'Vue', 'Vue3', 'TypeScript', 'JavaScript',
      '前端工程化', '组件库', '中后台', 'H5', '移动端'
    ],
    bonusSkills: [
      'React', 'Electron', '小程序', 'Node.js',
      'Less', 'Webpack', 'Vite', '性能优化', 'AI Coding'
    ],
    excludedKeywords: [
      '外包', '驻场', '996', '大小周', '单休', '融资未到位'
    ],
    matchThreshold: 60,  // 匹配阈值（60-100分）

    // 打招呼设置
    greetingEnabled: true,
    dailyLimit: 30,  // 每日打招呼上限
    customIntro: '',  // 自定义开场白（留空则自动生成）

    // 个人资料
    profile: {
      name: '金超宇',
      yearsExperience: 9,
      currentRole: '高级前端工程师',
      techStack: 'Vue3/TypeScript/JavaScript/Less',
      phone: '18557519506',
      expectedSalary: '10-20',  // K为单位
      availability: '已离职，随时可到岗',
      city: '杭州',
      github: 'https://github.com/YUKIJUDAI',
    },

    // 自动回复
    autoReplyEnabled: false,  // 默认关闭，避免误操作
    replyDelayMin: 5,   // 回复延迟最小值（分钟）
    replyDelayMax: 15,  // 回复延迟最大值（分钟）

    // 通知设置（默认为空，需用户自行配置）
    wechatWebhook: '',
    serverChanKey: '',
    barkKey: '',

    // 运行设置
    actionDelayMin: 3,  // 操作间隔最小值（秒）
    actionDelayMax: 8,  // 操作间隔最大值（秒）
  },

  // ============================================
  // 2. 匹配评分权重配置
  // ============================================
  scoring: {
    // 各项评分的最大分值
    maxScores: {
      skill: 50,      // 必备技能匹配
      bonus: 20,      // 加分技能
      salary: 15,     // 薪资匹配
      location: 10,   // 地点匹配
      title: 5,       // 职位标题匹配
    },

    // 加分技能的单项分值
    bonusSkillScore: 5,  // 每个加分技能给5分

    // 薪资匹配的评分逻辑
    salary: {
      minMatch: 15,      // 最低薪资满足：满分
      maxMatch: 10,      // 最高薪资满足：10分
      noMatch: 0,        // 都不满足：0分
      unknown: 7.5,      // 薪资未知：默认7.5分
    },

    // 匹配度等级（用于UI显示）
    levels: {
      excellent: 80,  // 80分以上：强烈推荐（绿色）
      good: 60,       // 60-79分：值得考虑（蓝色）
      poor: 0,        // 60分以下：不推荐（无标签）
    },
  },

  // ============================================
  // 3. 行为控制参数（防止检测）
  // ============================================
  behavior: {
    // 延迟设置（毫秒）
    delays: {
      pageLoad: { min: 1000, max: 2000 },      // 页面加载后等待
      beforeClick: { min: 800, max: 2000 },    // 点击前等待
      afterClick: { min: 1000, max: 2500 },    // 点击后等待
      typing: { min: 30, max: 120 },           // 打字间隔（每个字符）
      beforeSend: { min: 500, max: 1000 },     // 发送前等待
      afterSend: { min: 1000, max: 2000 },     // 发送后等待
      betweenJobs: { min: 50, max: 150 },      // 处理职位间隔
    },

    // 滚动设置
    scroll: {
      minAmount: 200,     // 最小滚动距离（像素）
      maxAmount: 500,     // 最大滚动距离（像素）
      probability: 0.3,   // 向下滚动概率（0.3表示30%向下，70%向上）
      afterDelay: { min: 500, max: 1500 },  // 滚动后等待
    },

    // 点击设置（模拟真人）
    click: {
      randomOffsetX: 5,   // X轴随机偏移（-5 到 +5 像素）
      randomOffsetY: 3,   // Y轴随机偏移（-3 到 +3 像素）
    },

    // 限制设置
    limits: {
      dailyGreet: 30,           // 每日打招呼上限（硬限制）
      maxContinuous: 5,         // 最大连续操作次数（之后会长时间休息）
      restAfterContinuous: { min: 30000, max: 60000 },  // 连续操作后休息时间（毫秒）
    },

    // 重试设置
    retry: {
      maxAttempts: 3,          // 最大重试次数
      backoffMultiplier: 2,    // 退避倍数（第一次等1秒，第二次等2秒，第三次等4秒）
      initialDelay: 1000,      // 初始重试延迟（毫秒）
    },
  },

  // ============================================
  // 4. 距离评估配置
  // ============================================
  distance: {
    // 高德地图API配置
    gaode: {
      apiKey: '49a611f338c2835bf94834a973a2e6a5',  // 需要用户自行配置
      city: '杭州',
      enabled: false,  // 默认关闭，需用户配置后启用
    },

    // 家庭地址
    homeAddress: '杭州市拱墅区都市水乡水曲苑',  // 需要用户配置

    // 通勤限制
    limits: {
      maxCommuteTime: 40,    // 最大通勤时间（分钟）
      maxDistance: 8000,    // 最大直线距离（米）
    },

    // 偏好区域
    preferredAreas: ['西湖', '拱墅', '余杭'],
    maxDistanceLevel: 2,  // 最大距离等级（0=同区 1=邻区 2=较远 3=很远）

    // 缓存设置
    cacheExpiry: 7 * 24 * 60 * 60 * 1000,  // 7天（毫秒）

    // 距离评分逻辑（通勤时间）
    scoring: {
      veryClose: { maxTime: 20, score: 10, level: 0 },   // ≤20分钟：非常近
      close: { maxTime: 30, score: 8, level: 1 },        // ≤30分钟：可接受
      moderate: { maxTime: 45, score: 6, level: 2 },     // ≤45分钟：稍远
      far: { maxTime: 60, score: 3, level: 3 },          // ≤60分钟：较远
      tooFar: { score: 0, level: 4 },                    // >60分钟：太远
    },
  },

  // ============================================
  // 5. AI服务配置
  // ============================================
  ai: {
    // 默认关闭，需要用户配置
    enabled: false,

    // 服务提供商：'openai' | 'claude' | 'local'
    provider: 'openai',

    // OpenAI配置
    openai: {
      apiKey: '',
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
    },

    // Claude配置
    claude: {
      apiKey: '',
      baseURL: 'https://api.anthropic.com/v1',
      model: 'claude-3-haiku-20240307',
      maxTokens: 1000,
    },

    // 本地模型配置（Ollama）
    local: {
      baseURL: 'http://localhost:11434',
      model: 'llama2',
    },

    // 速率限制
    rateLimit: {
      perMinute: 20,   // 每分钟最多20次
      perHour: 200,    // 每小时最多200次
    },

    // 缓存设置
    cache: {
      enabled: true,
      expiry: 60 * 60 * 1000,  // 1小时（毫秒）
    },

    // 超时设置
    timeout: 30000,  // 30秒
  },

  // ============================================
  // 6. 通知配置
  // ============================================
  notification: {
    // 浏览器通知
    browser: {
      enabled: true,
      autoClose: 10000,  // 10秒后自动关闭（毫秒）
      requireInteraction: false,  // 是否需要用户交互才关闭
    },

    // 企业微信
    wechat: {
      enabled: false,
      webhook: '',  // 需要用户配置
    },

    // Server酱
    serverChan: {
      enabled: false,
      key: '',  // 需要用户配置
      apiURL: 'https://sctapi.ftqq.com',
    },

    // Bark（iOS）
    bark: {
      enabled: false,
      key: '',  // 需要用户配置
      apiURL: 'https://api.day.app',
    },

    // 通知触发条件
    triggers: {
      highScoreJob: 80,        // 高分职位（≥80分）
      newMessage: true,        // 新消息
      interviewInvite: true,   // 面试邀请
      dailySummary: true,      // 每日统计
      error: true,             // 错误提醒
    },
  },

  // ============================================
  // 7. 日志配置
  // ============================================
  logging: {
    // 日志级别：'debug' | 'info' | 'warn' | 'error'
    level: 'info',

    // 存储设置
    maxEntries: 200,  // 最多保存200条日志

    // 是否在console输出
    console: true,

    // 是否存储到Chrome Storage
    storage: true,
  },

  // ============================================
  // 8. UI配置
  // ============================================
  ui: {
    // 匹配度面板
    scorePanel: {
      position: { top: '100px', right: '20px' },
      autoMinimize: true,       // 5秒后自动缩小
      minimizeDelay: 5000,      // 缩小延迟（毫秒）
    },

    // 一键打招呼按钮
    quickGreetButton: {
      position: { bottom: '30px', right: '30px' },
      showCondition: 'matched',  // 'always' | 'matched' | 'high-score'
    },

    // 控制面板
    controlPanel: {
      position: { top: '50%', right: '0' },
      enabled: true,
    },

    // Toast提示
    toast: {
      duration: 4000,  // 显示时长（毫秒）
      position: { top: '80px', right: '20px' },
    },

    // 主题色
    colors: {
      primary: '#667eea',
      secondary: '#764ba2',
      success: '#52c41a',
      warning: '#faad14',
      error: '#f5222d',
      info: '#1890ff',
    },
  },

  // ============================================
  // 9. 开发调试配置
  // ============================================
  debug: {
    // 是否启用调试模式
    enabled: true,            // ✅ 已启用调试模式

    // 调试模式下的特殊行为
    skipDelays: false,        // ✅ 保留正常延迟（防检测）
    verboseLogging: true,     // ✅ 详细日志输出
    dryRun: false,           // 实际发送消息
    mockResponses: false,     // 使用真实响应
  },

  // ============================================
  // 10. 选择器配置（页面元素定位）
  // ============================================
  selectors: {
    // 职位列表页
    jobList: {
      jobCards: '.job-card-wrapper, .job-card-box, li.job-card',
      title: '.job-title, .job-name',
      company: '.company-name',
      salary: '.salary, .job-salary',
      location: '.job-area, .job-location',
      tags: '.tag-list li, .job-tags span',
      experience: '.job-experience, .job-limit-experience',
    },

    // 职位详情页
    jobDetail: {
      title: '.job-title, .name, h1.job-name',
      company: '.company-name, .name',
      salary: '.salary, .job-salary',
      location: '.job-location, .location-address',
      tags: '.tag-list li, .job-tags span',
      description: '.job-sec-text, .job-detail-section, .job-description',
      chatButton: [
        '.job-detail .btn-startchat',
        '.job-detail .start-chat-btn',
        '.op-btn-chat',
        'a[ka="job-detail-chat"]',
      ],
    },

    // 聊天页面
    chat: {
      inputBox: [
        'textarea[placeholder*="聊天"]',
        'textarea[placeholder*="消息"]',
        '.chat-input textarea',
        '#chat-input',
      ],
      sendButton: [
        'button[type="submit"]',
        '.chat-send-btn',
        '.send-btn',
      ],
      unreadMessages: '.chat-conversation-list .unread, .message-item.unread',
      messageSender: '.name, .sender-name',
      messageContent: '.content, .message-text',
      messageTime: '.time, .message-time',
    },
  },

  // ============================================
  // 工具函数：获取合并后的配置
  // ============================================

  /**
   * 获取完整配置（合并默认值和用户配置）
   */
  getMergedConfig(userConfig = {}) {
    return {
      ...this.defaults,
      ...userConfig,
      profile: {
        ...this.defaults.profile,
        ...(userConfig.profile || {}),
      },
    };
  },

  /**
   * 获取行为参数（不受用户配置影响）
   */
  getBehaviorConfig() {
    return this.behavior;
  },

  /**
   * 获取评分配置
   */
  getScoringConfig() {
    return this.scoring;
  },

  /**
   * 检查是否为调试模式
   */
  isDebugMode() {
    return this.debug.enabled;
  },
};

// 导出配置（用于在其他脚本中引用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BossConfig;
}
