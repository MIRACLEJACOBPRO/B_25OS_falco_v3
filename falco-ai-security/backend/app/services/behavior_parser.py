#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 行为三元组抽象器

该模块负责从Falco事件中提取和抽象行为三元组（主体-谓词-客体），
为Neo4j图数据库提供结构化的数据。

作者: Falco AI Security Team
版本: 1.0.0
创建时间: 2024-01-20
"""

import re
import json
import hashlib
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class EntityType(Enum):
    """实体类型枚举"""
    PROCESS = "Process"
    FILE = "File"
    NETWORK = "Network"
    USER = "User"
    CONTAINER = "Container"
    SYSTEM = "System"
    UNKNOWN = "Unknown"


class ActionType(Enum):
    """动作类型枚举"""
    EXECUTE = "EXECUTE"
    READ = "READ"
    WRITE = "WRITE"
    DELETE = "DELETE"
    CONNECT = "CONNECT"
    LISTEN = "LISTEN"
    SPAWN = "SPAWN"
    ACCESS = "ACCESS"
    MODIFY = "MODIFY"
    CREATE = "CREATE"
    UNKNOWN = "UNKNOWN"


@dataclass
class Entity:
    """实体数据结构"""
    id: str
    type: EntityType
    name: str
    properties: Dict[str, Any]
    
    def __post_init__(self):
        """生成实体唯一ID"""
        if not self.id:
            content = f"{self.type.value}:{self.name}:{json.dumps(self.properties, sort_keys=True)}"
            self.id = hashlib.md5(content.encode()).hexdigest()[:16]


@dataclass
class BehaviorTriplet:
    """行为三元组数据结构"""
    subject: Entity  # 主体
    predicate: ActionType  # 谓词（动作）
    object: Entity  # 客体
    timestamp: str
    confidence: float  # 置信度
    context: Dict[str, Any]  # 上下文信息
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "subject": {
                "id": self.subject.id,
                "type": self.subject.type.value,
                "name": self.subject.name,
                "properties": self.subject.properties
            },
            "predicate": self.predicate.value,
            "object": {
                "id": self.object.id,
                "type": self.object.type.value,
                "name": self.object.name,
                "properties": self.object.properties
            },
            "timestamp": self.timestamp,
            "confidence": self.confidence,
            "context": self.context
        }


class BehaviorParser:
    """行为三元组解析器"""
    
    def __init__(self):
        self.rule_patterns = self._load_parsing_rules()
        self.entity_cache = {}  # 实体缓存
        
    def _load_parsing_rules(self) -> Dict[str, Dict]:
        """加载解析规则"""
        return {
            # 文件操作规则
            "file_operations": {
                "patterns": [
                    r"proc\.name=(?P<proc_name>\S+).*fd\.name=(?P<file_path>\S+)",
                    r"user\.name=(?P<user_name>\S+).*file=(?P<file_path>\S+)"
                ],
                "actions": {
                    "open": ActionType.READ,
                    "openat": ActionType.READ,
                    "write": ActionType.WRITE,
                    "unlink": ActionType.DELETE,
                    "rename": ActionType.MODIFY
                }
            },
            
            # 网络操作规则
            "network_operations": {
                "patterns": [
                    r"proc\.name=(?P<proc_name>\S+).*connection=(?P<connection>\S+)",
                    r"fd\.ip=(?P<ip>\S+).*fd\.port=(?P<port>\d+)"
                ],
                "actions": {
                    "connect": ActionType.CONNECT,
                    "listen": ActionType.LISTEN,
                    "accept": ActionType.CONNECT
                }
            },
            
            # 进程操作规则
            "process_operations": {
                "patterns": [
                    r"proc\.name=(?P<proc_name>\S+).*proc\.cmdline=(?P<cmdline>.*)",
                    r"proc\.pid=(?P<pid>\d+).*proc\.ppid=(?P<ppid>\d+)"
                ],
                "actions": {
                    "execve": ActionType.EXECUTE,
                    "clone": ActionType.SPAWN,
                    "fork": ActionType.SPAWN
                }
            },
            
            # 权限操作规则
            "privilege_operations": {
                "patterns": [
                    r"proc\.name=(?P<proc_name>\S+).*old_uid=(?P<old_uid>\d+).*new_uid=(?P<new_uid>\d+)",
                    r"user\.name=(?P<user_name>\S+).*command=(?P<command>.*)"
                ],
                "actions": {
                    "setuid": ActionType.MODIFY,
                    "setgid": ActionType.MODIFY,
                    "sudo": ActionType.EXECUTE
                }
            }
        }
    
    def parse_falco_event(self, event_data: Dict[str, Any]) -> List[BehaviorTriplet]:
        """解析Falco事件，提取行为三元组"""
        try:
            triplets = []
            
            # 提取基本信息
            rule_name = event_data.get("rule", "")
            output_text = event_data.get("output", "")
            timestamp = event_data.get("time", "")
            priority = event_data.get("priority", "INFO")
            
            # 根据规则类型选择解析策略
            if "file" in rule_name.lower() or "read" in output_text.lower() or "write" in output_text.lower():
                triplets.extend(self._parse_file_operations(event_data, output_text, timestamp))
            
            if "network" in rule_name.lower() or "connection" in output_text.lower():
                triplets.extend(self._parse_network_operations(event_data, output_text, timestamp))
            
            if "process" in rule_name.lower() or "exec" in output_text.lower():
                triplets.extend(self._parse_process_operations(event_data, output_text, timestamp))
            
            if "privilege" in rule_name.lower() or "sudo" in output_text.lower():
                triplets.extend(self._parse_privilege_operations(event_data, output_text, timestamp))
            
            # 如果没有匹配到特定规则，使用通用解析
            if not triplets:
                triplets.extend(self._parse_generic_event(event_data, output_text, timestamp))
            
            # 设置置信度
            for triplet in triplets:
                triplet.confidence = self._calculate_confidence(triplet, priority)
            
            return triplets
            
        except Exception as e:
            logger.error(f"解析Falco事件失败: {e}")
            return []
    
    def _parse_file_operations(self, event_data: Dict, output_text: str, timestamp: str) -> List[BehaviorTriplet]:
        """解析文件操作事件"""
        triplets = []
        
        # 提取进程信息
        proc_match = re.search(r"proc=([^\s]+)", output_text)
        file_match = re.search(r"file=([^\s]+)", output_text)
        user_match = re.search(r"user=([^\s]+)", output_text)
        
        if proc_match and file_match:
            # 创建主体实体（进程）
            subject = Entity(
                id="",
                type=EntityType.PROCESS,
                name=proc_match.group(1),
                properties={
                    "user": user_match.group(1) if user_match else "unknown",
                    "pid": self._extract_pid(output_text)
                }
            )
            
            # 创建客体实体（文件）
            file_path = file_match.group(1)
            object_entity = Entity(
                id="",
                type=EntityType.FILE,
                name=file_path,
                properties={
                    "path": file_path,
                    "directory": str(Path(file_path).parent),
                    "extension": Path(file_path).suffix
                }
            )
            
            # 确定动作类型
            action = self._determine_file_action(output_text, event_data)
            
            # 创建三元组
            triplet = BehaviorTriplet(
                subject=subject,
                predicate=action,
                object=object_entity,
                timestamp=timestamp,
                confidence=0.0,  # 将在后续计算
                context={
                    "rule": event_data.get("rule", ""),
                    "priority": event_data.get("priority", ""),
                    "tags": event_data.get("tags", []),
                    "raw_output": output_text
                }
            )
            
            triplets.append(triplet)
        
        return triplets
    
    def _parse_network_operations(self, event_data: Dict, output_text: str, timestamp: str) -> List[BehaviorTriplet]:
        """解析网络操作事件"""
        triplets = []
        
        # 提取网络连接信息
        proc_match = re.search(r"proc=([^\s]+)", output_text)
        connection_match = re.search(r"connection=([^\s]+)", output_text)
        
        if proc_match and connection_match:
            # 创建主体实体（进程）
            subject = Entity(
                id="",
                type=EntityType.PROCESS,
                name=proc_match.group(1),
                properties={
                    "pid": self._extract_pid(output_text),
                    "user": self._extract_user(output_text)
                }
            )
            
            # 解析连接信息
            connection_info = self._parse_connection_string(connection_match.group(1))
            
            # 创建客体实体（网络端点）
            object_entity = Entity(
                id="",
                type=EntityType.NETWORK,
                name=connection_info["endpoint"],
                properties=connection_info
            )
            
            # 确定动作类型
            action = ActionType.CONNECT
            if "listen" in output_text.lower():
                action = ActionType.LISTEN
            
            # 创建三元组
            triplet = BehaviorTriplet(
                subject=subject,
                predicate=action,
                object=object_entity,
                timestamp=timestamp,
                confidence=0.0,
                context={
                    "rule": event_data.get("rule", ""),
                    "priority": event_data.get("priority", ""),
                    "tags": event_data.get("tags", []),
                    "raw_output": output_text
                }
            )
            
            triplets.append(triplet)
        
        return triplets
    
    def _parse_process_operations(self, event_data: Dict, output_text: str, timestamp: str) -> List[BehaviorTriplet]:
        """解析进程操作事件"""
        triplets = []
        
        # 提取进程信息
        proc_match = re.search(r"proc=([^\s]+)", output_text)
        command_match = re.search(r"command=([^\s]+(?:\s+[^\s]+)*)", output_text)
        
        if proc_match:
            # 创建主体实体（父进程或用户）
            user = self._extract_user(output_text)
            subject = Entity(
                id="",
                type=EntityType.USER if user != "unknown" else EntityType.SYSTEM,
                name=user if user != "unknown" else "system",
                properties={
                    "uid": self._extract_uid(output_text)
                }
            )
            
            # 创建客体实体（新进程）
            object_entity = Entity(
                id="",
                type=EntityType.PROCESS,
                name=proc_match.group(1),
                properties={
                    "command": command_match.group(1) if command_match else "",
                    "pid": self._extract_pid(output_text),
                    "ppid": self._extract_ppid(output_text)
                }
            )
            
            # 确定动作类型
            action = ActionType.EXECUTE
            if "spawn" in output_text.lower() or "fork" in output_text.lower():
                action = ActionType.SPAWN
            
            # 创建三元组
            triplet = BehaviorTriplet(
                subject=subject,
                predicate=action,
                object=object_entity,
                timestamp=timestamp,
                confidence=0.0,
                context={
                    "rule": event_data.get("rule", ""),
                    "priority": event_data.get("priority", ""),
                    "tags": event_data.get("tags", []),
                    "raw_output": output_text
                }
            )
            
            triplets.append(triplet)
        
        return triplets
    
    def _parse_privilege_operations(self, event_data: Dict, output_text: str, timestamp: str) -> List[BehaviorTriplet]:
        """解析权限操作事件"""
        triplets = []
        
        # 提取权限变更信息
        proc_match = re.search(r"proc=([^\s]+)", output_text)
        old_uid_match = re.search(r"old_uid=(\d+)", output_text)
        new_uid_match = re.search(r"new_uid=(\d+)", output_text)
        
        if proc_match:
            # 创建主体实体（进程）
            subject = Entity(
                id="",
                type=EntityType.PROCESS,
                name=proc_match.group(1),
                properties={
                    "pid": self._extract_pid(output_text),
                    "old_uid": old_uid_match.group(1) if old_uid_match else "unknown",
                    "new_uid": new_uid_match.group(1) if new_uid_match else "unknown"
                }
            )
            
            # 创建客体实体（系统权限）
            object_entity = Entity(
                id="",
                type=EntityType.SYSTEM,
                name="privilege_escalation",
                properties={
                    "target_uid": new_uid_match.group(1) if new_uid_match else "0",
                    "escalation_type": "uid_change"
                }
            )
            
            # 创建三元组
            triplet = BehaviorTriplet(
                subject=subject,
                predicate=ActionType.MODIFY,
                object=object_entity,
                timestamp=timestamp,
                confidence=0.0,
                context={
                    "rule": event_data.get("rule", ""),
                    "priority": event_data.get("priority", ""),
                    "tags": event_data.get("tags", []),
                    "raw_output": output_text,
                    "security_impact": "high"
                }
            )
            
            triplets.append(triplet)
        
        return triplets
    
    def _parse_generic_event(self, event_data: Dict, output_text: str, timestamp: str) -> List[BehaviorTriplet]:
        """通用事件解析"""
        triplets = []
        
        # 尝试提取基本的主体-动作-客体信息
        proc_match = re.search(r"proc=([^\s]+)", output_text)
        
        if proc_match:
            # 创建主体实体
            subject = Entity(
                id="",
                type=EntityType.PROCESS,
                name=proc_match.group(1),
                properties={
                    "pid": self._extract_pid(output_text),
                    "user": self._extract_user(output_text)
                }
            )
            
            # 创建通用客体实体
            object_entity = Entity(
                id="",
                type=EntityType.SYSTEM,
                name="system_event",
                properties={
                    "rule": event_data.get("rule", ""),
                    "description": output_text[:100]  # 截取前100字符作为描述
                }
            )
            
            # 创建三元组
            triplet = BehaviorTriplet(
                subject=subject,
                predicate=ActionType.ACCESS,
                object=object_entity,
                timestamp=timestamp,
                confidence=0.0,
                context={
                    "rule": event_data.get("rule", ""),
                    "priority": event_data.get("priority", ""),
                    "tags": event_data.get("tags", []),
                    "raw_output": output_text,
                    "parsing_method": "generic"
                }
            )
            
            triplets.append(triplet)
        
        return triplets
    
    def _determine_file_action(self, output_text: str, event_data: Dict) -> ActionType:
        """确定文件操作的动作类型"""
        output_lower = output_text.lower()
        
        if "write" in output_lower or "modify" in output_lower:
            return ActionType.WRITE
        elif "read" in output_lower or "open" in output_lower:
            return ActionType.READ
        elif "delete" in output_lower or "unlink" in output_lower:
            return ActionType.DELETE
        elif "create" in output_lower:
            return ActionType.CREATE
        else:
            return ActionType.ACCESS
    
    def _parse_connection_string(self, connection: str) -> Dict[str, Any]:
        """解析连接字符串"""
        # 示例: 192.168.1.100:80->10.0.0.1:443
        parts = connection.split("->")
        
        if len(parts) == 2:
            source = parts[0].split(":")
            dest = parts[1].split(":")
            
            return {
                "endpoint": connection,
                "source_ip": source[0] if len(source) > 0 else "unknown",
                "source_port": source[1] if len(source) > 1 else "unknown",
                "dest_ip": dest[0] if len(dest) > 0 else "unknown",
                "dest_port": dest[1] if len(dest) > 1 else "unknown",
                "direction": "outbound"
            }
        else:
            return {
                "endpoint": connection,
                "direction": "unknown"
            }
    
    def _extract_pid(self, text: str) -> str:
        """提取进程ID"""
        match = re.search(r"pid=(\d+)", text)
        return match.group(1) if match else "unknown"
    
    def _extract_ppid(self, text: str) -> str:
        """提取父进程ID"""
        match = re.search(r"ppid=(\d+)", text)
        return match.group(1) if match else "unknown"
    
    def _extract_user(self, text: str) -> str:
        """提取用户名"""
        match = re.search(r"user=([^\s]+)", text)
        return match.group(1) if match else "unknown"
    
    def _extract_uid(self, text: str) -> str:
        """提取用户ID"""
        match = re.search(r"uid=(\d+)", text)
        return match.group(1) if match else "unknown"
    
    def _calculate_confidence(self, triplet: BehaviorTriplet, priority: str) -> float:
        """计算三元组的置信度"""
        base_confidence = 0.5
        
        # 根据优先级调整置信度
        priority_weights = {
            "EMERGENCY": 1.0,
            "ALERT": 0.9,
            "CRITICAL": 0.8,
            "ERROR": 0.7,
            "WARNING": 0.6,
            "NOTICE": 0.5,
            "INFO": 0.4,
            "DEBUG": 0.3
        }
        
        confidence = base_confidence * priority_weights.get(priority.upper(), 0.5)
        
        # 根据实体类型调整置信度
        if triplet.subject.type != EntityType.UNKNOWN and triplet.object.type != EntityType.UNKNOWN:
            confidence += 0.2
        
        # 根据动作类型调整置信度
        if triplet.predicate != ActionType.UNKNOWN:
            confidence += 0.1
        
        # 根据上下文信息调整置信度
        if triplet.context.get("security_impact") == "high":
            confidence += 0.2
        
        return min(confidence, 1.0)
    
    def get_entity_by_id(self, entity_id: str) -> Optional[Entity]:
        """根据ID获取实体"""
        return self.entity_cache.get(entity_id)
    
    def cache_entity(self, entity: Entity) -> None:
        """缓存实体"""
        self.entity_cache[entity.id] = entity
    
    def clear_cache(self) -> None:
        """清空实体缓存"""
        self.entity_cache.clear()
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取解析统计信息"""
        entity_types = {}
        for entity in self.entity_cache.values():
            entity_type = entity.type.value
            entity_types[entity_type] = entity_types.get(entity_type, 0) + 1
        
        return {
            "cached_entities": len(self.entity_cache),
            "entity_types": entity_types,
            "parsing_rules": len(self.rule_patterns)
        }


# 测试函数
if __name__ == "__main__":
    # 创建解析器实例
    parser = BehaviorParser()
    
    # 测试事件数据
    test_event = {
        "time": "2024-01-20T10:30:00.000Z",
        "rule": "Sensitive file access",
        "priority": "WARNING",
        "output": "Sensitive file accessed (proc=cat pid=1234 user=root file=/etc/passwd command=cat /etc/passwd)",
        "tags": ["filesystem", "sensitive"]
    }
    
    # 解析事件
    triplets = parser.parse_falco_event(test_event)
    
    # 输出结果
    for triplet in triplets:
        print(f"主体: {triplet.subject.name} ({triplet.subject.type.value})")
        print(f"动作: {triplet.predicate.value}")
        print(f"客体: {triplet.object.name} ({triplet.object.type.value})")
        print(f"置信度: {triplet.confidence:.2f}")
        print(f"上下文: {triplet.context}")
        print("-" * 50)
    
    # 输出统计信息
    stats = parser.get_statistics()
    print(f"解析统计: {stats}")