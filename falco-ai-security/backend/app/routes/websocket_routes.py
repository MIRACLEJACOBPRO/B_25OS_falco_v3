#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WebSocket路由
处理实时WebSocket连接
"""

import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional

from ..services.simple_websocket import simple_websocket_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, client_id: Optional[str] = Query(None)):
    """WebSocket连接端点"""
    await simple_websocket_service.connect(websocket, client_id)
    
    try:
        while True:
            # 接收客户端消息
            message = await websocket.receive_text()
            await simple_websocket_service.handle_client_message(websocket, message)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket客户端主动断开连接: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket连接异常: {e}")
    finally:
        await simple_websocket_service.disconnect(websocket)

@router.get("/ws/stats")
async def get_websocket_stats():
    """获取WebSocket连接统计"""
    return simple_websocket_service.get_connection_stats()

@router.post("/ws/broadcast")
async def broadcast_message(message: dict):
    """广播消息到所有WebSocket客户端"""
    await simple_websocket_service.broadcast(message)
    return {"status": "success", "message": "消息已广播"}

@router.post("/ws/test/security-event")
async def send_test_security_event():
    """发送测试安全事件"""
    test_event = {
        "rule": "Test Security Rule",
        "priority": "Warning",
        "message": "这是一个测试安全事件",
        "source": "test",
        "tags": ["test", "security"],
        "fields": {
            "proc.name": "test_process",
            "fd.name": "/tmp/test_file",
            "user.name": "test_user"
        }
    }
    
    await simple_websocket_service.send_security_event(test_event)
    return {"status": "success", "message": "测试安全事件已发送"}

@router.post("/ws/test/system-metrics")
async def send_test_system_metrics():
    """发送测试系统指标"""
    import random
    
    test_metrics = {
        "cpu_usage": round(random.uniform(10, 90), 2),
        "memory_usage": round(random.uniform(20, 80), 2),
        "disk_usage": round(random.uniform(30, 70), 2),
        "network_io": {
            "bytes_sent": random.randint(1000, 10000),
            "bytes_recv": random.randint(1000, 10000)
        },
        "process_count": random.randint(100, 300),
        "load_average": [round(random.uniform(0.5, 2.0), 2) for _ in range(3)]
    }
    
    await simple_websocket_service.send_system_metrics(test_metrics)
    return {"status": "success", "message": "测试系统指标已发送"}

@router.post("/ws/test/security-alert")
async def send_test_security_alert():
    """发送测试安全警报"""
    test_alert = {
        "alert_id": "test_alert_001",
        "severity": "high",
        "title": "可疑文件访问",
        "description": "检测到对敏感文件的异常访问",
        "source_ip": "192.168.1.100",
        "target_file": "/etc/passwd",
        "process": "suspicious_process",
        "user": "unknown_user",
        "recommendations": [
            "检查进程合法性",
            "验证用户权限",
            "监控后续活动"
        ]
    }
    
    await simple_websocket_service.send_security_alert(test_alert)
    return {"status": "success", "message": "测试安全警报已发送"}

@router.post("/ws/test/start-simulation")
async def start_event_simulation():
    """启动事件模拟"""
    asyncio.create_task(_event_simulation_task())
    return {"status": "success", "message": "事件模拟已启动"}

async def _event_simulation_task():
    """事件模拟后台任务"""
    import random
    from datetime import datetime
    
    event_types = [
        {
            "type": "security_event",
            "data": {
                "rule": "Suspicious File Access",
                "priority": "Warning",
                "message": "检测到可疑文件访问",
                "source": "falco",
                "fields": {
                    "proc.name": "cat",
                    "fd.name": "/etc/shadow",
                    "user.name": "root"
                }
            }
        },
        {
            "type": "system_metrics",
            "data": {
                "cpu_usage": round(random.uniform(10, 90), 2),
                "memory_usage": round(random.uniform(20, 80), 2),
                "disk_usage": round(random.uniform(30, 70), 2)
            }
        },
        {
            "type": "security_alert",
            "data": {
                "alert_id": f"alert_{random.randint(1000, 9999)}",
                "severity": random.choice(["low", "medium", "high", "critical"]),
                "title": "安全威胁检测",
                "description": "系统检测到潜在的安全威胁"
            }
        }
    ]
    
    for i in range(20):  # 发送20个模拟事件
        try:
            event = random.choice(event_types)
            event_type = event["type"]
            event_data = event["data"].copy()
            event_data["timestamp"] = datetime.now().isoformat()
            event_data["simulation"] = True
            event_data["sequence"] = i + 1
            
            if event_type == "security_event":
                await simple_websocket_service.send_security_event(event_data)
            elif event_type == "system_metrics":
                await simple_websocket_service.send_system_metrics(event_data)
            elif event_type == "security_alert":
                await simple_websocket_service.send_security_alert(event_data)
            
            # 随机间隔
            await asyncio.sleep(random.uniform(2, 8))
            
        except Exception as e:
            logger.error(f"事件模拟任务错误: {e}")
            break
    
    logger.info("事件模拟任务完成")