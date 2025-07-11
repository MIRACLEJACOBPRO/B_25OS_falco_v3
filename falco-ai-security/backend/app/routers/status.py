#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - Status Router
系统状态相关API路由
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from datetime import datetime
import logging
import psutil
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/status", tags=["status"])

def check_service_status(service_name: str) -> Dict[str, Any]:
    """检查服务状态"""
    import subprocess
    
    try:
        if service_name == "falco":
            # 检查Falco服务的实际状态
            result = subprocess.run(
                ["systemctl", "is-active", "falco-modern-bpf"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0 and result.stdout.strip() == "active":
                return {
                    "status": "running",
                    "port": 8765,  # Falco health webserver port
                    "health": "healthy",
                    "service_name": "falco-modern-bpf"
                }
            else:
                return {
                    "status": "stopped",
                    "port": None,
                    "health": "unhealthy",
                    "reason": "Service not active"
                }
        
        # 对于其他服务，保持原有的模拟状态
        services_status = {
            "neo4j": {"status": "running", "port": 7687, "health": "healthy"},
            "redis": {"status": "running", "port": 6379, "health": "healthy"},
            "nginx": {"status": "running", "port": 80, "health": "healthy"}
        }
        
        return services_status.get(service_name, {"status": "unknown", "health": "unknown"})
        
    except Exception as e:
        logger.error(f"Error checking service status for {service_name}: {str(e)}")
        return {"status": "unknown", "health": "unknown", "error": str(e)}

def get_system_resources() -> Dict[str, Any]:
    """获取系统资源使用情况"""
    try:
        # CPU使用率
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # 内存使用情况
        memory = psutil.virtual_memory()
        
        # 磁盘使用情况
        disk = psutil.disk_usage('/')
        
        # 网络统计
        network = psutil.net_io_counters()
        
        return {
            "cpu": {
                "usage_percent": cpu_percent,
                "cores": psutil.cpu_count()
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "usage_percent": memory.percent
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "usage_percent": (disk.used / disk.total) * 100
            },
            "network": {
                "bytes_sent": network.bytes_sent,
                "bytes_recv": network.bytes_recv,
                "packets_sent": network.packets_sent,
                "packets_recv": network.packets_recv
            }
        }
    except Exception as e:
        logger.error(f"Error getting system resources: {str(e)}")
        return {}

@router.get("/")
async def get_system_status():
    """获取系统整体状态"""
    try:
        # 检查各个服务状态
        services = {
            "neo4j": check_service_status("neo4j"),
            "redis": check_service_status("redis"),
            "falco": check_service_status("falco"),
            "nginx": check_service_status("nginx")
        }
        
        # 获取系统资源
        resources = get_system_resources()
        
        # 计算整体健康状态
        healthy_services = sum(1 for s in services.values() if s.get("health") == "healthy")
        total_services = len([s for s in services.values() if s.get("status") != "disabled"])
        
        overall_health = "healthy" if healthy_services == total_services else "degraded"
        if healthy_services == 0:
            overall_health = "critical"
        
        # 构建前端期望的数据格式
        status_data = {
            "timestamp": datetime.now().isoformat(),
            "overall_health": overall_health,
            "services": services,
            "resources": resources,
            "uptime": {
                "seconds": int(datetime.now().timestamp() - psutil.boot_time()),
                "formatted": str(datetime.now() - datetime.fromtimestamp(psutil.boot_time()))
            },
            "version": "1.0.0",
            "environment": os.getenv("ENVIRONMENT", "development"),
            # 添加前端SystemStatus组件期望的字段
            "falco": services["falco"]["status"],
            "ai": "running",  # AI分析服务状态
            "database": services["neo4j"]["status"],
            "queue": services["redis"]["status"],
            "web": services["nginx"]["status"]
        }
        
        logger.info("System status retrieved successfully")
        return {
            "success": True,
            "data": status_data
        }
        
    except Exception as e:
        logger.error(f"Error getting system status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get system status")

@router.get("/health")
async def health_check():
    """简单的健康检查"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "falco-ai-security-backend"
    }

@router.get("/services")
async def get_services_status():
    """获取所有服务状态"""
    try:
        services = {
            "backend": {"status": "running", "health": "healthy", "port": 8000},
            "frontend": {"status": "running", "health": "healthy", "port": 3000},
            "neo4j": check_service_status("neo4j"),
            "redis": check_service_status("redis"),
            "falco": check_service_status("falco"),
            "nginx": check_service_status("nginx")
        }
        
        logger.info("Services status retrieved successfully")
        return {
            "success": True,
            "data": services,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting services status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get services status")

@router.get("/resources")
async def get_resources():
    """获取系统资源使用情况"""
    try:
        resources = get_system_resources()
        
        logger.info("System resources retrieved successfully")
        return {
            "success": True,
            "data": resources,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting system resources: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get system resources")