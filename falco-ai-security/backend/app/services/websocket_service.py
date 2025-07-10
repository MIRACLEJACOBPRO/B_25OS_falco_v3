#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - WebSocket Service
WebSocket服务，负责实时数据推送和客户端通信
"""

import logging
import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
# import socketio
from fastapi import FastAPI

from app.config import settings
from app.services.falco_monitor import FalcoEvent

logger = logging.getLogger(__name__)

@dataclass
class WebSocketMessage:
    """WebSocket消息"""
    event: str
    data: Dict[str, Any]
    timestamp: datetime
    client_id: Optional[str] = None
    room: Optional[str] = None

class WebSocketService:
    """WebSocket服务"""
    
    def __init__(self):
        # 创建Socket.IO服务器
        # self.sio = socketio.AsyncServer(
        #     cors_allowed_origins="*",
        #     logger=True,
        #     engineio_logger=True
        # )
        self.sio = None  # 临时禁用socketio
        
        # 客户端连接管理
        self.connected_clients: Set[str] = set()
        self.client_rooms: Dict[str, Set[str]] = {}
        self.client_info: Dict[str, Dict[str, Any]] = {}
        
        # 事件队列和缓存
        self.event_queue = asyncio.Queue(maxsize=1000)
        self.recent_events = []
        self.max_recent_events = 100
        
        # 注册事件处理器
        # self._register_handlers()  # 临时禁用
        
        logger.info("WebSocket服务初始化完成")
    
    def _register_handlers(self):
        """注册Socket.IO事件处理器"""
        
        @self.sio.event
        async def connect(sid, environ, auth):
            """客户端连接事件"""
            try:
                # 验证认证信息
                token = auth.get('token') if auth else None
                client_type = environ.get('QUERY_STRING', '')
                
                logger.info(f"客户端连接: {sid}, token: {token is not None}")
                
                # 添加到连接列表
                self.connected_clients.add(sid)
                self.client_info[sid] = {
                    'connected_at': datetime.now(),
                    'client_type': client_type,
                    'authenticated': token is not None
                }
                
                # 发送连接成功消息
                await self.sio.emit('connect_success', {
                    'message': '连接成功',
                    'server_time': datetime.now().isoformat(),
                    'client_id': sid
                }, room=sid)
                
                # 发送最近的事件
                if self.recent_events:
                    await self.sio.emit('recent_events', {
                        'events': self.recent_events[-10:],  # 最近10个事件
                        'total': len(self.recent_events)
                    }, room=sid)
                
                logger.info(f"客户端 {sid} 连接成功，当前连接数: {len(self.connected_clients)}")
                
            except Exception as e:
                logger.error(f"处理客户端连接失败: {e}")
                await self.sio.disconnect(sid)
        
        @self.sio.event
        async def disconnect(sid):
            """客户端断开连接事件"""
            try:
                # 从连接列表中移除
                self.connected_clients.discard(sid)
                
                # 从房间中移除
                for room_name, clients in self.client_rooms.items():
                    clients.discard(sid)
                
                # 清理客户端信息
                self.client_info.pop(sid, None)
                
                logger.info(f"客户端 {sid} 断开连接，当前连接数: {len(self.connected_clients)}")
                
            except Exception as e:
                logger.error(f"处理客户端断开连接失败: {e}")
        
        @self.sio.event
        async def join_room(sid, data):
            """加入房间"""
            try:
                room_name = data.get('room')
                if not room_name:
                    await self.sio.emit('error', {'message': '房间名称不能为空'}, room=sid)
                    return
                
                # 加入房间
                await self.sio.enter_room(sid, room_name)
                
                # 更新房间管理
                if room_name not in self.client_rooms:
                    self.client_rooms[room_name] = set()
                self.client_rooms[room_name].add(sid)
                
                await self.sio.emit('room_joined', {
                    'room': room_name,
                    'message': f'已加入房间: {room_name}'
                }, room=sid)
                
                logger.info(f"客户端 {sid} 加入房间: {room_name}")
                
            except Exception as e:
                logger.error(f"加入房间失败: {e}")
                await self.sio.emit('error', {'message': '加入房间失败'}, room=sid)
        
        @self.sio.event
        async def leave_room(sid, data):
            """离开房间"""
            try:
                room_name = data.get('room')
                if not room_name:
                    return
                
                # 离开房间
                await self.sio.leave_room(sid, room_name)
                
                # 更新房间管理
                if room_name in self.client_rooms:
                    self.client_rooms[room_name].discard(sid)
                    if not self.client_rooms[room_name]:
                        del self.client_rooms[room_name]
                
                await self.sio.emit('room_left', {
                    'room': room_name,
                    'message': f'已离开房间: {room_name}'
                }, room=sid)
                
                logger.info(f"客户端 {sid} 离开房间: {room_name}")
                
            except Exception as e:
                logger.error(f"离开房间失败: {e}")
        
        @self.sio.event
        async def heartbeat(sid, data):
            """心跳检测"""
            await self.sio.emit('heartbeat_response', {
                'timestamp': datetime.now().isoformat(),
                'client_timestamp': data.get('timestamp')
            }, room=sid)
        
        @self.sio.event
        async def request_data(sid, data):
            """请求实时数据"""
            try:
                data_type = data.get('type')
                params = data.get('params', {})
                
                # 根据数据类型返回相应数据
                response_data = await self._handle_data_request(data_type, params)
                
                await self.sio.emit('data_response', {
                    'type': data_type,
                    'data': response_data,
                    'timestamp': datetime.now().isoformat()
                }, room=sid)
                
            except Exception as e:
                logger.error(f"处理数据请求失败: {e}")
                await self.sio.emit('error', {
                    'message': '数据请求失败',
                    'error': str(e)
                }, room=sid)
    
    async def _handle_data_request(self, data_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """处理数据请求"""
        if data_type == 'system_status':
            return {
                'connected_clients': len(self.connected_clients),
                'server_time': datetime.now().isoformat(),
                'status': 'healthy'
            }
        elif data_type == 'recent_events':
            limit = params.get('limit', 10)
            return {
                'events': self.recent_events[-limit:],
                'total': len(self.recent_events)
            }
        else:
            return {'message': f'未知的数据类型: {data_type}'}
    
    def get_asgi_app(self, app: FastAPI):
        """获取ASGI应用"""
        # return socketio.ASGIApp(self.sio, app)
        return app  # 临时返回原始app
    
    async def broadcast_event(self, event: str, data: Dict[str, Any], room: Optional[str] = None):
        """广播事件到所有客户端或指定房间"""
        try:
            message = {
                'event': event,
                'data': data,
                'timestamp': datetime.now().isoformat()
            }
            
            if room:
                await self.sio.emit(event, message, room=room)
                logger.debug(f"向房间 {room} 广播事件: {event}")
            else:
                await self.sio.emit(event, message)
                logger.debug(f"广播事件到所有客户端: {event}")
            
            # 添加到最近事件列表
            self.recent_events.append(message)
            if len(self.recent_events) > self.max_recent_events:
                self.recent_events.pop(0)
                
        except Exception as e:
            logger.error(f"广播事件失败: {e}")
    
    async def send_falco_event(self, falco_event: FalcoEvent):
        """发送Falco事件"""
        event_data = {
            'rule': falco_event.rule,
            'priority': falco_event.priority,
            'message': falco_event.message,
            'timestamp': falco_event.timestamp.isoformat(),
            'fields': falco_event.fields
        }
        
        await self.broadcast_event('falco_event', event_data)
        await self.broadcast_event('security_event', event_data)
    
    async def send_system_metrics(self, metrics: Dict[str, Any]):
        """发送系统指标"""
        await self.broadcast_event('system_metrics', metrics)
    
    async def send_security_alert(self, alert: Dict[str, Any]):
        """发送安全警报"""
        await self.broadcast_event('security_alert', alert)
        await self.broadcast_event('threat_detected', alert)
    
    async def send_ai_analysis(self, analysis: Dict[str, Any]):
        """发送AI分析结果"""
        await self.broadcast_event('ai_analysis_complete', analysis)
        await self.broadcast_event('ai_recommendation', analysis)
    
    async def send_system_status(self, status: Dict[str, Any]):
        """发送系统状态"""
        await self.broadcast_event('system_status', status)
        await self.broadcast_event('system_health', status)
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """获取连接统计信息"""
        return {
            'total_connections': len(self.connected_clients),
            'rooms': {room: len(clients) for room, clients in self.client_rooms.items()},
            'recent_events_count': len(self.recent_events)
        }
    
    async def start_background_tasks(self):
        """启动后台任务"""
        # 启动心跳任务
        asyncio.create_task(self._heartbeat_task())
        # 启动系统状态推送任务
        asyncio.create_task(self._system_status_task())
        
        logger.info("WebSocket后台任务已启动")
    
    async def _heartbeat_task(self):
        """心跳任务"""
        while True:
            try:
                if self.connected_clients:
                    await self.broadcast_event('server_heartbeat', {
                        'timestamp': datetime.now().isoformat(),
                        'connected_clients': len(self.connected_clients)
                    })
                await asyncio.sleep(30)  # 每30秒发送一次心跳
            except Exception as e:
                logger.error(f"心跳任务错误: {e}")
                await asyncio.sleep(5)
    
    async def _system_status_task(self):
        """系统状态推送任务"""
        while True:
            try:
                if self.connected_clients:
                    # 模拟系统状态数据
                    status = {
                        'timestamp': datetime.now().isoformat(),
                        'falco_status': 'disconnected',  # Falco服务未启动
                        'backend_status': 'healthy',
                        'database_status': 'healthy',
                        'websocket_connections': len(self.connected_clients)
                    }
                    await self.send_system_status(status)
                
                await asyncio.sleep(60)  # 每分钟推送一次系统状态
            except Exception as e:
                logger.error(f"系统状态推送任务错误: {e}")
                await asyncio.sleep(10)

# 全局WebSocket服务实例
websocket_service = WebSocketService()