# 简历编辑器实现计划

## 项目信息
- **创建时间**: 2026-03-28
- **设计文档**: `docs/superpowers/specs/2026-03-28-resume-editor-design.md`
- **UI设计**: `pencil-new.pen`
- **数据库设计**: `data.md`

---

## 任务概览

| 阶段 | 任务数 | 预计时间 |
|------|--------|----------|
| 前端初始化 | 4 | 15分钟 |
| 前端组件 | 6 | 45分钟 |
| 后端初始化 | 4 | 15分钟 |
| 后端接口 | 6 | 40分钟 |
| 集成测试 | 3 | 20分钟 |
| **总计** | **23** | **~2.5小时** |

---

## 阶段1: 前端项目初始化

### 任务1.1: 创建Vue3项目结构
**文件**: 
- `qian/package.json`
- `qian/vite.config.js`
- `qian/index.html`

**内容**:
```json
// package.json
{
  "name": "resume-editor",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
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

### 任务1.2: 创建主入口文件
**文件**: `qian/src/main.js`

**依赖**: vue, ant-design-vue

### 任务1.3: 创建API服务层
**文件**: `qian/src/api/resume.js`

**接口封装**:
- `getResume(id)` - GET /api/resumes/{id}
- `saveResume(id, data)` - POST /api/resumes/{id}/save
- `downloadPDF(id)` - GET /api/resumes/{id}/download
- `deleteResume(id)` - DELETE /api/resumes/{id}
- `createResume()` - POST /api/resumes

### 任务1.4: 创建全局样式
**文件**: `qian/src/styles/global.css`

**样式参数** (来自pencil-new.pen):
- 主色调: #3B82F6
- 深色文字: #1E293B
- 次要文字: #94A3B8
- 边框: #E2E8F0
- 背景: #F8FAFC
- 预览背景: #F1F5F9
- 字体: Inter
- 卡片圆角: 12px
- 输入框圆角: 8px

---

## 阶段2: 前端组件开发

### 任务2.1: App.vue - 根组件
**文件**: `qian/src/App.vue`

**职责**:
- 管理全局状态 (resumeData reactive对象)
- 布局容器 (导航栏 + 左右分栏)
- 调用API进行数据加载/保存

**数据结构**:
```javascript
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

### 任务2.2: ResumeEditor.vue - 编辑面板
**文件**: `qian/src/components/ResumeEditor.vue`

**职责**:
- 包含4个卡片组件
- 保存/删除按钮
- 向父组件emit数据变更

### 任务2.3: PersonalCard.vue - 个人信息卡片
**文件**: `qian/src/components/PersonalCard.vue`

**字段**:
- 姓名 (name)
- 职位 (title)
- 邮箱 (email)
- 电话 (phone)
- 年龄 (age)
- 工作年限 (work_years)
- 个人简介 (summary - textarea)

**布局**: 2列网格，简介占满一行

### 任务2.4: WorkCard.vue - 工作经历卡片
**文件**: `qian/src/components/WorkCard.vue`

**功能**:
- 动态添加/删除工作经历条目
- 每条包含: 公司、职位、开始日期、结束日期、描述

**UI**: 可折叠列表，每条有删除按钮

### 任务2.5: EducationCard.vue - 教育背景卡片
**文件**: `qian/src/components/EducationCard.vue`

**功能**:
- 动态添加/删除教育经历条目
- 每条包含: 学校、学历、专业、开始日期、结束日期

### 任务2.6: SkillsCard.vue - 技能标签卡片
**文件**: `qian/src/components/SkillsCard.vue`

**功能**:
- 添加/删除技能标签
- 使用Ant Design Tag组件展示
- 输入框 + 添加按钮

### 任务2.7: ResumePreview.vue - 预览面板
**文件**: `qian/src/components/ResumePreview.vue`

**职责**:
- A4纸预览 (595x842px)
- 左侧边栏: 技能、教育
- 右侧主区域: 简介、工作经历
- 头部深色背景显示姓名职位

**样式** (来自pencil-new.pen):
- 头部背景: #1E293B
- 左侧栏宽: 180px
- 圆角: 4px
- 阴影: box-shadow

---

## 阶段3: 后端项目初始化

### 任务3.1: 创建Python项目结构
**文件**:
- `hou/requirements.txt`
- `hou/config.py`
- `hou/database.py`

**依赖**:
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

### 任务3.2: 创建数据库模型
**文件**: `hou/models/resume.py`

**表名**:
- ResumeMain (resume_main)
- WorkExperience (resume_work_experiences)
- Education (resume_education)
- Skill (resume_skills)

### 任务3.3: 创建Pydantic Schema
**文件**: `hou/schemas/resume.py`

**请求模型**:
- ResumeCreate
- ResumeUpdate
- WorkExperienceCreate
- EducationCreate
- SkillCreate

**响应模型**:
- ResumeResponse (包含所有子数据)
- ResumeListItem

### 任务3.4: 创建FastAPI入口
**文件**: `hou/main.py`

**配置**:
- CORS中间件
- 路由注册
- 启动事件 (数据库初始化)

---

## 阶段4: 后端接口实现

### 任务4.1: 简历CRUD接口
**文件**: `hou/routers/resume.py`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/resumes | 创建简历 |
| GET | /api/resumes | 获取简历列表 |
| GET | /api/resumes/{id} | 获取简历详情 |
| PUT | /api/resumes/{id} | 更新简历基本信息 |
| DELETE | /api/resumes/{id} | 删除简历 (级联删除子数据) |

### 任务4.2: 工作经历接口
**文件**: `hou/routers/resume.py` (续)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/resumes/{id}/work-experiences | 添加工作经历 |
| PUT | /api/resumes/{id}/work-experiences/{exp_id} | 更新工作经历 |
| DELETE | /api/resumes/{id}/work-experiences/{exp_id} | 删除工作经历 |

### 任务4.3: 教育背景接口
**文件**: `hou/routers/resume.py` (续)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/resumes/{id}/education | 添加教育背景 |
| PUT | /api/resumes/{id}/education/{edu_id} | 更新教育背景 |
| DELETE | /api/resumes/{id}/education/{edu_id} | 删除教育背景 |

### 任务4.4: 技能标签接口
**文件**: `hou/routers/resume.py` (续)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/resumes/{id}/skills | 添加技能 |
| DELETE | /api/resumes/{id}/skills/{skill_id} | 删除技能 |

### 任务4.5: 完整保存接口
**文件**: `hou/routers/resume.py` (续)

**接口**: `POST /api/resumes/{id}/save`

**逻辑**:
1. 事务开始
2. 更新resume_main
3. 删除所有work_experiences，插入新的
4. 删除所有education，插入新的
5. 删除所有skills，插入新的
6. 事务提交
7. 返回完整简历数据

### 任务4.6: PDF下载接口
**文件**:
- `hou/routers/resume.py` (续)
- `hou/services/pdf_generator.py`
- `hou/templates/resume.html`

**接口**: `GET /api/resumes/{id}/download`

**流程**:
1. 查询完整简历数据
2. 渲染Jinja2 HTML模板
3. weasyprint转换为PDF
4. 返回application/pdf流

---

## 阶段5: 集成与测试

### 任务5.1: 数据库初始化
**操作**:
1. 确认MySQL数据库已创建
2. 运行SQL创建表 (参考data.md)
3. 配置database.py连接信息

### 任务5.2: 前后端联调
**测试场景**:
1. 首次加载 - 创建默认简历
2. 编辑个人信息 - 实时预览更新
3. 添加工作经历 - 预览同步
4. 保存简历 - 数据持久化
5. 下载PDF - 文件正确生成

### 任务5.3: 样式还原验证
**检查项**:
- [ ] 导航栏样式 (64px高，Logo + 下载按钮)
- [ ] 左侧面板 (610px宽，#F8FAFC背景)
- [ ] 右侧面板 (926px宽，#F1F5F9背景)
- [ ] 卡片样式 (12px圆角，#E2E8F0边框)
- [ ] 输入框样式 (8px圆角，44px高)
- [ ] 按钮样式 (#3B82F6主色，8px圆角)
- [ ] A4预览 (595x842px，深色头部)

---

## 执行顺序

### 第一批: 前端初始化 (任务1.1-1.4)
- 创建项目结构
- 配置依赖
- 设置全局样式

### 第二批: 前端组件 (任务2.1-2.7)
- App.vue (根组件)
- ResumeEditor.vue
- 4个卡片组件
- ResumePreview.vue

### 第三批: 后端初始化 (任务3.1-3.4)
- 创建项目结构
- 数据库模型
- Pydantic Schema
- FastAPI入口

### 第四批: 后端接口 (任务4.1-4.6)
- CRUD接口
- 子资源接口
- 完整保存接口
- PDF下载接口

### 第五批: 集成测试 (任务5.1-5.3)
- 数据库初始化
- 前后端联调
- 样式验证

---

## 文件清单

### 前端 (qian/)
```
qian/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js
    ├── App.vue
    ├── api/
    │   └── resume.js
    ├── components/
    │   ├── ResumeEditor.vue
    │   ├── ResumePreview.vue
    │   ├── PersonalCard.vue
    │   ├── WorkCard.vue
    │   ├── EducationCard.vue
    │   └── SkillsCard.vue
    └── styles/
        └── global.css
```

### 后端 (hou/)
```
hou/
├── main.py
├── requirements.txt
├── config.py
├── database.py
├── models/
│   └── resume.py
├── schemas/
│   └── resume.py
├── routers/
│   └── resume.py
├── services/
│   ├── resume.py
│   └── pdf_generator.py
└── templates/
    └── resume.html
```

---

## 注意事项

1. **数据库**: 使用已存在的表结构，不重新创建
2. **用户ID**: 默认使用user_id=1
3. **日期格式**: 前端使用字符串，后端转换为date类型
4. **空值处理**: 子数据为空数组时不显示对应区域
5. **错误处理**: 使用try/catch，显示用户友好提示
6. **CORS**: 后端允许前端localhost:5173访问

---

## 完成标准

- [ ] 前端可启动 (npm run dev)
- [ ] 后端可启动 (uvicorn main:app --reload)
- [ ] 编辑表单实时更新预览
- [ ] 保存按钮成功写入数据库
- [ ] 下载按钮生成正确PDF
- [ ] 样式与pencil-new.pen设计一致
