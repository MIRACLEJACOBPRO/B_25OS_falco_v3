#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 向量检索与RAG服务

该模块实现了基于向量数据库的检索增强生成(RAG)功能，
包括智能检索、上下文构建、答案生成和知识问答等核心功能。

作者: Falco AI Security Team
版本: 1.0.0
创建时间: 2024-01-20
"""

from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import logging
import json
import re
import asyncio
from concurrent.futures import ThreadPoolExecutor

import openai
from pinecone import Pinecone

from .knowledge_embedding import KnowledgeEmbedding, SearchResult, DocumentType

logger = logging.getLogger(__name__)


class QueryType(Enum):
    """查询类型"""
    SECURITY_ANALYSIS = "security_analysis"
    THREAT_DETECTION = "threat_detection"
    INCIDENT_RESPONSE = "incident_response"
    POLICY_GUIDANCE = "policy_guidance"
    TECHNICAL_SUPPORT = "technical_support"
    GENERAL_QUESTION = "general_question"
    RULE_EXPLANATION = "rule_explanation"
    ALERT_INVESTIGATION = "alert_investigation"


class RetrievalStrategy(Enum):
    """检索策略"""
    SIMILARITY_ONLY = "similarity_only"  # 仅相似性
    HYBRID_SEARCH = "hybrid_search"      # 混合搜索
    SEMANTIC_RERANK = "semantic_rerank"  # 语义重排
    CONTEXTUAL_FILTER = "contextual_filter"  # 上下文过滤


@dataclass
class QueryContext:
    """查询上下文"""
    user_id: str
    session_id: str
    query_type: QueryType
    priority: int = 1  # 1-5, 5为最高优先级
    language: str = "zh-CN"
    domain: str = "security"  # 领域
    previous_queries: List[str] = field(default_factory=list)
    user_role: str = "analyst"  # 用户角色
    access_level: int = 1  # 访问级别
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "user_id": self.user_id,
            "session_id": self.session_id,
            "query_type": self.query_type.value,
            "priority": self.priority,
            "language": self.language,
            "domain": self.domain,
            "previous_queries": self.previous_queries,
            "user_role": self.user_role,
            "access_level": self.access_level
        }


@dataclass
class RetrievalConfig:
    """检索配置"""
    top_k: int = 10
    similarity_threshold: float = 0.7
    max_context_length: int = 4000
    strategy: RetrievalStrategy = RetrievalStrategy.SIMILARITY_ONLY
    enable_rerank: bool = True
    filter_by_type: Optional[List[DocumentType]] = None
    filter_by_priority: Optional[int] = None
    include_metadata: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "top_k": self.top_k,
            "similarity_threshold": self.similarity_threshold,
            "max_context_length": self.max_context_length,
            "strategy": self.strategy.value,
            "enable_rerank": self.enable_rerank,
            "filter_by_type": [t.value for t in self.filter_by_type] if self.filter_by_type else None,
            "filter_by_priority": self.filter_by_priority,
            "include_metadata": self.include_metadata
        }


@dataclass
class RAGResponse:
    """RAG响应"""
    success: bool
    answer: str
    confidence: float
    sources: List[SearchResult]
    context_used: str
    query_type: QueryType
    processing_time: float
    token_usage: Dict[str, int] = field(default_factory=dict)
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "success": self.success,
            "answer": self.answer,
            "confidence": self.confidence,
            "sources": [source.to_dict() for source in self.sources],
            "context_used": self.context_used,
            "query_type": self.query_type.value,
            "processing_time": self.processing_time,
            "token_usage": self.token_usage,
            "error_message": self.error_message
        }


class VectorRetrieval:
    """向量检索与RAG服务"""
    
    def __init__(self, 
                 knowledge_embedding: KnowledgeEmbedding,
                 openai_client: openai.OpenAI,
                 default_model: str = "gpt-4"):
        """
        初始化向量检索服务
        
        Args:
            knowledge_embedding: 知识嵌入服务
            openai_client: OpenAI客户端
            default_model: 默认模型
        """
        self.knowledge_embedding = knowledge_embedding
        self.openai_client = openai_client
        self.default_model = default_model
        
        # 线程池
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # 提示模板
        self.prompt_templates = self._init_prompt_templates()
        
        logger.info(f"向量检索服务已初始化，模型: {default_model}")
    
    def close(self):
        """关闭服务"""
        if self.executor:
            self.executor.shutdown(wait=True)
        logger.info("向量检索服务已关闭")
    
    def _init_prompt_templates(self) -> Dict[str, str]:
        """初始化提示模板"""
        return {
            "security_analysis": """
你是一个专业的网络安全分析师。基于以下知识库内容，请对用户的安全问题进行详细分析。

知识库内容：
{context}

用户问题：{query}

请提供：
1. 问题的详细分析
2. 可能的安全风险
3. 建议的应对措施
4. 相关的安全最佳实践

回答应该专业、准确且具有可操作性。
""",
            
            "threat_detection": """
你是一个威胁检测专家。基于以下安全知识，请分析用户描述的威胁情况。

相关知识：
{context}

威胁描述：{query}

请提供：
1. 威胁类型识别
2. 威胁等级评估
3. 攻击向量分析
4. 检测和防护建议
5. 应急响应步骤

回答要简洁明了，重点突出关键信息。
""",
            
            "incident_response": """
你是一个事件响应专家。基于以下应急响应知识，请为用户提供处理指导。

应急知识：
{context}

事件描述：{query}

请提供：
1. 事件严重性评估
2. 立即响应步骤
3. 调查和取证指导
4. 恢复和修复建议
5. 预防措施

回答要条理清晰，步骤明确。
""",
            
            "policy_guidance": """
你是一个安全政策顾问。基于以下政策文档，请为用户提供政策指导。

政策文档：
{context}

用户咨询：{query}

请提供：
1. 相关政策条款
2. 合规要求说明
3. 实施建议
4. 注意事项

回答要准确引用政策条款，提供实用的实施指导。
""",
            
            "technical_support": """
你是一个技术支持专家。基于以下技术文档，请为用户提供技术支持。

技术文档：
{context}

技术问题：{query}

请提供：
1. 问题诊断
2. 解决方案
3. 配置示例
4. 故障排除步骤

回答要技术准确，提供具体的操作指导。
""",
            
            "general_question": """
你是一个安全知识助手。基于以下相关知识，请回答用户的问题。

相关知识：
{context}

用户问题：{query}

请提供准确、有用的回答，如果知识库中没有相关信息，请诚实说明。
""",
            
            "rule_explanation": """
你是一个安全规则专家。基于以下规则文档，请解释相关的安全规则。

规则文档：
{context}

规则询问：{query}

请提供：
1. 规则的详细解释
2. 触发条件说明
3. 检测逻辑分析
4. 配置和调优建议

回答要深入浅出，便于理解。
""",
            
            "alert_investigation": """
你是一个告警调查专家。基于以下知识库，请协助用户调查安全告警。

相关知识：
{context}

告警信息：{query}

请提供：
1. 告警原因分析
2. 风险评估
3. 调查步骤
4. 处置建议
5. 误报判断

回答要逻辑清晰，提供可执行的调查方案。
"""
        }
    
    # ==================== 检索功能 ====================
    
    def retrieve_documents(self, 
                          query: str,
                          config: RetrievalConfig,
                          context: Optional[QueryContext] = None) -> List[SearchResult]:
        """
        检索相关文档
        
        Args:
            query: 查询文本
            config: 检索配置
            context: 查询上下文
            
        Returns:
            List[SearchResult]: 检索结果
        """
        try:
            # 构建过滤条件
            filter_dict = self._build_filter(config, context)
            
            # 执行检索
            results = self.knowledge_embedding.search_similar(
                query=query,
                top_k=config.top_k,
                filter_dict=filter_dict,
                include_metadata=config.include_metadata
            )
            
            # 过滤低相似度结果
            filtered_results = [
                result for result in results 
                if result.score >= config.similarity_threshold
            ]
            
            # 重排序（如果启用）
            if config.enable_rerank and len(filtered_results) > 1:
                filtered_results = self._rerank_results(query, filtered_results, context)
            
            logger.info(f"检索完成，返回 {len(filtered_results)} 个结果")
            return filtered_results
            
        except Exception as e:
            logger.error(f"文档检索失败: {e}")
            return []
    
    def _build_filter(self, 
                     config: RetrievalConfig, 
                     context: Optional[QueryContext] = None) -> Optional[Dict[str, Any]]:
        """
        构建过滤条件
        
        Args:
            config: 检索配置
            context: 查询上下文
            
        Returns:
            Optional[Dict[str, Any]]: 过滤条件
        """
        filter_dict = {}
        
        # 按文档类型过滤
        if config.filter_by_type:
            filter_dict["doc_type"] = {"$in": [t.value for t in config.filter_by_type]}
        
        # 按优先级过滤
        if config.filter_by_priority:
            filter_dict["priority"] = {"$gte": config.filter_by_priority}
        
        # 按用户访问级别过滤
        if context and context.access_level:
            filter_dict["access_level"] = {"$lte": context.access_level}
        
        # 按语言过滤
        if context and context.language:
            filter_dict["language"] = context.language
        
        return filter_dict if filter_dict else None
    
    def _rerank_results(self, 
                       query: str, 
                       results: List[SearchResult],
                       context: Optional[QueryContext] = None) -> List[SearchResult]:
        """
        重排序检索结果
        
        Args:
            query: 查询文本
            results: 原始结果
            context: 查询上下文
            
        Returns:
            List[SearchResult]: 重排序后的结果
        """
        try:
            # 简单的重排序策略：结合相似度分数和文档优先级
            def rerank_score(result: SearchResult) -> float:
                base_score = result.score
                
                # 文档优先级加权
                priority_weight = result.metadata.get('priority', 1) * 0.1
                
                # 文档类型加权
                type_weight = 0.0
                if context and context.query_type:
                    doc_type = result.metadata.get('doc_type', '')
                    if self._is_relevant_doc_type(context.query_type, doc_type):
                        type_weight = 0.2
                
                # 最近更新加权
                time_weight = 0.0
                created_at = result.metadata.get('created_at', '')
                if created_at:
                    try:
                        created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                        days_old = (datetime.utcnow() - created_time.replace(tzinfo=None)).days
                        time_weight = max(0, 0.1 - days_old * 0.001)  # 越新权重越高
                    except:
                        pass
                
                return base_score + priority_weight + type_weight + time_weight
            
            # 重新排序
            results.sort(key=rerank_score, reverse=True)
            
            return results
            
        except Exception as e:
            logger.error(f"重排序失败: {e}")
            return results
    
    def _is_relevant_doc_type(self, query_type: QueryType, doc_type: str) -> bool:
        """
        判断文档类型是否与查询类型相关
        
        Args:
            query_type: 查询类型
            doc_type: 文档类型
            
        Returns:
            bool: 是否相关
        """
        relevance_map = {
            QueryType.SECURITY_ANALYSIS: ["security_rule", "threat_intel", "knowledge_base"],
            QueryType.THREAT_DETECTION: ["threat_intel", "security_rule", "alert_template"],
            QueryType.INCIDENT_RESPONSE: ["incident_report", "playbook", "policy_doc"],
            QueryType.POLICY_GUIDANCE: ["policy_doc", "knowledge_base"],
            QueryType.TECHNICAL_SUPPORT: ["technical_doc", "knowledge_base"],
            QueryType.RULE_EXPLANATION: ["security_rule", "technical_doc"],
            QueryType.ALERT_INVESTIGATION: ["alert_template", "playbook", "threat_intel"]
        }
        
        relevant_types = relevance_map.get(query_type, [])
        return doc_type in relevant_types
    
    # ==================== 上下文构建 ====================
    
    def build_context(self, 
                     results: List[SearchResult],
                     max_length: int = 4000) -> str:
        """
        构建上下文
        
        Args:
            results: 检索结果
            max_length: 最大长度
            
        Returns:
            str: 构建的上下文
        """
        if not results:
            return "没有找到相关的知识库内容。"
        
        context_parts = []
        current_length = 0
        
        for i, result in enumerate(results):
            # 构建单个文档的上下文
            doc_context = f"""文档 {i+1}:
标题: {result.metadata.get('title', '未知')}
来源: {result.metadata.get('source', '未知')}
类型: {result.metadata.get('doc_type', '未知')}
相似度: {result.score:.3f}

内容:
{result.content}

---
"""
            
            # 检查长度限制
            if current_length + len(doc_context) > max_length:
                if current_length == 0:  # 如果第一个文档就超长，截断它
                    available_length = max_length - 200  # 保留一些空间给标题等
                    truncated_content = result.content[:available_length] + "..."
                    doc_context = f"""文档 1:
标题: {result.metadata.get('title', '未知')}
来源: {result.metadata.get('source', '未知')}
类型: {result.metadata.get('doc_type', '未知')}
相似度: {result.score:.3f}

内容:
{truncated_content}

---
"""
                    context_parts.append(doc_context)
                break
            
            context_parts.append(doc_context)
            current_length += len(doc_context)
        
        return "\n".join(context_parts)
    
    # ==================== RAG问答 ====================
    
    def answer_question(self, 
                       query: str,
                       query_type: QueryType = QueryType.GENERAL_QUESTION,
                       config: Optional[RetrievalConfig] = None,
                       context: Optional[QueryContext] = None,
                       model: Optional[str] = None) -> RAGResponse:
        """
        回答问题（RAG）
        
        Args:
            query: 用户问题
            query_type: 查询类型
            config: 检索配置
            context: 查询上下文
            model: 使用的模型
            
        Returns:
            RAGResponse: RAG响应
        """
        start_time = datetime.utcnow()
        
        try:
            # 使用默认配置
            if config is None:
                config = RetrievalConfig()
            
            # 使用默认模型
            if model is None:
                model = self.default_model
            
            # 1. 检索相关文档
            results = self.retrieve_documents(query, config, context)
            
            if not results:
                return RAGResponse(
                    success=False,
                    answer="抱歉，我在知识库中没有找到相关信息来回答您的问题。",
                    confidence=0.0,
                    sources=[],
                    context_used="",
                    query_type=query_type,
                    processing_time=(datetime.utcnow() - start_time).total_seconds(),
                    error_message="未找到相关文档"
                )
            
            # 2. 构建上下文
            context_text = self.build_context(results, config.max_context_length)
            
            # 3. 选择提示模板
            template = self.prompt_templates.get(query_type.value, self.prompt_templates["general_question"])
            
            # 4. 构建完整提示
            prompt = template.format(context=context_text, query=query)
            
            # 5. 调用LLM生成答案
            response = self.openai_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "你是一个专业的安全知识助手，请基于提供的知识库内容回答用户问题。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=2000
            )
            
            answer = response.choices[0].message.content
            
            # 6. 计算置信度
            confidence = self._calculate_confidence(results, answer)
            
            # 7. 记录token使用量
            token_usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            return RAGResponse(
                success=True,
                answer=answer,
                confidence=confidence,
                sources=results,
                context_used=context_text,
                query_type=query_type,
                processing_time=processing_time,
                token_usage=token_usage
            )
            
        except Exception as e:
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"RAG问答失败: {e}")
            
            return RAGResponse(
                success=False,
                answer=f"抱歉，处理您的问题时出现错误: {str(e)}",
                confidence=0.0,
                sources=[],
                context_used="",
                query_type=query_type,
                processing_time=processing_time,
                error_message=str(e)
            )
    
    def _calculate_confidence(self, results: List[SearchResult], answer: str) -> float:
        """
        计算回答置信度
        
        Args:
            results: 检索结果
            answer: 生成的答案
            
        Returns:
            float: 置信度分数 (0-1)
        """
        if not results:
            return 0.0
        
        # 基于检索结果的平均相似度
        avg_similarity = sum(result.score for result in results) / len(results)
        
        # 基于结果数量的置信度
        count_confidence = min(len(results) / 5.0, 1.0)  # 5个结果为满分
        
        # 基于答案长度的置信度（避免过短的回答）
        length_confidence = min(len(answer) / 200.0, 1.0)  # 200字符为满分
        
        # 综合置信度
        confidence = (avg_similarity * 0.5 + count_confidence * 0.3 + length_confidence * 0.2)
        
        return min(confidence, 1.0)
    
    # ==================== 批量处理 ====================
    
    def batch_answer_questions(self, 
                              queries: List[Tuple[str, QueryType]],
                              config: Optional[RetrievalConfig] = None,
                              context: Optional[QueryContext] = None) -> List[RAGResponse]:
        """
        批量回答问题
        
        Args:
            queries: 问题列表 [(问题, 类型), ...]
            config: 检索配置
            context: 查询上下文
            
        Returns:
            List[RAGResponse]: 回答列表
        """
        responses = []
        
        for query, query_type in queries:
            try:
                response = self.answer_question(query, query_type, config, context)
                responses.append(response)
                
                logger.info(f"批量问答进度: {len(responses)}/{len(queries)}")
                
            except Exception as e:
                logger.error(f"批量问答失败: {e}")
                
                error_response = RAGResponse(
                    success=False,
                    answer=f"处理问题时出现错误: {str(e)}",
                    confidence=0.0,
                    sources=[],
                    context_used="",
                    query_type=query_type,
                    processing_time=0.0,
                    error_message=str(e)
                )
                responses.append(error_response)
        
        return responses
    
    # ==================== 智能推荐 ====================
    
    def suggest_related_questions(self, 
                                 query: str,
                                 context: Optional[QueryContext] = None,
                                 max_suggestions: int = 5) -> List[str]:
        """
        推荐相关问题
        
        Args:
            query: 原始查询
            context: 查询上下文
            max_suggestions: 最大推荐数量
            
        Returns:
            List[str]: 推荐问题列表
        """
        try:
            # 检索相关文档
            config = RetrievalConfig(top_k=20)
            results = self.retrieve_documents(query, config, context)
            
            if not results:
                return []
            
            # 基于检索结果生成相关问题
            context_text = self.build_context(results[:5], 2000)
            
            prompt = f"""
基于以下知识库内容和用户的原始问题，请生成 {max_suggestions} 个相关的问题建议。

原始问题：{query}

知识库内容：
{context_text}

请生成与原始问题相关但角度不同的问题，每个问题一行，不要编号：
"""
            
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "你是一个问题推荐助手，请生成相关但不重复的问题建议。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            suggestions_text = response.choices[0].message.content
            suggestions = [line.strip() for line in suggestions_text.split('\n') if line.strip()]
            
            return suggestions[:max_suggestions]
            
        except Exception as e:
            logger.error(f"生成问题建议失败: {e}")
            return []
    
    # ==================== 统计和监控 ====================
    
    def get_retrieval_stats(self) -> Dict[str, Any]:
        """
        获取检索统计信息
        
        Returns:
            Dict[str, Any]: 统计信息
        """
        try:
            # 获取知识库统计
            kb_stats = self.knowledge_embedding.get_index_stats()
            
            return {
                "knowledge_base_stats": kb_stats,
                "available_query_types": [qt.value for qt in QueryType],
                "available_strategies": [rs.value for rs in RetrievalStrategy],
                "default_model": self.default_model,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"获取检索统计失败: {e}")
            return {"error": str(e)}
    
    def health_check(self) -> Dict[str, Any]:
        """
        健康检查
        
        Returns:
            Dict[str, Any]: 健康状态
        """
        try:
            # 检查知识嵌入服务
            kb_health = self.knowledge_embedding.health_check()
            
            # 检查OpenAI连接
            try:
                test_response = self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": "test"}],
                    max_tokens=1
                )
                openai_status = "healthy"
            except:
                openai_status = "unhealthy"
            
            overall_status = "healthy" if kb_health.get("status") == "healthy" and openai_status == "healthy" else "unhealthy"
            
            return {
                "status": overall_status,
                "knowledge_base_status": kb_health.get("status", "unknown"),
                "openai_status": openai_status,
                "default_model": self.default_model,
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