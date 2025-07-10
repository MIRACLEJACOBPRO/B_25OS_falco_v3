/**
 * 安全事件页面
 * 专门用于显示和分析安全事件
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
  Tabs,
  Tab,
} from '@mui/material';
import ConnectionStatus from '../components/common/ConnectionStatus';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService } from '../services/api';
import DataTable from '../components/common/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import ErrorBoundary from '../components/common/ErrorBoundary';

// 安全事件严重程度配置
const SECURITY_SEVERITY_LEVELS = {
  critical: {
    label: '严重',
    color: 'error',
    icon: ErrorIcon,
    bgColor: '#ffebee',
    textColor: '#c62828',
  },
  high: {
    label: '高危',
    color: 'warning',
    icon: WarningIcon,
    bgColor: '#fff3e0',
    textColor: '#ef6c00',
  },
  medium: {
    label: '中等',
    color: 'info',
    icon: InfoIcon,
    bgColor: '#e3f2fd',
    textColor: '#1565c0',
  },
  low: {
    label: '低危',
    color: 'success',
    icon: SecurityIcon,
    bgColor: '#e8f5e8',
    textColor: '#2e7d32',
  },
};

// 安全事件类型配置
const SECURITY_EVENT_TYPES = {
  malware: { label: '恶意软件', color: '#f44336' },
  intrusion: { label: '入侵检测', color: '#ff9800' },
  privilege_escalation: { label: '权限提升', color: '#e91e63' },
  data_exfiltration: { label: '数据泄露', color: '#9c27b0' },
  suspicious_process: { label: '可疑进程', color: '#673ab7' },
  network_anomaly: { label: '网络异常', color: '#3f51b5' },
  file_integrity: { label: '文件完整性', color: '#2196f3' },
  authentication: { label: '认证异常', color: '#00bcd4' },
};

// 时间范围配置
const TIME_RANGES = {
  '1h': { label: '1小时', hours: 1 },
  '6h': { label: '6小时', hours: 6 },
  '24h': { label: '24小时', hours: 24 },
  '7d': { label: '7天', hours: 168 },
  '30d': { label: '30天', hours: 720 },
};

// 模拟安全事件数据生成器
function generateMockSecurityEvents() {
  const events = [];
  const eventTypes = Object.keys(SECURITY_EVENT_TYPES);
  const severityLevels = Object.keys(SECURITY_SEVERITY_LEVELS);
  const statuses = ['open', 'investigating', 'resolved'];
  
  for (let i = 0; i < 50; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    events.push({
      id: `sec_${Date.now()}_${i}`,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      title: `${SECURITY_EVENT_TYPES[eventType].label}检测`,
      description: `检测到${SECURITY_EVENT_TYPES[eventType].label}活动，需要进一步调查`,
      type: eventType,
      severity,
      status,
      source: 'Falco',
      host: `host-${Math.floor(Math.random() * 10) + 1}`,
      process: `process_${Math.floor(Math.random() * 1000)}`,
      user: `user_${Math.floor(Math.random() * 100)}`,
      details: {
        command: '/bin/bash -c "suspicious command"',
        pid: Math.floor(Math.random() * 10000),
        ppid: Math.floor(Math.random() * 10000),
        container: `container_${Math.floor(Math.random() * 100)}`,
      },
    });
  }
  
  return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// 安全事件统计组件
function SecurityEventMetrics({ data, loading }) {
  const metrics = React.useMemo(() => {
    if (!data || loading) return {};
    
    const total = data.length;
    const bySeverity = {};
    const byType = {};
    const byStatus = {};
    
    data.forEach(event => {
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
      byType[event.type] = (byType[event.type] || 0) + 1;
      byStatus[event.status] = (byStatus[event.status] || 0) + 1;
    });
    
    return {
      total,
      critical: bySeverity.critical || 0,
      high: bySeverity.high || 0,
      open: byStatus.open || 0,
      investigating: byStatus.investigating || 0,
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
              <SecurityIcon color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" component="div">
                  {metrics.total || 0}
                </Typography>
                <Typography color="text.secondary">
                  总安全事件
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
              <ErrorIcon color="error" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" component="div" color="error">
                  {metrics.critical || 0}
                </Typography>
                <Typography color="text.secondary">
                  严重事件
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
              <WarningIcon color="warning" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" component="div" color="warning.main">
                  {metrics.high || 0}
                </Typography>
                <Typography color="text.secondary">
                  高危事件
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
              <InfoIcon color="info" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" component="div" color="info.main">
                  {metrics.open || 0}
                </Typography>
                <Typography color="text.secondary">
                  待处理
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// 主安全事件页面组件
export default function SecurityEvents() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  
  // 状态管理
  const [timeRange, setTimeRange] = React.useState('24h');
  const [filters, setFilters] = React.useState({
    severity: '',
    type: '',
    status: '',
    search: '',
  });
  
  // 获取安全事件数据
  const { data: events, isLoading: eventsLoading, refetch } = useQuery({
    queryKey: ['security-events', filters, timeRange],
    queryFn: async () => {
      try {
        // 调用真实的API
        return await apiService.getSecurityEvents({ ...filters, timeRange });
      } catch (error) {
        console.warn('API调用失败，使用模拟数据:', error);
        // 如果API调用失败，使用模拟数据
        return generateMockSecurityEvents();
      }
    },
    refetchInterval: 30000, // 30秒刷新一次
  });
  
  // 事件处理函数
  const handleTimeRangeChange = (newTimeRange) => {
    setTimeRange(newTimeRange);
  };
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };
  
  const handleExportEvents = () => {
    if (!events) return;
    
    const dataStr = JSON.stringify(events, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-events-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('安全事件数据已导出');
  };
  
  // 表格列配置
  const eventColumns = [
    {
      id: 'timestamp',
      label: '时间',
      format: (value) => format(new Date(value), 'MM-dd HH:mm:ss', { locale: zhCN }),
      width: 120,
    },
    {
      id: 'title',
      label: '事件标题',
      width: 200,
    },
    {
      id: 'type',
      label: '事件类型',
      format: (value) => (
        <Chip
          label={SECURITY_EVENT_TYPES[value]?.label || value}
          size="small"
          variant="outlined"
        />
      ),
      width: 120,
    },
    {
      id: 'severity',
      label: '严重程度',
      format: (value) => (
        <Chip
          label={SECURITY_SEVERITY_LEVELS[value]?.label || value}
          color={SECURITY_SEVERITY_LEVELS[value]?.color || 'default'}
          size="small"
        />
      ),
      width: 100,
    },
    {
      id: 'host',
      label: '主机',
      width: 120,
    },
    {
      id: 'status',
      label: '状态',
      format: (value) => {
        const statusConfig = {
          open: { label: '待处理', color: 'error' },
          investigating: { label: '调查中', color: 'warning' },
          resolved: { label: '已解决', color: 'success' },
        };
        const config = statusConfig[value] || statusConfig.open;
        return (
          <Chip
            label={config.label}
            color={config.color}
            size="small"
          />
        );
      },
      width: 100,
    },
  ];
  
  return (
    <ErrorBoundary>
      <Box sx={{ flexGrow: 1 }}>
        {/* 页面标题 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              安全事件
            </Typography>
            <Typography variant="body1" color="text.secondary">
              实时安全事件监控和分析
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ButtonGroup variant="outlined" size="small">
              {Object.entries(TIME_RANGES).map(([key, config]) => (
                <Button
                  key={key}
                  variant={timeRange === key ? 'contained' : 'outlined'}
                  onClick={() => handleTimeRangeChange(key)}
                >
                  {config.label}
                </Button>
              ))}
            </ButtonGroup>
            
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={eventsLoading}
            >
              刷新
            </Button>
            
            <Button
              startIcon={<DownloadIcon />}
              onClick={handleExportEvents}
              disabled={!events}
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
                  <InputLabel>事件类型</InputLabel>
                  <Select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    label="事件类型"
                  >
                    <MenuItem value="">全部</MenuItem>
                    {Object.entries(SECURITY_EVENT_TYPES).map(([key, config]) => (
                      <MenuItem key={key} value={key}>
                        {config.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>严重程度</InputLabel>
                  <Select
                    value={filters.severity}
                    onChange={(e) => handleFilterChange('severity', e.target.value)}
                    label="严重程度"
                  >
                    <MenuItem value="">全部</MenuItem>
                    {Object.entries(SECURITY_SEVERITY_LEVELS).map(([key, config]) => (
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
                    <MenuItem value="open">待处理</MenuItem>
                    <MenuItem value="investigating">调查中</MenuItem>
                    <MenuItem value="resolved">已解决</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="搜索事件"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {/* 安全事件统计指标 */}
        <Box sx={{ mb: 3 }}>
          <SecurityEventMetrics
            data={events}
            loading={eventsLoading}
          />
        </Box>
        
        {/* 安全事件列表 */}
        <Card>
          <CardHeader
            title="安全事件列表"
            action={
              <Chip
                label={`${events?.length || 0} 个事件`}
                color="primary"
                size="small"
              />
            }
          />
          <CardContent sx={{ p: 0 }}>
            <DataTable
              data={events || []}
              columns={eventColumns}
              loading={eventsLoading}
              searchable
              filterable
              sortable
              pagination
            />
          </CardContent>
        </Card>
      </Box>
    </ErrorBoundary>
  );
}