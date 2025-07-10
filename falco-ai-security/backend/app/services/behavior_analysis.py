#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 行为链路分析服务

该模块实现了基于图数据的行为链路分析功能，包括威胁检测、
异常行为识别、攻击路径分析和风险评估等核心安全分析能力。

作者: Falco AI Security Team
版本: 1.0.0
创建时间: 2024-01-20
"""

from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import logging
import json
import math
from collections import defaultdict, Counter

from neo4j import Driver

from ..models.graph_models import NodeType, RelationshipType
from ..models.event_models import EventSeverity, EventCategory
from .graph_operations import GraphOperations, PathAnalysisResult


logger = logging.getLogger(__name__)


class ThreatLevel(Enum):
    """威胁等级"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AnalysisType(Enum):
    """分析类型"""
    REAL_TIME = "real_time"  # 实时分析
    BATCH = "batch"  # 批量分析
    HISTORICAL = "historical"  # 历史分析
    PREDICTIVE = "predictive"  # 预测分析


@dataclass
class BehaviorPattern:
    """行为模式"""
    pattern_id: str
    name: str
    description: str
    node_types: List[NodeType]
    relationship_types: List[RelationshipType]
    sequence_length: int
    confidence_threshold: float = 0.7
    risk_score: float = 0.5
    tags: List[str] = field(default_factory=list)
    
    def matches(self, sequence: List[Dict[str, Any]]) -> Tuple[bool, float]:
        """
        检查序列是否匹配该模式
        
        Args:
            sequence: 行为序列
            
        Returns:
            Tuple[bool, float]: (是否匹配, 置信度)
        """
        if len(sequence) < self.sequence_length:
            return False, 0.0
        
        # 简单的模式匹配逻辑
        match_score = 0.0
        total_checks = 0
        
        for i, step in enumerate(sequence[:self.sequence_length]):
            total_checks += 1
            
            # 检查节点类型
            if i < len(self.node_types):
                expected_type = self.node_types[i]
                if step.get("node_type") == expected_type.value:
                    match_score += 1.0
            
            # 检查关系类型
            if i < len(self.relationship_types):
                expected_rel = self.relationship_types[i]
                if step.get("relationship_type") == expected_rel.value:
                    match_score += 1.0
                    total_checks += 1
        
        confidence = match_score / total_checks if total_checks > 0 else 0.0
        matches = confidence >= self.confidence_threshold
        
        return matches, confidence


@dataclass
class ThreatIndicator:
    """威胁指标"""
    indicator_id: str
    name: str
    description: str
    threat_level: ThreatLevel
    ioc_type: str  # IOC类型：ip, domain, file_hash, process_name等
    ioc_value: str  # IOC值
    confidence: float = 0.8
    source: str = "internal"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    expires_at: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    
    def is_expired(self) -> bool:
        """检查指标是否过期"""
        if not self.expires_at:
            return False
        
        try:
            expire_time = datetime.fromisoformat(self.expires_at.replace('Z', '+00:00'))
            return datetime.utcnow() > expire_time
        except:
            return False


@dataclass
class BehaviorChain:
    """行为链"""
    chain_id: str
    start_time: str
    end_time: str
    nodes: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]
    total_events: int
    risk_score: float = 0.0
    threat_level: ThreatLevel = ThreatLevel.LOW
    matched_patterns: List[str] = field(default_factory=list)
    matched_indicators: List[str] = field(default_factory=list)
    analysis_summary: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def duration_seconds(self) -> float:
        """获取链持续时间（秒）"""
        try:
            start = datetime.fromisoformat(self.start_time.replace('Z', '+00:00'))
            end = datetime.fromisoformat(self.end_time.replace('Z', '+00:00'))
            return (end - start).total_seconds()
        except:
            return 0.0
    
    @property
    def chain_length(self) -> int:
        """获取链长度"""
        return len(self.relationships)


@dataclass
class AnalysisResult:
    """分析结果"""
    analysis_id: str
    analysis_type: AnalysisType
    start_time: str
    end_time: str
    total_chains: int
    high_risk_chains: int
    detected_threats: List[Dict[str, Any]]
    behavior_chains: List[BehaviorChain]
    statistics: Dict[str, Any]
    recommendations: List[str] = field(default_factory=list)
    execution_time: float = 0.0


class BehaviorAnalysis:
    """行为链路分析服务"""
    
    def __init__(self, graph_ops: GraphOperations):
        """
        初始化行为分析服务
        
        Args:
            graph_ops: 图操作服务实例
        """
        self.graph_ops = graph_ops
        self.threat_patterns = self._load_default_patterns()
        self.threat_indicators = self._load_default_indicators()
        
        logger.info("行为链路分析服务已初始化")
    
    def _load_default_patterns(self) -> List[BehaviorPattern]:
        """加载默认威胁模式"""
        patterns = [
            # 进程注入模式
            BehaviorPattern(
                pattern_id="process_injection",
                name="进程注入攻击",
                description="检测进程注入攻击行为",
                node_types=[NodeType.PROCESS, NodeType.PROCESS],
                relationship_types=[RelationshipType.EXECUTE],
                sequence_length=2,
                confidence_threshold=0.8,
                risk_score=0.9,
                tags=["injection", "privilege_escalation"]
            ),
            
            # 文件篡改模式
            BehaviorPattern(
                pattern_id="file_tampering",
                name="文件篡改攻击",
                description="检测系统文件篡改行为",
                node_types=[NodeType.PROCESS, NodeType.FILE],
                relationship_types=[RelationshipType.WRITE],
                sequence_length=2,
                confidence_threshold=0.7,
                risk_score=0.8,
                tags=["tampering", "persistence"]
            ),
            
            # 网络横向移动模式
            BehaviorPattern(
                pattern_id="lateral_movement",
                name="横向移动攻击",
                description="检测网络横向移动行为",
                node_types=[NodeType.PROCESS, NodeType.NETWORK, NodeType.PROCESS],
                relationship_types=[RelationshipType.CONNECT, RelationshipType.EXECUTE],
                sequence_length=3,
                confidence_threshold=0.75,
                risk_score=0.85,
                tags=["lateral_movement", "network"]
            ),
            
            # 权限提升模式
            BehaviorPattern(
                pattern_id="privilege_escalation",
                name="权限提升攻击",
                description="检测权限提升攻击行为",
                node_types=[NodeType.PROCESS, NodeType.USER],
                relationship_types=[RelationshipType.EXECUTE],
                sequence_length=2,
                confidence_threshold=0.8,
                risk_score=0.9,
                tags=["privilege_escalation", "elevation"]
            ),
            
            # 数据窃取模式
            BehaviorPattern(
                pattern_id="data_exfiltration",
                name="数据窃取攻击",
                description="检测数据窃取行为",
                node_types=[NodeType.PROCESS, NodeType.FILE, NodeType.NETWORK],
                relationship_types=[RelationshipType.READ, RelationshipType.CONNECT],
                sequence_length=3,
                confidence_threshold=0.7,
                risk_score=0.85,
                tags=["exfiltration", "data_theft"]
            )
        ]
        
        logger.info(f"加载了 {len(patterns)} 个默认威胁模式")
        return patterns
    
    def _load_default_indicators(self) -> List[ThreatIndicator]:
        """加载默认威胁指标"""
        indicators = [
            # 恶意进程名
            ThreatIndicator(
                indicator_id="malicious_process_1",
                name="恶意进程 - mimikatz",
                description="检测到 mimikatz 进程",
                threat_level=ThreatLevel.CRITICAL,
                ioc_type="process_name",
                ioc_value="mimikatz.exe",
                confidence=0.95,
                tags=["credential_dumping", "post_exploitation"]
            ),
            
            ThreatIndicator(
                indicator_id="malicious_process_2",
                name="恶意进程 - powershell编码",
                description="检测到编码的PowerShell命令",
                threat_level=ThreatLevel.HIGH,
                ioc_type="process_cmdline",
                ioc_value="-EncodedCommand",
                confidence=0.8,
                tags=["powershell", "obfuscation"]
            ),
            
            # 可疑文件路径
            ThreatIndicator(
                indicator_id="suspicious_file_1",
                name="可疑文件路径 - 临时目录",
                description="检测到临时目录中的可执行文件",
                threat_level=ThreatLevel.MEDIUM,
                ioc_type="file_path",
                ioc_value="/tmp/",
                confidence=0.6,
                tags=["suspicious_location", "temp_files"]
            ),
            
            # 可疑网络连接
            ThreatIndicator(
                indicator_id="suspicious_network_1",
                name="可疑网络连接 - 非标准端口",
                description="检测到非标准端口的网络连接",
                threat_level=ThreatLevel.MEDIUM,
                ioc_type="network_port",
                ioc_value="4444",
                confidence=0.7,
                tags=["suspicious_port", "c2_communication"]
            ),
            
            # 系统文件修改
            ThreatIndicator(
                indicator_id="system_file_modification",
                name="系统文件修改",
                description="检测到系统关键文件被修改",
                threat_level=ThreatLevel.HIGH,
                ioc_type="file_path",
                ioc_value="/etc/passwd",
                confidence=0.9,
                tags=["system_modification", "persistence"]
            )
        ]
        
        logger.info(f"加载了 {len(indicators)} 个默认威胁指标")
        return indicators
    
    # ==================== 核心分析功能 ====================
    
    def analyze_behavior_chains(self, 
                              time_window: int = 3600,
                              analysis_type: AnalysisType = AnalysisType.REAL_TIME) -> AnalysisResult:
        """
        分析行为链
        
        Args:
            time_window: 时间窗口（秒）
            analysis_type: 分析类型
            
        Returns:
            AnalysisResult: 分析结果
        """
        start_time = datetime.utcnow()
        analysis_id = f"analysis_{int(start_time.timestamp())}"
        
        logger.info(f"开始行为链分析: {analysis_id}")
        
        try:
            # 获取时间范围内的行为数据
            end_time = start_time
            start_time_window = end_time - timedelta(seconds=time_window)
            
            behavior_chains = self._extract_behavior_chains(
                start_time_window.isoformat(),
                end_time.isoformat()
            )
            
            # 分析每个行为链
            detected_threats = []
            high_risk_count = 0
            
            for chain in behavior_chains:
                # 模式匹配
                self._match_threat_patterns(chain)
                
                # 指标匹配
                self._match_threat_indicators(chain)
                
                # 计算风险评分
                self._calculate_chain_risk_score(chain)
                
                # 确定威胁等级
                self._determine_threat_level(chain)
                
                # 收集高风险链
                if chain.threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]:
                    high_risk_count += 1
                    detected_threats.append({
                        "chain_id": chain.chain_id,
                        "threat_level": chain.threat_level.value,
                        "risk_score": chain.risk_score,
                        "matched_patterns": chain.matched_patterns,
                        "matched_indicators": chain.matched_indicators,
                        "summary": chain.analysis_summary
                    })
            
            # 生成统计信息
            statistics = self._generate_statistics(behavior_chains)
            
            # 生成建议
            recommendations = self._generate_recommendations(behavior_chains, detected_threats)
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            result = AnalysisResult(
                analysis_id=analysis_id,
                analysis_type=analysis_type,
                start_time=start_time_window.isoformat(),
                end_time=end_time.isoformat(),
                total_chains=len(behavior_chains),
                high_risk_chains=high_risk_count,
                detected_threats=detected_threats,
                behavior_chains=behavior_chains,
                statistics=statistics,
                recommendations=recommendations,
                execution_time=execution_time
            )
            
            logger.info(f"行为链分析完成: {analysis_id}, 发现 {high_risk_count} 个高风险链")
            return result
            
        except Exception as e:
            logger.error(f"行为链分析失败: {e}")
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return AnalysisResult(
                analysis_id=analysis_id,
                analysis_type=analysis_type,
                start_time=start_time_window.isoformat() if 'start_time_window' in locals() else "",
                end_time=datetime.utcnow().isoformat(),
                total_chains=0,
                high_risk_chains=0,
                detected_threats=[],
                behavior_chains=[],
                statistics={"error": str(e)},
                execution_time=execution_time
            )
    
    def _extract_behavior_chains(self, start_time: str, end_time: str) -> List[BehaviorChain]:
        """
        提取行为链
        
        Args:
            start_time: 开始时间
            end_time: 结束时间
            
        Returns:
            List[BehaviorChain]: 行为链列表
        """
        try:
            # 查询时间范围内的所有关系
            query = f"""
            MATCH (n)-[r]->(m)
            WHERE r.timestamp >= '{start_time}' AND r.timestamp <= '{end_time}'
            RETURN n, r, m, r.timestamp as timestamp
            ORDER BY timestamp
            """
            
            with self.graph_ops.driver.session(database=self.graph_ops.database) as session:
                result = session.run(query)
                
                # 按时间顺序收集所有关系
                relationships = []
                for record in result:
                    relationships.append({
                        "source_node": dict(record["n"]),
                        "relationship": dict(record["r"]),
                        "target_node": dict(record["m"]),
                        "timestamp": record["timestamp"]
                    })
            
            # 构建行为链
            chains = self._build_chains_from_relationships(relationships)
            
            logger.info(f"提取了 {len(chains)} 个行为链")
            return chains
            
        except Exception as e:
            logger.error(f"提取行为链失败: {e}")
            return []
    
    def _build_chains_from_relationships(self, relationships: List[Dict[str, Any]]) -> List[BehaviorChain]:
        """
        从关系列表构建行为链
        
        Args:
            relationships: 关系列表
            
        Returns:
            List[BehaviorChain]: 行为链列表
        """
        if not relationships:
            return []
        
        # 按源节点分组
        chains_by_source = defaultdict(list)
        
        for rel in relationships:
            source_id = rel["source_node"].get("id", "")
            chains_by_source[source_id].append(rel)
        
        chains = []
        
        for source_id, source_rels in chains_by_source.items():
            if len(source_rels) < 2:  # 至少需要2个关系才能形成链
                continue
            
            # 按时间排序
            source_rels.sort(key=lambda x: x["timestamp"])
            
            # 创建行为链
            chain_id = f"chain_{source_id}_{int(datetime.utcnow().timestamp())}"
            
            nodes = [source_rels[0]["source_node"]]
            for rel in source_rels:
                nodes.append(rel["target_node"])
            
            # 去重节点
            unique_nodes = []
            seen_ids = set()
            for node in nodes:
                node_id = node.get("id", "")
                if node_id not in seen_ids:
                    unique_nodes.append(node)
                    seen_ids.add(node_id)
            
            chain = BehaviorChain(
                chain_id=chain_id,
                start_time=source_rels[0]["timestamp"],
                end_time=source_rels[-1]["timestamp"],
                nodes=unique_nodes,
                relationships=[rel["relationship"] for rel in source_rels],
                total_events=len(source_rels)
            )
            
            chains.append(chain)
        
        return chains
    
    def _match_threat_patterns(self, chain: BehaviorChain) -> None:
        """
        匹配威胁模式
        
        Args:
            chain: 行为链
        """
        # 构建序列用于模式匹配
        sequence = []
        
        for i, rel in enumerate(chain.relationships):
            step = {
                "relationship_type": rel.get("type", ""),
                "timestamp": rel.get("timestamp", "")
            }
            
            # 添加节点类型信息
            if i < len(chain.nodes):
                step["node_type"] = chain.nodes[i].get("type", "")
            
            sequence.append(step)
        
        # 检查每个威胁模式
        for pattern in self.threat_patterns:
            matches, confidence = pattern.matches(sequence)
            
            if matches:
                chain.matched_patterns.append(pattern.pattern_id)
                
                # 更新分析摘要
                if "matched_patterns" not in chain.analysis_summary:
                    chain.analysis_summary["matched_patterns"] = []
                
                chain.analysis_summary["matched_patterns"].append({
                    "pattern_id": pattern.pattern_id,
                    "pattern_name": pattern.name,
                    "confidence": confidence,
                    "risk_score": pattern.risk_score,
                    "tags": pattern.tags
                })
    
    def _match_threat_indicators(self, chain: BehaviorChain) -> None:
        """
        匹配威胁指标
        
        Args:
            chain: 行为链
        """
        # 检查每个威胁指标
        for indicator in self.threat_indicators:
            if indicator.is_expired():
                continue
            
            # 检查节点中的指标
            for node in chain.nodes:
                if self._check_indicator_match(node, indicator):
                    chain.matched_indicators.append(indicator.indicator_id)
                    
                    # 更新分析摘要
                    if "matched_indicators" not in chain.analysis_summary:
                        chain.analysis_summary["matched_indicators"] = []
                    
                    chain.analysis_summary["matched_indicators"].append({
                        "indicator_id": indicator.indicator_id,
                        "indicator_name": indicator.name,
                        "threat_level": indicator.threat_level.value,
                        "confidence": indicator.confidence,
                        "ioc_type": indicator.ioc_type,
                        "ioc_value": indicator.ioc_value,
                        "tags": indicator.tags
                    })
                    break  # 找到匹配就跳出
            
            # 检查关系中的指标
            for relationship in chain.relationships:
                if self._check_indicator_match(relationship, indicator):
                    if indicator.indicator_id not in chain.matched_indicators:
                        chain.matched_indicators.append(indicator.indicator_id)
    
    def _check_indicator_match(self, data: Dict[str, Any], indicator: ThreatIndicator) -> bool:
        """
        检查数据是否匹配威胁指标
        
        Args:
            data: 数据对象（节点或关系）
            indicator: 威胁指标
            
        Returns:
            bool: 是否匹配
        """
        try:
            if indicator.ioc_type == "process_name":
                process_name = data.get("name", "").lower()
                return indicator.ioc_value.lower() in process_name
            
            elif indicator.ioc_type == "process_cmdline":
                cmdline = data.get("cmdline", "").lower()
                return indicator.ioc_value.lower() in cmdline
            
            elif indicator.ioc_type == "file_path":
                file_path = data.get("path", "").lower()
                return indicator.ioc_value.lower() in file_path
            
            elif indicator.ioc_type == "network_port":
                port = str(data.get("port", ""))
                return indicator.ioc_value == port
            
            elif indicator.ioc_type == "ip_address":
                ip = data.get("ip", "")
                return indicator.ioc_value == ip
            
            return False
            
        except Exception as e:
            logger.warning(f"指标匹配检查失败: {e}")
            return False
    
    def _calculate_chain_risk_score(self, chain: BehaviorChain) -> None:
        """
        计算行为链风险评分
        
        Args:
            chain: 行为链
        """
        base_score = 0.1  # 基础分数
        
        # 基于匹配的模式计算分数
        pattern_score = 0.0
        if "matched_patterns" in chain.analysis_summary:
            for pattern_match in chain.analysis_summary["matched_patterns"]:
                pattern_score += pattern_match["risk_score"] * pattern_match["confidence"]
        
        # 基于匹配的指标计算分数
        indicator_score = 0.0
        if "matched_indicators" in chain.analysis_summary:
            for indicator_match in chain.analysis_summary["matched_indicators"]:
                threat_level_scores = {
                    ThreatLevel.LOW.value: 0.2,
                    ThreatLevel.MEDIUM.value: 0.5,
                    ThreatLevel.HIGH.value: 0.8,
                    ThreatLevel.CRITICAL.value: 1.0
                }
                level_score = threat_level_scores.get(indicator_match["threat_level"], 0.2)
                indicator_score += level_score * indicator_match["confidence"]
        
        # 基于链长度和持续时间的调整
        length_factor = min(chain.chain_length / 10.0, 1.0)  # 链越长风险越高
        duration_factor = min(chain.duration_seconds / 3600.0, 1.0)  # 持续时间越长风险越高
        
        # 综合计算
        total_score = base_score + (pattern_score * 0.4) + (indicator_score * 0.4) + (length_factor * 0.1) + (duration_factor * 0.1)
        
        # 确保分数在0-1范围内
        chain.risk_score = min(max(total_score, 0.0), 1.0)
    
    def _determine_threat_level(self, chain: BehaviorChain) -> None:
        """
        确定威胁等级
        
        Args:
            chain: 行为链
        """
        if chain.risk_score >= 0.8:
            chain.threat_level = ThreatLevel.CRITICAL
        elif chain.risk_score >= 0.6:
            chain.threat_level = ThreatLevel.HIGH
        elif chain.risk_score >= 0.4:
            chain.threat_level = ThreatLevel.MEDIUM
        else:
            chain.threat_level = ThreatLevel.LOW
        
        # 如果匹配到关键指标，提升威胁等级
        if "matched_indicators" in chain.analysis_summary:
            for indicator_match in chain.analysis_summary["matched_indicators"]:
                if indicator_match["threat_level"] == ThreatLevel.CRITICAL.value:
                    chain.threat_level = ThreatLevel.CRITICAL
                    break
                elif indicator_match["threat_level"] == ThreatLevel.HIGH.value and chain.threat_level != ThreatLevel.CRITICAL:
                    chain.threat_level = ThreatLevel.HIGH
    
    def _generate_statistics(self, chains: List[BehaviorChain]) -> Dict[str, Any]:
        """
        生成统计信息
        
        Args:
            chains: 行为链列表
            
        Returns:
            Dict[str, Any]: 统计信息
        """
        if not chains:
            return {}
        
        # 威胁等级分布
        threat_level_dist = Counter(chain.threat_level.value for chain in chains)
        
        # 风险评分分布
        risk_scores = [chain.risk_score for chain in chains]
        avg_risk_score = sum(risk_scores) / len(risk_scores)
        max_risk_score = max(risk_scores)
        
        # 链长度分布
        chain_lengths = [chain.chain_length for chain in chains]
        avg_chain_length = sum(chain_lengths) / len(chain_lengths)
        max_chain_length = max(chain_lengths)
        
        # 持续时间分布
        durations = [chain.duration_seconds for chain in chains]
        avg_duration = sum(durations) / len(durations)
        max_duration = max(durations)
        
        # 模式匹配统计
        pattern_matches = Counter()
        for chain in chains:
            for pattern_id in chain.matched_patterns:
                pattern_matches[pattern_id] += 1
        
        # 指标匹配统计
        indicator_matches = Counter()
        for chain in chains:
            for indicator_id in chain.matched_indicators:
                indicator_matches[indicator_id] += 1
        
        return {
            "total_chains": len(chains),
            "threat_level_distribution": dict(threat_level_dist),
            "risk_score_stats": {
                "average": round(avg_risk_score, 3),
                "maximum": round(max_risk_score, 3),
                "distribution": {
                    "low": len([s for s in risk_scores if s < 0.4]),
                    "medium": len([s for s in risk_scores if 0.4 <= s < 0.6]),
                    "high": len([s for s in risk_scores if 0.6 <= s < 0.8]),
                    "critical": len([s for s in risk_scores if s >= 0.8])
                }
            },
            "chain_length_stats": {
                "average": round(avg_chain_length, 2),
                "maximum": max_chain_length
            },
            "duration_stats": {
                "average_seconds": round(avg_duration, 2),
                "maximum_seconds": round(max_duration, 2)
            },
            "pattern_matches": dict(pattern_matches.most_common(10)),
            "indicator_matches": dict(indicator_matches.most_common(10))
        }
    
    def _generate_recommendations(self, chains: List[BehaviorChain], threats: List[Dict[str, Any]]) -> List[str]:
        """
        生成安全建议
        
        Args:
            chains: 行为链列表
            threats: 威胁列表
            
        Returns:
            List[str]: 建议列表
        """
        recommendations = []
        
        if not chains:
            return ["暂无行为数据，建议检查监控配置"]
        
        # 基于威胁数量的建议
        high_risk_count = len([t for t in threats if t["threat_level"] in ["high", "critical"]])
        
        if high_risk_count > 0:
            recommendations.append(f"发现 {high_risk_count} 个高风险威胁，建议立即调查")
        
        if high_risk_count > 5:
            recommendations.append("高风险威胁数量较多，建议启动应急响应流程")
        
        # 基于模式匹配的建议
        pattern_counts = Counter()
        for chain in chains:
            for pattern_id in chain.matched_patterns:
                pattern_counts[pattern_id] += 1
        
        if "process_injection" in pattern_counts:
            recommendations.append("检测到进程注入攻击，建议加强进程监控")
        
        if "lateral_movement" in pattern_counts:
            recommendations.append("检测到横向移动行为，建议检查网络分段")
        
        if "privilege_escalation" in pattern_counts:
            recommendations.append("检测到权限提升攻击，建议审查用户权限配置")
        
        # 基于链特征的建议
        avg_risk = sum(chain.risk_score for chain in chains) / len(chains)
        
        if avg_risk > 0.6:
            recommendations.append("整体风险水平较高，建议增强安全监控")
        
        if not recommendations:
            recommendations.append("当前安全状态良好，建议继续保持监控")
        
        return recommendations
    
    # ==================== 公共接口 ====================
    
    def add_threat_pattern(self, pattern: BehaviorPattern) -> bool:
        """
        添加威胁模式
        
        Args:
            pattern: 威胁模式
            
        Returns:
            bool: 是否成功
        """
        try:
            self.threat_patterns.append(pattern)
            logger.info(f"添加威胁模式: {pattern.pattern_id}")
            return True
        except Exception as e:
            logger.error(f"添加威胁模式失败: {e}")
            return False
    
    def add_threat_indicator(self, indicator: ThreatIndicator) -> bool:
        """
        添加威胁指标
        
        Args:
            indicator: 威胁指标
            
        Returns:
            bool: 是否成功
        """
        try:
            self.threat_indicators.append(indicator)
            logger.info(f"添加威胁指标: {indicator.indicator_id}")
            return True
        except Exception as e:
            logger.error(f"添加威胁指标失败: {e}")
            return False
    
    def get_threat_patterns(self) -> List[BehaviorPattern]:
        """获取所有威胁模式"""
        return self.threat_patterns.copy()
    
    def get_threat_indicators(self) -> List[ThreatIndicator]:
        """获取所有威胁指标"""
        return [indicator for indicator in self.threat_indicators if not indicator.is_expired()]
    
    def health_check(self) -> Dict[str, Any]:
        """
        健康检查
        
        Returns:
            Dict[str, Any]: 健康状态
        """
        try:
            active_patterns = len(self.threat_patterns)
            active_indicators = len(self.get_threat_indicators())
            
            return {
                "status": "healthy",
                "active_patterns": active_patterns,
                "active_indicators": active_indicators,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }


# 测试函数
if __name__ == "__main__":
    # 这里可以添加测试代码
    pass