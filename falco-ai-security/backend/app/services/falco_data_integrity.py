#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 数据完整性保障服务
解决Falco数据采集中的重复读取、数据缺失等问题
"""

import asyncio
import hashlib
import json
import logging
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Set
from collections import deque
from dataclasses import dataclass, field

import aiofiles
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from ..models.event_models import FalcoEvent
from ..config_simple import settings

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """事件验证结果"""
    is_valid: bool
    error_message: str = ""
    warnings: List[str] = field(default_factory=list)

class FalcoDataIntegrityService:
    """
    Falco数据完整性保障服务
    
    解决的问题：
    1. 数据重复读取：通过事件ID和内容哈希去重
    2. 数据缺失：通过文件位置追踪和断点续传
    3. 读取频率控制：避免过度频繁的文件访问
    4. 内存管理：限制内存中缓存的事件数量
    """
    
    def __init__(self, max_cache_size: int = 10000, batch_size: int = 100):
        self.log_file_path = settings.FALCO_LOG_PATH
        self.max_cache_size = max_cache_size
        self.batch_size = batch_size
        
        # 数据完整性追踪
        self.processed_events: Set[str] = set()  # 已处理事件ID集合
        self.event_hashes: Set[str] = set()      # 事件内容哈希集合
        self.file_position = 0                   # 文件读取位置
        self.last_inode = None                   # 文件inode，检测文件轮转
        self.last_size = 0                       # 上次文件大小
        
        # 性能优化
        self.read_buffer = deque(maxlen=self.max_cache_size)  # 读取缓冲区
        self.last_read_time = 0                  # 上次读取时间
        self.min_read_interval = 0.1             # 最小读取间隔（秒）
        
        # 统计信息
        self.stats = {
            'total_read': 0,
            'duplicate_events': 0,
            'processed_events': 0,
            'file_rotations': 0,
            'read_errors': 0,
            'last_read_time': None
        }
        
        # 状态文件路径（用于持久化读取位置）
        self.state_file = Path(settings.DATA_DIR) / 'falco_reader_state.json'
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        
        # 加载上次的读取状态
        self._load_state()
    
    def _load_state(self):
        """加载上次的读取状态"""
        try:
            if self.state_file.exists():
                with open(self.state_file, 'r') as f:
                    state = json.load(f)
                    self.file_position = state.get('file_position', 0)
                    self.last_inode = state.get('last_inode')
                    self.last_size = state.get('last_size', 0)
                    logger.info(f"已加载读取状态: position={self.file_position}, inode={self.last_inode}")
        except Exception as e:
            logger.warning(f"加载读取状态失败: {e}")
    
    def _save_state(self):
        """保存当前读取状态"""
        try:
            state = {
                'file_position': self.file_position,
                'last_inode': self.last_inode,
                'last_size': self.last_size,
                'timestamp': datetime.now().isoformat()
            }
            with open(self.state_file, 'w') as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            logger.error(f"保存读取状态失败: {e}")
    
    def _get_file_info(self, file_path: str) -> Dict:
        """获取文件信息"""
        try:
            stat = os.stat(file_path)
            return {
                'size': stat.st_size,
                'inode': stat.st_ino,
                'mtime': stat.st_mtime
            }
        except FileNotFoundError:
            return {'size': 0, 'inode': None, 'mtime': 0}
        except Exception as e:
            logger.error(f"获取文件信息失败: {e}")
            return {'size': 0, 'inode': None, 'mtime': 0}
    
    def _generate_event_hash(self, event_data: Dict) -> str:
        """生成事件内容哈希"""
        # 排除时间戳等可变字段，只对核心内容计算哈希
        core_data = {
            'rule': event_data.get('rule'),
            'priority': event_data.get('priority'),
            'output': event_data.get('output'),
            'output_fields': event_data.get('output_fields', {})
        }
        content = json.dumps(core_data, sort_keys=True)
        return hashlib.md5(content.encode()).hexdigest()
    
    def _is_duplicate_event(self, event_data: Dict) -> bool:
        """检查是否为重复事件"""
        # 检查事件ID
        event_id = event_data.get('uuid') or event_data.get('id')
        if event_id and event_id in self.processed_events:
            return True
        
        # 检查内容哈希
        event_hash = self._generate_event_hash(event_data)
        if event_hash in self.event_hashes:
            return True
        
        # 记录新事件
        if event_id:
            self.processed_events.add(event_id)
        self.event_hashes.add(event_hash)
        
        # 限制内存使用
        if len(self.processed_events) > self.max_cache_size:
            # 移除最旧的一半事件ID
            old_events = list(self.processed_events)[:len(self.processed_events)//2]
            for old_id in old_events:
                self.processed_events.discard(old_id)
        
        if len(self.event_hashes) > self.max_cache_size:
            # 移除最旧的一半哈希
            old_hashes = list(self.event_hashes)[:len(self.event_hashes)//2]
            for old_hash in old_hashes:
                self.event_hashes.discard(old_hash)
        
        return False
    
    async def _read_new_content(self) -> List[str]:
        """读取文件新增内容"""
        try:
            # 检查读取频率限制
            current_time = time.time()
            if current_time - self.last_read_time < self.min_read_interval:
                return []
            
            file_info = self._get_file_info(self.log_file_path)
            
            # 检查文件是否被轮转
            if (self.last_inode is not None and 
                file_info['inode'] != self.last_inode):
                logger.info("检测到文件轮转，重置读取位置")
                self.file_position = 0
                self.stats['file_rotations'] += 1
            
            # 检查文件是否缩小（可能被截断）
            if file_info['size'] < self.last_size:
                logger.warning("检测到文件被截断，重置读取位置")
                self.file_position = 0
            
            # 更新文件信息
            self.last_inode = file_info['inode']
            self.last_size = file_info['size']
            
            # 如果没有新内容，直接返回
            if file_info['size'] <= self.file_position:
                return []
            
            # 读取新内容
            async with aiofiles.open(self.log_file_path, 'r', encoding='utf-8') as f:
                await f.seek(self.file_position)
                new_content = await f.read()
                self.file_position = await f.tell()
            
            self.last_read_time = current_time
            self.stats['last_read_time'] = datetime.now().isoformat()
            
            if new_content.strip():
                lines = new_content.strip().split('\n')
                self.stats['total_read'] += len(lines)
                return lines
            
            return []
            
        except Exception as e:
            logger.error(f"读取文件内容失败: {e}")
            self.stats['read_errors'] += 1
            return []
    
    async def read_events_batch(self) -> List[FalcoEvent]:
        """批量读取事件（去重后）"""
        try:
            lines = await self._read_new_content()
            events = []
            
            for line in lines:
                if not line.strip():
                    continue
                
                try:
                    # 解析JSON
                    if line.strip().startswith('{'):
                        event_data = json.loads(line)
                        
                        # 检查重复
                        if self._is_duplicate_event(event_data):
                            self.stats['duplicate_events'] += 1
                            continue
                        
                        # 创建事件对象
                        event = FalcoEvent.from_json(event_data)
                        events.append(event)
                        self.stats['processed_events'] += 1
                        
                        # 批量大小限制
                        if len(events) >= self.batch_size:
                            break
                            
                except json.JSONDecodeError as e:
                    logger.debug(f"JSON解析失败: {e}, 行内容: {line[:100]}...")
                except Exception as e:
                    logger.error(f"处理事件失败: {e}")
            
            # 保存读取状态
            if events:
                self._save_state()
            
            return events
            
        except Exception as e:
            logger.error(f"批量读取事件失败: {e}")
            return []
    
    async def read_events_continuous(self, callback, interval: float = 1.0):
        """连续读取事件"""
        logger.info(f"开始连续读取Falco事件，间隔: {interval}秒")
        
        while True:
            try:
                events = await self.read_events_batch()
                
                if events:
                    logger.debug(f"读取到 {len(events)} 个新事件")
                    for event in events:
                        try:
                            if asyncio.iscoroutinefunction(callback):
                                await callback(event)
                            else:
                                callback(event)
                        except Exception as e:
                            logger.error(f"事件回调处理失败: {e}")
                
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"连续读取过程中发生错误: {e}")
                await asyncio.sleep(interval * 2)  # 错误时延长等待时间
    
    def get_stats(self) -> Dict:
        """获取统计信息"""
        return {
            **self.stats,
            'file_position': self.file_position,
            'cache_sizes': {
                'processed_events': len(self.processed_events),
                'event_hashes': len(self.event_hashes),
                'read_buffer': len(self.read_buffer)
            },
            'config': {
                'max_cache_size': self.max_cache_size,
                'batch_size': self.batch_size,
                'min_read_interval': self.min_read_interval
            }
        }
    
    def clear_cache(self):
        """清理缓存"""
        self.processed_events.clear()
        self.event_hashes.clear()
        self.read_buffer.clear()
        logger.info("已清理数据完整性缓存")
    
    def is_duplicate_line(self, line: str) -> bool:
        """检查日志行是否重复（兼容方法）"""
        try:
            if not line.strip():
                return False
            
            # 计算行哈希
            line_hash = hashlib.md5(line.encode()).hexdigest()
            
            # 检查是否已存在
            if line_hash in self.event_hashes:
                return True
            
            # 添加到哈希集合
            self.event_hashes.add(line_hash)
            
            # 限制内存使用
            if len(self.event_hashes) > self.max_cache_size:
                old_hashes = list(self.event_hashes)[:len(self.event_hashes)//2]
                for old_hash in old_hashes:
                    self.event_hashes.discard(old_hash)
            
            return False
            
        except Exception as e:
            logger.error(f"检查重复行失败: {e}")
            return False
    
    async def validate_event(self, event) -> 'ValidationResult':
        """验证事件（兼容方法）"""
        try:
            if event is None:
                return ValidationResult(False, "事件为空")
            
            # 转换为字典格式
            if hasattr(event, 'to_dict'):
                event_data = event.to_dict()
            elif hasattr(event, '__dict__'):
                event_data = event.__dict__
            else:
                event_data = {}
            
            # 检查重复
            if self._is_duplicate_event(event_data):
                return ValidationResult(False, "重复事件")
            
            return ValidationResult(True)
            
        except Exception as e:
            logger.error(f"事件验证失败: {e}")
            return ValidationResult(False, f"验证异常: {str(e)}")
    
    async def validate_data_integrity(self, check_duration: int = 300) -> Dict:
        """验证数据完整性"""
        logger.info(f"开始数据完整性验证，持续 {check_duration} 秒")
        
        start_time = time.time()
        validation_stats = {
            'start_time': datetime.now().isoformat(),
            'events_validated': 0,
            'duplicates_found': 0,
            'integrity_score': 0.0,
            'recommendations': []
        }
        
        initial_stats = self.get_stats().copy()
        
        # 运行验证
        end_time = start_time + check_duration
        while time.time() < end_time:
            events = await self.read_events_batch()
            validation_stats['events_validated'] += len(events)
            await asyncio.sleep(1)
        
        final_stats = self.get_stats()
        
        # 计算完整性指标
        total_read = final_stats['total_read'] - initial_stats['total_read']
        duplicates = final_stats['duplicate_events'] - initial_stats['duplicate_events']
        processed = final_stats['processed_events'] - initial_stats['processed_events']
        
        # 初始化变量
        duplicate_rate = 0.0
        processing_rate = 0.0
        
        if total_read > 0:
            duplicate_rate = duplicates / total_read
            processing_rate = processed / total_read
            validation_stats['integrity_score'] = max(0, 1.0 - duplicate_rate) * processing_rate
        else:
            validation_stats['integrity_score'] = 1.0
        
        validation_stats['duplicates_found'] = duplicates
        
        # 生成建议
        if duplicate_rate > 0.1:
            validation_stats['recommendations'].append(
                f"重复率较高 ({duplicate_rate:.2%})，建议检查事件生成逻辑"
            )
        
        if final_stats['read_errors'] > initial_stats['read_errors']:
            validation_stats['recommendations'].append(
                "检测到读取错误，建议检查文件权限和磁盘空间"
            )
        
        if validation_stats['integrity_score'] < 0.9:
            validation_stats['recommendations'].append(
                "数据完整性得分较低，建议优化读取配置"
            )
        
        validation_stats['end_time'] = datetime.now().isoformat()
        logger.info(f"数据完整性验证完成，得分: {validation_stats['integrity_score']:.2f}")
        
        return validation_stats

# 全局数据完整性服务实例
data_integrity_service = FalcoDataIntegrityService()