#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 图数据操作服务

该模块实现了Neo4j图数据库的数据插入、查询和分析功能，
为行为图谱提供完整的数据操作接口。

作者: Falco AI Security Team
版本: 1.0.0
创建时间: 2024-01-20
"""

from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor

from neo4j import GraphDatabase, Driver, Session, Transaction
from neo4j.exceptions import ServiceUnavailable, TransientError

from ..models.graph_models import (
    BaseNode, BaseRelationship, NodeType, RelationshipType,
    ProcessNode, FileNode, NetworkNode, UserNode, ContainerNode, ThreatNode,
    GraphModelFactory, GraphQuery
)
from ..models.event_models import FalcoEvent, ProcessedEvent
from .behavior_parser import BehaviorTriplet


logger = logging.getLogger(__name__)


@dataclass
class GraphOperationResult:
    """图操作结果"""
    success: bool
    message: str
    data: Optional[Any] = None
    affected_count: int = 0
    execution_time: float = 0.0


@dataclass
class GraphStatistics:
    """图统计信息"""
    total_nodes: int = 0
    total_relationships: int = 0
    node_types: Dict[str, int] = None
    relationship_types: Dict[str, int] = None
    last_updated: str = None
    
    def __post_init__(self):
        if self.node_types is None:
            self.node_types = {}
        if self.relationship_types is None:
            self.relationship_types = {}
        if self.last_updated is None:
            self.last_updated = datetime.utcnow().isoformat()


@dataclass
class PathAnalysisResult:
    """路径分析结果"""
    paths: List[Dict[str, Any]]
    total_paths: int
    max_depth: int
    analysis_summary: Dict[str, Any]
    risk_score: float = 0.0


class GraphOperations:
    """图数据操作服务"""
    
    def __init__(self, driver: Driver, database: str = "neo4j"):
        """
        初始化图操作服务
        
        Args:
            driver: Neo4j驱动实例
            database: 数据库名称
        """
        self.driver = driver
        self.database = database
        self.executor = ThreadPoolExecutor(max_workers=4)
        self._stats_cache = None
        self._stats_cache_time = None
        self._cache_ttl = 300  # 5分钟缓存
        
        logger.info(f"图操作服务已初始化，数据库: {database}")
    
    def close(self):
        """关闭服务"""
        if self.executor:
            self.executor.shutdown(wait=True)
        logger.info("图操作服务已关闭")
    
    # ==================== 基础操作 ====================
    
    def create_node(self, node: BaseNode) -> GraphOperationResult:
        """
        创建节点
        
        Args:
            node: 节点对象
            
        Returns:
            GraphOperationResult: 操作结果
        """
        start_time = datetime.utcnow()
        
        try:
            with self.driver.session(database=self.database) as session:
                query = node.to_cypher_merge()
                result = session.run(query)
                
                execution_time = (datetime.utcnow() - start_time).total_seconds()
                
                return GraphOperationResult(
                    success=True,
                    message=f"节点创建成功: {node.id}",
                    data={"node_id": node.id, "node_type": node.type.value},
                    affected_count=1,
                    execution_time=execution_time
                )
                
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"创建节点失败: {e}")
            
            return GraphOperationResult(
                success=False,
                message=f"节点创建失败: {str(e)}",
                execution_time=execution_time
            )
    
    def create_relationship(self, relationship: BaseRelationship) -> GraphOperationResult:
        """
        创建关系
        
        Args:
            relationship: 关系对象
            
        Returns:
            GraphOperationResult: 操作结果
        """
        start_time = datetime.utcnow()
        
        try:
            with self.driver.session(database=self.database) as session:
                query = relationship.to_cypher_merge()
                result = session.run(query)
                
                execution_time = (datetime.utcnow() - start_time).total_seconds()
                
                return GraphOperationResult(
                    success=True,
                    message=f"关系创建成功: {relationship.id}",
                    data={
                        "relationship_id": relationship.id,
                        "relationship_type": relationship.type.value,
                        "source_id": relationship.source_id,
                        "target_id": relationship.target_id
                    },
                    affected_count=1,
                    execution_time=execution_time
                )
                
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"创建关系失败: {e}")
            
            return GraphOperationResult(
                success=False,
                message=f"关系创建失败: {str(e)}",
                execution_time=execution_time
            )
    
    def batch_create_nodes(self, nodes: List[BaseNode]) -> GraphOperationResult:
        """
        批量创建节点
        
        Args:
            nodes: 节点列表
            
        Returns:
            GraphOperationResult: 操作结果
        """
        start_time = datetime.utcnow()
        
        try:
            with self.driver.session(database=self.database) as session:
                with session.begin_transaction() as tx:
                    created_count = 0
                    
                    for node in nodes:
                        query = node.to_cypher_merge()
                        tx.run(query)
                        created_count += 1
                    
                    tx.commit()
                
                execution_time = (datetime.utcnow() - start_time).total_seconds()
                
                return GraphOperationResult(
                    success=True,
                    message=f"批量创建节点成功: {created_count}个",
                    data={"created_nodes": [node.id for node in nodes]},
                    affected_count=created_count,
                    execution_time=execution_time
                )
                
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"批量创建节点失败: {e}")
            
            return GraphOperationResult(
                success=False,
                message=f"批量创建节点失败: {str(e)}",
                execution_time=execution_time
            )
    
    def batch_create_relationships(self, relationships: List[BaseRelationship]) -> GraphOperationResult:
        """
        批量创建关系
        
        Args:
            relationships: 关系列表
            
        Returns:
            GraphOperationResult: 操作结果
        """
        start_time = datetime.utcnow()
        
        try:
            with self.driver.session(database=self.database) as session:
                with session.begin_transaction() as tx:
                    created_count = 0
                    
                    for relationship in relationships:
                        query = relationship.to_cypher_merge()
                        tx.run(query)
                        created_count += 1
                    
                    tx.commit()
                
                execution_time = (datetime.utcnow() - start_time).total_seconds()
                
                return GraphOperationResult(
                    success=True,
                    message=f"批量创建关系成功: {created_count}个",
                    data={"created_relationships": [rel.id for rel in relationships]},
                    affected_count=created_count,
                    execution_time=execution_time
                )
                
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"批量创建关系失败: {e}")
            
            return GraphOperationResult(
                success=False,
                message=f"批量创建关系失败: {str(e)}",
                execution_time=execution_time
            )
    
    # ==================== 查询操作 ====================
    
    def find_node_by_id(self, node_id: str) -> GraphOperationResult:
        """
        根据ID查找节点
        
        Args:
            node_id: 节点ID
            
        Returns:
            GraphOperationResult: 操作结果
        """
        start_time = datetime.utcnow()
        
        try:
            with self.driver.session(database=self.database) as session:
                query = GraphQuery.find_node_by_id(node_id)
                result = session.run(query)
                
                records = [record["n"] for record in result]
                execution_time = (datetime.utcnow() - start_time).total_seconds()
                
                if records:
                    return GraphOperationResult(
                        success=True,
                        message=f"找到节点: {node_id}",
                        data=records[0],
                        affected_count=len(records),
                        execution_time=execution_time
                    )
                else:
                    return GraphOperationResult(
                        success=False,
                        message=f"未找到节点: {node_id}",
                        execution_time=execution_time
                    )
                    
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"查找节点失败: {e}")
            
            return GraphOperationResult(
                success=False,
                message=f"查找节点失败: {str(e)}",
                execution_time=execution_time
            )
    
    def find_nodes_by_type(self, node_type: NodeType, limit: int = 100) -> GraphOperationResult:
        """
        根据类型查找节点
        
        Args:
            node_type: 节点类型
            limit: 限制数量
            
        Returns:
            GraphOperationResult: 操作结果
        """
        start_time = datetime.utcnow()
        
        try:
            with self.driver.session(database=self.database) as session:
                query = f"{GraphQuery.find_nodes_by_type(node_type)} LIMIT {limit}"
                result = session.run(query)
                
                records = [record["n"] for record in result]
                execution_time = (datetime.utcnow() - start_time).total_seconds()
                
                return GraphOperationResult(
                    success=True,
                    message=f"找到 {len(records)} 个 {node_type.value} 节点",
                    data=records,
                    affected_count=len(records),
                    execution_time=execution_time
                )
                
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"查找节点失败: {e}")
            
            return GraphOperationResult(
                success=False,
                message=f"查找节点失败: {str(e)}",
                execution_time=execution_time
            )
    
    def find_connected_nodes(self, node_id: str, depth: int = 1, limit: int = 50) -> GraphOperationResult:
        """
        查找连接的节点
        
        Args:
            node_id: 起始节点ID
            depth: 搜索深度
            limit: 限制数量
            
        Returns:
            GraphOperationResult: 操作结果
        """
        start_time = datetime.utcnow()
        
        try:
            with self.driver.session(database=self.database) as session:
                query = f"{GraphQuery.find_connected_nodes(node_id, depth)} LIMIT {limit}"
                result = session.run(query)
                
                records = [(record["start"], record["connected"]) for record in result]
                execution_time = (datetime.utcnow() - start_time).total_seconds()
                
                return GraphOperationResult(
                    success=True,
                    message=f"找到 {len(records)} 个连接节点",
                    data=records,
                    affected_count=len(records),
                    execution_time=execution_time
                )
                
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"查找连接节点失败: {e}")
            
            return GraphOperationResult(
                success=False,
                message=f"查找连接节点失败: {str(e)}",
                execution_time=execution_time
            )
    
    # ==================== 行为分析 ====================
    
    def create_from_behavior_triplet(self, triplet: BehaviorTriplet) -> GraphOperationResult:
        """
        从行为三元组创建图数据
        
        Args:
            triplet: 行为三元组
            
        Returns:
            GraphOperationResult: 操作结果
        """
        start_time = datetime.utcnow()
        
        try:
            # 转换为图模型
            subject_node, relationship, object_node = GraphModelFactory.from_behavior_triplet(triplet)
            
            with self.driver.session(database=self.database) as session:
                with session.begin_transaction() as tx:
                    # 创建节点
                    tx.run(subject_node.to_cypher_merge())
                    tx.run(object_node.to_cypher_merge())
                    
                    # 创建关系
                    tx.run(relationship.to_cypher_merge())
                    
                    tx.commit()
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return GraphOperationResult(
                success=True,
                message=f"行为三元组创建成功: {triplet.id}",
                data={
                    "triplet_id": triplet.id,
                    "subject_id": subject_node.id,
                    "relationship_id": relationship.id,
                    "object_id": object_node.id
                },
                affected_count=3,  # 2个节点 + 1个关系
                execution_time=execution_time
            )
            
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"创建行为三元组失败: {e}")
            
            return GraphOperationResult(
                success=False,
                message=f"创建行为三元组失败: {str(e)}",
                execution_time=execution_time
            )
    
    def batch_create_from_triplets(self, triplets: List[BehaviorTriplet]) -> GraphOperationResult:
        """
        批量从行为三元组创建图数据
        
        Args:
            triplets: 行为三元组列表
            
        Returns:
            GraphOperationResult: 操作结果
        """
        start_time = datetime.utcnow()
        
        try:
            nodes = []
            relationships = []
            
            # 转换所有三元组
            for triplet in triplets:
                subject_node, relationship, object_node = GraphModelFactory.from_behavior_triplet(triplet)
                nodes.extend([subject_node, object_node])
                relationships.append(relationship)
            
            # 去重节点（基于ID）
            unique_nodes = {}
            for node in nodes:
                unique_nodes[node.id] = node
            nodes = list(unique_nodes.values())
            
            with self.driver.session(database=self.database) as session:
                with session.begin_transaction() as tx:
                    # 批量创建节点
                    for node in nodes:
                        tx.run(node.to_cypher_merge())
                    
                    # 批量创建关系
                    for relationship in relationships:
                        tx.run(relationship.to_cypher_merge())
                    
                    tx.commit()
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return GraphOperationResult(
                success=True,
                message=f"批量创建行为三元组成功: {len(triplets)}个",
                data={
                    "triplet_count": len(triplets),
                    "node_count": len(nodes),
                    "relationship_count": len(relationships)
                },
                affected_count=len(nodes) + len(relationships),
                execution_time=execution_time
            )
            
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"批量创建行为三元组失败: {e}")
            
            return GraphOperationResult(
                success=False,
                message=f"批量创建行为三元组失败: {str(e)}",
                execution_time=execution_time
            )
    
    def find_attack_paths(self, source_id: str, target_id: str, max_depth: int = 5) -> PathAnalysisResult:
        """
        查找攻击路径
        
        Args:
            source_id: 源节点ID
            target_id: 目标节点ID
            max_depth: 最大深度
            
        Returns:
            PathAnalysisResult: 路径分析结果
        """
        try:
            with self.driver.session(database=self.database) as session:
                query = GraphQuery.find_attack_path(source_id, target_id, max_depth)
                result = session.run(query)
                
                paths = []
                for record in result:
                    path_data = record["path"]
                    paths.append({
                        "nodes": [node for node in path_data.nodes],
                        "relationships": [rel for rel in path_data.relationships],
                        "length": len(path_data.relationships)
                    })
                
                # 计算风险评分
                risk_score = self._calculate_path_risk_score(paths)
                
                return PathAnalysisResult(
                    paths=paths,
                    total_paths=len(paths),
                    max_depth=max(path["length"] for path in paths) if paths else 0,
                    analysis_summary={
                        "source_id": source_id,
                        "target_id": target_id,
                        "search_depth": max_depth,
                        "paths_found": len(paths)
                    },
                    risk_score=risk_score
                )
                
        except Exception as e:
            logger.error(f"查找攻击路径失败: {e}")
            return PathAnalysisResult(
                paths=[],
                total_paths=0,
                max_depth=0,
                analysis_summary={"error": str(e)}
            )
    
    def find_anomalous_behaviors(self, threshold: float = 0.8, limit: int = 100) -> GraphOperationResult:
        """
        查找异常行为
        
        Args:
            threshold: 置信度阈值
            limit: 限制数量
            
        Returns:
            GraphOperationResult: 操作结果
        """
        start_time = datetime.utcnow()
        
        try:
            with self.driver.session(database=self.database) as session:
                query = f"{GraphQuery.find_anomalous_behaviors(threshold)} LIMIT {limit}"
                result = session.run(query)
                
                anomalies = []
                for record in result:
                    anomalies.append({
                        "source_node": dict(record["n"]),
                        "relationship": dict(record["r"]),
                        "target_node": dict(record["m"])
                    })
                
                execution_time = (datetime.utcnow() - start_time).total_seconds()
                
                return GraphOperationResult(
                    success=True,
                    message=f"找到 {len(anomalies)} 个异常行为",
                    data=anomalies,
                    affected_count=len(anomalies),
                    execution_time=execution_time
                )
                
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"查找异常行为失败: {e}")
            
            return GraphOperationResult(
                success=False,
                message=f"查找异常行为失败: {str(e)}",
                execution_time=execution_time
            )
    
    # ==================== 统计分析 ====================
    
    def get_graph_statistics(self, use_cache: bool = True) -> GraphStatistics:
        """
        获取图统计信息
        
        Args:
            use_cache: 是否使用缓存
            
        Returns:
            GraphStatistics: 统计信息
        """
        # 检查缓存
        if use_cache and self._stats_cache and self._stats_cache_time:
            cache_age = (datetime.utcnow() - self._stats_cache_time).total_seconds()
            if cache_age < self._cache_ttl:
                return self._stats_cache
        
        try:
            with self.driver.session(database=self.database) as session:
                # 获取节点统计
                node_result = session.run(GraphQuery.get_node_statistics())
                node_types = {}
                total_nodes = 0
                
                for record in node_result:
                    node_type = record["node_type"]
                    count = record["count"]
                    node_types[node_type] = count
                    total_nodes += count
                
                # 获取关系统计
                rel_result = session.run(GraphQuery.get_relationship_statistics())
                relationship_types = {}
                total_relationships = 0
                
                for record in rel_result:
                    rel_type = record["relationship_type"]
                    count = record["count"]
                    relationship_types[rel_type] = count
                    total_relationships += count
                
                stats = GraphStatistics(
                    total_nodes=total_nodes,
                    total_relationships=total_relationships,
                    node_types=node_types,
                    relationship_types=relationship_types,
                    last_updated=datetime.utcnow().isoformat()
                )
                
                # 更新缓存
                self._stats_cache = stats
                self._stats_cache_time = datetime.utcnow()
                
                return stats
                
        except Exception as e:
            logger.error(f"获取图统计信息失败: {e}")
            return GraphStatistics()
    
    def get_node_degree_distribution(self, node_type: Optional[NodeType] = None) -> Dict[str, Any]:
        """
        获取节点度分布
        
        Args:
            node_type: 节点类型（可选）
            
        Returns:
            Dict[str, Any]: 度分布信息
        """
        try:
            with self.driver.session(database=self.database) as session:
                if node_type:
                    query = f"""
                    MATCH (n:{node_type.value})
                    OPTIONAL MATCH (n)-[r]-()
                    WITH n, count(r) as degree
                    RETURN degree, count(n) as node_count
                    ORDER BY degree
                    """
                else:
                    query = """
                    MATCH (n)
                    OPTIONAL MATCH (n)-[r]-()
                    WITH n, count(r) as degree
                    RETURN degree, count(n) as node_count
                    ORDER BY degree
                    """
                
                result = session.run(query)
                distribution = {}
                total_nodes = 0
                
                for record in result:
                    degree = record["degree"]
                    count = record["node_count"]
                    distribution[degree] = count
                    total_nodes += count
                
                # 计算统计指标
                degrees = list(distribution.keys())
                avg_degree = sum(d * distribution[d] for d in degrees) / total_nodes if total_nodes > 0 else 0
                max_degree = max(degrees) if degrees else 0
                
                return {
                    "distribution": distribution,
                    "total_nodes": total_nodes,
                    "average_degree": avg_degree,
                    "max_degree": max_degree,
                    "node_type": node_type.value if node_type else "all"
                }
                
        except Exception as e:
            logger.error(f"获取节点度分布失败: {e}")
            return {"error": str(e)}
    
    # ==================== 辅助方法 ====================
    
    def _calculate_path_risk_score(self, paths: List[Dict[str, Any]]) -> float:
        """
        计算路径风险评分
        
        Args:
            paths: 路径列表
            
        Returns:
            float: 风险评分 (0-1)
        """
        if not paths:
            return 0.0
        
        # 基于路径数量和长度计算风险
        path_count_score = min(len(paths) / 10.0, 1.0)  # 路径越多风险越高
        
        # 计算平均路径长度
        avg_length = sum(path["length"] for path in paths) / len(paths)
        length_score = min(avg_length / 5.0, 1.0)  # 路径越短风险越高（反向）
        length_score = 1.0 - length_score
        
        # 综合评分
        risk_score = (path_count_score * 0.6 + length_score * 0.4)
        
        return round(risk_score, 3)
    
    def health_check(self) -> Dict[str, Any]:
        """
        健康检查
        
        Returns:
            Dict[str, Any]: 健康状态
        """
        try:
            with self.driver.session(database=self.database) as session:
                result = session.run("RETURN 1 as test")
                test_value = result.single()["test"]
                
                if test_value == 1:
                    stats = self.get_graph_statistics()
                    return {
                        "status": "healthy",
                        "database": self.database,
                        "total_nodes": stats.total_nodes,
                        "total_relationships": stats.total_relationships,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    return {
                        "status": "unhealthy",
                        "error": "数据库连接异常",
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