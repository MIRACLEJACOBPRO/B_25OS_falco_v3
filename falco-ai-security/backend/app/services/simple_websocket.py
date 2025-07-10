#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的WebSocket服务
使用FastAPI原生WebSocket支持，不依赖Socket.IO
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Set, Any, Optional
from dataclasses import dataclass, asdict
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

@dataclass
class WebSocketMessage:
    """WebSocket消息"""
    event: str
    data: Dict[str, Any]
    timestamp: str
    client_id: Optional[str] = None

class SimpleWebSocketService:
    """简化的WebSocket服务"""
    
    def __init__(self):
        # 活跃连接管理
        self.active_connections: Set[WebSocket] = set()
        self.connection_info: Dict[WebSocket, Dict[str, Any]] = {}
        
        # 事件缓存
        self.recent_events: List[Dict[str, Any]] = []
        self.max_recent_events = 100
        
        # 后台任务
        self.background_tasks: List[asyncio.Task] = []
        
        logger.info("简化WebSocket服务初始化完成")
    
    async def connect(self, websocket: WebSocket, client_id: str = None):
        """接受WebSocket连接"""
        try:
            await websocket.accept()
            self.active_connections.add(websocket)
            
            # 记录连接信息
            self.connection_info[websocket] = {
                'client_id': client_id or f"client_{len(self.active_connections)}",
                'connected_at': datetime.now(),
                'last_ping': datetime.now()
            }
            
            logger.info(f"WebSocket客户端连接: {client_id}, 当前连接数: {len(self.active_connections)}")
            
            # 发送连接成功消息
            await self.send_to_client(websocket, {
                'event': 'connect_success',
                'data': {
                    'message': '连接成功',
                    'server_time': datetime.now().isoformat(),
                    'client_id': self.connection_info[websocket]['client_id']
                },
                'timestamp': datetime.now().isoformat()
            })
            
            # 发送最近的事件
            if self.recent_events:
                await self.send_to_client(websocket, {
                    'event': 'recent_events',
                    'data': {
                        'events': self.recent_events[-10:],
                        'total': len(self.recent_events)
                    },
                    'timestamp': datetime.now().isoformat()
                })
            
        except Exception as e:
            logger.error(f"WebSocket连接失败: {e}")
            await self.disconnect(websocket)
    
    async def disconnect(self, websocket: WebSocket):
        """断开WebSocket连接"""
        try:
            self.active_connections.discard(websocket)
            client_info = self.connection_info.pop(websocket, {})
            client_id = client_info.get('client_id', 'unknown')
            
            logger.info(f"WebSocket客户端断开: {client_id}, 当前连接数: {len(self.active_connections)}")
            
        except Exception as e:
            logger.error(f"处理WebSocket断开连接失败: {e}")
    
    async def send_to_client(self, websocket: WebSocket, message: Dict[str, Any]):
        """发送消息到指定客户端"""
        try:
            await websocket.send_text(json.dumps(message, ensure_ascii=False))
        except Exception as e:
            logger.error(f"发送消息到客户端失败: {e}")
            await self.disconnect(websocket)
    
    async def broadcast(self, message: Dict[str, Any]):
        """广播消息到所有连接的客户端"""
        if not self.active_connections:
            logger.debug("没有活跃的WebSocket连接")
            return
        
        # 添加到最近事件列表
        self.recent_events.append(message)
        if len(self.recent_events) > self.max_recent_events:
            self.recent_events.pop(0)
        
        # 广播到所有客户端
        disconnected_clients = []
        for websocket in self.active_connections.copy():
            try:
                await websocket.send_text(json.dumps(message, ensure_ascii=False))
            except Exception as e:
                logger.error(f"广播消息失败: {e}")
                disconnected_clients.append(websocket)
        
        # 清理断开的连接
        for websocket in disconnected_clients:
            await self.disconnect(websocket)
        
        logger.debug(f"消息已广播到 {len(self.active_connections)} 个客户端")
    
    async def send_event(self, event_type: str, data: Dict[str, Any]):
        """发送事件"""
        message = {
            'event': event_type,
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
        await self.broadcast(message)
    
    async def send_security_event(self, event_data: Dict[str, Any]):
        """发送安全事件"""
        await self.send_event('security_event', event_data)
        await self.send_event('falco_event', event_data)
    
    async def send_system_metrics(self, metrics: Dict[str, Any]):
        """发送系统指标"""
        await self.send_event('system_metrics', metrics)
    
    async def send_security_alert(self, alert: Dict[str, Any]):
        """发送安全警报"""
        await self.send_event('security_alert', alert)
        await self.send_event('threat_detected', alert)
    
    async def send_system_status(self, status: Dict[str, Any]):
        """发送系统状态"""
        await self.send_event('system_status', status)
        await self.send_event('system_health', status)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """获取连接统计"""
        return {
            'total_connections': len(self.active_connections),
            'recent_events_count': len(self.recent_events),
            'clients': [
                {
                    'client_id': info['client_id'],
                    'connected_at': info['connected_at'].isoformat(),
                    'last_ping': info['last_ping'].isoformat()
                }
                for info in self.connection_info.values()
            ]
        }
    
    async def handle_client_message(self, websocket: WebSocket, message: str):
        """处理客户端消息"""
        try:
            data = json.loads(message)
            event_type = data.get('event', 'unknown')
            
            if event_type == 'ping':
                # 处理心跳
                if websocket in self.connection_info:
                    self.connection_info[websocket]['last_ping'] = datetime.now()
                
                await self.send_to_client(websocket, {
                    'event': 'pong',
                    'data': {
                        'timestamp': datetime.now().isoformat(),
                        'client_timestamp': data.get('data', {}).get('timestamp')
                    },
                    'timestamp': datetime.now().isoformat()
                })
            
            elif event_type == 'request_data':
                # 处理数据请求
                data_type = data.get('data', {}).get('type')
                response_data = await self._handle_data_request(data_type)
                
                await self.send_to_client(websocket, {
                    'event': 'data_response',
                    'data': {
                        'type': data_type,
                        'data': response_data
                    },
                    'timestamp': datetime.now().isoformat()
                })
            
            else:
                logger.warning(f"未知的客户端事件类型: {event_type}")
                
        except json.JSONDecodeError:
            logger.error(f"无效的JSON消息: {message}")
        except Exception as e:
            logger.error(f"处理客户端消息失败: {e}")
    
    async def _handle_data_request(self, data_type: str) -> Dict[str, Any]:
        """处理数据请求"""
        if data_type == 'system_status':
            return {
                'connected_clients': len(self.active_connections),
                'server_time': datetime.now().isoformat(),
                'status': 'healthy',
                'falco_status': 'disconnected'  # Falco服务未正常运行
            }
        elif data_type == 'recent_events':
            return {
                'events': self.recent_events[-10:],
                'total': len(self.recent_events)
            }
        else:
            return {'message': f'未知的数据类型: {data_type}'}
    
    async def start_background_tasks(self):
        """启动后台任务"""
        # 启动心跳任务
        heartbeat_task = asyncio.create_task(self._heartbeat_task())
        self.background_tasks.append(heartbeat_task)
        
        # 启动系统状态推送任务
        status_task = asyncio.create_task(self._system_status_task())
        self.background_tasks.append(status_task)
        
        logger.info("WebSocket后台任务已启动")
    
    async def _heartbeat_task(self):
        """心跳任务"""
        while True:
            try:
                if self.active_connections:
                    await self.send_event('server_heartbeat', {
                        'timestamp': datetime.now().isoformat(),
                        'connected_clients': len(self.active_connections)
                    })
                await asyncio.sleep(30)  # 每30秒发送一次心跳
            except Exception as e:
                logger.error(f"心跳任务错误: {e}")
                await asyncio.sleep(5)
    
    async def _system_status_task(self):
        """系统状态推送任务"""
        while True:
            try:
                if self.active_connections:
                    status = {
                        'timestamp': datetime.now().isoformat(),
                        'falco_status': 'disconnected',  # Falco服务状态
                        'backend_status': 'healthy',
                        'database_status': 'healthy',
                        'websocket_connections': len(self.active_connections)
                    }
                    await self.send_system_status(status)
                
                await asyncio.sleep(60)  # 每分钟推送一次
            except Exception as e:
                logger.error(f"系统状态推送任务错误: {e}")
                await asyncio.sleep(10)
    
    async def stop_background_tasks(self):
        """停止后台任务"""
        for task in self.background_tasks:
            task.cancel()
        self.background_tasks.clear()
        logger.info("WebSocket后台任务已停止")

# 全局WebSocket服务实例
simple_websocket_service = SimpleWebSocketService()