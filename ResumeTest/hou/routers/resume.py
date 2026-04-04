from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from io import BytesIO

from database import get_db
from schemas.resume import (
    ResumeCreate,
    ResumeUpdate,
    ResumeResponse,
    ResumeListItem,
    ResumeFullSave,
    WorkExperienceCreate,
    WorkExperienceUpdate,
    WorkExperienceResponse,
    EducationCreate,
    EducationUpdate,
    EducationResponse,
    SkillCreate,
    SkillResponse,
)
from services.resume import ResumeService
from services.pdf_generator import generate_pdf

router = APIRouter()


# ==================== 简历CRUD接口 ====================


@router.post("/resumes", response_model=ResumeResponse, summary="创建简历")
async def create_resume(data: ResumeCreate, db: Session = Depends(get_db)):
    """创建新简历"""
    try:
        resume = ResumeService.create_resume(db, data)
        return ResumeService.get_resume_full(db, resume.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建简历失败: {str(e)}")


@router.get("/resumes", response_model=List[ResumeListItem], summary="获取简历列表")
async def get_resume_list(
    user_id: int = Query(1, description="用户ID"), db: Session = Depends(get_db)
):
    """获取用户的简历列表"""
    try:
        return ResumeService.get_resume_list(db, user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取列表失败: {str(e)}")


@router.get(
    "/resumes/{resume_id}", response_model=ResumeResponse, summary="获取简历详情"
)
async def get_resume(resume_id: int, db: Session = Depends(get_db)):
    """获取简历的完整信息（包含所有子数据）"""
    try:
        resume = ResumeService.get_resume_full(db, resume_id)
        if not resume:
            raise HTTPException(status_code=404, detail="简历不存在")
        return resume
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取简历失败: {str(e)}")


@router.put(
    "/resumes/{resume_id}", response_model=ResumeResponse, summary="更新简历基本信息"
)
async def update_resume(
    resume_id: int, data: ResumeUpdate, db: Session = Depends(get_db)
):
    """更新简历的基本信息"""
    try:
        resume = ResumeService.update_resume(db, resume_id, data)
        if not resume:
            raise HTTPException(status_code=404, detail="简历不存在")
        return ResumeService.get_resume_full(db, resume_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新简历失败: {str(e)}")


@router.delete("/resumes/{resume_id}", summary="删除简历")
async def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    """删除简历及其所有关联数据"""
    try:
        success = ResumeService.delete_resume(db, resume_id)
        if not success:
            raise HTTPException(status_code=404, detail="简历不存在")
        return {"message": "删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除简历失败: {str(e)}")


# ==================== 完整保存接口 ====================


@router.post(
    "/resumes/{resume_id}/save", response_model=ResumeResponse, summary="完整保存简历"
)
async def save_resume_full(
    resume_id: int, data: ResumeFullSave, db: Session = Depends(get_db)
):
    """
    完整保存简历（更新主表+替换所有子表）
    使用事务处理，确保数据一致性
    """
    try:
        result = ResumeService.save_resume_full(db, resume_id, data)
        if not result:
            raise HTTPException(status_code=404, detail="简历不存在")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存简历失败: {str(e)}")


# ==================== PDF下载接口 ====================


@router.get("/resumes/{resume_id}/download", summary="下载简历PDF")
async def download_resume_pdf(resume_id: int, db: Session = Depends(get_db)):
    """生成并下载简历PDF文件"""
    # 获取完整简历数据
    resume = ResumeService.get_resume_full(db, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    # 生成PDF
    pdf_buffer = generate_pdf(resume)
    pdf_content = pdf_buffer.getvalue()

    # 使用StreamingResponse返回PDF流
    def iterfile():
        yield pdf_content

    # 对中文文件名进行 RFC 5987 编码
    from urllib.parse import quote

    name = resume.get("name", "简历") or "简历"
    encoded_name = quote(f"{name}.pdf", safe="")
    content_disposition = (
        f"attachment; filename=\"resume.pdf\"; filename*=UTF-8''{encoded_name}"
    )

    return StreamingResponse(
        iterfile(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": content_disposition,
            "Content-Length": str(len(pdf_content)),
        },
    )


# ==================== 工作经历接口 ====================


@router.post(
    "/resumes/{resume_id}/work-experiences",
    response_model=WorkExperienceResponse,
    summary="添加工作经历",
)
async def add_work_experience(
    resume_id: int, data: WorkExperienceCreate, db: Session = Depends(get_db)
):
    """为简历添加工作经历"""
    try:
        exp = ResumeService.add_work_experience(db, resume_id, data)
        if not exp:
            raise HTTPException(status_code=404, detail="简历不存在")
        return exp
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"添加工作经历失败: {str(e)}")


@router.put(
    "/resumes/{resume_id}/work-experiences/{exp_id}",
    response_model=WorkExperienceResponse,
    summary="更新工作经历",
)
async def update_work_experience(
    resume_id: int,
    exp_id: int,
    data: WorkExperienceUpdate,
    db: Session = Depends(get_db),
):
    """更新工作经历"""
    try:
        exp = ResumeService.update_work_experience(db, resume_id, exp_id, data)
        if not exp:
            raise HTTPException(status_code=404, detail="工作经历不存在")
        return exp
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新工作经历失败: {str(e)}")


@router.delete("/resumes/{resume_id}/work-experiences/{exp_id}", summary="删除工作经历")
async def delete_work_experience(
    resume_id: int, exp_id: int, db: Session = Depends(get_db)
):
    """删除工作经历"""
    try:
        success = ResumeService.delete_work_experience(db, resume_id, exp_id)
        if not success:
            raise HTTPException(status_code=404, detail="工作经历不存在")
        return {"message": "删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除工作经历失败: {str(e)}")


# ==================== 教育背景接口 ====================


@router.post(
    "/resumes/{resume_id}/education",
    response_model=EducationResponse,
    summary="添加教育背景",
)
async def add_education(
    resume_id: int, data: EducationCreate, db: Session = Depends(get_db)
):
    """为简历添加教育背景"""
    try:
        edu = ResumeService.add_education(db, resume_id, data)
        if not edu:
            raise HTTPException(status_code=404, detail="简历不存在")
        return edu
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"添加教育背景失败: {str(e)}")


@router.put(
    "/resumes/{resume_id}/education/{edu_id}",
    response_model=EducationResponse,
    summary="更新教育背景",
)
async def update_education(
    resume_id: int, edu_id: int, data: EducationUpdate, db: Session = Depends(get_db)
):
    """更新教育背景"""
    try:
        edu = ResumeService.update_education(db, resume_id, edu_id, data)
        if not edu:
            raise HTTPException(status_code=404, detail="教育背景不存在")
        return edu
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新教育背景失败: {str(e)}")


@router.delete("/resumes/{resume_id}/education/{edu_id}", summary="删除教育背景")
async def delete_education(resume_id: int, edu_id: int, db: Session = Depends(get_db)):
    """删除教育背景"""
    try:
        success = ResumeService.delete_education(db, resume_id, edu_id)
        if not success:
            raise HTTPException(status_code=404, detail="教育背景不存在")
        return {"message": "删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除教育背景失败: {str(e)}")


# ==================== 技能标签接口 ====================


@router.post(
    "/resumes/{resume_id}/skills", response_model=SkillResponse, summary="添加技能"
)
async def add_skill(resume_id: int, data: SkillCreate, db: Session = Depends(get_db)):
    """为简历添加技能标签"""
    try:
        skill = ResumeService.add_skill(db, resume_id, data)
        if not skill:
            raise HTTPException(status_code=404, detail="简历不存在")
        return skill
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"添加技能失败: {str(e)}")


@router.delete("/resumes/{resume_id}/skills/{skill_id}", summary="删除技能")
async def delete_skill(resume_id: int, skill_id: int, db: Session = Depends(get_db)):
    """删除技能标签"""
    try:
        success = ResumeService.delete_skill(db, resume_id, skill_id)
        if not success:
            raise HTTPException(status_code=404, detail="技能不存在")
        return {"message": "删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除技能失败: {str(e)}")
