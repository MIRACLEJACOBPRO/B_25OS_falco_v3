#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - Main Application
主应用程序入口，基于FastAPI构建的后端服务
"""

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys
import os
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config_simple import settings
from app.routers import auth, monitor, status, dashboard, websocket_test, intelligence, ai_analysis, graph
from app.services.websocket_service import websocket_service
from app.routes import websocket_routes
from app.services.simple_websocket import simple_websocket_service

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/falco-ai-security/app.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# 创建FastAPI应用实例
app = FastAPI(
    title="Falco AI Security System",
    description="基于Falco的实时安全监控与AI响应系统API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境中应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 集成WebSocket服务
app = websocket_service.get_asgi_app(app)

# 注册路由
app.include_router(auth.router, prefix="/api")
app.include_router(monitor.router, prefix="/api")
app.include_router(status.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(intelligence.router, prefix="/api")
app.include_router(ai_analysis.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(websocket_test.router, prefix="/api")
app.include_router(websocket_routes.router, prefix="/api", tags=["websocket"])

# 全局异常处理器
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "timestamp": datetime.now().isoformat()}
    )

# 健康检查端点
@app.get("/health")
async def health_check():
    """系统健康检查"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "services": {
            "falco_monitor": "running",
            "neo4j": "connected",
            "pinecone": "connected",
            "openai": "available"
        }
    }

# 系统信息端点
@app.get("/info")
async def system_info():
    """获取系统信息"""
    return {
        "name": "Falco AI Security System",
        "version": "1.0.0",
        "description": "基于Falco的实时安全监控与AI响应系统",
        "author": "AI Development Team",
        "environment": settings.ENVIRONMENT,
        "debug_mode": settings.DEBUG
    }

# API路由组
@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "Welcome to Falco AI Security System",
        "docs": "/docs",
        "health": "/health",
        "info": "/info"
    }

# 启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    logger.info("Falco AI Security System is starting up...")
    
    # 创建必要的日志目录
    os.makedirs('/var/log/falco-ai-security', exist_ok=True)
    
    # 启动WebSocket后台任务
    try:
        await websocket_service.start_background_tasks()
    except Exception as e:
        logger.warning(f"Socket.IO WebSocket服务启动失败: {e}")
    
    # 启动简化WebSocket服务后台任务
    await simple_websocket_service.start_background_tasks()
    
    # 初始化各个服务连接
    # TODO: 初始化Neo4j连接
    # TODO: 初始化Pinecone连接
    # TODO: 初始化OpenAI客户端
    # TODO: 启动Falco日志监控服务
    
    logger.info("Falco AI Security System started successfully")

# 关闭事件
@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行"""
    logger.info("Falco AI Security System is shutting down...")
    
    # 停止WebSocket后台任务
    await simple_websocket_service.stop_background_tasks()
    
    # 清理资源
    # TODO: 关闭数据库连接
    # TODO: 停止监控服务
    
    logger.info("Falco AI Security System shutdown complete")

if __name__ == "__main__":
    # 开发环境直接运行
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )