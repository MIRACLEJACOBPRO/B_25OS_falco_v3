#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 实时日志处理管道

该模块负责整合Falco监控器和行为解析器，提供完整的日志处理流水线，
包括事件接收、解析、过滤、路由和存储等功能。

作者: Falco AI Security Team
版本: 1.0.0
创建时间: 2024-01-20
"""

import asyncio
import json
import time
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from enum import Enum
from collections import deque
import logging
from concurrent.futures import ThreadPoolExecutor
import threading
from queue import Queue, Empty

from .falco_monitor import FalcoMonitorService, FalcoEvent
from .behavior_parser import BehaviorParser, BehaviorTriplet
from .neo4j_service import Neo4jService
from .ai_agent import AIAgentService

logger = logging.getLogger(__name__)


class ProcessingStage(Enum):
    """处理阶段枚举"""
    RECEIVED = "received"
    PARSED = "parsed"
    FILTERED = "filtered"
    ENRICHED = "enriched"
    STORED = "stored"
    ANALYZED = "analyzed"
    COMPLETED = "completed"
    FAILED = "failed"


class EventPriority(Enum):
    """事件优先级枚举"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class ProcessingContext:
    """处理上下文"""
    event_id: str
    stage: ProcessingStage
    priority: EventPriority
    start_time: float
    processing_time: float = 0.0
    error_message: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def update_stage(self, stage: ProcessingStage, error_message: str = ""):
        """更新处理阶段"""
        self.stage = stage
        self.processing_time = time.time() - self.start_time
        if error_message:
            self.error_message = error_message


@dataclass
class PipelineEvent:
    """管道事件"""
    falco_event: FalcoEvent
    triplets: List[BehaviorTriplet] = field(default_factory=list)
    context: ProcessingContext = None
    enriched_data: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if self.context is None:
            priority = self._determine_priority()
            self.context = ProcessingContext(
                event_id=f"{self.falco_event.timestamp}_{hash(self.falco_event.output)}",
                stage=ProcessingStage.RECEIVED,
                priority=priority,
                start_time=time.time()
            )
    
    def _determine_priority(self) -> EventPriority:
        """根据Falco事件确定优先级"""
        priority_map = {
            "EMERGENCY": EventPriority.CRITICAL,
            "ALERT": EventPriority.CRITICAL,
            "CRITICAL": EventPriority.CRITICAL,
            "ERROR": EventPriority.HIGH,
            "WARNING": EventPriority.MEDIUM,
            "NOTICE": EventPriority.LOW,
            "INFO": EventPriority.LOW,
            "DEBUG": EventPriority.LOW
        }
        return priority_map.get(self.falco_event.priority.upper(), EventPriority.MEDIUM)


class EventFilter:
    """事件过滤器"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.whitelist_rules = self.config.get("whitelist_rules", [])
        self.blacklist_rules = self.config.get("blacklist_rules", [])
        self.min_priority = self.config.get("min_priority", "INFO")
        self.rate_limits = self.config.get("rate_limits", {})
        self.event_counts = {}
        self.last_reset = time.time()
    
    def should_process(self, event: PipelineEvent) -> bool:
        """判断事件是否应该被处理"""
        try:
            # 检查优先级过滤
            if not self._check_priority_filter(event):
                return False
            
            # 检查规则过滤
            if not self._check_rule_filter(event):
                return False
            
            # 检查速率限制
            if not self._check_rate_limit(event):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"事件过滤失败: {e}")
            return True  # 出错时默认处理
    
    def _check_priority_filter(self, event: PipelineEvent) -> bool:
        """检查优先级过滤"""
        priority_levels = {
            "DEBUG": 0, "INFO": 1, "NOTICE": 2, "WARNING": 3,
            "ERROR": 4, "CRITICAL": 5, "ALERT": 6, "EMERGENCY": 7
        }
        
        event_level = priority_levels.get(event.falco_event.priority.upper(), 1)
        min_level = priority_levels.get(self.min_priority.upper(), 1)
        
        return event_level >= min_level
    
    def _check_rule_filter(self, event: PipelineEvent) -> bool:
        """检查规则过滤"""
        rule_name = event.falco_event.rule
        
        # 检查黑名单
        if rule_name in self.blacklist_rules:
            return False
        
        # 检查白名单（如果配置了白名单）
        if self.whitelist_rules and rule_name not in self.whitelist_rules:
            return False
        
        return True
    
    def _check_rate_limit(self, event: PipelineEvent) -> bool:
        """检查速率限制"""
        current_time = time.time()
        
        # 每分钟重置计数器
        if current_time - self.last_reset > 60:
            self.event_counts.clear()
            self.last_reset = current_time
        
        rule_name = event.falco_event.rule
        limit = self.rate_limits.get(rule_name, self.rate_limits.get("default", 100))
        
        current_count = self.event_counts.get(rule_name, 0)
        if current_count >= limit:
            return False
        
        self.event_counts[rule_name] = current_count + 1
        return True


class EventEnricher:
    """事件增强器"""
    
    def __init__(self, neo4j_service: Neo4jService = None):
        self.neo4j_service = neo4j_service
        self.process_cache = {}  # 进程信息缓存
        self.file_cache = {}     # 文件信息缓存
    
    async def enrich_event(self, event: PipelineEvent) -> PipelineEvent:
        """增强事件信息"""
        try:
            # 添加系统上下文信息
            event.enriched_data["system_context"] = await self._get_system_context(event)
            
            # 添加历史行为信息
            if self.neo4j_service:
                event.enriched_data["historical_behavior"] = await self._get_historical_behavior(event)
            
            # 添加进程族谱信息
            event.enriched_data["process_lineage"] = await self._get_process_lineage(event)
            
            # 添加文件上下文信息
            event.enriched_data["file_context"] = await self._get_file_context(event)
            
            # 添加网络上下文信息
            event.enriched_data["network_context"] = await self._get_network_context(event)
            
            event.context.update_stage(ProcessingStage.ENRICHED)
            return event
            
        except Exception as e:
            logger.error(f"事件增强失败: {e}")
            event.context.update_stage(ProcessingStage.ENRICHED, str(e))
            return event
    
    async def _get_system_context(self, event: PipelineEvent) -> Dict[str, Any]:
        """获取系统上下文信息"""
        return {
            "hostname": "localhost",  # 实际应该从系统获取
            "timestamp": event.falco_event.timestamp,
            "kernel_version": "unknown",  # 实际应该从系统获取
            "container_runtime": "docker"  # 实际应该检测
        }
    
    async def _get_historical_behavior(self, event: PipelineEvent) -> Dict[str, Any]:
        """获取历史行为信息"""
        if not self.neo4j_service:
            return {}
        
        try:
            # 查询相关的历史行为
            related_behaviors = await self.neo4j_service.query_related_behaviors(
                event.triplets[0] if event.triplets else None
            )
            
            return {
                "related_count": len(related_behaviors),
                "recent_behaviors": related_behaviors[:5],  # 最近5个相关行为
                "behavior_frequency": self._calculate_behavior_frequency(related_behaviors)
            }
            
        except Exception as e:
            logger.error(f"获取历史行为失败: {e}")
            return {}
    
    async def _get_process_lineage(self, event: PipelineEvent) -> Dict[str, Any]:
        """获取进程族谱信息"""
        # 这里应该实现进程族谱查询逻辑
        return {
            "parent_processes": [],
            "child_processes": [],
            "process_tree_depth": 0
        }
    
    async def _get_file_context(self, event: PipelineEvent) -> Dict[str, Any]:
        """获取文件上下文信息"""
        # 这里应该实现文件上下文查询逻辑
        return {
            "file_permissions": "unknown",
            "file_owner": "unknown",
            "file_size": 0,
            "file_type": "unknown"
        }
    
    async def _get_network_context(self, event: PipelineEvent) -> Dict[str, Any]:
        """获取网络上下文信息"""
        # 这里应该实现网络上下文查询逻辑
        return {
            "local_interfaces": [],
            "active_connections": [],
            "listening_ports": []
        }
    
    def _calculate_behavior_frequency(self, behaviors: List[Dict]) -> Dict[str, int]:
        """计算行为频率"""
        frequency = {}
        for behavior in behaviors:
            action = behavior.get("action", "unknown")
            frequency[action] = frequency.get(action, 0) + 1
        return frequency


class LogPipeline:
    """日志处理管道"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.is_running = False
        self.event_queue = Queue(maxsize=self.config.get("queue_size", 200))
        self.processed_events = deque(maxlen=self.config.get("history_size", 1000))
        
        # 初始化组件
        self.falco_monitor = FalcoMonitorService()
        self.behavior_parser = BehaviorParser()
        self.event_filter = EventFilter(self.config.get("filter_config", {}))
        self.event_enricher = EventEnricher()
        
        # 外部服务（需要在启动时注入）
        self.neo4j_service: Optional[Neo4jService] = None
        self.ai_agent: Optional[AIAgentService] = None
        
        # 线程池
        self.thread_pool = ThreadPoolExecutor(
            max_workers=self.config.get("worker_threads", 2)
        )
        
        # 统计信息
        self.stats = {
            "events_received": 0,
            "events_processed": 0,
            "events_filtered": 0,
            "events_failed": 0,
            "processing_times": deque(maxlen=1000)
        }
        
        # 事件回调
        self.event_callbacks: List[Callable] = []
    
    def set_services(self, neo4j_service: Neo4jService = None, ai_agent: AIAgentService = None):
        """设置外部服务"""
        if neo4j_service:
            self.neo4j_service = neo4j_service
            self.event_enricher.neo4j_service = neo4j_service
        
        if ai_agent:
            self.ai_agent = ai_agent
    
    def add_event_callback(self, callback: Callable[[PipelineEvent], None]):
        """添加事件回调函数"""
        self.event_callbacks.append(callback)
    
    async def start(self):
        """启动管道"""
        if self.is_running:
            logger.warning("管道已经在运行中")
            return
        
        logger.info("启动日志处理管道...")
        self.is_running = True
        
        try:
            # 启动Falco监控
            await self.falco_monitor.start()
            self.falco_monitor.add_event_callback(self._on_falco_event)
            
            # 启动处理任务
            asyncio.create_task(self._process_events())
            
            logger.info("日志处理管道启动成功")
            
        except Exception as e:
            logger.error(f"启动管道失败: {e}")
            self.is_running = False
            raise
    
    async def stop(self):
        """停止管道"""
        if not self.is_running:
            return
        
        logger.info("停止日志处理管道...")
        self.is_running = False
        
        try:
            # 停止Falco监控
            await self.falco_monitor.stop()
            
            # 等待队列处理完成
            timeout = 5.0  # 最多等待5秒
            start_time = time.time()
            while not self.event_queue.empty() and (time.time() - start_time) < timeout:
                await asyncio.sleep(0.1)
            
            # 关闭线程池
            self.thread_pool.shutdown(wait=True)
            
            logger.info("日志处理管道已停止")
            
        except Exception as e:
            logger.error(f"停止管道失败: {e}")
    
    def _on_falco_event(self, falco_event: FalcoEvent):
        """Falco事件回调"""
        try:
            pipeline_event = PipelineEvent(falco_event=falco_event)
            
            # 尝试将事件加入队列
            try:
                self.event_queue.put_nowait(pipeline_event)
                self.stats["events_received"] += 1
            except:
                logger.warning("事件队列已满，丢弃事件")
                
        except Exception as e:
            logger.error(f"处理Falco事件失败: {e}")
    
    async def _process_events(self):
        """处理事件主循环"""
        logger.info("开始处理事件...")
        
        while self.is_running:
            try:
                # 从队列获取事件
                try:
                    event = self.event_queue.get(timeout=0.5)
                except Empty:
                    continue
                
                # 添加处理间隔以降低CPU占用
                await asyncio.sleep(0.01)
                
                # 处理事件
                await self._process_single_event(event)
                
            except Exception as e:
                logger.error(f"处理事件循环异常: {e}")
                await asyncio.sleep(1.0)
    
    async def _process_single_event(self, event: PipelineEvent):
        """处理单个事件"""
        try:
            # 阶段1: 解析事件
            event.triplets = self.behavior_parser.parse_falco_event(
                event.falco_event.to_dict()
            )
            event.context.update_stage(ProcessingStage.PARSED)
            
            # 阶段2: 过滤事件
            if not self.event_filter.should_process(event):
                event.context.update_stage(ProcessingStage.FILTERED, "事件被过滤")
                self.stats["events_filtered"] += 1
                return
            
            event.context.update_stage(ProcessingStage.FILTERED)
            
            # 阶段3: 增强事件
            event = await self.event_enricher.enrich_event(event)
            
            # 阶段4: 存储到Neo4j
            if self.neo4j_service and event.triplets:
                try:
                    for triplet in event.triplets:
                        await self.neo4j_service.store_behavior_triplet(triplet)
                    event.context.update_stage(ProcessingStage.STORED)
                except Exception as e:
                    logger.error(f"存储到Neo4j失败: {e}")
                    event.context.update_stage(ProcessingStage.STORED, str(e))
            
            # 阶段5: AI分析
            if self.ai_agent:
                try:
                    # 异步提交AI分析任务
                    asyncio.create_task(self._analyze_with_ai(event))
                    event.context.update_stage(ProcessingStage.ANALYZED)
                except Exception as e:
                    logger.error(f"AI分析失败: {e}")
                    event.context.update_stage(ProcessingStage.ANALYZED, str(e))
            
            # 阶段6: 完成处理
            event.context.update_stage(ProcessingStage.COMPLETED)
            
            # 调用回调函数
            for callback in self.event_callbacks:
                try:
                    callback(event)
                except Exception as e:
                    logger.error(f"事件回调失败: {e}")
            
            # 更新统计信息
            self.stats["events_processed"] += 1
            self.stats["processing_times"].append(event.context.processing_time)
            
            # 保存到历史记录
            self.processed_events.append(event)
            
        except Exception as e:
            logger.error(f"处理事件失败: {e}")
            event.context.update_stage(ProcessingStage.FAILED, str(e))
            self.stats["events_failed"] += 1
    
    async def _analyze_with_ai(self, event: PipelineEvent):
        """使用AI分析事件"""
        try:
            if self.ai_agent:
                await self.ai_agent.process_event(event.falco_event)
        except Exception as e:
            logger.error(f"AI分析异常: {e}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取管道统计信息"""
        processing_times = list(self.stats["processing_times"])
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
        
        return {
            "is_running": self.is_running,
            "queue_size": self.event_queue.qsize(),
            "events_received": self.stats["events_received"],
            "events_processed": self.stats["events_processed"],
            "events_filtered": self.stats["events_filtered"],
            "events_failed": self.stats["events_failed"],
            "avg_processing_time": avg_processing_time,
            "processed_events_count": len(self.processed_events)
        }
    
    def get_recent_events(self, limit: int = 100) -> List[Dict[str, Any]]:
        """获取最近处理的事件"""
        recent = list(self.processed_events)[-limit:]
        return [{
            "event_id": event.context.event_id,
            "stage": event.context.stage.value,
            "priority": event.context.priority.value,
            "processing_time": event.context.processing_time,
            "rule": event.falco_event.rule,
            "timestamp": event.falco_event.timestamp,
            "triplets_count": len(event.triplets),
            "error_message": event.context.error_message
        } for event in recent]
    
    def clear_history(self):
        """清空历史记录"""
        self.processed_events.clear()
        self.stats = {
            "events_received": 0,
            "events_processed": 0,
            "events_filtered": 0,
            "events_failed": 0,
            "processing_times": deque(maxlen=1000)
        }


# 测试函数
if __name__ == "__main__":
    import asyncio
    
    async def test_pipeline():
        # 创建管道配置
        config = {
            "queue_size": 100,
            "worker_threads": 2,
            "filter_config": {
                "min_priority": "WARNING",
                "rate_limits": {
                    "default": 50
                }
            }
        }
        
        # 创建管道实例
        pipeline = LogPipeline(config)
        
        # 添加事件回调
        def on_event_processed(event: PipelineEvent):
            print(f"事件处理完成: {event.context.event_id} - {event.context.stage.value}")
        
        pipeline.add_event_callback(on_event_processed)
        
        try:
            # 启动管道
            await pipeline.start()
            
            # 运行一段时间
            await asyncio.sleep(10)
            
            # 输出统计信息
            stats = pipeline.get_statistics()
            print(f"管道统计: {stats}")
            
        finally:
            # 停止管道
            await pipeline.stop()
    
    # 运行测试
    asyncio.run(test_pipeline())

# 为了兼容性，创建LogPipelineService别名
LogPipelineService = LogPipeline