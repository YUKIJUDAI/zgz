# 两阶段职位评分系统设计

**日期**: 2026-05-09
**版本**: 1.0
**状态**: 设计阶段

---

## 概述

为Boss直聘求职助手添加**两阶段职位评分机制**，提升技能匹配的准确性，同时保证系统安全性（避免被平台检测为自动化工具）。

### 核心原则

1. **安全第一**: 完全被动式工作，不主动打开任何页面
2. **渐进增强**: 列表页快速初筛 → 详情页精确分析
3. **用户体验**: 渐进式加载，避免等待空白期
4. **数据持久化**: 使用 chrome.storage.local 缓存评分结果

---

## 问题背景

### 当前问题

1. **列表页信息不足**: 职位卡片只有标题、标签、薪资等简短信息，缺少完整的职位描述（JD）
2. **技能匹配不准确**: 强行在列表页基于有限信息评估技能，导致大量误判
3. **详情页未利用**: 详情页有完整的JD描述，包含详细的技能要求、工作内容、任职资格等，但未被用于评分

### 解决方案

**两阶段评分机制**:
- **列表页**: 仅评估客观条件（薪资、地点），快速筛选
- **详情页**: 基于完整JD进行全维度精确评分（技能、加分项等）

---

## 系统架构

### 整体流程

```
┌──────────────────────────────────────────────────────────┐
│                      职位列表页                            │
│                                                           │
│  扫描职位 → 初步评分（薪资+地点） → 显示标签 → 缓存分数   │
│                                                           │
└──────────────────────────────────────────────────────────┘
                            ↓
                    用户点击职位
                            ↓
┌──────────────────────────────────────────────────────────┐
│                      职位详情页                            │
│                                                           │
│  1. 从缓存读取初步分 → 立即显示                            │
│  2. 显示加载状态: "🔄 正在精确分析..."                     │
│  3. 提取完整JD描述                                         │
│  4. 重新评分（全维度）                                     │
│  5. 更新显示: 精确分 + 分数对比                            │
│  6. 缓存精确分                                            │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### 关键特性

- ✅ **被动式**: 不主动打开任何页面，只在用户访问时工作
- ✅ **渐进式**: 先显示初步分，后台更新为精确分
- ✅ **持久化**: 评分结果缓存到 chrome.storage.local
- ✅ **智能去重**: 已评分的职位不重复计算（除非缓存过期）

---

## 评分维度设计

### 列表页初步评分（最高25分）

**仅评估客观条件，不涉及技能文本分析**

| 维度 | 分值 | 说明 |
|------|------|------|
| 薪资匹配 | 15分 | 薪资范围是否满足期望 |
| 地点匹配 | 10分 | 工作地点是否在期望范围 |
| **总分** | **25分** | - |

**列表页标签颜色**:
- 25分 → 🟢 绿色 "条件完全匹配"
- 15-24分 → 🔵 蓝色 "部分匹配"
- 0-14分 → ⚪ 灰色 "条件不符"

### 详情页精确评分（最高100分）

**基于完整JD，全维度评分**

| 维度 | 分值 | 说明 |
|------|------|------|
| 技能匹配 | 50分 | 必备技能在JD中的匹配度（仅详情页分析） |
| 加分技能 | 20分 | 加分技能的匹配情况（仅详情页分析） |
| 薪资匹配 | 15分 | 重新计算（可能更准确） |
| 地点匹配 | 10分 | 重新计算 |
| 标题匹配 | 5分 | 职位标题包含核心技能（仅详情页分析） |
| **总分** | **100分** | - |

**详情页标签颜色**:
- 80-100分 → 🟢 绿色 "强烈推荐"
- 60-79分 → 🔵 蓝色 "推荐"
- 40-59分 → 🟠 橙色 "一般"
- 0-39分 → ⚪ 灰色 "不推荐"

---

## 数据结构设计

### 缓存数据结构

存储在 `chrome.storage.local` 中，键名为 `bossJobScores`：

```javascript
{
  "bossJobScores": {
    "job_123456": {
      "jobId": "123456",

      // 初步评分（列表页）
      "preliminaryScore": {
        "score": 25,              // 最高25分
        "details": {
          "salaryScore": 15,      // 薪资匹配分
          "locationScore": 10     // 地点匹配分
          // 不包含 skillScore、bonusScore、titleScore
        },
        "timestamp": 1715234567890,
        "source": "job-list"
      },

      // 精确评分（详情页，只有访问过才有）
      "accurateScore": {
        "score": 78,              // 最高100分
        "details": {
          "skillScore": 38,       // 🆕 基于完整JD
          "bonusScore": 15,       // 🆕 基于完整JD
          "salaryScore": 15,
          "locationScore": 10,
          "titleScore": 0         // 🆕 基于完整JD
        },
        "timestamp": 1715234600000,
        "source": "job-detail",
        "hasFullDescription": true
      },

      // 职位基本信息（用于显示）
      "cachedInfo": {
        "title": "前端开发工程师",
        "company": "XXX科技有限公司",
        "salary": "20-35K",
        "location": "杭州·滨江区"
      },

      // 缓存元数据
      "lastUpdated": 1715234600000,
      "lastAccessed": 1715234600000
    }
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `jobId` | string | 职位ID，从URL提取 |
| `preliminaryScore` | object | 列表页的初步评分（薪资+地点） |
| `accurateScore` | object | 详情页的精确评分（全维度）|
| `cachedInfo` | object | 职位基本信息，用于显示 |
| `lastUpdated` | timestamp | 最后更新时间 |
| `lastAccessed` | timestamp | 最后访问时间（用于LRU淘汰）|
| `hasFullDescription` | boolean | 是否已抓取完整JD |

### 缓存管理策略

1. **容量限制**: 最多存储200个职位，超过时按LRU淘汰最旧的50个
2. **过期策略**: 7天未访问的缓存视为过期，重新评分
3. **存储失败降级**: 失败时使用localStorage备份

---

## 详细实现流程

### 1. 列表页流程（增强现有逻辑）

```javascript
// content/main.js - handleJobListPage()

async function handleJobListPage() {
  // 步骤1: 扫描职位（现有逻辑）
  const jobs = await scanJobs();

  // 步骤2: 初步评分（仅评估薪资+地点）
  for (const job of jobs) {
    const matchResult = JobMatcher.matchPreliminary(job, config);
    // matchPreliminary() 是新函数，只计算薪资和地点

    job.preliminaryScore = matchResult;

    // 步骤3: 存储到缓存
    await JobScoreCache.savePreliminaryScore(job.id, {
      score: matchResult.score,
      details: {
        salaryScore: matchResult.details.salaryScore,
        locationScore: matchResult.details.locationScore
      },
      cachedInfo: {
        title: job.title,
        company: job.company,
        salary: job.salary,
        location: job.location
      }
    });
  }

  // 步骤4: 在页面标记（显示25分制标签）
  markJobsWithPreliminaryScore(jobs);
}
```

#### 新增函数：JobMatcher.matchPreliminary()

在 `lib/matcher.js` 中新增：

```javascript
/**
 * 列表页初步评分（仅薪资+地点）
 * @returns {score: 0-25, details: {salaryScore, locationScore}}
 */
matchPreliminary(jobInfo, config) {
  const details = {};
  let score = 0;

  // 薪资匹配（15分）
  const salaryScore = this.scoreSalary(jobInfo, config, 15);
  score += salaryScore;
  details.salaryScore = Math.round(salaryScore);

  // 地点匹配（10分）
  const locationScore = this.scoreLocation(jobInfo, config, 10);
  score += locationScore;
  details.locationScore = Math.round(locationScore);

  score = Math.round(score);

  return {
    passed: score >= 15,  // 至少15分才算通过初筛
    score,
    details,
    type: 'preliminary'
  };
}
```

### 2. 详情页流程（全新实现）

```javascript
// content/main.js - handleJobDetailPage()

async function handleJobDetailPage() {
  const jobId = extractJobIdFromURL();

  // 步骤1: 检查缓存
  const cachedScore = await JobScoreCache.load(jobId);

  // 步骤2: 立即显示初步分（如果有）
  if (cachedScore?.preliminaryScore) {
    showScorePanel({
      score: cachedScore.preliminaryScore.score,
      details: cachedScore.preliminaryScore.details,
      status: 'preliminary',
      loading: true,
      message: '🔄 正在精确分析...'
    });
  } else {
    // 无缓存，显示加载中
    showScorePanel({
      status: 'loading',
      message: '正在分析职位...'
    });
  }

  // 步骤3: 检查是否已有精确分（避免重复评分）
  if (cachedScore?.accurateScore) {
    const age = Date.now() - cachedScore.accurateScore.timestamp;
    const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天

    if (age < CACHE_EXPIRY) {
      // 缓存未过期，直接显示精确分
      updateScorePanel({
        oldScore: cachedScore.preliminaryScore?.score,
        newScore: cachedScore.accurateScore.score,
        details: cachedScore.accurateScore.details,
        status: 'accurate',
        cached: true
      });
      return; // 结束流程
    }
  }

  // 步骤4: 等待页面加载
  try {
    await waitForJobDetailLoaded();
  } catch (error) {
    showScorePanel({
      status: 'error',
      message: '页面加载超时，请刷新重试'
    });
    return;
  }

  // 步骤5: 提取完整职位信息
  const jobInfo = extractJobDetail();

  if (!jobInfo?.description || jobInfo.description.length < 20) {
    // JD提取失败或太短，降级处理
    showScorePanel({
      status: 'warning',
      message: '无法获取完整职位描述',
      score: cachedScore?.preliminaryScore?.score || 0,
      details: cachedScore?.preliminaryScore?.details
    });

    BossUtils.log('warn', '详情页JD提取失败', {
      url: window.location.href,
      descLength: jobInfo?.description?.length
    });
    return;
  }

  // 步骤6: 基于完整JD重新评分（全维度）
  const accurateResult = JobMatcher.match(jobInfo, config);
  // match() 是现有函数，评估所有维度

  // 步骤7: 更新显示 - 渐进式动画
  updateScorePanel({
    oldScore: cachedScore?.preliminaryScore?.score,
    newScore: accurateResult.score,
    details: accurateResult.details,
    status: 'accurate',
    hasFullDescription: true,
    showDiff: true  // 显示分数变化
  });

  // 步骤8: 缓存精确分
  await JobScoreCache.saveAccurateScore(jobId, {
    score: accurateResult.score,
    details: accurateResult.details,
    cachedInfo: {
      title: jobInfo.title,
      company: jobInfo.company,
      salary: jobInfo.salary,
      location: jobInfo.location
    },
    hasFullDescription: true
  });

  // 步骤9: 显示分数对比（如果差异明显）
  if (cachedScore?.preliminaryScore?.score) {
    const diff = accurateResult.score - cachedScore.preliminaryScore.score;
    if (Math.abs(diff) >= 10) {  // 差异10分以上才显示提示
      showScoreDiffToast(diff);
    }
  }
}
```

#### 辅助函数：waitForJobDetailLoaded()

```javascript
/**
 * 等待职位详情页加载完成
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<boolean>}
 */
async function waitForJobDetailLoaded(timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const descElement = document.querySelector(
      '.job-sec-text, .job-detail-section, .job-description'
    );

    if (descElement && descElement.textContent.trim().length > 50) {
      // 描述至少50字符，认为加载成功
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  throw new Error('页面加载超时');
}
```

#### 辅助函数：extractJobIdFromURL()

```javascript
/**
 * 从URL提取职位ID
 * @returns {string}
 */
function extractJobIdFromURL() {
  // Boss直聘详情页URL格式: /job_detail/xxxxx.html
  const match = window.location.pathname.match(/job_detail\/([^.]+)/);
  return match ? match[1] : Math.random().toString(36).substr(2, 9);
}
```

### 3. 缓存管理模块（新增）

创建 `lib/score-cache.js`：

```javascript
/**
 * 职位评分缓存管理器
 */
const JobScoreCache = {
  STORAGE_KEY: 'bossJobScores',
  MAX_ENTRIES: 200,      // 最多存储200个职位
  CACHE_EXPIRY: 7 * 24 * 60 * 60 * 1000,  // 7天过期

  /**
   * 保存初步评分（列表页）
   */
  async savePreliminaryScore(jobId, data) {
    const allScores = await this._loadAll();
    const key = `job_${jobId}`;

    allScores[key] = {
      ...allScores[key],
      jobId,
      preliminaryScore: {
        ...data,
        timestamp: Date.now(),
        source: 'job-list'
      },
      cachedInfo: data.cachedInfo,
      lastUpdated: Date.now(),
      lastAccessed: Date.now()
    };

    await this._saveAll(allScores);
  },

  /**
   * 保存精确评分（详情页）
   */
  async saveAccurateScore(jobId, data) {
    const allScores = await this._loadAll();
    const key = `job_${jobId}`;

    allScores[key] = {
      ...allScores[key],
      jobId,
      accurateScore: {
        score: data.score,
        details: data.details,
        timestamp: Date.now(),
        source: 'job-detail',
        hasFullDescription: data.hasFullDescription
      },
      cachedInfo: data.cachedInfo,
      lastUpdated: Date.now(),
      lastAccessed: Date.now()
    };

    await this._saveAll(allScores);
  },

  /**
   * 加载职位评分
   */
  async load(jobId) {
    const allScores = await this._loadAll();
    const score = allScores[`job_${jobId}`];

    if (!score) return null;

    // 检查是否过期
    if (Date.now() - score.lastUpdated > this.CACHE_EXPIRY) {
      BossUtils.log('info', '缓存已过期', { jobId });
      return null;
    }

    // 更新访问时间
    score.lastAccessed = Date.now();
    await this._saveAll(allScores);

    return score;
  },

  /**
   * 加载所有缓存
   */
  async _loadAll() {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      return result[this.STORAGE_KEY] || {};
    } catch (error) {
      BossUtils.log('error', 'Storage读取失败', error);
      return {};
    }
  },

  /**
   * 保存所有缓存（带容量管理）
   */
  async _saveAll(scores) {
    try {
      // 检查容量
      const entries = Object.entries(scores);
      if (entries.length > this.MAX_ENTRIES) {
        // 按 lastAccessed 排序，保留最近访问的
        entries.sort((a, b) => b[1].lastAccessed - a[1].lastAccessed);
        scores = Object.fromEntries(entries.slice(0, this.MAX_ENTRIES));

        BossUtils.log('info', `缓存容量管理：保留 ${this.MAX_ENTRIES} 条`);
      }

      await chrome.storage.local.set({ [this.STORAGE_KEY]: scores });
    } catch (error) {
      BossUtils.log('error', 'Storage保存失败', error);

      // 降级：使用localStorage备份
      try {
        localStorage.setItem(
          `${this.STORAGE_KEY}_backup`,
          JSON.stringify(scores)
        );
      } catch (e) {
        BossUtils.log('error', 'localStorage备份失败', e);
      }
    }
  },

  /**
   * 清空所有缓存
   */
  async clearAll() {
    await chrome.storage.local.remove([this.STORAGE_KEY]);
    BossUtils.log('info', '缓存已清空');
  }
};
```

---

## UI设计

### 列表页UI

**职位卡片标签样式**：

```
┌──────────────────────────────┐
│  前端开发工程师               │
│  XXX科技                     │
│  20-35K · 杭州·滨江区        │
│                    [25分] 🟢 │ ← 初步分标签
└──────────────────────────────┘
```

**标签颜色规则**：
- 25分 → 🟢 绿色 `#52c41a`
- 15-24分 → 🔵 蓝色 `#1890ff`
- 0-14分 → ⚪ 灰色 `#d9d9d9`

**标签文案**：
- `"25分"` （不显示"初步"，避免混淆用户）
- 鼠标悬停提示：`"基础条件：薪资✓ 地点✓"`

### 详情页UI - 三种状态

#### 状态1：加载中（无缓存时）

```
┌────────────────────────────────┐
│  职位匹配度分析                 │
│                                │
│  🔄 正在分析职位...            │
│                                │
└────────────────────────────────┘
```

#### 状态2：显示初步分 + 加载中（有缓存时）

```
┌────────────────────────────────┐
│  基础条件匹配                   │
│                                │
│  ✅ 薪资匹配: 15/15分          │
│  ✅ 地点匹配: 10/10分          │
│  ━━━━━━━━━━━━━━━━━━━━━        │
│  🔄 正在分析技能匹配...        │
│                                │
└────────────────────────────────┘
```

#### 状态3：精确分析完成

```
┌────────────────────────────────┐
│  匹配度：78分（精确）✨         │
│                                │
│  技能匹配: 38/50分 🆕          │
│    ✓ Vue, TypeScript          │
│    ✗ JavaScript               │
│                                │
│  加分技能: 15/20分 🆕          │
│    ✓ React, Node.js           │
│                                │
│  薪资匹配: 15/15分             │
│  地点匹配: 10/10分             │
│  标题匹配: 0/5分 🆕            │
│  ━━━━━━━━━━━━━━━━━━━━━        │
│  💡 基于完整JD分析             │
│                                │
│  [ 查看详细匹配 ]              │
└────────────────────────────────┘
```

**如果分数有明显变化，显示对比**：

```
┌────────────────────────────────┐
│  匹配度：78分 ⬆️ +53分          │
│  （初步分：25分 → 精确分：78分）│
│  ...                           │
└────────────────────────────────┘
```

### UI实现函数

```javascript
/**
 * 显示/更新评分面板
 */
function showScorePanel(data) {
  const oldPanel = document.getElementById('boss-score-panel-v2');
  if (oldPanel) oldPanel.remove();

  const panel = document.createElement('div');
  panel.id = 'boss-score-panel-v2';
  panel.className = 'boss-score-panel';

  let html = '';

  if (data.status === 'loading') {
    html = `
      <div class="panel-header">职位匹配度分析</div>
      <div class="panel-body">
        <div class="loading-state">
          <span class="spinner">🔄</span>
          <span>${data.message || '正在分析职位...'}</span>
        </div>
      </div>
    `;
  } else if (data.status === 'preliminary') {
    html = `
      <div class="panel-header">基础条件匹配</div>
      <div class="panel-body">
        <div class="score-row">
          <span>✅ 薪资匹配</span>
          <span>${data.details.salaryScore}/15分</span>
        </div>
        <div class="score-row">
          <span>✅ 地点匹配</span>
          <span>${data.details.locationScore}/10分</span>
        </div>
        ${data.loading ? `
          <div class="divider"></div>
          <div class="loading-state">
            <span class="spinner">🔄</span>
            <span>正在分析技能匹配...</span>
          </div>
        ` : ''}
      </div>
    `;
  } else if (data.status === 'accurate') {
    const scoreColor = data.newScore >= 80 ? '#52c41a' :
                      data.newScore >= 60 ? '#1890ff' :
                      data.newScore >= 40 ? '#faad14' : '#d9d9d9';

    const diffText = data.oldScore && data.showDiff
      ? `<div class="score-diff">
          ${data.newScore > data.oldScore ? '⬆️' : '⬇️'}
          ${data.newScore > data.oldScore ? '+' : ''}${data.newScore - data.oldScore}分
          （初步分：${data.oldScore}分）
        </div>`
      : '';

    html = `
      <div class="panel-header">
        匹配度：<span style="color: ${scoreColor}; font-size: 24px; font-weight: bold;">
          ${data.newScore}分
        </span>（精确）✨
      </div>
      ${diffText}
      <div class="panel-body">
        <div class="score-row">
          <span>技能匹配 🆕</span>
          <span>${data.details.skillScore}/50分</span>
        </div>
        <div class="score-row">
          <span>加分技能 🆕</span>
          <span>${data.details.bonusScore}/20分</span>
        </div>
        <div class="score-row">
          <span>薪资匹配</span>
          <span>${data.details.salaryScore}/15分</span>
        </div>
        <div class="score-row">
          <span>地点匹配</span>
          <span>${data.details.locationScore}/10分</span>
        </div>
        <div class="score-row">
          <span>标题匹配 🆕</span>
          <span>${data.details.titleScore}/5分</span>
        </div>
        <div class="divider"></div>
        <div class="info-text">💡 基于完整JD分析</div>
      </div>
    `;
  } else if (data.status === 'error' || data.status === 'warning') {
    html = `
      <div class="panel-header">
        ${data.status === 'error' ? '❌' : '⚠️'} 分析失败
      </div>
      <div class="panel-body">
        <div class="info-text">${data.message}</div>
      </div>
    `;
  }

  panel.innerHTML = html;
  panel.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    z-index: 9999;
    min-width: 280px;
    max-width: 350px;
    font-family: -apple-system, sans-serif;
  `;

  document.body.appendChild(panel);
}

/**
 * 更新评分面板（带动画）
 */
function updateScorePanel(data) {
  const panel = document.getElementById('boss-score-panel-v2');

  if (panel) {
    // 先淡出
    panel.style.transition = 'opacity 0.3s';
    panel.style.opacity = '0';

    setTimeout(() => {
      showScorePanel(data);
      // 淡入
      const newPanel = document.getElementById('boss-score-panel-v2');
      newPanel.style.opacity = '0';
      setTimeout(() => {
        newPanel.style.transition = 'opacity 0.5s';
        newPanel.style.opacity = '1';
      }, 50);
    }, 300);
  } else {
    showScorePanel(data);
  }
}

/**
 * 显示分数变化提示
 */
function showScoreDiffToast(diff) {
  const message = diff > 0
    ? `✨ 精确分析后提升了 ${diff} 分！`
    : `📉 精确分析后降低了 ${Math.abs(diff)} 分`;

  BossUtils.showToast(message, diff > 0 ? 'success' : 'info');
}
```

---

## 错误处理

### 1. 职位详情页无法提取JD

**场景**: DOM结构变化、页面未加载完成、网络错误

**处理**:
```javascript
if (!jobInfo?.description || jobInfo.description.length < 20) {
  showScorePanel({
    status: 'warning',
    message: '无法获取完整职位描述，使用基础评分',
    score: cachedScore?.preliminaryScore?.score || 0
  });

  BossUtils.log('warn', '详情页JD提取失败', {
    url: window.location.href,
    descLength: jobInfo?.description?.length,
    selectors: ['.job-sec-text', '.job-detail-section']
  });

  return;
}
```

### 2. Storage API失败

**场景**: 配额超限、权限问题、浏览器异常

**处理**:
```javascript
try {
  await chrome.storage.local.set({ bossJobScores: scores });
} catch (error) {
  BossUtils.log('error', 'Storage保存失败', error.message);

  // 降级：使用localStorage
  try {
    localStorage.setItem('bossJobScores_backup', JSON.stringify(scores));
    BossUtils.showToast('评分已保存到本地备份', 'warning');
  } catch (e) {
    BossUtils.log('error', 'localStorage备份失败', e);
    BossUtils.showToast('评分保存失败', 'error');
  }
}
```

### 3. 页面加载超时

**场景**: 网络慢、页面卡顿、DOM未渲染

**处理**:
```javascript
try {
  await waitForJobDetailLoaded(5000);  // 5秒超时
} catch (error) {
  showScorePanel({
    status: 'error',
    message: '页面加载超时，请刷新重试'
  });

  BossUtils.log('error', '页面加载超时', {
    url: window.location.href,
    timeout: 5000
  });

  return;
}
```

### 4. 评分面板渲染失败

**场景**: DOM操作失败、样式冲突

**处理**:
```javascript
function showScorePanel(data) {
  try {
    // ... 面板创建逻辑
    document.body.appendChild(panel);
  } catch (error) {
    BossUtils.log('error', '评分面板渲染失败', error);

    // 降级：使用toast显示
    const score = data.score || data.newScore || 0;
    BossUtils.showToast(`匹配度：${score}分`, 'info');
  }
}
```

---

## 边界情况

### 1. 首次访问详情页（无列表页缓存）

**场景**: 用户直接打开职位详情链接，从未在列表页浏览过

**处理**:
- 不显示初步分（因为不存在）
- 直接显示加载中状态
- 评分完成后显示精确分，不显示对比

```javascript
if (!cachedScore?.preliminaryScore) {
  showScorePanel({ status: 'loading' });
  // 继续评分流程...
  // 最终不显示分数对比
}
```

### 2. 重复访问同一详情页

**场景**: 用户短时间内多次访问同一职位

**处理**:
- 检查缓存是否有 `accurateScore`
- 如果有且未过期（7天），直接使用缓存，不重新评分
- 节省计算资源，提升响应速度

```javascript
if (cachedScore?.accurateScore) {
  const age = Date.now() - cachedScore.accurateScore.timestamp;
  if (age < CACHE_EXPIRY) {
    // 直接显示缓存的精确分
    updateScorePanel({
      newScore: cachedScore.accurateScore.score,
      details: cachedScore.accurateScore.details,
      status: 'accurate',
      cached: true,
      showDiff: false
    });
    return;
  }
}
```

### 3. 缓存容量超限

**场景**: 用户浏览了大量职位，缓存超过200条

**处理**:
- 按 `lastAccessed` 排序
- 保留最近访问的200条
- 删除最旧的条目

```javascript
if (entries.length > 200) {
  entries.sort((a, b) => b[1].lastAccessed - a[1].lastAccessed);
  scores = Object.fromEntries(entries.slice(0, 200));
  BossUtils.log('info', 'LRU淘汰：保留最近200条');
}
```

### 4. 配置更新后的处理

**场景**: 用户修改了必备技能、薪资期望等配置

**处理**:
- 清空所有缓存的评分（因为评分标准变了）
- 保留 `cachedInfo`（职位基本信息）
- 触发重新评分

```javascript
// popup.js - saveConfig()
await chrome.storage.local.remove(['bossJobScores']);
BossUtils.showToast('配置已更新，评分已清空', 'info');
```

### 5. 分数无变化或变化很小

**场景**: 初步分和精确分相同，或差异小于5分

**处理**:
- 不显示分数对比提示
- 只显示"基于完整JD分析"标识

```javascript
if (cachedScore?.preliminaryScore?.score) {
  const diff = accurateResult.score - cachedScore.preliminaryScore.score;
  if (Math.abs(diff) < 5) {
    // 差异太小，不显示对比
    showDiff = false;
  }
}
```

---

## 技术实现细节

### 1. Manifest.json 修改

添加缓存管理模块到 content_scripts：

```json
{
  "content_scripts": [
    {
      "matches": ["https://www.zhipin.com/*"],
      "js": [
        "config.js",
        "lib/utils.js",
        "lib/matcher.js",
        "lib/score-cache.js",    // 🆕 新增
        "lib/chatbot.js",
        "lib/notifier.js",
        "content/main.js"
      ],
      "css": ["content/style.css"],
      "run_at": "document_end"
    }
  ]
}
```

### 2. 修改现有 JobMatcher

在 `lib/matcher.js` 中：

**新增函数**:
```javascript
/**
 * 列表页初步评分（仅薪资+地点）
 */
matchPreliminary(jobInfo, config) {
  // 实现如前所述
}
```

**保持现有函数**:
```javascript
/**
 * 完整评分（详情页使用）
 */
match(jobInfo, config) {
  // 现有逻辑不变
  // 评估所有维度：技能、加分、薪资、地点、标题
}
```

### 3. 列表页标记函数修改

修改 `content/main.js` 中的 `markAllJobsOnPage()`：

```javascript
function markAllJobsOnPage(jobs, config) {
  for (const job of jobs) {
    if (!job.element) continue;

    // 移除旧标签
    const existingBadge = job.element.querySelector('.boss-assistant-badge');
    if (existingBadge) existingBadge.remove();

    // 使用初步评分（25分制）
    const matchResult = job.preliminaryScore ||
                       JobMatcher.matchPreliminary(job, config);

    // 创建标签
    const badge = document.createElement('div');
    badge.className = 'boss-assistant-badge';
    badge.textContent = `${matchResult.score}分`;

    // 根据25分制设置颜色
    let bgColor;
    if (matchResult.score >= 25) {
      bgColor = '#52c41a';  // 绿色
    } else if (matchResult.score >= 15) {
      bgColor = '#1890ff';  // 蓝色
    } else {
      bgColor = '#d9d9d9';  // 灰色
    }

    badge.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: ${bgColor};
      color: white;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: bold;
      z-index: 10;
      cursor: help;
    `;

    // 悬停提示
    const salaryMatch = matchResult.details.salaryScore >= 15 ? '✓' : '✗';
    const locationMatch = matchResult.details.locationScore >= 10 ? '✓' : '✗';
    badge.title = `基础条件：\n薪资${salaryMatch} 地点${locationMatch}\n\n点击查看详情可进行精确分析`;

    job.element.style.position = 'relative';
    job.element.appendChild(badge);
  }
}
```

### 4. CSS样式

在 `content/style.css` 中添加：

```css
/* 评分面板样式 */
.boss-score-panel {
  animation: slideIn 0.5s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(50px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.boss-score-panel .panel-header {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
}

.boss-score-panel .panel-body {
  font-size: 14px;
  color: #666;
}

.boss-score-panel .score-row {
  display: flex;
  justify-content: space-between;
  margin: 8px 0;
}

.boss-score-panel .divider {
  height: 1px;
  background: #f0f0f0;
  margin: 12px 0;
}

.boss-score-panel .loading-state {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1890ff;
}

.boss-score-panel .spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.boss-score-panel .score-diff {
  background: #f6ffed;
  color: #52c41a;
  padding: 8px;
  border-radius: 6px;
  font-size: 12px;
  margin: 8px 0;
  text-align: center;
}

.boss-score-panel .info-text {
  font-size: 12px;
  color: #999;
  text-align: center;
  margin-top: 8px;
}
```

---

## 测试策略

### 单元测试

**待测试函数**:

1. `JobMatcher.matchPreliminary()` - 初步评分逻辑
2. `JobScoreCache.savePreliminaryScore()` - 缓存保存
3. `JobScoreCache.load()` - 缓存读取和过期判断
4. `waitForJobDetailLoaded()` - 页面加载等待

**测试用例**:
```javascript
// 测试初步评分
test('matchPreliminary should only score salary and location', () => {
  const job = {
    salary: '20-35K',
    location: '杭州·滨江区',
    title: 'Vue开发工程师',
    tags: ['Vue', 'TypeScript']
  };

  const config = {
    salaryMin: 20000,
    locations: ['杭州']
  };

  const result = JobMatcher.matchPreliminary(job, config);

  expect(result.score).toBe(25);  // 15+10
  expect(result.details.salaryScore).toBe(15);
  expect(result.details.locationScore).toBe(10);
  expect(result.details.skillScore).toBeUndefined();
});

// 测试缓存过期
test('load should return null for expired cache', async () => {
  const oldScore = {
    lastUpdated: Date.now() - 8 * 24 * 60 * 60 * 1000  // 8天前
  };

  // Mock storage
  chrome.storage.local.get = jest.fn().mockResolvedValue({
    bossJobScores: { 'job_123': oldScore }
  });

  const result = await JobScoreCache.load('123');
  expect(result).toBeNull();
});
```

### 集成测试

**测试场景**:

1. **列表页 → 详情页完整流程**
   - 在列表页浏览职位
   - 点击进入详情页
   - 验证初步分显示
   - 验证精确分更新
   - 验证缓存保存

2. **无缓存首次访问详情页**
   - 直接打开详情页URL
   - 验证跳过初步分显示
   - 验证直接显示精确分

3. **重复访问详情页**
   - 第一次访问：计算精确分
   - 第二次访问：使用缓存
   - 验证不重复计算

4. **缓存容量管理**
   - 模拟访问250个职位
   - 验证只保留200个
   - 验证LRU淘汰正确

### 手动测试清单

- [ ] 列表页职位标签显示正确（25分制）
- [ ] 列表页标签颜色符合规则
- [ ] 点击职位进入详情页
- [ ] 详情页先显示初步分（如有缓存）
- [ ] 详情页显示"正在分析"加载状态
- [ ] 详情页精确分计算正确（100分制）
- [ ] 分数对比显示正确（如有差异）
- [ ] 评分面板动画流畅
- [ ] 重复访问使用缓存，不重新计算
- [ ] 首次访问详情页（无缓存）正常工作
- [ ] 页面加载超时显示错误提示
- [ ] JD提取失败显示降级提示
- [ ] Storage失败降级到localStorage
- [ ] 缓存容量超限正确淘汰
- [ ] 配置更新后缓存清空

---

## 性能考虑

### 1. 缓存策略优化

- **读多写少**: 详情页重复访问使用缓存，不重新评分
- **容量限制**: 最多200条，避免无限增长
- **过期淘汰**: 7天未访问自动过期
- **LRU算法**: 淘汰最不常用的数据

### 2. DOM操作优化

- **批量更新**: 列表页标签一次性添加，避免多次reflow
- **动画节流**: 评分面板更新使用CSS transition，不使用JS动画
- **延迟渲染**: 详情页面板使用`requestAnimationFrame`优化

### 3. 存储优化

- **数据压缩**: 只存储必要字段，删除冗余信息
- **分批保存**: 列表页评分分批保存到Storage，避免阻塞
- **降级备份**: Storage失败降级到localStorage

---

## 安全性考虑

### 1. 被动式工作原则

- ✅ **不主动打开任何页面**: 只在用户已打开的页面工作
- ✅ **不模拟点击**: 不自动点击"立即沟通"等按钮
- ✅ **不发送请求**: 不向Boss服务器发送额外请求
- ✅ **不修改页面逻辑**: 只添加显示元素，不干扰原页面

### 2. 操作间隔

- 列表页评分：无需延迟（只读本地信息）
- 详情页评分：用户主动访问，符合正常浏览行为
- 缓存读写：本地操作，无安全风险

### 3. 数据隐私

- 所有数据存储在本地浏览器
- 不上传到任何服务器
- 卸载扩展自动清除

---

## 向后兼容

### 1. 现有功能保持不变

- 列表页自动打招呼功能不受影响
- 消息通知功能不受影响
- 配置管理功能不受影响

### 2. 平滑升级

- 新用户：直接使用两阶段评分
- 老用户：首次升级后，缓存为空，正常构建缓存
- 配置迁移：无需迁移，现有配置直接适用

### 3. 降级方案

- 如果 Storage API 不可用，降级到 localStorage
- 如果 localStorage 也不可用，仅显示实时评分（不缓存）

---

## 未来扩展

### 可能的增强功能

1. **评分历史统计**
   - 记录每天查看的职位数
   - 统计平均匹配度
   - 生成求职报告

2. **智能推荐**
   - 基于历史评分学习偏好
   - 推荐相似高分职位
   - 自动标记"可能感兴趣"

3. **导出功能**
   - 导出评分记录为Excel
   - 分享高分职位列表
   - 生成求职总结报告

4. **跨设备同步**
   - 使用 chrome.storage.sync 同步评分
   - 多设备查看历史记录

---

## 总结

### 关键改进

1. **准确性提升**: 基于完整JD评分，技能匹配准确度大幅提升
2. **安全性保证**: 被动式工作，不会被平台检测为自动化工具
3. **用户体验优化**: 渐进式加载，先显示基础评分，后台更新精确分
4. **性能优化**: 缓存机制避免重复计算，LRU淘汰控制容量

### 实现优先级

**阶段1（核心功能）**:
- [ ] JobMatcher.matchPreliminary() 实现
- [ ] JobScoreCache 模块实现
- [ ] 列表页初步评分和缓存
- [ ] 详情页精确评分流程
- [ ] UI组件实现

**阶段2（优化和错误处理）**:
- [ ] 错误处理完善
- [ ] 边界情况处理
- [ ] 性能优化
- [ ] 样式美化

**阶段3（测试和文档）**:
- [ ] 单元测试
- [ ] 集成测试
- [ ] 用户手册更新
- [ ] 代码注释完善

---

## 附录

### A. 相关文件清单

**新增文件**:
- `lib/score-cache.js` - 缓存管理模块

**修改文件**:
- `content/main.js` - 添加详情页评分流程
- `lib/matcher.js` - 添加 matchPreliminary() 函数
- `content/style.css` - 添加评分面板样式
- `manifest.json` - 添加新模块到 content_scripts

**文档**:
- `docs/superpowers/specs/2026-05-09-two-stage-job-scoring-design.md` - 本设计文档

### B. 配置项

无需新增配置项，使用现有配置：
- `salaryMin` - 期望最低薪资
- `locations` - 期望工作地点
- `requiredSkills` - 必备技能
- `bonusSkills` - 加分技能
- `matchThreshold` - 匹配阈值

### C. 日志记录

关键操作日志：
- 列表页评分：`BossUtils.log('info', '列表页初步评分', { jobId, score })`
- 详情页评分：`BossUtils.log('info', '详情页精确评分', { jobId, score })`
- 缓存命中：`BossUtils.log('debug', '使用缓存评分', { jobId })`
- 缓存过期：`BossUtils.log('info', '缓存已过期', { jobId })`
- JD提取失败：`BossUtils.log('warn', 'JD提取失败', { url, descLength })`
- Storage失败：`BossUtils.log('error', 'Storage保存失败', error)`

---

**设计完成日期**: 2026-05-09
**设计负责人**: Claude (AI Assistant)
**项目**: Boss直聘求职助手 v1.1.0
