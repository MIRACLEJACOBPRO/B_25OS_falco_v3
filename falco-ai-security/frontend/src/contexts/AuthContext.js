/**
 * 认证上下文
 * 管理用户认证状态和相关操作
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { wsService } from '../services/websocket';
import toast from 'react-hot-toast';

// 认证状态
const AUTH_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error',
};

// 用户角色
export const USER_ROLES = {
  ADMIN: 'admin',
  ANALYST: 'analyst',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
};

// 权限定义
export const PERMISSIONS = {
  // 系统管理
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_MONITOR: 'system:monitor',
  
  // 用户管理
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // 安全分析
  ANALYSIS_READ: 'analysis:read',
  ANALYSIS_CREATE: 'analysis:create',
  ANALYSIS_EXPORT: 'analysis:export',
  
  // AI功能
  AI_ANALYZE: 'ai:analyze',
  AI_CONFIGURE: 'ai:configure',
  
  // 自动执行
  EXECUTION_VIEW: 'execution:view',
  EXECUTION_APPROVE: 'execution:approve',
  EXECUTION_EXECUTE: 'execution:execute',
  
  // 配置管理
  CONFIG_READ: 'config:read',
  CONFIG_UPDATE: 'config:update',
  
  // 报告生成
  REPORT_READ: 'report:read',
  REPORT_CREATE: 'report:create',
  REPORT_DELETE: 'report:delete',
  
  // 威胁情报
  INTEL_READ: 'intel:read',
  INTEL_CREATE: 'intel:create',
  INTEL_UPDATE: 'intel:update',
  INTEL_DELETE: 'intel:delete',
};

// 角色权限映射
const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: Object.values(PERMISSIONS),
  [USER_ROLES.ANALYST]: [
    PERMISSIONS.SYSTEM_MONITOR,
    PERMISSIONS.USER_READ,
    PERMISSIONS.ANALYSIS_READ,
    PERMISSIONS.ANALYSIS_CREATE,
    PERMISSIONS.ANALYSIS_EXPORT,
    PERMISSIONS.AI_ANALYZE,
    PERMISSIONS.EXECUTION_VIEW,
    PERMISSIONS.EXECUTION_APPROVE,
    PERMISSIONS.CONFIG_READ,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.INTEL_READ,
    PERMISSIONS.INTEL_CREATE,
    PERMISSIONS.INTEL_UPDATE,
  ],
  [USER_ROLES.OPERATOR]: [
    PERMISSIONS.SYSTEM_MONITOR,
    PERMISSIONS.USER_READ,
    PERMISSIONS.ANALYSIS_READ,
    PERMISSIONS.AI_ANALYZE,
    PERMISSIONS.EXECUTION_VIEW,
    PERMISSIONS.EXECUTION_EXECUTE,
    PERMISSIONS.CONFIG_READ,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.INTEL_READ,
  ],
  [USER_ROLES.VIEWER]: [
    PERMISSIONS.SYSTEM_MONITOR,
    PERMISSIONS.USER_READ,
    PERMISSIONS.ANALYSIS_READ,
    PERMISSIONS.EXECUTION_VIEW,
    PERMISSIONS.CONFIG_READ,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.INTEL_READ,
  ],
};

// Action类型
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_AUTHENTICATED: 'SET_AUTHENTICATED',
  SET_UNAUTHENTICATED: 'SET_UNAUTHENTICATED',
  SET_ERROR: 'SET_ERROR',
  UPDATE_USER: 'UPDATE_USER',
  SET_PERMISSIONS: 'SET_PERMISSIONS',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// 初始状态
const initialState = {
  status: AUTH_STATES.IDLE,
  user: null,
  token: null,
  permissions: [],
  error: null,
  isLoading: false,
};

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        status: AUTH_STATES.LOADING,
        isLoading: true,
        error: null,
      };
      
    case AUTH_ACTIONS.SET_AUTHENTICATED:
      return {
        ...state,
        status: AUTH_STATES.AUTHENTICATED,
        user: action.payload.user,
        token: action.payload.token,
        permissions: action.payload.permissions || [],
        isLoading: false,
        error: null,
      };
      
    case AUTH_ACTIONS.SET_UNAUTHENTICATED:
      return {
        ...state,
        status: AUTH_STATES.UNAUTHENTICATED,
        user: null,
        token: null,
        permissions: [],
        isLoading: false,
        error: null,
      };
      
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        status: AUTH_STATES.ERROR,
        error: action.payload,
        isLoading: false,
      };
      
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
      
    case AUTH_ACTIONS.SET_PERMISSIONS:
      return {
        ...state,
        permissions: action.payload,
      };
      
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
      
    default:
      return state;
  }
}

// 创建上下文
const AuthContext = createContext(null);

// AuthProvider组件
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // 验证token
  const validateToken = useCallback(async (token) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING });
      
      // 设置验证超时（10秒）
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Token validation timeout')), 10000);
      });
      
      // 设置token到localStorage
      localStorage.setItem('auth_token', token);
      
      // 获取用户信息（带超时）
      const userProfile = await Promise.race([
        apiService.getUserProfile(),
        timeoutPromise
      ]);
      
      // 获取用户权限
      const permissions = getUserPermissions(userProfile.role, userProfile.permissions);
      
      dispatch({
        type: AUTH_ACTIONS.SET_AUTHENTICATED,
        payload: {
          user: userProfile,
          token,
          permissions,
        },
      });
      
      // 连接WebSocket
      try {
        await wsService.connect(token);
      } catch (wsError) {
        console.warn('WebSocket connection failed:', wsError);
        // WebSocket连接失败不影响认证状态
      }
      
    } catch (error) {
      console.error('Token validation failed:', error);
      localStorage.removeItem('auth_token');
      dispatch({ type: AUTH_ACTIONS.SET_UNAUTHENTICATED });
    }
  }, []);
  
  // 检查本地存储的token
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // 检查token格式是否有效
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Invalid token format');
        }
        // 验证token并获取用户信息
        validateToken(token);
      } catch (error) {
        console.warn('Invalid token found, clearing:', error);
        localStorage.removeItem('auth_token');
        dispatch({ type: AUTH_ACTIONS.SET_UNAUTHENTICATED });
      }
    } else {
      dispatch({ type: AUTH_ACTIONS.SET_UNAUTHENTICATED });
    }
  }, [validateToken]);
  
  // 获取用户权限
  const getUserPermissions = (role, customPermissions = []) => {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    return [...new Set([...rolePermissions, ...customPermissions])];
  };
  
  // 登录
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING });
      
      const response = await apiService.login(credentials);
      const { user, access_token } = response;
      
      // 获取用户权限
      const permissions = getUserPermissions(user.role, user.permissions);
      
      // 保存token
      localStorage.setItem('auth_token', access_token);
      
      dispatch({
        type: AUTH_ACTIONS.SET_AUTHENTICATED,
        payload: {
          user,
          token: access_token,
          permissions,
        },
      });
      
      // 连接WebSocket
      try {
        await wsService.connect(access_token);
      } catch (wsError) {
        console.warn('WebSocket connection failed:', wsError);
      }
      
      toast.success(`欢迎回来，${user.username}！`);
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || '登录失败';
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: errorMessage,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };
  
  // 登出
  const logout = async () => {
    try {
      // 调用登出API
      await apiService.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // 清理本地状态
      localStorage.removeItem('auth_token');
      
      // 断开WebSocket连接
      wsService.disconnect();
      
      dispatch({ type: AUTH_ACTIONS.SET_UNAUTHENTICATED });
      
      toast.success('已安全退出');
    }
  };
  
  // 刷新token
  const refreshToken = async () => {
    try {
      const response = await apiService.refreshToken();
      const { token } = response;
      
      localStorage.setItem('auth_token', token);
      
      dispatch({
        type: AUTH_ACTIONS.SET_AUTHENTICATED,
        payload: {
          ...state,
          token,
        },
      });
      
      return { success: true };
      
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return { success: false };
    }
  };
  
  // 更新用户信息
  const updateUser = (updates) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: updates,
    });
  };
  
  // 检查权限
  const hasPermission = (permission) => {
    return state.permissions.includes(permission);
  };
  
  // 检查多个权限（AND逻辑）
  const hasAllPermissions = (permissions) => {
    return permissions.every(permission => hasPermission(permission));
  };
  
  // 检查多个权限（OR逻辑）
  const hasAnyPermission = (permissions) => {
    return permissions.some(permission => hasPermission(permission));
  };
  
  // 检查角色
  const hasRole = (role) => {
    return state.user?.role === role;
  };
  
  // 检查是否为管理员
  const isAdmin = () => {
    return hasRole(USER_ROLES.ADMIN);
  };
  
  // 清除错误
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };
  
  // 获取用户显示名称
  const getUserDisplayName = () => {
    if (!state.user) return '';
    return state.user.displayName || state.user.name || state.user.username || '';
  };
  
  // 获取用户头像URL
  const getUserAvatarUrl = () => {
    if (!state.user) return null;
    return state.user.avatar || state.user.avatarUrl || null;
  };
  
  // 检查认证状态
  const isAuthenticated = state.status === AUTH_STATES.AUTHENTICATED && !!state.user && !!state.token;
  
  // 检查是否正在加载
  const isLoading = state.status === AUTH_STATES.LOADING || state.isLoading;
  
  // 添加调试日志
  React.useEffect(() => {
    console.log('[AuthContext] 认证状态变化:', {
      isAuthenticated,
      hasUser: !!state.user,
      hasToken: !!state.token,
      hasError: !!state.error,
      isLoading: state.isLoading,
      status: state.status
    });
  }, [isAuthenticated, state.user, state.token, state.error, state.isLoading, state.status]);
  
  // 上下文值
  const contextValue = {
    // 状态
    ...state,
    isAuthenticated,
    isLoading,
    
    // 方法
    login,
    logout,
    refreshToken,
    updateUser,
    clearError,
    
    // 权限检查
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    isAdmin,
    
    // 工具方法
    getUserDisplayName,
    getUserAvatarUrl,
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth Hook
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// 权限检查Hook
export function usePermissions() {
  const { hasPermission, hasAllPermissions, hasAnyPermission, hasRole, isAdmin } = useAuth();
  
  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasRole,
    isAdmin,
  };
}

// 受保护的路由Hook
export function useProtectedRoute(requiredPermissions = [], requiredRoles = []) {
  const { isAuthenticated, hasAnyPermission, hasRole } = useAuth();
  
  const hasAccess = React.useMemo(() => {
    if (!isAuthenticated) return false;
    
    // 检查权限
    if (requiredPermissions.length > 0 && !hasAnyPermission(requiredPermissions)) {
      return false;
    }
    
    // 检查角色
    if (requiredRoles.length > 0 && !requiredRoles.some(role => hasRole(role))) {
      return false;
    }
    
    return true;
  }, [isAuthenticated, hasAnyPermission, hasRole, requiredPermissions, requiredRoles]);
  
  return { hasAccess, isAuthenticated };
}

// 导出常量
export { AUTH_STATES, ROLE_PERMISSIONS };