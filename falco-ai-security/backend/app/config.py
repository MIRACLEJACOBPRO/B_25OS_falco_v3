#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - Configuration
系统配置文件，包含所有环境变量和配置参数
"""

import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """应用配置类"""
    
    # 基础配置
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=True, env="DEBUG")
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8000, env="PORT")
    
    # 安全配置
    SECRET_KEY: str = Field(default="your-secret-key-here", env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # Neo4j数据库配置
    NEO4J_URI: str = Field(default="bolt://localhost:7687", env="NEO4J_URI")
    NEO4J_USER: str = Field(default="neo4j", env="NEO4J_USER")
    NEO4J_PASSWORD: str = Field(default="password", env="NEO4J_PASSWORD")
    NEO4J_DATABASE: str = Field(default="neo4j", env="NEO4J_DATABASE")
    
    # Pinecone向量数据库配置
    PINECONE_API_KEY: str = Field(default="pc-xxx", env="PINECONE_API_KEY")
    PINECONE_ENVIRONMENT: str = Field(default="us-east-1-aws", env="PINECONE_ENVIRONMENT")
    PINECONE_INDEX_NAME: str = Field(default="falco-knowledge", env="PINECONE_INDEX_NAME")
    PINECONE_DIMENSION: int = Field(default=1536, env="PINECONE_DIMENSION")
    
    # OpenAI配置
    OPENAI_API_KEY: str = Field(default="sk-xxx", env="OPENAI_API_KEY")
    OPENAI_MODEL: str = Field(default="gpt-4", env="OPENAI_MODEL")
    OPENAI_EMBEDDING_MODEL: str = Field(default="text-embedding-ada-002", env="OPENAI_EMBEDDING_MODEL")
    OPENAI_MAX_TOKENS: int = Field(default=2000, env="OPENAI_MAX_TOKENS")
    OPENAI_TEMPERATURE: float = Field(default=0.1, env="OPENAI_TEMPERATURE")
    
    # Falco配置
    FALCO_LOG_PATH: str = Field(default="/var/log/falco/falco.log", env="FALCO_LOG_PATH")
    FALCO_CONFIG_PATH: str = Field(default="/etc/falco/falco.yaml", env="FALCO_CONFIG_PATH")
    FALCO_RULES_PATH: str = Field(default="/etc/falco/falco_rules.yaml", env="FALCO_RULES_PATH")
    
    # 系统路径配置
    LOG_DIR: str = Field(default="/var/log/falco-ai-security", env="LOG_DIR")
    DATA_DIR: str = Field(default="/opt/falco-ai-security/data", env="DATA_DIR")
    SCRIPTS_DIR: str = Field(default="/opt/falco-ai-security/scripts", env="SCRIPTS_DIR")
    
    # AI分析配置
    AI_ANALYSIS_ENABLED: bool = Field(default=True, env="AI_ANALYSIS_ENABLED")
    AUTO_EXECUTION_ENABLED: bool = Field(default=False, env="AUTO_EXECUTION_ENABLED")
    RISK_THRESHOLD: float = Field(default=0.7, env="RISK_THRESHOLD")
    BATCH_SIZE: int = Field(default=10, env="BATCH_SIZE")
    
    # AI Agent配置
    AI_BATCH_SIZE: int = Field(default=10, env="AI_BATCH_SIZE")
    AI_ANALYSIS_INTERVAL: int = Field(default=30, env="AI_ANALYSIS_INTERVAL")
    AI_SIMILARITY_THRESHOLD: float = Field(default=0.8, env="AI_SIMILARITY_THRESHOLD")
    AI_RISK_THRESHOLD: float = Field(default=0.7, env="AI_RISK_THRESHOLD")
    
    # 监控配置
    MONITOR_INTERVAL: int = Field(default=5, env="MONITOR_INTERVAL")  # 秒
    LOG_RETENTION_DAYS: int = Field(default=30, env="LOG_RETENTION_DAYS")
    ALERT_COOLDOWN: int = Field(default=300, env="ALERT_COOLDOWN")  # 秒
    
    # Redis配置（用于缓存和队列）
    REDIS_URL: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    REDIS_PASSWORD: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    
    # 邮件通知配置
    SMTP_SERVER: Optional[str] = Field(default=None, env="SMTP_SERVER")
    SMTP_PORT: int = Field(default=587, env="SMTP_PORT")
    SMTP_USERNAME: Optional[str] = Field(default=None, env="SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = Field(default=None, env="SMTP_PASSWORD")
    ALERT_EMAIL: Optional[str] = Field(default=None, env="ALERT_EMAIL")
    
    # Web界面配置
    FRONTEND_URL: str = Field(default="http://localhost:3000", env="FRONTEND_URL")
    API_PREFIX: str = Field(default="/api/v1", env="API_PREFIX")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

# 创建全局配置实例
settings = Settings()

# 配置验证函数
def validate_config():
    """验证配置的有效性"""
    errors = []
    
    # 检查必需的API密钥
    if settings.OPENAI_API_KEY == "sk-xxx":
        errors.append("OpenAI API Key未配置")
    
    if settings.PINECONE_API_KEY == "pc-xxx":
        errors.append("Pinecone API Key未配置")
    
    # 检查路径是否存在
    if not os.path.exists(os.path.dirname(settings.FALCO_LOG_PATH)):
        errors.append(f"Falco日志目录不存在: {os.path.dirname(settings.FALCO_LOG_PATH)}")
    
    if errors:
        raise ValueError(f"配置验证失败: {'; '.join(errors)}")
    
    return True

# 获取数据库连接字符串
def get_neo4j_uri():
    """获取Neo4j连接URI"""
    return settings.NEO4J_URI

def get_redis_url():
    """获取Redis连接URL"""
    return settings.REDIS_URL

# 日志配置
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        },
        "detailed": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(module)s - %(funcName)s - %(message)s",
        },
    },
    "handlers": {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "formatter": "detailed",
            "class": "logging.FileHandler",
            "filename": f"{settings.LOG_DIR}/app.log",
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["default", "file"],
    },
}