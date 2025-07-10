#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - Graph Router
图谱可视化相关API路由
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging

from app.services.neo4j_service import Neo4jService
from app.services.graph_operations import GraphOperations
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/graph", tags=["graph"])

# 全局Neo4j服务实例
neo4j_service = None
graph_operations = None

async def get_neo4j_service():
    """获取Neo4j服务实例"""
    global neo4j_service, graph_operations
    if neo4j_service is None:
        neo4j_service = Neo4jService()
        await neo4j_service.connect()
        if neo4j_service.driver:
            graph_operations = GraphOperations(neo4j_service.driver, neo4j_service.database)
    return neo4j_service, graph_operations

@router.get("/data")
async def get_graph_data(
    node_type: Optional[str] = Query(None, description="节点类型过滤"),
    edge_type: Optional[str] = Query(None, description="关系类型过滤"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    limit: Optional[int] = Query(100, description="返回数量限制"),
    time_range: Optional[str] = Query("24h", description="时间范围: 1h, 6h, 24h, 7d")
):
    """获取图谱数据"""
    try:
        neo4j_service, graph_ops = await get_neo4j_service()
        
        if not neo4j_service.is_connected:
            # 返回模拟数据作为降级方案
            logger.warning("Neo4j未连接，返回模拟数据")
            return {
                "success": True,
                "data": generate_fallback_graph_data(),
                "source": "fallback",
                "timestamp": datetime.now().isoformat()
            }
        
        # 构建查询参数
        query_params = {
            "node_type": node_type,
            "edge_type": edge_type,
            "search": search,
            "limit": limit,
            "time_range": time_range
        }
        
        # 从Neo4j获取图谱数据
        graph_data = await get_graph_from_neo4j(neo4j_service, query_params)
        
        logger.info(f"图谱数据获取成功，节点数: {len(graph_data.get('nodes', []))}, 边数: {len(graph_data.get('edges', []))}")
        
        return {
            "success": True,
            "data": graph_data,
            "source": "neo4j",
            "timestamp": datetime.now().isoformat(),
            "query_params": query_params
        }
        
    except Exception as e:
        logger.error(f"获取图谱数据失败: {str(e)}", exc_info=True)
        # 返回模拟数据作为降级方案
        return {
            "success": True,
            "data": generate_fallback_graph_data(),
            "source": "fallback",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/nodes/{node_id}")
async def get_node_details(node_id: str):
    """获取节点详细信息"""
    try:
        neo4j_service, graph_ops = await get_neo4j_service()
        
        if not neo4j_service.is_connected:
            raise HTTPException(status_code=503, detail="Neo4j服务不可用")
        
        # 从Neo4j获取节点详情
        node_details = await get_node_from_neo4j(neo4j_service, node_id)
        
        if not node_details:
            raise HTTPException(status_code=404, detail="节点不存在")
        
        return {
            "success": True,
            "data": node_details,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取节点详情失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="获取节点详情失败")

@router.get("/relationships/{relationship_id}")
async def get_relationship_details(relationship_id: str):
    """获取关系详细信息"""
    try:
        neo4j_service, graph_ops = await get_neo4j_service()
        
        if not neo4j_service.is_connected:
            raise HTTPException(status_code=503, detail="Neo4j服务不可用")
        
        # 从Neo4j获取关系详情
        rel_details = await get_relationship_from_neo4j(neo4j_service, relationship_id)
        
        if not rel_details:
            raise HTTPException(status_code=404, detail="关系不存在")
        
        return {
            "success": True,
            "data": rel_details,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取关系详情失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="获取关系详情失败")

@router.post("/search")
async def search_graph(
    query: str,
    search_type: Optional[str] = "all",
    limit: Optional[int] = 50
):
    """图谱搜索"""
    try:
        neo4j_service, graph_ops = await get_neo4j_service()
        
        if not neo4j_service.is_connected:
            raise HTTPException(status_code=503, detail="Neo4j服务不可用")
        
        # 执行图谱搜索
        search_results = await search_graph_in_neo4j(neo4j_service, query, search_type, limit)
        
        return {
            "success": True,
            "data": search_results,
            "query": query,
            "search_type": search_type,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"图谱搜索失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="图谱搜索失败")

@router.get("/statistics")
async def get_graph_statistics():
    """获取图谱统计信息"""
    try:
        neo4j_service, graph_ops = await get_neo4j_service()
        
        if not neo4j_service.is_connected:
            # 返回模拟统计数据
            return {
                "success": True,
                "data": generate_fallback_statistics(),
                "source": "fallback",
                "timestamp": datetime.now().isoformat()
            }
        
        # 从Neo4j获取统计信息
        stats = await neo4j_service.get_graph_statistics()
        
        return {
            "success": True,
            "data": stats,
            "source": "neo4j",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"获取图谱统计失败: {str(e)}", exc_info=True)
        return {
            "success": True,
            "data": generate_fallback_statistics(),
            "source": "fallback",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# 辅助函数
async def get_graph_from_neo4j(neo4j_service: Neo4jService, params: Dict[str, Any]) -> Dict[str, Any]:
    """从Neo4j获取图谱数据"""
    try:
        with neo4j_service.driver.session(database=neo4j_service.database) as session:
            # 构建查询条件
            where_conditions = []
            query_params = {}
            
            if params.get('node_type'):
                where_conditions.append("n:" + params['node_type'].title())
            
            if params.get('search'):
                where_conditions.append("(n.name CONTAINS $search OR n.label CONTAINS $search)")
                query_params['search'] = params['search']
            
            # 时间范围过滤
            if params.get('time_range'):
                time_filter = get_time_filter(params['time_range'])
                if time_filter:
                    where_conditions.append(f"n.timestamp >= $start_time")
                    query_params['start_time'] = time_filter
            
            where_clause = " AND " + " AND ".join(where_conditions) if where_conditions else ""
            
            # 查询节点
            nodes_query = f"""
            MATCH (n)
            {where_clause}
            RETURN n
            LIMIT $limit
            """
            query_params['limit'] = params.get('limit', 100)
            
            nodes_result = session.run(nodes_query, query_params)
            nodes = []
            
            for record in nodes_result:
                node = record['n']
                node_data = {
                    'id': str(node.id),
                    'type': list(node.labels)[0].lower() if node.labels else 'unknown',
                    'label': node.get('name', node.get('label', f'Node-{node.id}')),
                    'properties': dict(node)
                }
                nodes.append(node_data)
            
            # 查询关系
            if nodes:
                node_ids = [node['id'] for node in nodes]
                edges_query = f"""
                MATCH (n1)-[r]->(n2)
                WHERE id(n1) IN $node_ids AND id(n2) IN $node_ids
                RETURN r, id(n1) as source_id, id(n2) as target_id
                """
                
                edges_result = session.run(edges_query, {'node_ids': [int(nid) for nid in node_ids]})
                edges = []
                
                for record in edges_result:
                    rel = record['r']
                    edge_data = {
                        'id': str(rel.id),
                        'source': str(record['source_id']),
                        'target': str(record['target_id']),
                        'type': rel.type.lower(),
                        'label': rel.get('label', rel.type),
                        'properties': dict(rel)
                    }
                    edges.append(edge_data)
            else:
                edges = []
            
            return {
                'nodes': nodes,
                'edges': edges
            }
            
    except Exception as e:
        logger.error(f"Neo4j查询失败: {str(e)}")
        raise

async def get_node_from_neo4j(neo4j_service: Neo4jService, node_id: str) -> Dict[str, Any]:
    """从Neo4j获取单个节点详情"""
    try:
        with neo4j_service.driver.session(database=neo4j_service.database) as session:
            query = """
            MATCH (n)
            WHERE id(n) = $node_id
            RETURN n
            """
            
            result = session.run(query, {'node_id': int(node_id)})
            record = result.single()
            
            if not record:
                return None
            
            node = record['n']
            return {
                'id': str(node.id),
                'type': list(node.labels)[0].lower() if node.labels else 'unknown',
                'label': node.get('name', node.get('label', f'Node-{node.id}')),
                'properties': dict(node),
                'labels': list(node.labels)
            }
            
    except Exception as e:
        logger.error(f"获取节点详情失败: {str(e)}")
        raise

async def get_relationship_from_neo4j(neo4j_service: Neo4jService, rel_id: str) -> Dict[str, Any]:
    """从Neo4j获取单个关系详情"""
    try:
        with neo4j_service.driver.session(database=neo4j_service.database) as session:
            query = """
            MATCH (n1)-[r]->(n2)
            WHERE id(r) = $rel_id
            RETURN r, n1, n2
            """
            
            result = session.run(query, {'rel_id': int(rel_id)})
            record = result.single()
            
            if not record:
                return None
            
            rel = record['r']
            source_node = record['n1']
            target_node = record['n2']
            
            return {
                'id': str(rel.id),
                'type': rel.type.lower(),
                'label': rel.get('label', rel.type),
                'properties': dict(rel),
                'source': {
                    'id': str(source_node.id),
                    'label': source_node.get('name', source_node.get('label', f'Node-{source_node.id}'))
                },
                'target': {
                    'id': str(target_node.id),
                    'label': target_node.get('name', target_node.get('label', f'Node-{target_node.id}'))
                }
            }
            
    except Exception as e:
        logger.error(f"获取关系详情失败: {str(e)}")
        raise

async def search_graph_in_neo4j(neo4j_service: Neo4jService, query: str, search_type: str, limit: int) -> Dict[str, Any]:
    """在Neo4j中搜索图谱"""
    try:
        with neo4j_service.driver.session(database=neo4j_service.database) as session:
            if search_type == "nodes" or search_type == "all":
                nodes_query = """
                MATCH (n)
                WHERE n.name CONTAINS $query OR n.label CONTAINS $query
                RETURN n
                LIMIT $limit
                """
                
                nodes_result = session.run(nodes_query, {'query': query, 'limit': limit})
                nodes = []
                
                for record in nodes_result:
                    node = record['n']
                    node_data = {
                        'id': str(node.id),
                        'type': list(node.labels)[0].lower() if node.labels else 'unknown',
                        'label': node.get('name', node.get('label', f'Node-{node.id}')),
                        'properties': dict(node)
                    }
                    nodes.append(node_data)
            else:
                nodes = []
            
            if search_type == "relationships" or search_type == "all":
                rels_query = """
                MATCH (n1)-[r]->(n2)
                WHERE r.label CONTAINS $query OR type(r) CONTAINS $query
                RETURN r, id(n1) as source_id, id(n2) as target_id
                LIMIT $limit
                """
                
                rels_result = session.run(rels_query, {'query': query, 'limit': limit})
                relationships = []
                
                for record in rels_result:
                    rel = record['r']
                    rel_data = {
                        'id': str(rel.id),
                        'source': str(record['source_id']),
                        'target': str(record['target_id']),
                        'type': rel.type.lower(),
                        'label': rel.get('label', rel.type),
                        'properties': dict(rel)
                    }
                    relationships.append(rel_data)
            else:
                relationships = []
            
            return {
                'nodes': nodes,
                'relationships': relationships
            }
            
    except Exception as e:
        logger.error(f"图谱搜索失败: {str(e)}")
        raise

def get_time_filter(time_range: str) -> Optional[datetime]:
    """根据时间范围获取过滤时间"""
    now = datetime.now()
    
    if time_range == "1h":
        return now - timedelta(hours=1)
    elif time_range == "6h":
        return now - timedelta(hours=6)
    elif time_range == "24h":
        return now - timedelta(hours=24)
    elif time_range == "7d":
        return now - timedelta(days=7)
    else:
        return None

def generate_fallback_graph_data() -> Dict[str, Any]:
    """生成降级图谱数据"""
    return {
        'nodes': [
            {'id': 'host1', 'type': 'host', 'label': 'Web-Server-01', 'properties': {'ip': '192.168.1.10', 'os': 'Ubuntu 20.04'}},
            {'id': 'host2', 'type': 'host', 'label': 'DB-Server-01', 'properties': {'ip': '192.168.1.20', 'os': 'CentOS 8'}},
            {'id': 'user1', 'type': 'user', 'label': 'admin', 'properties': {'uid': 1000, 'groups': ['sudo', 'admin']}},
            {'id': 'proc1', 'type': 'process', 'label': 'nginx', 'properties': {'pid': 1234, 'cmd': '/usr/sbin/nginx'}},
            {'id': 'event1', 'type': 'event', 'label': '异常登录', 'properties': {'severity': 'high', 'timestamp': datetime.now().isoformat()}}
        ],
        'edges': [
            {'id': 'e1', 'source': 'user1', 'target': 'host1', 'type': 'access', 'label': 'SSH登录'},
            {'id': 'e2', 'source': 'user1', 'target': 'proc1', 'type': 'execute', 'label': '启动进程'},
            {'id': 'e3', 'source': 'event1', 'target': 'user1', 'type': 'access', 'label': '关联用户'}
        ]
    }

def generate_fallback_statistics() -> Dict[str, Any]:
    """生成降级统计数据"""
    return {
        'total_nodes': 5,
        'total_relationships': 3,
        'node_types': {
            'host': 2,
            'user': 1,
            'process': 1,
            'event': 1
        },
        'relationship_types': {
            'access': 2,
            'execute': 1
        }
    }