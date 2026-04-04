from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional

from models.resume import ResumeMain, WorkExperience, Education, Skill
from schemas.resume import (
    ResumeCreate,
    ResumeUpdate,
    ResumeFullSave,
    WorkExperienceCreate,
    WorkExperienceUpdate,
    EducationCreate,
    EducationUpdate,
    SkillCreate,
)


class ResumeService:
    """简历服务类"""

    @staticmethod
    def create_resume(db: Session, data: ResumeCreate) -> ResumeMain:
        """创建简历"""
        resume = ResumeMain(
            user_id=data.user_id,
            name=data.name,
            title=data.title,
            email=data.email,
            phone=data.phone,
            age=data.age,
            work_years=data.work_years,
            summary=data.summary,
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
        return resume

    @staticmethod
    def get_resume(db: Session, resume_id: int) -> Optional[ResumeMain]:
        """获取简历基本信息"""
        return db.query(ResumeMain).filter(ResumeMain.id == resume_id).first()

    @staticmethod
    def get_resume_full(db: Session, resume_id: int) -> Optional[dict]:
        """获取完整简历信息（包含所有子数据）"""
        resume = db.query(ResumeMain).filter(ResumeMain.id == resume_id).first()
        if not resume:
            return None

        # 获取子数据
        work_experiences = (
            db.query(WorkExperience)
            .filter(WorkExperience.resume_id == resume_id)
            .order_by(WorkExperience.sort_order, WorkExperience.id)
            .all()
        )

        education = (
            db.query(Education)
            .filter(Education.resume_id == resume_id)
            .order_by(Education.sort_order, Education.id)
            .all()
        )

        skills = (
            db.query(Skill)
            .filter(Skill.resume_id == resume_id)
            .order_by(Skill.sort_order, Skill.id)
            .all()
        )

        # 组装完整数据
        result = resume.to_dict()
        result["work_experiences"] = [exp.to_dict() for exp in work_experiences]
        result["education"] = [edu.to_dict() for edu in education]
        result["skills"] = [skill.to_dict() for skill in skills]

        return result

    @staticmethod
    def get_resume_list(db: Session, user_id: int = 1) -> List[dict]:
        """获取用户的简历列表"""
        resumes = (
            db.query(ResumeMain)
            .filter(ResumeMain.user_id == user_id)
            .order_by(ResumeMain.updated_at.desc())
            .all()
        )

        return [
            {
                "id": r.id,
                "name": r.name,
                "title": r.title,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in resumes
        ]

    @staticmethod
    def update_resume(
        db: Session, resume_id: int, data: ResumeUpdate
    ) -> Optional[ResumeMain]:
        """更新简历基本信息"""
        resume = db.query(ResumeMain).filter(ResumeMain.id == resume_id).first()
        if not resume:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(resume, field, value)

        db.commit()
        db.refresh(resume)
        return resume

    @staticmethod
    def delete_resume(db: Session, resume_id: int) -> bool:
        """删除简历及其所有关联数据"""
        resume = db.query(ResumeMain).filter(ResumeMain.id == resume_id).first()
        if not resume:
            return False

        # 级联删除子数据
        db.query(WorkExperience).filter(WorkExperience.resume_id == resume_id).delete()
        db.query(Education).filter(Education.resume_id == resume_id).delete()
        db.query(Skill).filter(Skill.resume_id == resume_id).delete()
        db.delete(resume)

        db.commit()
        return True

    @staticmethod
    def save_resume_full(
        db: Session, resume_id: int, data: ResumeFullSave
    ) -> Optional[dict]:
        """
        完整保存简历（事务处理）
        1. 更新resume_main
        2. 删除所有work_experiences，插入新的
        3. 删除所有education，插入新的
        4. 删除所有skills，插入新的
        """
        try:
            # 开始事务
            # 1. 更新主表
            resume = db.query(ResumeMain).filter(ResumeMain.id == resume_id).first()
            if not resume:
                return None

            resume.name = data.name
            resume.title = data.title
            resume.email = data.email
            resume.phone = data.phone
            resume.age = data.age
            resume.work_years = data.work_years
            resume.summary = data.summary

            # 2. 删除并替换工作经历
            db.query(WorkExperience).filter(
                WorkExperience.resume_id == resume_id
            ).delete()
            for i, exp_data in enumerate(data.work_experiences):
                exp = WorkExperience(
                    resume_id=resume_id,
                    company=exp_data.company,
                    position=exp_data.position,
                    start_date=exp_data.start_date,
                    end_date=exp_data.end_date,
                    description=exp_data.description,
                    sort_order=i,
                )
                db.add(exp)

            # 3. 删除并替换教育背景
            db.query(Education).filter(Education.resume_id == resume_id).delete()
            for i, edu_data in enumerate(data.education):
                edu = Education(
                    resume_id=resume_id,
                    school=edu_data.school,
                    degree=edu_data.degree,
                    major=edu_data.major,
                    start_date=edu_data.start_date,
                    end_date=edu_data.end_date,
                    sort_order=i,
                )
                db.add(edu)

            # 4. 删除并替换技能标签
            db.query(Skill).filter(Skill.resume_id == resume_id).delete()
            for i, skill_data in enumerate(data.skills):
                skill = Skill(
                    resume_id=resume_id, skill_name=skill_data.skill_name, sort_order=i
                )
                db.add(skill)

            # 提交事务
            db.commit()

            # 返回完整数据
            return ResumeService.get_resume_full(db, resume_id)

        except Exception as e:
            db.rollback()
            raise e

    # ==================== 工作经历操作 ====================

    @staticmethod
    def add_work_experience(
        db: Session, resume_id: int, data: WorkExperienceCreate
    ) -> Optional[WorkExperience]:
        """添加工作经历"""
        # 检查简历是否存在
        resume = db.query(ResumeMain).filter(ResumeMain.id == resume_id).first()
        if not resume:
            return None

        exp = WorkExperience(
            resume_id=resume_id,
            company=data.company,
            position=data.position,
            start_date=data.start_date,
            end_date=data.end_date,
            description=data.description,
            sort_order=data.sort_order,
        )
        db.add(exp)
        db.commit()
        db.refresh(exp)
        return exp

    @staticmethod
    def update_work_experience(
        db: Session, resume_id: int, exp_id: int, data: WorkExperienceUpdate
    ) -> Optional[WorkExperience]:
        """更新工作经历"""
        exp = (
            db.query(WorkExperience)
            .filter(
                and_(WorkExperience.id == exp_id, WorkExperience.resume_id == resume_id)
            )
            .first()
        )
        if not exp:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(exp, field, value)

        db.commit()
        db.refresh(exp)
        return exp

    @staticmethod
    def delete_work_experience(db: Session, resume_id: int, exp_id: int) -> bool:
        """删除工作经历"""
        exp = (
            db.query(WorkExperience)
            .filter(
                and_(WorkExperience.id == exp_id, WorkExperience.resume_id == resume_id)
            )
            .first()
        )
        if not exp:
            return False

        db.delete(exp)
        db.commit()
        return True

    # ==================== 教育背景操作 ====================

    @staticmethod
    def add_education(
        db: Session, resume_id: int, data: EducationCreate
    ) -> Optional[Education]:
        """添加教育背景"""
        resume = db.query(ResumeMain).filter(ResumeMain.id == resume_id).first()
        if not resume:
            return None

        edu = Education(
            resume_id=resume_id,
            school=data.school,
            degree=data.degree,
            major=data.major,
            start_date=data.start_date,
            end_date=data.end_date,
            sort_order=data.sort_order,
        )
        db.add(edu)
        db.commit()
        db.refresh(edu)
        return edu

    @staticmethod
    def update_education(
        db: Session, resume_id: int, edu_id: int, data: EducationUpdate
    ) -> Optional[Education]:
        """更新教育背景"""
        edu = (
            db.query(Education)
            .filter(and_(Education.id == edu_id, Education.resume_id == resume_id))
            .first()
        )
        if not edu:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(edu, field, value)

        db.commit()
        db.refresh(edu)
        return edu

    @staticmethod
    def delete_education(db: Session, resume_id: int, edu_id: int) -> bool:
        """删除教育背景"""
        edu = (
            db.query(Education)
            .filter(and_(Education.id == edu_id, Education.resume_id == resume_id))
            .first()
        )
        if not edu:
            return False

        db.delete(edu)
        db.commit()
        return True

    # ==================== 技能标签操作 ====================

    @staticmethod
    def add_skill(db: Session, resume_id: int, data: SkillCreate) -> Optional[Skill]:
        """添加技能标签"""
        resume = db.query(ResumeMain).filter(ResumeMain.id == resume_id).first()
        if not resume:
            return None

        skill = Skill(
            resume_id=resume_id, skill_name=data.skill_name, sort_order=data.sort_order
        )
        db.add(skill)
        db.commit()
        db.refresh(skill)
        return skill

    @staticmethod
    def delete_skill(db: Session, resume_id: int, skill_id: int) -> bool:
        """删除技能标签"""
        skill = (
            db.query(Skill)
            .filter(and_(Skill.id == skill_id, Skill.resume_id == resume_id))
            .first()
        )
        if not skill:
            return False

        db.delete(skill)
        db.commit()
        return True
