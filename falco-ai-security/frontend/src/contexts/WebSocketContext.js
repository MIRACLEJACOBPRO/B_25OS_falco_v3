/**
 * WebSocket Context
 * 提供实时数据连接和事件推送功能
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const WebSocketContext = createContext();

// WebSocket 连接状态
const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
};

// WebSocket 事件类型
const EVENT_TYPES = {
  SECURITY_EVENT: 'security_event',
  SYSTEM_ALERT: 'system_alert',
  MONITORING_UPDATE: 'monitoring_update',
  THREAT_DETECTION: 'threat_detection',
  CONNECTION_STATUS: 'connection_status',
};

export function WebSocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState(null);
  const [eventListeners, setEventListeners] = useState(new Map());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // 最大重连次数
  const MAX_RECONNECT_ATTEMPTS = 5;
  // 重连间隔（毫秒）
  const RECONNECT_INTERVAL = 3000;

  // 获取 WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.REACT_APP_WS_PORT || '8000';
    return `${protocol}//${host}:${port}/ws`;
  }, []);

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus(CONNECTION_STATUS.CONNECTING);
      const wsUrl = getWebSocketUrl();
      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
        console.log('WebSocket 连接已建立');
        setConnectionStatus(CONNECTION_STATUS.CONNECTED);
        setReconnectAttempts(0);
        setIsReconnecting(false);
        
        // 发送认证信息（如果需要）
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          newSocket.send(JSON.stringify({
            type: 'auth',
            token: authToken,
          }));
        }
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          
          // 触发相应的事件监听器
          const listeners = eventListeners.get(data.type) || [];
          listeners.forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error('WebSocket 事件处理错误:', error);
            }
          });
          
          // 处理系统级事件
          handleSystemEvents(data);
        } catch (error) {
          console.error('WebSocket 消息解析错误:', error);
        }
      };

      newSocket.onclose = (event) => {
        console.log('WebSocket 连接已关闭', event.code, event.reason);
        setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
        setSocket(null);
        
        // 如果不是主动关闭，尝试重连
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          handleReconnect();
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket 连接错误:', error);
        setConnectionStatus(CONNECTION_STATUS.ERROR);
        
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          handleReconnect();
        }
      };

      setSocket(newSocket);
    } catch (error) {
      console.error('WebSocket 连接失败:', error);
      setConnectionStatus(CONNECTION_STATUS.ERROR);
    }
  }, [socket, getWebSocketUrl, eventListeners, reconnectAttempts]);

  // 处理重连
  const handleReconnect = useCallback(() => {
    if (isReconnecting) return;
    
    setIsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);
    
    setTimeout(() => {
      console.log(`尝试重连 WebSocket (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      connect();
    }, RECONNECT_INTERVAL);
  }, [isReconnecting, reconnectAttempts, connect]);

  // 处理系统级事件
  const handleSystemEvents = useCallback((data) => {
    switch (data.type) {
      case EVENT_TYPES.SECURITY_EVENT:
        if (data.severity === 'critical') {
          toast.error(`严重安全事件: ${data.title}`, {
            duration: 10000,
            position: 'top-right',
          });
        }
        break;
        
      case EVENT_TYPES.SYSTEM_ALERT:
        toast.warning(`系统警告: ${data.message}`, {
          duration: 5000,
          position: 'top-right',
        });
        break;
        
      case EVENT_TYPES.THREAT_DETECTION:
        toast.error(`威胁检测: ${data.description}`, {
          duration: 8000,
          position: 'top-right',
        });
        break;
        
      default:
        break;
    }
  }, []);

  // 断开连接
  const disconnect = useCallback(() => {
    if (socket) {
      socket.close(1000, '用户主动断开');
      setSocket(null);
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
    }
  }, [socket]);

  // 发送消息
  const sendMessage = useCallback((message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        socket.send(messageStr);
        return true;
      } catch (error) {
        console.error('发送 WebSocket 消息失败:', error);
        return false;
      }
    } else {
      console.warn('WebSocket 未连接，无法发送消息');
      return false;
    }
  }, [socket]);

  // 添加事件监听器
  const addEventListener = useCallback((eventType, callback) => {
    setEventListeners(prev => {
      const newListeners = new Map(prev);
      const listeners = newListeners.get(eventType) || [];
      newListeners.set(eventType, [...listeners, callback]);
      return newListeners;
    });

    // 返回移除监听器的函数
    return () => {
      setEventListeners(prev => {
        const newListeners = new Map(prev);
        const listeners = newListeners.get(eventType) || [];
        const filteredListeners = listeners.filter(cb => cb !== callback);
        if (filteredListeners.length > 0) {
          newListeners.set(eventType, filteredListeners);
        } else {
          newListeners.delete(eventType);
        }
        return newListeners;
      });
    };
  }, []);

  // 移除事件监听器
  const removeEventListener = useCallback((eventType, callback) => {
    setEventListeners(prev => {
      const newListeners = new Map(prev);
      const listeners = newListeners.get(eventType) || [];
      const filteredListeners = listeners.filter(cb => cb !== callback);
      if (filteredListeners.length > 0) {
        newListeners.set(eventType, filteredListeners);
      } else {
        newListeners.delete(eventType);
      }
      return newListeners;
    });
  }, []);

  // 组件挂载时自动连接
  useEffect(() => {
    connect();
    
    // 组件卸载时断开连接
    return () => {
      disconnect();
    };
  }, []);

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      if (connectionStatus === CONNECTION_STATUS.DISCONNECTED) {
        console.log('网络恢复，尝试重连 WebSocket');
        connect();
      }
    };

    const handleOffline = () => {
      console.log('网络断开');
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionStatus, connect]);

  const contextValue = {
    // 连接状态
    connectionStatus,
    isConnected: connectionStatus === CONNECTION_STATUS.CONNECTED,
    isConnecting: connectionStatus === CONNECTION_STATUS.CONNECTING,
    isReconnecting,
    reconnectAttempts,
    
    // 消息相关
    lastMessage,
    
    // 连接控制
    connect,
    disconnect,
    sendMessage,
    
    // 事件监听
    addEventListener,
    removeEventListener,
    
    // 常量
    CONNECTION_STATUS,
    EVENT_TYPES,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook for using WebSocket context
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// 导出常量供外部使用
export { CONNECTION_STATUS, EVENT_TYPES };

export default WebSocketContext;