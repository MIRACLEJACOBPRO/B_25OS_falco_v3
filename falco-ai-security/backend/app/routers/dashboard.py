#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - Dashboard Router
仪表盘相关API路由
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
import random

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

def generate_security_overview():
    """生成安全概览数据"""
    return {
        "total_events": random.randint(100, 1000),
        "critical_alerts": random.randint(0, 5),
        "blocked_threats": random.randint(10, 50),
        "active_connections": random.randint(20, 100),
        "system_health": random.choice(["healthy", "warning", "critical"]),
        "last_scan": (datetime.now() - timedelta(minutes=random.randint(1, 30))).isoformat()
    }

def generate_threat_statistics():
    """生成威胁统计数据"""
    threat_types = [
        "Malware", "Phishing", "Brute Force", "SQL Injection", 
        "XSS", "DDoS", "Privilege Escalation", "Data Exfiltration"
    ]
    
    stats = []
    for threat_type in threat_types:
        stats.append({
            "type": threat_type,
            "count": random.randint(0, 20),
            "blocked": random.randint(0, 15),
            "severity": random.choice(["low", "medium", "high", "critical"])
        })
    
    return stats

def generate_system_performance():
    """生成系统性能数据"""
    return {
        "cpu_usage": round(random.uniform(20, 80), 2),
        "memory_usage": round(random.uniform(30, 70), 2),
        "disk_usage": round(random.uniform(40, 60), 2),
        "network_throughput": {
            "inbound": round(random.uniform(100, 1000), 2),
            "outbound": round(random.uniform(50, 500), 2)
        },
        "response_time": round(random.uniform(50, 200), 2),
        "uptime": "99.9%"
    }

def generate_recent_activities():
    """生成最近活动数据"""
    activities = [
        "User login detected",
        "Security scan completed",
        "Threat blocked",
        "System backup completed",
        "Configuration updated",
        "Alert acknowledged",
        "Incident resolved",
        "Policy updated"
    ]
    
    recent_activities = []
    for i in range(10):
        recent_activities.append({
            "id": f"activity_{i+1}",
            "description": random.choice(activities),
            "timestamp": (datetime.now() - timedelta(minutes=random.randint(1, 120))).isoformat(),
            "type": random.choice(["info", "warning", "success", "error"]),
            "user": f"user_{random.randint(1, 5)}"
        })
    
    return recent_activities

@router.get("/overview")
async def get_dashboard_overview():
    """获取仪表盘概览数据"""
    try:
        overview_data = {
            "security": generate_security_overview(),
            "performance": generate_system_performance(),
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info("Dashboard overview data retrieved successfully")
        return {
            "success": True,
            "data": overview_data
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard overview: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard overview")

@router.get("/threats")
async def get_threat_statistics():
    """获取威胁统计数据"""
    try:
        threat_stats = generate_threat_statistics()
        
        logger.info("Threat statistics retrieved successfully")
        return {
            "success": True,
            "data": threat_stats,
            "total_threats": sum(stat["count"] for stat in threat_stats),
            "total_blocked": sum(stat["blocked"] for stat in threat_stats)
        }
        
    except Exception as e:
        logger.error(f"Error getting threat statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get threat statistics")

@router.get("/activities")
async def get_recent_activities(
    limit: Optional[int] = Query(10, description="返回活动数量限制")
):
    """获取最近活动"""
    try:
        activities = generate_recent_activities()[:limit]
        
        logger.info(f"Retrieved {len(activities)} recent activities")
        return {
            "success": True,
            "data": activities,
            "total": len(activities)
        }
        
    except Exception as e:
        logger.error(f"Error getting recent activities: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get recent activities")

@router.get("/charts")
async def get_chart_data(
    chart_type: Optional[str] = Query("security", description="图表类型: security, performance, threats")
):
    """获取图表数据"""
    try:
        if chart_type == "security":
            # 安全事件趋势数据
            data = []
            for i in range(24):  # 24小时数据
                timestamp = datetime.now() - timedelta(hours=23-i)
                data.append({
                    "time": timestamp.strftime("%H:00"),
                    "events": random.randint(0, 20),
                    "threats": random.randint(0, 10),
                    "blocked": random.randint(0, 8)
                })
        
        elif chart_type == "performance":
            # 系统性能趋势数据
            data = []
            for i in range(24):
                timestamp = datetime.now() - timedelta(hours=23-i)
                data.append({
                    "time": timestamp.strftime("%H:00"),
                    "cpu": round(random.uniform(20, 80), 1),
                    "memory": round(random.uniform(30, 70), 1),
                    "disk": round(random.uniform(40, 60), 1)
                })
        
        elif chart_type == "threats":
            # 威胁类型分布数据
            threat_types = ["Malware", "Phishing", "Brute Force", "SQL Injection", "XSS"]
            data = []
            for threat_type in threat_types:
                data.append({
                    "name": threat_type,
                    "value": random.randint(1, 50),
                    "percentage": round(random.uniform(5, 25), 1)
                })
        
        else:
            data = []
        
        logger.info(f"Chart data retrieved for type: {chart_type}")
        return {
            "success": True,
            "data": data,
            "chart_type": chart_type
        }
        
    except Exception as e:
        logger.error(f"Error getting chart data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get chart data")

@router.get("/summary")
async def get_dashboard_summary():
    """获取仪表盘汇总数据"""
    try:
        summary_data = {
            "overview": generate_security_overview(),
            "performance": generate_system_performance(),
            "threats": generate_threat_statistics()[:5],  # 前5种威胁
            "activities": generate_recent_activities()[:5],  # 最近5个活动
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info("Dashboard summary data retrieved successfully")
        return {
            "success": True,
            "data": summary_data
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard summary")