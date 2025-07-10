#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 事件模型

该模块定义了Falco事件的数据结构和处理逻辑，
包括原始事件、处理后事件、告警事件等。

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
import uuid


class EventSeverity(Enum):
    """事件严重程度"""
    EMERGENCY = "Emergency"  # 系统不可用
    ALERT = "Alert"         # 必须立即采取行动
    CRITICAL = "Critical"   # 严重情况
    ERROR = "Error"         # 错误情况
    WARNING = "Warning"     # 警告情况
    NOTICE = "Notice"       # 正常但重要的情况
    INFO = "Informational"  # 信息性消息
    DEBUG = "Debug"         # 调试级别消息


class EventPriority(Enum):
    """事件优先级"""
    EMERGENCY = "Emergency"
    ALERT = "Alert"
    CRITICAL = "Critical"
    ERROR = "Error"
    WARNING = "Warning"
    NOTICE = "Notice"
    INFORMATIONAL = "Informational"
    DEBUG = "Debug"


class EventCategory(Enum):
    """事件类别"""
    PROCESS = "process"
    FILE = "file"
    NETWORK = "network"
    SYSCALL = "syscall"
    CONTAINER = "container"
    K8S = "k8s"
    CLOUD = "cloud"
    SECURITY = "security"
    ANOMALY = "anomaly"
    THREAT = "threat"


class EventStatus(Enum):
    """事件状态"""
    NEW = "new"
    PROCESSING = "processing"
    ANALYZED = "analyzed"
    RESOLVED = "resolved"
    IGNORED = "ignored"
    ESCALATED = "escalated"


@dataclass
class EventMetadata:
    """事件元数据"""
    source: str = "falco"
    version: str = "1.0.0"
    hostname: Optional[str] = None
    container_id: Optional[str] = None
    container_name: Optional[str] = None
    k8s_namespace: Optional[str] = None
    k8s_pod_name: Optional[str] = None
    k8s_deployment: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    labels: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "source": self.source,
            "version": self.version,
            "hostname": self.hostname,
            "container_id": self.container_id,
            "container_name": self.container_name,
            "k8s_namespace": self.k8s_namespace,
            "k8s_pod_name": self.k8s_pod_name,
            "k8s_deployment": self.k8s_deployment,
            "tags": self.tags,
            "labels": self.labels
        }


@dataclass
class ProcessInfo:
    """进程信息"""
    pid: Optional[int] = None
    ppid: Optional[int] = None
    name: Optional[str] = None
    exe: Optional[str] = None
    cmdline: Optional[str] = None
    cwd: Optional[str] = None
    user: Optional[str] = None
    uid: Optional[int] = None
    gid: Optional[int] = None
    tty: Optional[int] = None
    sid: Optional[int] = None
    vpid: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "pid": self.pid,
            "ppid": self.ppid,
            "name": self.name,
            "exe": self.exe,
            "cmdline": self.cmdline,
            "cwd": self.cwd,
            "user": self.user,
            "uid": self.uid,
            "gid": self.gid,
            "tty": self.tty,
            "sid": self.sid,
            "vpid": self.vpid
        }


@dataclass
class FileInfo:
    """文件信息"""
    path: Optional[str] = None
    name: Optional[str] = None
    directory: Optional[str] = None
    type: Optional[str] = None
    dev: Optional[int] = None
    ino: Optional[int] = None
    mode: Optional[str] = None
    uid: Optional[int] = None
    gid: Optional[int] = None
    size: Optional[int] = None
    mtime: Optional[str] = None
    ctime: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "path": self.path,
            "name": self.name,
            "directory": self.directory,
            "type": self.type,
            "dev": self.dev,
            "ino": self.ino,
            "mode": self.mode,
            "uid": self.uid,
            "gid": self.gid,
            "size": self.size,
            "mtime": self.mtime,
            "ctime": self.ctime
        }


@dataclass
class NetworkInfo:
    """网络信息"""
    proto: Optional[str] = None
    src_ip: Optional[str] = None
    src_port: Optional[int] = None
    dst_ip: Optional[str] = None
    dst_port: Optional[int] = None
    connection_id: Optional[str] = None
    direction: Optional[str] = None
    bytes_in: Optional[int] = None
    bytes_out: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "proto": self.proto,
            "src_ip": self.src_ip,
            "src_port": self.src_port,
            "dst_ip": self.dst_ip,
            "dst_port": self.dst_port,
            "connection_id": self.connection_id,
            "direction": self.direction,
            "bytes_in": self.bytes_in,
            "bytes_out": self.bytes_out
        }


@dataclass
class FalcoEvent:
    """Falco原始事件"""
    # 基础字段
    uuid: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    time: Optional[str] = None
    rule: Optional[str] = None
    priority: Optional[str] = None
    source: Optional[str] = None
    message: Optional[str] = None
    output: Optional[str] = None
    output_fields: Dict[str, Any] = field(default_factory=dict)
    
    # 详细信息
    process_info: Optional[ProcessInfo] = None
    file_info: Optional[FileInfo] = None
    network_info: Optional[NetworkInfo] = None
    metadata: EventMetadata = field(default_factory=EventMetadata)
    
    # 原始数据
    raw_data: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """初始化后处理"""
        if self.time and not self.timestamp:
            self.timestamp = self.time
    
    @classmethod
    def from_json(cls, json_data: Union[str, Dict[str, Any]]) -> 'FalcoEvent':
        """从JSON数据创建事件"""
        if isinstance(json_data, str):
            data = json.loads(json_data)
        else:
            data = json_data
        
        # 提取基础字段
        event = cls(
            timestamp=data.get('time', datetime.utcnow().isoformat()),
            time=data.get('time'),
            rule=data.get('rule'),
            priority=data.get('priority'),
            source=data.get('source'),
            message=data.get('message'),
            output=data.get('output'),
            output_fields=data.get('output_fields', {}),
            raw_data=data
        )
        
        # 提取进程信息
        if 'proc' in data.get('output_fields', {}) or any(k.startswith('proc.') for k in data.get('output_fields', {})):
            event.process_info = ProcessInfo(
                pid=data.get('output_fields', {}).get('proc.pid'),
                ppid=data.get('output_fields', {}).get('proc.ppid'),
                name=data.get('output_fields', {}).get('proc.name'),
                exe=data.get('output_fields', {}).get('proc.exe'),
                cmdline=data.get('output_fields', {}).get('proc.cmdline'),
                cwd=data.get('output_fields', {}).get('proc.cwd'),
                user=data.get('output_fields', {}).get('user.name'),
                uid=data.get('output_fields', {}).get('user.uid'),
                gid=data.get('output_fields', {}).get('user.gid'),
                tty=data.get('output_fields', {}).get('proc.tty'),
                sid=data.get('output_fields', {}).get('proc.sid'),
                vpid=data.get('output_fields', {}).get('proc.vpid')
            )
        
        # 提取文件信息
        if any(k.startswith('fd.') or k.startswith('file.') for k in data.get('output_fields', {})):
            event.file_info = FileInfo(
                path=data.get('output_fields', {}).get('fd.name') or data.get('output_fields', {}).get('file.path'),
                name=data.get('output_fields', {}).get('file.name'),
                directory=data.get('output_fields', {}).get('file.directory'),
                type=data.get('output_fields', {}).get('fd.type'),
                dev=data.get('output_fields', {}).get('file.dev'),
                ino=data.get('output_fields', {}).get('file.ino'),
                mode=data.get('output_fields', {}).get('file.mode'),
                uid=data.get('output_fields', {}).get('file.uid'),
                gid=data.get('output_fields', {}).get('file.gid'),
                size=data.get('output_fields', {}).get('file.size'),
                mtime=data.get('output_fields', {}).get('file.mtime'),
                ctime=data.get('output_fields', {}).get('file.ctime')
            )
        
        # 提取网络信息
        if any(k.startswith('fd.') and ('ip' in k or 'port' in k) for k in data.get('output_fields', {})):
            event.network_info = NetworkInfo(
                proto=data.get('output_fields', {}).get('fd.l4proto'),
                src_ip=data.get('output_fields', {}).get('fd.cip') or data.get('output_fields', {}).get('fd.sip'),
                src_port=data.get('output_fields', {}).get('fd.cport') or data.get('output_fields', {}).get('fd.sport'),
                dst_ip=data.get('output_fields', {}).get('fd.sip') or data.get('output_fields', {}).get('fd.rip'),
                dst_port=data.get('output_fields', {}).get('fd.sport') or data.get('output_fields', {}).get('fd.rport'),
                connection_id=data.get('output_fields', {}).get('fd.name'),
                direction=data.get('output_fields', {}).get('fd.direction')
            )
        
        # 提取元数据
        event.metadata = EventMetadata(
            hostname=data.get('hostname'),
            container_id=data.get('output_fields', {}).get('container.id'),
            container_name=data.get('output_fields', {}).get('container.name'),
            k8s_namespace=data.get('output_fields', {}).get('k8s.ns.name'),
            k8s_pod_name=data.get('output_fields', {}).get('k8s.pod.name'),
            k8s_deployment=data.get('output_fields', {}).get('k8s.deployment.name')
        )
        
        return event
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        result = {
            "uuid": self.uuid,
            "timestamp": self.timestamp,
            "time": self.time,
            "rule": self.rule,
            "priority": self.priority,
            "source": self.source,
            "message": self.message,
            "output": self.output,
            "output_fields": self.output_fields,
            "metadata": self.metadata.to_dict()
        }
        
        if self.process_info:
            result["process_info"] = self.process_info.to_dict()
        
        if self.file_info:
            result["file_info"] = self.file_info.to_dict()
        
        if self.network_info:
            result["network_info"] = self.network_info.to_dict()
        
        return result
    
    def get_category(self) -> EventCategory:
        """获取事件类别"""
        if self.process_info:
            return EventCategory.PROCESS
        elif self.file_info:
            return EventCategory.FILE
        elif self.network_info:
            return EventCategory.NETWORK
        elif self.metadata.container_id:
            return EventCategory.CONTAINER
        elif self.metadata.k8s_namespace:
            return EventCategory.K8S
        else:
            return EventCategory.SYSCALL
    
    def get_severity(self) -> EventSeverity:
        """获取事件严重程度"""
        priority_map = {
            "Emergency": EventSeverity.EMERGENCY,
            "Alert": EventSeverity.ALERT,
            "Critical": EventSeverity.CRITICAL,
            "Error": EventSeverity.ERROR,
            "Warning": EventSeverity.WARNING,
            "Notice": EventSeverity.NOTICE,
            "Informational": EventSeverity.INFO,
            "Debug": EventSeverity.DEBUG
        }
        return priority_map.get(self.priority, EventSeverity.INFO)
    
    def get_hash(self) -> str:
        """获取事件哈希值"""
        content = f"{self.rule}:{self.priority}:{self.source}:{self.message}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]


@dataclass
class ProcessedEvent:
    """处理后的事件"""
    # 原始事件
    original_event: FalcoEvent
    
    # 处理信息
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    processed_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    category: Optional[EventCategory] = None
    severity: Optional[EventSeverity] = None
    status: EventStatus = EventStatus.NEW
    
    # 分析结果
    risk_score: float = 0.0
    confidence: float = 0.0
    anomaly_score: float = 0.0
    threat_indicators: List[str] = field(default_factory=list)
    mitre_tactics: List[str] = field(default_factory=list)
    mitre_techniques: List[str] = field(default_factory=list)
    
    # 上下文信息
    related_events: List[str] = field(default_factory=list)
    similar_events: List[str] = field(default_factory=list)
    behavior_context: Dict[str, Any] = field(default_factory=dict)
    
    # AI分析结果
    ai_analysis: Dict[str, Any] = field(default_factory=dict)
    recommendations: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """初始化后处理"""
        if not self.category:
            self.category = self.original_event.get_category()
        
        if not self.severity:
            self.severity = self.original_event.get_severity()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "event_id": self.event_id,
            "processed_at": self.processed_at,
            "category": self.category.value if self.category else None,
            "severity": self.severity.value if self.severity else None,
            "status": self.status.value,
            "risk_score": self.risk_score,
            "confidence": self.confidence,
            "anomaly_score": self.anomaly_score,
            "threat_indicators": self.threat_indicators,
            "mitre_tactics": self.mitre_tactics,
            "mitre_techniques": self.mitre_techniques,
            "related_events": self.related_events,
            "similar_events": self.similar_events,
            "behavior_context": self.behavior_context,
            "ai_analysis": self.ai_analysis,
            "recommendations": self.recommendations,
            "original_event": self.original_event.to_dict()
        }
    
    def update_status(self, new_status: EventStatus, reason: Optional[str] = None):
        """更新事件状态"""
        self.status = new_status
        if reason:
            if "status_history" not in self.behavior_context:
                self.behavior_context["status_history"] = []
            self.behavior_context["status_history"].append({
                "status": new_status.value,
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat()
            })
    
    def add_threat_indicator(self, indicator: str):
        """添加威胁指标"""
        if indicator not in self.threat_indicators:
            self.threat_indicators.append(indicator)
    
    def add_mitre_tactic(self, tactic: str):
        """添加MITRE ATT&CK战术"""
        if tactic not in self.mitre_tactics:
            self.mitre_tactics.append(tactic)
    
    def add_mitre_technique(self, technique: str):
        """添加MITRE ATT&CK技术"""
        if technique not in self.mitre_techniques:
            self.mitre_techniques.append(technique)


@dataclass
class SecurityAlert:
    """安全告警"""
    # 基础信息
    alert_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    # 告警内容
    title: str = ""
    description: str = ""
    severity: EventSeverity = EventSeverity.INFO
    category: EventCategory = EventCategory.SECURITY
    status: EventStatus = EventStatus.NEW
    
    # 风险评估
    risk_score: float = 0.0
    confidence: float = 0.0
    impact: str = "Low"
    likelihood: str = "Low"
    
    # 相关事件
    trigger_events: List[str] = field(default_factory=list)
    related_alerts: List[str] = field(default_factory=list)
    
    # 威胁情报
    threat_type: Optional[str] = None
    attack_vector: Optional[str] = None
    mitre_tactics: List[str] = field(default_factory=list)
    mitre_techniques: List[str] = field(default_factory=list)
    iocs: List[str] = field(default_factory=list)  # Indicators of Compromise
    
    # 响应建议
    recommendations: List[str] = field(default_factory=list)
    remediation_steps: List[str] = field(default_factory=list)
    
    # 元数据
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "alert_id": self.alert_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "title": self.title,
            "description": self.description,
            "severity": self.severity.value,
            "category": self.category.value,
            "status": self.status.value,
            "risk_score": self.risk_score,
            "confidence": self.confidence,
            "impact": self.impact,
            "likelihood": self.likelihood,
            "trigger_events": self.trigger_events,
            "related_alerts": self.related_alerts,
            "threat_type": self.threat_type,
            "attack_vector": self.attack_vector,
            "mitre_tactics": self.mitre_tactics,
            "mitre_techniques": self.mitre_techniques,
            "iocs": self.iocs,
            "recommendations": self.recommendations,
            "remediation_steps": self.remediation_steps,
            "metadata": self.metadata
        }
    
    def update_severity(self, new_severity: EventSeverity):
        """更新严重程度"""
        self.severity = new_severity
        self.updated_at = datetime.utcnow().isoformat()
    
    def add_trigger_event(self, event_id: str):
        """添加触发事件"""
        if event_id not in self.trigger_events:
            self.trigger_events.append(event_id)
            self.updated_at = datetime.utcnow().isoformat()
    
    def add_recommendation(self, recommendation: str):
        """添加建议"""
        if recommendation not in self.recommendations:
            self.recommendations.append(recommendation)
            self.updated_at = datetime.utcnow().isoformat()


class EventModelFactory:
    """事件模型工厂类"""
    
    @staticmethod
    def create_falco_event(json_data: Union[str, Dict[str, Any]]) -> FalcoEvent:
        """创建Falco事件"""
        return FalcoEvent.from_json(json_data)
    
    @staticmethod
    def create_processed_event(falco_event: FalcoEvent) -> ProcessedEvent:
        """创建处理后事件"""
        return ProcessedEvent(original_event=falco_event)
    
    @staticmethod
    def create_security_alert(
        title: str,
        description: str,
        severity: EventSeverity = EventSeverity.INFO,
        category: EventCategory = EventCategory.SECURITY
    ) -> SecurityAlert:
        """创建安全告警"""
        return SecurityAlert(
            title=title,
            description=description,
            severity=severity,
            category=category
        )


# 测试函数
if __name__ == "__main__":
    # 测试Falco事件解析
    sample_falco_json = {
        "time": "2024-01-20T10:30:00.123456789Z",
        "rule": "Terminal shell in container",
        "priority": "Warning",
        "source": "syscall",
        "message": "A shell was used as the entrypoint/exec point into a container with an attached terminal.",
        "output": "A shell was used as the entrypoint/exec point into a container with an attached terminal (user=root user_loginuid=-1 k8s.ns=default k8s.pod=test-pod container=test-container shell=bash parent=runc cmdline=bash terminal=34816 container_id=1234567890ab image=ubuntu:latest)",
        "output_fields": {
            "container.id": "1234567890ab",
            "container.name": "test-container",
            "k8s.ns.name": "default",
            "k8s.pod.name": "test-pod",
            "proc.name": "bash",
            "proc.pid": 12345,
            "proc.cmdline": "bash",
            "user.name": "root",
            "user.uid": 0
        }
    }
    
    # 创建事件
    falco_event = EventModelFactory.create_falco_event(sample_falco_json)
    processed_event = EventModelFactory.create_processed_event(falco_event)
    security_alert = EventModelFactory.create_security_alert(
        "Container Shell Access Detected",
        "Suspicious shell access detected in container",
        EventSeverity.WARNING,
        EventCategory.CONTAINER
    )
    
    # 输出结果
    print("Falco事件:")
    print(json.dumps(falco_event.to_dict(), indent=2, ensure_ascii=False))
    
    print("\n处理后事件:")
    print(json.dumps(processed_event.to_dict(), indent=2, ensure_ascii=False))
    
    print("\n安全告警:")
    print(json.dumps(security_alert.to_dict(), indent=2, ensure_ascii=False))