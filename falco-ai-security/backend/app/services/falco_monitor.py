#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - Falco Monitor Service
Falco监控服务，负责实时监控Falco日志并解析安全事件
"""

import asyncio
import json
import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import aiofiles
# import grpc
# from grpc import aio as aio_grpc

from app.config import settings

logger = logging.getLogger(__name__)

@dataclass
class FalcoEvent:
    """Falco事件数据结构"""
    timestamp: datetime
    rule: str
    priority: str
    source: str
    message: str
    output_fields: Dict[str, Any]
    hostname: str
    tags: List[str]
    raw_data: Dict[str, Any]
    
    @classmethod
    def from_json(cls, json_data: Dict[str, Any]) -> 'FalcoEvent':
        """从JSON数据创建FalcoEvent实例"""
        try:
            # 解析时间戳
            timestamp_str = json_data.get('time', json_data.get('timestamp', ''))
            if timestamp_str:
                # 支持多种时间格式
                for fmt in ['%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%d %H:%M:%S']:
                    try:
                        timestamp = datetime.strptime(timestamp_str, fmt)
                        break
                    except ValueError:
                        continue
                else:
                    timestamp = datetime.now()
            else:
                timestamp = datetime.now()
            
            return cls(
                timestamp=timestamp,
                rule=json_data.get('rule', 'Unknown'),
                priority=json_data.get('priority', 'Info'),
                source=json_data.get('source', 'falco'),
                message=json_data.get('output', json_data.get('message', '')),
                output_fields=json_data.get('output_fields', {}),
                hostname=json_data.get('hostname', 'unknown'),
                tags=json_data.get('tags', []),
                raw_data=json_data
            )
        except Exception as e:
            logger.error(f"解析Falco事件失败: {e}")
            # 返回默认事件
            return cls(
                timestamp=datetime.now(),
                rule='Parse Error',
                priority='Error',
                source='falco',
                message=f"Failed to parse event: {str(e)}",
                output_fields={},
                hostname='unknown',
                tags=[],
                raw_data=json_data
            )

class FalcoLogHandler(FileSystemEventHandler):
    """Falco日志文件监控处理器"""
    
    def __init__(self, callback: Callable[[FalcoEvent], None]):
        self.callback = callback
        self.last_position = 0
        
    def on_modified(self, event):
        """文件修改时触发"""
        if not event.is_directory and event.src_path.endswith('.log'):
            asyncio.create_task(self._process_new_lines(event.src_path))
    
    async def _process_new_lines(self, file_path: str):
        """处理新增的日志行"""
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                await f.seek(self.last_position)
                new_lines = await f.read()
                self.last_position = await f.tell()
                
                if new_lines.strip():
                    for line in new_lines.strip().split('\n'):
                        if line.strip():
                            await self._parse_and_callback(line)
        except Exception as e:
            logger.error(f"处理日志文件失败: {e}")
    
    async def _parse_and_callback(self, line: str):
        """解析日志行并调用回调"""
        try:
            # 尝试解析JSON格式
            if line.strip().startswith('{'):
                json_data = json.loads(line)
                event = FalcoEvent.from_json(json_data)
                self.callback(event)
            else:
                # 处理非JSON格式的日志
                logger.debug(f"非JSON格式日志: {line}")
        except json.JSONDecodeError as e:
            logger.warning(f"JSON解析失败: {e}, 行内容: {line[:100]}...")
        except Exception as e:
            logger.error(f"处理日志行失败: {e}")

class FalcoGRPCClient:
    """Falco gRPC客户端"""
    
    def __init__(self, grpc_address: str = "localhost:5060"):
        self.grpc_address = grpc_address
        self.channel = None
        self.stub = None
    
    async def connect(self):
        """连接到Falco gRPC服务"""
        try:
            # self.channel = aio_grpc.insecure_channel(self.grpc_address)
            # TODO: 实现Falco gRPC stub
            logger.info(f"Falco gRPC服务暂时禁用: {self.grpc_address}")
        except Exception as e:
            logger.error(f"连接Falco gRPC服务失败: {e}")
    
    async def disconnect(self):
        """断开gRPC连接"""
        if self.channel:
            await self.channel.close()
            logger.info("已断开Falco gRPC连接")

class FalcoMonitorService:
    """Falco监控服务主类"""
    
    def __init__(self):
        self.log_file_path = settings.FALCO_LOG_PATH
        self.observer = None
        self.grpc_client = None
        self.event_callbacks: List[Callable[[FalcoEvent], None]] = []
        self.is_running = False
        self.stats = {
            'total_events': 0,
            'events_by_priority': {},
            'events_by_rule': {},
            'last_event_time': None
        }
    
    def add_event_callback(self, callback: Callable[[FalcoEvent], None]):
        """添加事件回调函数"""
        self.event_callbacks.append(callback)
        logger.info(f"已添加事件回调: {callback.__name__}")
    
    def remove_event_callback(self, callback: Callable[[FalcoEvent], None]):
        """移除事件回调函数"""
        if callback in self.event_callbacks:
            self.event_callbacks.remove(callback)
            logger.info(f"已移除事件回调: {callback.__name__}")
    
    async def _handle_event(self, event: FalcoEvent):
        """处理Falco事件"""
        try:
            # 更新统计信息
            self.stats['total_events'] += 1
            self.stats['last_event_time'] = event.timestamp
            
            # 按优先级统计
            priority = event.priority
            self.stats['events_by_priority'][priority] = self.stats['events_by_priority'].get(priority, 0) + 1
            
            # 按规则统计
            rule = event.rule
            self.stats['events_by_rule'][rule] = self.stats['events_by_rule'].get(rule, 0) + 1
            
            # 记录日志
            logger.info(f"Falco事件: {event.rule} [{event.priority}] - {event.message[:100]}...")
            
            # 调用所有回调函数
            for callback in self.event_callbacks:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(event)
                    else:
                        callback(event)
                except Exception as e:
                    logger.error(f"事件回调执行失败 {callback.__name__}: {e}")
        
        except Exception as e:
            logger.error(f"处理Falco事件失败: {e}")
    
    async def start_file_monitoring(self):
        """启动文件监控"""
        try:
            # 检查日志文件是否存在
            log_path = Path(self.log_file_path)
            if not log_path.exists():
                logger.warning(f"Falco日志文件不存在: {self.log_file_path}")
                # 创建目录
                log_path.parent.mkdir(parents=True, exist_ok=True)
                # 创建空文件
                log_path.touch()
            
            # 创建文件监控处理器
            handler = FalcoLogHandler(self._handle_event)
            
            # 启动文件监控
            self.observer = Observer()
            self.observer.schedule(handler, str(log_path.parent), recursive=False)
            self.observer.start()
            
            logger.info(f"已启动Falco日志文件监控: {self.log_file_path}")
            
            # 处理现有日志内容
            await self._process_existing_logs()
            
        except Exception as e:
            logger.error(f"启动文件监控失败: {e}")
            raise
    
    async def _process_existing_logs(self):
        """处理现有的日志内容"""
        try:
            if os.path.exists(self.log_file_path):
                async with aiofiles.open(self.log_file_path, 'r', encoding='utf-8') as f:
                    content = await f.read()
                    lines = content.strip().split('\n')
                    
                    # 只处理最近的日志（避免启动时处理大量历史日志）
                    recent_lines = lines[-100:] if len(lines) > 100 else lines
                    
                    for line in recent_lines:
                        if line.strip():
                            try:
                                if line.strip().startswith('{'):
                                    json_data = json.loads(line)
                                    event = FalcoEvent.from_json(json_data)
                                    await self._handle_event(event)
                            except Exception as e:
                                logger.debug(f"处理历史日志行失败: {e}")
                    
                    logger.info(f"已处理 {len(recent_lines)} 条历史日志")
        except Exception as e:
            logger.error(f"处理现有日志失败: {e}")
    
    async def start_grpc_monitoring(self):
        """启动gRPC监控"""
        try:
            self.grpc_client = FalcoGRPCClient()
            await self.grpc_client.connect()
            logger.info("已启动Falco gRPC监控")
        except Exception as e:
            logger.error(f"启动gRPC监控失败: {e}")
    
    async def start(self):
        """启动监控服务"""
        if self.is_running:
            logger.warning("Falco监控服务已在运行")
            return
        
        try:
            logger.info("启动Falco监控服务...")
            
            # 启动文件监控
            await self.start_file_monitoring()
            
            # 启动gRPC监控（可选）
            try:
                await self.start_grpc_monitoring()
            except Exception as e:
                logger.warning(f"gRPC监控启动失败，仅使用文件监控: {e}")
            
            self.is_running = True
            logger.info("Falco监控服务启动成功")
            
        except Exception as e:
            logger.error(f"启动Falco监控服务失败: {e}")
            await self.stop()
            raise
    
    async def stop(self):
        """停止监控服务"""
        if not self.is_running:
            return
        
        try:
            logger.info("停止Falco监控服务...")
            
            # 停止文件监控
            if self.observer:
                self.observer.stop()
                self.observer.join()
                self.observer = None
            
            # 停止gRPC监控
            if self.grpc_client:
                await self.grpc_client.disconnect()
                self.grpc_client = None
            
            self.is_running = False
            logger.info("Falco监控服务已停止")
            
        except Exception as e:
            logger.error(f"停止Falco监控服务失败: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """获取监控统计信息"""
        return {
            **self.stats,
            'is_running': self.is_running,
            'log_file_path': self.log_file_path,
            'callback_count': len(self.event_callbacks)
        }
    
    async def test_event_generation(self):
        """生成测试事件（用于开发调试）"""
        test_event_data = {
            "time": datetime.now().isoformat() + "Z",
            "rule": "Test Rule",
            "priority": "Warning",
            "source": "falco",
            "output": "This is a test event for development",
            "output_fields": {
                "proc.name": "test_process",
                "fd.name": "/tmp/test_file",
                "evt.type": "openat"
            },
            "hostname": "test-host",
            "tags": ["test", "development"]
        }
        
        event = FalcoEvent.from_json(test_event_data)
        await self._handle_event(event)
        logger.info("已生成测试事件")

# 全局监控服务实例
falco_monitor = FalcoMonitorService()