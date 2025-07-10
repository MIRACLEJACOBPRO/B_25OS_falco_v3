#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 图数据模型

该模块定义了Neo4j图数据库中的节点和关系类型，
为行为图谱提供数据结构基础。

作者: Falco AI Security Team
版本: 1.0.0
创建时间: 2024-01-20
"""

from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import json
import hashlib


class NodeType(Enum):
    """节点类型枚举"""
    PROCESS = "Process"
    FILE = "File"
    NETWORK = "Network"
    USER = "User"
    CONTAINER = "Container"
    SYSTEM = "System"
    HOST = "Host"
    SERVICE = "Service"
    THREAT = "Threat"
    ALERT = "Alert"


class RelationshipType(Enum):
    """关系类型枚举"""
    # 进程关系
    EXECUTES = "EXECUTES"
    SPAWNS = "SPAWNS"
    KILLS = "KILLS"
    
    # 文件关系
    READS = "READS"
    WRITES = "WRITES"
    DELETES = "DELETES"
    CREATES = "CREATES"
    MODIFIES = "MODIFIES"
    ACCESSES = "ACCESSES"
    
    # 网络关系
    CONNECTS_TO = "CONNECTS_TO"
    LISTENS_ON = "LISTENS_ON"
    SENDS_TO = "SENDS_TO"
    RECEIVES_FROM = "RECEIVES_FROM"
    
    # 用户关系
    OWNS = "OWNS"
    RUNS_AS = "RUNS_AS"
    AUTHENTICATES = "AUTHENTICATES"
    
    # 容器关系
    CONTAINS = "CONTAINS"
    MOUNTS = "MOUNTS"
    EXPOSES = "EXPOSES"
    
    # 系统关系
    BELONGS_TO = "BELONGS_TO"
    DEPENDS_ON = "DEPENDS_ON"
    COMMUNICATES_WITH = "COMMUNICATES_WITH"
    
    # 安全关系
    TRIGGERS = "TRIGGERS"
    INDICATES = "INDICATES"
    CORRELATES_WITH = "CORRELATES_WITH"
    MITIGATES = "MITIGATES"


@dataclass
class BaseNode:
    """基础节点类"""
    id: str
    type: NodeType
    name: str
    properties: Dict[str, Any] = field(default_factory=dict)
    labels: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def __post_init__(self):
        """初始化后处理"""
        if not self.id:
            self.id = self.generate_id()
        
        # 添加类型标签
        if self.type.value not in self.labels:
            self.labels.append(self.type.value)
    
    def generate_id(self) -> str:
        """生成节点ID"""
        content = f"{self.type.value}:{self.name}:{json.dumps(self.properties, sort_keys=True)}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def to_cypher_create(self) -> str:
        """生成Cypher CREATE语句"""
        labels_str = ":".join(self.labels)
        props = self.get_all_properties()
        props_str = json.dumps(props).replace('"', "'")
        return f"CREATE (n:{labels_str} {props_str})"
    
    def to_cypher_merge(self) -> str:
        """生成Cypher MERGE语句"""
        labels_str = ":".join(self.labels)
        props = self.get_all_properties()
        props_str = json.dumps(props).replace('"', "'")
        return f"MERGE (n:{labels_str} {{id: '{self.id}'}}) SET n += {props_str}"
    
    def get_all_properties(self) -> Dict[str, Any]:
        """获取所有属性"""
        props = {
            "id": self.id,
            "name": self.name,
            "type": self.type.value,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }
        props.update(self.properties)
        return props


@dataclass
class ProcessNode(BaseNode):
    """进程节点"""
    pid: Optional[int] = None
    ppid: Optional[int] = None
    command: Optional[str] = None
    args: List[str] = field(default_factory=list)
    user: Optional[str] = None
    uid: Optional[int] = None
    gid: Optional[int] = None
    executable_path: Optional[str] = None
    working_directory: Optional[str] = None
    environment: Dict[str, str] = field(default_factory=dict)
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    exit_code: Optional[int] = None
    
    def __post_init__(self):
        self.type = NodeType.PROCESS
        super().__post_init__()
        
        # 更新属性
        self.properties.update({
            "pid": self.pid,
            "ppid": self.ppid,
            "command": self.command,
            "args": self.args,
            "user": self.user,
            "uid": self.uid,
            "gid": self.gid,
            "executable_path": self.executable_path,
            "working_directory": self.working_directory,
            "environment": self.environment,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "exit_code": self.exit_code
        })


@dataclass
class FileNode(BaseNode):
    """文件节点"""
    path: Optional[str] = None
    directory: Optional[str] = None
    filename: Optional[str] = None
    extension: Optional[str] = None
    size: Optional[int] = None
    permissions: Optional[str] = None
    owner: Optional[str] = None
    group: Optional[str] = None
    mime_type: Optional[str] = None
    hash_md5: Optional[str] = None
    hash_sha256: Optional[str] = None
    created_time: Optional[str] = None
    modified_time: Optional[str] = None
    accessed_time: Optional[str] = None
    is_executable: bool = False
    is_system_file: bool = False
    
    def __post_init__(self):
        self.type = NodeType.FILE
        super().__post_init__()
        
        # 更新属性
        self.properties.update({
            "path": self.path,
            "directory": self.directory,
            "filename": self.filename,
            "extension": self.extension,
            "size": self.size,
            "permissions": self.permissions,
            "owner": self.owner,
            "group": self.group,
            "mime_type": self.mime_type,
            "hash_md5": self.hash_md5,
            "hash_sha256": self.hash_sha256,
            "created_time": self.created_time,
            "modified_time": self.modified_time,
            "accessed_time": self.accessed_time,
            "is_executable": self.is_executable,
            "is_system_file": self.is_system_file
        })


@dataclass
class NetworkNode(BaseNode):
    """网络节点"""
    ip_address: Optional[str] = None
    port: Optional[int] = None
    protocol: Optional[str] = None
    hostname: Optional[str] = None
    domain: Optional[str] = None
    is_internal: bool = True
    is_public: bool = False
    geolocation: Dict[str, Any] = field(default_factory=dict)
    reputation: Optional[str] = None
    threat_intel: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        self.type = NodeType.NETWORK
        super().__post_init__()
        
        # 更新属性
        self.properties.update({
            "ip_address": self.ip_address,
            "port": self.port,
            "protocol": self.protocol,
            "hostname": self.hostname,
            "domain": self.domain,
            "is_internal": self.is_internal,
            "is_public": self.is_public,
            "geolocation": self.geolocation,
            "reputation": self.reputation,
            "threat_intel": self.threat_intel
        })


@dataclass
class UserNode(BaseNode):
    """用户节点"""
    username: Optional[str] = None
    uid: Optional[int] = None
    gid: Optional[int] = None
    home_directory: Optional[str] = None
    shell: Optional[str] = None
    groups: List[str] = field(default_factory=list)
    privileges: List[str] = field(default_factory=list)
    is_admin: bool = False
    is_service_account: bool = False
    last_login: Optional[str] = None
    login_count: int = 0
    
    def __post_init__(self):
        self.type = NodeType.USER
        super().__post_init__()
        
        # 更新属性
        self.properties.update({
            "username": self.username,
            "uid": self.uid,
            "gid": self.gid,
            "home_directory": self.home_directory,
            "shell": self.shell,
            "groups": self.groups,
            "privileges": self.privileges,
            "is_admin": self.is_admin,
            "is_service_account": self.is_service_account,
            "last_login": self.last_login,
            "login_count": self.login_count
        })


@dataclass
class ContainerNode(BaseNode):
    """容器节点"""
    container_id: Optional[str] = None
    image_name: Optional[str] = None
    image_tag: Optional[str] = None
    image_id: Optional[str] = None
    runtime: Optional[str] = None
    status: Optional[str] = None
    ports: List[Dict[str, Any]] = field(default_factory=list)
    volumes: List[Dict[str, Any]] = field(default_factory=list)
    environment_vars: Dict[str, str] = field(default_factory=dict)
    labels: Dict[str, str] = field(default_factory=dict)
    network_mode: Optional[str] = None
    privileged: bool = False
    
    def __post_init__(self):
        self.type = NodeType.CONTAINER
        super().__post_init__()
        
        # 更新属性
        self.properties.update({
            "container_id": self.container_id,
            "image_name": self.image_name,
            "image_tag": self.image_tag,
            "image_id": self.image_id,
            "runtime": self.runtime,
            "status": self.status,
            "ports": self.ports,
            "volumes": self.volumes,
            "environment_vars": self.environment_vars,
            "container_labels": self.labels,
            "network_mode": self.network_mode,
            "privileged": self.privileged
        })


@dataclass
class ThreatNode(BaseNode):
    """威胁节点"""
    threat_type: Optional[str] = None
    severity: Optional[str] = None
    confidence: float = 0.0
    mitre_tactics: List[str] = field(default_factory=list)
    mitre_techniques: List[str] = field(default_factory=list)
    indicators: List[str] = field(default_factory=list)
    description: Optional[str] = None
    remediation: Optional[str] = None
    
    def __post_init__(self):
        self.type = NodeType.THREAT
        super().__post_init__()
        
        # 更新属性
        self.properties.update({
            "threat_type": self.threat_type,
            "severity": self.severity,
            "confidence": self.confidence,
            "mitre_tactics": self.mitre_tactics,
            "mitre_techniques": self.mitre_techniques,
            "indicators": self.indicators,
            "description": self.description,
            "remediation": self.remediation
        })


@dataclass
class BaseRelationship:
    """基础关系类"""
    id: str
    type: RelationshipType
    source_id: str
    target_id: str
    properties: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    weight: float = 1.0
    confidence: float = 1.0
    
    def __post_init__(self):
        """初始化后处理"""
        if not self.id:
            self.id = self.generate_id()
    
    def generate_id(self) -> str:
        """生成关系ID"""
        content = f"{self.source_id}:{self.type.value}:{self.target_id}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def to_cypher_create(self) -> str:
        """生成Cypher CREATE关系语句"""
        props = self.get_all_properties()
        props_str = json.dumps(props).replace('"', "'")
        return f"""MATCH (a {{id: '{self.source_id}'}}), (b {{id: '{self.target_id}'}}) 
                   CREATE (a)-[r:{self.type.value} {props_str}]->(b)"""
    
    def to_cypher_merge(self) -> str:
        """生成Cypher MERGE关系语句"""
        props = self.get_all_properties()
        props_str = json.dumps(props).replace('"', "'")
        return f"""MATCH (a {{id: '{self.source_id}'}}), (b {{id: '{self.target_id}'}}) 
                   MERGE (a)-[r:{self.type.value} {{id: '{self.id}'}}]->(b) 
                   SET r += {props_str}"""
    
    def get_all_properties(self) -> Dict[str, Any]:
        """获取所有属性"""
        props = {
            "id": self.id,
            "created_at": self.created_at,
            "weight": self.weight,
            "confidence": self.confidence
        }
        props.update(self.properties)
        return props


@dataclass
class ProcessRelationship(BaseRelationship):
    """进程关系"""
    timestamp: Optional[str] = None
    duration: Optional[float] = None
    exit_code: Optional[int] = None
    
    def __post_init__(self):
        super().__post_init__()
        
        # 更新属性
        self.properties.update({
            "timestamp": self.timestamp,
            "duration": self.duration,
            "exit_code": self.exit_code
        })


@dataclass
class FileRelationship(BaseRelationship):
    """文件关系"""
    timestamp: Optional[str] = None
    bytes_transferred: Optional[int] = None
    operation_type: Optional[str] = None
    file_descriptor: Optional[int] = None
    
    def __post_init__(self):
        super().__post_init__()
        
        # 更新属性
        self.properties.update({
            "timestamp": self.timestamp,
            "bytes_transferred": self.bytes_transferred,
            "operation_type": self.operation_type,
            "file_descriptor": self.file_descriptor
        })


@dataclass
class NetworkRelationship(BaseRelationship):
    """网络关系"""
    timestamp: Optional[str] = None
    bytes_sent: Optional[int] = None
    bytes_received: Optional[int] = None
    connection_state: Optional[str] = None
    protocol: Optional[str] = None
    duration: Optional[float] = None
    
    def __post_init__(self):
        super().__post_init__()
        
        # 更新属性
        self.properties.update({
            "timestamp": self.timestamp,
            "bytes_sent": self.bytes_sent,
            "bytes_received": self.bytes_received,
            "connection_state": self.connection_state,
            "protocol": self.protocol,
            "duration": self.duration
        })


class GraphModelFactory:
    """图模型工厂类"""
    
    @staticmethod
    def create_node(node_type: NodeType, name: str, **kwargs) -> BaseNode:
        """创建节点"""
        node_classes = {
            NodeType.PROCESS: ProcessNode,
            NodeType.FILE: FileNode,
            NodeType.NETWORK: NetworkNode,
            NodeType.USER: UserNode,
            NodeType.CONTAINER: ContainerNode,
            NodeType.THREAT: ThreatNode
        }
        
        node_class = node_classes.get(node_type, BaseNode)
        return node_class(id="", type=node_type, name=name, **kwargs)
    
    @staticmethod
    def create_relationship(rel_type: RelationshipType, source_id: str, target_id: str, **kwargs) -> BaseRelationship:
        """创建关系"""
        relationship_classes = {
            RelationshipType.EXECUTES: ProcessRelationship,
            RelationshipType.SPAWNS: ProcessRelationship,
            RelationshipType.READS: FileRelationship,
            RelationshipType.WRITES: FileRelationship,
            RelationshipType.CONNECTS_TO: NetworkRelationship,
            RelationshipType.LISTENS_ON: NetworkRelationship
        }
        
        rel_class = relationship_classes.get(rel_type, BaseRelationship)
        return rel_class(id="", type=rel_type, source_id=source_id, target_id=target_id, **kwargs)
    
    @staticmethod
    def from_behavior_triplet(triplet) -> tuple[BaseNode, BaseRelationship, BaseNode]:
        """从行为三元组创建图模型"""
        # 创建主体节点
        subject_node = GraphModelFactory.create_node(
            node_type=NodeType(triplet.subject.type.value),
            name=triplet.subject.name,
            **triplet.subject.properties
        )
        subject_node.id = triplet.subject.id
        
        # 创建客体节点
        object_node = GraphModelFactory.create_node(
            node_type=NodeType(triplet.object.type.value),
            name=triplet.object.name,
            **triplet.object.properties
        )
        object_node.id = triplet.object.id
        
        # 创建关系
        relationship = GraphModelFactory.create_relationship(
            rel_type=RelationshipType(triplet.predicate.value),
            source_id=subject_node.id,
            target_id=object_node.id,
            timestamp=triplet.timestamp,
            confidence=triplet.confidence
        )
        relationship.properties.update(triplet.context)
        
        return subject_node, relationship, object_node


class GraphQuery:
    """图查询构建器"""
    
    @staticmethod
    def find_node_by_id(node_id: str) -> str:
        """根据ID查找节点"""
        return f"MATCH (n {{id: '{node_id}'}}) RETURN n"
    
    @staticmethod
    def find_nodes_by_type(node_type: NodeType) -> str:
        """根据类型查找节点"""
        return f"MATCH (n:{node_type.value}) RETURN n"
    
    @staticmethod
    def find_relationships_by_type(rel_type: RelationshipType) -> str:
        """根据类型查找关系"""
        return f"MATCH ()-[r:{rel_type.value}]->() RETURN r"
    
    @staticmethod
    def find_connected_nodes(node_id: str, depth: int = 1) -> str:
        """查找连接的节点"""
        return f"""MATCH (start {{id: '{node_id}'}})-[*1..{depth}]-(connected) 
                   RETURN start, connected"""
    
    @staticmethod
    def find_attack_path(source_id: str, target_id: str, max_depth: int = 5) -> str:
        """查找攻击路径"""
        return f"""MATCH path = shortestPath((source {{id: '{source_id}'}})-[*1..{max_depth}]-(target {{id: '{target_id}'}})) 
                   RETURN path"""
    
    @staticmethod
    def find_anomalous_behaviors(threshold: float = 0.8) -> str:
        """查找异常行为"""
        return f"""MATCH (n)-[r]->(m) 
                   WHERE r.confidence < {threshold} 
                   RETURN n, r, m"""
    
    @staticmethod
    def get_node_statistics() -> str:
        """获取节点统计"""
        return """MATCH (n) 
                  RETURN labels(n)[0] as node_type, count(n) as count 
                  ORDER BY count DESC"""
    
    @staticmethod
    def get_relationship_statistics() -> str:
        """获取关系统计"""
        return """MATCH ()-[r]->() 
                  RETURN type(r) as relationship_type, count(r) as count 
                  ORDER BY count DESC"""


# 测试函数
if __name__ == "__main__":
    # 测试节点创建
    process_node = GraphModelFactory.create_node(
        NodeType.PROCESS,
        "bash",
        pid=1234,
        user="root",
        command="/bin/bash"
    )
    
    file_node = GraphModelFactory.create_node(
        NodeType.FILE,
        "/etc/passwd",
        path="/etc/passwd",
        permissions="644",
        owner="root"
    )
    
    # 测试关系创建
    relationship = GraphModelFactory.create_relationship(
        RelationshipType.READS,
        process_node.id,
        file_node.id,
        timestamp="2024-01-20T10:30:00Z"
    )
    
    # 输出Cypher语句
    print("节点创建语句:")
    print(process_node.to_cypher_merge())
    print(file_node.to_cypher_merge())
    
    print("\n关系创建语句:")
    print(relationship.to_cypher_merge())
    
    # 输出查询语句
    print("\n查询语句示例:")
    print(GraphQuery.find_connected_nodes(process_node.id, 2))
    print(GraphQuery.get_node_statistics())