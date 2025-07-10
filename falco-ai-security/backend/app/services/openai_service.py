#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - OpenAI Service
OpenAI服务，负责AI分析和威胁检测
"""

import logging
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import openai
from openai import AsyncOpenAI

from app.config import settings
from app.services.falco_monitor import FalcoEvent

logger = logging.getLogger(__name__)

@dataclass
class ThreatAnalysis:
    """威胁分析结果"""
    event_id: str
    threat_level: str  # low, medium, high, critical
    threat_type: str   # malware, intrusion, privilege_escalation, data_exfiltration, etc.
    confidence: float  # 0.0 - 1.0
    description: str
    recommendations: List[str]
    indicators: List[str]
    timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'event_id': self.event_id,
            'threat_level': self.threat_level,
            'threat_type': self.threat_type,
            'confidence': self.confidence,
            'description': self.description,
            'recommendations': self.recommendations,
            'indicators': self.indicators,
            'timestamp': self.timestamp.isoformat()
        }

@dataclass
class SecurityInsight:
    """安全洞察"""
    insight_type: str  # pattern, anomaly, trend, recommendation
    title: str
    description: str
    severity: str
    affected_entities: List[str]
    time_range: Tuple[datetime, datetime]
    confidence: float
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'insight_type': self.insight_type,
            'title': self.title,
            'description': self.description,
            'severity': self.severity,
            'affected_entities': self.affected_entities,
            'time_range': [self.time_range[0].isoformat(), self.time_range[1].isoformat()],
            'confidence': self.confidence
        }

class OpenAIService:
    """OpenAI AI分析服务"""
    
    def __init__(self):
        self.client: Optional[AsyncOpenAI] = None
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS
        self.temperature = settings.OPENAI_TEMPERATURE
        self.is_connected = False
        
        # 威胁检测提示模板
        self.threat_detection_prompt = """
你是一个专业的网络安全分析师，专门分析Falco安全事件。请分析以下安全事件并提供威胁评估：

事件信息：
- 规则: {rule}
- 优先级: {priority}
- 消息: {message}
- 主机: {hostname}
- 时间: {timestamp}
- 标签: {tags}
- 详细信息: {output_fields}

请提供以下分析：
1. 威胁等级 (low/medium/high/critical)
2. 威胁类型 (malware/intrusion/privilege_escalation/data_exfiltration/lateral_movement/reconnaissance/other)
3. 置信度 (0.0-1.0)
4. 详细描述
5. 安全建议
6. 威胁指标

请以JSON格式返回结果：
{
  "threat_level": "威胁等级",
  "threat_type": "威胁类型",
  "confidence": 置信度数值,
  "description": "详细描述",
  "recommendations": ["建议1", "建议2"],
  "indicators": ["指标1", "指标2"]
}
"""
        
        # 模式分析提示模板
        self.pattern_analysis_prompt = """
你是一个专业的网络安全分析师，请分析以下安全事件序列，识别潜在的攻击模式：

事件序列：
{events}

请分析：
1. 是否存在攻击模式
2. 攻击链分析
3. 潜在威胁
4. 防护建议

请以JSON格式返回结果：
{
  "pattern_detected": true/false,
  "attack_chain": ["步骤1", "步骤2"],
  "threat_assessment": "威胁评估",
  "recommendations": ["建议1", "建议2"]
}
"""
    
    async def connect(self) -> bool:
        """初始化OpenAI客户端"""
        try:
            if not self.api_key:
                logger.error("OpenAI API密钥未配置")
                return False
            
            self.client = AsyncOpenAI(api_key=self.api_key)
            
            # 测试连接
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": "Hello, this is a connection test."}
                ],
                max_tokens=10
            )
            
            if response.choices:
                self.is_connected = True
                logger.info("OpenAI服务连接成功")
                return True
                
        except Exception as e:
            logger.error(f"OpenAI连接失败: {e}")
        
        self.is_connected = False
        return False
    
    async def disconnect(self):
        """断开连接"""
        self.client = None
        self.is_connected = False
        logger.info("已断开OpenAI连接")
    
    async def analyze_threat(self, event: FalcoEvent) -> Optional[ThreatAnalysis]:
        """分析单个事件的威胁"""
        try:
            if not self.is_connected:
                logger.error("OpenAI服务未连接")
                return None
            
            # 准备提示内容
            prompt = self.threat_detection_prompt.format(
                rule=event.rule,
                priority=event.priority,
                message=event.message,
                hostname=event.hostname,
                timestamp=event.timestamp.isoformat(),
                tags=', '.join(event.tags),
                output_fields=json.dumps(event.output_fields, indent=2)
            )
            
            # 调用OpenAI API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的网络安全分析师，专门分析安全事件。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            if response.choices:
                content = response.choices[0].message.content
                
                # 解析JSON响应
                try:
                    result = json.loads(content)
                    
                    # 生成事件ID
                    event_id = f"{event.hostname}_{event.timestamp.timestamp()}_{hash(event.message)}"
                    
                    return ThreatAnalysis(
                        event_id=event_id,
                        threat_level=result.get('threat_level', 'low'),
                        threat_type=result.get('threat_type', 'other'),
                        confidence=float(result.get('confidence', 0.5)),
                        description=result.get('description', ''),
                        recommendations=result.get('recommendations', []),
                        indicators=result.get('indicators', []),
                        timestamp=datetime.now()
                    )
                    
                except json.JSONDecodeError as e:
                    logger.error(f"解析AI响应失败: {e}")
                    logger.debug(f"原始响应: {content}")
                    
                    # 创建默认分析结果
                    return self._create_fallback_analysis(event, content)
            
        except Exception as e:
            logger.error(f"威胁分析失败: {e}")
        
        return None
    
    def _create_fallback_analysis(self, event: FalcoEvent, ai_response: str) -> ThreatAnalysis:
        """创建备用分析结果"""
        # 基于规则和优先级的简单威胁评估
        threat_level = 'low'
        threat_type = 'other'
        confidence = 0.3
        
        if event.priority in ['Emergency', 'Alert', 'Critical']:
            threat_level = 'high'
            confidence = 0.7
        elif event.priority in ['Error', 'Warning']:
            threat_level = 'medium'
            confidence = 0.5
        
        # 基于规则名称推断威胁类型
        rule_lower = event.rule.lower()
        if any(keyword in rule_lower for keyword in ['exec', 'spawn', 'shell']):
            threat_type = 'privilege_escalation'
        elif any(keyword in rule_lower for keyword in ['network', 'connect', 'socket']):
            threat_type = 'lateral_movement'
        elif any(keyword in rule_lower for keyword in ['file', 'write', 'read']):
            threat_type = 'data_exfiltration'
        
        event_id = f"{event.hostname}_{event.timestamp.timestamp()}_{hash(event.message)}"
        
        return ThreatAnalysis(
            event_id=event_id,
            threat_level=threat_level,
            threat_type=threat_type,
            confidence=confidence,
            description=f"基于规则 '{event.rule}' 的自动分析。AI响应: {ai_response[:200]}...",
            recommendations=["请人工审查此事件", "检查相关系统日志"],
            indicators=[event.rule, event.hostname],
            timestamp=datetime.now()
        )
    
    async def analyze_event_pattern(self, events: List[FalcoEvent]) -> Optional[Dict[str, Any]]:
        """分析事件模式"""
        try:
            if not self.is_connected:
                logger.error("OpenAI服务未连接")
                return None
            
            if not events:
                return None
            
            # 准备事件序列描述
            event_descriptions = []
            for i, event in enumerate(events[:10]):  # 限制事件数量
                desc = f"{i+1}. [{event.timestamp.strftime('%H:%M:%S')}] {event.rule} - {event.message}"
                event_descriptions.append(desc)
            
            events_text = '\n'.join(event_descriptions)
            
            prompt = self.pattern_analysis_prompt.format(events=events_text)
            
            # 调用OpenAI API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的网络安全分析师，专门分析攻击模式。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            if response.choices:
                content = response.choices[0].message.content
                
                try:
                    result = json.loads(content)
                    return result
                except json.JSONDecodeError as e:
                    logger.error(f"解析模式分析响应失败: {e}")
                    return {'error': '解析失败', 'raw_response': content}
            
        except Exception as e:
            logger.error(f"模式分析失败: {e}")
        
        return None
    
    async def generate_security_insights(self, analysis_data: Dict[str, Any]) -> List[SecurityInsight]:
        """生成安全洞察"""
        try:
            if not self.is_connected:
                logger.error("OpenAI服务未连接")
                return []
            
            insights_prompt = f"""
基于以下安全分析数据，生成安全洞察和建议：

分析数据：
{json.dumps(analysis_data, indent=2, ensure_ascii=False)}

请生成以下类型的洞察：
1. 威胁趋势分析
2. 异常行为识别
3. 安全改进建议
4. 风险评估

请以JSON数组格式返回结果，每个洞察包含：
- insight_type: pattern/anomaly/trend/recommendation
- title: 洞察标题
- description: 详细描述
- severity: low/medium/high/critical
- affected_entities: 受影响的实体列表
- confidence: 置信度(0.0-1.0)
"""
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的网络安全顾问，专门提供安全洞察。"},
                    {"role": "user", "content": insights_prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            if response.choices:
                content = response.choices[0].message.content
                
                try:
                    insights_data = json.loads(content)
                    insights = []
                    
                    for insight_data in insights_data:
                        insight = SecurityInsight(
                            insight_type=insight_data.get('insight_type', 'recommendation'),
                            title=insight_data.get('title', ''),
                            description=insight_data.get('description', ''),
                            severity=insight_data.get('severity', 'medium'),
                            affected_entities=insight_data.get('affected_entities', []),
                            time_range=(datetime.now() - timedelta(hours=24), datetime.now()),
                            confidence=float(insight_data.get('confidence', 0.5))
                        )
                        insights.append(insight)
                    
                    return insights
                    
                except json.JSONDecodeError as e:
                    logger.error(f"解析安全洞察响应失败: {e}")
            
        except Exception as e:
            logger.error(f"生成安全洞察失败: {e}")
        
        return []
    
    async def generate_incident_report(self, threat_analyses: List[ThreatAnalysis], 
                                     related_events: List[FalcoEvent]) -> Optional[str]:
        """生成事件报告"""
        try:
            if not self.is_connected:
                logger.error("OpenAI服务未连接")
                return None
            
            # 准备报告数据
            threat_summary = []
            for analysis in threat_analyses:
                threat_summary.append({
                    'threat_level': analysis.threat_level,
                    'threat_type': analysis.threat_type,
                    'confidence': analysis.confidence,
                    'description': analysis.description
                })
            
            event_summary = []
            for event in related_events[:20]:  # 限制事件数量
                event_summary.append({
                    'rule': event.rule,
                    'priority': event.priority,
                    'timestamp': event.timestamp.isoformat(),
                    'hostname': event.hostname
                })
            
            report_prompt = f"""
请基于以下威胁分析和相关事件生成一份专业的安全事件报告：

威胁分析：
{json.dumps(threat_summary, indent=2, ensure_ascii=False)}

相关事件：
{json.dumps(event_summary, indent=2, ensure_ascii=False)}

报告应包含：
1. 执行摘要
2. 威胁概述
3. 影响分析
4. 时间线
5. 技术细节
6. 建议措施
7. 结论

请生成一份结构化的Markdown格式报告。
"""
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的网络安全分析师，专门撰写安全事件报告。"},
                    {"role": "user", "content": report_prompt}
                ],
                max_tokens=2000,
                temperature=0.3
            )
            
            if response.choices:
                return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"生成事件报告失败: {e}")
        
        return None
    
    async def get_threat_intelligence(self, indicators: List[str]) -> Dict[str, Any]:
        """获取威胁情报"""
        try:
            if not self.is_connected:
                logger.error("OpenAI服务未连接")
                return {}
            
            intelligence_prompt = f"""
请分析以下威胁指标并提供威胁情报：

指标：
{json.dumps(indicators, indent=2)}

请提供：
1. 指标类型识别
2. 已知威胁关联
3. 风险评估
4. 防护建议

请以JSON格式返回结果。
"""
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个威胁情报分析专家。"},
                    {"role": "user", "content": intelligence_prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            if response.choices:
                content = response.choices[0].message.content
                
                try:
                    return json.loads(content)
                except json.JSONDecodeError as e:
                    logger.error(f"解析威胁情报响应失败: {e}")
                    return {'error': '解析失败', 'raw_response': content}
            
        except Exception as e:
            logger.error(f"获取威胁情报失败: {e}")
        
        return {}
    
    async def get_service_status(self) -> Dict[str, Any]:
        """获取服务状态"""
        return {
            'is_connected': self.is_connected,
            'model': self.model,
            'max_tokens': self.max_tokens,
            'temperature': self.temperature
        }

# 全局OpenAI服务实例
openai_service = OpenAIService()