# Vue 3 + Vite 简历项目

这是一个使用 Vue 3 和 Vite 构建的简历应用项目。

## 项目结构

```
resume/
├── node_modules/          # 依赖包
├── public/                # 静态资源文件
├── src/                   # 源代码目录
│   ├── components/        # 组件目录
│   ├── App.vue            # 根组件
│   └── main.js            # 应用入口文件
├── index.html             # HTML 入口文件
├── vite.config.js         # Vite 配置文件
├── package.json           # 项目配置和依赖
└── package-lock.json      # 依赖锁定文件
```

## 开发脚本

- `npm run dev`: 启动开发服务器 (http://localhost:3000)
- `npm run build`: 构建生产版本
- `npm run preview`: 预览生产构建

## 技术栈

- **Vue 3**: 使用 Composition API 和 `<script setup>` 语法
- **Vite**: 快速的构建工具和开发服务器
- **ESLint/Prettier**: 代码格式化和 linting (可选配置)

## 下一步

1. 在 `src/components/` 目录中添加简历相关的组件
2. 修改 `App.vue` 来构建简历页面布局
3. 添加样式和响应式设计
4. 集成数据管理（如果需要）

项目已准备就绪，可以开始开发您的简历应用！