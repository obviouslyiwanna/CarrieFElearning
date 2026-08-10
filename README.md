# CarrieFElearning

Carrie 的前端学习博客，第一阶段聚焦 React：把真实业务中的问题、理解和验证过程写成可以回看的学习笔记。

## 内容结构

- `app/page.tsx`：博客首页、分类筛选与搜索
- `app/articles/`：文章详情页
- `.openai/hosting.json`：Sites 部署元数据

## 本地运行

项目需要 Node.js 22.13+。安装依赖后运行：

```bash
npm install
npm run dev
```

构建验证：

```bash
npm run build
```

## 博客框架选择

这版采用 vinext starter 搭建 React/Markdown 友好的站点骨架，内容组织保留了 Docusaurus 一类博客的思路：文章独立、路由清晰、后续可以继续扩展分类、标签、搜索和 RSS。
