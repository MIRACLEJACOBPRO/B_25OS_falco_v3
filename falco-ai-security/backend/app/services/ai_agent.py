#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - AI Agent Service
AI智能体服务，整合所有AI功能并提供统一的智能分析接口
"""

import logging
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from collections import defaultdict, deque

from app.config import settings
from app.services.falco_monitor import FalcoEvent
from app.services.neo4j_service import Neo4jService, BehaviorTriple
# from app.services.pinecone_service import PineconeService
from app.services.openai_service import OpenAIService, ThreatAnalysis, SecurityInsight

logger = logging.getLogger(__name__)

@dataclass
class AnalysisResult:
    """综合分析结果"""
    event_id: str
    threat_analysis: Optional[ThreatAnalysis]
    similar_events: List[Dict[str, Any]]
    behavior_context: List[Dict[str, Any]]
    risk_score: float
    analysis_timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'event_id': self.event_id,
            'threat_analysis': self.threat_analysis.to_dict() if self.threat_analysis else None,
            'similar_events': self.similar_events,
            'behavior_context': self.behavior_context,
            'risk_score': self.risk_score,
            'analysis_timestamp': self.analysis_timestamp.isoformat()
        }

@dataclass
class SecurityAlert:
    """安全告警"""
    alert_id: str
    severity: str  # low, medium, high, critical
    title: str
    description: str
    affected_hosts: List[str]
    event_count: int
    first_seen: datetime
    last_seen: datetime
    indicators: List[str]
    recommendations: List[str]
    status: str  # open, investigating, resolved, false_positive
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'alert_id': self.alert_id,
            'severity': self.severity,
            'title': self.title,
            'description': self.description,
            'affected_hosts': self.affected_hosts,
            'event_count': self.event_count,
            'first_seen': self.first_seen.isoformat(),
            'last_seen': self.last_seen.isoformat(),
            'indicators': self.indicators,
            'recommendations': self.recommendations,
            'status': self.status
        }

class AIAgentService:
    """AI智能体服务"""
    
    def __init__(self, neo4j_service: Neo4jService, 
                 # pinecone_service: PineconeService, 
                 openai_service: OpenAIService):
        self.neo4j_service = neo4j_service
        # self.pinecone_service = pinecone_service
        self.openai_service = openai_service
        
        # 事件缓存和分析队列
        self.event_queue = deque(maxlen=1000)
        self.analysis_cache = {}
        self.active_alerts = {}
        
        # 分析配置
        self.batch_size = settings.AI_BATCH_SIZE
        self.analysis_interval = settings.AI_ANALYSIS_INTERVAL
        self.similarity_threshold = settings.AI_SIMILARITY_THRESHOLD
        self.risk_threshold = settings.AI_RISK_THRESHOLD
        
        # 统计信息
        self.stats = {
            'events_processed': 0,
            'threats_detected': 0,
            'alerts_generated': 0,
            'analysis_errors': 0,
            'last_analysis_time': None
        }
        
        # 后台任务
        self.analysis_task = None
        self.is_running = False
    
    async def start(self):
        """启动AI智能体服务"""
        try:
            logger.info("启动AI智能体服务...")
            
            # 确保所有依赖服务已连接
            if not self.neo4j_service.is_connected:
                await self.neo4j_service.connect()
            
            # if not self.pinecone_service.is_connected:
            #     await self.pinecone_service.connect()
            
            if not self.openai_service.is_connected:
                await self.openai_service.connect()
            
            # 启动后台分析任务
            self.is_running = True
            self.analysis_task = asyncio.create_task(self._background_analysis())
            
            logger.info("AI智能体服务启动成功")
            
        except Exception as e:
            logger.error(f"启动AI智能体服务失败: {e}")
            raise
    
    async def stop(self):
        """停止AI智能体服务"""
        logger.info("停止AI智能体服务...")
        
        self.is_running = False
        
        if self.analysis_task:
            self.analysis_task.cancel()
            try:
                await self.analysis_task
            except asyncio.CancelledError:
                pass
        
        logger.info("AI智能体服务已停止")
    
    async def process_event(self, event: FalcoEvent) -> Optional[AnalysisResult]:
        """处理单个事件"""
        try:
            # 添加到事件队列
            self.event_queue.append(event)
            self.stats['events_processed'] += 1
            
            # 生成事件ID
            event_id = f"{event.hostname}_{event.timestamp.timestamp()}_{hash(event.message)}"
            
            # 检查缓存
            if event_id in self.analysis_cache:
                return self.analysis_cache[event_id]
            
            # 并行执行多种分析
            analysis_tasks = [
                self._analyze_threat(event),
                self._find_similar_events(event),
                self._analyze_behavior_context(event),
                self._store_event_data(event)
            ]
            
            results = await asyncio.gather(*analysis_tasks, return_exceptions=True)
            
            threat_analysis = results[0] if not isinstance(results[0], Exception) else None
            similar_events = results[1] if not isinstance(results[1], Exception) else []
            behavior_context = results[2] if not isinstance(results[2], Exception) else []
            
            # 计算风险评分
            risk_score = self._calculate_risk_score(event, threat_analysis, similar_events)
            
            # 创建分析结果
            analysis_result = AnalysisResult(
                event_id=event_id,
                threat_analysis=threat_analysis,
                similar_events=similar_events,
                behavior_context=behavior_context,
                risk_score=risk_score,
                analysis_timestamp=datetime.now()
            )
            
            # 缓存结果
            self.analysis_cache[event_id] = analysis_result
            
            # 检查是否需要生成告警
            if risk_score >= self.risk_threshold:
                await self._generate_alert(event, analysis_result)
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"处理事件失败: {e}")
            self.stats['analysis_errors'] += 1
            return None
    
    async def _analyze_threat(self, event: FalcoEvent) -> Optional[ThreatAnalysis]:
        """威胁分析"""
        try:
            return await self.openai_service.analyze_threat(event)
        except Exception as e:
            logger.error(f"威胁分析失败: {e}")
            return None
    
    async def _find_similar_events(self, event: FalcoEvent) -> List[Dict[str, Any]]:
        """查找相似事件"""
        try:
            # return await self.pinecone_service.find_similar_events(
            #     event, top_k=10, threshold=self.similarity_threshold
            # )
            return []
        except Exception as e:
            logger.error(f"查找相似事件失败: {e}")
            return []
    
    async def _analyze_behavior_context(self, event: FalcoEvent) -> List[Dict[str, Any]]:
        """分析行为上下文"""
        try:
            # 提取主体实体
            output_fields = event.output_fields
            entities = []
            
            if 'proc.name' in output_fields:
                entities.append(f"process:{output_fields['proc.name']}")
            if 'user.name' in output_fields:
                entities.append(f"user:{output_fields['user.name']}")
            if 'container.name' in output_fields:
                entities.append(f"container:{output_fields['container.name']}")
            
            # 查询相关行为
            all_behaviors = []
            for entity in entities:
                behaviors = await self.neo4j_service.query_related_behaviors(entity, depth=2)
                all_behaviors.extend(behaviors)
            
            return all_behaviors
            
        except Exception as e:
            logger.error(f"分析行为上下文失败: {e}")
            return []
    
    async def _store_event_data(self, event: FalcoEvent):
        """存储事件数据"""
        try:
            # 并行存储到Neo4j和Pinecone
            tasks = []
            
            # 存储到Neo4j
            triple = self.neo4j_service.extract_behavior_triple(event)
            if triple:
                tasks.append(self.neo4j_service.store_behavior_triple(triple))
            
            # 存储到Pinecone
            # tasks.append(self.pinecone_service.store_event_vector(event))
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
                
        except Exception as e:
            logger.error(f"存储事件数据失败: {e}")
    
    def _calculate_risk_score(self, event: FalcoEvent, 
                            threat_analysis: Optional[ThreatAnalysis],
                            similar_events: List[Dict[str, Any]]) -> float:
        """计算风险评分"""
        try:
            score = 0.0
            
            # 基础优先级评分
            priority_scores = {
                'Emergency': 1.0,
                'Alert': 0.9,
                'Critical': 0.8,
                'Error': 0.6,
                'Warning': 0.4,
                'Notice': 0.2,
                'Informational': 0.1,
                'Debug': 0.05
            }
            score += priority_scores.get(event.priority, 0.1) * 0.3
            
            # 威胁分析评分
            if threat_analysis:
                threat_scores = {
                    'critical': 1.0,
                    'high': 0.8,
                    'medium': 0.5,
                    'low': 0.2
                }
                threat_score = threat_scores.get(threat_analysis.threat_level, 0.2)
                confidence_weight = threat_analysis.confidence
                score += threat_score * confidence_weight * 0.4
            
            # 相似事件评分
            if similar_events:
                similarity_score = min(len(similar_events) / 10.0, 1.0)  # 最多10个相似事件
                avg_similarity = sum(event.get('score', 0) for event in similar_events) / len(similar_events)
                score += similarity_score * avg_similarity * 0.2
            
            # 时间因素（最近的事件权重更高）
            time_factor = 1.0  # 当前事件权重最高
            score *= time_factor
            
            # 规则特定评分
            rule_lower = event.rule.lower()
            if any(keyword in rule_lower for keyword in ['shell', 'exec', 'privilege']):
                score += 0.1
            if any(keyword in rule_lower for keyword in ['network', 'connect', 'outbound']):
                score += 0.05
            
            return min(score, 1.0)  # 确保评分不超过1.0
            
        except Exception as e:
            logger.error(f"计算风险评分失败: {e}")
            return 0.5  # 默认中等风险
    
    async def _generate_alert(self, event: FalcoEvent, analysis_result: AnalysisResult):
        """生成安全告警"""
        try:
            # 检查是否已有相似告警
            alert_key = f"{event.rule}_{event.hostname}"
            
            if alert_key in self.active_alerts:
                # 更新现有告警
                alert = self.active_alerts[alert_key]
                alert.event_count += 1
                alert.last_seen = datetime.now()
                
                # 更新受影响主机
                if event.hostname not in alert.affected_hosts:
                    alert.affected_hosts.append(event.hostname)
            else:
                # 创建新告警
                alert_id = f"alert_{datetime.now().timestamp()}_{hash(event.rule)}"
                
                # 确定严重程度
                severity = 'medium'
                if analysis_result.risk_score >= 0.8:
                    severity = 'critical'
                elif analysis_result.risk_score >= 0.6:
                    severity = 'high'
                elif analysis_result.risk_score >= 0.4:
                    severity = 'medium'
                else:
                    severity = 'low'
                
                # 生成告警标题和描述
                title = f"安全事件检测: {event.rule}"
                description = f"在主机 {event.hostname} 上检测到安全事件。风险评分: {analysis_result.risk_score:.2f}"
                
                if analysis_result.threat_analysis:
                    description += f"\n威胁类型: {analysis_result.threat_analysis.threat_type}"
                    description += f"\n威胁等级: {analysis_result.threat_analysis.threat_level}"
                
                # 收集指标
                indicators = [event.rule, event.hostname]
                if analysis_result.threat_analysis:
                    indicators.extend(analysis_result.threat_analysis.indicators)
                
                # 收集建议
                recommendations = ["立即调查此事件", "检查相关系统日志"]
                if analysis_result.threat_analysis:
                    recommendations.extend(analysis_result.threat_analysis.recommendations)
                
                alert = SecurityAlert(
                    alert_id=alert_id,
                    severity=severity,
                    title=title,
                    description=description,
                    affected_hosts=[event.hostname],
                    event_count=1,
                    first_seen=datetime.now(),
                    last_seen=datetime.now(),
                    indicators=list(set(indicators)),
                    recommendations=list(set(recommendations)),
                    status='open'
                )
                
                self.active_alerts[alert_key] = alert
                self.stats['alerts_generated'] += 1
                
                logger.warning(f"生成安全告警: {alert.title} (严重程度: {alert.severity})")
            
        except Exception as e:
            logger.error(f"生成告警失败: {e}")
    
    async def _background_analysis(self):
        """后台分析任务"""
        logger.info("启动后台分析任务")
        
        while self.is_running:
            try:
                # 批量模式分析
                if len(self.event_queue) >= self.batch_size:
                    await self._batch_analysis()
                
                # 定期分析任务
                await self._periodic_analysis()
                
                # 清理过期数据
                await self._cleanup_expired_data()
                
                # 更新统计信息
                self.stats['last_analysis_time'] = datetime.now().isoformat()
                
                # 等待下一个分析周期
                await asyncio.sleep(self.analysis_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"后台分析任务错误: {e}")
                await asyncio.sleep(5)  # 错误后短暂等待
        
        logger.info("后台分析任务已停止")
    
    async def _batch_analysis(self):
        """批量分析"""
        try:
            # 获取批量事件
            events = []
            for _ in range(min(self.batch_size, len(self.event_queue))):
                if self.event_queue:
                    events.append(self.event_queue.popleft())
            
            if not events:
                return
            
            # 模式分析
            pattern_result = await self.openai_service.analyze_event_pattern(events)
            if pattern_result and pattern_result.get('pattern_detected'):
                logger.info(f"检测到攻击模式: {pattern_result}")
                # 这里可以生成模式告警
            
            # 异常检测
            anomalies = await self.neo4j_service.detect_anomalies()
            if anomalies:
                logger.info(f"检测到 {len(anomalies)} 个异常行为")
            
        except Exception as e:
            logger.error(f"批量分析失败: {e}")
    
    async def _periodic_analysis(self):
        """定期分析"""
        try:
            # 生成安全洞察
            analysis_data = {
                'stats': self.stats,
                'active_alerts': len(self.active_alerts),
                'recent_events': len(self.event_queue)
            }
            
            insights = await self.openai_service.generate_security_insights(analysis_data)
            if insights:
                logger.info(f"生成了 {len(insights)} 个安全洞察")
            
        except Exception as e:
            logger.error(f"定期分析失败: {e}")
    
    async def _cleanup_expired_data(self):
        """清理过期数据"""
        try:
            # 清理过期的分析缓存
            current_time = datetime.now()
            expired_keys = []
            
            for key, result in self.analysis_cache.items():
                if (current_time - result.analysis_timestamp).total_seconds() > 3600:  # 1小时过期
                    expired_keys.append(key)
            
            for key in expired_keys:
                del self.analysis_cache[key]
            
            # 清理已解决的告警
            resolved_alerts = []
            for key, alert in self.active_alerts.items():
                if alert.status == 'resolved' and (current_time - alert.last_seen).total_seconds() > 86400:  # 24小时
                    resolved_alerts.append(key)
            
            for key in resolved_alerts:
                del self.active_alerts[key]
            
        except Exception as e:
            logger.error(f"清理过期数据失败: {e}")
    
    async def get_analysis_result(self, event_id: str) -> Optional[AnalysisResult]:
        """获取分析结果"""
        return self.analysis_cache.get(event_id)
    
    async def get_active_alerts(self) -> List[SecurityAlert]:
        """获取活跃告警"""
        return list(self.active_alerts.values())
    
    async def update_alert_status(self, alert_id: str, status: str) -> bool:
        """更新告警状态"""
        try:
            for alert in self.active_alerts.values():
                if alert.alert_id == alert_id:
                    alert.status = status
                    return True
            return False
        except Exception as e:
            logger.error(f"更新告警状态失败: {e}")
            return False
    
    async def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            **self.stats,
            'active_alerts_count': len(self.active_alerts),
            'cached_analyses_count': len(self.analysis_cache),
            'queue_size': len(self.event_queue),
            'is_running': self.is_running
        }

# 全局AI智能体服务实例（将在main.py中初始化）
ai_agent_service: Optional[AIAgentService] = None