/**
 * 简化WebSocket服务模块
 * 使用原生WebSocket连接到后端简化WebSocket服务
 */

import toast from 'react-hot-toast';

// WebSocket配置
const WS_URL = 'ws://192.168.200.129:8001/api/ws'; // 使用宿主机IP连接后端WebSocket端点
console.log('[SimpleWebSocket] Using URL:', WS_URL);

// 事件类型常量
export const WS_EVENTS = {
  // 连接事件
  CONNECT: 'connect_success',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // 系统事件
  SYSTEM_STATUS: 'system_status',
  SYSTEM_HEALTH: 'system_health',
  SYSTEM_METRICS: 'system_metrics',
  SERVER_HEARTBEAT: 'server_heartbeat',
  
  // 安全事件
  SECURITY_EVENT: 'security_event',
  SECURITY_ALERT: 'security_alert',
  THREAT_DETECTED: 'threat_detected',
  
  // Falco事件
  FALCO_EVENT: 'falco_event',
  
  // 数据事件
  DATA_RESPONSE: 'data_response',
  RECENT_EVENTS: 'recent_events',
  
  // 心跳事件
  PING: 'ping',
  PONG: 'pong',
};

// 连接状态
export const CONNECTION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

class SimpleWebSocketService {
  constructor() {
    this.socket = null;
    this.status = CONNECTION_STATUS.DISCONNECTED;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isManualDisconnect = false;
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 绑定方法
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
  }
  
  // 连接WebSocket
  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('[SimpleWebSocket] Already connected');
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.status = CONNECTION_STATUS.CONNECTING;
        this.isManualDisconnect = false;
        
        // 构建WebSocket URL
        const url = `${WS_URL}?client_id=${this.clientId}`;
        
        // 创建WebSocket连接
        this.socket = new WebSocket(url);
        
        // 设置事件监听器
        this.setupEventListeners(resolve, reject);
        
        console.log('[SimpleWebSocket] Connecting to:', url);
        
      } catch (error) {
        console.error('[SimpleWebSocket] Connection error:', error);
        this.status = CONNECTION_STATUS.ERROR;
        reject(error);
      }
    });
  }
  
  // 断开连接
  disconnect() {
    this.isManualDisconnect = true;
    
    // 清理定时器
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // 关闭WebSocket连接
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.status = CONNECTION_STATUS.DISCONNECTED;
    this.reconnectAttempts = 0;
    console.log('[SimpleWebSocket] Disconnected');
  }
  
  // 设置事件监听器
  setupEventListeners(resolve, reject) {
    this.socket.onopen = () => {
      console.log('[SimpleWebSocket] Connected successfully');
      this.status = CONNECTION_STATUS.CONNECTED;
      this.reconnectAttempts = 0;
      
      // 启动心跳
      this.startHeartbeat();
      
      toast.success('实时连接已建立');
      resolve();
    };
    
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('[SimpleWebSocket] Message parse error:', error);
      }
    };
    
    this.socket.onerror = (error) => {
      console.error('[SimpleWebSocket] WebSocket error:', error);
      this.status = CONNECTION_STATUS.ERROR;
      toast.error('WebSocket连接错误');
      reject(error);
    };
    
    this.socket.onclose = (event) => {
      console.log('[SimpleWebSocket] Connection closed:', event.code, event.reason);
      this.status = CONNECTION_STATUS.DISCONNECTED;
      
      // 清理心跳
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      if (!this.isManualDisconnect) {
        toast.warning('连接已断开，正在重连...');
        this.attemptReconnect();
      }
    };
  }
  
  // 处理接收到的消息
  handleMessage(message) {
    const { event, data, timestamp } = message;
    
    console.log('[SimpleWebSocket] Received message:', { event, data });
    
    // 处理特殊事件
    if (event === WS_EVENTS.CONNECT) {
      console.log('[SimpleWebSocket] Connection confirmed by server');
      this.notifyListeners(WS_EVENTS.CONNECT, data);
    } else if (event === WS_EVENTS.PONG) {
      // 处理心跳响应
      console.log('[SimpleWebSocket] Pong received');
    } else {
      // 通知监听器
      this.notifyListeners(event, data);
    }
  }
  
  // 启动心跳
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send(WS_EVENTS.PING, {
          timestamp: new Date().toISOString(),
          client_id: this.clientId
        });
      }
    }, 30000); // 每30秒发送一次心跳
  }
  
  // 尝试重连
  attemptReconnect() {
    if (this.isManualDisconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('重连失败，请刷新页面');
      }
      return;
    }
    
    this.reconnectAttempts++;
    this.status = CONNECTION_STATUS.RECONNECTING;
    
    console.log(`[SimpleWebSocket] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000); // 指数退避，最大10秒
    
    this.reconnectTimeout = setTimeout(() => {
      if (!this.isManualDisconnect) {
        this.connect().catch((error) => {
          console.error('[SimpleWebSocket] Reconnection attempt failed:', error);
          this.attemptReconnect();
        });
      }
    }, delay);
  }
  
  // 发送消息
  send(event, data) {
    if (!this.isConnected()) {
      console.warn('[SimpleWebSocket] Cannot send - not connected');
      return false;
    }
    
    try {
      const message = {
        event,
        data,
        timestamp: new Date().toISOString(),
        client_id: this.clientId
      };
      
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[SimpleWebSocket] Send error:', error);
      return false;
    }
  }
  
  // 请求数据
  requestData(dataType) {
    return this.send('request_data', { type: dataType });
  }
  
  // 添加事件监听器
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event).add(callback);
    
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
  }
  
  // 通知监听器
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[SimpleWebSocket] Listener error for event ${event}:`, error);
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
    return this.socket && this.socket.readyState === WebSocket.OPEN && this.status === CONNECTION_STATUS.CONNECTED;
  }
  
  // 获取客户端ID
  getClientId() {
    return this.clientId;
  }
  
  // 订阅安全事件
  subscribeToSecurityEvents(callback) {
    const events = [
      WS_EVENTS.SECURITY_EVENT,
      WS_EVENTS.SECURITY_ALERT,
      WS_EVENTS.THREAT_DETECTED,
      WS_EVENTS.FALCO_EVENT,
    ];
    
    const unsubscribers = events.map(event => this.on(event, callback));
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }
  
  // 订阅系统事件
  subscribeToSystemEvents(callback) {
    const events = [
      WS_EVENTS.SYSTEM_STATUS,
      WS_EVENTS.SYSTEM_HEALTH,
      WS_EVENTS.SYSTEM_METRICS,
      WS_EVENTS.SERVER_HEARTBEAT,
    ];
    
    const unsubscribers = events.map(event => this.on(event, callback));
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }
}

// 创建全局实例
const simpleWebSocketService = new SimpleWebSocketService();

// 导出服务实例和相关常量
export { simpleWebSocketService as default, SimpleWebSocketService };
export { WS_EVENTS as EVENT_TYPES };