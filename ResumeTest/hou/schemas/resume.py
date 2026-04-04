from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date

# ==================== 请求模型 ====================


class ResumeCreate(BaseModel):
    """创建简历请求"""

    user_id: int = 1
    name: str = Field(..., min_length=1, max_length=50, description="姓名")
    title: Optional[str] = Field(None, max_length=100, description="职位")
    email: Optional[str] = Field(None, max_length=100, description="邮箱")
    phone: Optional[str] = Field(None, max_length=20, description="电话")
    age: Optional[int] = Field(None, ge=1, le=100, description="年龄")
    work_years: Optional[int] = Field(None, ge=0, le=50, description="工作年限")
    summary: Optional[str] = Field(None, description="个人简介")


class ResumeUpdate(BaseModel):
    """更新简历基本信息请求"""

    name: Optional[str] = Field(None, min_length=1, max_length=50, description="姓名")
    title: Optional[str] = Field(None, max_length=100, description="职位")
    email: Optional[str] = Field(None, max_length=100, description="邮箱")
    phone: Optional[str] = Field(None, max_length=20, description="电话")
    age: Optional[int] = Field(None, ge=1, le=100, description="年龄")
    work_years: Optional[int] = Field(None, ge=0, le=50, description="工作年限")
    summary: Optional[str] = Field(None, description="个人简介")


class WorkExperienceCreate(BaseModel):
    """创建工作经历请求"""

    company: str = Field(..., min_length=1, max_length=100, description="公司名称")
    position: Optional[str] = Field(None, max_length=100, description="职位")
    start_date: Optional[date] = Field(None, description="开始日期")
    end_date: Optional[date] = Field(None, description="结束日期")
    description: Optional[str] = Field(None, description="工作描述")
    sort_order: Optional[int] = Field(0, description="排序顺序")


class WorkExperienceUpdate(BaseModel):
    """更新工作经历请求"""

    company: Optional[str] = Field(
        None, min_length=1, max_length=100, description="公司名称"
    )
    position: Optional[str] = Field(None, max_length=100, description="职位")
    start_date: Optional[date] = Field(None, description="开始日期")
    end_date: Optional[date] = Field(None, description="结束日期")
    description: Optional[str] = Field(None, description="工作描述")
    sort_order: Optional[int] = Field(None, description="排序顺序")


class EducationCreate(BaseModel):
    """创建教育背景请求"""

    school: str = Field(..., min_length=1, max_length=100, description="学校名称")
    degree: Optional[str] = Field(None, max_length=50, description="学历")
    major: Optional[str] = Field(None, max_length=100, description="专业")
    start_date: Optional[date] = Field(None, description="开始日期")
    end_date: Optional[date] = Field(None, description="结束日期")
    sort_order: Optional[int] = Field(0, description="排序顺序")


class EducationUpdate(BaseModel):
    """更新教育背景请求"""

    school: Optional[str] = Field(
        None, min_length=1, max_length=100, description="学校名称"
    )
    degree: Optional[str] = Field(None, max_length=50, description="学历")
    major: Optional[str] = Field(None, max_length=100, description="专业")
    start_date: Optional[date] = Field(None, description="开始日期")
    end_date: Optional[date] = Field(None, description="结束日期")
    sort_order: Optional[int] = Field(None, description="排序顺序")


class SkillCreate(BaseModel):
    """创建技能标签请求"""

    skill_name: str = Field(..., min_length=1, max_length=50, description="技能名称")
    sort_order: Optional[int] = Field(0, description="排序顺序")


# ==================== 响应模型 ====================


class WorkExperienceResponse(WorkExperienceCreate):
    """工作经历响应"""

    id: int
    resume_id: int
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class EducationResponse(EducationCreate):
    """教育背景响应"""

    id: int
    resume_id: int
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class SkillResponse(SkillCreate):
    """技能标签响应"""

    id: int
    resume_id: int
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class ResumeResponse(ResumeCreate):
    """完整简历响应（包含所有子数据）"""

    id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    work_experiences: List[WorkExperienceResponse] = []
    education: List[EducationResponse] = []
    skills: List[SkillResponse] = []

    class Config:
        from_attributes = True


class ResumeListItem(BaseModel):
    """简历列表项响应"""

    id: int
    name: str
    title: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== 完整保存请求模型 ====================


class ResumeFullSave(BaseModel):
    """完整保存简历请求（更新主表+替换所有子表）"""

    name: str = Field(..., min_length=1, max_length=50, description="姓名")
    title: Optional[str] = Field(None, max_length=100, description="职位")
    email: Optional[str] = Field(None, max_length=100, description="邮箱")
    phone: Optional[str] = Field(None, max_length=20, description="电话")
    age: Optional[int] = Field(None, ge=1, le=100, description="年龄")
    work_years: Optional[int] = Field(None, ge=0, le=50, description="工作年限")
    summary: Optional[str] = Field(None, description="个人简介")
    work_experiences: List[WorkExperienceCreate] = []
    education: List[EducationCreate] = []
    skills: List[SkillCreate] = []
