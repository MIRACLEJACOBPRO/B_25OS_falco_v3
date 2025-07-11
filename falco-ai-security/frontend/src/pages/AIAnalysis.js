/**
 * AI分析页面
 * 提供AI驱动的安全分析和智能推荐
 */

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  AlertTitle,
  ButtonGroup,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import ConnectionStatus from '../components/common/ConnectionStatus';
import {
  Psychology as AIIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Lightbulb as LightbulbIcon,
  AutoFixHigh as AutoFixIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService } from '../services/api';
import DataTable from '../components/common/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import ErrorBoundary from '../components/common/ErrorBoundary';

// AI分析状态配置
const ANALYSIS_STATUS = {
  pending: {
    label: '等待中',
    color: 'default',
    icon: AnalyticsIcon,
  },
  running: {
    label: '分析中',
    color: 'info',
    icon: AIIcon,
  },
  completed: {
    label: '已完成',
    color: 'success',
    icon: CheckCircleIcon,
  },
  failed: {
    label: '失败',
    color: 'error',
    icon: WarningIcon,
  },
};

// AI分析类型配置
const ANALYSIS_TYPES = {
  threat_detection: { label: '威胁检测', color: '#f44336' },
  behavior_analysis: { label: '行为分析', color: '#ff9800' },
  anomaly_detection: { label: '异常检测', color: '#e91e63' },
  risk_assessment: { label: '风险评估', color: '#9c27b0' },
  incident_correlation: { label: '事件关联', color: '#673ab7' },
  predictive_analysis: { label: '预测分析', color: '#3f51b5' },
};

// 风险等级配置
const RISK_LEVELS = {
  critical: { label: '严重', color: 'error', score: 90 },
  high: { label: '高危', color: 'warning', score: 70 },
  medium: { label: '中等', color: 'info', score: 50 },
  low: { label: '低危', color: 'success', score: 30 },
};

// 模拟AI分析数据生成器
function generateMockAIAnalysis() {
  const analyses = [];
  const analysisTypes = Object.keys(ANALYSIS_TYPES);
  const statuses = Object.keys(ANALYSIS_STATUS);
  const riskLevels = Object.keys(RISK_LEVELS);
  
  for (let i = 0; i < 20; i++) {
    const analysisType = analysisTypes[Math.floor(Math.random() * analysisTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    
    analyses.push({
      id: `ai_analysis_${Date.now()}_${i}`,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      type: analysisType,
      status,
      title: `${ANALYSIS_TYPES[analysisType].label}报告`,
      description: `基于AI算法的${ANALYSIS_TYPES[analysisType].label}结果`,
      riskLevel,
      confidence: Math.floor(Math.random() * 40) + 60, // 60-100%
      duration: Math.floor(Math.random() * 300) + 30, // 30-330秒
      findings: Math.floor(Math.random() * 10) + 1,
      recommendations: Math.floor(Math.random() * 5) + 1,
      details: {
        eventsAnalyzed: Math.floor(Math.random() * 1000) + 100,
        patternsFound: Math.floor(Math.random() * 20) + 1,
        anomaliesDetected: Math.floor(Math.random() * 10),
        modelVersion: '2.1.0',
      },
    });
  }
  
  return analyses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// 模拟AI推荐数据生成器
function generateMockAIRecommendations() {
  const recommendations = [
    {
      id: 'rec_1',
      type: 'security_policy',
      title: '建议更新安全策略',
      description: '检测到多个权限提升事件，建议加强访问控制策略',
      priority: 'high',
      confidence: 85,
      impact: 'medium',
      effort: 'low',
      category: '策略优化',
    },
    {
      id: 'rec_2',
      type: 'monitoring_rule',
      title: '添加新的监控规则',
      description: '发现新的攻击模式，建议添加相应的Falco规则',
      priority: 'medium',
      confidence: 78,
      impact: 'high',
      effort: 'medium',
      category: '规则配置',
    },
    {
      id: 'rec_3',
      type: 'system_hardening',
      title: '系统加固建议',
      description: '检测到潜在的系统漏洞，建议进行系统加固',
      priority: 'critical',
      confidence: 92,
      impact: 'high',
      effort: 'high',
      category: '系统安全',
    },
  ];
  
  return recommendations;
}

// AI分析统计组件
function AIAnalysisMetrics({ data, loading }) {
  const metrics = React.useMemo(() => {
    if (!data || loading || !Array.isArray(data)) return {};
    
    const total = data.length;
    const byStatus = {};
    const byRisk = {};
    
    data.forEach(analysis => {
      if (analysis && typeof analysis === 'object') {
        byStatus[analysis.status] = (byStatus[analysis.status] || 0) + 1;
        byRisk[analysis.riskLevel] = (byRisk[analysis.riskLevel] || 0) + 1;
      }
    });
    
    const avgConfidence = data.length > 0 
      ? Math.round(data.reduce((sum, a) => {
          // 处理置信度字段，可能是数字、字符串或confidence_score字段
          const confidence = a.confidence_score || 
                           (typeof a.confidence === 'number' ? a.confidence : 
                            (typeof a.confidence === 'string' ? parseFloat(a.confidence) || 0 : 0));
          return sum + (confidence * 100); // 转换为百分比
        }, 0) / data.length)
      : 0;
    
    return {
      total,
      completed: byStatus.completed || 0,
      running: byStatus.running || 0,
      critical: byRisk.critical || 0,
      avgConfidence,
    };
  }, [data, loading]);
  
  if (loading) {
    return <LoadingSpinner type="metrics" />;
  }
  
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AIIcon color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" component="div">
                  {metrics.total || 0}
                </Typography>
                <Typography color="text.secondary">
                  总分析任务
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" component="div" color="success.main">
                  {metrics.completed || 0}
                </Typography>
                <Typography color="text.secondary">
                  已完成
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WarningIcon color="error" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" component="div" color="error.main">
                  {metrics.critical || 0}
                </Typography>
                <Typography color="text.secondary">
                  严重风险
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUpIcon color="info" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" component="div" color="info.main">
                  {metrics.avgConfidence || 0}%
                </Typography>
                <Typography color="text.secondary">
                  平均置信度
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// AI推荐组件
function AIRecommendations({ recommendations, onExecute }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };
  
  // 确保 recommendations 是数组
  const validRecommendations = Array.isArray(recommendations) ? recommendations : [];
  
  return (
    <Card>
      <CardHeader
        title="AI智能推荐"
        avatar={<LightbulbIcon color="warning" />}
      />
      <CardContent>
        {validRecommendations.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
            暂无AI推荐
          </Typography>
        ) : (
          <List>
            {validRecommendations.map((rec, index) => (
            <React.Fragment key={rec.id}>
              <ListItem
                secondaryAction={
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PlayIcon />}
                    onClick={() => onExecute(rec)}
                  >
                    执行
                  </Button>
                }
              >
                <ListItemIcon>
                  <AutoFixIcon color={getPriorityColor(rec.priority)} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {rec.title}
                      </Typography>
                      <Chip
                        label={rec.priority}
                        color={getPriorityColor(rec.priority)}
                        size="small"
                      />
                      <Chip
                        label={`${Math.round((rec.confidence_score || rec.confidence || 0) * (rec.confidence > 1 ? 1 : 100))}%`}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {rec.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        类别: {rec.category} | 影响: {rec.impact} | 工作量: {rec.effort}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              {index < validRecommendations.length - 1 && <Divider />}
            </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

// 主AI分析页面组件
export default function AIAnalysis() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  
  // 状态管理
  const [filters, setFilters] = React.useState({
    type: '',
    status: '',
    riskLevel: '',
    search: '',
  });
  const [triggerDialogOpen, setTriggerDialogOpen] = React.useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = React.useState('');
  
  // 获取AI分析数据
  const { data: analyses, isLoading: analysesLoading, refetch } = useQuery({
    queryKey: ['ai-analyses', filters],
    queryFn: async () => {
      try {
        const response = await apiService.getAIAnalysis(filters);
        // 检查响应格式，如果是API格式则提取data字段，否则直接返回
        return response && response.success ? response.data : response;
      } catch (error) {
        console.warn('API调用失败，使用模拟数据:', error);
        return generateMockAIAnalysis();
      }
    },
    refetchInterval: 30000,
  });
  
  // 获取AI推荐数据
  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['ai-recommendations'],
    queryFn: async () => {
      try {
        const response = await apiService.getAIRecommendations();
        // 检查响应格式，如果是API格式则提取data字段，否则直接返回
        return response && response.success ? response.data : response;
      } catch (error) {
        console.warn('API调用失败，使用模拟数据:', error);
        return generateMockAIRecommendations();
      }
    },
    refetchInterval: 60000,
  });
  
  // 触发AI分析的mutation
  const triggerAnalysisMutation = useMutation({
    mutationFn: (analysisType) => apiService.triggerAIAnalysis({ type: analysisType }),
    onSuccess: () => {
      toast.success('AI分析已启动');
      setTriggerDialogOpen(false);
      queryClient.invalidateQueries(['ai-analyses']);
    },
    onError: (error) => {
      console.error('触发AI分析失败:', error);
      toast.error('启动AI分析失败');
    },
  });
  
  // 执行AI推荐的mutation
  const executeRecommendationMutation = useMutation({
    mutationFn: (recommendation) => apiService.executeAIRecommendation(recommendation.id),
    onSuccess: () => {
      toast.success('推荐已执行');
      queryClient.invalidateQueries(['ai-recommendations']);
    },
    onError: (error) => {
      console.error('执行推荐失败:', error);
      toast.error('执行推荐失败');
    },
  });
  
  // 事件处理函数
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };
  
  const handleTriggerAnalysis = () => {
    if (!selectedAnalysisType) {
      toast.error('请选择分析类型');
      return;
    }
    triggerAnalysisMutation.mutate(selectedAnalysisType);
  };
  
  const handleExecuteRecommendation = (recommendation) => {
    executeRecommendationMutation.mutate(recommendation);
  };
  
  const handleExportAnalyses = () => {
    if (!analyses) return;
    
    const dataStr = JSON.stringify(analyses, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-analyses-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('AI分析数据已导出');
  };
  
  // 表格列配置
  const analysisColumns = [
    {
      id: 'timestamp',
      label: '时间',
      format: (value) => format(new Date(value), 'MM-dd HH:mm:ss', { locale: zhCN }),
      width: 120,
    },
    {
      id: 'title',
      label: '分析标题',
      width: 200,
    },
    {
      id: 'type',
      label: '分析类型',
      format: (value) => (
        <Chip
          label={ANALYSIS_TYPES[value]?.label || value}
          size="small"
          variant="outlined"
        />
      ),
      width: 120,
    },
    {
      id: 'status',
      label: '状态',
      format: (value) => (
        <Chip
          label={ANALYSIS_STATUS[value]?.label || value}
          color={ANALYSIS_STATUS[value]?.color || 'default'}
          size="small"
        />
      ),
      width: 100,
    },
    {
      id: 'riskLevel',
      label: '风险等级',
      format: (value) => (
        <Chip
          label={RISK_LEVELS[value]?.label || value}
          color={RISK_LEVELS[value]?.color || 'default'}
          size="small"
        />
      ),
      width: 100,
    },
    {
      id: 'confidence',
      label: '置信度',
      format: (value, row) => {
        // 处理置信度字段，可能是数字、字符串或confidence_score字段
        const confidence = row.confidence_score || 
                         (typeof value === 'number' ? value : 
                          (typeof value === 'string' ? parseFloat(value) || 0 : 0));
        const confidencePercent = confidence > 1 ? confidence : confidence * 100;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={confidencePercent}
              sx={{ width: 60, height: 6 }}
            />
            <Typography variant="caption">{Math.round(confidencePercent)}%</Typography>
          </Box>
        );
      },
      width: 120,
    },
    {
      id: 'findings',
      label: '发现',
      format: (value, row) => {
        // 处理发现字段，可能是数组或数字
        const findingsCount = Array.isArray(row.findings) ? row.findings.length : (value || 0);
        return (
          <Chip
            label={`${findingsCount} 个`}
            size="small"
            color={findingsCount > 0 ? 'warning' : 'default'}
          />
        );
      },
      width: 80,
    },
  ];
  
  return (
    <ErrorBoundary>
      <Box sx={{ flexGrow: 1 }}>
        {/* 页面标题 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              AI分析
            </Typography>
            <Typography variant="body1" color="text.secondary">
              AI驱动的安全分析和智能推荐
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<AIIcon />}
              variant="contained"
              onClick={() => setTriggerDialogOpen(true)}
            >
              启动分析
            </Button>
            
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={analysesLoading}
            >
              刷新
            </Button>
            
            <Button
              startIcon={<DownloadIcon />}
              onClick={handleExportAnalyses}
              disabled={!analyses}
            >
              导出
            </Button>
          </Box>
        </Box>
        
        {/* 连接状态显示 */}
        <ConnectionStatus isConnected={isConnected} />
        
        {/* 过滤器面板 */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              过滤器
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>分析类型</InputLabel>
                  <Select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    label="分析类型"
                  >
                    <MenuItem value="">全部</MenuItem>
                    {Object.entries(ANALYSIS_TYPES).map(([key, config]) => (
                      <MenuItem key={key} value={key}>
                        {config.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label="状态"
                  >
                    <MenuItem value="">全部</MenuItem>
                    {Object.entries(ANALYSIS_STATUS).map(([key, config]) => (
                      <MenuItem key={key} value={key}>
                        {config.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>风险等级</InputLabel>
                  <Select
                    value={filters.riskLevel}
                    onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
                    label="风险等级"
                  >
                    <MenuItem value="">全部</MenuItem>
                    {Object.entries(RISK_LEVELS).map(([key, config]) => (
                      <MenuItem key={key} value={key}>
                        {config.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="搜索分析"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {/* AI分析统计指标 */}
        <Box sx={{ mb: 3 }}>
          <AIAnalysisMetrics
            data={analyses}
            loading={analysesLoading}
          />
        </Box>
        
        <Grid container spacing={3}>
          {/* AI分析列表 */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardHeader
                title="AI分析列表"
                action={
                  <Chip
                    label={`${analyses?.length || 0} 个分析`}
                    color="primary"
                    size="small"
                  />
                }
              />
              <CardContent sx={{ p: 0 }}>
                <DataTable
                  data={analyses || []}
                  columns={analysisColumns}
                  loading={analysesLoading}
                  searchable
                  filterable
                  sortable
                  pagination
                />
              </CardContent>
            </Card>
          </Grid>
          
          {/* AI推荐 */}
          <Grid item xs={12} lg={4}>
            <AIRecommendations
              recommendations={recommendations || []}
              onExecute={handleExecuteRecommendation}
            />
          </Grid>
        </Grid>
        
        {/* 触发分析对话框 */}
        <Dialog
          open={triggerDialogOpen}
          onClose={() => setTriggerDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>启动AI分析</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>选择分析类型</InputLabel>
              <Select
                value={selectedAnalysisType}
                onChange={(e) => setSelectedAnalysisType(e.target.value)}
                label="选择分析类型"
              >
                {Object.entries(ANALYSIS_TYPES).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTriggerDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleTriggerAnalysis}
              variant="contained"
              disabled={triggerAnalysisMutation.isLoading}
            >
              {triggerAnalysisMutation.isLoading ? '启动中...' : '启动分析'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ErrorBoundary>
  );
}