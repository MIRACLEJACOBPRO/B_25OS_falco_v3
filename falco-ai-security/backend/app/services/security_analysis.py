#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 安全事件分析服务

该模块实现基于AI的安全事件分析功能，包括威胁检测、风险评估、
事件响应建议等核心安全分析能力。

作者: Falco AI Security Team
版本: 1.0.0
创建时间: 2024-01-20
"""

import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum

from ..clients.openai_client import OpenAIClient
from ..templates.prompts import (
    PromptManager, PromptType,
    get_security_analysis_prompt,
    get_threat_detection_prompt,
    get_incident_response_prompt,
    get_risk_assessment_prompt,
    get_behavior_analysis_prompt,
    get_alert_investigation_prompt
)
from ..services.vector_retrieval import VectorRetrieval
from ..services.graph_operations import GraphOperations
from ..services.behavior_analysis import BehaviorAnalysis


class AnalysisStatus(Enum):
    """分析状态"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ConfidenceLevel(Enum):
    """置信度等级"""
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


@dataclass
class AnalysisRequest:
    """分析请求"""
    request_id: str
    analysis_type: PromptType
    event_data: Dict[str, Any]
    context_data: Optional[Dict[str, Any]] = None
    priority: str = "medium"
    requester: str = "system"
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


@dataclass
class AnalysisResult:
    """分析结果"""
    request_id: str
    analysis_type: PromptType
    status: AnalysisStatus
    result_data: Optional[Dict[str, Any]] = None
    confidence_score: float = 0.0
    confidence_level: ConfidenceLevel = ConfidenceLevel.LOW
    error_message: Optional[str] = None
    processing_time: float = 0.0
    timestamp: datetime = None
    rag_context_used: bool = False
    graph_data_used: bool = False
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        result = asdict(self)
        result['analysis_type'] = self.analysis_type.value
        result['status'] = self.status.value
        result['confidence_level'] = self.confidence_level.value
        result['timestamp'] = self.timestamp.isoformat()
        return result


@dataclass
class SecurityInsight:
    """安全洞察"""
    insight_type: str
    title: str
    description: str
    severity: str
    confidence: float
    recommendations: List[str]
    evidence: List[str]
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


class SecurityAnalysis:
    """安全事件分析服务"""
    
    def __init__(self, 
                 openai_client: OpenAIClient,
                 vector_retrieval: Optional[VectorRetrieval] = None,
                 graph_operations: Optional[GraphOperations] = None,
                 behavior_analysis: Optional[BehaviorAnalysis] = None):
        """初始化安全分析服务"""
        self.openai_client = openai_client
        self.vector_retrieval = vector_retrieval
        self.graph_operations = graph_operations
        self.behavior_analysis = behavior_analysis
        self.prompt_manager = PromptManager()
        self.logger = logging.getLogger(__name__)
        
        # 分析历史记录
        self.analysis_history: List[AnalysisResult] = []
        self.insights_cache: Dict[str, List[SecurityInsight]] = {}
        
        # 配置参数
        self.max_rag_context_length = 4000
        self.max_graph_context_nodes = 50
        self.confidence_threshold = 0.7
        self.cache_ttl_hours = 24
    
    async def analyze_security_event(self, 
                                   event_data: Dict[str, Any],
                                   context_data: Optional[Dict[str, Any]] = None,
                                   use_rag: bool = True,
                                   use_graph: bool = True) -> AnalysisResult:
        """分析安全事件"""
        request_id = f"sec_analysis_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        start_time = datetime.utcnow()
        
        try:
            self.logger.info(f"开始安全事件分析: {request_id}")
            
            # 构建分析上下文
            analysis_context = await self._build_analysis_context(
                event_data, context_data, use_rag, use_graph
            )
            
            # 生成分析提示
            prompt = get_security_analysis_prompt(
                event_details=json.dumps(event_data, ensure_ascii=False, indent=2),
                context_info=json.dumps(context_data or {}, ensure_ascii=False, indent=2),
                rag_context=analysis_context.get('rag_context', ''),
                historical_data=analysis_context.get('historical_data', '')
            )
            
            # 调用AI分析
            ai_response = await self.openai_client.chat_completion(
                messages=[
                    {"role": "system", "content": "你是一个专业的网络安全分析师。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=2000
            )
            
            # 解析AI响应
            result_data = self._parse_ai_response(ai_response)
            
            # 计算置信度
            confidence_score = self._calculate_confidence(result_data, analysis_context)
            confidence_level = self._get_confidence_level(confidence_score)
            
            # 创建分析结果
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            analysis_result = AnalysisResult(
                request_id=request_id,
                analysis_type=PromptType.SECURITY_ANALYSIS,
                status=AnalysisStatus.COMPLETED,
                result_data=result_data,
                confidence_score=confidence_score,
                confidence_level=confidence_level,
                processing_time=processing_time,
                rag_context_used=use_rag and bool(analysis_context.get('rag_context')),
                graph_data_used=use_graph and bool(analysis_context.get('graph_context'))
            )
            
            # 保存分析历史
            self.analysis_history.append(analysis_result)
            
            # 生成安全洞察
            await self._generate_security_insights(analysis_result)
            
            self.logger.info(f"安全事件分析完成: {request_id}, 置信度: {confidence_score:.2f}")
            return analysis_result
            
        except Exception as e:
            self.logger.error(f"安全事件分析失败: {request_id}, 错误: {str(e)}")
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            return AnalysisResult(
                request_id=request_id,
                analysis_type=PromptType.SECURITY_ANALYSIS,
                status=AnalysisStatus.FAILED,
                error_message=str(e),
                processing_time=processing_time
            )
    
    async def detect_threats(self, 
                           behavior_data: Dict[str, Any],
                           system_context: Dict[str, Any]) -> AnalysisResult:
        """威胁检测"""
        request_id = f"threat_detect_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        start_time = datetime.utcnow()
        
        try:
            self.logger.info(f"开始威胁检测: {request_id}")
            
            # 获取威胁情报和基线行为
            threat_intel = await self._get_threat_intelligence(behavior_data)
            baseline_behavior = await self._get_baseline_behavior(system_context)
            
            # 生成威胁检测提示
            prompt = get_threat_detection_prompt(
                behavior_data=json.dumps(behavior_data, ensure_ascii=False, indent=2),
                system_context=json.dumps(system_context, ensure_ascii=False, indent=2),
                threat_intel=threat_intel,
                baseline_behavior=baseline_behavior
            )
            
            # 调用AI分析
            ai_response = await self.openai_client.chat_completion(
                messages=[
                    {"role": "system", "content": "你是一个威胁检测专家。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1500
            )
            
            # 解析结果
            result_data = self._parse_ai_response(ai_response)
            confidence_score = result_data.get('confidence_score', 0.5)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            analysis_result = AnalysisResult(
                request_id=request_id,
                analysis_type=PromptType.THREAT_DETECTION,
                status=AnalysisStatus.COMPLETED,
                result_data=result_data,
                confidence_score=confidence_score,
                confidence_level=self._get_confidence_level(confidence_score),
                processing_time=processing_time
            )
            
            self.analysis_history.append(analysis_result)
            
            self.logger.info(f"威胁检测完成: {request_id}")
            return analysis_result
            
        except Exception as e:
            self.logger.error(f"威胁检测失败: {request_id}, 错误: {str(e)}")
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            return AnalysisResult(
                request_id=request_id,
                analysis_type=PromptType.THREAT_DETECTION,
                status=AnalysisStatus.FAILED,
                error_message=str(e),
                processing_time=processing_time
            )
    
    async def generate_incident_response(self, 
                                       incident_details: Dict[str, Any],
                                       incident_type: str) -> AnalysisResult:
        """生成事件响应计划"""
        request_id = f"incident_resp_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        start_time = datetime.utcnow()
        
        try:
            self.logger.info(f"开始生成事件响应计划: {request_id}")
            
            # 获取相关系统和业务影响信息
            affected_systems = incident_details.get('affected_systems', [])
            business_impact = await self._assess_business_impact(affected_systems)
            available_resources = await self._get_available_resources()
            
            # 生成事件响应提示
            prompt = get_incident_response_prompt(
                incident_details=json.dumps(incident_details, ensure_ascii=False, indent=2),
                incident_type=incident_type,
                affected_systems=json.dumps(affected_systems, ensure_ascii=False),
                business_impact=business_impact,
                available_resources=available_resources
            )
            
            # 调用AI分析
            ai_response = await self.openai_client.chat_completion(
                messages=[
                    {"role": "system", "content": "你是一个事件响应专家。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=2500
            )
            
            # 解析结果
            result_data = self._parse_ai_response(ai_response)
            confidence_score = 0.8  # 事件响应计划通常有较高置信度
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            analysis_result = AnalysisResult(
                request_id=request_id,
                analysis_type=PromptType.INCIDENT_RESPONSE,
                status=AnalysisStatus.COMPLETED,
                result_data=result_data,
                confidence_score=confidence_score,
                confidence_level=self._get_confidence_level(confidence_score),
                processing_time=processing_time
            )
            
            self.analysis_history.append(analysis_result)
            
            self.logger.info(f"事件响应计划生成完成: {request_id}")
            return analysis_result
            
        except Exception as e:
            self.logger.error(f"事件响应计划生成失败: {request_id}, 错误: {str(e)}")
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            return AnalysisResult(
                request_id=request_id,
                analysis_type=PromptType.INCIDENT_RESPONSE,
                status=AnalysisStatus.FAILED,
                error_message=str(e),
                processing_time=processing_time
            )
    
    async def investigate_alert(self, 
                              alert_details: Dict[str, Any],
                              rule_info: Dict[str, Any]) -> AnalysisResult:
        """调查安全告警"""
        request_id = f"alert_invest_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        start_time = datetime.utcnow()
        
        try:
            self.logger.info(f"开始告警调查: {request_id}")
            
            # 获取相关事件和系统状态
            related_events = await self._get_related_events(alert_details)
            system_state = await self._get_system_state(alert_details)
            user_context = await self._get_user_context(alert_details)
            
            # 生成告警调查提示
            prompt = get_alert_investigation_prompt(
                alert_details=json.dumps(alert_details, ensure_ascii=False, indent=2),
                rule_info=json.dumps(rule_info, ensure_ascii=False, indent=2),
                related_events=json.dumps(related_events, ensure_ascii=False),
                system_state=json.dumps(system_state, ensure_ascii=False),
                user_context=json.dumps(user_context, ensure_ascii=False)
            )
            
            # 调用AI分析
            ai_response = await self.openai_client.chat_completion(
                messages=[
                    {"role": "system", "content": "你是一个告警调查专家。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1800
            )
            
            # 解析结果
            result_data = self._parse_ai_response(ai_response)
            confidence_score = result_data.get('investigation_confidence', 0.6)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            analysis_result = AnalysisResult(
                request_id=request_id,
                analysis_type=PromptType.ALERT_INVESTIGATION,
                status=AnalysisStatus.COMPLETED,
                result_data=result_data,
                confidence_score=confidence_score,
                confidence_level=self._get_confidence_level(confidence_score),
                processing_time=processing_time
            )
            
            self.analysis_history.append(analysis_result)
            
            self.logger.info(f"告警调查完成: {request_id}")
            return analysis_result
            
        except Exception as e:
            self.logger.error(f"告警调查失败: {request_id}, 错误: {str(e)}")
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            return AnalysisResult(
                request_id=request_id,
                analysis_type=PromptType.ALERT_INVESTIGATION,
                status=AnalysisStatus.FAILED,
                error_message=str(e),
                processing_time=processing_time
            )
    
    async def _build_analysis_context(self, 
                                    event_data: Dict[str, Any],
                                    context_data: Optional[Dict[str, Any]],
                                    use_rag: bool,
                                    use_graph: bool) -> Dict[str, Any]:
        """构建分析上下文"""
        context = {}
        
        # RAG上下文
        if use_rag and self.vector_retrieval:
            try:
                # 构建查询文本
                query_text = self._build_rag_query(event_data)
                
                # 检索相关知识
                search_results = await self.vector_retrieval.search_documents(
                    query=query_text,
                    top_k=5,
                    min_score=0.7
                )
                
                # 构建RAG上下文
                rag_context = "\n".join([
                    f"文档: {result.metadata.get('title', 'Unknown')}\n内容: {result.content}"
                    for result in search_results.results[:3]
                ])
                
                context['rag_context'] = rag_context[:self.max_rag_context_length]
                
            except Exception as e:
                self.logger.warning(f"RAG上下文构建失败: {str(e)}")
                context['rag_context'] = ""
        
        # 图数据上下文
        if use_graph and self.graph_operations:
            try:
                # 获取相关图数据
                graph_context = await self._get_graph_context(event_data)
                context['graph_context'] = graph_context
                
            except Exception as e:
                self.logger.warning(f"图数据上下文构建失败: {str(e)}")
                context['graph_context'] = {}
        
        # 历史数据
        historical_data = self._get_historical_context(event_data)
        context['historical_data'] = historical_data
        
        return context
    
    def _build_rag_query(self, event_data: Dict[str, Any]) -> str:
        """构建RAG查询文本"""
        query_parts = []
        
        # 事件类型
        if 'rule' in event_data:
            query_parts.append(f"rule: {event_data['rule']}")
        
        # 进程信息
        if 'proc' in event_data:
            proc = event_data['proc']
            if 'name' in proc:
                query_parts.append(f"process: {proc['name']}")
            if 'cmdline' in proc:
                query_parts.append(f"command: {proc['cmdline']}")
        
        # 文件信息
        if 'file' in event_data:
            file_info = event_data['file']
            if 'path' in file_info:
                query_parts.append(f"file: {file_info['path']}")
        
        # 网络信息
        if 'connection' in event_data:
            conn = event_data['connection']
            if 'dest' in conn:
                query_parts.append(f"network: {conn['dest']}")
        
        return " ".join(query_parts)
    
    async def _get_graph_context(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """获取图数据上下文"""
        if not self.graph_operations:
            return {}
        
        try:
            # 根据事件数据查找相关节点
            related_nodes = []
            
            # 查找进程节点
            if 'proc' in event_data and 'pid' in event_data['proc']:
                pid = event_data['proc']['pid']
                nodes = await self.graph_operations.find_nodes_by_type(
                    "ProcessNode", 
                    limit=10
                )
                related_nodes.extend(nodes.nodes[:5])
            
            # 查找文件节点
            if 'file' in event_data and 'path' in event_data['file']:
                file_path = event_data['file']['path']
                nodes = await self.graph_operations.find_nodes_by_type(
                    "FileNode",
                    limit=10
                )
                related_nodes.extend(nodes.nodes[:5])
            
            return {
                "related_nodes": len(related_nodes),
                "node_summary": [node.get('name', 'Unknown') for node in related_nodes[:5]]
            }
            
        except Exception as e:
            self.logger.warning(f"获取图数据上下文失败: {str(e)}")
            return {}
    
    def _get_historical_context(self, event_data: Dict[str, Any]) -> str:
        """获取历史上下文"""
        # 查找相似的历史分析
        similar_analyses = []
        
        for analysis in self.analysis_history[-10:]:  # 最近10次分析
            if (analysis.status == AnalysisStatus.COMPLETED and 
                analysis.result_data and
                analysis.confidence_score > 0.7):
                similar_analyses.append({
                    "type": analysis.analysis_type.value,
                    "confidence": analysis.confidence_score,
                    "summary": analysis.result_data.get('analysis_summary', '')
                })
        
        if similar_analyses:
            return json.dumps(similar_analyses, ensure_ascii=False, indent=2)
        else:
            return "无相关历史数据"
    
    def _parse_ai_response(self, response: str) -> Dict[str, Any]:
        """解析AI响应"""
        try:
            # 尝试直接解析JSON
            return json.loads(response)
        except json.JSONDecodeError:
            # 如果不是有效JSON，尝试提取JSON部分
            try:
                start_idx = response.find('{')
                end_idx = response.rfind('}') + 1
                if start_idx != -1 and end_idx != 0:
                    json_str = response[start_idx:end_idx]
                    return json.loads(json_str)
            except:
                pass
            
            # 如果无法解析，返回原始响应
            return {
                "raw_response": response,
                "analysis_summary": "AI响应解析失败",
                "confidence_score": 0.3
            }
    
    def _calculate_confidence(self, 
                            result_data: Dict[str, Any], 
                            context: Dict[str, Any]) -> float:
        """计算置信度"""
        base_confidence = result_data.get('confidence_score', 0.5)
        
        # 根据上下文调整置信度
        confidence_adjustments = 0.0
        
        # RAG上下文加成
        if context.get('rag_context'):
            confidence_adjustments += 0.1
        
        # 图数据上下文加成
        if context.get('graph_context', {}).get('related_nodes', 0) > 0:
            confidence_adjustments += 0.1
        
        # 历史数据加成
        if "无相关历史数据" not in context.get('historical_data', ''):
            confidence_adjustments += 0.05
        
        # 确保置信度在0-1范围内
        final_confidence = min(1.0, max(0.0, base_confidence + confidence_adjustments))
        
        return round(final_confidence, 3)
    
    def _get_confidence_level(self, confidence_score: float) -> ConfidenceLevel:
        """获取置信度等级"""
        if confidence_score >= 0.9:
            return ConfidenceLevel.VERY_HIGH
        elif confidence_score >= 0.75:
            return ConfidenceLevel.HIGH
        elif confidence_score >= 0.5:
            return ConfidenceLevel.MEDIUM
        elif confidence_score >= 0.25:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.VERY_LOW
    
    async def _get_threat_intelligence(self, behavior_data: Dict[str, Any]) -> str:
        """获取威胁情报"""
        # 这里可以集成外部威胁情报源
        # 目前返回模拟数据
        return "当前威胁情报: 检测到针对类似系统的攻击活动增加"
    
    async def _get_baseline_behavior(self, system_context: Dict[str, Any]) -> str:
        """获取基线行为"""
        # 这里可以从行为分析服务获取基线
        if self.behavior_analysis:
            try:
                # 获取系统基线行为
                return "系统基线行为: 正常网络连接模式，标准进程执行模式"
            except:
                pass
        
        return "基线行为数据不可用"
    
    async def _assess_business_impact(self, affected_systems: List[str]) -> str:
        """评估业务影响"""
        if not affected_systems:
            return "业务影响: 低"
        
        # 根据受影响系统评估业务影响
        critical_systems = ['database', 'web-server', 'auth-server']
        
        for system in affected_systems:
            if any(critical in system.lower() for critical in critical_systems):
                return "业务影响: 高 - 关键系统受影响"
        
        return "业务影响: 中等"
    
    async def _get_available_resources(self) -> str:
        """获取可用资源"""
        return "可用资源: 安全团队24/7值班，自动化响应工具，备份系统"
    
    async def _get_related_events(self, alert_details: Dict[str, Any]) -> List[Dict[str, Any]]:
        """获取相关事件"""
        # 这里可以查询日志系统获取相关事件
        return []
    
    async def _get_system_state(self, alert_details: Dict[str, Any]) -> Dict[str, Any]:
        """获取系统状态"""
        return {
            "cpu_usage": "normal",
            "memory_usage": "normal",
            "network_status": "active",
            "disk_usage": "normal"
        }
    
    async def _get_user_context(self, alert_details: Dict[str, Any]) -> Dict[str, Any]:
        """获取用户上下文"""
        return {
            "user_type": "standard",
            "login_time": "recent",
            "access_pattern": "normal"
        }
    
    async def _generate_security_insights(self, analysis_result: AnalysisResult):
        """生成安全洞察"""
        if (analysis_result.status != AnalysisStatus.COMPLETED or 
            not analysis_result.result_data):
            return
        
        try:
            result_data = analysis_result.result_data
            insights = []
            
            # 基于分析结果生成洞察
            if 'risk_level' in result_data:
                risk_level = result_data['risk_level']
                if risk_level in ['高', '严重', 'high', 'critical']:
                    insights.append(SecurityInsight(
                        insight_type="high_risk_alert",
                        title="高风险安全事件检测",
                        description=f"检测到{risk_level}风险安全事件",
                        severity=risk_level,
                        confidence=analysis_result.confidence_score,
                        recommendations=result_data.get('remediation_steps', []),
                        evidence=result_data.get('ioc_indicators', [])
                    ))
            
            # 缓存洞察
            cache_key = f"{analysis_result.analysis_type.value}_{datetime.utcnow().strftime('%Y%m%d')}"
            if cache_key not in self.insights_cache:
                self.insights_cache[cache_key] = []
            
            self.insights_cache[cache_key].extend(insights)
            
            # 清理过期缓存
            self._cleanup_insights_cache()
            
        except Exception as e:
            self.logger.warning(f"生成安全洞察失败: {str(e)}")
    
    def _cleanup_insights_cache(self):
        """清理过期的洞察缓存"""
        cutoff_date = datetime.utcnow() - timedelta(hours=self.cache_ttl_hours)
        cutoff_str = cutoff_date.strftime('%Y%m%d')
        
        keys_to_remove = [
            key for key in self.insights_cache.keys()
            if key.split('_')[-1] < cutoff_str
        ]
        
        for key in keys_to_remove:
            del self.insights_cache[key]
    
    def get_analysis_history(self, 
                           limit: int = 50,
                           analysis_type: Optional[PromptType] = None) -> List[AnalysisResult]:
        """获取分析历史"""
        history = self.analysis_history
        
        if analysis_type:
            history = [r for r in history if r.analysis_type == analysis_type]
        
        return history[-limit:]
    
    def get_security_insights(self, 
                            insight_type: Optional[str] = None,
                            days: int = 7) -> List[SecurityInsight]:
        """获取安全洞察"""
        all_insights = []
        
        # 获取指定天数内的洞察
        for i in range(days):
            date_str = (datetime.utcnow() - timedelta(days=i)).strftime('%Y%m%d')
            
            for cache_key, insights in self.insights_cache.items():
                if date_str in cache_key:
                    if insight_type:
                        all_insights.extend([
                            insight for insight in insights 
                            if insight.insight_type == insight_type
                        ])
                    else:
                        all_insights.extend(insights)
        
        # 按时间排序
        all_insights.sort(key=lambda x: x.timestamp, reverse=True)
        
        return all_insights
    
    def get_analysis_statistics(self) -> Dict[str, Any]:
        """获取分析统计信息"""
        total_analyses = len(self.analysis_history)
        
        if total_analyses == 0:
            return {
                "total_analyses": 0,
                "success_rate": 0.0,
                "average_confidence": 0.0,
                "average_processing_time": 0.0,
                "analysis_types": {}
            }
        
        successful_analyses = [
            r for r in self.analysis_history 
            if r.status == AnalysisStatus.COMPLETED
        ]
        
        success_rate = len(successful_analyses) / total_analyses
        
        avg_confidence = sum(
            r.confidence_score for r in successful_analyses
        ) / len(successful_analyses) if successful_analyses else 0.0
        
        avg_processing_time = sum(
            r.processing_time for r in self.analysis_history
        ) / total_analyses
        
        # 按分析类型统计
        analysis_types = {}
        for result in self.analysis_history:
            type_name = result.analysis_type.value
            if type_name not in analysis_types:
                analysis_types[type_name] = {
                    "count": 0,
                    "success_count": 0,
                    "avg_confidence": 0.0
                }
            
            analysis_types[type_name]["count"] += 1
            if result.status == AnalysisStatus.COMPLETED:
                analysis_types[type_name]["success_count"] += 1
                analysis_types[type_name]["avg_confidence"] += result.confidence_score
        
        # 计算平均置信度
        for type_stats in analysis_types.values():
            if type_stats["success_count"] > 0:
                type_stats["avg_confidence"] /= type_stats["success_count"]
        
        return {
            "total_analyses": total_analyses,
            "success_rate": round(success_rate, 3),
            "average_confidence": round(avg_confidence, 3),
            "average_processing_time": round(avg_processing_time, 3),
            "analysis_types": analysis_types
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        health_status = {
            "service": "SecurityAnalysis",
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {}
        }
        
        # 检查OpenAI客户端
        try:
            await self.openai_client.chat_completion(
                messages=[{"role": "user", "content": "test"}],
                max_tokens=10
            )
            health_status["components"]["openai_client"] = "healthy"
        except Exception as e:
            health_status["components"]["openai_client"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
        
        # 检查向量检索服务
        if self.vector_retrieval:
            try:
                vector_health = await self.vector_retrieval.health_check()
                health_status["components"]["vector_retrieval"] = "healthy" if vector_health["status"] == "healthy" else "unhealthy"
            except Exception as e:
                health_status["components"]["vector_retrieval"] = f"unhealthy: {str(e)}"
        
        # 检查图操作服务
        if self.graph_operations:
            try:
                graph_health = await self.graph_operations.health_check()
                health_status["components"]["graph_operations"] = "healthy" if graph_health["status"] == "healthy" else "unhealthy"
            except Exception as e:
                health_status["components"]["graph_operations"] = f"unhealthy: {str(e)}"
        
        # 检查行为分析服务
        if self.behavior_analysis:
            try:
                behavior_health = await self.behavior_analysis.health_check()
                health_status["components"]["behavior_analysis"] = "healthy" if behavior_health["status"] == "healthy" else "unhealthy"
            except Exception as e:
                health_status["components"]["behavior_analysis"] = f"unhealthy: {str(e)}"
        
        # 检查分析历史
        health_status["components"]["analysis_history"] = f"loaded: {len(self.analysis_history)} records"
        
        return health_status


# 测试函数
if __name__ == "__main__":
    import asyncio
    
    async def test_security_analysis():
        """测试安全分析服务"""
        # 这里需要实际的客户端实例
        # openai_client = OpenAIClient()
        # security_analysis = SecurityAnalysis(openai_client)
        
        # 测试事件数据
        test_event = {
            "rule": "Suspicious Network Connection",
            "proc": {
                "name": "nc",
                "pid": 1234,
                "cmdline": "nc -l -p 4444"
            },
            "connection": {
                "dest": "192.168.1.100:4444",
                "proto": "tcp"
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        print("测试事件数据:")
        print(json.dumps(test_event, ensure_ascii=False, indent=2))
        
        # 这里可以添加实际的测试代码
        # result = await security_analysis.analyze_security_event(test_event)
        # print("分析结果:")
        # print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
    
    # asyncio.run(test_security_analysis())
    print("安全分析服务模块加载完成")