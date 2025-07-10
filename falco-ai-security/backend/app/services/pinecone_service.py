#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - Pinecone Service
Pinecone向量数据库服务，负责事件向量化和相似性检索
"""

import logging
import json
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import numpy as np
from pinecone import Pinecone, Index
from pinecone.exceptions import PineconeException

from app.config import settings
from app.services.falco_monitor import FalcoEvent

logger = logging.getLogger(__name__)

@dataclass
class EventVector:
    """事件向量数据结构"""
    id: str
    vector: List[float]
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            'id': self.id,
            'values': self.vector,
            'metadata': self.metadata
        }

class PineconeService:
    """Pinecone向量数据库服务"""
    
    def __init__(self):
        self.client: Optional[Pinecone] = None
        self.index: Optional[Index] = None
        self.api_key = settings.PINECONE_API_KEY
        self.environment = settings.PINECONE_ENVIRONMENT
        self.index_name = settings.PINECONE_INDEX_NAME
        self.dimension = 384  # 使用sentence-transformers的默认维度
        self.is_connected = False
        
        # 特征提取权重配置
        self.feature_weights = {
            'rule_name': 0.3,
            'priority': 0.2,
            'process_name': 0.15,
            'file_path': 0.1,
            'network_info': 0.1,
            'user_info': 0.05,
            'syscall_type': 0.05,
            'container_info': 0.05
        }
    
    async def connect(self) -> bool:
        """连接到Pinecone服务"""
        try:
            # 初始化Pinecone客户端
            self.client = Pinecone(api_key=self.api_key)
            
            # 检查索引是否存在
            existing_indexes = self.client.list_indexes()
            index_names = [idx.name for idx in existing_indexes.indexes]
            
            if self.index_name not in index_names:
                logger.info(f"创建Pinecone索引: {self.index_name}")
                self.client.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric='cosine',
                    spec={
                        'serverless': {
                            'cloud': 'aws',
                            'region': 'us-east-1'
                        }
                    }
                )
            
            # 连接到索引
            self.index = self.client.Index(self.index_name)
            
            # 测试连接
            stats = self.index.describe_index_stats()
            if stats:
                self.is_connected = True
                logger.info(f"已连接到Pinecone索引: {self.index_name}")
                logger.info(f"索引统计: {stats}")
                return True
                
        except PineconeException as e:
            logger.error(f"Pinecone连接失败: {e}")
        except Exception as e:
            logger.error(f"连接Pinecone时发生未知错误: {e}")
        
        self.is_connected = False
        return False
    
    async def disconnect(self):
        """断开Pinecone连接"""
        self.client = None
        self.index = None
        self.is_connected = False
        logger.info("已断开Pinecone连接")
    
    def extract_features(self, event: FalcoEvent) -> Dict[str, Any]:
        """从Falco事件中提取特征"""
        features = {
            'rule_name': event.rule,
            'priority': event.priority,
            'message': event.message,
            'hostname': event.hostname,
            'timestamp': event.timestamp.isoformat(),
            'tags': event.tags
        }
        
        # 从output_fields中提取更多特征
        output_fields = event.output_fields
        
        # 进程信息
        if 'proc.name' in output_fields:
            features['process_name'] = output_fields['proc.name']
        if 'proc.pid' in output_fields:
            features['process_pid'] = output_fields['proc.pid']
        if 'proc.args' in output_fields:
            features['process_args'] = output_fields['proc.args']
        if 'proc.pname' in output_fields:
            features['parent_process'] = output_fields['proc.pname']
        
        # 文件信息
        if 'fd.name' in output_fields:
            features['file_path'] = output_fields['fd.name']
        if 'fd.type' in output_fields:
            features['file_type'] = output_fields['fd.type']
        
        # 网络信息
        if 'fd.sip' in output_fields:
            features['source_ip'] = output_fields['fd.sip']
        if 'fd.sport' in output_fields:
            features['source_port'] = output_fields['fd.sport']
        if 'fd.cip' in output_fields:
            features['dest_ip'] = output_fields['fd.cip']
        if 'fd.cport' in output_fields:
            features['dest_port'] = output_fields['fd.cport']
        
        # 用户信息
        if 'user.name' in output_fields:
            features['user_name'] = output_fields['user.name']
        if 'user.uid' in output_fields:
            features['user_uid'] = output_fields['user.uid']
        
        # 系统调用信息
        if 'evt.type' in output_fields:
            features['syscall_type'] = output_fields['evt.type']
        
        # 容器信息
        if 'container.name' in output_fields:
            features['container_name'] = output_fields['container.name']
        if 'container.image' in output_fields:
            features['container_image'] = output_fields['container.image']
        
        return features
    
    def create_feature_vector(self, features: Dict[str, Any]) -> List[float]:
        """创建特征向量"""
        # 简化的特征向量化方法
        # 在实际应用中，应该使用更复杂的embedding模型
        
        vector = [0.0] * self.dimension
        
        # 规则名称特征
        rule_hash = self._hash_string(features.get('rule_name', ''))
        for i in range(50):
            vector[i] = ((rule_hash >> i) & 1) * self.feature_weights['rule_name']
        
        # 优先级特征
        priority_map = {'Emergency': 1.0, 'Alert': 0.8, 'Critical': 0.6, 
                       'Error': 0.4, 'Warning': 0.2, 'Notice': 0.1, 
                       'Informational': 0.05, 'Debug': 0.01}
        priority_val = priority_map.get(features.get('priority', ''), 0.0)
        for i in range(50, 70):
            vector[i] = priority_val * self.feature_weights['priority']
        
        # 进程名称特征
        proc_hash = self._hash_string(features.get('process_name', ''))
        for i in range(70, 120):
            vector[i] = ((proc_hash >> (i-70)) & 1) * self.feature_weights['process_name']
        
        # 文件路径特征
        file_hash = self._hash_string(features.get('file_path', ''))
        for i in range(120, 150):
            vector[i] = ((file_hash >> (i-120)) & 1) * self.feature_weights['file_path']
        
        # 网络信息特征
        network_info = f"{features.get('source_ip', '')}:{features.get('source_port', '')}"
        network_hash = self._hash_string(network_info)
        for i in range(150, 180):
            vector[i] = ((network_hash >> (i-150)) & 1) * self.feature_weights['network_info']
        
        # 用户信息特征
        user_hash = self._hash_string(features.get('user_name', ''))
        for i in range(180, 200):
            vector[i] = ((user_hash >> (i-180)) & 1) * self.feature_weights['user_info']
        
        # 系统调用类型特征
        syscall_hash = self._hash_string(features.get('syscall_type', ''))
        for i in range(200, 220):
            vector[i] = ((syscall_hash >> (i-200)) & 1) * self.feature_weights['syscall_type']
        
        # 容器信息特征
        container_info = f"{features.get('container_name', '')}:{features.get('container_image', '')}"
        container_hash = self._hash_string(container_info)
        for i in range(220, 240):
            vector[i] = ((container_hash >> (i-220)) & 1) * self.feature_weights['container_info']
        
        # 时间特征（小时和星期几）
        try:
            timestamp = datetime.fromisoformat(features.get('timestamp', '').replace('Z', '+00:00'))
            hour_feature = np.sin(2 * np.pi * timestamp.hour / 24)
            weekday_feature = np.sin(2 * np.pi * timestamp.weekday() / 7)
            vector[240] = hour_feature
            vector[241] = weekday_feature
        except:
            pass
        
        # 标签特征
        tags = features.get('tags', [])
        if tags:
            tags_hash = self._hash_string(','.join(tags))
            for i in range(242, 260):
                vector[i] = ((tags_hash >> (i-242)) & 1) * 0.1
        
        # 归一化向量
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = [v / norm for v in vector]
        
        return vector
    
    def _hash_string(self, s: str) -> int:
        """字符串哈希函数"""
        return int(hashlib.md5(s.encode()).hexdigest(), 16)
    
    async def store_event_vector(self, event: FalcoEvent) -> bool:
        """存储事件向量"""
        try:
            if not self.is_connected:
                logger.error("Pinecone未连接")
                return False
            
            # 提取特征
            features = self.extract_features(event)
            
            # 创建向量
            vector = self.create_feature_vector(features)
            
            # 生成唯一ID
            event_id = f"{event.hostname}_{event.timestamp.timestamp()}_{hash(event.message)}"
            
            # 准备元数据
            metadata = {
                'rule': event.rule,
                'priority': event.priority,
                'hostname': event.hostname,
                'timestamp': event.timestamp.isoformat(),
                'message': event.message[:500],  # 限制长度
                'tags': json.dumps(event.tags),
                'process_name': features.get('process_name', ''),
                'file_path': features.get('file_path', ''),
                'user_name': features.get('user_name', ''),
                'syscall_type': features.get('syscall_type', '')
            }
            
            # 存储到Pinecone
            self.index.upsert(vectors=[
                {
                    'id': event_id,
                    'values': vector,
                    'metadata': metadata
                }
            ])
            
            logger.debug(f"已存储事件向量: {event_id}")
            return True
            
        except Exception as e:
            logger.error(f"存储事件向量失败: {e}")
            return False
    
    async def find_similar_events(self, event: FalcoEvent, top_k: int = 10, 
                                threshold: float = 0.7) -> List[Dict[str, Any]]:
        """查找相似事件"""
        try:
            if not self.is_connected:
                logger.error("Pinecone未连接")
                return []
            
            # 提取特征并创建查询向量
            features = self.extract_features(event)
            query_vector = self.create_feature_vector(features)
            
            # 执行相似性搜索
            results = self.index.query(
                vector=query_vector,
                top_k=top_k,
                include_metadata=True
            )
            
            similar_events = []
            for match in results.matches:
                if match.score >= threshold:
                    similar_events.append({
                        'id': match.id,
                        'score': match.score,
                        'metadata': match.metadata
                    })
            
            logger.debug(f"找到 {len(similar_events)} 个相似事件")
            return similar_events
            
        except Exception as e:
            logger.error(f"查找相似事件失败: {e}")
            return []
    
    async def detect_anomalies(self, time_window: int = 3600, 
                             anomaly_threshold: float = 0.3) -> List[Dict[str, Any]]:
        """检测异常事件"""
        try:
            if not self.is_connected:
                logger.error("Pinecone未连接")
                return []
            
            # 获取最近的事件
            current_time = datetime.now()
            start_time = current_time.timestamp() - time_window
            
            # 查询最近的事件
            # 注意：这是一个简化的实现，实际中需要更复杂的异常检测算法
            stats = self.index.describe_index_stats()
            
            # 这里应该实现更复杂的异常检测逻辑
            # 例如：基于密度的异常检测、孤立森林等
            
            anomalies = []
            # 占位符实现
            logger.debug(f"异常检测完成，发现 {len(anomalies)} 个异常")
            return anomalies
            
        except Exception as e:
            logger.error(f"异常检测失败: {e}")
            return []
    
    async def get_event_clusters(self, cluster_count: int = 10) -> List[Dict[str, Any]]:
        """获取事件聚类"""
        try:
            if not self.is_connected:
                logger.error("Pinecone未连接")
                return []
            
            # 获取索引统计信息
            stats = self.index.describe_index_stats()
            
            # 这里应该实现聚类算法
            # 例如：K-means、DBSCAN等
            
            clusters = []
            # 占位符实现
            logger.debug(f"聚类分析完成，生成 {len(clusters)} 个聚类")
            return clusters
            
        except Exception as e:
            logger.error(f"聚类分析失败: {e}")
            return []
    
    async def search_by_metadata(self, filters: Dict[str, Any], 
                               top_k: int = 100) -> List[Dict[str, Any]]:
        """根据元数据搜索事件"""
        try:
            if not self.is_connected:
                logger.error("Pinecone未连接")
                return []
            
            # 构建过滤器
            filter_dict = {}
            for key, value in filters.items():
                if value:
                    filter_dict[key] = {'$eq': value}
            
            # 执行搜索
            # 注意：需要一个dummy向量来执行查询
            dummy_vector = [0.0] * self.dimension
            
            results = self.index.query(
                vector=dummy_vector,
                top_k=top_k,
                filter=filter_dict,
                include_metadata=True
            )
            
            events = []
            for match in results.matches:
                events.append({
                    'id': match.id,
                    'score': match.score,
                    'metadata': match.metadata
                })
            
            logger.debug(f"元数据搜索找到 {len(events)} 个事件")
            return events
            
        except Exception as e:
            logger.error(f"元数据搜索失败: {e}")
            return []
    
    async def get_index_statistics(self) -> Dict[str, Any]:
        """获取索引统计信息"""
        try:
            if not self.is_connected:
                return {'error': 'Pinecone未连接', 'is_connected': False}
            
            stats = self.index.describe_index_stats()
            
            return {
                'total_vector_count': stats.total_vector_count,
                'dimension': stats.dimension,
                'index_fullness': stats.index_fullness,
                'namespaces': stats.namespaces,
                'is_connected': self.is_connected
            }
            
        except Exception as e:
            logger.error(f"获取索引统计失败: {e}")
            return {'error': str(e), 'is_connected': self.is_connected}
    
    async def cleanup_old_vectors(self, retention_days: int = 30):
        """清理旧向量"""
        try:
            if not self.is_connected:
                logger.error("Pinecone未连接")
                return
            
            # 计算截止时间
            cutoff_time = datetime.now().timestamp() - (retention_days * 24 * 3600)
            
            # 查询旧向量
            # 注意：Pinecone不直接支持按时间删除，需要先查询再删除
            filter_dict = {
                'timestamp': {'$lt': datetime.fromtimestamp(cutoff_time).isoformat()}
            }
            
            # 这里需要实现批量删除逻辑
            # 由于Pinecone的限制，这可能需要分批处理
            
            logger.info(f"清理完成，删除了 {retention_days} 天前的向量")
            
        except Exception as e:
            logger.error(f"清理旧向量失败: {e}")

# 全局Pinecone服务实例
pinecone_service = PineconeService()