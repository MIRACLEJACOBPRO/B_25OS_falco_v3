#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - AI决策代理

该模块实现AI决策代理的主控制器，整合安全分析、命令映射和自动执行功能，
提供完整的AI驱动的安全响应能力。

作者: Falco AI Security Team
版本: 1.0.0
创建时间: 2024-01-20
"""

import asyncio
import json
import logging
import threading
import time
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum

from ..services.security_analysis import SecurityAnalysis, AnalysisResult
from ..services.behavior_analysis import BehaviorAnalysis
from ..services.graph_operations import GraphOperations
from ..services.vector_retrieval import VectorRetrieval
from .command_mapper import CommandMapper, MappedCommand
from .execution_engine import ExecutionEngine, ExecutionResult, ExecutionStatus


class AgentMode(Enum):
    """代理模式"""
    PASSIVE = "passive"  # 被动模式：仅分析，不执行
    SEMI_AUTO = "semi_auto"  # 半自动模式：分析+人工审批执行
    AUTO = "auto"  # 自动模式：分析+自动执行
    LEARNING = "learning"  # 学习模式：观察人工决策


class AgentStatus(Enum):
    """代理状态"""
    STOPPED = "stopped"  # 已停止
    STARTING = "starting"  # 启动中
    RUNNING = "running"  # 运行中
    PAUSED = "paused"  # 已暂停
    ERROR = "error"  # 错误状态


@dataclass
class AgentDecision:
    """代理决策"""
    decision_id: str
    analysis_result: AnalysisResult
    mapped_commands: List[MappedCommand]
    decision_reasoning: str
    confidence_score: float
    risk_assessment: str
    recommended_actions: List[str]
    auto_execute: bool
    timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        result = asdict(self)
        result['timestamp'] = self.timestamp.isoformat()
        result['mapped_commands'] = [cmd.to_dict() for cmd in self.mapped_commands]
        return result


@dataclass
class AgentMetrics:
    """代理指标"""
    total_events_processed: int = 0
    total_decisions_made: int = 0
    total_commands_executed: int = 0
    successful_responses: int = 0
    failed_responses: int = 0
    false_positives: int = 0
    false_negatives: int = 0
    average_response_time: float = 0.0
    average_confidence_score: float = 0.0
    uptime_hours: float = 0.0
    
    def calculate_accuracy(self) -> float:
        """计算准确率"""
        total = self.successful_responses + self.false_positives + self.false_negatives
        if total == 0:
            return 0.0
        return self.successful_responses / total
    
    def calculate_precision(self) -> float:
        """计算精确率"""
        total_positive = self.successful_responses + self.false_positives
        if total_positive == 0:
            return 0.0
        return self.successful_responses / total_positive
    
    def calculate_recall(self) -> float:
        """计算召回率"""
        total_actual_positive = self.successful_responses + self.false_negatives
        if total_actual_positive == 0:
            return 0.0
        return self.successful_responses / total_actual_positive


class AISecurityAgent:
    """AI安全决策代理"""
    
    def __init__(self, 
                 security_analysis: SecurityAnalysis,
                 behavior_analysis: BehaviorAnalysis,
                 graph_operations: GraphOperations,
                 vector_retrieval: VectorRetrieval):
        """初始化AI安全代理"""
        self.logger = logging.getLogger(__name__)
        
        # 核心服务组件
        self.security_analysis = security_analysis
        self.behavior_analysis = behavior_analysis
        self.graph_operations = graph_operations
        self.vector_retrieval = vector_retrieval
        
        # 决策组件
        self.command_mapper = CommandMapper()
        self.execution_engine = ExecutionEngine()
        
        # 代理状态
        self.status = AgentStatus.STOPPED
        self.mode = AgentMode.SEMI_AUTO
        self.start_time: Optional[datetime] = None
        
        # 决策历史和指标
        self.decision_history: List[AgentDecision] = []
        self.metrics = AgentMetrics()
        
        # 配置
        self.config = {
            'max_concurrent_analyses': 5,
            'decision_confidence_threshold': 0.7,
            'auto_execute_threshold': 0.9,
            'max_decision_history': 1000,
            'enable_learning': True,
            'learning_feedback_weight': 0.1,
            'risk_tolerance': 'medium',  # low, medium, high
            'response_time_target': 30.0,  # seconds
            'enable_proactive_hunting': False,
            'hunting_interval_minutes': 60
        }
        
        # 事件队列和处理线程
        self.event_queue = asyncio.Queue()
        self.processing_tasks: List[asyncio.Task] = []
        self.is_running = False
        
        # 回调函数
        self.decision_callback: Optional[Callable] = None
        self.alert_callback: Optional[Callable] = None
        self.metrics_callback: Optional[Callable] = None
        
        # 学习数据
        self.learning_data = {
            'decision_feedback': [],
            'pattern_weights': {},
            'response_effectiveness': {}
        }
        
        # 设置执行引擎回调
        self._setup_execution_callbacks()
    
    def _setup_execution_callbacks(self):
        """设置执行引擎回调"""
        def approval_callback(command, context):
            self._handle_approval_request(command, context)
        
        def notification_callback(notification):
            self._handle_execution_notification(notification)
        
        def audit_callback(audit_entry):
            self._handle_audit_log(audit_entry)
        
        self.execution_engine.set_callbacks(
            approval_callback=approval_callback,
            notification_callback=notification_callback,
            audit_callback=audit_callback
        )
    
    async def start(self):
        """启动AI代理"""
        if self.status != AgentStatus.STOPPED:
            self.logger.warning(f"代理已在运行，当前状态: {self.status.value}")
            return
        
        self.logger.info("启动AI安全决策代理")
        self.status = AgentStatus.STARTING
        
        try:
            # 启动执行引擎
            self.execution_engine.start()
            
            # 记录启动时间
            self.start_time = datetime.utcnow()
            
            # 启动事件处理任务
            self.is_running = True
            
            # 创建处理任务
            for i in range(self.config['max_concurrent_analyses']):
                task = asyncio.create_task(self._event_processor(f"processor_{i}"))
                self.processing_tasks.append(task)
            
            # 启动主动威胁狩猎（如果启用）
            if self.config['enable_proactive_hunting']:
                hunting_task = asyncio.create_task(self._proactive_hunting())
                self.processing_tasks.append(hunting_task)
            
            # 启动指标收集任务
            metrics_task = asyncio.create_task(self._metrics_collector())
            self.processing_tasks.append(metrics_task)
            
            self.status = AgentStatus.RUNNING
            self.logger.info("AI安全决策代理启动完成")
            
        except Exception as e:
            self.logger.error(f"启动AI代理失败: {str(e)}")
            self.status = AgentStatus.ERROR
            raise
    
    async def stop(self):
        """停止AI代理"""
        if self.status == AgentStatus.STOPPED:
            return
        
        self.logger.info("停止AI安全决策代理")
        
        # 停止事件处理
        self.is_running = False
        
        # 取消所有处理任务
        for task in self.processing_tasks:
            task.cancel()
        
        # 等待任务完成
        if self.processing_tasks:
            await asyncio.gather(*self.processing_tasks, return_exceptions=True)
        
        self.processing_tasks.clear()
        
        # 停止执行引擎
        self.execution_engine.stop()
        
        # 更新运行时间
        if self.start_time:
            self.metrics.uptime_hours = (datetime.utcnow() - self.start_time).total_seconds() / 3600
        
        self.status = AgentStatus.STOPPED
        self.logger.info("AI安全决策代理已停止")
    
    async def pause(self):
        """暂停AI代理"""
        if self.status == AgentStatus.RUNNING:
            self.status = AgentStatus.PAUSED
            self.logger.info("AI安全决策代理已暂停")
    
    async def resume(self):
        """恢复AI代理"""
        if self.status == AgentStatus.PAUSED:
            self.status = AgentStatus.RUNNING
            self.logger.info("AI安全决策代理已恢复")
    
    async def process_security_event(self, event_data: Dict[str, Any]) -> Optional[AgentDecision]:
        """处理安全事件"""
        try:
            # 添加到事件队列
            await self.event_queue.put(event_data)
            
            # 如果是同步调用，等待处理完成
            # 这里简化处理，实际可以实现更复杂的同步机制
            return None
            
        except Exception as e:
            self.logger.error(f"处理安全事件失败: {str(e)}")
            return None
    
    async def _event_processor(self, processor_id: str):
        """事件处理器"""
        self.logger.info(f"启动事件处理器: {processor_id}")
        
        while self.is_running:
            try:
                # 检查代理状态
                if self.status == AgentStatus.PAUSED:
                    await asyncio.sleep(1)
                    continue
                
                # 获取事件
                try:
                    event_data = await asyncio.wait_for(self.event_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                
                # 处理事件
                start_time = time.time()
                decision = await self._analyze_and_decide(event_data)
                processing_time = time.time() - start_time
                
                # 更新指标
                self.metrics.total_events_processed += 1
                self._update_response_time(processing_time)
                
                if decision:
                    self.metrics.total_decisions_made += 1
                    self._update_confidence_score(decision.confidence_score)
                    
                    # 保存决策历史
                    self._save_decision(decision)
                    
                    # 触发决策回调
                    if self.decision_callback:
                        try:
                            await self.decision_callback(decision)
                        except Exception as e:
                            self.logger.error(f"决策回调失败: {str(e)}")
                
                # 标记任务完成
                self.event_queue.task_done()
                
            except Exception as e:
                self.logger.error(f"事件处理器异常: {processor_id}, 错误: {str(e)}")
                await asyncio.sleep(5)
        
        self.logger.info(f"事件处理器已停止: {processor_id}")
    
    async def _analyze_and_decide(self, event_data: Dict[str, Any]) -> Optional[AgentDecision]:
        """分析事件并做出决策"""
        try:
            self.logger.debug(f"开始分析安全事件: {event_data.get('event_id', 'unknown')}")
            
            # 1. 安全分析
            analysis_result = await self._perform_security_analysis(event_data)
            
            if not analysis_result:
                self.logger.warning("安全分析失败，跳过决策")
                return None
            
            # 2. 置信度检查
            if analysis_result.confidence_score < self.config['decision_confidence_threshold']:
                self.logger.info(f"置信度过低 ({analysis_result.confidence_score:.2f})，跳过决策")
                return None
            
            # 3. 命令映射
            mapped_commands = self._map_analysis_to_commands(analysis_result, event_data)
            
            # 4. 决策推理
            decision_reasoning = self._generate_decision_reasoning(analysis_result, mapped_commands)
            
            # 5. 风险评估
            risk_assessment = self._assess_decision_risk(analysis_result, mapped_commands)
            
            # 6. 推荐行动
            recommended_actions = self._generate_recommended_actions(analysis_result, mapped_commands)
            
            # 7. 自动执行判断
            auto_execute = self._should_auto_execute(analysis_result, mapped_commands)
            
            # 创建决策
            decision = AgentDecision(
                decision_id=f"decision_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}",
                analysis_result=analysis_result,
                mapped_commands=mapped_commands,
                decision_reasoning=decision_reasoning,
                confidence_score=analysis_result.confidence_score,
                risk_assessment=risk_assessment,
                recommended_actions=recommended_actions,
                auto_execute=auto_execute,
                timestamp=datetime.utcnow()
            )
            
            # 8. 执行决策
            if auto_execute and mapped_commands:
                await self._execute_decision(decision)
            
            self.logger.info(f"决策完成: {decision.decision_id}, 置信度: {decision.confidence_score:.2f}, 自动执行: {auto_execute}")
            return decision
            
        except Exception as e:
            self.logger.error(f"分析决策失败: {str(e)}")
            return None
    
    async def _perform_security_analysis(self, event_data: Dict[str, Any]) -> Optional[AnalysisResult]:
        """执行安全分析"""
        try:
            # 构建分析请求
            analysis_request = {
                'event_data': event_data,
                'analysis_type': 'comprehensive',
                'include_context': True,
                'include_recommendations': True
            }
            
            # 调用安全分析服务
            analysis_result = await self.security_analysis.analyze_security_event(
                event_data=event_data,
                context=analysis_request
            )
            
            return analysis_result
            
        except Exception as e:
            self.logger.error(f"安全分析失败: {str(e)}")
            return None
    
    def _map_analysis_to_commands(self, 
                                analysis_result: AnalysisResult, 
                                event_data: Dict[str, Any]) -> List[MappedCommand]:
        """将分析结果映射为命令"""
        try:
            # 构建映射上下文
            context = {
                'event_data': event_data,
                'agent_mode': self.mode.value,
                'risk_tolerance': self.config['risk_tolerance'],
                'auto_execute': self.mode == AgentMode.AUTO
            }
            
            # 转换分析结果格式
            analysis_dict = {
                'analysis_summary': analysis_result.analysis_summary,
                'risk_level': analysis_result.risk_level,
                'remediation_steps': analysis_result.remediation_steps,
                'ioc_indicators': getattr(analysis_result, 'ioc_indicators', []),
                'proc': event_data.get('proc', {}),
                'connection': event_data.get('connection', {}),
                'file': event_data.get('file', {}),
                'service': event_data.get('service')
            }
            
            # 调用命令映射器
            mapped_commands = self.command_mapper.map_analysis_to_commands(
                analysis_dict, context
            )
            
            return mapped_commands
            
        except Exception as e:
            self.logger.error(f"命令映射失败: {str(e)}")
            return []
    
    def _generate_decision_reasoning(self, 
                                   analysis_result: AnalysisResult, 
                                   mapped_commands: List[MappedCommand]) -> str:
        """生成决策推理"""
        reasoning_parts = []
        
        # 分析结果摘要
        reasoning_parts.append(f"安全分析: {analysis_result.analysis_summary}")
        
        # 风险等级
        reasoning_parts.append(f"风险等级: {analysis_result.risk_level}")
        
        # 置信度
        reasoning_parts.append(f"置信度: {analysis_result.confidence_score:.2f}")
        
        # 映射的命令
        if mapped_commands:
            command_types = [cmd.command_type.value for cmd in mapped_commands]
            reasoning_parts.append(f"建议执行 {len(mapped_commands)} 个命令: {', '.join(set(command_types))}")
        else:
            reasoning_parts.append("未找到适合的响应命令")
        
        # 代理模式影响
        if self.mode == AgentMode.AUTO:
            reasoning_parts.append("自动模式：将自动执行高置信度的响应")
        elif self.mode == AgentMode.SEMI_AUTO:
            reasoning_parts.append("半自动模式：需要人工审批执行")
        else:
            reasoning_parts.append("被动模式：仅提供分析建议")
        
        return "; ".join(reasoning_parts)
    
    def _assess_decision_risk(self, 
                            analysis_result: AnalysisResult, 
                            mapped_commands: List[MappedCommand]) -> str:
        """评估决策风险"""
        risk_factors = []
        
        # 分析风险等级
        analysis_risk = analysis_result.risk_level.lower()
        if analysis_risk in ['high', 'critical']:
            risk_factors.append(f"威胁风险: {analysis_risk}")
        
        # 命令执行风险
        if mapped_commands:
            high_risk_commands = [cmd for cmd in mapped_commands if cmd.risk_level in ['high', 'critical']]
            if high_risk_commands:
                risk_factors.append(f"高风险命令: {len(high_risk_commands)}个")
            
            sudo_commands = [cmd for cmd in mapped_commands if cmd.requires_sudo]
            if sudo_commands:
                risk_factors.append(f"需要管理员权限: {len(sudo_commands)}个")
        
        # 置信度风险
        if analysis_result.confidence_score < 0.8:
            risk_factors.append(f"置信度偏低: {analysis_result.confidence_score:.2f}")
        
        if not risk_factors:
            return "低风险决策"
        
        return "风险因素: " + "; ".join(risk_factors)
    
    def _generate_recommended_actions(self, 
                                    analysis_result: AnalysisResult, 
                                    mapped_commands: List[MappedCommand]) -> List[str]:
        """生成推荐行动"""
        actions = []
        
        # 基于分析结果的建议
        if hasattr(analysis_result, 'remediation_steps'):
            actions.extend(analysis_result.remediation_steps)
        
        # 基于映射命令的建议
        for cmd in mapped_commands:
            if cmd.priority.value in ['critical', 'high']:
                actions.append(f"立即执行: {cmd.description}")
            else:
                actions.append(f"考虑执行: {cmd.description}")
        
        # 通用建议
        if analysis_result.risk_level.lower() in ['high', 'critical']:
            actions.append("加强监控相关系统和网络")
            actions.append("通知安全团队进行人工调查")
        
        return actions[:10]  # 限制建议数量
    
    def _should_auto_execute(self, 
                           analysis_result: AnalysisResult, 
                           mapped_commands: List[MappedCommand]) -> bool:
        """判断是否应该自动执行"""
        # 检查代理模式
        if self.mode != AgentMode.AUTO:
            return False
        
        # 检查置信度
        if analysis_result.confidence_score < self.config['auto_execute_threshold']:
            return False
        
        # 检查命令风险
        if mapped_commands:
            for cmd in mapped_commands:
                if cmd.risk_level in ['high', 'critical']:
                    return False
                if cmd.requires_sudo and cmd.risk_level != 'low':
                    return False
        
        # 检查风险容忍度
        risk_level = analysis_result.risk_level.lower()
        risk_tolerance = self.config['risk_tolerance']
        
        if risk_tolerance == 'low' and risk_level not in ['low', 'info']:
            return False
        elif risk_tolerance == 'medium' and risk_level in ['critical']:
            return False
        
        return True
    
    async def _execute_decision(self, decision: AgentDecision):
        """执行决策"""
        try:
            self.logger.info(f"开始执行决策: {decision.decision_id}")
            
            executed_commands = 0
            
            for command in decision.mapped_commands:
                try:
                    # 提交命令执行
                    command_id = self.execution_engine.submit_command(command)
                    executed_commands += 1
                    
                    self.logger.info(f"提交执行命令: {command_id}")
                    
                except Exception as e:
                    self.logger.error(f"提交命令失败: {command.command_id}, 错误: {str(e)}")
            
            # 更新指标
            self.metrics.total_commands_executed += executed_commands
            
            self.logger.info(f"决策执行完成: {decision.decision_id}, 执行了 {executed_commands} 个命令")
            
        except Exception as e:
            self.logger.error(f"执行决策失败: {decision.decision_id}, 错误: {str(e)}")
    
    async def _proactive_hunting(self):
        """主动威胁狩猎"""
        self.logger.info("启动主动威胁狩猎")
        
        while self.is_running:
            try:
                if self.status == AgentStatus.RUNNING:
                    # 执行威胁狩猎逻辑
                    await self._perform_threat_hunting()
                
                # 等待下次狩猎
                await asyncio.sleep(self.config['hunting_interval_minutes'] * 60)
                
            except Exception as e:
                self.logger.error(f"主动威胁狩猎异常: {str(e)}")
                await asyncio.sleep(300)  # 5分钟后重试
        
        self.logger.info("主动威胁狩猎已停止")
    
    async def _perform_threat_hunting(self):
        """执行威胁狩猎"""
        try:
            self.logger.info("执行威胁狩猎")
            
            # 1. 查询图数据库中的异常模式
            anomaly_patterns = await self._hunt_graph_anomalies()
            
            # 2. 分析行为链路
            behavior_anomalies = await self._hunt_behavior_anomalies()
            
            # 3. 检查IOC指标
            ioc_matches = await self._hunt_ioc_matches()
            
            # 4. 生成狩猎报告
            hunting_results = {
                'timestamp': datetime.utcnow().isoformat(),
                'anomaly_patterns': anomaly_patterns,
                'behavior_anomalies': behavior_anomalies,
                'ioc_matches': ioc_matches
            }
            
            # 5. 如果发现威胁，创建事件
            if any([anomaly_patterns, behavior_anomalies, ioc_matches]):
                hunting_event = {
                    'event_type': 'proactive_hunting',
                    'event_id': f"hunt_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                    'hunting_results': hunting_results,
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                # 处理狩猎事件
                await self.process_security_event(hunting_event)
            
            self.logger.info("威胁狩猎完成")
            
        except Exception as e:
            self.logger.error(f"威胁狩猎失败: {str(e)}")
    
    async def _hunt_graph_anomalies(self) -> List[Dict[str, Any]]:
        """狩猎图数据异常"""
        try:
            # 查找异常行为模式
            anomalies = await self.graph_operations.find_anomalous_behaviors(
                time_window_hours=24,
                min_confidence=0.7
            )
            
            return anomalies.get('anomalies', [])
            
        except Exception as e:
            self.logger.error(f"图数据异常狩猎失败: {str(e)}")
            return []
    
    async def _hunt_behavior_anomalies(self) -> List[Dict[str, Any]]:
        """狩猎行为异常"""
        try:
            # 分析最近的行为链路
            recent_chains = await self.behavior_analysis.extract_behavior_chains(
                time_window_hours=24,
                min_chain_length=3
            )
            
            anomalies = []
            for chain in recent_chains:
                if chain.get('risk_score', 0) > 0.7:
                    anomalies.append(chain)
            
            return anomalies
            
        except Exception as e:
            self.logger.error(f"行为异常狩猎失败: {str(e)}")
            return []
    
    async def _hunt_ioc_matches(self) -> List[Dict[str, Any]]:
        """狩猎IOC匹配"""
        try:
            # 这里可以实现IOC匹配逻辑
            # 例如检查已知的恶意IP、域名、文件哈希等
            
            # 示例实现
            ioc_matches = []
            
            # TODO: 实现具体的IOC匹配逻辑
            
            return ioc_matches
            
        except Exception as e:
            self.logger.error(f"IOC匹配狩猎失败: {str(e)}")
            return []
    
    async def _metrics_collector(self):
        """指标收集器"""
        self.logger.info("启动指标收集器")
        
        while self.is_running:
            try:
                # 更新运行时间
                if self.start_time:
                    self.metrics.uptime_hours = (datetime.utcnow() - self.start_time).total_seconds() / 3600
                
                # 触发指标回调
                if self.metrics_callback:
                    try:
                        await self.metrics_callback(self.metrics)
                    except Exception as e:
                        self.logger.error(f"指标回调失败: {str(e)}")
                
                # 等待下次收集
                await asyncio.sleep(60)  # 每分钟收集一次
                
            except Exception as e:
                self.logger.error(f"指标收集异常: {str(e)}")
                await asyncio.sleep(60)
        
        self.logger.info("指标收集器已停止")
    
    def _save_decision(self, decision: AgentDecision):
        """保存决策历史"""
        self.decision_history.append(decision)
        
        # 限制历史记录数量
        if len(self.decision_history) > self.config['max_decision_history']:
            self.decision_history = self.decision_history[-self.config['max_decision_history']:]
    
    def _update_response_time(self, response_time: float):
        """更新响应时间"""
        if self.metrics.total_events_processed == 0:
            self.metrics.average_response_time = response_time
        else:
            # 计算移动平均
            alpha = 0.1  # 平滑因子
            self.metrics.average_response_time = (
                alpha * response_time + 
                (1 - alpha) * self.metrics.average_response_time
            )
    
    def _update_confidence_score(self, confidence_score: float):
        """更新平均置信度"""
        if self.metrics.total_decisions_made == 1:
            self.metrics.average_confidence_score = confidence_score
        else:
            # 计算移动平均
            alpha = 0.1  # 平滑因子
            self.metrics.average_confidence_score = (
                alpha * confidence_score + 
                (1 - alpha) * self.metrics.average_confidence_score
            )
    
    def _handle_approval_request(self, command, context):
        """处理审批请求"""
        self.logger.info(f"收到审批请求: {command.command_id}")
        
        # 触发告警回调
        if self.alert_callback:
            try:
                alert_data = {
                    'type': 'approval_request',
                    'command_id': command.command_id,
                    'command': command.command,
                    'description': command.description,
                    'risk_level': command.risk_level,
                    'requires_sudo': command.requires_sudo,
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                asyncio.create_task(self.alert_callback(alert_data))
            except Exception as e:
                self.logger.error(f"告警回调失败: {str(e)}")
    
    def _handle_execution_notification(self, notification):
        """处理执行通知"""
        self.logger.debug(f"收到执行通知: {notification['event_type']} - {notification['command_id']}")
        
        # 更新指标
        if notification['event_type'] == 'EXECUTION_COMPLETED':
            if notification['status'] in ['completed']:
                self.metrics.successful_responses += 1
            else:
                self.metrics.failed_responses += 1
    
    def _handle_audit_log(self, audit_entry):
        """处理审计日志"""
        # 这里可以实现审计日志的持久化存储
        self.logger.debug(f"审计日志: {audit_entry['action']} - {audit_entry['command_id']}")
    
    # ==================== 公共接口方法 ====================
    
    def set_mode(self, mode: AgentMode):
        """设置代理模式"""
        old_mode = self.mode
        self.mode = mode
        
        # 更新执行引擎配置
        if mode == AgentMode.AUTO:
            self.execution_engine.update_config({
                'auto_approve_low_risk': True,
                'auto_approve_info': True
            })
        elif mode == AgentMode.PASSIVE:
            self.execution_engine.update_config({
                'auto_approve_low_risk': False,
                'auto_approve_info': False
            })
        
        self.logger.info(f"代理模式已更改: {old_mode.value} -> {mode.value}")
    
    def update_config(self, config_updates: Dict[str, Any]):
        """更新配置"""
        self.config.update(config_updates)
        self.logger.info(f"代理配置已更新: {config_updates}")
    
    def set_callbacks(self, 
                     decision_callback: Optional[Callable] = None,
                     alert_callback: Optional[Callable] = None,
                     metrics_callback: Optional[Callable] = None):
        """设置回调函数"""
        if decision_callback:
            self.decision_callback = decision_callback
        if alert_callback:
            self.alert_callback = alert_callback
        if metrics_callback:
            self.metrics_callback = metrics_callback
    
    def get_status(self) -> Dict[str, Any]:
        """获取代理状态"""
        return {
            'status': self.status.value,
            'mode': self.mode.value,
            'uptime_hours': self.metrics.uptime_hours,
            'is_running': self.is_running,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'event_queue_size': self.event_queue.qsize(),
            'processing_tasks': len(self.processing_tasks)
        }
    
    def get_metrics(self) -> AgentMetrics:
        """获取代理指标"""
        return self.metrics
    
    def get_decision_history(self, limit: int = 100) -> List[AgentDecision]:
        """获取决策历史"""
        return self.decision_history[-limit:]
    
    def get_execution_status(self, command_id: str) -> Optional[ExecutionResult]:
        """获取命令执行状态"""
        return self.execution_engine.get_execution_status(command_id)
    
    def approve_command(self, command_id: str, user: str, reason: str = "") -> bool:
        """批准命令执行"""
        return self.execution_engine.approve_command(command_id, user, reason)
    
    def reject_command(self, command_id: str, user: str, reason: str = "") -> bool:
        """拒绝命令执行"""
        return self.execution_engine.reject_command(command_id, user, reason)
    
    def cancel_command(self, command_id: str, reason: str = "") -> bool:
        """取消命令执行"""
        return self.execution_engine.cancel_command(command_id, reason)
    
    def get_pending_approvals(self) -> List[Dict[str, Any]]:
        """获取待审批命令"""
        return self.execution_engine.get_pending_approvals()
    
    def provide_feedback(self, decision_id: str, feedback: Dict[str, Any]):
        """提供决策反馈（用于学习）"""
        if not self.config['enable_learning']:
            return
        
        try:
            feedback_entry = {
                'decision_id': decision_id,
                'feedback': feedback,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            self.learning_data['decision_feedback'].append(feedback_entry)
            
            # 限制反馈数据量
            if len(self.learning_data['decision_feedback']) > 1000:
                self.learning_data['decision_feedback'] = self.learning_data['decision_feedback'][-1000:]
            
            # 更新指标
            if feedback.get('correct', False):
                self.metrics.successful_responses += 1
            else:
                if feedback.get('false_positive', False):
                    self.metrics.false_positives += 1
                elif feedback.get('false_negative', False):
                    self.metrics.false_negatives += 1
            
            self.logger.info(f"收到决策反馈: {decision_id}")
            
        except Exception as e:
            self.logger.error(f"处理决策反馈失败: {str(e)}")


# 测试函数
if __name__ == "__main__":
    import asyncio
    import logging
    
    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    async def test_ai_agent():
        # 这里需要实际的服务实例
        # 为了测试，我们创建模拟对象
        
        class MockService:
            async def analyze_security_event(self, **kwargs):
                from ..services.security_analysis import AnalysisResult, AnalysisStatus
                return AnalysisResult(
                    analysis_id="test_001",
                    status=AnalysisStatus.COMPLETED,
                    analysis_summary="检测到可疑进程活动",
                    risk_level="medium",
                    confidence_score=0.85,
                    remediation_steps=["终止可疑进程", "隔离相关文件"],
                    timestamp=datetime.utcnow()
                )
        
        # 创建模拟服务
        mock_service = MockService()
        
        # 创建AI代理
        agent = AISecurityAgent(
            security_analysis=mock_service,
            behavior_analysis=mock_service,
            graph_operations=mock_service,
            vector_retrieval=mock_service
        )
        
        # 设置回调
        async def decision_callback(decision):
            print(f"决策回调: {decision.decision_id} - {decision.decision_reasoning}")
        
        async def alert_callback(alert):
            print(f"告警回调: {alert['type']} - {alert.get('command_id', 'N/A')}")
        
        async def metrics_callback(metrics):
            print(f"指标回调: 处理事件 {metrics.total_events_processed}, 决策 {metrics.total_decisions_made}")
        
        agent.set_callbacks(
            decision_callback=decision_callback,
            alert_callback=alert_callback,
            metrics_callback=metrics_callback
        )
        
        try:
            # 启动代理
            await agent.start()
            
            # 处理测试事件
            test_event = {
                'event_id': 'test_001',
                'event_type': 'process_anomaly',
                'proc': {
                    'name': 'suspicious_binary',
                    'pid': 1234,
                    'cmdline': '/tmp/malware.bin'
                },
                'timestamp': datetime.utcnow().isoformat()
            }
            
            await agent.process_security_event(test_event)
            
            # 等待处理完成
            await asyncio.sleep(5)
            
            # 获取状态和指标
            status = agent.get_status()
            metrics = agent.get_metrics()
            
            print(f"代理状态: {status}")
            print(f"代理指标: 准确率={metrics.calculate_accuracy():.2f}, 精确率={metrics.calculate_precision():.2f}")
            
        finally:
            # 停止代理
            await agent.stop()
    
    # 运行测试
    asyncio.run(test_ai_agent())