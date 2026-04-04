from sqlalchemy import Column, Integer, String, Text, Date, DateTime, func
from database import Base


class ResumeMain(Base):
    """简历主表模型"""

    __tablename__ = "resume_main"

    id = Column(Integer, primary_key=True, comment="简历ID")
    user_id = Column(Integer, nullable=False, index=True, comment="用户ID")
    name = Column(String(50), nullable=False, comment="姓名")
    title = Column(String(100), comment="职位")
    email = Column(String(100), comment="邮箱")
    phone = Column(String(20), comment="电话")
    age = Column(Integer, comment="年龄")
    work_years = Column(Integer, comment="工作年限")
    summary = Column(Text, comment="个人简介")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间"
    )

    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "title": self.title,
            "email": self.email,
            "phone": self.phone,
            "age": self.age,
            "work_years": self.work_years,
            "summary": self.summary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class WorkExperience(Base):
    """工作经历表模型"""

    __tablename__ = "resume_work_experiences"

    id = Column(Integer, primary_key=True, comment="工作经历ID")
    resume_id = Column(Integer, nullable=False, index=True, comment="简历ID")
    company = Column(String(100), nullable=False, comment="公司名称")
    position = Column(String(100), comment="职位")
    start_date = Column(Date, comment="开始日期")
    end_date = Column(Date, comment="结束日期")
    description = Column(Text, comment="工作描述")
    sort_order = Column(Integer, default=0, comment="排序顺序")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")

    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "resume_id": self.resume_id,
            "company": self.company,
            "position": self.position,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "description": self.description,
            "sort_order": self.sort_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Education(Base):
    """教育背景表模型"""

    __tablename__ = "resume_education"

    id = Column(Integer, primary_key=True, comment="教育经历ID")
    resume_id = Column(Integer, nullable=False, index=True, comment="简历ID")
    school = Column(String(100), nullable=False, comment="学校名称")
    degree = Column(String(50), comment="学历")
    major = Column(String(100), comment="专业")
    start_date = Column(Date, comment="开始日期")
    end_date = Column(Date, comment="结束日期")
    sort_order = Column(Integer, default=0, comment="排序顺序")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")

    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "resume_id": self.resume_id,
            "school": self.school,
            "degree": self.degree,
            "major": self.major,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "sort_order": self.sort_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Skill(Base):
    """技能标签表模型"""

    __tablename__ = "resume_skills"

    id = Column(Integer, primary_key=True, comment="技能ID")
    resume_id = Column(Integer, nullable=False, index=True, comment="简历ID")
    skill_name = Column(String(50), nullable=False, comment="技能名称")
    sort_order = Column(Integer, default=0, comment="排序顺序")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")

    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "resume_id": self.resume_id,
            "skill_name": self.skill_name,
            "sort_order": self.sort_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
