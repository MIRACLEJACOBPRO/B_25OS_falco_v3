/**
 * 仪表板页面
 * 显示系统概览、关键指标、实时状态等信息
 */

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Avatar,
  IconButton,
  Button,
  Chip,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
  AlertTitle,
  Paper,
  Stack,
  Badge,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import ConnectionStatus from '../components/common/ConnectionStatus';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Notifications as NotificationsIcon,
  Computer as SystemIcon,
  NetworkCheck as NetworkIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Speed as PerformanceIcon,
  Shield as ShieldIcon,
  BugReport as ThreatIcon,
  SmartToy as AIIcon,
  PlayArrow as ExecuteIcon,
  Assessment as ReportIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

import { apiService } from '../services/api';
import simpleWebSocketService from '../services/simple_websocket';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import ErrorBoundary from '../components/common/ErrorBoundary';

// 样式化组件
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[8],
  },
}));

const MetricCard = styled(Card)(({ theme, color = 'primary' }) => ({
  background: `linear-gradient(135deg, ${theme.palette[color].main} 0%, ${theme.palette[color].dark} 100%)`,
  color: theme.palette[color].contrastText,
  '& .MuiCardContent-root': {
    padding: theme.spacing(3),
  },
}));

const StatusIndicator = styled(Box)(({ theme, status }) => {
  // 状态映射：将后端返回的状态值映射到UI状态
  const mapStatus = (backendStatus) => {
    switch (backendStatus) {
      case 'running':
        return 'success';
      case 'stopped':
      case 'unhealthy':
        return 'error';
      case 'degraded':
      case 'warning':
        return 'warning';
      case 'unknown':
      default:
        return 'info';
    }
  };
  
  const mappedStatus = mapStatus(status);
  
  const colors = {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  };
  
  return {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: colors[mappedStatus] || colors.info,
    animation: mappedStatus === 'error' ? 'pulse 2s infinite' : 'none',
    '@keyframes pulse': {
      '0%': {
        boxShadow: `0 0 0 0 ${alpha(colors[mappedStatus] || colors.info, 0.7)}`,
      },
      '70%': {
        boxShadow: `0 0 0 10px ${alpha(colors[mappedStatus] || colors.info, 0)}`,
      },
      '100%': {
        boxShadow: `0 0 0 0 ${alpha(colors[mappedStatus] || colors.info, 0)}`,
      },
    },
  };
});

// 图表颜色配置
const CHART_COLORS = {
  primary: '#1976d2',
  secondary: '#dc004e',
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  info: '#0288d1',
};

// 系统指标卡片
function SystemMetricCard({ title, value, unit, icon: Icon, color, trend, loading }) {
  const theme = useTheme();
  
  return (
    <MetricCard color={color}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                `${value}${unit ? ` ${unit}` : ''}`
              )}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {title}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend > 0 ? (
                  <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5 }} />
                ) : (
                  <TrendingDownIcon sx={{ fontSize: 16, mr: 0.5 }} />
                )}
                <Typography variant="caption">
                  {Math.abs(trend)}% vs 昨日
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette.common.white, 0.2),
              width: 56,
              height: 56,
            }}
          >
            <Icon sx={{ fontSize: 28 }} />
          </Avatar>
        </Box>
      </CardContent>
    </MetricCard>
  );
}

// 安全事件列表
function SecurityEventsList({ events, loading }) {
  const navigate = useNavigate();
  
  const getEventIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <WarningIcon color="warning" />;
      case 'medium':
        return <NotificationsIcon color="info" />;
      default:
        return <SecurityIcon color="action" />;
    }
  };
  
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };
  
  if (loading) {
    return <LoadingSpinner type="list" />;
  }
  
  return (
    <List>
      {events.slice(0, 5).map((event, index) => (
        <React.Fragment key={event.id}>
          <ListItem
            button
            onClick={() => navigate(`/analysis/events/${event.id}`)}
          >
            <ListItemIcon>
              {getEventIcon(event.severity)}
            </ListItemIcon>
            <ListItemText
              primary={event.title}
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip
                    label={event.severity}
                    size="small"
                    color={getSeverityColor(event.severity)}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {event.timestamp}
                  </Typography>
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" size="small">
                <ViewIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
          {index < events.length - 1 && <Divider />}
        </React.Fragment>
      ))}
      
      {events.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            暂无安全事件
          </Typography>
        </Box>
      )}
      
      {events.length > 5 && (
        <ListItem button onClick={() => navigate('/analysis/events')}>
          <ListItemText
            primary={
              <Typography color="primary" align="center">
                查看全部 {events.length} 个事件
              </Typography>
            }
          />
        </ListItem>
      )}
    </List>
  );
}

// 系统状态组件
function SystemStatus({ status, loading }) {
  if (loading) {
    return <LoadingSpinner type="content" />;
  }
  
  // 从API响应中提取实际的状态数据
  const statusData = status?.data || status || {};
  
  const services = [
    { name: 'Falco 引擎', status: statusData?.falco || 'unknown', description: '实时监控服务' },
    { name: 'AI 分析', status: statusData?.ai || 'unknown', description: '智能威胁分析' },
    { name: '数据库', status: statusData?.database || 'unknown', description: 'PostgreSQL 数据库' },
    { name: '消息队列', status: statusData?.queue || 'unknown', description: 'Redis 消息队列' },
    { name: 'Web 服务', status: statusData?.web || 'unknown', description: 'HTTP API 服务' },
  ];
  
  // 添加调试信息（开发环境下）
  if (process.env.NODE_ENV === 'development') {
    console.log('SystemStatus - Raw status:', status);
    console.log('SystemStatus - Extracted statusData:', statusData);
    console.log('SystemStatus - Services:', services);
  }
  
  return (
    <List>
      {services.map((service, index) => (
        <React.Fragment key={service.name}>
          <ListItem>
            <ListItemIcon>
              <StatusIndicator status={service.status} />
            </ListItemIcon>
            <ListItemText
              primary={service.name}
              secondary={service.description}
            />
            <ListItemSecondaryAction>
              <Chip
                label={service.status === 'running' ? '运行中' : service.status === 'stopped' ? '已停止' : '未知'}
                color={service.status === 'running' ? 'success' : service.status === 'stopped' ? 'error' : 'default'}
                size="small"
              />
            </ListItemSecondaryAction>
          </ListItem>
          {index < services.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </List>
  );
}

// 威胁趋势图表
function ThreatTrendChart({ data, loading }) {
  if (loading) {
    return <LoadingSpinner type="chart" />;
  }
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <RechartsTooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="threats"
          stackId="1"
          stroke={CHART_COLORS.error}
          fill={CHART_COLORS.error}
          name="威胁事件"
        />
        <Area
          type="monotone"
          dataKey="blocked"
          stackId="1"
          stroke={CHART_COLORS.success}
          fill={CHART_COLORS.success}
          name="已阻止"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// 性能指标图表
function PerformanceChart({ data, loading }) {
  if (loading) {
    return <LoadingSpinner type="chart" />;
  }
  
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <RechartsTooltip />
        <Line
          type="monotone"
          dataKey="cpu"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={false}
          name="CPU 使用率"
        />
        <Line
          type="monotone"
          dataKey="memory"
          stroke={CHART_COLORS.secondary}
          strokeWidth={2}
          dot={false}
          name="内存使用率"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// 快速操作按钮
function QuickActions() {
  const navigate = useNavigate();
  
  const actions = [
    {
      label: '实时监控',
      icon: TimelineIcon,
      color: 'primary',
      path: '/monitoring',
    },
    {
      label: '图谱分析',
      icon: NetworkIcon,
      color: 'secondary',
      path: '/graph',
    },
    {
      label: 'AI 分析',
      icon: AIIcon,
      color: 'info',
      path: '/analysis/ai',
    },
    {
      label: '生成报告',
      icon: ReportIcon,
      color: 'success',
      path: '/reports',
    },
  ];
  
  return (
    <Grid container spacing={2}>
      {actions.map((action) => (
        <Grid item xs={6} sm={3} key={action.label}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<action.icon />}
            onClick={() => navigate(action.path)}
            sx={{
              py: 2,
              flexDirection: 'column',
              gap: 1,
              borderColor: (theme) => theme.palette[action.color].main,
              color: (theme) => theme.palette[action.color].main,
              '&:hover': {
                borderColor: (theme) => theme.palette[action.color].dark,
                backgroundColor: (theme) => alpha(theme.palette[action.color].main, 0.04),
              },
            }}
          >
            {action.label}
          </Button>
        </Grid>
      ))}
    </Grid>
  );
}

// 主仪表板组件
export default function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = React.useState(false);
  
  // WebSocket连接状态管理
  React.useEffect(() => {
    const updateConnectionStatus = () => {
      setIsConnected(simpleWebSocketService.isConnected());
    };
    
    // 监听连接状态变化
    const unsubscribeConnect = simpleWebSocketService.on('connect_success', updateConnectionStatus);
    const unsubscribeDisconnect = simpleWebSocketService.on('disconnect', updateConnectionStatus);
    const unsubscribeError = simpleWebSocketService.on('error', updateConnectionStatus);
    
    // 初始连接
    simpleWebSocketService.connect().catch(console.error);
    updateConnectionStatus();
    
    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
    };
  }, []);
  
  // 获取仪表板数据
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: apiService.getDashboardData,
    refetchInterval: 30000, // 30秒刷新一次
  });
  
  // 获取实时指标
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: apiService.getSystemMetrics,
    refetchInterval: 5000, // 5秒刷新一次
  });
  
  // 获取安全事件
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['recent-events'],
    queryFn: () => apiService.getSecurityEvents({ limit: 10 }),
    refetchInterval: 10000, // 10秒刷新一次
  });
  
  // 获取系统状态
  const { data: systemStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['system-status'],
    queryFn: apiService.getSystemStatus,
    refetchInterval: 15000, // 15秒刷新一次
  });
  
  const handleRefresh = () => {
    refetch();
    toast.success('数据已刷新');
  };
  
  if (error) {
    return (
      <Alert severity="error">
        <AlertTitle>加载失败</AlertTitle>
        无法加载仪表板数据，请稍后重试。
      </Alert>
    );
  }
  
  return (
    <ErrorBoundary>
      <Box sx={{ flexGrow: 1 }}>
        {/* 页面标题和操作 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              欢迎回来，{user?.name || '用户'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              系统运行状态良好，共检测到 {dashboardData?.totalEvents || 0} 个安全事件
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="刷新数据">
              <IconButton onClick={handleRefresh} disabled={isLoading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Button
              variant="contained"
              startIcon={<SettingsIcon />}
              onClick={() => navigate('/settings')}
            >
              系统设置
            </Button>
          </Box>
        </Box>
        
        {/* 连接状态显示 */}
        <ConnectionStatus isConnected={isConnected} />
        
        {/* 系统指标卡片 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <SystemMetricCard
              title="安全事件"
              value={metrics?.data?.securityEvents || 0}
              icon={SecurityIcon}
              color="error"
              trend={metrics?.data?.securityEventsTrend}
              loading={metricsLoading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <SystemMetricCard
              title="威胁阻止"
              value={metrics?.data?.threatsBlocked || 0}
              icon={ShieldIcon}
              color="success"
              trend={metrics?.data?.threatsBlockedTrend}
              loading={metricsLoading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <SystemMetricCard
              title="CPU 使用率"
              value={metrics?.data?.cpuUsage || 0}
              unit="%"
              icon={PerformanceIcon}
              color="info"
              loading={metricsLoading}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <SystemMetricCard
              title="内存使用率"
              value={metrics?.data?.memoryUsage || 0}
              unit="%"
              icon={MemoryIcon}
              color="warning"
              loading={metricsLoading}
            />
          </Grid>
        </Grid>
        
        {/* 主要内容区域 */}
        <Grid container spacing={3}>
          {/* 威胁趋势图表 */}
          <Grid item xs={12} lg={8}>
            <StyledCard>
              <CardHeader
                title="威胁趋势分析"
                subheader="过去24小时的威胁检测和阻止情况"
                action={
                  <IconButton>
                    <MoreVertIcon />
                  </IconButton>
                }
              />
              <CardContent>
                <ThreatTrendChart
                  data={dashboardData?.threatTrend || []}
                  loading={isLoading}
                />
              </CardContent>
            </StyledCard>
          </Grid>
          
          {/* 系统状态 */}
          <Grid item xs={12} lg={4}>
            <StyledCard>
              <CardHeader
                title="系统状态"
                subheader="各服务组件运行状态"
              />
              <CardContent sx={{ pt: 0 }}>
                <SystemStatus
                  status={systemStatus}
                  loading={statusLoading}
                />
              </CardContent>
            </StyledCard>
          </Grid>
          
          {/* 最近安全事件 */}
          <Grid item xs={12} lg={6}>
            <StyledCard>
              <CardHeader
                title="最近安全事件"
                subheader="需要关注的安全事件"
                action={
                  <Button
                    size="small"
                    onClick={() => navigate('/analysis/events')}
                  >
                    查看全部
                  </Button>
                }
              />
              <CardContent sx={{ pt: 0 }}>
                <SecurityEventsList
                  events={events?.data || []}
                  loading={eventsLoading}
                />
              </CardContent>
            </StyledCard>
          </Grid>
          
          {/* 性能监控 */}
          <Grid item xs={12} lg={6}>
            <StyledCard>
              <CardHeader
                title="性能监控"
                subheader="系统资源使用情况"
              />
              <CardContent>
                <PerformanceChart
                  data={dashboardData?.performance || []}
                  loading={isLoading}
                />
              </CardContent>
            </StyledCard>
          </Grid>
          
          {/* 快速操作 */}
          <Grid item xs={12}>
            <StyledCard>
              <CardHeader
                title="快速操作"
                subheader="常用功能快速入口"
              />
              <CardContent>
                <QuickActions />
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>
      </Box>
    </ErrorBoundary>
  );
}