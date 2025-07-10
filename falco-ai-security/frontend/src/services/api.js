/**
 * API服务模块
 * 提供与后端API的统一接口
 */

import axios from 'axios';
import toast from 'react-hot-toast';

// API基础配置
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';
const API_TIMEOUT = 30000; // 30秒超时

// 创建axios实例
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 添加请求ID用于追踪
    config.headers['X-Request-ID'] = generateRequestId();
    
    // 记录请求日志
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data,
    });
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 记录响应日志
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      data: response.data,
    });
    
    return response;
  },
  (error) => {
    console.error('[API Response Error]', error);
    
    // 统一错误处理
    handleApiError(error);
    
    return Promise.reject(error);
  }
);

// 生成请求ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 统一错误处理
function handleApiError(error) {
  if (error.response) {
    // 服务器响应错误
    const { status, data } = error.response;
    
    switch (status) {
      case 401:
        // 未授权，清除token并跳转登录
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        toast.error('登录已过期，请重新登录');
        break;
      case 403:
        toast.error('权限不足，无法访问该资源');
        break;
      case 404:
        toast.error('请求的资源不存在');
        break;
      case 429:
        toast.error('请求过于频繁，请稍后再试');
        break;
      case 500:
        toast.error('服务器内部错误，请联系管理员');
        break;
      case 502:
      case 503:
      case 504:
        toast.error('服务暂时不可用，请稍后再试');
        break;
      default:
        toast.error(data?.message || `请求失败 (${status})`);
    }
  } else if (error.request) {
    // 网络错误
    toast.error('网络连接失败，请检查网络设置');
  } else {
    // 其他错误
    toast.error('请求发生未知错误');
  }
}

// API服务类
class ApiService {
  // ==================== 系统健康检查 ====================
  
  async getSystemHealth() {
    const response = await apiClient.get('/health');
    return response.data;
  }
  
  async getSystemStatus() {
    const response = await apiClient.get('/status');
    return response.data;
  }
  
  // ==================== 认证相关 ====================
  
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  }
  
  async logout() {
    const response = await apiClient.post('/auth/logout');
    localStorage.removeItem('auth_token');
    return response.data;
  }
  
  async refreshToken() {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  }
  
  async getUserProfile() {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  }
  
  // ==================== 实时监控 ====================
  
  async getRealTimeEvents(params = {}) {
    const response = await apiClient.get('/monitor/events', { params });
    return response.data;
  }
  
  async getSystemMetrics() {
    const response = await apiClient.get('/monitor/metrics');
    return response.data;
  }
  
  async getMonitoringData(params = {}) {
    const response = await apiClient.get('/monitor/data', { params });
    return response.data;
  }
  
  async getAlerts(params = {}) {
    const response = await apiClient.get('/monitor/alerts', { params });
    return response.data;
  }
  
  async acknowledgeAlert(alertId) {
    const response = await apiClient.post(`/monitor/alerts/${alertId}/acknowledge`);
    return response.data;
  }
  
  async resolveAlert(alertId, resolution) {
    const response = await apiClient.post(`/monitor/alerts/${alertId}/resolve`, { resolution });
    return response.data;
  }
  
  // ==================== 图谱可视化 ====================
  
  async getGraphData(params = {}) {
    const response = await apiClient.get('/graph/data', { params });
    return response.data;
  }
  
  async getNodeDetails(nodeId) {
    const response = await apiClient.get(`/graph/nodes/${nodeId}`);
    return response.data;
  }
  
  async getRelationshipDetails(relationshipId) {
    const response = await apiClient.get(`/graph/relationships/${relationshipId}`);
    return response.data;
  }
  
  async searchGraph(query, params = {}) {
    const response = await apiClient.post('/graph/search', { query, ...params });
    return response.data;
  }
  
  async getAttackPaths(params = {}) {
    const response = await apiClient.get('/graph/attack-paths', { params });
    return response.data;
  }
  
  async getBehaviorChains(params = {}) {
    const response = await apiClient.get('/graph/behavior-chains', { params });
    return response.data;
  }
  
  // ==================== 事件分析 ====================
  
  async analyzeEvent(eventData) {
    const response = await apiClient.post('/analysis/events', eventData);
    return response.data;
  }
  
  async getAnalysisHistory(params = {}) {
    const response = await apiClient.get('/analysis/history', { params });
    return response.data;
  }
  
  async getAnalysisResult(analysisId) {
    const response = await apiClient.get(`/analysis/results/${analysisId}`);
    return response.data;
  }
  
  async exportAnalysisReport(analysisId, format = 'pdf') {
    const response = await apiClient.get(`/analysis/results/${analysisId}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }
  
  // ==================== 威胁情报 ====================
  
  async getThreatIntelligence(params = {}) {
    const response = await apiClient.get('/intelligence/threats', { params });
    return response.data;
  }
  
  async getThreatTrends() {
    const response = await apiClient.get('/intelligence/trends');
    return response.data;
  }

  async searchThreatIntel(query, params = {}) {
    const response = await apiClient.post('/intelligence/search', { query, ...params });
    return response.data;
  }
  
  async getIOCIndicators(params = {}) {
    const response = await apiClient.get('/intelligence/ioc', { params });
    return response.data;
  }
  
  async addIOCIndicator(indicator) {
    const response = await apiClient.post('/intelligence/ioc', indicator);
    return response.data;
  }
  
  async updateIOCIndicator(indicatorId, updates) {
    const response = await apiClient.put(`/intelligence/ioc/${indicatorId}`, updates);
    return response.data;
  }
  
  async deleteIOCIndicator(indicatorId) {
    const response = await apiClient.delete(`/intelligence/ioc/${indicatorId}`);
    return response.data;
  }
  
  // ==================== AI分析 ====================
  
  async getAIAnalysis(params = {}) {
    const response = await apiClient.get('/ai/analysis', { params });
    return response.data;
  }
  
  async triggerAIAnalysis(data) {
    const response = await apiClient.post('/ai/analysis/trigger', data);
    return response.data;
  }
  
  async getAIRecommendations(params = {}) {
    const response = await apiClient.get('/ai/recommendations', { params });
    return response.data;
  }
  
  async executeAIRecommendation(recommendationId, params = {}) {
    const response = await apiClient.post(`/ai/recommendations/${recommendationId}/execute`, params);
    return response.data;
  }
  
  // ==================== 自动执行 ====================
  
  async getExecutionQueue() {
    const response = await apiClient.get('/execution/queue');
    return response.data;
  }
  
  async getExecutionHistory(params = {}) {
    const response = await apiClient.get('/execution/history', { params });
    return response.data;
  }
  
  async approveExecution(executionId, approval) {
    const response = await apiClient.post(`/execution/${executionId}/approve`, approval);
    return response.data;
  }
  
  async rejectExecution(executionId, rejection) {
    const response = await apiClient.post(`/execution/${executionId}/reject`, rejection);
    return response.data;
  }
  
  async cancelExecution(executionId, reason) {
    const response = await apiClient.post(`/execution/${executionId}/cancel`, { reason });
    return response.data;
  }
  
  // ==================== 配置管理 ====================
  
  async getFalcoConfig() {
    const response = await apiClient.get('/config/falco');
    return response.data;
  }
  
  async updateFalcoConfig(config) {
    const response = await apiClient.put('/config/falco', config);
    return response.data;
  }
  
  async getAIConfig() {
    const response = await apiClient.get('/config/ai');
    return response.data;
  }
  
  async updateAIConfig(config) {
    const response = await apiClient.put('/config/ai', config);
    return response.data;
  }
  
  async getSystemConfig() {
    const response = await apiClient.get('/config/system');
    return response.data;
  }
  
  async updateSystemConfig(config) {
    const response = await apiClient.put('/config/system', config);
    return response.data;
  }
  
  // ==================== 知识库管理 ====================
  
  async getKnowledgeBase(params = {}) {
    const response = await apiClient.get('/knowledge/documents', { params });
    return response.data;
  }
  
  async uploadKnowledgeDocument(file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await apiClient.post('/knowledge/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
  
  async deleteKnowledgeDocument(documentId) {
    const response = await apiClient.delete(`/knowledge/documents/${documentId}`);
    return response.data;
  }
  
  async searchKnowledge(query, params = {}) {
    const response = await apiClient.post('/knowledge/search', { query, ...params });
    return response.data;
  }
  
  // ==================== 报告生成 ====================
  
  async getReports(params = {}) {
    const response = await apiClient.get('/reports', { params });
    return response.data;
  }
  
  async generateReport(reportConfig) {
    const response = await apiClient.post('/reports/generate', reportConfig);
    return response.data;
  }
  
  async getReportStatus(reportId) {
    const response = await apiClient.get(`/reports/${reportId}/status`);
    return response.data;
  }
  
  async downloadReport(reportId, format = 'pdf') {
    const response = await apiClient.get(`/reports/${reportId}/download`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }
  
  async deleteReport(reportId) {
    const response = await apiClient.delete(`/reports/${reportId}`);
    return response.data;
  }
  
  // ==================== 仪表盘数据 ====================
  
  async getDashboardData() {
    const response = await apiClient.get('/dashboard/overview');
    return response.data;
  }
  
  async getSecurityEvents(params = {}) {
    const response = await apiClient.get('/monitor/events', { params });
    return response.data;
  }
  
  async getEvents(params = {}) {
    const response = await apiClient.get('/events', { params });
    return response.data;
  }
  
  // ==================== 统计数据 ====================
  
  async getDashboardStats(timeRange = '24h') {
    const response = await apiClient.get('/stats/dashboard', {
      params: { timeRange },
    });
    return response.data;
  }
  
  async getSecurityMetrics(params = {}) {
    const response = await apiClient.get('/stats/security', { params });
    return response.data;
  }
  
  async getPerformanceMetrics(params = {}) {
    const response = await apiClient.get('/stats/performance', { params });
    return response.data;
  }
  
  async getTrendAnalysis(metric, params = {}) {
    const response = await apiClient.get(`/stats/trends/${metric}`, { params });
    return response.data;
  }
  
  // ==================== 用户管理 ====================
  
  async getUsers(params = {}) {
    const response = await apiClient.get('/users', { params });
    return response.data;
  }
  
  async createUser(userData) {
    const response = await apiClient.post('/users', userData);
    return response.data;
  }
  
  async updateUser(userId, updates) {
    const response = await apiClient.put(`/users/${userId}`, updates);
    return response.data;
  }
  
  async deleteUser(userId) {
    const response = await apiClient.delete(`/users/${userId}`);
    return response.data;
  }
  
  async getUserPermissions(userId) {
    const response = await apiClient.get(`/users/${userId}/permissions`);
    return response.data;
  }
  
  async updateUserPermissions(userId, permissions) {
    const response = await apiClient.put(`/users/${userId}/permissions`, permissions);
    return response.data;
  }
  
  // ==================== 审计日志 ====================
  
  async getAuditLogs(params = {}) {
    const response = await apiClient.get('/audit/logs', { params });
    return response.data;
  }
  
  async exportAuditLogs(params = {}) {
    const response = await apiClient.get('/audit/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  }
  
  // ==================== 文件操作 ====================
  
  async uploadFile(file, path = '') {
    const formData = new FormData();
    formData.append('file', file);
    if (path) {
      formData.append('path', path);
    }
    
    const response = await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
  
  async downloadFile(fileId) {
    const response = await apiClient.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }
  
  async deleteFile(fileId) {
    const response = await apiClient.delete(`/files/${fileId}`);
    return response.data;
  }
}

// 创建API服务实例
export const apiService = new ApiService();

// 导出axios实例供其他模块使用
export { apiClient };

// 导出默认实例
export default apiService;