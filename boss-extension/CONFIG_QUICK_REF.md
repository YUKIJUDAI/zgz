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

## ⚖️ 评分权重

```javascript
// 位置: BossConfig.scoring.maxScores
{
  skill: 50,    // 👈 技能匹配（默认最高50分）
  bonus: 20,    // 👈 加分技能（默认最高20分）
  salary: 15,   // 👈 薪资匹配（默认最高15分）
  location: 10, // 👈 地点匹配（默认最高10分）
  title: 5,     // 👈 标题匹配（默认最高5分）
}

// 示例：更看重薪资
maxScores: {
  skill: 40,
  salary: 30,  // ⬆️ 提高薪资权重
}
```

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
```

### 场景2：提高效率（多打招呼）

```javascript
BossConfig.defaults.dailyLimit = 50;
BossConfig.behavior.delays.beforeClick = { min: 500, max: 1000 };
BossConfig.behavior.limits.dailyGreet = 50;
BossConfig.behavior.limits.maxContinuous = 10;
```

### 场景3：注重质量（少而精）

```javascript
BossConfig.defaults.dailyLimit = 15;
BossConfig.defaults.matchThreshold = 80;
BossConfig.scoring.levels.excellent = 85;
```

---

完整配置说明：[配置说明.md](./配置说明.md)
