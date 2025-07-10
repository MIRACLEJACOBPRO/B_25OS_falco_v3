#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - Neo4j Service
Neo4j图数据库服务，负责行为图谱的构建和查询
"""

import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from neo4j import GraphDatabase, Driver, Session
from neo4j.exceptions import ServiceUnavailable, AuthError

from app.config import settings
from app.services.falco_monitor import FalcoEvent

logger = logging.getLogger(__name__)

@dataclass
class BehaviorTriple:
    """行为三元组数据结构"""
    subject: str      # 主体（进程、用户等）
    predicate: str    # 谓词（动作类型）
    object: str       # 客体（文件、网络等）
    timestamp: datetime
    properties: Dict[str, Any]
    event_id: str
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'subject': self.subject,
            'predicate': self.predicate,
            'object': self.object,
            'timestamp': self.timestamp.isoformat(),
            'properties': self.properties,
            'event_id': self.event_id
        }

class Neo4jService:
    """Neo4j图数据库服务"""
    
    def __init__(self):
        self.driver: Optional[Driver] = None
        self.uri = settings.NEO4J_URI
        self.username = settings.NEO4J_USER
        self.password = settings.NEO4J_PASSWORD
        self.database = settings.NEO4J_DATABASE
        self.is_connected = False
        
    async def connect(self) -> bool:
        """连接到Neo4j数据库"""
        try:
            self.driver = GraphDatabase.driver(
                self.uri,
                auth=(self.username, self.password),
                max_connection_lifetime=3600,
                max_connection_pool_size=50,
                connection_acquisition_timeout=60
            )
            
            # 测试连接
            with self.driver.session(database=self.database) as session:
                result = session.run("RETURN 1 as test")
                test_value = result.single()["test"]
                if test_value == 1:
                    self.is_connected = True
                    logger.info(f"已连接到Neo4j数据库: {self.uri}")
                    
                    # 初始化数据库结构
                    await self._initialize_database()
                    return True
                    
        except AuthError as e:
            logger.error(f"Neo4j认证失败: {e}")
        except ServiceUnavailable as e:
            logger.error(f"Neo4j服务不可用: {e}")
        except Exception as e:
            logger.error(f"连接Neo4j失败: {e}")
        
        self.is_connected = False
        return False
    
    async def disconnect(self):
        """断开数据库连接"""
        if self.driver:
            self.driver.close()
            self.driver = None
            self.is_connected = False
            logger.info("已断开Neo4j连接")
    
    async def _initialize_database(self):
        """初始化数据库结构"""
        try:
            with self.driver.session(database=self.database) as session:
                # 创建索引
                indexes = [
                    "CREATE INDEX IF NOT EXISTS FOR (p:Process) ON (p.name)",
                    "CREATE INDEX IF NOT EXISTS FOR (p:Process) ON (p.pid)",
                    "CREATE INDEX IF NOT EXISTS FOR (f:File) ON (f.path)",
                    "CREATE INDEX IF NOT EXISTS FOR (n:Network) ON (n.address)",
                    "CREATE INDEX IF NOT EXISTS FOR (u:User) ON (u.name)",
                    "CREATE INDEX IF NOT EXISTS FOR (e:Event) ON (e.timestamp)",
                    "CREATE INDEX IF NOT EXISTS FOR (e:Event) ON (e.rule)",
                    "CREATE INDEX IF NOT EXISTS FOR (e:Event) ON (e.priority)"
                ]
                
                for index_query in indexes:
                    session.run(index_query)
                
                # 创建约束
                constraints = [
                    "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Process) REQUIRE p.id IS UNIQUE",
                    "CREATE CONSTRAINT IF NOT EXISTS FOR (f:File) REQUIRE f.id IS UNIQUE",
                    "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Network) REQUIRE n.id IS UNIQUE",
                    "CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
                    "CREATE CONSTRAINT IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE"
                ]
                
                for constraint_query in constraints:
                    try:
                        session.run(constraint_query)
                    except Exception as e:
                        logger.debug(f"约束创建跳过（可能已存在）: {e}")
                
                logger.info("Neo4j数据库结构初始化完成")
                
        except Exception as e:
            logger.error(f"初始化数据库结构失败: {e}")
    
    def extract_behavior_triple(self, event: FalcoEvent) -> Optional[BehaviorTriple]:
        """从Falco事件中提取行为三元组"""
        try:
            output_fields = event.output_fields
            
            # 提取主体（通常是进程）
            subject = self._extract_subject(output_fields)
            
            # 提取谓词（动作类型）
            predicate = self._extract_predicate(event.rule, output_fields)
            
            # 提取客体（文件、网络等）
            obj = self._extract_object(output_fields)
            
            if subject and predicate and obj:
                return BehaviorTriple(
                    subject=subject,
                    predicate=predicate,
                    object=obj,
                    timestamp=event.timestamp,
                    properties={
                        'rule': event.rule,
                        'priority': event.priority,
                        'message': event.message,
                        'hostname': event.hostname,
                        'tags': event.tags,
                        **output_fields
                    },
                    event_id=f"{event.hostname}_{event.timestamp.timestamp()}_{hash(event.message)}"
                )
            
        except Exception as e:
            logger.error(f"提取行为三元组失败: {e}")
        
        return None
    
    def _extract_subject(self, output_fields: Dict[str, Any]) -> Optional[str]:
        """提取主体"""
        # 优先级：用户 > 进程 > 容器
        if 'user.name' in output_fields:
            return f"user:{output_fields['user.name']}"
        elif 'proc.name' in output_fields:
            pid = output_fields.get('proc.pid', 'unknown')
            return f"process:{output_fields['proc.name']}:{pid}"
        elif 'container.name' in output_fields:
            return f"container:{output_fields['container.name']}"
        elif 'proc.pname' in output_fields:
            return f"process:{output_fields['proc.pname']}"
        
        return None
    
    def _extract_predicate(self, rule: str, output_fields: Dict[str, Any]) -> Optional[str]:
        """提取谓词（动作类型）"""
        # 根据规则名称和事件类型确定动作
        rule_lower = rule.lower()
        evt_type = output_fields.get('evt.type', '').lower()
        
        # 文件操作
        if any(keyword in rule_lower for keyword in ['file', 'write', 'read', 'open']):
            if 'write' in rule_lower or evt_type in ['write', 'pwrite']:
                return 'writes_to'
            elif 'read' in rule_lower or evt_type in ['read', 'pread']:
                return 'reads_from'
            elif 'open' in rule_lower or evt_type in ['open', 'openat']:
                return 'opens'
            elif 'delete' in rule_lower or evt_type in ['unlink', 'unlinkat']:
                return 'deletes'
            else:
                return 'accesses'
        
        # 网络操作
        elif any(keyword in rule_lower for keyword in ['network', 'connect', 'socket']):
            if 'connect' in rule_lower or evt_type == 'connect':
                return 'connects_to'
            elif 'listen' in rule_lower or evt_type == 'listen':
                return 'listens_on'
            else:
                return 'communicates_with'
        
        # 进程操作
        elif any(keyword in rule_lower for keyword in ['exec', 'spawn', 'fork']):
            return 'executes'
        
        # 权限操作
        elif any(keyword in rule_lower for keyword in ['privilege', 'sudo', 'setuid']):
            return 'escalates_to'
        
        # 默认动作
        else:
            return 'interacts_with'
    
    def _extract_object(self, output_fields: Dict[str, Any]) -> Optional[str]:
        """提取客体"""
        # 优先级：文件 > 网络 > 其他资源
        if 'fd.name' in output_fields and output_fields['fd.name'] != '<NA>':
            return f"file:{output_fields['fd.name']}"
        elif 'fd.sip' in output_fields and 'fd.sport' in output_fields:
            return f"network:{output_fields['fd.sip']}:{output_fields['fd.sport']}"
        elif 'fd.cip' in output_fields and 'fd.cport' in output_fields:
            return f"network:{output_fields['fd.cip']}:{output_fields['fd.cport']}"
        elif 'proc.args' in output_fields:
            return f"command:{output_fields['proc.args']}"
        elif 'syscall.type' in output_fields:
            return f"syscall:{output_fields['syscall.type']}"
        
        return None
    
    async def store_behavior_triple(self, triple: BehaviorTriple) -> bool:
        """存储行为三元组到图数据库"""
        try:
            with self.driver.session(database=self.database) as session:
                # 创建或更新节点和关系的Cypher查询
                query = """
                // 创建或合并主体节点
                MERGE (s:Entity {id: $subject})
                SET s.type = split($subject, ':')[0],
                    s.name = $subject,
                    s.last_seen = datetime($timestamp)
                
                // 创建或合并客体节点
                MERGE (o:Entity {id: $object})
                SET o.type = split($object, ':')[0],
                    o.name = $object,
                    o.last_seen = datetime($timestamp)
                
                // 创建事件节点
                CREATE (e:Event {
                    id: $event_id,
                    rule: $rule,
                    priority: $priority,
                    message: $message,
                    timestamp: datetime($timestamp),
                    hostname: $hostname,
                    tags: $tags,
                    properties: $properties
                })
                
                // 创建关系
                CREATE (s)-[r:PERFORMS {action: $predicate, timestamp: datetime($timestamp)}]->(o)
                CREATE (s)-[:TRIGGERED]->(e)
                CREATE (e)-[:INVOLVES]->(o)
                
                RETURN s.id as subject_id, o.id as object_id, e.id as event_id
                """
                
                result = session.run(query, {
                    'subject': triple.subject,
                    'object': triple.object,
                    'predicate': triple.predicate,
                    'timestamp': triple.timestamp.isoformat(),
                    'event_id': triple.event_id,
                    'rule': triple.properties.get('rule', ''),
                    'priority': triple.properties.get('priority', ''),
                    'message': triple.properties.get('message', ''),
                    'hostname': triple.properties.get('hostname', ''),
                    'tags': triple.properties.get('tags', []),
                    'properties': json.dumps(triple.properties)
                })
                
                record = result.single()
                if record:
                    logger.debug(f"已存储行为三元组: {triple.subject} -> {triple.predicate} -> {triple.object}")
                    return True
                
        except Exception as e:
            logger.error(f"存储行为三元组失败: {e}")
        
        return False
    
    async def query_related_behaviors(self, entity: str, depth: int = 2) -> List[Dict[str, Any]]:
        """查询相关行为模式"""
        try:
            with self.driver.session(database=self.database) as session:
                query = f"""
                MATCH path = (start:Entity {{id: $entity}})-[*1..{depth}]-(related:Entity)
                WITH path, relationships(path) as rels, nodes(path) as nodes
                RETURN 
                    [n in nodes | {{id: n.id, type: n.type, name: n.name}}] as nodes,
                    [r in rels | {{type: type(r), action: r.action, timestamp: r.timestamp}}] as relationships,
                    length(path) as path_length
                ORDER BY path_length, relationships[0].timestamp DESC
                LIMIT 100
                """
                
                result = session.run(query, {'entity': entity})
                behaviors = []
                
                for record in result:
                    behaviors.append({
                        'nodes': record['nodes'],
                        'relationships': record['relationships'],
                        'path_length': record['path_length']
                    })
                
                return behaviors
                
        except Exception as e:
            logger.error(f"查询相关行为失败: {e}")
            return []
    
    async def detect_anomalies(self, time_window: int = 3600) -> List[Dict[str, Any]]:
        """检测异常行为模式"""
        try:
            with self.driver.session(database=self.database) as session:
                # 检测异常频繁的行为
                query = """
                MATCH (s:Entity)-[r:PERFORMS]->(o:Entity)
                WHERE r.timestamp > datetime() - duration({seconds: $time_window})
                WITH s, r.action as action, o, count(*) as frequency
                WHERE frequency > 10  // 阈值可配置
                RETURN s.id as subject, action, o.id as object, frequency
                ORDER BY frequency DESC
                LIMIT 50
                """
                
                result = session.run(query, {'time_window': time_window})
                anomalies = []
                
                for record in result:
                    anomalies.append({
                        'type': 'high_frequency',
                        'subject': record['subject'],
                        'action': record['action'],
                        'object': record['object'],
                        'frequency': record['frequency'],
                        'severity': 'medium' if record['frequency'] < 50 else 'high'
                    })
                
                return anomalies
                
        except Exception as e:
            logger.error(f"检测异常行为失败: {e}")
            return []
    
    async def get_graph_statistics(self) -> Dict[str, Any]:
        """获取图数据库统计信息"""
        try:
            with self.driver.session(database=self.database) as session:
                # 节点统计
                node_stats = session.run("""
                MATCH (n)
                RETURN labels(n)[0] as label, count(n) as count
                ORDER BY count DESC
                """).data()
                
                # 关系统计
                rel_stats = session.run("""
                MATCH ()-[r]->()
                RETURN type(r) as relationship, count(r) as count
                ORDER BY count DESC
                """).data()
                
                # 最近事件统计
                recent_events = session.run("""
                MATCH (e:Event)
                WHERE e.timestamp > datetime() - duration({hours: 24})
                RETURN e.priority as priority, count(e) as count
                ORDER BY count DESC
                """).data()
                
                return {
                    'nodes': node_stats,
                    'relationships': rel_stats,
                    'recent_events': recent_events,
                    'is_connected': self.is_connected
                }
                
        except Exception as e:
            logger.error(f"获取图统计信息失败: {e}")
            return {'error': str(e), 'is_connected': self.is_connected}
    
    async def cleanup_old_data(self, retention_days: int = 30):
        """清理旧数据"""
        try:
            with self.driver.session(database=self.database) as session:
                cutoff_date = datetime.now() - timedelta(days=retention_days)
                
                # 删除旧事件
                result = session.run("""
                MATCH (e:Event)
                WHERE e.timestamp < datetime($cutoff_date)
                DETACH DELETE e
                RETURN count(e) as deleted_count
                """, {'cutoff_date': cutoff_date.isoformat()})
                
                deleted_count = result.single()['deleted_count']
                logger.info(f"已清理 {deleted_count} 个旧事件（{retention_days}天前）")
                
        except Exception as e:
            logger.error(f"清理旧数据失败: {e}")

# 全局Neo4j服务实例
neo4j_service = Neo4jService()