# Boss直聘求职助手（写着玩的）

一个智能化的Boss直聘求职浏览器扩展，帮助自动筛选匹配职位、打招呼、管理求职流程。

## 功能特性

### ✨ 核心功能

- **智能职位匹配** - 基于技能、薪资、地点等多维度自动评分
- **自动打招呼** - 智能生成个性化开场白，批量向匹配职位发送
- **实时通知** - 支持浏览器通知、企业微信、Server酱、Bark多渠道推送
- **距离评估** - 集成高德地图API，精确计算通勤时间和距离
- **AI增强** - 支持OpenAI/Claude/本地模型生成更智能的消息

### 🛠️ 技术架构

```
boss-extension/
├── manifest.json           # 扩展配置文件
├── lib/                    # 核心库
│   ├── utils.js           # 工具函数
│   ├── matcher.js         # 职位匹配引擎
│   ├── chatbot.js         # 智能聊天机器人
│   ├── notifier.js        # 通知系统
│   ├── ai-service.js      # AI服务抽象层
│   └── distance-evaluator.js  # 距离评估系统
├── content/               # 内容脚本
│   ├── main.js           # 主入口
│   └── style.css         # 页面注入样式
├── background/           # 后台服务
│   └── background.js     # Service Worker
├── popup/                # 弹出窗口
│   ├── popup.html        # UI界面
│   ├── popup.js          # 交互逻辑
│   └── popup.css         # 样式
├── icons/                # 图标资源
└── test/                 # 测试文件
```

## 安装使用

### 方法1: 开发者模式加载

1. 打开Chrome浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择本项目的 `boss-extension` 文件夹
5. 扩展图标会出现在浏览器工具栏中

### 方法2: 打包安装

```bash
# 在项目根目录执行
zip -r boss-extension.zip boss-extension -x "*.git*" "*node_modules*" "*.DS_Store"
```

然后在 `chrome://extensions/` 中拖拽 `.zip` 文件安装。

## 配置说明

### 方式一：修改配置文件（推荐开发者）

编辑 `config.js` 文件可以快速调整所有关键参数：

```javascript
// 1. 修改默认配置
BossConfig.defaults.salaryMin = 30000;  // 期望薪资
BossConfig.defaults.dailyLimit = 20;    // 每日上限

// 2. 调整评分权重
BossConfig.scoring.maxScores.skill = 60;   // 提高技能权重
BossConfig.scoring.maxScores.salary = 25;  // 提高薪资权重

// 3. 调整防检测参数
BossConfig.behavior.delays.beforeClick = { min: 1500, max: 3000 };
```

详细说明请查看 [配置说明.md](./配置说明.md)

### 方式二：通过UI界面配置

点击扩展图标 → 配置页面，可以设置：

- **期望薪资**: 最低薪资要求（元）
- **必备技能**: 逗号分隔，如 `Vue,TypeScript,JavaScript`
- **加分技能**: 额外加分项，如 `React,Node.js`
- **排除关键词**: 自动过滤包含这些词的职位，如 `外包,996,驻场`
- **匹配阈值**: 60-100分，低于此分数的职位不会被推荐

### 打招呼设置

- **每日上限**: 每天最多打招呼次数（防止被限制）
- **自定义开场白**: 留空则使用智能生成

### 个人资料

填写您的基本信息，用于生成个性化打招呼语：

- 姓名、工作年限、技术栈
- 联系电话、期望薪资范围
- GitHub等个人链接

### 通知设置

支持多种通知渠道（可选）：

- **企业微信Webhook**: 用于团队协作通知
- **Server酱**: 微信推送服务
- **Bark**: iOS推送通知

### 高级配置（可选）

如需启用AI功能，需要在配置中添加：

```javascript
{
  "aiProvider": "openai",  // 或 "claude", "local"
  "aiModel": "gpt-4o-mini",
  "openaiApiKey": "sk-...",
  "openaiBaseURL": "https://api.openai.com/v1"
}
```

如需启用地图API距离评估：

```javascript
{
  "gaodeApiKey": "your-gaode-api-key",
  "homeAddress": "杭州市拱墅区都市水乡水曲苑",
  "maxCommuteTime": 40,  // 最大通勤时间（分钟）
  "maxDistance": 8000     // 最大直线距离（米）
}
```

## 使用指南

### 1. 浏览职位列表

访问 [Boss直聘职位列表](https://www.zhipin.com/web/geek/job)，扩展会自动：

- 扫描页面上的所有职位
- 根据您的配置进行匹配评分
- 在职位卡片上显示匹配度标签
- 高亮显示高匹配度职位

### 2. 查看职位详情

点击进入职位详情页，扩展会：

- 在页面右侧显示详细的匹配度分析
- 如果匹配度高，显示"一键打招呼"按钮

### 3. 批量打招呼

点击扩展图标 → 仪表盘 → "开始自动打招呼"：

- 自动向匹配的职位发送个性化消息
- 遵守每日上限设置
- 随机延迟，模拟真人操作

### 4. 查看统计

在仪表盘可以看到：

- 打招呼次数
- 处理职位数
- 最近活动日志

## 开发测试

### 测试AI服务

```bash
# Node.js环境测试
cd test
node node-test-runner.js

# 浏览器环境测试
# 在浏览器中打开 test/test-matching.html
```

### 调试技巧

1. 打开Chrome DevTools → Console查看日志
2. 右键扩展图标 → 检查弹出内容 → 调试popup
3. chrome://extensions → 详细信息 → 检查视图：背景页 → 调试background

### 日志系统

所有日志都存储在Chrome Storage中，可以在popup的"日志"页面查看：

- **info**: 一般信息
- **warn**: 警告信息
- **error**: 错误信息

## 注意事项

⚠️ **使用建议**

- 每日打招呼上限建议设置为20-30次
- 操作间隔建议3-8秒（已内置随机延迟）
- 不建议在公司网络环境下使用自动化功能
- 定期查看日志，确保功能正常运行

⚠️ **隐私说明**

- 所有数据存储在本地浏览器中
- 不会上传任何个人信息到第三方服务器
- AI功能和地图API会调用对应服务（需自行配置密钥）

⚠️ **法律声明**

本工具仅供学习研究使用，请遵守Boss直聘的用户协议和使用规范。过度使用自动化功能可能导致账号受限，请谨慎使用。

## 更新日志

### v1.0.0 (2025-05-09)

- ✅ 初始版本发布
- ✅ 智能职位匹配系统
- ✅ 自动打招呼功能
- ✅ 多渠道通知系统
- ✅ 距离评估（地图API集成）
- ✅ AI服务抽象层（支持OpenAI/Claude/本地）

## 技术栈

- **JavaScript** (ES6+)
- **Chrome Extension Manifest V3**
- **Chrome Storage API**
- **Chrome Notifications API**
- **高德地图API** (可选)
- **OpenAI/Claude API** (可选)

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License

## 作者

金超宇 - [@YUKIJUDAI](https://github.com/YUKIJUDAI)

---

Made with ❤️ for job seekers
