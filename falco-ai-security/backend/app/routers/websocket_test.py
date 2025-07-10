#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WebSocket测试路由
用于测试实时连接功能
"""

import asyncio
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.services.websocket_service import websocket_service

router = APIRouter()

@router.post("/test/send-event")
async def send_test_event(event_data: Dict[str, Any]):
    """发送测试事件"""
    try:
        # 发送测试安全事件
        test_event = {
            'rule': event_data.get('rule', 'Test Security Rule'),
            'priority': event_data.get('priority', 'Warning'),
            'message': event_data.get('message', 'This is a test security event'),
            'timestamp': datetime.now().isoformat(),
            'source': 'test',
            'fields': event_data.get('fields', {})
        }
        
        await websocket_service.send_security_alert(test_event)
        
        return {
            'success': True,
            'message': '测试事件已发送',
            'event': test_event
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"发送测试事件失败: {str(e)}")

@router.post("/test/send-metrics")
async def send_test_metrics():
    """发送测试系统指标"""
    try:
        # 模拟系统指标
        test_metrics = {
            'cpu_usage': 45.2,
            'memory_usage': 67.8,
            'disk_usage': 23.1,
            'network_io': {
                'bytes_sent': 1024000,
                'bytes_recv': 2048000
            },
            'timestamp': datetime.now().isoformat()
        }
        
        await websocket_service.send_system_metrics(test_metrics)
        
        return {
            'success': True,
            'message': '测试指标已发送',
            'metrics': test_metrics
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"发送测试指标失败: {str(e)}")

@router.get("/test/connection-stats")
async def get_connection_stats():
    """获取WebSocket连接统计"""
    try:
        stats = websocket_service.get_connection_stats()
        return {
            'success': True,
            'stats': stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取连接统计失败: {str(e)}")

@router.post("/test/broadcast")
async def broadcast_test_message(message_data: Dict[str, Any]):
    """广播测试消息"""
    try:
        event_type = message_data.get('event_type', 'test_message')
        data = message_data.get('data', {})
        room = message_data.get('room')
        
        await websocket_service.broadcast_event(event_type, data, room)
        
        return {
            'success': True,
            'message': f'消息已广播到 {"所有客户端" if not room else f"房间 {room}"}',
            'event_type': event_type,
            'data': data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"广播消息失败: {str(e)}")

@router.post("/test/simulate-falco-event")
async def simulate_falco_event():
    """模拟Falco安全事件"""
    try:
        # 模拟各种类型的Falco事件
        falco_events = [
            {
                'rule': 'Terminal shell in container',
                'priority': 'Notice',
                'message': 'A shell was used as the entrypoint/exec point into a container with an attached terminal.',
                'fields': {
                    'container.id': 'abc123',
                    'container.name': 'suspicious-container',
                    'proc.name': 'bash',
                    'user.name': 'root'
                }
            },
            {
                'rule': 'Write below binary dir',
                'priority': 'Error',
                'message': 'An attempt to write to any file below a set of binary directories',
                'fields': {
                    'fd.name': '/bin/malicious',
                    'proc.name': 'cp',
                    'user.name': 'attacker'
                }
            },
            {
                'rule': 'Sensitive file opened for reading',
                'priority': 'Warning',
                'message': 'An attempt to read any sensitive file',
                'fields': {
                    'fd.name': '/etc/shadow',
                    'proc.name': 'cat',
                    'user.name': 'suspicious-user'
                }
            }
        ]
        
        # 随机选择一个事件
        import random
        selected_event = random.choice(falco_events)
        selected_event['timestamp'] = datetime.now().isoformat()
        selected_event['source'] = 'falco-simulation'
        
        # 发送事件
        await websocket_service.broadcast_event('falco_event', selected_event)
        await websocket_service.broadcast_event('security_event', selected_event)
        
        return {
            'success': True,
            'message': '模拟Falco事件已发送',
            'event': selected_event
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"模拟Falco事件失败: {str(e)}")

@router.post("/test/start-event-simulation")
async def start_event_simulation(duration_seconds: int = 60):
    """启动事件模拟"""
    try:
        async def simulate_events():
            """后台事件模拟任务"""
            import random
            
            end_time = datetime.now().timestamp() + duration_seconds
            
            while datetime.now().timestamp() < end_time:
                # 模拟安全事件
                if random.random() < 0.3:  # 30%概率发送安全事件
                    await simulate_falco_event()
                
                # 模拟系统指标
                if random.random() < 0.5:  # 50%概率发送系统指标
                    await send_test_metrics()
                
                # 等待随机时间
                await asyncio.sleep(random.uniform(2, 8))
        
        # 启动后台任务
        asyncio.create_task(simulate_events())
        
        return {
            'success': True,
            'message': f'事件模拟已启动，将运行 {duration_seconds} 秒'
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动事件模拟失败: {str(e)}")