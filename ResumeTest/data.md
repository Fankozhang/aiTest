# 简历数据库表结构设计

## 概述

基于简历编辑器设计图，设计以下数据库表结构。每个简历包含个人信息、工作经历、教育背景和技能标签四个主要部分。

## 表结构

### 1. 简历主表 (resume_main)

存储简历的基本信息和个人资料。

```sql
CREATE TABLE resume_main (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '简历ID',
    user_id BIGINT NOT NULL COMMENT '用户ID（关联用户表）',
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    title VARCHAR(100) COMMENT '职位',
    email VARCHAR(100) COMMENT '邮箱',
    phone VARCHAR(20) COMMENT '电话',
    age INT COMMENT '年龄',
    work_years INT COMMENT '工作年限',
    summary TEXT COMMENT '个人简介',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='简历主表';
```

### 2. 工作经历表 (resume_work_experiences)

存储工作经历信息，与简历主表为一对多关系。

```sql
CREATE TABLE resume_work_experiences (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '工作经历ID',
    resume_id BIGINT NOT NULL COMMENT '简历ID',
    company VARCHAR(100) NOT NULL COMMENT '公司名称',
    position VARCHAR(100) COMMENT '职位',
    start_date DATE COMMENT '开始日期',
    end_date DATE COMMENT '结束日期（NULL表示至今）',
    description TEXT COMMENT '工作描述',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    INDEX idx_resume_id (resume_id),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作经历表';
```

### 3. 教育背景表 (resume_education)

存储教育背景信息，与简历主表为一对多关系。

```sql
CREATE TABLE resume_education (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '教育经历ID',
    resume_id BIGINT NOT NULL COMMENT '简历ID',
    school VARCHAR(100) NOT NULL COMMENT '学校名称',
    degree VARCHAR(50) COMMENT '学历（如：本科、硕士、博士）',
    major VARCHAR(100) COMMENT '专业',
    start_date DATE COMMENT '开始日期',
    end_date DATE COMMENT '结束日期',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    INDEX idx_resume_id (resume_id),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='教育背景表';
```

### 4. 技能标签表 (resume_skills)

存储技能标签信息，与简历主表为一对多关系。

```sql
CREATE TABLE resume_skills (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '技能ID',
    resume_id BIGINT NOT NULL COMMENT '简历ID',
    skill_name VARCHAR(50) NOT NULL COMMENT '技能名称',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    INDEX idx_resume_id (resume_id),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技能标签表';
```

## 表关系

```
resume_main (1) ──┬── (N) resume_work_experiences
                  ├── (N) resume_education
                  └── (N) resume_skills
```

## 设计说明

1. **主键设计**：所有表使用BIGINT自增主键，支持大数据量
2. **逻辑关联**：子表通过resume_id字段与主表建立逻辑关联，不使用外键约束
3. **排序支持**：所有子表包含sort_order字段，支持自定义排序
4. **时间字段**：包含created_at和updated_at，便于数据追踪
5. **索引优化**：在常用查询字段上建立索引，提高查询性能
6. **字符集**：使用utf8mb4支持emoji和特殊字符
7. **数据完整性**：应用层保证数据一致性，删除简历时需手动删除关联数据

## 示例数据

```sql
-- 插入简历主表数据
INSERT INTO resume_main (user_id, name, title, email, phone, age, work_years, summary) VALUES
(1, '张三', '高级前端开发工程师', 'zhangsan@email.com', '+86 138-0000-0000', 28, 5, '拥有5年以上前端开发经验，精通现代JavaScript框架，具备良好的架构设计能力和团队协作精神。专注于构建高性能、可扩展的Web应用。');

-- 插入工作经历数据
INSERT INTO resume_work_experiences (resume_id, company, position, start_date, end_date, description, sort_order) VALUES
(1, '阿里巴巴集团', '高级前端工程师', '2021-06-01', NULL, '• 负责公司核心业务前端架构设计与技术选型\n• 主导微前端架构升级，提升团队开发效率40%\n• 优化首屏加载性能，LCP指标提升60%', 1);

-- 插入教育背景数据
INSERT INTO resume_education (resume_id, school, degree, major, start_date, end_date, sort_order) VALUES
(1, '北京大学', '本科', '计算机科学与技术', '2017-09-01', '2021-06-30', 1);

-- 插入技能标签数据
INSERT INTO resume_skills (resume_id, skill_name, sort_order) VALUES
(1, 'JavaScript', 1),
(1, 'Vue.js', 2),
(1, 'React', 3),
(1, 'TypeScript', 4),
(1, 'Node.js', 5),
(1, 'CSS', 6);
```

## 扩展考虑

1. **用户系统**：可添加用户表，实现多用户简历管理
2. **简历模板**：可添加模板表，支持多种简历样式
3. **版本控制**：可添加版本表，支持简历历史版本管理
4. **导出记录**：可添加导出记录表，追踪PDF导出历史
