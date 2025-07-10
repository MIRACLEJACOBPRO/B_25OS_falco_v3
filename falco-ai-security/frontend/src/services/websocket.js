/**
 * WebSocket服务模块
 * 提供实时数据通信功能
 */

import React from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

// WebSocket配置
const WS_URL = 'http://192.168.200.129:8001'; // 临时硬编码用于调试
console.log('[WebSocket] Using URL:', WS_URL);
const WS_OPTIONS = {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  forceNew: true,
};

// 事件类型常量
export const WS_EVENTS = {
  // 连接事件
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ERROR: 'reconnect_error',
  RECONNECT_FAILED: 'reconnect_failed',
  
  // 系统事件
  SYSTEM_STATUS: 'system_status',
  SYSTEM_HEALTH: 'system_health',
  SYSTEM_METRICS: 'system_metrics',
  
  // 安全事件
  SECURITY_EVENT: 'security_event',
  SECURITY_ALERT: 'security_alert',
  THREAT_DETECTED: 'threat_detected',
  ANOMALY_DETECTED: 'anomaly_detected',
  
  // Falco事件
  FALCO_EVENT: 'falco_event',
  FALCO_ALERT: 'falco_alert',
  FALCO_STATUS: 'falco_status',
  
  // AI分析事件
  AI_ANALYSIS_START: 'ai_analysis_start',
  AI_ANALYSIS_COMPLETE: 'ai_analysis_complete',
  AI_ANALYSIS_ERROR: 'ai_analysis_error',
  AI_RECOMMENDATION: 'ai_recommendation',
  
  // 执行事件
  EXECUTION_PENDING: 'execution_pending',
  EXECUTION_APPROVED: 'execution_approved',
  EXECUTION_REJECTED: 'execution_rejected',
  EXECUTION_STARTED: 'execution_started',
  EXECUTION_COMPLETED: 'execution_completed',
  EXECUTION_FAILED: 'execution_failed',
  
  // 图谱事件
  GRAPH_UPDATED: 'graph_updated',
  NODE_ADDED: 'node_added',
  NODE_UPDATED: 'node_updated',
  NODE_REMOVED: 'node_removed',
  RELATIONSHIP_ADDED: 'relationship_added',
  RELATIONSHIP_UPDATED: 'relationship_updated',
  RELATIONSHIP_REMOVED: 'relationship_removed',
  
  // 用户事件
  USER_ACTIVITY: 'user_activity',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  
  // 配置事件
  CONFIG_UPDATED: 'config_updated',
  RULE_UPDATED: 'rule_updated',
  
  // 报告事件
  REPORT_GENERATED: 'report_generated',
  REPORT_FAILED: 'report_failed',
};

// 为了兼容性，导出EVENT_TYPES作为WS_EVENTS的别名
export const EVENT_TYPES = {
  SECURITY_EVENT: WS_EVENTS.SECURITY_EVENT,
  SYSTEM_EVENT: WS_EVENTS.SYSTEM_STATUS,
  THREAT_INTEL: WS_EVENTS.THREAT_DETECTED,
  GRAPH_UPDATE: WS_EVENTS.GRAPH_UPDATED,
};

// 连接状态
export const CONNECTION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

class WebSocketService {
  constructor() {
    this.socket = null;
    this.status = CONNECTION_STATUS.DISCONNECTED;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isManualDisconnect = false;
    
    // 绑定方法
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
  }
  
  // 连接WebSocket
  connect(token = null) {
    if (this.socket && this.socket.connected) {
      console.log('[WebSocket] Already connected');
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.status = CONNECTION_STATUS.CONNECTING;
        this.isManualDisconnect = false;
        
        // 获取认证token
        const authToken = token || localStorage.getItem('auth_token');
        
        // 创建socket连接
        const options = {
          ...WS_OPTIONS,
          auth: {
            token: authToken,
          },
          query: {
            clientType: 'web',
            version: process.env.REACT_APP_VERSION || '1.0.0',
          },
        };
        
        this.socket = io(WS_URL, options);
        
        // 设置连接事件监听器
        this.setupConnectionListeners(resolve, reject);
        
        // 设置系统事件监听器
        this.setupSystemListeners();
        
        console.log('[WebSocket] Connecting to:', WS_URL);
        
      } catch (error) {
        console.error('[WebSocket] Connection error:', error);
        this.status = CONNECTION_STATUS.ERROR;
        reject(error);
      }
    });
  }
  
  // 断开连接
  disconnect() {
    if (this.socket) {
      this.isManualDisconnect = true;
      this.socket.disconnect();
      this.socket = null;
    }
    this.status = CONNECTION_STATUS.DISCONNECTED;
    this.reconnectAttempts = 0;
    console.log('[WebSocket] Disconnected');
  }
  
  // 设置连接事件监听器
  setupConnectionListeners(resolve, reject) {
    this.socket.on(WS_EVENTS.CONNECT, () => {
      console.log('[WebSocket] Connected successfully');
      this.status = CONNECTION_STATUS.CONNECTED;
      this.reconnectAttempts = 0;
      toast.success('实时连接已建立');
      resolve();
    });
    
    this.socket.on(WS_EVENTS.CONNECT_ERROR, (error) => {
      console.error('[WebSocket] Connection error:', error);
      this.status = CONNECTION_STATUS.ERROR;
      
      if (error.message === 'Authentication failed') {
        toast.error('认证失败，请重新登录');
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      } else {
        toast.error('连接失败，请检查网络');
      }
      
      reject(error);
    });
    
    this.socket.on(WS_EVENTS.DISCONNECT, (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.status = CONNECTION_STATUS.DISCONNECTED;
      
      if (!this.isManualDisconnect) {
        if (reason === 'io server disconnect') {
          // 服务器主动断开，需要重新连接
          toast.warning('服务器连接断开，正在重连...');
          this.attemptReconnect();
        } else {
          toast.warning('连接已断开');
        }
      }
    });
    
    this.socket.on(WS_EVENTS.RECONNECT, (attemptNumber) => {
      console.log(`[WebSocket] Reconnected after ${attemptNumber} attempts`);
      this.status = CONNECTION_STATUS.CONNECTED;
      this.reconnectAttempts = 0;
      toast.success('重连成功');
    });
    
    this.socket.on(WS_EVENTS.RECONNECT_ERROR, (error) => {
      console.error('[WebSocket] Reconnection error:', error);
      this.status = CONNECTION_STATUS.ERROR;
    });
    
    this.socket.on(WS_EVENTS.RECONNECT_FAILED, () => {
      console.error('[WebSocket] Reconnection failed');
      this.status = CONNECTION_STATUS.ERROR;
      toast.error('重连失败，请刷新页面');
    });
  }
  
  // 设置系统事件监听器
  setupSystemListeners() {
    // 系统状态更新
    this.socket.on(WS_EVENTS.SYSTEM_STATUS, (data) => {
      console.log('[WebSocket] System status update:', data);
      this.notifyListeners(WS_EVENTS.SYSTEM_STATUS, data);
    });
    
    // 系统健康检查
    this.socket.on(WS_EVENTS.SYSTEM_HEALTH, (data) => {
      console.log('[WebSocket] System health update:', data);
      this.notifyListeners(WS_EVENTS.SYSTEM_HEALTH, data);
    });
    
    // 系统指标更新
    this.socket.on(WS_EVENTS.SYSTEM_METRICS, (data) => {
      this.notifyListeners(WS_EVENTS.SYSTEM_METRICS, data);
    });
  }
  
  // 尝试重连
  attemptReconnect() {
    if (this.isManualDisconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    
    this.reconnectAttempts++;
    this.status = CONNECTION_STATUS.RECONNECTING;
    
    console.log(`[WebSocket] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      if (!this.isManualDisconnect) {
        this.connect().catch((error) => {
          console.error('[WebSocket] Reconnection attempt failed:', error);
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        });
      }
    }, 1000 * this.reconnectAttempts); // 递增延迟
  }
  
  // 发送消息
  emit(event, data, callback) {
    if (!this.socket || !this.socket.connected) {
      console.warn('[WebSocket] Cannot emit - not connected');
      return false;
    }
    
    try {
      if (callback) {
        this.socket.emit(event, data, callback);
      } else {
        this.socket.emit(event, data);
      }
      return true;
    } catch (error) {
      console.error('[WebSocket] Emit error:', error);
      return false;
    }
  }
  
  // 添加事件监听器
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event).add(callback);
    
    // 如果socket已连接，直接添加监听器
    if (this.socket) {
      this.socket.on(event, callback);
    }
    
    // 返回取消监听的函数
    return () => this.off(event, callback);
  }
  
  // 移除事件监听器
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
      
      if (this.listeners.get(event).size === 0) {
        this.listeners.delete(event);
      }
    }
    
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
  
  // 通知监听器
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Listener error for event ${event}:`, error);
        }
      });
    }
  }
  
  // 获取连接状态
  getStatus() {
    return this.status;
  }
  
  // 检查是否已连接
  isConnected() {
    return this.socket && this.socket.connected && this.status === CONNECTION_STATUS.CONNECTED;
  }
  
  // 获取连接ID
  getConnectionId() {
    return this.socket ? this.socket.id : null;
  }
  
  // 订阅特定类型的事件
  subscribeToSecurityEvents(callback) {
    const events = [
      WS_EVENTS.SECURITY_EVENT,
      WS_EVENTS.SECURITY_ALERT,
      WS_EVENTS.THREAT_DETECTED,
      WS_EVENTS.ANOMALY_DETECTED,
    ];
    
    const unsubscribers = events.map(event => this.on(event, callback));
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }
  
  subscribeToFalcoEvents(callback) {
    const events = [
      WS_EVENTS.FALCO_EVENT,
      WS_EVENTS.FALCO_ALERT,
      WS_EVENTS.FALCO_STATUS,
    ];
    
    const unsubscribers = events.map(event => this.on(event, callback));
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }
  
  subscribeToAIEvents(callback) {
    const events = [
      WS_EVENTS.AI_ANALYSIS_START,
      WS_EVENTS.AI_ANALYSIS_COMPLETE,
      WS_EVENTS.AI_ANALYSIS_ERROR,
      WS_EVENTS.AI_RECOMMENDATION,
    ];
    
    const unsubscribers = events.map(event => this.on(event, callback));
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }
  
  subscribeToExecutionEvents(callback) {
    const events = [
      WS_EVENTS.EXECUTION_PENDING,
      WS_EVENTS.EXECUTION_APPROVED,
      WS_EVENTS.EXECUTION_REJECTED,
      WS_EVENTS.EXECUTION_STARTED,
      WS_EVENTS.EXECUTION_COMPLETED,
      WS_EVENTS.EXECUTION_FAILED,
    ];
    
    const unsubscribers = events.map(event => this.on(event, callback));
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }
  
  subscribeToGraphEvents(callback) {
    const events = [
      WS_EVENTS.GRAPH_UPDATED,
      WS_EVENTS.NODE_ADDED,
      WS_EVENTS.NODE_UPDATED,
      WS_EVENTS.NODE_REMOVED,
      WS_EVENTS.RELATIONSHIP_ADDED,
      WS_EVENTS.RELATIONSHIP_UPDATED,
      WS_EVENTS.RELATIONSHIP_REMOVED,
    ];
    
    const unsubscribers = events.map(event => this.on(event, callback));
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }
  
  // 请求实时数据
  requestRealTimeData(dataType, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);
      
      this.emit('request_data', { type: dataType, params }, (response) => {
        clearTimeout(timeout);
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Request failed'));
        }
      });
    });
  }
  
  // 发送心跳
  sendHeartbeat() {
    if (this.isConnected()) {
      this.emit('heartbeat', { timestamp: Date.now() });
    }
  }
  
  // 启动心跳
  startHeartbeat(interval = 30000) {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, interval);
  }
  
  // 停止心跳
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  // 清理资源
  cleanup() {
    this.stopHeartbeat();
    this.disconnect();
    this.listeners.clear();
  }
}

// 创建WebSocket服务实例
export const wsService = new WebSocketService();

// 导出默认实例
export default wsService;

// React Hook for WebSocket
export function useWebSocket() {
  const [status, setStatus] = React.useState(wsService.getStatus());
  const [isConnected, setIsConnected] = React.useState(wsService.isConnected());
  
  React.useEffect(() => {
    const updateStatus = () => {
      setStatus(wsService.getStatus());
      setIsConnected(wsService.isConnected());
    };
    
    // 监听连接状态变化
    const unsubscribers = [
      wsService.on(WS_EVENTS.CONNECT, updateStatus),
      wsService.on(WS_EVENTS.DISCONNECT, updateStatus),
      wsService.on(WS_EVENTS.CONNECT_ERROR, updateStatus),
      wsService.on(WS_EVENTS.RECONNECT, updateStatus),
    ];
    
    // 初始状态更新
    updateStatus();
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);
  
  return {
    status,
    isConnected,
    connect: wsService.connect,
    disconnect: wsService.disconnect,
    emit: wsService.emit,
    on: wsService.on,
    off: wsService.off,
    subscribeToSecurityEvents: wsService.subscribeToSecurityEvents,
    subscribeToFalcoEvents: wsService.subscribeToFalcoEvents,
    subscribeToAIEvents: wsService.subscribeToAIEvents,
    subscribeToExecutionEvents: wsService.subscribeToExecutionEvents,
    subscribeToGraphEvents: wsService.subscribeToGraphEvents,
    requestRealTimeData: wsService.requestRealTimeData,
  };
}