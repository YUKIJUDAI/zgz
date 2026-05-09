---
name: interview-scorer
description: 维护 main/ 下的本地前端面试评分器。适用于修改面试练习界面、题库、评分逻辑、本地存储行为，或这个项目的 Node 静态服务；当 aicode-frontend-interview 题库文档变更时，也用于同步 HTML 题库。
---

# 面试评分器

## 作用

这是一个本地前端面试练习工具。

- 界面、题库、评分规则和本地持久化位于 `main/index.html`
- 本地服务位于 `main/server.ts`
- 启动脚本位于 `main/package.json`

## 快速启动

在 `main/` 目录执行：

```bash
npm run dev
```

或者：

```bash
npm run start
```

默认地址：

```text
http://127.0.0.1:8000
```

## 文件说明

### `main/index.html`

以下内容主要改这个文件：

- 页面布局和样式
- 分类筛选
- 题库内容
- 评分规则
- 逐题反馈
- 总结评分和建议
- localStorage 持久化

### `main/server.ts`

以下内容主要改这个文件：

- 本地静态服务行为
- 默认端口行为
- content-type 映射
- 基础文件访问限制

### `main/package.json`

以下内容主要改这个文件：

- dev/start 脚本
- 运行命令

## 题库来源同步

- `aicode-frontend-interview*.md` 是题库来源文档。
- 当这些 Markdown 文档中的题目、分类、建议或示例发生实质性变化时，要同步检查 `main/index.html` 中的 `questionBank` 是否需要更新。
- 同步时优先保持现有数据结构不变，只更新题目内容、分类、提示语、参考要点和评分点。

## 编辑约束

- 保持项目本地优先、依赖尽量少。
- 优先使用浏览器本地可解释的确定性评分，不要默认接外部 API。
- 新增题目时，保持现有对象结构不变：

```js
{
  id,
  category,
  title,
  tags,
  placeholder,
  reference,
  points,
  lengthHint
}
```

- 每个 `points` 项应包含：

```js
{
  label,
  keywords,
  weight,
  tip
}
```

- 如果修改评分逻辑，要保持结果可理解，用户应能看出为什么分高或分低。
- 除非用户明确要求，否则不要引入框架、构建工具或后端服务。
- 默认使用中文维护项目相关文案、规则、提示语和新增说明。

## 验证方式

做了实质性修改后：

1. 在 `main/` 中启动应用
2. 确认页面能打开
3. 确认可以输入答案并提交评分
4. 确认整体评分和建议仍然会更新

## 合适的改动

- 新增面试分类
- 调整评分提示
- 优化反馈文案
- 提升界面清晰度
- 优化本地服务行为

## 默认避免

- 把所有内容都拆出 `index.html`
- 随意添加第三方依赖
- 用远程服务替换本地评分逻辑
- 在没有用户要求时把项目改造成更大的框架应用
