# Boss直聘求职助手 - 混合智能方案设计文档

**版本**: 2.0
**日期**: 2026-05-09
**作者**: Claude (基于金超宇需求设计)
**状态**: 设计中

---

## 1. 设计概述

### 1.1 项目背景

Boss直聘求职助手是一个Chrome浏览器扩展，旨在帮助求职者（金超宇）在Boss直聘平台上：
- 根据预设条件自动筛选匹配职位
- 自动向匹配职位发送打招呼消息
- 自动回复HR的常见问题
- 检测面试邀请并提醒

**为什么用Chrome扩展而不是爬虫？**
- ✅ 安全性：运行在用户自己浏览器中，等同于正常访问
- ✅ 法律合规：用户主动安装，操作自己的账号
- ✅ 账号安全：操作频率可控，行为与真实用户一致
- ✅ 无需反爬：正常浏览器环境，无需对抗验证码

### 1.2 核心需求

基于用户关注点，设计重点为：
1. **安全性和风控** - 不被Boss直聘封号
2. **智能化程度** - 更准确的职位匹配、更自然的沟通
3. **代码质量和可维护性** - 清晰架构、易于调试扩展
4. **用户体验** - 配置简单、运行稳定、实时反馈

### 1.3 技术方案选择

经过方案对比，选择**混合智能方案**：

| 方案对比 | 轻量级AI增强 | 全面AI驱动 | 混合智能（选中） |
|---------|------------|----------|---------------|
| AI使用场景 | 关键场景辅助 | 全流程AI处理 | 规则初筛+AI决策 |
| 成本/天 | 0.5-1元 | 3-10元 | 1-3元 |
| 智能化程度 | 中 | 高 | 高 |
| 响应速度 | 快 | 慢 | 快 |
| 可靠性 | 高 | 中 | 高 |

**混合智能方案优势**：
- 规则引擎处理80%常规情况（本地，0成本，快速）
- AI处理20%复杂情况（边缘职位、高价值沟通）
- 缓存策略减少重复调用
- 故障降级保证核心功能

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Chrome Extension                        │
├─────────────────────────────────────────────────────────────┤
│  Popup UI (配置面板)                                          │
│  ├─ 个人信息配置 (基于简历自动填充)                           │
│  ├─ AI API 配置 (OpenAI/Claude/本地模型)                     │
│  ├─ 匹配规则配置 (技能/薪资/地点等)                           │
│  ├─ 实时统计看板 (今日打招呼/匹配数/AI调用等)                │
│  └─ 运行日志查看 (操作记录/AI调用/错误信息)                   │
├─────────────────────────────────────────────────────────────┤
│  Content Scripts (注入Boss直聘页面)                          │
│  ├─ main.js: 页面类型识别与入口                              │
│  ├─ job-page.js: 职位列表页处理器                            │
│  ├─ chat-page.js: 聊天页处理器                               │
│  └─ ui-injector.js: 页面内UI注入(浮动面板/Toast)            │
├─────────────────────────────────────────────────────────────┤
│  Core Libraries (核心能力库)                                  │
│  ├─ utils.js ✅ (已实现)                                      │
│  ├─ matcher.js ✅ (已实现，需升级为hybrid-matcher.js)        │
│  ├─ hybrid-matcher.js ⬜ (混合匹配引擎)                       │
│  ├─ smart-chatbot.js ⬜ (智能对话引擎)                        │
│  ├─ interview-detector.js ⬜ (面试检测引擎)                   │
│  ├─ ai-service.js ⬜ (AI服务抽象层)                           │
│  └─ behavior-simulator.js ⬜ (人类行为模拟+风控)              │
├─────────────────────────────────────────────────────────────┤
│  Background Service Worker                                   │
│  └─ background.js ⬜                                          │
│      ├─ 消息路由                                              │
│      ├─ 浏览器通知                                            │
│      └─ 定时任务 (缓存清理/统计重置)                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 核心设计原则

1. **智能分层** - 规则引擎处理80%常规情况，AI处理20%复杂情况
2. **故障隔离** - AI服务失败不影响基础功能，优雅降级
3. **性能优先** - 缓存策略 + 异步处理 + 延迟加载
4. **安全可控** - 行为模拟 + 频率限制 + 手动确认机制（可选）
5. **易于调试** - 完整日志 + 实时状态展示 + 错误上报

### 2.3 页面识别与URL映射

| 页面类型 | URL特征 | 处理器 | 核心功能 |
|---------|---------|-------|---------|
| 职位搜索列表 | `/web/geek/job` | job-page.js | 扫描职位→匹配评分→自动打招呼 |
| 职位详情 | `/job_detail/` | job-detail.js | 提取完整JD，补充匹配评分 |
| 聊天页 | `/web/geek/chat` | chat-page.js | 监听消息→自动回复→面试检测 |
| 其他页面 | - | - | 无操作 |

---

## 3. 核心模块设计

### 3.1 HybridMatcher (混合匹配引擎)

#### 3.1.1 匹配流程

```
职位信息输入
    ↓
Step 1: 规则引擎 - 一票否决检测
    ├─ 排除关键词 → blocked? → 返回 { passed: false, score: 0 }
    ├─ 区域距离检查 → 超出范围? → 返回 { passed: false, score: 0, reason: '通勤距离过远' }
    ↓
Step 2: 规则引擎 - 综合评分 (0-100分)
    ├─ 技能匹配 (50分)
    ├─ 加分技能 (20分)
    ├─ 薪资匹配 (15分)
    ├─ 地点匹配 (10分) - 含区域距离评分
    └─ 标题匹配 (5分)
    ↓
Step 3: 分层决策
    ├─ ≥70分 → 高分职位 → 直接通过 (无AI调用)
    ├─ 40-69分 → 边缘职位 → AI深度分析
    └─ <40分 → 低分职位 → 直接拒绝 (无AI调用)
    ↓
Step 4: AI深度分析 (仅40-69分职位)
    ├─ 检查缓存 (相同职位24h内复用)
    ├─ 构建Prompt (JD + 简历 + 规则分数)
    ├─ 调用AI API
    ├─ 解析结果 (匹配度 + 理由 + 风险分析)
    ├─ 综合评分: 规则40% + AI 60%
    └─ 缓存结果
    ↓
返回 { passed, score, reason, aiUsed, aiDetails }
```

#### 3.1.2 AI Prompt设计

```
你是一个专业的职业发展顾问，帮助求职者评估职位匹配度。

【求职者简历】
姓名: 金超宇
工作年限: 9年
当前职位: 高级前端工程师
核心技能: Vue3/TypeScript/JavaScript/Less
期望薪资: 15-20k
求职方向: 前端开发 / 高级前端工程师 / Vue前端工程师
所在城市: 杭州西湖/杭州拱墅/杭州余杭

工作经历概要:
- 2016年起从事前端开发，长期负责Web前端开发
- 主力技术栈: Vue、Vue3、TypeScript、JavaScript、Less
- 擅长中后台项目迭代、复杂业务模块交付、组件化开发和工程化维护
- 熟悉AI Coding，用于代码草拟、重构、调试排查等

【目标职位】
职位名称: {{jobInfo.title}}
公司名称: {{jobInfo.company}}
薪资范围: {{jobInfo.salary}}
工作地点: {{jobInfo.location}}
职位描述: {{jobInfo.description}}
职位标签: {{jobInfo.tags}}

【规则引擎初步评分】
{{ruleScore}}/100 (处于边缘区间40-70，需要深度分析)

【分析任务】
请从以下维度评估这个职位是否适合该求职者:
1. 技术栈匹配度: JD要求的技术栈与求职者的核心技能是否契合？
2. 职业发展: 这个职位对求职者的职业发展是否有价值？是否有成长空间？
3. 业务场景匹配: 职位的业务场景是否与求职者的经验(中后台、住宿行业等)相关？
4. 隐藏风险: 是否有隐含的不利因素(如技术栈太老旧、业务方向不明确等)？
5. 综合建议: 是否建议投递这个职位？

请以JSON格式返回结果:
{
  "matchScore": 0-100的整数,
  "recommend": true/false,
  "reason": "一句话总结匹配情况",
  "details": {
    "techMatch": "技术栈匹配分析",
    "careerValue": "职业价值分析",
    "risks": "潜在风险(如无风险填null)"
  }
}
```

#### 3.1.3 降级策略

```javascript
try {
  const aiResponse = await AIService.analyze(prompt, options);
  return parseAIResult(aiResponse, ruleScore);
} catch (error) {
  // AI失败降级：使用规则分数
  BossUtils.log('warn', 'AI匹配失败，降级使用规则引擎', error.message);
  return {
    passed: ruleScore >= 60,
    score: ruleScore,
    reason: 'AI服务不可用，使用规则评分',
    aiUsed: false,
    error: true
  };
}
```

#### 3.1.4 地点距离评估系统

采用**混合距离评估方案**：优先使用地图API精确计算距离和通勤时间，失败时降级到基于区域的粗略评估。

**方案A: 地图API精确评估（优先）**

使用高德地图Web服务API进行精确的距离和通勤时间计算。

**距离等级定义（基于实际通勤）**

| 距离等级 | 通勤时间 | 直线距离 | 匹配分数 | 是否拒绝 |
|---------|---------|---------|---------|---------|
| 0 - 很近 | ≤20分钟 | ≤5km | 10分 | 否 |
| 1 - 近 | 21-30分钟 | 5-10km | 8分 | 否 |
| 2 - 适中 | 31-45分钟 | 10-15km | 6分 | 否 |
| 3 - 较远 | 46-60分钟 | 15-20km | 3分 | 可配置（默认否）|
| 4 - 很远 | >60分钟 | >20km | 0分 | 是 |

**高德地图API集成**

```javascript
/**
 * 地图API距离评估器
 */
const MapDistanceEvaluator = {
  config: {
    gaodeApiKey: '49a611f338c2835bf94834a973a2e6a5',  // 高德地图Web服务API Key
    homeAddress: '杭州市拱墅区都市水乡水曲苑',  // 用户家庭住址
    homeLocation: null,  // 家庭坐标 {lng, lat}
    maxCommuteTime: 40,  // 最大可接受通勤时间（分钟）
    maxDistance: 8000,  // 最大可接受距离（米）
    enableMapAPI: true,  // 是否启用地图API
    cacheExpiry: 7 * 24 * 60 * 60 * 1000  // 缓存7天
  },

  cache: new Map(),  // 地址缓存

  /**
   * 精确距离评估（使用地图API）
   */
  async evaluateWithMapAPI(jobLocation, jobAddress) {
    if (!this.config.enableMapAPI || !this.config.gaodeApiKey) {
      return null;  // API未配置，降级到区域评估
    }

    try {
      // 1. 获取家庭坐标（首次需要地理编码）
      const homeCoords = await this.getHomeCoordinates();
      if (!homeCoords) {
        return null;  // 无法获取家庭坐标，降级
      }

      // 2. 获取职位坐标
      const jobCoords = await this.getJobCoordinates(jobLocation, jobAddress);
      if (!jobCoords) {
        return null;  // 无法解析职位地址，降级
      }

      // 3. 计算距离和通勤时间
      const result = await this.calculateDistance(homeCoords, jobCoords);

      return this.classifyDistance(result);
    } catch (error) {
      BossUtils.log('warn', '地图API评估失败，降级到区域评估', error.message);
      return null;  // API调用失败，降级
    }
  },

  /**
   * 获取家庭坐标（带缓存）
   */
  async getHomeCoordinates() {
    // 如果已经有坐标，直接返回
    if (this.config.homeLocation) {
      return this.config.homeLocation;
    }

    // 如果没有配置家庭住址，返回null
    if (!this.config.homeAddress) {
      return null;
    }

    // 检查缓存
    const cacheKey = `geocode:${this.config.homeAddress}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheExpiry) {
      this.config.homeLocation = cached.location;
      return cached.location;
    }

    // 调用地理编码API
    const location = await this.geocode(this.config.homeAddress);
    if (location) {
      this.config.homeLocation = location;
      this.cache.set(cacheKey, { location, timestamp: Date.now() });
    }

    return location;
  },

  /**
   * 获取职位坐标
   */
  async getJobCoordinates(jobLocation, jobAddress) {
    // 优先使用详细地址
    const address = jobAddress || jobLocation;
    if (!address) return null;

    // 检查缓存
    const cacheKey = `geocode:${address}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheExpiry) {
      return cached.location;
    }

    // 调用地理编码API
    const location = await this.geocode(address);
    if (location) {
      this.cache.set(cacheKey, { location, timestamp: Date.now() });
    }

    return location;
  },

  /**
   * 地理编码：地址 → 坐标
   * 使用高德地图地理编码API
   */
  async geocode(address) {
    const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${this.config.gaodeApiKey}&city=杭州`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
        const coords = data.geocodes[0].location.split(',');
        return {
          lng: parseFloat(coords[0]),
          lat: parseFloat(coords[1]),
          formattedAddress: data.geocodes[0].formatted_address
        };
      }

      return null;
    } catch (error) {
      BossUtils.log('error', '地理编码失败', error.message);
      return null;
    }
  },

  /**
   * 计算距离和通勤时间
   * 使用高德地图路径规划API（公交+地铁）
   */
  async calculateDistance(origin, destination) {
    // 检查缓存
    const cacheKey = `distance:${origin.lng},${origin.lat}-${destination.lng},${destination.lat}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheExpiry) {
      return cached.result;
    }

    // 1. 计算直线距离
    const straightDistance = this.calculateStraightDistance(origin, destination);

    // 2. 调用路径规划API（公交/地铁方案）
    const url = `https://restapi.amap.com/v3/direction/transit/integrated?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}&city=杭州&key=${this.config.gaodeApiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      let commuteTime = null;
      let transitDistance = null;

      if (data.status === '1' && data.route && data.route.transits && data.route.transits.length > 0) {
        // 取第一个方案（通常是最优方案）
        const bestRoute = data.route.transits[0];
        commuteTime = Math.round(bestRoute.duration / 60);  // 秒转分钟
        transitDistance = bestRoute.distance;  // 米
      }

      const result = {
        straightDistance,  // 直线距离（米）
        transitDistance,   // 公交/地铁距离（米）
        commuteTime,       // 通勤时间（分钟）
        method: 'transit'  // 方式：公交+地铁
      };

      // 缓存结果
      this.cache.set(cacheKey, { result, timestamp: Date.now() });

      return result;
    } catch (error) {
      BossUtils.log('error', '路径规划失败', error.message);
      // 降级：仅返回直线距离
      return {
        straightDistance,
        transitDistance: null,
        commuteTime: null,
        method: 'straight'
      };
    }
  },

  /**
   * 计算两点直线距离（Haversine公式）
   */
  calculateStraightDistance(origin, destination) {
    const R = 6371e3;  // 地球半径（米）
    const φ1 = origin.lat * Math.PI / 180;
    const φ2 = destination.lat * Math.PI / 180;
    const Δφ = (destination.lat - origin.lat) * Math.PI / 180;
    const Δλ = (destination.lng - origin.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c);  // 距离（米）
  },

  /**
   * 距离分类和评分
   */
  classifyDistance(distanceResult) {
    const { straightDistance, transitDistance, commuteTime } = distanceResult;

    // 优先使用通勤时间
    if (commuteTime !== null) {
      if (commuteTime <= 20) {
        return {
          acceptable: true,
          distanceLevel: 0,
          score: 10,
          reason: `通勤${commuteTime}分钟，非常近`,
          detail: `公交/地铁${Math.round(transitDistance/1000)}km，约${commuteTime}分钟`,
          method: 'mapapi'
        };
      } else if (commuteTime <= 30) {
        return {
          acceptable: true,
          distanceLevel: 1,
          score: 8,
          reason: `通勤${commuteTime}分钟，可接受`,
          detail: `公交/地铁${Math.round(transitDistance/1000)}km，约${commuteTime}分钟`,
          method: 'mapapi'
        };
      } else if (commuteTime <= 45) {
        return {
          acceptable: true,
          distanceLevel: 2,
          score: 6,
          reason: `通勤${commuteTime}分钟，稍远`,
          detail: `公交/地铁${Math.round(transitDistance/1000)}km，约${commuteTime}分钟`,
          method: 'mapapi'
        };
      } else if (commuteTime <= 60) {
        const acceptable = this.config.maxCommuteTime >= 60;
        return {
          acceptable,
          distanceLevel: 3,
          score: acceptable ? 3 : 0,
          reason: acceptable ? `通勤${commuteTime}分钟，较远但可接受` : `通勤${commuteTime}分钟，过远`,
          detail: `公交/地铁${Math.round(transitDistance/1000)}km，约${commuteTime}分钟`,
          method: 'mapapi'
        };
      } else {
        return {
          acceptable: false,
          distanceLevel: 4,
          score: 0,
          reason: `通勤${commuteTime}分钟，太远`,
          detail: `公交/地铁${Math.round(transitDistance/1000)}km，约${commuteTime}分钟`,
          method: 'mapapi'
        };
      }
    }

    // 降级：使用直线距离
    const distanceKm = straightDistance / 1000;
    if (straightDistance <= 5000) {
      return { acceptable: true, distanceLevel: 0, score: 10, reason: `直线距离${distanceKm.toFixed(1)}km`, method: 'straight' };
    } else if (straightDistance <= 10000) {
      return { acceptable: true, distanceLevel: 1, score: 8, reason: `直线距离${distanceKm.toFixed(1)}km`, method: 'straight' };
    } else if (straightDistance <= 15000) {
      return { acceptable: true, distanceLevel: 2, score: 6, reason: `直线距离${distanceKm.toFixed(1)}km`, method: 'straight' };
    } else if (straightDistance <= 20000) {
      const acceptable = this.config.maxDistance >= 20000;
      return { acceptable, distanceLevel: 3, score: acceptable ? 3 : 0, reason: `直线距离${distanceKm.toFixed(1)}km`, method: 'straight' };
    } else {
      return { acceptable: false, distanceLevel: 4, score: 0, reason: `直线距离${distanceKm.toFixed(1)}km，太远`, method: 'straight' };
    }
  }
};
```

**方案B: 区域粗略评估（降级）**

| 距离等级 | 描述 | 匹配分数 | 是否拒绝 | 示例（以西湖区为中心） |
|---------|------|---------|---------|---------------------|
| 0 - 同区 | 期望工作区域内 | 10分 | 否 | 西湖区 |
| 1 - 邻近 | 相邻区域，通勤30分钟内 | 8分 | 否 | 拱墅区、上城区、滨江区 |
| 2 - 较远 | 同城其他区，通勤30-60分钟 | 5分 | 可选（默认否） | 萧山区、钱塘区 |
| 3 - 很远 | 跨城或远郊，通勤>60分钟 | 0分 | 是 | 富阳、临安、绍兴 |

**杭州区域距离映射表**

```javascript
const HangzhouDistanceMap = {
  // 主城区（核心区域）
  '西湖': { neighbors: ['拱墅', '上城', '滨江', '余杭'], far: ['萧山', '临平', '钱塘'], veryFar: [] },
  '拱墅': { neighbors: ['西湖', '余杭', '上城', '临平'], far: ['滨江', '萧山', '钱塘'], veryFar: [] },
  '上城': { neighbors: ['西湖', '拱墅', '滨江', '钱塘'], far: ['萧山', '余杭'], veryFar: [] },
  '滨江': { neighbors: ['西湖', '上城', '萧山'], far: ['拱墅', '余杭', '钱塘'], veryFar: [] },

  // 扩展区域
  '余杭': { neighbors: ['西湖', '拱墅', '临平'], far: ['上城', '滨江', '萧山'], veryFar: ['钱塘'] },
  '萧山': { neighbors: ['滨江', '钱塘'], far: ['上城', '西湖', '拱墅', '余杭'], veryFar: ['临平'] },
  '临平': { neighbors: ['拱墅', '余杭'], far: ['西湖', '上城'], veryFar: ['滨江', '萧山', '钱塘'] },
  '钱塘': { neighbors: ['上城', '萧山'], far: ['滨江', '拱墅'], veryFar: ['西湖', '余杭', '临平'] },

  // 远郊县市（一票否决）
  '富阳': { veryFar: ['西湖', '拱墅', '上城', '滨江', '余杭', '萧山', '临平', '钱塘'] },
  '临安': { veryFar: ['西湖', '拱墅', '上城', '滨江', '余杭', '萧山', '临平', '钱塘'] },
  '桐庐': { veryFar: ['西湖', '拱墅', '上城', '滨江', '余杭', '萧山', '临平', '钱塘'] },
  '建德': { veryFar: ['西湖', '拱墅', '上城', '滨江', '余杭', '萧山', '临平', '钱塘'] },
  '淳安': { veryFar: ['西湖', '拱墅', '上城', '滨江', '余杭', '萧山', '临平', '钱塘'] }
};
```

**距离评估算法**

```javascript
/**
 * 评估职位地点是否在可接受范围内
 * @returns {Object} { acceptable, distanceLevel, score, reason }
 */
function evaluateDistance(jobLocation, preferredAreas, maxDistanceLevel = 2) {
  // 1. 提取区域名称 (支持 "杭州·西湖区" "西湖" "杭州西湖" 等格式)
  const area = extractArea(jobLocation);

  if (!area) {
    return { acceptable: true, distanceLevel: -1, score: 5, reason: '无法识别区域' };
  }

  // 2. 检查是否在期望区域内 (距离等级0)
  if (preferredAreas.some(preferred => area.includes(preferred) || preferred.includes(area))) {
    return { acceptable: true, distanceLevel: 0, score: 10, reason: '期望工作区域' };
  }

  // 3. 检查是否在邻近区域 (距离等级1)
  for (const preferred of preferredAreas) {
    const distanceInfo = HangzhouDistanceMap[preferred];
    if (distanceInfo?.neighbors?.some(neighbor => area.includes(neighbor))) {
      return { acceptable: true, distanceLevel: 1, score: 8, reason: '邻近区域，通勤便利' };
    }
  }

  // 4. 检查是否在较远区域 (距离等级2)
  for (const preferred of preferredAreas) {
    const distanceInfo = HangzhouDistanceMap[preferred];
    if (distanceInfo?.far?.some(far => area.includes(far))) {
      const acceptable = maxDistanceLevel >= 2;
      return {
        acceptable,
        distanceLevel: 2,
        score: acceptable ? 5 : 0,
        reason: acceptable ? '较远区域，通勤时间较长' : '通勤距离过远'
      };
    }
  }

  // 5. 检查是否在很远区域 (距离等级3 - 一票否决)
  for (const preferred of preferredAreas) {
    const distanceInfo = HangzhouDistanceMap[preferred];
    if (distanceInfo?.veryFar?.some(veryFar => area.includes(veryFar))) {
      return { acceptable: false, distanceLevel: 3, score: 0, reason: '通勤距离太远，一票否决' };
    }
  }

  // 6. 未知区域（可能是其他城市）
  if (!jobLocation.includes('杭州')) {
    return { acceptable: false, distanceLevel: 3, score: 0, reason: '非杭州地区' };
  }

  // 7. 默认：杭州市内但未知具体区域，保守通过
  return { acceptable: true, distanceLevel: 2, score: 5, reason: '杭州市内' };
}
```

**配置项**

```javascript
{
  // 期望工作区域（多个）
  preferredAreas: ['西湖', '拱墅', '余杭'],

  // 最大可接受距离等级 (0-3)
  // 0: 仅期望区域
  // 1: 期望区域+邻近区域
  // 2: 期望区域+邻近+较远区域（默认）
  // 3: 不限制（仅排除跨城）
  maxDistanceLevel: 2,

  // 是否启用距离过滤（默认true）
  enableDistanceFilter: true
}
```

---

### 3.2 SmartChatbot (智能对话引擎)

#### 3.2.1 打招呼流程

```
触发打招呼
    ↓
Step 1: 生成动态模板 (基于规则)
    ├─ 识别职位特征 (JD关键词、职位级别)
    ├─ 从4个模板库中选择合适模板
    ├─ 变量插值 (姓名、技能、经验等)
    └─ 生成baseGreeting
    ↓
Step 2: AI润色 (可选)
    ├─ 仅对高分职位(≥70)使用AI润色
    ├─ 构建润色Prompt
    ├─ 调用AI API
    ├─ 验证结果长度 (50-200字)
    ├─ 成功 → 返回润色后消息
    └─ 失败 → 降级返回baseGreeting
    ↓
返回最终打招呼消息
```

#### 3.2.2 打招呼模板库

```javascript
const templates = [
  // 模板 1: 强调技术栈匹配
  `您好，看到贵司在招${jobTitle}，我有${yearsExp}年${currentRole}经验，主要技术栈是${techStack}，和贵司的技术方向非常契合。希望能有机会深入沟通~`,

  // 模板 2: 强调业务经验
  `Hi，对${jobTitle}这个岗位很感兴趣。我之前长期负责中后台系统开发，有丰富的复杂业务交付经验，${techStack}技术栈比较扎实，期待能进一步了解~`,

  // 模板 3: 强调项目经验
  `您好，我是一名${currentRole}，有${yearsExp}年前端开发经验。之前做过很多中后台、组件库建设相关的项目，看到贵司的${jobTitle}岗位觉得很适合，希望能聊聊~`,

  // 模板 4: 简洁直接
  `您好，我对贵司的${jobTitle}岗位非常感兴趣。我有${yearsExp}年${techStack}相关经验，目前${availability}，方便的话可以详细聊聊吗？`
];

// 模板选择逻辑
if (jobInfo.description?.includes('中后台')) {
  return templates[1];  // 强调业务经验
} else if (matchResult.aiDetails?.techMatch) {
  return templates[0];  // 强调技术栈
} else {
  return randomChoice(templates);  // 随机选择
}
```

#### 3.2.3 自动回复策略

**快速回复（关键词匹配）**

| HR问题类型 | 检测关键词 | 回复模板 |
|-----------|----------|---------|
| 薪资期望 | 期望薪资、待遇、package | "我的期望薪资是25-35k左右，具体可以根据岗位职责和团队情况灵活沟通。" |
| 到岗时间 | 什么时候到岗、入职时间 | "我目前已离职，随时可到岗，时间比较灵活。" |
| 离职原因 | 为什么离职、换工作 | "希望寻找更大的技术挑战和成长空间，同时也希望能在更匹配的团队和业务方向上发展。" |
| 自我介绍 | 介绍一下、工作经历 | "我有9年前端开发经验，主要技术栈是Vue3/TypeScript/JavaScript/Less，长期负责中后台系统开发和组件库建设，详细经历可以看我的简历~" |
| 发简历 | 发一下简历、CV | "我的简历已经上传到平台了，您可以直接查看。如果需要其他格式或更详细的项目经历，我可以单独发给您。" |

**智能回复（AI生成）**

复杂问题（如"你们团队技术栈是什么"）由AI生成回复，并显示确认框供用户选择：
- 直接发送
- 编辑后发送
- 取消

---

### 3.3 InterviewDetector (面试检测引擎)

#### 3.3.1 检测流程

```
HR新消息
    ↓
Step 1: 关键词快速检测
    ├─ 高权重词(+0.35): 面试、面聊、来公司、视频面试等
    ├─ 中权重词(+0.15): Zoom、腾讯会议、地址、几点、明天等
    ├─ 低权重词(+0.05): 聊聊、沟通、合适、简历等
    └─ 累计置信度 (0-1)
    ↓
Step 2: 分层决策
    ├─ ≥0.7 → 高置信度 → 直接确认为面试邀请
    ├─ 0.3-0.7 → 中等置信度 → AI语义分析
    └─ <0.3 → 低置信度 → 非面试消息
    ↓
Step 3: AI语义分析 (仅0.3-0.7)
    ├─ 构建Prompt (消息 + 对话历史)
    ├─ 调用AI API
    ├─ 解析结果 (是否面试 + 置信度 + 提取信息)
    └─ 失败降级: 默认提醒用户
    ↓
Step 4: 信息提取
    ├─ 时间: 明天下午3点、周四上午等
    ├─ 地点: XX大厦X层、XX区XX路等
    ├─ 方式: 线下/视频/电话
    └─ 会议链接: Zoom链接、腾讯会议号等
    ↓
返回 { isInterview, confidence, info, method }
```

#### 3.3.2 关键词权重表

```javascript
const weights = {
  high: {  // 0.35
    keywords: ['面试', '面聊', '面谈', '来公司', '视频面试',
               '线下面试', '技术面', '初面', '复面', '终面']
  },
  medium: {  // 0.15
    keywords: ['zoom', '腾讯会议', '钉钉', '飞书', '地址',
               '几楼', '明天', '后天', '周几', '上午', '下午', '几点']
  },
  low: {  // 0.05
    keywords: ['聊聊', '沟通', '了解', '合适', '简历', 'offer', '入职']
  }
};
```

---

### 3.4 AIService (AI服务抽象层)

#### 3.4.1 多Provider支持

```
AIService (抽象接口)
    ├─ OpenAI Provider
    │   ├─ API: https://api.openai.com/v1/chat/completions
    │   └─ 模型: gpt-4o-mini / gpt-4o / gpt-3.5-turbo
    ├─ Claude Provider
    │   ├─ API: https://api.anthropic.com/v1/messages
    │   └─ 模型: claude-3-haiku / claude-3-sonnet
    └─ Local Provider (Ollama)
        ├─ API: http://localhost:11434/api/generate
        └─ 模型: llama2 / mixtral / 自定义模型
```

#### 3.4.2 缓存与限流

**缓存策略**
- 相同prompt缓存1小时
- 使用Map存储，定期清理过期缓存
- 缓存键: prompt的简单hash

**速率限制**
- 每分钟最多20次调用
- 每小时最多200次调用
- 超限时抛出错误，业务层降级处理

**成本预估**
- 职位匹配: 500 tokens/次 × 边缘职位(30%)
- 打招呼润色: 200 tokens/次 × 高分职位(20%)
- 面试检测: 300 tokens/次 × 边缘消息(10%)
- 预计: gpt-4o-mini约1-3元/天

---

### 3.5 BehaviorSimulator (安全风控)

#### 3.5.1 人类行为模拟

**操作延迟**
```javascript
actionDelay: { min: 3000, max: 8000 },     // 动作间隔
clickDelay: { min: 800, max: 2000 },       // 点击延迟
scrollDelay: { min: 500, max: 1500 },      // 滚动延迟
typingSpeed: { min: 50, max: 150 }         // 打字速度(ms/字符)
```

**行为特征**
- 鼠标移动到元素中心再点击
- 逐字输入，随机间隔
- 偶尔停顿(10%概率)模拟思考
- 滚动使用smooth behavior
- 点击位置随机偏移(-5~5px)

#### 3.5.2 频率限制

**每日限制**
- 打招呼: 30次/天 (可配置)
- 自动回复: 50次/天 (可配置)

**打招呼间隔控制**
- **最小间隔**: 60-120秒（随机）
- **为什么重要**: 模拟真实求职者行为，真人不可能每隔几秒就打招呼
- **实现方式**:
  - 记录上次打招呼的时间戳
  - 在处理下一个职位前，检查距离上次打招呼是否已过最小间隔
  - 如未到时间，等待剩余时间（并显示倒计时）

```javascript
const GreetingIntervalController = {
  lastGreetingTime: 0,
  minInterval: { min: 60000, max: 120000 },  // 60-120秒

  /**
   * 检查是否可以打招呼
   */
  async checkAndWait() {
    const now = Date.now();
    const elapsed = now - this.lastGreetingTime;
    const requiredInterval = this.getRandomInterval();

    if (elapsed < requiredInterval) {
      const waitTime = requiredInterval - elapsed;
      BossUtils.log('info', `距离上次打招呼 ${Math.round(elapsed/1000)}秒，需等待 ${Math.round(waitTime/1000)}秒`);
      BossUtils.showToast(`等待 ${Math.round(waitTime/1000)}秒 后继续...`, 'info');

      await this.delay(waitTime);
    }

    this.lastGreetingTime = Date.now();
  },

  getRandomInterval() {
    const min = this.minInterval.min;
    const max = this.minInterval.max;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
```

**批量限制**
- 连续操作5次后休息30-60秒
- 防止短时间大量操作

**页面行为**
- 每处理5个职位随机滚动一次
- 操作间隔随机3-8秒

---

## 4. 数据流与交互

### 4.1 职位排序策略

Boss直聘职位列表默认按算法推荐排序，但我们需要优先处理最新发布的职位，提高打招呼的响应速度和成功率。

**排序规则**

```javascript
/**
 * 职位排序：优先处理最新职位
 */
function sortJobs(jobs) {
  return jobs.sort((a, b) => {
    // 1. 优先级：发布时间（Boss直聘显示"刚刚"、"5分钟前"、"1小时前"等）
    const timeA = parsePublishTime(a.publishTime);
    const timeB = parsePublishTime(b.publishTime);

    // 最新的在前面（时间戳大的在前）
    if (timeA !== timeB) {
      return timeB - timeA;
    }

    // 2. 次要：活跃度（Boss在线、最近活跃等）
    const activeScoreA = getActiveScore(a.bossStatus);
    const activeScoreB = getActiveScore(b.bossStatus);
    return activeScoreB - activeScoreA;
  });
}

/**
 * 解析发布时间文本 → 时间戳
 */
function parsePublishTime(timeText) {
  if (!timeText) return 0;

  const now = Date.now();
  const text = timeText.toLowerCase();

  // "刚刚"、"刚刚发布"
  if (text.includes('刚刚') || text.includes('刚发布')) {
    return now;
  }

  // "X分钟前"
  const minuteMatch = text.match(/(\d+)\s*分钟前/);
  if (minuteMatch) {
    return now - parseInt(minuteMatch[1]) * 60 * 1000;
  }

  // "X小时前"
  const hourMatch = text.match(/(\d+)\s*小时前/);
  if (hourMatch) {
    return now - parseInt(hourMatch[1]) * 60 * 60 * 1000;
  }

  // "昨天"、"1天前"
  if (text.includes('昨天') || text.includes('1天前')) {
    return now - 24 * 60 * 60 * 1000;
  }

  // "X天前"
  const dayMatch = text.match(/(\d+)\s*天前/);
  if (dayMatch) {
    return now - parseInt(dayMatch[1]) * 24 * 60 * 60 * 1000;
  }

  // "本周"、"本月" 等其他情况
  return now - 7 * 24 * 60 * 60 * 1000;  // 默认7天前
}

/**
 * Boss活跃度评分
 */
function getActiveScore(bossStatus) {
  if (!bossStatus) return 0;

  const status = bossStatus.toLowerCase();

  if (status.includes('在线') || status.includes('online')) {
    return 100;  // Boss在线，最高优先级
  } else if (status.includes('今日活跃') || status.includes('刚刚活跃')) {
    return 80;
  } else if (status.includes('本周活跃')) {
    return 60;
  } else if (status.includes('本月活跃')) {
    return 40;
  }

  return 0;
}
```

**信息提取**

从Boss直聘职位卡片提取排序所需信息：

```javascript
/**
 * 提取职位卡片信息（包含排序字段）
 */
function extractJobInfo(jobCard) {
  return {
    id: extractJobId(jobCard),
    title: jobCard.querySelector('.job-name')?.textContent.trim(),
    company: jobCard.querySelector('.company-name')?.textContent.trim(),
    salary: jobCard.querySelector('.salary')?.textContent.trim(),
    location: jobCard.querySelector('.job-area')?.textContent.trim(),
    tags: Array.from(jobCard.querySelectorAll('.tag-list li')).map(t => t.textContent.trim()),

    // 排序相关字段
    publishTime: jobCard.querySelector('.job-time, .time')?.textContent.trim() || '',  // "5分钟前"
    bossStatus: jobCard.querySelector('.boss-active-time, .boss-status')?.textContent.trim() || '',  // "在线"、"本周活跃"

    element: jobCard
  };
}
```

**Boss直聘职位卡片示例**
```html
<li class="job-card-wrapper">
  <div class="job-card-left">
    <span class="job-name">前端开发工程师</span>
    <span class="salary">20-35K</span>
    <div class="job-info">
      <span class="job-area">杭州·西湖区</span>
      <span class="job-time">5分钟前</span>  <!-- 发布时间 -->
    </div>
  </div>
  <div class="job-card-right">
    <div class="boss-info">
      <span class="boss-name">张经理</span>
      <span class="boss-active-time">在线</span>  <!-- Boss状态 -->
    </div>
    <button class="start-chat-btn">立即沟通</button>
  </div>
</li>
```

**排序优势**

1. **提高成功率**: 最新职位的HR更活跃，回复率更高
2. **避免重复**: 优先处理新职位，减少已被其他人抢先的情况
3. **提升体验**: Boss看到"刚发布就有人打招呼"，印象更好
4. **时间敏感**: 热门职位通常发布后几小时内就会收到大量简历
5. **在线优先**: Boss在线时打招呼，可能立即收到回复

### 4.2 职位处理完整流程

```
用户打开Boss直聘职位搜索页
    ↓
content/main.js 检测页面类型 → job-list
    ↓
job-page.js 初始化
    ↓
等待职位列表加载
    ↓
提取所有职位卡片信息
    ↓
职位排序（按发布时间倒序，最新在前）
    ↓
逐个处理职位:
    ├─ 检查是否已处理 (避免重复)
    ├─ 检查每日限制 (30次上限)
    ├─ HybridMatcher.match()
    │   ├─ 规则引擎排除+评分
    │   ├─ 距离评估（区域粗筛）
    │   └─ 边缘职位AI分析
    ├─ 匹配通过?
    │   ├─ Yes → 继续
    │   └─ No → 跳过下一个职位
    ├─ 获取职位详情（详细地址）
    ├─ 地图API精确距离评估
    │   ├─ 成功 → 通勤时间过长？→ 跳过
    │   └─ 失败 → 继续（已通过区域粗筛）
    ├─ 点击"立即沟通"按钮
    ├─ 等待聊天框出现
    ├─ SmartChatbot.generateGreeting()
    │   ├─ 生成动态模板
    │   └─ 高分职位AI润色
    ├─ BehaviorSimulator.humanType() 输入消息
    ├─ 点击发送
    ├─ 记录已处理 (防重复)
    └─ 随机延迟 3-8秒
    ↓
显示统计: "匹配X个职位，已打招呼Y个"
```

### 4.2 聊天监听完整流程

```
用户打开Boss直聘聊天页
    ↓
content/main.js 检测页面类型 → chat
    ↓
chat-page.js 初始化
    ↓
设置MutationObserver监听消息列表
    ↓
检测到HR新消息:
    ├─ 过滤自己的消息 (只处理HR消息)
    ├─ 防重复处理
    ├─ 提取消息文本
    ↓
并行处理:
    ├─ [面试检测]
    │   ├─ InterviewDetector.detect()
    │   │   ├─ 关键词快速检测
    │   │   └─ 中等置信度AI分析
    │   ├─ 是面试邀请?
    │   │   ├─ Yes → 高亮消息
    │   │   ├─ 浏览器通知
    │   │   └─ (通知功能暂不实现)
    │   └─ No → 继续
    │
    └─ [自动回复] (如已启用)
        ├─ SmartChatbot.matchQuickReply()
        │   ├─ 匹配到常见问题 → 快速回复
        │   └─ 未匹配 → AI生成回复
        ├─ 需要确认?
        │   ├─ Yes → 显示确认框
        │   └─ No → 直接发送
        ├─ 模拟思考延迟 (5-15秒)
        ├─ BehaviorSimulator.humanType()
        └─ 点击发送
```

### 4.3 Popup配置面板交互

```
用户点击扩展图标
    ↓
打开popup.html
    ↓
popup.js 加载:
    ├─ chrome.storage.local.get(['bossConfig'])
    ├─ 填充表单
    ├─ 加载今日统计 (打招呼次数、回复次数)
    └─ 显示AI服务状态
    ↓
用户操作:
    ├─ 修改配置 → 点击保存 → chrome.storage.local.set()
    ├─ 切换Tab → 加载对应数据 (统计/配置/AI/日志)
    ├─ 测试AI → 发送测试请求到content script
    └─ 查看日志 → 从storage读取并展示
```

---

## 5. 配置与个人信息

### 5.1 默认配置 (基于金超宇简历)

```javascript
{
  enabled: true,

  // AI配置
  aiProvider: 'openai',
  aiModel: 'gpt-4o-mini',
  openaiApiKey: '',  // 用户自行配置
  openaiBaseURL: 'https://api.openai.com/v1',

  // 匹配规则
  keywords: ['前端开发', '高级前端工程师', 'Vue前端工程师', '前端架构师'],
  locations: ['杭州'],
  salaryMin: 15000,
  requiredSkills: ['Vue', 'Vue3', 'TypeScript', 'JavaScript', '前端工程化',
                   '组件库', '中后台'],
  bonusSkills: ['React', 'Electron', '小程序', 'Node.js', 'Less',
                'Webpack', 'Vite', '性能优化', 'AI Coding'],
  excludedKeywords: ['外包', '驻场', '996', '大小周', '单休', '融资未到位'],
  matchThreshold: 60,

  // 地点距离过滤
  preferredAreas: ['西湖', '拱墅', '余杭'],  // 期望工作区域（仅区域评估时使用）
  maxDistanceLevel: 2,  // 最大距离等级: 0=仅期望区域, 1=+邻近, 2=+较远（默认）, 3=不限
  enableDistanceFilter: true,  // 是否启用距离过滤

  // 地图API配置（高德地图）
  enableMapAPI: true,  // 是否启用地图API精确评估
  gaodeApiKey: '49a611f338c2835bf94834a973a2e6a5',  // 高德地图Web服务API Key（需申请）
  homeAddress: '杭州市拱墅区都市水乡水曲苑',  // 家庭住址（如"杭州市西湖区文三路XX号"）
  maxCommuteTime: 40,  // 最大可接受通勤时间（分钟）包括骑行和开车
  maxDistance: 8000,  // 最大可接受距离（米）

  // 打招呼配置
  greetingEnabled: true,
  dailyLimit: 30,
  aiPolishEnabled: true,

  // 职位处理策略
  sortByLatest: true,  // 优先处理最新职位
  prioritizeOnlineBoss: true,  // 优先处理在线Boss的职位

  // 自动回复配置
  autoReplyEnabled: false,  // 默认关闭，用户手动开启
  replyDelayMin: 5,
  replyDelayMax: 15,

  // 个人信息
  profile: {
    name: '金超宇',
    yearsExperience: 9,
    currentRole: '高级前端工程师',
    techStack: 'Vue3/TypeScript/JavaScript/Less',
    phone: '18557519506',
    expectedSalary: '15-25',
    availability: '已离职，随时可到岗',
    city: '杭州',
    github: 'https://github.com/YUKIJUDAI'
  },

  // 行为模拟配置
  actionDelayMin: 3,
  actionDelayMax: 8
}
```

---

## 6. 文件结构

```
boss-extension/
├── manifest.json              ✅ 已存在
├── lib/                       核心库
│   ├── utils.js               ✅ 已实现
│   ├── matcher.js             ✅ 已实现 (待升级)
│   ├── hybrid-matcher.js      ⬜ 新增: 混合匹配引擎
│   ├── distance-evaluator.js  ⬜ 新增: 地点距离评估
│   ├── smart-chatbot.js       ⬜ 新增: 智能对话引擎
│   ├── interview-detector.js  ⬜ 新增: 面试检测引擎
│   ├── ai-service.js          ⬜ 新增: AI服务抽象层
│   └── behavior-simulator.js  ⬜ 新增: 行为模拟+风控
├── content/                   内容脚本
│   ├── main.js                ⬜ 新增: 入口+页面识别
│   ├── job-page.js            ⬜ 新增: 职位列表页处理
│   ├── chat-page.js           ⬜ 新增: 聊天页处理
│   └── style.css              ⬜ 新增: 页面内UI样式
├── background/                后台脚本
│   └── background.js          ⬜ 新增: Service Worker
├── popup/                     配置面板
│   ├── popup.html             ⬜ 新增
│   ├── popup.css              ⬜ 新增
│   └── popup.js               ⬜ 新增
└── icons/                     图标资源
    ├── icon16.png             ⬜ 待添加
    ├── icon48.png             ⬜ 待添加
    └── icon128.png            ⬜ 待添加
```

---

## 7. 风险与限制

### 7.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Boss直聘页面结构变化 | 选择器失效 | 使用多个fallback选择器，定期检查 |
| AI API不稳定 | 智能功能失效 | 降级到规则引擎，核心功能不受影响 |
| 速率限制被触发 | 暂时无法使用 | 严格控制调用频率，用户可调整配置 |
| Chrome扩展API变更 | 功能异常 | 使用Manifest V3标准API，向后兼容 |

### 7.2 使用限制

1. **每日打招呼上限**: 建议≤30次，避免被平台限制
2. **AI成本**: 每天约1-3元，需用户自备API Key
3. **账号安全**: 建议单独注册求职账号，与工作账号分离
4. **自动化边界**: 仅辅助初步沟通，面试准备和决策需用户自行完成

### 7.3 平台规则合规

- ✅ 不违反Boss直聘用户协议（用户操作自己的账号）
- ✅ 不使用爬虫或外部自动化工具
- ✅ 操作频率接近真实用户
- ⚠️ 建议合理使用，不过度依赖自动化

---

## 8. 性能与成本

### 8.1 性能指标

| 场景 | 处理时间 | API调用 |
|------|---------|--------|
| 职位匹配 (高分) | <100ms | 无 |
| 职位匹配 (边缘) | 2-5s | AI |
| 区域距离评估 | <10ms | 无 |
| 地图API距离评估 (首次) | 1-2s | 地图 |
| 地图API距离评估 (缓存) | <10ms | 无 |
| 打招呼 (模板) | <200ms | 无 |
| 打招呼 (AI润色) | 2-4s | AI |
| 常见问题回复 | <100ms | 无 |
| 复杂问题回复 | 2-5s | AI |
| 面试检测 (高置信) | <100ms | 无 |
| 面试检测 (AI分析) | 2-4s | AI |

### 8.2 成本估算

**每日操作量假设**
- 浏览职位: 100个
- 边缘职位(需AI): 30个 (30%)
- 匹配通过: 10个
- 高分职位(AI润色): 2个 (20%)
- 收到HR消息: 5条
- 需AI分析消息: 1条 (20%)

**Token消耗**
- 职位匹配AI: 30次 × 500 tokens = 15,000 tokens
- 打招呼润色: 2次 × 200 tokens = 400 tokens
- 面试检测AI: 1次 × 300 tokens = 300 tokens
- **总计**: 约15,700 tokens/天

**AI成本 (gpt-4o-mini, $0.15/1M input tokens)**
- 15,700 tokens × $0.15 / 1,000,000 ≈ $0.0024 ≈ ¥0.017
- **预估**: 每天约¥1-3元

**地图API成本 (高德地图)**
- 个人开发者认证：免费
- 每日免费额度：
  - 地理编码：30万次/天
  - 路径规划：30万次/天
- 实际使用量：
  - 地理编码：约10-20次/天（职位地址+家庭地址，有缓存）
  - 路径规划：约10次/天（匹配职位数量）
- **成本**: 完全免费（免费额度足够）

**总成本**: 约¥1-3元/天（仅AI调用费用）

---

## 9. 安全与隐私

### 9.1 数据安全

- ✅ 所有配置存储在Chrome Storage (本地，不上传)
- ✅ AI API Key仅用于本地发送请求，不经过任何服务器
- ✅ 不收集、不上传任何用户数据
- ✅ 简历信息仅在本地使用，用于生成prompt

### 9.2 账号安全

**行为模拟**
- 随机延迟3-8秒
- 逐字输入，模拟打字速度
- 鼠标移动轨迹
- 随机滚动页面

**频率控制**
- 每日打招呼上限: 30次
- 连续操作限制: 5次后休息
- 操作间隔随机化

**降低风险建议**
- 不要将每日上限设置过高
- 定期手动登录查看
- 避免24小时连续运行

---

## 10. 未来扩展方向

### 10.1 短期优化 (MVP后)

1. **智能优先级排序**: 根据匹配度、公司评分等排序职位
2. **历史数据分析**: 统计哪类职位更容易获得回复
3. **自定义模板**: 允许用户自定义打招呼模板
4. **简历解析**: 支持上传简历自动提取信息

### 10.2 长期规划

1. **多平台支持**: 扩展到拉勾、猎聘等其他招聘平台
2. **面试准备助手**: AI生成面试问题和答案
3. **Offer对比**: 多个offer的智能对比分析
4. **职业规划**: 基于市场数据的职业发展建议

---

## 11. 实施计划

### Phase 1: 核心库完善 (3-5天)
- [x] utils.js (已完成)
- [x] matcher.js (已完成，需升级)
- [ ] hybrid-matcher.js
- [ ] distance-evaluator.js (地点距离评估)
- [ ] ai-service.js
- [ ] smart-chatbot.js
- [ ] interview-detector.js
- [ ] behavior-simulator.js

### Phase 2: Content Scripts (2-3天)
- [ ] main.js (页面识别)
- [ ] job-page.js (职位处理)
- [ ] chat-page.js (聊天处理)
- [ ] style.css (UI样式)

### Phase 3: Background & Popup (2-3天)
- [ ] background.js
- [ ] popup.html/css/js
- [ ] icons设计制作

### Phase 4: 测试与优化 (3-5天)
- [ ] Boss直聘实际环境测试
- [ ] AI调用成本优化
- [ ] 风控策略调整
- [ ] 性能优化
- [ ] Bug修复

### Phase 5: 文档与发布 (1-2天)
- [ ] 用户使用手册
- [ ] AI配置指南
- [ ] 常见问题FAQ
- [ ] README编写

**预计总工期**: 11-18天

---

## 12. 总结

本设计文档描述了Boss直聘求职助手的混合智能方案，核心特点：

1. **智能化**: 规则引擎+AI深度分析，职位匹配准确、聊天自然流畅
2. **精确距离评估**: 集成高德地图API，基于实际通勤时间筛选职位（免费）
3. **成本可控**: 每天1-3元，80%场景本地处理无成本，地图API完全免费
4. **安全可靠**: 完整的行为模拟和降级机制，AI失败不影响核心功能
5. **易于维护**: 清晰的模块划分、完整的日志系统、灵活的配置

基于用户(金超宇)的实际背景和需求定制，提供开箱即用的配置和智能化的求职辅助功能。

---

**文档状态**: ✅ 设计完成，待用户审查
**下一步**: 用户审查通过后，进入实现计划编写阶段

---

## 附录A: 高德地图API申请与配置指南

### A.1 申请高德地图API Key

**步骤1: 注册账号**
1. 访问 https://lbs.amap.com/
2. 点击右上角「注册」或「登录」
3. 使用手机号注册账号

**步骤2: 认证开发者**
1. 登录后进入「控制台」
2. 点击「成为开发者」
3. 选择「个人开发者」
4. 填写基本信息（真实姓名、身份证号）
5. 提交认证（通常5分钟内审核通过）

**步骤3: 创建应用**
1. 进入「应用管理」→「我的应用」
2. 点击「创建新应用」
3. 填写应用信息：
   - 应用名称：Boss直聘求职助手
   - 应用类型：其他
4. 点击「提交」

**步骤4: 添加Key**
1. 在创建的应用下，点击「添加」
2. 选择服务平台：**Web服务**
3. 填写Key名称：boss-assistant-web
4. 点击「提交」
5. 复制生成的API Key（格式如：abc123def456...）

### A.2 配置到扩展

1. 打开Boss直聘助手配置面板
2. 切换到「地点距离」标签页
3. 勾选「启用地图API精确评估」
4. 填写配置：
   - **高德API Key**：粘贴刚才复制的Key
   - **家庭住址**：填写详细地址（如"杭州市西湖区文三路XX号"）
   - **最大通勤时间**：60分钟（默认）
   - **最大距离**：20000米（默认）
5. 点击「保存配置」
6. 点击「测试连接」验证配置

### A.3 免费额度说明

**高德地图个人开发者免费额度**（2024年标准）：
- 地理编码API：30万次/天
- 路径规划API：30万次/天
- 无需填写信用卡
- 无需付费认证

**实际使用量**：
- 每天浏览100个职位，约需调用：
  - 地理编码：10-20次（有缓存，重复地址不计）
  - 路径规划：10次
- **远低于免费额度，完全够用**

### A.4 隐私与安全

- ✅ API Key仅存储在本地Chrome Storage
- ✅ API请求直接从浏览器发送到高德服务器
- ✅ 不经过任何中间服务器
- ✅ 家庭住址仅用于本地计算，不上传
- ✅ 符合高德地图服务条款（个人非商业使用）

### A.5 常见问题

**Q: API Key泄露怎么办？**
A: 在高德控制台可以随时删除旧Key，创建新Key

**Q: 超出免费额度怎么办？**
A: 个人使用不会超出。如果超出，高德会暂停服务而不会扣费

**Q: 地理编码不准确怎么办？**
A: 尝试使用更详细的地址，如"杭州市西湖区文三路XX号XX大厦"

**Q: 可以使用百度地图API吗？**
A: 可以，但需要修改代码。高德地图API在国内更准确
