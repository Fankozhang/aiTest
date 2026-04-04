# 简历编辑器系统设计文档

## 1. 项目概述

### 1.1 项目目标
开发一个简历编辑器Web应用，支持简历编辑、实时预览和PDF下载功能。

### 1.2 技术选型
- **前端**：Vue 3 + Vite + Ant Design Vue
- **后端**：Python + FastAPI + SQLAlchemy + MySQL
- **PDF生成**：weasyprint

### 1.3 设计依据
- UI设计：`pencil-new.pen` (Pencil原型设计文件)
- 数据库设计：`data.md` (MySQL表结构文档)

---

## 2. 系统架构

### 2.1 整体架构
采用前后端分离架构：
- 前端 (`qian/`)：Vue3单页应用，提供用户界面
- 后端 (`hou/`)：FastAPI服务，提供REST API
- 数据库：MySQL存储简历数据

### 2.2 目录结构

```
ResumeTest/
├── qian/                       # 前端项目
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── api/
│   │   │   └── resume.js
│   │   ├── components/
│   │   │   ├── ResumeEditor.vue
│   │   │   ├── ResumePreview.vue
│   │   │   ├── PersonalCard.vue
│   │   │   ├── WorkCard.vue
│   │   │   ├── EducationCard.vue
│   │   │   └── SkillsCard.vue
│   │   └── styles/
│   │       └── global.css
│   └── public/
│
├── hou/                        # 后端项目
│   ├── main.py
│   ├── requirements.txt
│   ├── config.py
│   ├── database.py
│   ├── models/
│   │   └── resume.py
│   ├── schemas/
│   │   └── resume.py
│   ├── routers/
│   │   └── resume.py
│   ├── services/
│   │   ├── resume.py
│   │   └── pdf_generator.py
│   └── templates/
│       └── resume.html
│
├── data.md                     # 数据库表结构
└── pencil-new.pen              # UI设计文件
```

---

## 3. 前端设计

### 3.1 组件架构

```
App.vue
├── ResumeEditor.vue (左侧面板)
│   ├── PersonalCard.vue      # 个人信息卡片
│   ├── WorkCard.vue          # 工作经历卡片
│   ├── EducationCard.vue     # 教育背景卡片
│   └── SkillsCard.vue        # 技能标签卡片
└── ResumePreview.vue (右侧面板)
```

### 3.2 数据流设计

```javascript
// App.vue - 根组件状态管理
const resumeData = reactive({
  id: null,
  name: '',
  title: '',
  email: '',
  phone: '',
  age: null,
  work_years: null,
  summary: '',
  work_experiences: [],
  education: [],
  skills: []
})
```

**数据流向**：
1. App.vue 持有 resumeData 响应式状态
2. 通过 props 传递给 ResumeEditor.vue
3. ResumeEditor.vue 分发给各卡片组件
4. 卡片组件通过 emit 事件通知数据变更
5. App.vue 更新状态后，通过 props 传递给 ResumePreview.vue
6. ResumePreview.vue 实时渲染预览

### 3.3 页面布局 (对应pencil-new.pen设计)

**导航栏** (64px高度)：
- 左侧：Logo + "简历编辑器"文字
- 右侧：下载PDF按钮

**主内容区**：
- 左侧面板 (610px宽)：编辑区域，背景色 #F8FAFC
  - 4个白色卡片，圆角12px，边框 #E2E8F0
  - 卡片内部有添加/删除按钮
- 右侧面板 (926px宽)：预览区域，背景色 #F1F5F9
  - A4纸预览 (595x842px)
  - 头部深色背景 #1E293B
  - 左侧边栏显示技能和教育
  - 右侧主区域显示简介和工作经历

### 3.4 样式规范

| 元素 | 样式 |
|------|------|
| 主色调 | #3B82F6 |
| 深色文字 | #1E293B |
| 次要文字 | #94A3B8 |
| 边框颜色 | #E2E8F0 |
| 背景色 | #F8FAFC |
| 输入框圆角 | 8px |
| 卡片圆角 | 12px |
| 按钮内边距 | 8px 16px |

---

## 4. 后端设计

### 4.1 数据库表结构

**resume_main** (简历主表)：
- id, user_id, name, title, email, phone, age, work_years, summary
- created_at, updated_at

**resume_work_experiences** (工作经历表)：
- id, resume_id, company, position, start_date, end_date, description
- sort_order, created_at

**resume_education** (教育背景表)：
- id, resume_id, school, degree, major, start_date, end_date
- sort_order, created_at

**resume_skills** (技能标签表)：
- id, resume_id, skill_name
- sort_order, created_at

### 4.2 API接口设计

#### 基础CRUD接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/resumes` | 创建简历 |
| GET | `/api/resumes/{id}` | 获取简历详情（包含所有子数据） |
| PUT | `/api/resumes/{id}` | 更新简历基本信息 |
| DELETE | `/api/resumes/{id}` | 删除简历（级联删除子数据） |
| GET | `/api/resumes` | 获取简历列表 |

#### 子资源接口

**工作经历**：
- POST `/api/resumes/{id}/work-experiences`
- PUT `/api/resumes/{id}/work-experiences/{exp_id}`
- DELETE `/api/resumes/{id}/work-experiences/{exp_id}`

**教育背景**：
- POST `/api/resumes/{id}/education`
- PUT `/api/resumes/{id}/education/{edu_id}`
- DELETE `/api/resumes/{id}/education/{edu_id}`

**技能标签**：
- POST `/api/resumes/{id}/skills`
- DELETE `/api/resumes/{id}/skills/{skill_id}`

#### 重要功能接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/resumes/{id}/save` | 完整保存简历（更新主表+替换所有子表） |
| GET | `/api/resumes/{id}/download` | 下载PDF文件 |

### 4.3 数据模型 (Pydantic Schemas)

```python
# 请求模型
class ResumeCreate(BaseModel):
    name: str
    title: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    age: Optional[int]
    work_years: Optional[int]
    summary: Optional[str]

class WorkExperienceCreate(BaseModel):
    company: str
    position: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    description: Optional[str]

class EducationCreate(BaseModel):
    school: str
    degree: Optional[str]
    major: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]

class SkillCreate(BaseModel):
    skill_name: str

# 响应模型
class ResumeResponse(ResumeCreate):
    id: int
    work_experiences: List[WorkExperienceResponse]
    education: List[EducationResponse]
    skills: List[SkillResponse]
```

---

## 5. 关键功能实现

### 5.1 简历保存流程

```
前端 [保存简历信息] 按钮点击
    ↓
收集表单数据：{ resumeData }
    ↓
调用 POST /api/resumes/{id}/save
    ↓
后端事务处理：
  1. 更新 resume_main 表
  2. 删除该简历所有 work_experiences
  3. 插入新的 work_experiences
  4. 删除该简历所有 education
  5. 插入新的 education
  6. 删除该简历所有 skills
  7. 插入新的 skills
  ↓
返回成功响应
    ↓
前端显示保存成功提示
```

### 5.2 PDF下载流程

```
前端 [下载PDF] 按钮点击
    ↓
调用 GET /api/resumes/{id}/download
    ↓
后端处理：
  1. 查询完整简历数据（主表+子表）
  2. 渲染 Jinja2 HTML 模板
  3. weasyprint 转换 HTML 为 PDF
  ↓
返回 PDF 文件流 (application/pdf)
    ↓
前端创建 Blob URL，触发浏览器下载
```

### 5.3 实时预览实现

- 前端使用 Vue 3 响应式系统
- 用户输入时直接更新本地 reactive 状态
- ResumePreview.vue 通过 computed 或 watch 监听变化
- 无需每次输入都调用 API，提升用户体验

---

## 6. 错误处理

### 6.1 后端错误处理

- 数据库操作异常：捕获 SQLAlchemy 异常，返回 500
- 数据验证失败：Pydantic 自动验证，返回 422
- 资源不存在：返回 404
- PDF生成失败：返回 500 并记录日志

### 6.2 前端错误处理

- API 请求失败：显示 Ant Design Message 错误提示
- 表单验证：使用 Ant Design Form 校验规则
- 网络异常：捕获 axios 错误，显示友好提示

---

## 7. 开发环境配置

### 7.1 前端依赖

```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "ant-design-vue": "^4.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

### 7.2 后端依赖

```
fastapi==0.109.0
uvicorn==0.27.0
sqlalchemy==2.0.25
pymysql==1.1.0
pydantic==2.5.3
weasyprint==61.0
jinja2==3.1.3
python-multipart==0.0.6
```

---

## 8. 验收标准

1. **简历编辑**：能够编辑个人信息、添加/删除工作经历、教育背景、技能标签
2. **实时预览**：左侧编辑时右侧A4预览实时更新
3. **数据保存**：点击保存按钮后数据持久化到MySQL
4. **PDF下载**：点击下载按钮生成并下载PDF文件，样式与预览一致
5. **删除简历**：能够删除整个简历及其关联数据
