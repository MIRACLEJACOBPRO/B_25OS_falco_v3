#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - Intelligence Router
威胁情报相关API路由
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
import random
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intelligence", tags=["intelligence"])

# 威胁类型配置
THREAT_TYPES = {
    "malware": {"label": "恶意软件", "color": "#f44336"},
    "phishing": {"label": "钓鱼攻击", "color": "#ff9800"},
    "ransomware": {"label": "勒索软件", "color": "#e91e63"},
    "apt": {"label": "APT攻击", "color": "#9c27b0"},
    "botnet": {"label": "僵尸网络", "color": "#3f51b5"},
    "ddos": {"label": "DDoS攻击", "color": "#2196f3"},
    "vulnerability": {"label": "漏洞利用", "color": "#ff5722"},
    "insider": {"label": "内部威胁", "color": "#795548"},
    "social": {"label": "社会工程", "color": "#607d8b"},
    "data_breach": {"label": "数据泄露", "color": "#009688"}
}

# 威胁严重程度配置
THREAT_SEVERITY = {
    "critical": {"label": "严重", "score": 4},
    "high": {"label": "高", "score": 3},
    "medium": {"label": "中", "score": 2},
    "low": {"label": "低", "score": 1}
}

# 威胁来源配置
THREAT_SOURCES = {
    "internal": {"label": "内部情报"},
    "external": {"label": "外部情报"},
    "osint": {"label": "开源情报"},
    "commercial": {"label": "商业情报"},
    "government": {"label": "政府情报"}
}

# 威胁状态配置
THREAT_STATUS = {
    "active": {"label": "活跃"},
    "monitoring": {"label": "监控中"},
    "mitigated": {"label": "已缓解"},
    "resolved": {"label": "已解决"}
}

# 可信度等级
CONFIDENCE_LEVELS = {
    "high": {"label": "高", "score": 3},
    "medium": {"label": "中", "score": 2},
    "low": {"label": "低", "score": 1}
}

def generate_mock_threat_data(count: int = 50):
    """生成模拟威胁情报数据"""
    threats = []
    types = list(THREAT_TYPES.keys())
    severities = list(THREAT_SEVERITY.keys())
    sources = list(THREAT_SOURCES.keys())
    statuses = list(THREAT_STATUS.keys())
    confidences = list(CONFIDENCE_LEVELS.keys())
    
    for i in range(count):
        timestamp = datetime.now() - timedelta(hours=random.randint(1, 168))  # 最近一周
        threat_type = random.choice(types)
        severity = random.choice(severities)
        
        threat = {
            "id": f"threat_{i + 1}",
            "title": f"威胁情报 {i + 1}",
            "description": f"这是一个关于{THREAT_TYPES[threat_type]['label']}的威胁情报描述",
            "type": threat_type,
            "severity": severity,
            "source": random.choice(sources),
            "status": random.choice(statuses),
            "confidence": random.choice(confidences),
            "timestamp": timestamp.isoformat(),
            "lastUpdated": (timestamp + timedelta(minutes=random.randint(1, 60))).isoformat(),
            "indicators": {
                "ips": [
                    f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",
                    f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
                ],
                "domains": [
                    f"malicious-domain-{i + 1}.com",
                    f"suspicious-site-{i + 1}.net"
                ],
                "hashes": [
                    f"{uuid.uuid4().hex}",
                    f"{uuid.uuid4().hex}"
                ],
                "urls": [
                    f"https://malicious-url-{i + 1}.com/path",
                    f"http://suspicious-url-{i + 1}.org/endpoint"
                ]
            },
            "tags": [f"tag-{random.randint(1, 10)}", f"category-{random.randint(1, 5)}"],
            "author": f"analyst-{random.randint(1, 5)}",
            "organization": f"org-{random.randint(1, 3)}",
            "references": [
                f"https://reference-{i + 1}.com",
                f"https://source-{i + 1}.org"
            ],
            "isFavorite": random.random() > 0.8,
            "isBookmarked": random.random() > 0.7,
            "viewCount": random.randint(1, 100),
            "shareCount": random.randint(0, 20)
        }
        
        threats.append(threat)
    
    return sorted(threats, key=lambda x: x['timestamp'], reverse=True)

def generate_mock_ioc_data(count: int = 30):
    """生成模拟IOC指标数据"""
    iocs = []
    ioc_types = ["ip", "domain", "hash", "url", "email"]
    
    for i in range(count):
        ioc_type = random.choice(ioc_types)
        
        if ioc_type == "ip":
            value = f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
        elif ioc_type == "domain":
            value = f"malicious-{i + 1}.com"
        elif ioc_type == "hash":
            value = uuid.uuid4().hex
        elif ioc_type == "url":
            value = f"https://malicious-{i + 1}.com/path"
        else:  # email
            value = f"attacker{i + 1}@malicious.com"
        
        ioc = {
            "id": f"ioc_{i + 1}",
            "type": ioc_type,
            "value": value,
            "description": f"恶意{ioc_type}指标",
            "severity": random.choice(list(THREAT_SEVERITY.keys())),
            "confidence": random.choice(list(CONFIDENCE_LEVELS.keys())),
            "source": random.choice(list(THREAT_SOURCES.keys())),
            "tags": [f"tag-{random.randint(1, 5)}"],
            "firstSeen": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            "lastSeen": (datetime.now() - timedelta(hours=random.randint(1, 24))).isoformat(),
            "isActive": random.random() > 0.3,
            "hitCount": random.randint(0, 50)
        }
        
        iocs.append(ioc)
    
    return iocs

@router.get("/threats")
async def get_threat_intelligence(
    type: Optional[str] = Query(None, description="威胁类型过滤"),
    severity: Optional[str] = Query(None, description="严重程度过滤"),
    source: Optional[str] = Query(None, description="来源过滤"),
    status: Optional[str] = Query(None, description="状态过滤"),
    confidence: Optional[str] = Query(None, description="可信度过滤"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    limit: Optional[int] = Query(50, description="返回数量限制"),
    offset: Optional[int] = Query(0, description="偏移量")
):
    """获取威胁情报列表"""
    try:
        # 生成模拟数据
        all_threats = generate_mock_threat_data(100)
        
        # 应用过滤器
        filtered_threats = all_threats
        
        if type:
            filtered_threats = [t for t in filtered_threats if t['type'] == type]
        if severity:
            filtered_threats = [t for t in filtered_threats if t['severity'] == severity]
        if source:
            filtered_threats = [t for t in filtered_threats if t['source'] == source]
        if status:
            filtered_threats = [t for t in filtered_threats if t['status'] == status]
        if confidence:
            filtered_threats = [t for t in filtered_threats if t['confidence'] == confidence]
        if search:
            search_lower = search.lower()
            filtered_threats = [
                t for t in filtered_threats 
                if search_lower in t['title'].lower() or search_lower in t['description'].lower()
            ]
        
        # 分页
        total = len(filtered_threats)
        paginated_threats = filtered_threats[offset:offset + limit]
        
        logger.info(f"Retrieved {len(paginated_threats)} threat intelligence items")
        return {
            "success": True,
            "data": paginated_threats,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"Error getting threat intelligence: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get threat intelligence")

@router.post("/search")
async def search_threat_intel(
    query: str,
    filters: Optional[Dict[str, Any]] = None
):
    """搜索威胁情报"""
    try:
        # 生成模拟数据
        all_threats = generate_mock_threat_data(100)
        
        # 执行搜索
        query_lower = query.lower()
        search_results = [
            t for t in all_threats
            if (query_lower in t['title'].lower() or 
                query_lower in t['description'].lower() or
                any(query_lower in tag.lower() for tag in t['tags']))
        ]
        
        logger.info(f"Search for '{query}' returned {len(search_results)} results")
        return {
            "success": True,
            "data": search_results,
            "query": query,
            "total": len(search_results)
        }
    except Exception as e:
        logger.error(f"Error searching threat intelligence: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search threat intelligence")

@router.get("/ioc")
async def get_ioc_indicators(
    type: Optional[str] = Query(None, description="IOC类型过滤"),
    severity: Optional[str] = Query(None, description="严重程度过滤"),
    active_only: Optional[bool] = Query(False, description="仅显示活跃IOC"),
    limit: Optional[int] = Query(30, description="返回数量限制")
):
    """获取IOC指标列表"""
    try:
        # 生成模拟数据
        all_iocs = generate_mock_ioc_data(50)
        
        # 应用过滤器
        filtered_iocs = all_iocs
        
        if type:
            filtered_iocs = [ioc for ioc in filtered_iocs if ioc['type'] == type]
        if severity:
            filtered_iocs = [ioc for ioc in filtered_iocs if ioc['severity'] == severity]
        if active_only:
            filtered_iocs = [ioc for ioc in filtered_iocs if ioc['isActive']]
        
        # 限制数量
        limited_iocs = filtered_iocs[:limit]
        
        logger.info(f"Retrieved {len(limited_iocs)} IOC indicators")
        return {
            "success": True,
            "data": limited_iocs,
            "total": len(limited_iocs)
        }
    except Exception as e:
        logger.error(f"Error getting IOC indicators: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get IOC indicators")

@router.post("/ioc")
async def add_ioc_indicator(indicator: Dict[str, Any]):
    """添加IOC指标"""
    try:
        # 在实际应用中，这里应该将IOC保存到数据库
        new_ioc = {
            "id": f"ioc_{uuid.uuid4().hex[:8]}",
            "type": indicator.get("type"),
            "value": indicator.get("value"),
            "description": indicator.get("description", ""),
            "severity": indicator.get("severity", "medium"),
            "confidence": indicator.get("confidence", "medium"),
            "source": indicator.get("source", "internal"),
            "tags": indicator.get("tags", []),
            "firstSeen": datetime.now().isoformat(),
            "lastSeen": datetime.now().isoformat(),
            "isActive": True,
            "hitCount": 0
        }
        
        logger.info(f"Added new IOC indicator: {new_ioc['id']}")
        return {
            "success": True,
            "data": new_ioc,
            "message": "IOC指标添加成功"
        }
    except Exception as e:
        logger.error(f"Error adding IOC indicator: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add IOC indicator")

@router.put("/ioc/{indicator_id}")
async def update_ioc_indicator(indicator_id: str, updates: Dict[str, Any]):
    """更新IOC指标"""
    try:
        # 在实际应用中，这里应该更新数据库中的IOC
        updated_ioc = {
            "id": indicator_id,
            "lastUpdated": datetime.now().isoformat(),
            **updates
        }
        
        logger.info(f"Updated IOC indicator: {indicator_id}")
        return {
            "success": True,
            "data": updated_ioc,
            "message": "IOC指标更新成功"
        }
    except Exception as e:
        logger.error(f"Error updating IOC indicator: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update IOC indicator")

@router.delete("/ioc/{indicator_id}")
async def delete_ioc_indicator(indicator_id: str):
    """删除IOC指标"""
    try:
        # 在实际应用中，这里应该从数据库中删除IOC
        logger.info(f"Deleted IOC indicator: {indicator_id}")
        return {
            "success": True,
            "message": "IOC指标删除成功"
        }
    except Exception as e:
        logger.error(f"Error deleting IOC indicator: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete IOC indicator")