#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 提示模板设计

该模块定义了各种安全分析场景的提示模板，包括安全事件分析、
威胁检测、事件响应、风险评估等核心功能的提示模板。

作者: Falco AI Security Team
版本: 1.0.0
创建时间: 2024-01-20
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import json


class PromptType(Enum):
    """提示类型"""
    SECURITY_ANALYSIS = "security_analysis"
    THREAT_DETECTION = "threat_detection"
    INCIDENT_RESPONSE = "incident_response"
    RISK_ASSESSMENT = "risk_assessment"
    BEHAVIOR_ANALYSIS = "behavior_analysis"
    ALERT_INVESTIGATION = "alert_investigation"
    COMPLIANCE_CHECK = "compliance_check"
    FORENSIC_ANALYSIS = "forensic_analysis"
    VULNERABILITY_ASSESSMENT = "vulnerability_assessment"
    ATTACK_PATH_ANALYSIS = "attack_path_analysis"


@dataclass
class PromptTemplate:
    """提示模板"""
    name: str
    type: PromptType
    template: str
    description: str
    required_fields: List[str]
    optional_fields: List[str] = None
    output_format: str = "json"
    max_tokens: int = 2000
    temperature: float = 0.1
    
    def format(self, **kwargs) -> str:
        """格式化模板"""
        # 检查必需字段
        missing_fields = [field for field in self.required_fields if field not in kwargs]
        if missing_fields:
            raise ValueError(f"缺少必需字段: {missing_fields}")
        
        return self.template.format(**kwargs)


class SecurityPrompts:
    """安全分析提示模板集合"""
    
    # ==================== 安全事件分析 ====================
    
    SECURITY_ANALYSIS_PROMPT = PromptTemplate(
        name="security_analysis",
        type=PromptType.SECURITY_ANALYSIS,
        description="分析安全事件，提供详细的安全分析报告",
        required_fields=["event_details", "context_info"],
        optional_fields=["rag_context", "historical_data"],
        template="""
你是一个专业的网络安全分析师。请分析以下安全事件：

事件详情：
{event_details}

相关上下文：
{context_info}

知识库检索结果：
{rag_context}

历史数据参考：
{historical_data}

请提供详细的安全分析，包括：
1. 异常原因分析
2. 风险等级评估 (低/中/高/严重)
3. 影响范围评估
4. 攻击向量分析
5. 具体修复建议
6. 预防措施建议
7. 相关IOC指标
8. 建议的响应优先级

请以JSON格式返回分析结果，格式如下：
{{
  "analysis_summary": "事件分析摘要",
  "risk_level": "风险等级",
  "impact_scope": "影响范围",
  "attack_vectors": ["攻击向量列表"],
  "root_cause": "根本原因",
  "remediation_steps": ["修复步骤列表"],
  "prevention_measures": ["预防措施列表"],
  "ioc_indicators": ["IOC指标列表"],
  "response_priority": "响应优先级",
  "confidence_score": "置信度分数(0-1)"
}}
"""
    )
    
    # ==================== 威胁检测 ====================
    
    THREAT_DETECTION_PROMPT = PromptTemplate(
        name="threat_detection",
        type=PromptType.THREAT_DETECTION,
        description="检测和识别潜在的安全威胁",
        required_fields=["behavior_data", "system_context"],
        optional_fields=["threat_intel", "baseline_behavior"],
        template="""
你是一个威胁检测专家。请分析以下行为数据，识别潜在的安全威胁：

行为数据：
{behavior_data}

系统上下文：
{system_context}

威胁情报：
{threat_intel}

基线行为：
{baseline_behavior}

请进行威胁检测分析，包括：
1. 威胁类型识别
2. 威胁严重性评估
3. 攻击技术分析 (MITRE ATT&CK)
4. 异常行为特征
5. 检测置信度
6. 建议的检测规则
7. 误报可能性评估

请以JSON格式返回检测结果：
{{
  "threat_detected": true/false,
  "threat_type": "威胁类型",
  "severity": "严重性等级",
  "mitre_techniques": ["MITRE ATT&CK技术ID"],
  "anomaly_features": ["异常特征列表"],
  "confidence_score": "检测置信度(0-1)",
  "detection_rules": ["建议的检测规则"],
  "false_positive_risk": "误报风险评估",
  "recommended_actions": ["建议的响应行动"]
}}
"""
    )
    
    # ==================== 事件响应 ====================
    
    INCIDENT_RESPONSE_PROMPT = PromptTemplate(
        name="incident_response",
        type=PromptType.INCIDENT_RESPONSE,
        description="提供事件响应指导和处理建议",
        required_fields=["incident_details", "incident_type"],
        optional_fields=["affected_systems", "business_impact", "available_resources"],
        template="""
你是一个事件响应专家。请为以下安全事件提供响应指导：

事件详情：
{incident_details}

事件类型：
{incident_type}

受影响系统：
{affected_systems}

业务影响：
{business_impact}

可用资源：
{available_resources}

请提供完整的事件响应计划，包括：
1. 事件严重性分级
2. 立即响应步骤
3. 调查和取证指导
4. 遏制和隔离措施
5. 恢复和修复计划
6. 沟通和报告要求
7. 经验教训和改进建议

请以JSON格式返回响应计划：
{{
  "severity_classification": "事件严重性分级",
  "immediate_actions": ["立即响应步骤"],
  "investigation_steps": ["调查步骤"],
  "containment_measures": ["遏制措施"],
  "recovery_plan": ["恢复步骤"],
  "communication_plan": ["沟通要求"],
  "timeline_estimate": "预估处理时间",
  "required_resources": ["所需资源"],
  "lessons_learned": ["经验教训"],
  "improvement_recommendations": ["改进建议"]
}}
"""
    )
    
    # ==================== 风险评估 ====================
    
    RISK_ASSESSMENT_PROMPT = PromptTemplate(
        name="risk_assessment",
        type=PromptType.RISK_ASSESSMENT,
        description="评估安全风险和影响",
        required_fields=["asset_info", "threat_landscape"],
        optional_fields=["vulnerability_data", "control_measures", "business_context"],
        template="""
你是一个风险评估专家。请对以下资产和威胁进行风险评估：

资产信息：
{asset_info}

威胁态势：
{threat_landscape}

漏洞数据：
{vulnerability_data}

控制措施：
{control_measures}

业务上下文：
{business_context}

请进行全面的风险评估，包括：
1. 资产价值评估
2. 威胁可能性分析
3. 漏洞影响评估
4. 风险等级计算
5. 控制措施有效性
6. 残余风险评估
7. 风险处理建议

请以JSON格式返回风险评估结果：
{{
  "asset_value": "资产价值等级",
  "threat_likelihood": "威胁可能性",
  "vulnerability_impact": "漏洞影响等级",
  "risk_score": "风险分数(1-10)",
  "risk_level": "风险等级",
  "control_effectiveness": "控制措施有效性",
  "residual_risk": "残余风险等级",
  "risk_treatment": "风险处理策略",
  "mitigation_recommendations": ["缓解建议"],
  "monitoring_requirements": ["监控要求"]
}}
"""
    )
    
    # ==================== 行为分析 ====================
    
    BEHAVIOR_ANALYSIS_PROMPT = PromptTemplate(
        name="behavior_analysis",
        type=PromptType.BEHAVIOR_ANALYSIS,
        description="分析用户和系统行为模式",
        required_fields=["behavior_sequence", "entity_info"],
        optional_fields=["normal_patterns", "peer_comparison", "temporal_context"],
        template="""
你是一个行为分析专家。请分析以下行为序列，识别异常模式：

行为序列：
{behavior_sequence}

实体信息：
{entity_info}

正常模式：
{normal_patterns}

同类对比：
{peer_comparison}

时间上下文：
{temporal_context}

请进行行为分析，包括：
1. 行为模式识别
2. 异常行为检测
3. 行为风险评估
4. 模式变化分析
5. 预测性分析
6. 行为基线更新建议

请以JSON格式返回分析结果：
{{
  "behavior_patterns": ["识别的行为模式"],
  "anomalies_detected": ["检测到的异常"],
  "risk_indicators": ["风险指标"],
  "pattern_changes": ["模式变化"],
  "anomaly_score": "异常分数(0-1)",
  "predictive_insights": ["预测性洞察"],
  "baseline_updates": ["基线更新建议"],
  "recommended_monitoring": ["建议的监控重点"]
}}
"""
    )
    
    # ==================== 告警调查 ====================
    
    ALERT_INVESTIGATION_PROMPT = PromptTemplate(
        name="alert_investigation",
        type=PromptType.ALERT_INVESTIGATION,
        description="调查和分析安全告警",
        required_fields=["alert_details", "rule_info"],
        optional_fields=["related_events", "system_state", "user_context"],
        template="""
你是一个告警调查专家。请调查以下安全告警：

告警详情：
{alert_details}

规则信息：
{rule_info}

相关事件：
{related_events}

系统状态：
{system_state}

用户上下文：
{user_context}

请进行告警调查，包括：
1. 告警真实性验证
2. 根本原因分析
3. 影响范围评估
4. 相关性分析
5. 误报可能性
6. 调查优先级
7. 后续行动建议

请以JSON格式返回调查结果：
{{
  "alert_validity": "告警真实性",
  "root_cause": "根本原因",
  "impact_assessment": "影响评估",
  "correlation_analysis": ["相关性分析"],
  "false_positive_probability": "误报概率",
  "investigation_priority": "调查优先级",
  "evidence_collected": ["收集的证据"],
  "next_actions": ["后续行动"],
  "escalation_needed": true/false,
  "investigation_confidence": "调查置信度(0-1)"
}}
"""
    )
    
    # ==================== 合规检查 ====================
    
    COMPLIANCE_CHECK_PROMPT = PromptTemplate(
        name="compliance_check",
        type=PromptType.COMPLIANCE_CHECK,
        description="检查安全合规性",
        required_fields=["system_config", "compliance_framework"],
        optional_fields=["policy_requirements", "audit_findings", "remediation_status"],
        template="""
你是一个合规检查专家。请检查以下系统配置的合规性：

系统配置：
{system_config}

合规框架：
{compliance_framework}

政策要求：
{policy_requirements}

审计发现：
{audit_findings}

修复状态：
{remediation_status}

请进行合规检查，包括：
1. 合规状态评估
2. 不合规项识别
3. 风险等级评估
4. 修复建议
5. 合规时间表
6. 监控要求

请以JSON格式返回检查结果：
{{
  "compliance_status": "合规状态",
  "compliance_score": "合规分数(0-100)",
  "non_compliant_items": ["不合规项"],
  "risk_levels": ["风险等级"],
  "remediation_plan": ["修复计划"],
  "timeline_estimate": "预估时间",
  "monitoring_requirements": ["监控要求"],
  "certification_readiness": "认证准备度"
}}
"""
    )
    
    # ==================== 取证分析 ====================
    
    FORENSIC_ANALYSIS_PROMPT = PromptTemplate(
        name="forensic_analysis",
        type=PromptType.FORENSIC_ANALYSIS,
        description="进行数字取证分析",
        required_fields=["evidence_data", "incident_timeline"],
        optional_fields=["system_artifacts", "network_logs", "user_activities"],
        template="""
你是一个数字取证专家。请分析以下证据数据：

证据数据：
{evidence_data}

事件时间线：
{incident_timeline}

系统痕迹：
{system_artifacts}

网络日志：
{network_logs}

用户活动：
{user_activities}

请进行取证分析，包括：
1. 证据完整性验证
2. 攻击时间线重建
3. 攻击者行为分析
4. 数据泄露评估
5. 证据链构建
6. 法律证据价值

请以JSON格式返回分析结果：
{{
  "evidence_integrity": "证据完整性",
  "attack_timeline": ["攻击时间线"],
  "attacker_behavior": ["攻击者行为"],
  "data_compromise": "数据泄露评估",
  "evidence_chain": ["证据链"],
  "legal_admissibility": "法律可采性",
  "key_findings": ["关键发现"],
  "reconstruction_confidence": "重建置信度(0-1)"
}}
"""
    )
    
    # ==================== 漏洞评估 ====================
    
    VULNERABILITY_ASSESSMENT_PROMPT = PromptTemplate(
        name="vulnerability_assessment",
        type=PromptType.VULNERABILITY_ASSESSMENT,
        description="评估系统漏洞和安全弱点",
        required_fields=["scan_results", "system_info"],
        optional_fields=["threat_context", "business_criticality", "existing_controls"],
        template="""
你是一个漏洞评估专家。请分析以下扫描结果：

扫描结果：
{scan_results}

系统信息：
{system_info}

威胁上下文：
{threat_context}

业务关键性：
{business_criticality}

现有控制措施：
{existing_controls}

请进行漏洞评估，包括：
1. 漏洞严重性分级
2. 可利用性分析
3. 业务影响评估
4. 修复优先级排序
5. 补偿控制建议
6. 修复时间估算

请以JSON格式返回评估结果：
{{
  "vulnerability_summary": "漏洞摘要",
  "severity_distribution": {{"critical": 0, "high": 0, "medium": 0, "low": 0}},
  "exploitability_analysis": ["可利用性分析"],
  "business_impact": "业务影响等级",
  "remediation_priority": ["修复优先级排序"],
  "compensating_controls": ["补偿控制措施"],
  "remediation_timeline": "修复时间估算",
  "risk_acceptance_options": ["风险接受选项"]
}}
"""
    )
    
    # ==================== 攻击路径分析 ====================
    
    ATTACK_PATH_ANALYSIS_PROMPT = PromptTemplate(
        name="attack_path_analysis",
        type=PromptType.ATTACK_PATH_ANALYSIS,
        description="分析潜在的攻击路径和攻击链",
        required_fields=["network_topology", "asset_inventory"],
        optional_fields=["vulnerability_map", "access_controls", "monitoring_coverage"],
        template="""
你是一个攻击路径分析专家。请分析以下环境的潜在攻击路径：

网络拓扑：
{network_topology}

资产清单：
{asset_inventory}

漏洞映射：
{vulnerability_map}

访问控制：
{access_controls}

监控覆盖：
{monitoring_coverage}

请进行攻击路径分析，包括：
1. 攻击面识别
2. 攻击路径枚举
3. 关键节点分析
4. 攻击复杂度评估
5. 检测难度分析
6. 防护建议

请以JSON格式返回分析结果：
{{
  "attack_surface": ["攻击面"],
  "attack_paths": ["攻击路径"],
  "critical_nodes": ["关键节点"],
  "attack_complexity": "攻击复杂度",
  "detection_difficulty": "检测难度",
  "choke_points": ["关键控制点"],
  "defense_recommendations": ["防护建议"],
  "monitoring_gaps": ["监控盲点"]
}}
"""
    )


class PromptManager:
    """提示模板管理器"""
    
    def __init__(self):
        """初始化提示管理器"""
        self.templates = {
            PromptType.SECURITY_ANALYSIS: SecurityPrompts.SECURITY_ANALYSIS_PROMPT,
            PromptType.THREAT_DETECTION: SecurityPrompts.THREAT_DETECTION_PROMPT,
            PromptType.INCIDENT_RESPONSE: SecurityPrompts.INCIDENT_RESPONSE_PROMPT,
            PromptType.RISK_ASSESSMENT: SecurityPrompts.RISK_ASSESSMENT_PROMPT,
            PromptType.BEHAVIOR_ANALYSIS: SecurityPrompts.BEHAVIOR_ANALYSIS_PROMPT,
            PromptType.ALERT_INVESTIGATION: SecurityPrompts.ALERT_INVESTIGATION_PROMPT,
            PromptType.COMPLIANCE_CHECK: SecurityPrompts.COMPLIANCE_CHECK_PROMPT,
            PromptType.FORENSIC_ANALYSIS: SecurityPrompts.FORENSIC_ANALYSIS_PROMPT,
            PromptType.VULNERABILITY_ASSESSMENT: SecurityPrompts.VULNERABILITY_ASSESSMENT_PROMPT,
            PromptType.ATTACK_PATH_ANALYSIS: SecurityPrompts.ATTACK_PATH_ANALYSIS_PROMPT,
        }
    
    def get_template(self, prompt_type: PromptType) -> PromptTemplate:
        """获取提示模板"""
        if prompt_type not in self.templates:
            raise ValueError(f"未知的提示类型: {prompt_type}")
        return self.templates[prompt_type]
    
    def format_prompt(self, prompt_type: PromptType, **kwargs) -> str:
        """格式化提示"""
        template = self.get_template(prompt_type)
        return template.format(**kwargs)
    
    def list_templates(self) -> List[str]:
        """列出所有模板"""
        return [template.name for template in self.templates.values()]
    
    def get_template_info(self, prompt_type: PromptType) -> Dict[str, Any]:
        """获取模板信息"""
        template = self.get_template(prompt_type)
        return {
            "name": template.name,
            "type": template.type.value,
            "description": template.description,
            "required_fields": template.required_fields,
            "optional_fields": template.optional_fields or [],
            "output_format": template.output_format,
            "max_tokens": template.max_tokens,
            "temperature": template.temperature
        }
    
    def validate_inputs(self, prompt_type: PromptType, **kwargs) -> List[str]:
        """验证输入参数"""
        template = self.get_template(prompt_type)
        missing_fields = [field for field in template.required_fields if field not in kwargs]
        return missing_fields


# 全局提示管理器实例
prompt_manager = PromptManager()


# 便捷函数
def get_security_analysis_prompt(**kwargs) -> str:
    """获取安全分析提示"""
    return prompt_manager.format_prompt(PromptType.SECURITY_ANALYSIS, **kwargs)


def get_threat_detection_prompt(**kwargs) -> str:
    """获取威胁检测提示"""
    return prompt_manager.format_prompt(PromptType.THREAT_DETECTION, **kwargs)


def get_incident_response_prompt(**kwargs) -> str:
    """获取事件响应提示"""
    return prompt_manager.format_prompt(PromptType.INCIDENT_RESPONSE, **kwargs)


def get_risk_assessment_prompt(**kwargs) -> str:
    """获取风险评估提示"""
    return prompt_manager.format_prompt(PromptType.RISK_ASSESSMENT, **kwargs)


def get_behavior_analysis_prompt(**kwargs) -> str:
    """获取行为分析提示"""
    return prompt_manager.format_prompt(PromptType.BEHAVIOR_ANALYSIS, **kwargs)


def get_alert_investigation_prompt(**kwargs) -> str:
    """获取告警调查提示"""
    return prompt_manager.format_prompt(PromptType.ALERT_INVESTIGATION, **kwargs)


def get_compliance_check_prompt(**kwargs) -> str:
    """获取合规检查提示"""
    return prompt_manager.format_prompt(PromptType.COMPLIANCE_CHECK, **kwargs)


def get_forensic_analysis_prompt(**kwargs) -> str:
    """获取取证分析提示"""
    return prompt_manager.format_prompt(PromptType.FORENSIC_ANALYSIS, **kwargs)


def get_vulnerability_assessment_prompt(**kwargs) -> str:
    """获取漏洞评估提示"""
    return prompt_manager.format_prompt(PromptType.VULNERABILITY_ASSESSMENT, **kwargs)


def get_attack_path_analysis_prompt(**kwargs) -> str:
    """获取攻击路径分析提示"""
    return prompt_manager.format_prompt(PromptType.ATTACK_PATH_ANALYSIS, **kwargs)


# 测试函数
if __name__ == "__main__":
    # 测试提示模板
    manager = PromptManager()
    
    # 列出所有模板
    print("可用的提示模板:")
    for template_name in manager.list_templates():
        print(f"- {template_name}")
    
    # 测试安全分析提示
    try:
        prompt = get_security_analysis_prompt(
            event_details="检测到异常网络连接",
            context_info="系统: Ubuntu 20.04, 用户: admin",
            rag_context="相关安全知识库内容",
            historical_data="历史类似事件数据"
        )
        print("\n安全分析提示示例:")
        print(prompt[:500] + "...")
    except Exception as e:
        print(f"测试失败: {e}")