#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - Monitor Router
监控相关API路由
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
import psutil

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monitor", tags=["monitor"])

# 模拟数据生成函数
# 全局变量用于存储上次网络统计数据
_last_network_stats = None
_last_network_time = None

def get_real_system_metrics():
    """获取真实的系统指标数据"""
    global _last_network_stats, _last_network_time
    
    try:
        now = datetime.now()
        
        # CPU使用率
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # 内存使用情况
        memory = psutil.virtual_memory()
        
        # 磁盘使用情况
        disk = psutil.disk_usage('/')
        
        # 网络统计
        current_network = psutil.net_io_counters()
        current_time = now.timestamp()
        
        # 计算网络速率 (MB/s)
        network_in_speed = 0
        network_out_speed = 0
        network_total_speed = 0
        
        if _last_network_stats and _last_network_time:
            time_delta = current_time - _last_network_time
            if time_delta > 0:
                # 计算每秒的字节数，然后转换为MB/s
                bytes_in_delta = current_network.bytes_recv - _last_network_stats.bytes_recv
                bytes_out_delta = current_network.bytes_sent - _last_network_stats.bytes_sent
                
                network_in_speed = round((bytes_in_delta / time_delta) / (1024 * 1024), 2)
                network_out_speed = round((bytes_out_delta / time_delta) / (1024 * 1024), 2)
                network_total_speed = round(network_in_speed + network_out_speed, 2)
        
        # 更新上次统计数据
        _last_network_stats = current_network
        _last_network_time = current_time
        
        # 获取活跃连接数
        try:
            active_connections = len(psutil.net_connections())
        except (psutil.AccessDenied, OSError):
            active_connections = 0
        
        return {
            "timestamp": now.isoformat(),
            "cpuUsage": round(cpu_percent, 2),
            "memoryUsage": round(memory.percent, 2),
            "diskUsage": round((disk.used / disk.total) * 100, 2),
            # 统一网络字段命名，提供多种格式
            "networkUsage": network_total_speed,  # 前端期望的总网络使用率
            "networkIn": network_in_speed,        # 网络输入速率 MB/s
            "networkOut": network_out_speed,      # 网络输出速率 MB/s
            "networkTotal": network_total_speed,  # 总网络速率 MB/s
            # 累计网络流量 (MB)
            "networkInTotal": round(current_network.bytes_recv / (1024 * 1024), 2),
            "networkOutTotal": round(current_network.bytes_sent / (1024 * 1024), 2),
            "activeConnections": active_connections,
            "securityEvents": 0,  # 这里可以后续集成真实的安全事件统计
            "threatsBlocked": 0   # 这里可以后续集成真实的威胁阻止统计
        }
    except Exception as e:
        logger.error(f"Error getting real system metrics: {str(e)}")
        # 如果获取真实数据失败，返回默认值
        return {
            "timestamp": datetime.now().isoformat(),
            "cpuUsage": 0,
            "memoryUsage": 0,
            "diskUsage": 0,
            "networkUsage": 0,
            "networkIn": 0,
            "networkOut": 0,
            "networkTotal": 0,
            "networkInTotal": 0,
            "networkOutTotal": 0,
            "activeConnections": 0,
            "securityEvents": 0,
            "threatsBlocked": 0
        }

def generate_mock_metrics():
    """生成模拟的系统指标数据（保留作为备用）"""
    import random
    now = datetime.now()
    
    return {
        "timestamp": now.isoformat(),
        "cpuUsage": round(random.uniform(20, 80), 2),
        "memoryUsage": round(random.uniform(30, 70), 2),
        "diskUsage": round(random.uniform(40, 60), 2),
        "networkIn": round(random.uniform(100, 1000), 2),
        "networkOut": round(random.uniform(50, 500), 2),
        "activeConnections": random.randint(10, 100),
        "securityEvents": random.randint(0, 5),
        "threatsBlocked": random.randint(0, 3)
    }

def generate_mock_trend_data(hours: int = 24):
    """生成模拟的趋势数据"""
    import random
    data = []
    now = datetime.now()
    
    for i in range(hours):
        timestamp = now - timedelta(hours=hours-i-1)
        data.append({
            "time": timestamp.strftime("%H:%M"),
            "timestamp": timestamp.isoformat(),
            "threats": random.randint(0, 10),
            "blocked": random.randint(0, 8),
            "cpu": round(random.uniform(20, 80), 1),
            "memory": round(random.uniform(30, 70), 1)
        })
    
    return data

@router.get("/metrics")
async def get_system_metrics():
    """获取系统实时指标"""
    try:
        metrics = get_real_system_metrics()
        logger.info("Real system metrics retrieved successfully")
        return {
            "success": True,
            "data": metrics
        }
    except Exception as e:
        logger.error(f"Error getting system metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get system metrics")

@router.get("/data")
async def get_monitor_data(
    timeRange: Optional[str] = Query("1h", description="时间范围: 1h, 6h, 24h, 7d")
):
    """获取监控数据"""
    try:
        # 根据时间范围生成不同数量的数据点
        hours_map = {
            "1h": 1,
            "6h": 6, 
            "24h": 24,
            "7d": 24 * 7
        }
        
        hours = hours_map.get(timeRange, 24)
        data = generate_mock_trend_data(min(hours, 168))  # 最多7天数据
        
        logger.info(f"Monitor data retrieved for timeRange: {timeRange}")
        return {
            "success": True,
            "data": data,
            "timeRange": timeRange,
            "totalPoints": len(data)
        }
    except Exception as e:
        logger.error(f"Error getting monitor data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get monitor data")

@router.get("/events")
async def get_security_events(
    limit: Optional[int] = Query(10, description="返回事件数量限制"),
    severity: Optional[str] = Query(None, description="事件严重级别过滤")
):
    """获取安全事件列表"""
    try:
        import random
        
        # 模拟安全事件数据
        severities = ["critical", "high", "medium", "low"]
        event_types = [
            "Suspicious file access",
            "Unauthorized network connection", 
            "Privilege escalation attempt",
            "Malware detection",
            "Brute force attack",
            "SQL injection attempt"
        ]
        
        events = []
        for i in range(limit):
            event_severity = severity if severity else random.choice(severities)
            events.append({
                "id": f"evt_{i+1:04d}",
                "title": random.choice(event_types),
                "severity": event_severity,
                "timestamp": (datetime.now() - timedelta(minutes=random.randint(1, 1440))).isoformat(),
                "source": f"host-{random.randint(1, 10)}",
                "description": f"Detected {random.choice(event_types).lower()} on system",
                "status": random.choice(["new", "investigating", "resolved"])
            })
        
        logger.info(f"Retrieved {len(events)} security events")
        return {
            "success": True,
            "data": events,
            "total": len(events)
        }
    except Exception as e:
        logger.error(f"Error getting security events: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get security events")

@router.get("/alerts")
async def get_active_alerts():
    """获取活跃告警"""
    try:
        import random
        
        alerts = []
        alert_types = [
            "High CPU usage detected",
            "Suspicious network activity",
            "Failed login attempts",
            "Disk space running low",
            "Memory usage critical"
        ]
        
        # 生成0-3个随机告警
        num_alerts = random.randint(0, 3)
        for i in range(num_alerts):
            alerts.append({
                "id": f"alert_{i+1}",
                "message": random.choice(alert_types),
                "severity": random.choice(["warning", "error", "critical"]),
                "timestamp": (datetime.now() - timedelta(minutes=random.randint(1, 60))).isoformat(),
                "acknowledged": random.choice([True, False])
            })
        
        logger.info(f"Retrieved {len(alerts)} active alerts")
        return {
            "success": True,
            "data": alerts,
            "total": len(alerts)
        }
    except Exception as e:
        logger.error(f"Error getting active alerts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get active alerts")