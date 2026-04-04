from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import init_db
from routers import resume

# 创建FastAPI应用
app = FastAPI(
    title="简历编辑器API", version="1.0.0", description="简历编辑器后端接口服务"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(resume.router, prefix="/api", tags=["简历管理"])


# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500, content={"detail": f"服务器内部错误: {str(exc)}"}
    )


# 健康检查接口
@app.get("/", tags=["系统"])
async def root():
    return {
        "message": "简历编辑器API服务运行中",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["系统"])
async def health_check():
    return {"status": "healthy"}


# 启动事件
@app.on_event("startup")
async def startup_event():
    # 初始化数据库（创建表）
    init_db()
    print("=" * 50)
    print("简历编辑器API服务启动成功")
    print(f"API文档地址: http://localhost:8000/docs")
    print("数据库: SQLite (resume.db)")
    print("=" * 50)


# 关闭事件
@app.on_event("shutdown")
async def shutdown_event():
    print("简历编辑器API服务已关闭")
