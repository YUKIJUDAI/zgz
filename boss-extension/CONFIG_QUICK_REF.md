# config.js 快速参考

> 💡 直接修改 `config.js` 来调整扩展行为，无需通过UI界面

## 🔥 最常用配置

### 个人信息

```javascript
// 位置: BossConfig.defaults.profile
profile: {
  name: '金超宇',           // 👈 你的名字
  yearsExperience: 9,      // 👈 工作年限
  techStack: 'Vue3/TS/JS', // 👈 技术栈
  phone: '185xxxxx506',    // 👈 电话
  expectedSalary: '25-35', // 👈 期望薪资(K)
}
```

### 匹配规则

```javascript
// 位置: BossConfig.defaults
salaryMin: 25000,  // 👈 最低薪资（元/月）
matchThreshold: 60, // 👈 匹配阈值（60-100分）
dailyLimit: 30,     // 👈 每日打招呼上限

requiredSkills: ['Vue', 'TypeScript'],  // 👈 必备技能
bonusSkills: ['React', 'Node.js'],      // 👈 加分技能
excludedKeywords: ['外包', '996'],      // 👈 排除关键词
```

## ⚖️ 两阶段评分系统 🆕

### 列表页初步评分（25分制）

```javascript
// 仅评估客观条件，快速初筛
{
  salary: 15,   // 👈 薪资匹配（最高15分）
  location: 10, // 👈 地点匹配（最高10分）
  // 不评估技能、加分、标题（留给详情页）
}
```

**颜色标识**：
- 🟢 绿色（25分）：薪资+地点完全匹配
- 🔵 蓝色（15-24分）：部分匹配
- ⚪ 灰色（0-14分）：条件不符

### 详情页精确评分（100分制）

```javascript
// 位置: BossConfig.scoring.maxScores
// 基于完整职位描述（JD）全维度评分
{
  skill: 50,    // 👈 技能匹配（默认最高50分）🆕 详情页分析
  bonus: 20,    // 👈 加分技能（默认最高20分）🆕 详情页分析
  salary: 15,   // 👈 薪资匹配（默认最高15分）
  location: 10, // 👈 地点匹配（默认最高10分）
  title: 5,     // 👈 标题匹配（默认最高5分）🆕 详情页分析
}

// 示例：更看重薪资
maxScores: {
  skill: 40,
  salary: 30,  // ⬆️ 提高薪资权重
}
```

**渐进式显示**：
1. 立即显示初步分（薪资+地点）
2. 后台分析完整JD
3. 更新为精确分（所有维度）

**缓存机制**：
- 自动缓存评分结果
- 最多保存200个职位
- 7天自动过期

## 🛡️ 防检测参数

```javascript
// 位置: BossConfig.behavior
delays: {
  beforeClick: { min: 800, max: 2000 },  // 👈 点击前等待
  typing: { min: 30, max: 120 },         // 👈 打字速度
}

limits: {
  dailyGreet: 30,      // 👈 硬限制（每天最多）
  maxContinuous: 5,    // 👈 连续操作几次后休息
}
```

**建议值**：
- 保守：`beforeClick: { min: 1500, max: 3000 }`, `dailyGreet: 20`
- 激进：`beforeClick: { min: 500, max: 1000 }`, `dailyGreet: 50` ⚠️

## 🔑 API配置

### OpenAI

```javascript
// 位置: BossConfig.ai
ai: {
  enabled: true,  // 👈 启用AI
  provider: 'openai',
  openai: {
    apiKey: 'sk-xxxxx',  // 👈 你的API Key
    model: 'gpt-4o-mini',
  },
}
```

### 高德地图

```javascript
// 位置: BossConfig.distance
distance: {
  gaode: {
    apiKey: 'your-key',  // 👈 高德API Key
    enabled: true,
  },
  homeAddress: '杭州市拱墅区xxx',  // 👈 家庭地址
  limits: {
    maxCommuteTime: 60,  // 👈 最大通勤时间（分钟）
  },
}
```

## 🎨 UI调整

```javascript
// 位置: BossConfig.ui
scorePanel: {
  position: { top: '100px', right: '20px' },  // 👈 面板位置
}

colors: {
  primary: '#667eea',  // 👈 主色调
  success: '#52c41a',  // 👈 成功色
}
```

## 🐞 调试模式

```javascript
// 位置: BossConfig.debug
debug: {
  enabled: true,        // 👈 启用调试
  skipDelays: true,     // 👈 跳过延迟（快速测试）
  dryRun: true,        // 👈 不实际发送消息
}
```

⚠️ **警告**：调试模式仅用于测试，生产环境请关闭！

---

## 📝 修改后的步骤

1. 编辑 `config.js`
2. 保存文件
3. 打开 `chrome://extensions/`
4. 点击扩展的刷新按钮 🔄
5. 刷新Boss直聘页面

---

## 💡 常见配置场景

### 场景1：只看高薪职位

```javascript
BossConfig.defaults.salaryMin = 35000;
BossConfig.defaults.matchThreshold = 70;
BossConfig.scoring.maxScores.salary = 30;  // 提高薪资权重

// 💡 列表页会自动过滤薪资不达标的职位（<35K会显示灰色/0分）
// 只有薪资≥35K的才会显示蓝色/绿色标签
```

### 场景2：提高效率（多打招呼）

```javascript
BossConfig.defaults.dailyLimit = 50;
BossConfig.behavior.delays.beforeClick = { min: 500, max: 1000 };
BossConfig.behavior.limits.dailyGreet = 50;
BossConfig.behavior.limits.maxContinuous = 10;

// 💡 列表页快速初筛，详情页精确分析
// 缓存机制避免重复评分，提升浏览速度
```

### 场景3：注重质量（少而精）

```javascript
BossConfig.defaults.dailyLimit = 15;
BossConfig.defaults.matchThreshold = 80;
BossConfig.scoring.levels.excellent = 85;

// 💡 只关注详情页精确分≥80的高分职位
// 列表页快速过滤掉不符合基础条件的职位
```

### 场景4：地点优先（通勤重要）🆕

```javascript
BossConfig.defaults.locations = ['杭州·滨江区', '杭州·西湖区'];
BossConfig.scoring.maxScores.location = 20;  // 提高地点权重
BossConfig.scoring.maxScores.skill = 40;     // 相应降低技能权重

// 💡 列表页：地点不匹配的直接0分（灰色）
// 详情页：地点权重提升至20分
```

### 场景5：技能第一（技术栈匹配）🆕

```javascript
BossConfig.defaults.requiredSkills = ['Vue3', 'TypeScript', 'Vite'];
BossConfig.defaults.bonusSkills = ['Pinia', 'Vitest', 'Playwright'];
BossConfig.defaults.matchThreshold = 70;

// 💡 列表页：仅显示薪资+地点基础分
// 详情页：完整JD技能分析（最高50分技能+20分加分）
// 技能匹配度高的职位会在详情页大幅提分
```

---

完整配置说明：[配置说明.md](./配置说明.md)
