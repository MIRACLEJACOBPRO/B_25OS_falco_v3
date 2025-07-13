#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - Simple Configuration
简化配置文件，避免pydantic_settings依赖
"""

import os
from typing import Optional

class Settings:
    """简化的应用配置类"""
    
    def __init__(self):
        # 基础配置
        self.ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
        self.DEBUG = os.getenv("DEBUG", "True").lower() == "true"
        self.HOST = os.getenv("HOST", "0.0.0.0")
        self.PORT = int(os.getenv("PORT", "8001"))
        
        # 安全配置
        self.SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
        self.ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        
        # Neo4j数据库配置
        self.NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
        self.NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
        self.NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")
        
        # Pinecone向量数据库配置
        self.PINECONE_API_KEY = os.getenv("PINECONE_API_KEY", "pc-xxx")
        self.PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT", "us-east-1-aws")
        self.PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "falco-knowledge")
        self.PINECONE_DIMENSION = int(os.getenv("PINECONE_DIMENSION", "1536"))
        
        # OpenAI配置
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "sk-xxx")
        self.OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4")
        self.OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-ada-002")
        self.OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "2000"))
        self.OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.1"))
        
        # Falco配置
        self.FALCO_LOG_PATH = os.getenv("FALCO_LOG_PATH", "/var/log/falco/falco.log")
        self.FALCO_CONFIG_PATH = os.getenv("FALCO_CONFIG_PATH", "/etc/falco/falco.yaml")
        self.FALCO_RULES_PATH = os.getenv("FALCO_RULES_PATH", "/etc/falco/falco_rules.yaml")
        self.FALCO_ALLOW_INVALID_EVENTS = os.getenv("FALCO_ALLOW_INVALID_EVENTS", "False").lower() == "true"
        self.FALCO_MAX_EVENTS_PER_BATCH = int(os.getenv("FALCO_MAX_EVENTS_PER_BATCH", "100"))
        self.FALCO_PROCESSING_INTERVAL = int(os.getenv("FALCO_PROCESSING_INTERVAL", "1"))  # 秒
        
        # 系统路径配置
        self.LOG_DIR = os.getenv("LOG_DIR", "/var/log/falco-ai-security")
        self.DATA_DIR = os.getenv("DATA_DIR", "/opt/falco-ai-security/data")
        self.SCRIPTS_DIR = os.getenv("SCRIPTS_DIR", "/opt/falco-ai-security/scripts")
        
        # AI分析配置
        self.AI_ANALYSIS_ENABLED = os.getenv("AI_ANALYSIS_ENABLED", "True").lower() == "true"
        self.AUTO_EXECUTION_ENABLED = os.getenv("AUTO_EXECUTION_ENABLED", "False").lower() == "true"
        self.RISK_THRESHOLD = float(os.getenv("RISK_THRESHOLD", "0.7"))
        self.BATCH_SIZE = int(os.getenv("BATCH_SIZE", "10"))
        
        # 监控配置
        self.MONITOR_INTERVAL = int(os.getenv("MONITOR_INTERVAL", "5"))  # 秒
        self.LOG_RETENTION_DAYS = int(os.getenv("LOG_RETENTION_DAYS", "30"))
        self.ALERT_COOLDOWN = int(os.getenv("ALERT_COOLDOWN", "300"))  # 秒
        
        # Redis配置（用于缓存和队列）
        self.REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
        
        # 邮件通知配置
        self.SMTP_SERVER = os.getenv("SMTP_SERVER")
        self.SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
        self.SMTP_USERNAME = os.getenv("SMTP_USERNAME")
        self.SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
        self.ALERT_EMAIL = os.getenv("ALERT_EMAIL")
        
        # Web界面配置
        self.FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
        self.API_PREFIX = os.getenv("API_PREFIX", "/api/v1")

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
        print(f"配置警告: {'; '.join(errors)}")
    
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
        "handlers": ["default"],
    },
}