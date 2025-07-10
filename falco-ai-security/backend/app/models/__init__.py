#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 模型模块

该模块包含了系统中所有的数据模型定义，
包括图数据模型、事件模型等。

作者: Falco AI Security Team
版本: 1.0.0
创建时间: 2024-01-20
"""

# 图数据模型
from .graph_models import (
    NodeType,
    RelationshipType,
    BaseNode,
    ProcessNode,
    FileNode,
    NetworkNode,
    UserNode,
    ContainerNode,
    ThreatNode,
    BaseRelationship,
    ProcessRelationship,
    FileRelationship,
    NetworkRelationship,
    GraphModelFactory,
    GraphQuery
)

# 事件模型
from .event_models import (
    EventSeverity,
    EventPriority,
    EventCategory,
    EventStatus,
    EventMetadata,
    ProcessInfo,
    FileInfo,
    NetworkInfo,
    FalcoEvent,
    ProcessedEvent,
    SecurityAlert,
    EventModelFactory
)

__version__ = "1.0.0"
__author__ = "Falco AI Security Team"

__all__ = [
    # 图数据模型
    "NodeType",
    "RelationshipType",
    "BaseNode",
    "ProcessNode",
    "FileNode",
    "NetworkNode",
    "UserNode",
    "ContainerNode",
    "ThreatNode",
    "BaseRelationship",
    "ProcessRelationship",
    "FileRelationship",
    "NetworkRelationship",
    "GraphModelFactory",
    "GraphQuery",
    
    # 事件模型
    "EventSeverity",
    "EventPriority",
    "EventCategory",
    "EventStatus",
    "EventMetadata",
    "ProcessInfo",
    "FileInfo",
    "NetworkInfo",
    "FalcoEvent",
    "ProcessedEvent",
    "SecurityAlert",
    "EventModelFactory"
]