#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 知识文档嵌入服务

该模块实现了安全知识文档的向量化嵌入功能，包括文档处理、
向量生成、Pinecone存储和相似性检索等核心功能。

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
import hashlib
import re
import asyncio
from concurrent.futures import ThreadPoolExecutor

import openai
from pinecone import Pinecone, Index
import tiktoken
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import TextLoader, PDFLoader, JSONLoader
from langchain.schema import Document

logger = logging.getLogger(__name__)


class DocumentType(Enum):
    """文档类型"""
    SECURITY_RULE = "security_rule"
    THREAT_INTEL = "threat_intel"
    INCIDENT_REPORT = "incident_report"
    KNOWLEDGE_BASE = "knowledge_base"
    POLICY_DOC = "policy_doc"
    TECHNICAL_DOC = "technical_doc"
    ALERT_TEMPLATE = "alert_template"
    PLAYBOOK = "playbook"


class EmbeddingModel(Enum):
    """嵌入模型"""
    TEXT_EMBEDDING_ADA_002 = "text-embedding-ada-002"
    TEXT_EMBEDDING_3_SMALL = "text-embedding-3-small"
    TEXT_EMBEDDING_3_LARGE = "text-embedding-3-large"


@dataclass
class DocumentMetadata:
    """文档元数据"""
    doc_id: str
    title: str
    doc_type: DocumentType
    source: str
    author: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    version: str = "1.0"
    tags: List[str] = field(default_factory=list)
    language: str = "zh-CN"
    priority: int = 1  # 1-5, 5为最高优先级
    category: str = ""
    keywords: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "doc_id": self.doc_id,
            "title": self.title,
            "doc_type": self.doc_type.value,
            "source": self.source,
            "author": self.author,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "version": self.version,
            "tags": self.tags,
            "language": self.language,
            "priority": self.priority,
            "category": self.category,
            "keywords": self.keywords
        }


@dataclass
class DocumentChunk:
    """文档块"""
    chunk_id: str
    doc_id: str
    content: str
    chunk_index: int
    start_char: int
    end_char: int
    token_count: int
    embedding: Optional[List[float]] = None
    metadata: Optional[DocumentMetadata] = None
    
    @property
    def content_hash(self) -> str:
        """内容哈希"""
        return hashlib.md5(self.content.encode('utf-8')).hexdigest()


@dataclass
class EmbeddingResult:
    """嵌入结果"""
    success: bool
    message: str
    doc_id: str
    chunks_processed: int = 0
    vectors_stored: int = 0
    processing_time: float = 0.0
    error_details: Optional[str] = None


@dataclass
class SearchResult:
    """搜索结果"""
    chunk_id: str
    doc_id: str
    content: str
    score: float
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "chunk_id": self.chunk_id,
            "doc_id": self.doc_id,
            "content": self.content,
            "score": self.score,
            "metadata": self.metadata
        }


class KnowledgeEmbedding:
    """知识文档嵌入服务"""
    
    def __init__(self, 
                 openai_client: openai.OpenAI,
                 pinecone_client: Pinecone,
                 index_name: str,
                 embedding_model: EmbeddingModel = EmbeddingModel.TEXT_EMBEDDING_ADA_002):
        """
        初始化知识嵌入服务
        
        Args:
            openai_client: OpenAI客户端
            pinecone_client: Pinecone客户端
            index_name: Pinecone索引名称
            embedding_model: 嵌入模型
        """
        self.openai_client = openai_client
        self.pinecone_client = pinecone_client
        self.index_name = index_name
        self.embedding_model = embedding_model
        
        # 初始化Pinecone索引
        try:
            self.index = self.pinecone_client.Index(index_name)
            logger.info(f"连接到Pinecone索引: {index_name}")
        except Exception as e:
            logger.error(f"连接Pinecone索引失败: {e}")
            self.index = None
        
        # 初始化文本分割器
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", "。", "！", "？", ";", ":", " ", ""]
        )
        
        # 初始化tokenizer
        try:
            self.tokenizer = tiktoken.encoding_for_model("gpt-3.5-turbo")
        except:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        
        # 线程池
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        logger.info(f"知识嵌入服务已初始化，模型: {embedding_model.value}")
    
    def close(self):
        """关闭服务"""
        if self.executor:
            self.executor.shutdown(wait=True)
        logger.info("知识嵌入服务已关闭")
    
    # ==================== 文档处理 ====================
    
    def load_document(self, file_path: str, doc_type: DocumentType, metadata: DocumentMetadata) -> List[Document]:
        """
        加载文档
        
        Args:
            file_path: 文件路径
            doc_type: 文档类型
            metadata: 文档元数据
            
        Returns:
            List[Document]: 文档列表
        """
        try:
            if file_path.endswith('.txt'):
                loader = TextLoader(file_path, encoding='utf-8')
            elif file_path.endswith('.pdf'):
                loader = PDFLoader(file_path)
            elif file_path.endswith('.json'):
                loader = JSONLoader(file_path, jq_schema='.content')
            else:
                raise ValueError(f"不支持的文件类型: {file_path}")
            
            documents = loader.load()
            
            # 添加元数据
            for doc in documents:
                doc.metadata.update(metadata.to_dict())
            
            logger.info(f"加载文档成功: {file_path}, 共 {len(documents)} 个文档")
            return documents
            
        except Exception as e:
            logger.error(f"加载文档失败: {file_path}, 错误: {e}")
            return []
    
    def load_text_content(self, content: str, metadata: DocumentMetadata) -> Document:
        """
        加载文本内容
        
        Args:
            content: 文本内容
            metadata: 文档元数据
            
        Returns:
            Document: 文档对象
        """
        return Document(
            page_content=content,
            metadata=metadata.to_dict()
        )
    
    def split_document(self, document: Document) -> List[DocumentChunk]:
        """
        分割文档
        
        Args:
            document: 文档对象
            
        Returns:
            List[DocumentChunk]: 文档块列表
        """
        try:
            # 使用文本分割器分割文档
            chunks = self.text_splitter.split_documents([document])
            
            doc_chunks = []
            doc_id = document.metadata.get('doc_id', '')
            
            for i, chunk in enumerate(chunks):
                # 计算token数量
                token_count = len(self.tokenizer.encode(chunk.page_content))
                
                # 创建文档块
                chunk_id = f"{doc_id}_chunk_{i}"
                
                doc_chunk = DocumentChunk(
                    chunk_id=chunk_id,
                    doc_id=doc_id,
                    content=chunk.page_content,
                    chunk_index=i,
                    start_char=i * 800,  # 估算值
                    end_char=(i + 1) * 800,  # 估算值
                    token_count=token_count,
                    metadata=DocumentMetadata(**document.metadata) if document.metadata else None
                )
                
                doc_chunks.append(doc_chunk)
            
            logger.info(f"文档分割完成: {doc_id}, 共 {len(doc_chunks)} 个块")
            return doc_chunks
            
        except Exception as e:
            logger.error(f"文档分割失败: {e}")
            return []
    
    def preprocess_text(self, text: str) -> str:
        """
        预处理文本
        
        Args:
            text: 原始文本
            
        Returns:
            str: 处理后的文本
        """
        # 移除多余的空白字符
        text = re.sub(r'\s+', ' ', text)
        
        # 移除特殊字符（保留中文、英文、数字和基本标点）
        text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s.,!?;:()\[\]{}"\'-]', '', text)
        
        # 去除首尾空格
        text = text.strip()
        
        return text
    
    # ==================== 向量嵌入 ====================
    
    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        生成文本嵌入向量
        
        Args:
            text: 输入文本
            
        Returns:
            Optional[List[float]]: 嵌入向量
        """
        try:
            # 预处理文本
            processed_text = self.preprocess_text(text)
            
            if not processed_text:
                logger.warning("文本为空，跳过嵌入生成")
                return None
            
            # 调用OpenAI API生成嵌入
            response = self.openai_client.embeddings.create(
                model=self.embedding_model.value,
                input=processed_text
            )
            
            embedding = response.data[0].embedding
            
            logger.debug(f"生成嵌入向量成功，维度: {len(embedding)}")
            return embedding
            
        except Exception as e:
            logger.error(f"生成嵌入向量失败: {e}")
            return None
    
    def batch_generate_embeddings(self, texts: List[str], batch_size: int = 100) -> List[Optional[List[float]]]:
        """
        批量生成嵌入向量
        
        Args:
            texts: 文本列表
            batch_size: 批处理大小
            
        Returns:
            List[Optional[List[float]]]: 嵌入向量列表
        """
        embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            
            try:
                # 预处理文本
                processed_texts = [self.preprocess_text(text) for text in batch_texts]
                processed_texts = [text for text in processed_texts if text]  # 过滤空文本
                
                if not processed_texts:
                    embeddings.extend([None] * len(batch_texts))
                    continue
                
                # 批量调用OpenAI API
                response = self.openai_client.embeddings.create(
                    model=self.embedding_model.value,
                    input=processed_texts
                )
                
                batch_embeddings = [data.embedding for data in response.data]
                
                # 补齐None值
                result_embeddings = []
                processed_idx = 0
                
                for original_text in batch_texts:
                    if self.preprocess_text(original_text):
                        result_embeddings.append(batch_embeddings[processed_idx])
                        processed_idx += 1
                    else:
                        result_embeddings.append(None)
                
                embeddings.extend(result_embeddings)
                
                logger.info(f"批量生成嵌入完成: {i + len(batch_texts)}/{len(texts)}")
                
            except Exception as e:
                logger.error(f"批量生成嵌入失败: {e}")
                embeddings.extend([None] * len(batch_texts))
        
        return embeddings
    
    # ==================== Pinecone操作 ====================
    
    def store_embeddings(self, chunks: List[DocumentChunk]) -> EmbeddingResult:
        """
        存储嵌入向量到Pinecone
        
        Args:
            chunks: 文档块列表
            
        Returns:
            EmbeddingResult: 存储结果
        """
        start_time = datetime.utcnow()
        
        if not self.index:
            return EmbeddingResult(
                success=False,
                message="Pinecone索引未初始化",
                doc_id="",
                processing_time=(datetime.utcnow() - start_time).total_seconds()
            )
        
        try:
            vectors_to_upsert = []
            
            for chunk in chunks:
                if chunk.embedding is None:
                    logger.warning(f"块 {chunk.chunk_id} 没有嵌入向量，跳过")
                    continue
                
                # 准备向量数据
                vector_data = {
                    "id": chunk.chunk_id,
                    "values": chunk.embedding,
                    "metadata": {
                        "doc_id": chunk.doc_id,
                        "content": chunk.content[:1000],  # 限制内容长度
                        "chunk_index": chunk.chunk_index,
                        "token_count": chunk.token_count,
                        "content_hash": chunk.content_hash
                    }
                }
                
                # 添加文档元数据
                if chunk.metadata:
                    vector_data["metadata"].update({
                        "title": chunk.metadata.title,
                        "doc_type": chunk.metadata.doc_type.value,
                        "source": chunk.metadata.source,
                        "author": chunk.metadata.author,
                        "created_at": chunk.metadata.created_at,
                        "tags": ",".join(chunk.metadata.tags),
                        "priority": chunk.metadata.priority,
                        "category": chunk.metadata.category,
                        "keywords": ",".join(chunk.metadata.keywords)
                    })
                
                vectors_to_upsert.append(vector_data)
            
            if not vectors_to_upsert:
                return EmbeddingResult(
                    success=False,
                    message="没有有效的向量数据",
                    doc_id=chunks[0].doc_id if chunks else "",
                    processing_time=(datetime.utcnow() - start_time).total_seconds()
                )
            
            # 批量上传到Pinecone
            batch_size = 100
            total_upserted = 0
            
            for i in range(0, len(vectors_to_upsert), batch_size):
                batch = vectors_to_upsert[i:i + batch_size]
                
                upsert_response = self.index.upsert(vectors=batch)
                total_upserted += upsert_response.upserted_count
                
                logger.info(f"上传向量批次: {i + len(batch)}/{len(vectors_to_upsert)}")
            
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            return EmbeddingResult(
                success=True,
                message=f"成功存储 {total_upserted} 个向量",
                doc_id=chunks[0].doc_id if chunks else "",
                chunks_processed=len(chunks),
                vectors_stored=total_upserted,
                processing_time=processing_time
            )
            
        except Exception as e:
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"存储嵌入向量失败: {e}")
            
            return EmbeddingResult(
                success=False,
                message=f"存储失败: {str(e)}",
                doc_id=chunks[0].doc_id if chunks else "",
                processing_time=processing_time,
                error_details=str(e)
            )
    
    def search_similar(self, 
                      query: str, 
                      top_k: int = 10,
                      filter_dict: Optional[Dict[str, Any]] = None,
                      include_metadata: bool = True) -> List[SearchResult]:
        """
        搜索相似文档
        
        Args:
            query: 查询文本
            top_k: 返回结果数量
            filter_dict: 过滤条件
            include_metadata: 是否包含元数据
            
        Returns:
            List[SearchResult]: 搜索结果列表
        """
        if not self.index:
            logger.error("Pinecone索引未初始化")
            return []
        
        try:
            # 生成查询向量
            query_embedding = self.generate_embedding(query)
            
            if not query_embedding:
                logger.error("生成查询向量失败")
                return []
            
            # 执行相似性搜索
            search_response = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                filter=filter_dict,
                include_metadata=include_metadata
            )
            
            # 解析搜索结果
            results = []
            
            for match in search_response.matches:
                result = SearchResult(
                    chunk_id=match.id,
                    doc_id=match.metadata.get('doc_id', ''),
                    content=match.metadata.get('content', ''),
                    score=match.score,
                    metadata=match.metadata
                )
                results.append(result)
            
            logger.info(f"搜索完成，返回 {len(results)} 个结果")
            return results
            
        except Exception as e:
            logger.error(f"搜索相似文档失败: {e}")
            return []
    
    def delete_document(self, doc_id: str) -> bool:
        """
        删除文档的所有向量
        
        Args:
            doc_id: 文档ID
            
        Returns:
            bool: 是否成功
        """
        if not self.index:
            logger.error("Pinecone索引未初始化")
            return False
        
        try:
            # 查询文档的所有块
            query_response = self.index.query(
                vector=[0.0] * 1536,  # 占位向量
                top_k=10000,
                filter={"doc_id": doc_id},
                include_metadata=False
            )
            
            # 收集所有块ID
            chunk_ids = [match.id for match in query_response.matches]
            
            if not chunk_ids:
                logger.warning(f"未找到文档 {doc_id} 的向量")
                return True
            
            # 批量删除
            self.index.delete(ids=chunk_ids)
            
            logger.info(f"删除文档 {doc_id} 的 {len(chunk_ids)} 个向量")
            return True
            
        except Exception as e:
            logger.error(f"删除文档失败: {e}")
            return False
    
    # ==================== 完整流程 ====================
    
    def embed_document(self, 
                      content: str, 
                      metadata: DocumentMetadata,
                      store_vectors: bool = True) -> EmbeddingResult:
        """
        完整的文档嵌入流程
        
        Args:
            content: 文档内容
            metadata: 文档元数据
            store_vectors: 是否存储向量
            
        Returns:
            EmbeddingResult: 嵌入结果
        """
        start_time = datetime.utcnow()
        
        try:
            # 1. 加载文档
            document = self.load_text_content(content, metadata)
            
            # 2. 分割文档
            chunks = self.split_document(document)
            
            if not chunks:
                return EmbeddingResult(
                    success=False,
                    message="文档分割失败",
                    doc_id=metadata.doc_id,
                    processing_time=(datetime.utcnow() - start_time).total_seconds()
                )
            
            # 3. 生成嵌入向量
            texts = [chunk.content for chunk in chunks]
            embeddings = self.batch_generate_embeddings(texts)
            
            # 4. 将嵌入向量添加到块中
            valid_chunks = []
            for chunk, embedding in zip(chunks, embeddings):
                if embedding is not None:
                    chunk.embedding = embedding
                    valid_chunks.append(chunk)
            
            if not valid_chunks:
                return EmbeddingResult(
                    success=False,
                    message="生成嵌入向量失败",
                    doc_id=metadata.doc_id,
                    chunks_processed=len(chunks),
                    processing_time=(datetime.utcnow() - start_time).total_seconds()
                )
            
            # 5. 存储向量（可选）
            if store_vectors:
                return self.store_embeddings(valid_chunks)
            else:
                processing_time = (datetime.utcnow() - start_time).total_seconds()
                return EmbeddingResult(
                    success=True,
                    message=f"嵌入生成完成，共 {len(valid_chunks)} 个块",
                    doc_id=metadata.doc_id,
                    chunks_processed=len(valid_chunks),
                    processing_time=processing_time
                )
            
        except Exception as e:
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"文档嵌入失败: {e}")
            
            return EmbeddingResult(
                success=False,
                message=f"嵌入失败: {str(e)}",
                doc_id=metadata.doc_id,
                processing_time=processing_time,
                error_details=str(e)
            )
    
    def embed_file(self, 
                  file_path: str, 
                  doc_type: DocumentType,
                  metadata: DocumentMetadata,
                  store_vectors: bool = True) -> EmbeddingResult:
        """
        嵌入文件
        
        Args:
            file_path: 文件路径
            doc_type: 文档类型
            metadata: 文档元数据
            store_vectors: 是否存储向量
            
        Returns:
            EmbeddingResult: 嵌入结果
        """
        start_time = datetime.utcnow()
        
        try:
            # 加载文档
            documents = self.load_document(file_path, doc_type, metadata)
            
            if not documents:
                return EmbeddingResult(
                    success=False,
                    message=f"加载文件失败: {file_path}",
                    doc_id=metadata.doc_id,
                    processing_time=(datetime.utcnow() - start_time).total_seconds()
                )
            
            # 合并所有文档内容
            combined_content = "\n\n".join([doc.page_content for doc in documents])
            
            # 调用文档嵌入流程
            return self.embed_document(combined_content, metadata, store_vectors)
            
        except Exception as e:
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            logger.error(f"嵌入文件失败: {e}")
            
            return EmbeddingResult(
                success=False,
                message=f"嵌入文件失败: {str(e)}",
                doc_id=metadata.doc_id,
                processing_time=processing_time,
                error_details=str(e)
            )
    
    # ==================== 统计和管理 ====================
    
    def get_index_stats(self) -> Dict[str, Any]:
        """
        获取索引统计信息
        
        Returns:
            Dict[str, Any]: 统计信息
        """
        if not self.index:
            return {"error": "Pinecone索引未初始化"}
        
        try:
            stats = self.index.describe_index_stats()
            
            return {
                "total_vector_count": stats.total_vector_count,
                "dimension": stats.dimension,
                "index_fullness": stats.index_fullness,
                "namespaces": dict(stats.namespaces) if stats.namespaces else {}
            }
            
        except Exception as e:
            logger.error(f"获取索引统计失败: {e}")
            return {"error": str(e)}
    
    def health_check(self) -> Dict[str, Any]:
        """
        健康检查
        
        Returns:
            Dict[str, Any]: 健康状态
        """
        try:
            # 检查OpenAI连接
            test_embedding = self.generate_embedding("test")
            openai_status = "healthy" if test_embedding else "unhealthy"
            
            # 检查Pinecone连接
            pinecone_status = "healthy" if self.index else "unhealthy"
            
            if self.index:
                try:
                    stats = self.get_index_stats()
                    if "error" not in stats:
                        pinecone_status = "healthy"
                    else:
                        pinecone_status = "unhealthy"
                except:
                    pinecone_status = "unhealthy"
            
            overall_status = "healthy" if openai_status == "healthy" and pinecone_status == "healthy" else "unhealthy"
            
            return {
                "status": overall_status,
                "openai_status": openai_status,
                "pinecone_status": pinecone_status,
                "embedding_model": self.embedding_model.value,
                "index_name": self.index_name,
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