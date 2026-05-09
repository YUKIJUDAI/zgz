/**
 * Boss直聘求职助手 - AI服务抽象层
 * 支持 OpenAI / Claude / 本地模型
 */

const AIService = {
  config: null,
  cache: new Map(),
  rateLimiter: {
    perMinute: 0,
    perHour: 0,
    lastMinute: Date.now(),
    lastHour: Date.now()
  },

  /**
   * 初始化AI服务
   */
  async initialize(config) {
    this.config = {
      provider: config.aiProvider || 'openai',
      model: config.aiModel || 'gpt-4o-mini',
      apiKey: config.openaiApiKey || config.claudeApiKey || '',
      baseURL: config.openaiBaseURL || 'https://api.openai.com/v1',
      claudeBaseURL: config.claudeBaseURL || 'https://api.anthropic.com/v1',
      localBaseURL: config.localBaseURL || 'http://localhost:11434'
    };

    // Validate API key for non-local providers
    if (this.config.provider !== 'local' && !this.config.apiKey) {
      throw new Error(`API密钥缺失: ${this.config.provider}需要API密钥`);
    }

    BossUtils.log('info', `AI服务初始化: ${this.config.provider} / ${this.config.model}`);
    return true;
  },

  /**
   * 获取缓存
   */
  getCache(prompt) {
    const key = this.hashPrompt(prompt);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // 检查是否过期 (1小时)
    const age = Date.now() - cached.timestamp;
    if (age > 60 * 60 * 1000) {
      this.cache.delete(key);
      return null;
    }

    return cached.response;
  },

  /**
   * 设置缓存
   */
  setCache(prompt, response) {
    const key = this.hashPrompt(prompt);
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });
  },

  /**
   * 简单哈希函数
   */
  hashPrompt(prompt) {
    // FNV-1a hash - better distribution than simple bitwise
    let hash = 2166136261;
    for (let i = 0; i < prompt.length; i++) {
      hash ^= prompt.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
  },

  /**
   * 检查速率限制
   */
  checkRateLimit() {
    const now = Date.now();

    // 重置每分钟计数器
    if (now - this.rateLimiter.lastMinute > 60 * 1000) {
      this.rateLimiter.perMinute = 0;
      this.rateLimiter.lastMinute = now;
    }

    // 重置每小时计数器
    if (now - this.rateLimiter.lastHour > 60 * 60 * 1000) {
      this.rateLimiter.perHour = 0;
      this.rateLimiter.lastHour = now;
    }

    // 检查限制
    if (this.rateLimiter.perMinute >= 20) {
      BossUtils.log('warn', 'AI调用速率限制: 每分钟最多20次');
      return false;
    }

    if (this.rateLimiter.perHour >= 200) {
      BossUtils.log('warn', 'AI调用速率限制: 每小时最多200次');
      return false;
    }

    return true;
  },

  /**
   * 记录API调用
   */
  recordCall() {
    this.rateLimiter.perMinute++;
    this.rateLimiter.perHour++;
  },

  /**
   * 调用AI服务
   */
  async call(prompt, options = {}) {
    // 检查缓存
    const cached = this.getCache(prompt);
    if (cached) {
      BossUtils.log('debug', 'AI缓存命中');
      return cached;
    }

    // 检查速率限制
    if (!this.checkRateLimit()) {
      throw new Error('AI调用速率超限，请稍后再试');
    }

    // 调用对应provider
    let response;
    if (this.config.provider === 'openai') {
      response = await this.callOpenAI(prompt, options);
    } else if (this.config.provider === 'claude') {
      response = await this.callClaude(prompt, options);
    } else if (this.config.provider === 'local') {
      response = await this.callLocal(prompt, options);
    } else {
      throw new Error(`不支持的AI provider: ${this.config.provider}`);
    }

    // 记录调用并缓存
    this.recordCall();
    this.setCache(prompt, response);

    return response;
  },

  /**
   * 调用OpenAI API
   */
  async callOpenAI(prompt, options) {
    const url = `${this.config.baseURL}/chat/completions`;

    const body = {
      model: this.config.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000
    };

    // Add timeout handling
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API错误: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('OpenAI API请求超时(30秒)');
      }
      throw error;
    }
  },

  /**
   * 调用Claude API
   */
  async callClaude(prompt, options) {
    const url = `${this.config.claudeBaseURL}/messages`;

    const body = {
      model: this.config.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 1000
    };

    // Add timeout handling
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API错误: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Claude API请求超时(30秒)');
      }
      throw error;
    }
  },

  /**
   * 调用本地模型 (Ollama)
   */
  async callLocal(prompt, options) {
    const url = `${this.config.localBaseURL}/api/generate`;

    const body = {
      model: this.config.model,
      prompt: prompt,
      stream: false
    };

    // Add timeout handling
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 seconds

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`本地模型错误: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('本地模型请求超时(30秒)');
      }
      throw error;
    }
  }
};
