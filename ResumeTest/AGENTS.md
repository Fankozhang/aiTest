# AGENTS.md

本文件为在此代码仓库中工作的 AI 编程代理提供指导。

## 项目概述

简历编辑器 - 一个支持实时预览和 PDF 导出的简历创建与编辑 Web 应用。

**技术栈**：
- 前端（`qian/`）：Vue 3 + Vite + Ant Design Vue 4 + Axios
- 后端（`hou/`）：Python FastAPI + SQLAlchemy + Pydantic + WeasyPrint
- 数据库：MySQL 8.0+（utf8mb4），表结构见 `data.md`

## 仓库结构

```
/
├── AGENTS.md                      # 本文件
├── data.md                        # 数据库表结构设计（MySQL）
├── pencil-new.pen                 # UI/UX 设计文件（Pencil 原型工具）
├── qian/                          # 前端项目（Vue 3 + Vite）
│   ├── src/
│   │   ├── App.vue                # 根组件，数据初始化，布局管理
│   │   ├── main.js                # 应用入口
│   │   ├── api/resume.js          # Axios 封装的所有 API 调用函数
│   │   ├── components/
│   │   │   ├── ResumeEditor.vue   # 左侧编辑面板（容器组件）
│   │   │   ├── ResumePreview.vue  # 右侧实时预览面板
│   │   │   ├── PersonalCard.vue   # 个人信息卡片
│   │   │   ├── WorkCard.vue       # 工作经历卡片
│   │   │   ├── EducationCard.vue  # 教育背景卡片
│   │   │   └── SkillsCard.vue     # 技能标签卡片
│   │   └── styles/global.css      # 全局样式与 CSS 变量
│   ├── vite.config.js             # Vite 配置，端口 5173，代理 /api → :8001
│   └── package.json
└── hou/                           # 后端项目（FastAPI）
    ├── main.py                    # FastAPI 应用入口，路由注册，CORS 配置
    ├── config.py                  # 配置类（读取 .env 环境变量）
    ├── database.py                # SQLAlchemy 引擎、会话工厂、Base
    ├── models/resume.py           # ORM 模型：ResumeMain、WorkExperience、Education、Skill
    ├── schemas/resume.py          # Pydantic 请求/响应模型
    ├── services/resume.py         # ResumeService 业务逻辑类
    ├── services/pdf_generator.py  # WeasyPrint PDF 生成服务
    ├── routers/resume.py          # API 路由（/api/resumes/...）
    ├── .env.example               # 环境变量模板
    └── requirements.txt           # Python 依赖清单
```

## 构建 / 开发命令

### 前端（在 `qian/` 目录下执行）

```bash
# 安装依赖
npm install

# 启动开发服务器（http://localhost:5173）
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

**注意**：前端未配置 ESLint、Prettier、Vitest 或 TypeScript，无 lint / test 命令。

### 后端（在 `hou/` 目录下执行）

```bash
# 安装依赖
pip install -r requirements.txt

# 复制并配置环境变量
cp .env.example .env
# 编辑 .env，填入 MySQL 连接信息（DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME）

# 启动开发服务器（热重载，http://localhost:8001）
uvicorn main:app --reload --port 8001

# 启动生产服务器
uvicorn main:app --host 0.0.0.0 --port 8001
```

**注意**：后端未配置 pytest 或其他测试框架，无 test 命令。
API 交互式文档自动生成于 `http://localhost:8001/docs`。

### 数据库

MySQL 表已手动创建，**禁止**调用 `Base.metadata.create_all()` 重新建表。
`init_db()` 仅打印确认信息，不执行任何 DDL 操作。

## 数据流

```
用户操作子卡片组件
  └─→ emit('update', data)
        └─→ ResumeEditor.vue 汇聚后 emit('update', patch)
              └─→ App.vue：Object.assign(resumeData, patch)
                    ├─→ ResumePreview.vue（响应式实时预览）
                    └─→ handleSave() → saveResume(id, data)
                              └─→ POST /api/resumes/{id}/save
```

## 代码风格指南

### 前端 — Vue 组件

- **仅使用 Composition API**，搭配 `<script setup>` 语法
- 在 `<script setup>` 中直接使用 `defineProps` / `defineEmits`，无需从 vue 导入
- Props 定义必须包含 `type` 和 `required`（或 `default`）
- 父子通信：子组件通过 emit 传递事件，父组件监听；**禁止**直接修改 props
- 数组列表使用 `v-for` 配合 `:key`，本地数据可用 index 作为 key
- 访问可能为 null 的 DOM 元素时使用可选链（`?.`）

### 前端 — 命名规范

| 类型 | 风格 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `WorkCard.vue` |
| 变量 / 函数 | camelCase | `resumeData`、`handleSave` |
| CSS 类名 | kebab-case | `resume-editor`、`cards-container` |
| 事件名 | camelCase | `update`、`save`、`delete` |

### 前端 — CSS 规范

样式写在 `<style scoped>` 块中，新增样式**必须优先引用**以下 CSS 变量，避免硬编码颜色值：

```css
--primary-color: #3B82F6    /* 主色调 */
--primary-hover: #2563EB    /* 悬停色 */
--text-dark: #1E293B        /* 主文字 */
--text-secondary: #94A3B8   /* 次要文字 */
--border-color: #E2E8F0     /* 边框 */
--bg-main: #F8FAFC          /* 主背景 */
--bg-preview: #F1F5F9       /* 预览背景 */
--card-radius: 12px         /* 卡片圆角 */
--input-radius: 8px         /* 输入框圆角 */
```

覆盖 Ant Design 样式时可使用 `!important`，但须限制在 `global.css` 中。

### 前端 — API 调用

- 所有 API 调用集中在 `src/api/resume.js`，通过统一的 Axios 实例发送
- baseURL 固定为 `/api`，由 Vite dev server 代理转发到 `http://localhost:8001`
- **禁止**在组件中直接使用 `axios`，只调用 `src/api/resume.js` 导出的函数
- 函数命名：动词 + 名词（`getResume`、`saveResume`、`downloadPDF`）

### 后端 — Python 风格

- 遵循 PEP 8，使用 4 空格缩进，行宽不超过 88 字符
- 类名：PascalCase（`ResumeService`、`ResumeMain`）
- 函数 / 变量：snake_case（`get_resume_full`、`resume_id`）
- 常量：大写 snake_case（`DATABASE_URL`）
- 所有类和函数必须有中文文档字符串说明用途
- 模块导入顺序：标准库 → 第三方库 → 本地模块，各组之间空一行

### 后端 — 分层架构

```
routers/   仅处理 HTTP 请求/响应，调用 Service，捕获异常转为 HTTPException
services/  业务逻辑，调用 ORM 模型操作数据库，不直接返回 HTTP 响应
models/    SQLAlchemy ORM 模型，包含 to_dict() 序列化方法
schemas/   Pydantic 请求/响应模型，包含 Field(...) 字段校验
```

**禁止**在 router 中直接编写数据库查询；新增功能必须遵循此分层。

### 后端 — Schema 命名规范

- 请求模型：`XxxCreate`、`XxxUpdate`、`XxxFullSave`
- 响应模型：`XxxResponse`、`XxxListItem`
- 可选字段：`Optional[T] = Field(None, description="...")`
- 必填字段：`Field(..., description="...")`，并加长度/范围约束

### 后端 — 错误处理

- Router 层用 `try/except` 包裹所有业务调用
- 先捕获并重新抛出 `HTTPException`，再捕获通用 `Exception`
- 通用异常统一返回 `status_code=500`，detail 包含中文说明和原始错误信息
- Service 层不抛 HTTP 异常，找不到资源时返回 `None` 或 `False`

## 数据库规范

- 所有子表通过 `resume_id` 字段与主表逻辑关联，**不使用外键约束**
- 删除简历时，应用层须手动删除 `resume_work_experiences`、`resume_education`、`resume_skills` 中的关联记录
- 子表均包含 `sort_order` 字段，查询时按 `sort_order ASC, id ASC` 排序
- 所有表使用 `utf8mb4` + `utf8mb4_unicode_ci`，支持中文及 emoji
- ID 字段类型为 `BIGINT`，时间字段类型为 `TIMESTAMP`

## 重要注意事项

- **无 TypeScript**：前端全部为纯 JavaScript，不要假设类型检查存在
- **无测试框架**：前后端均未集成测试工具，不要假设 Vitest / pytest 存在
- **无路由**：前端为单页面应用，无 Vue Router
- **PDF 导出**：后端使用 WeasyPrint 通过 Jinja2 模板生成 PDF，接口为 `GET /api/resumes/{id}/download`
- **用户系统**：当前固定使用 `user_id=1`，尚未实现多用户认证
- **前端用户提示**：使用 Ant Design Vue 的 `message.success/error/info()`，破坏性操作使用 `Modal.confirm()`
- **后端用户提示**：不涉及，错误信息通过 HTTP 响应 detail 字段返回
