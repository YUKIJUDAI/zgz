# 诊断测试指南

## 目的
收集诊断日志，确定页面刷新问题的根本原因。

## 已添加的诊断点

### Content Script (content/main.js)
1. 脚本文件开始执行
2. IIFE 开始执行
3. 依赖项检查 (BossUtils, BossChatbot, BossNotifier, JobMatcher)
4. 重复注入检查
5. 设置注入标记
6. initialize() 函数的每个步骤
7. 接收到的消息（特别是 refreshConfig）

### Background Script (background/background.js)
- Storage 变化事件
- 查询到的 Boss 标签页数量
- 向每个标签页发送 refreshConfig 消息

### Popup (popup/popup.js)
- DOMContentLoaded 事件
- 初始化过程
- enableSwitch change 事件
- isInitializing 状态变化

## 测试步骤

### 第一步：清空控制台并重新加载扩展

1. 打开 Chrome 扩展管理页面：`chrome://extensions/`
2. 找到"Boss直聘求职助手"
3. 打开"检查视图 Service Worker"（这是 background script 的控制台）
4. 清空 background 控制台
5. 点击扩展的"重新加载"按钮
6. **立即查看 background 控制台的输出并记录**

### 第二步：打开 Boss 直聘页面并观察

1. 打开新标签页，访问 https://www.zhipin.com/web/geek/job
2. **立即**按 F12 打开开发者工具
3. 切换到 Console 标签
4. **记录从页面加载开始的所有 `[Boss助手诊断]` 日志**

### 第三步：检查页面是否刷新

1. 观察页面是否刷新
2. 如果刷新了，记录：
   - 刷新发生在哪个诊断日志之后
   - 刷新是否循环发生
   - 每次刷新之间的间隔

### 第四步：检查注入标记和元素

在 Console 中运行以下命令并记录结果：

```javascript
// 1. 检查注入标记
console.log('注入标记:', window.bossAssistantInjected);

// 2. 检查控制面板
console.log('控制面板数量:', document.querySelectorAll('#boss-assistant-panel').length);

// 3. 检查 Toast
console.log('Toast 数量:', document.querySelectorAll('.boss-toast').length);

// 4. 检查依赖项
console.log('依赖项:', {
  BossUtils: typeof BossUtils !== 'undefined',
  BossChatbot: typeof BossChatbot !== 'undefined',
  BossNotifier: typeof BossNotifier !== 'undefined',
  JobMatcher: typeof JobMatcher !== 'undefined'
});
```

### 第五步：测试 Popup 操作

1. 点击扩展图标打开 Popup
2. **在 background 控制台**中观察是否有 storage 变化日志
3. **在页面控制台**中观察是否收到 refreshConfig 消息
4. 切换"启用/禁用"开关
5. 再次观察两个控制台的日志

### 第六步：导出完整日志

1. 在页面控制台中，右键点击任意日志
2. 选择"Save as..." 保存完整日志
3. 同样保存 background 控制台的日志

## 需要提供的信息

请提供以下信息：

1. **页面控制台的完整日志**（特别是所有 `[Boss助手诊断]` 开头的日志）
2. **Background 控制台的完整日志**（特别是 `[Boss助手诊断-BG]` 开头的日志）
3. **页面刷新的具体表现**：
   - 刷新了几次？
   - 是循环刷新还是刷新一次后停止？
   - 刷新发生在哪个操作之后？
4. **四个检查命令的输出结果**
5. **浏览器版本和操作系统信息**

## 关键问题诊断

根据日志，我们可以确定：

### 如果看到日志 1-5 但没有日志 6
→ 问题：initialize() 函数没有被调用
→ 可能原因：IIFE 执行出错

### 如果看到日志 6 但在某个步骤停止
→ 问题：initialize() 在特定步骤失败
→ 日志会显示是哪个步骤（9-16）

### 如果看到日志 3 显示缺少依赖项
→ 问题：依赖脚本没有正确加载
→ 需要检查 manifest.json 中的脚本顺序

### 如果反复看到日志 1-19
→ 问题：页面在循环刷新
→ 需要查看是否有 refreshConfig 消息触发

### 如果看到大量"收到 refreshConfig 消息"
→ 问题：storage 变化触发了级联刷新
→ 需要查看 background 日志中的 storage 变化原因

## 预期的正常日志序列

```
[Boss助手诊断] 1. 脚本文件开始执行
[Boss助手诊断] 2. IIFE 开始执行
[Boss助手诊断] 3. 依赖项检查: {BossUtils: true, BossChatbot: true, ...}
[Boss助手诊断] 5. 设置注入标记
[Boss助手诊断] 17. 准备调用 initialize() 启动扩展
[Boss助手诊断] 19. IIFE 执行完成，等待 async 操作
[Boss助手诊断] 6. initialize() 开始
[Boss助手诊断] 9. 首次初始化，加载配置
[Boss助手诊断] 10. 配置加载完成
[Boss助手诊断] 12. 初始化子模块
[Boss助手诊断] 13. 检测当前页面
[Boss助手诊断] 14. 添加控制面板
[Boss助手诊断] 15. 启动页面变化监听
[Boss助手诊断] 16. ✓ 初始化完成
[Boss助手诊断] 18. ✓ initialize() Promise 已完成
```

之后应该**不再有**新的初始化日志，除非：
- 用户切换了启用/禁用开关（会看到 Popup 和 Background 的日志）
- 页面 URL 发生变化（只会看到页面检测相关的日志，不会重新初始化）
