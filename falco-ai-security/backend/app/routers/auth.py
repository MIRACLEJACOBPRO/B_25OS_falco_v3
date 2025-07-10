#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
认证路由模块
处理用户认证、授权相关的API请求
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging

logger = logging.getLogger(__name__)

# 创建路由器
router = APIRouter(prefix="/auth", tags=["认证"])

# 安全配置
security = HTTPBearer()
SECRET_KEY = "falco-ai-security-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 请求模型
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: dict

class UserProfile(BaseModel):
    id: str
    username: str
    email: str
    role: str
    permissions: list
    created_at: datetime
    last_login: Optional[datetime]

# 模拟用户数据库（生产环境应使用真实数据库）
USERS_DB = {
    "admin": {
        "id": "user_001",
        "username": "admin",
        "email": "admin@falco-security.com",
        "password_hash": pwd_context.hash("admin123"),
        "role": "admin",
        "permissions": ["read", "write", "delete", "admin"],
        "created_at": datetime.now(),
        "last_login": None
    },
    "analyst": {
        "id": "user_002",
        "username": "analyst",
        "email": "analyst@falco-security.com",
        "password_hash": pwd_context.hash("analyst123"),
        "role": "analyst",
        "permissions": ["read", "write"],
        "created_at": datetime.now(),
        "last_login": None
    }
}

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """验证访问令牌"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return username
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    """用户登录"""
    try:
        # 查找用户
        user = USERS_DB.get(login_data.username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户名或密码错误"
            )
        
        # 验证密码
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户名或密码错误"
            )
        
        # 创建访问令牌
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["username"]}, expires_delta=access_token_expires
        )
        
        # 更新最后登录时间
        USERS_DB[login_data.username]["last_login"] = datetime.now()
        
        # 返回令牌和用户信息
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "role": user["role"],
                "permissions": user["permissions"]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="登录过程中发生错误"
        )

@router.post("/logout")
async def logout(current_user: str = Depends(verify_token)):
    """用户登出"""
    # 在实际应用中，这里应该将token加入黑名单
    return {"message": "成功登出"}

@router.post("/refresh")
async def refresh_token(current_user: str = Depends(verify_token)):
    """刷新访问令牌"""
    try:
        # 创建新的访问令牌
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": current_user}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
        
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="令牌刷新失败"
        )

@router.get("/profile", response_model=UserProfile)
async def get_user_profile(current_user: str = Depends(verify_token)):
    """获取用户资料"""
    try:
        user = USERS_DB.get(current_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        
        return UserProfile(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            role=user["role"],
            permissions=user["permissions"],
            created_at=user["created_at"],
            last_login=user["last_login"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get profile error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户资料失败"
        )

@router.get("/me")
async def get_current_user(current_user: str = Depends(verify_token)):
    """获取当前用户信息（简化版本）"""
    try:
        user = USERS_DB.get(current_user)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="用户不存在"
            )
        
        return {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "permissions": user["permissions"],
            "authenticated": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取用户信息失败"
        )