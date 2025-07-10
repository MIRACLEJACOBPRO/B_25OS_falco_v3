/**
 * 实时监控页面
 * 显示实时的安全事件流、系统状态和监控数据
 */

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  IconButton,
  Button,
  Chip,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
  AlertTitle,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  alpha,
} from '@mui/material';
import ConnectionStatus from '../components/common/ConnectionStatus';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Timeline as TimelineIcon,
  Computer as SystemIcon,
  NetworkCheck as NetworkIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Speed as PerformanceIcon,
  Visibility as ViewIcon,
  Block as BlockIcon,
  NotificationImportant as AlertIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { styled } from '@mui/material/styles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { apiService } from '../services/api';
import simpleWebSocketService, { WS_EVENTS } from '../services/simple_websocket';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

// 样式化组件
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const EventCard = styled(Card)(({ theme, severity }) => {
  const colors = {
    critical: theme.palette.error.main,
    high: theme.palette.warning.main,
    medium: theme.palette.info.main,
    low: theme.palette.success.main,
  };
  
  return {
    marginBottom: theme.spacing(1),
    borderLeft: `4px solid ${colors[severity] || colors.low}`,
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateX(4px)',
      boxShadow: theme.shadows[4],
    },
  };
});

const StatusIndicator = styled(Box)(({ theme, status }) => {
  const colors = {
    running: theme.palette.success.main,
    stopped: theme.palette.error.main,
    warning: theme.palette.warning.main,
    unknown: theme.palette.grey[500],
  };
  
  return {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: colors[status] || colors.unknown,
    animation: status === 'running' ? 'pulse 2s infinite' : 'none',
    '@keyframes pulse': {
      '0%': {
        boxShadow: `0 0 0 0 ${alpha(colors[status] || colors.unknown, 0.7)}`,
      },
      '70%': {
        boxShadow: `0 0 0 10px ${alpha(colors[status] || colors.unknown, 0)}`,
      },
      '100%': {
        boxShadow: `0 0 0 0 ${alpha(colors[status] || colors.unknown, 0)}`,
      },
    },
  };
});

const ControlPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  flexWrap: 'wrap',
}));

// 事件严重程度配置
const SEVERITY_LEVELS = {
  critical: { label: '严重', color: 'error', icon: ErrorIcon },
  high: { label: '高', color: 'warning', icon: WarningIcon },
  medium: { label: '中', color: 'info', icon: InfoIcon },
  low: { label: '低', color: 'success', icon: SuccessIcon },
};

// 事件类型配置
const EVENT_CATEGORIES = {
  security: { label: '安全事件', icon: SecurityIcon },
  system: { label: '系统事件', icon: SystemIcon },
  network: { label: '网络事件', icon: NetworkIcon },
  performance: { label: '性能事件', icon: PerformanceIcon },
};

// 实时事件流组件
function RealTimeEventStream({ events, loading, paused, onEventClick }) {
  const theme = useTheme();
  const [autoScroll, setAutoScroll] = React.useState(true);
  const listRef = React.useRef(null);
  
  React.useEffect(() => {
    if (autoScroll && listRef.current && !paused) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events, autoScroll, paused]);
  
  const getSeverityIcon = (severity) => {
    const config = SEVERITY_LEVELS[severity] || SEVERITY_LEVELS.low;
    const IconComponent = config.icon;
    return <IconComponent color={config.color} />;
  };
  
  const formatTimestamp = (timestamp) => {
    return format(new Date(timestamp), 'HH:mm:ss', { locale: zhCN });
  };
  
  if (loading) {
    return <LoadingSpinner type="list" />;
  }
  
  return (
    <Box sx={{ height: 400, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">
          实时事件流 ({events.length} 个事件)
        </Typography>
        
        <FormControlLabel
          control={
            <Switch
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              size="small"
            />
          }
          label="自动滚动"
        />
      </Box>
      
      <Box
        ref={listRef}
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          p: 1,
        }}
      >
        {events.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {paused ? '监控已暂停' : '等待事件...'}
            </Typography>
          </Box>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              severity={event.severity}
              onClick={() => onEventClick(event)}
              sx={{ cursor: 'pointer' }}
            >
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getSeverityIcon(event.severity)}
                  
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {event.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {event.source} • {formatTimestamp(event.timestamp)}
                    </Typography>
                  </Box>
                  
                  <Chip
                    label={SEVERITY_LEVELS[event.severity]?.label || event.severity}
                    size="small"
                    color={SEVERITY_LEVELS[event.severity]?.color || 'default'}
                  />
                </Box>
              </CardContent>
            </EventCard>
          ))
        )}
      </Box>
    </Box>
  );
}

// 系统监控指标组件
function SystemMetrics({ metrics, loading }) {
  if (loading) {
    return <LoadingSpinner type="content" />;
  }
  
  const data = metrics?.data || {};
  
  const metricItems = [
    {
      label: 'CPU 使用率',
      value: data.cpuUsage || 0,
      unit: '%',
      icon: PerformanceIcon,
      color: data.cpuUsage > 80 ? 'error' : data.cpuUsage > 60 ? 'warning' : 'success',
    },
    {
      label: '内存使用率',
      value: data.memoryUsage || 0,
      unit: '%',
      icon: MemoryIcon,
      color: data.memoryUsage > 80 ? 'error' : data.memoryUsage > 60 ? 'warning' : 'success',
    },
    {
      label: '磁盘使用率',
      value: data.diskUsage || 0,
      unit: '%',
      icon: StorageIcon,
      color: data.diskUsage > 80 ? 'error' : data.diskUsage > 60 ? 'warning' : 'success',
    },
    {
      label: '网络总速率',
      value: data.networkUsage || data.networkTotal || 0,
      unit: 'MB/s',
      icon: NetworkIcon,
      color: 'info',
      details: {
        in: data.networkIn || 0,
        out: data.networkOut || 0,
      },
    },
  ];
  
  return (
    <Grid container spacing={2}>
      {metricItems.map((metric) => {
        const IconComponent = metric.icon;
        return (
          <Grid item xs={6} sm={3} key={metric.label}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <IconComponent
                color={metric.color}
                sx={{ fontSize: 32, mb: 1 }}
              />
              <Typography variant="h6" component="div">
                {metric.value}{metric.unit}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {metric.label}
              </Typography>
              {/* 网络详细信息 */}
              {metric.details && (
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    ↓ {metric.details.in.toFixed(1)} MB/s
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ↑ {metric.details.out.toFixed(1)} MB/s
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  );
}

// 监控图表组件
function MonitoringChart({ data, loading, type = 'line' }) {
  if (loading) {
    return <LoadingSpinner type="chart" />;
  }
  
  const chartData = data || [];
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      {type === 'area' ? (
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <RechartsTooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="events"
            stroke="#8884d8"
            fill="#8884d8"
            name="事件数量"
          />
        </AreaChart>
      ) : (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <RechartsTooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="cpu"
            stroke="#8884d8"
            strokeWidth={2}
            name="CPU"
          />
          <Line
            type="monotone"
            dataKey="memory"
            stroke="#82ca9d"
            strokeWidth={2}
            name="内存"
          />
          <Line
            type="monotone"
            dataKey="network"
            stroke="#ffc658"
            strokeWidth={2}
            name="网络"
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

// 服务状态组件
function ServiceStatus({ services, loading }) {
  if (loading) {
    return <LoadingSpinner type="list" />;
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
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="caption">
                    {service.description}
                  </Typography>
                  {service.uptime && (
                    <Chip
                      label={`运行时间: ${service.uptime}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              }
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

// 事件详情对话框
function EventDetailDialog({ event, open, onClose }) {
  if (!event) return null;
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {SEVERITY_LEVELS[event.severity]?.icon && (
            React.createElement(SEVERITY_LEVELS[event.severity].icon, {
              color: SEVERITY_LEVELS[event.severity].color,
            })
          )}
          事件详情
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>
              基本信息
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="事件ID" secondary={event.id} />
              </ListItem>
              <ListItem>
                <ListItemText primary="标题" secondary={event.title} />
              </ListItem>
              <ListItem>
                <ListItemText primary="严重程度" secondary={
                  <Chip
                    label={SEVERITY_LEVELS[event.severity]?.label || event.severity}
                    color={SEVERITY_LEVELS[event.severity]?.color || 'default'}
                    size="small"
                  />
                } />
              </ListItem>
              <ListItem>
                <ListItemText primary="来源" secondary={event.source} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="时间"
                  secondary={format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                />
              </ListItem>
            </List>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" gutterBottom>
              详细信息
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(event.details || {}, null, 2)}
              </Typography>
            </Paper>
          </Grid>
          
          {event.description && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                描述
              </Typography>
              <Typography variant="body2">
                {event.description}
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
        <Button variant="contained" startIcon={<BlockIcon />}>
          阻止
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// 主监控页面组件
export default function Monitoring() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = React.useState(false);
  
  // 状态管理
  const [monitoring, setMonitoring] = React.useState(true);
  const [paused, setPaused] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState(null);
  const [eventDetailOpen, setEventDetailOpen] = React.useState(false);
  const [realTimeEvents, setRealTimeEvents] = React.useState([]);
  const [tabValue, setTabValue] = React.useState(0);
  
  // 过滤器状态
  const [filters, setFilters] = React.useState({
    severity: '',
    category: '',
    search: '',
  });
  
  // 刷新间隔配置（毫秒）
  const [refreshIntervals, setRefreshIntervals] = React.useState({
    metrics: 3000,    // 系统指标：3秒（更频繁，因为需要实时性）
    services: 15000,  // 服务状态：15秒（服务状态变化较少）
    chart: 10000,     // 图表数据：10秒（平衡实时性和性能）
  });
  
  // 获取监控数据
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['monitoring-metrics'],
    queryFn: apiService.getSystemMetrics,
    refetchInterval: monitoring && !paused ? refreshIntervals.metrics : false,
    staleTime: 1000, // 1秒内的数据被认为是新鲜的
  });
  
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['monitoring-services'],
    queryFn: apiService.getSystemStatus,
    refetchInterval: monitoring && !paused ? refreshIntervals.services : false,
    staleTime: 5000, // 5秒内的数据被认为是新鲜的
  });
  
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['monitoring-chart'],
    queryFn: () => apiService.getMonitoringData({ timeRange: '1h' }),
    refetchInterval: monitoring && !paused ? refreshIntervals.chart : false,
    staleTime: 5000, // 5秒内的数据被认为是新鲜的
  });
  
  // WebSocket 连接和事件处理
  React.useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await simpleWebSocketService.connect();
        setIsConnected(true);
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        setIsConnected(false);
      }
    };
    
    connectWebSocket();
    
    return () => {
      simpleWebSocketService.disconnect();
      setIsConnected(false);
    };
  }, []);
  
  React.useEffect(() => {
    if (!isConnected || paused) return;
    
    const handleSecurityEvent = (event) => {
      setRealTimeEvents(prev => {
        const newEvents = [event, ...prev].slice(0, 100); // 保留最近100个事件
        return newEvents;
      });
    };
    
    const handleSystemEvent = (event) => {
      // 处理系统事件
      queryClient.invalidateQueries(['monitoring-metrics']);
    };
    
    const unsubscribeSecurityEvents = simpleWebSocketService.subscribeToSecurityEvents(handleSecurityEvent);
    const unsubscribeSystemEvents = simpleWebSocketService.subscribeToSystemEvents(handleSystemEvent);
    
    return () => {
      unsubscribeSecurityEvents();
      unsubscribeSystemEvents();
    };
  }, [isConnected, paused, queryClient]);
  
  // 控制函数
  const handleStartMonitoring = () => {
    setMonitoring(true);
    setPaused(false);
    toast.success('监控已启动');
  };
  
  const handlePauseMonitoring = () => {
    setPaused(!paused);
    toast.info(paused ? '监控已恢复' : '监控已暂停');
  };
  
  const handleStopMonitoring = () => {
    setMonitoring(false);
    setPaused(false);
    toast.info('监控已停止');
  };
  
  const handleClearEvents = () => {
    setRealTimeEvents([]);
    toast.success('事件列表已清空');
  };
  
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setEventDetailOpen(true);
  };
  
  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  return (
    <ErrorBoundary>
      <Box sx={{ flexGrow: 1 }}>
        {/* 页面标题 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              实时监控
            </Typography>
            <Typography variant="body1" color="text.secondary">
              系统安全事件和性能指标实时监控
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={fullscreen ? '退出全屏' : '全屏'}>
              <IconButton onClick={handleFullscreenToggle}>
                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* 连接状态显示 */}
        <ConnectionStatus isConnected={isConnected} />
        
        {/* 控制面板 */}
        <ControlPanel>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!monitoring ? (
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={handleStartMonitoring}
                color="success"
              >
                启动监控
              </Button>
            ) : (
              <>
                <Button
                  variant={paused ? "contained" : "outlined"}
                  startIcon={paused ? <PlayIcon /> : <PauseIcon />}
                  onClick={handlePauseMonitoring}
                  color={paused ? "success" : "warning"}
                >
                  {paused ? '恢复' : '暂停'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<StopIcon />}
                  onClick={handleStopMonitoring}
                  color="error"
                >
                  停止
                </Button>
              </>
            )}
          </Box>
          
          <Divider orientation="vertical" flexItem />
          
          {/* 刷新间隔设置 */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              刷新间隔:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>系统指标</InputLabel>
              <Select
                value={refreshIntervals.metrics}
                onChange={(e) => setRefreshIntervals(prev => ({ ...prev, metrics: e.target.value }))}
                label="系统指标"
              >
                <MenuItem value={1000}>1秒</MenuItem>
                <MenuItem value={3000}>3秒</MenuItem>
                <MenuItem value={5000}>5秒</MenuItem>
                <MenuItem value={10000}>10秒</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>图表数据</InputLabel>
              <Select
                value={refreshIntervals.chart}
                onChange={(e) => setRefreshIntervals(prev => ({ ...prev, chart: e.target.value }))}
                label="图表数据"
              >
                <MenuItem value={5000}>5秒</MenuItem>
                <MenuItem value={10000}>10秒</MenuItem>
                <MenuItem value={30000}>30秒</MenuItem>
                <MenuItem value={60000}>1分钟</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Divider orientation="vertical" flexItem />
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Badge
              badgeContent={realTimeEvents.length}
              color="error"
              max={999}
            >
              <Chip
                icon={<TimelineIcon />}
                label="实时事件"
                color={monitoring && !paused ? 'success' : 'default'}
              />
            </Badge>
            
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearEvents}
              disabled={realTimeEvents.length === 0}
            >
              清空
            </Button>
          </Box>
          
          <Divider orientation="vertical" flexItem />
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="搜索事件..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>严重程度</InputLabel>
              <Select
                value={filters.severity}
                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                label="严重程度"
              >
                <MenuItem value="">全部</MenuItem>
                {Object.entries(SEVERITY_LEVELS).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </ControlPanel>
        
        {/* 主要内容 */}
        <Grid container spacing={3}>
          {/* 系统指标 */}
          <Grid item xs={12}>
            <StyledCard>
              <CardHeader title="系统指标" />
              <CardContent>
                <SystemMetrics metrics={metrics} loading={metricsLoading} />
              </CardContent>
            </StyledCard>
          </Grid>
          
          {/* 监控图表和实时事件 */}
          <Grid item xs={12} lg={8}>
            <StyledCard>
              <CardHeader
                title="监控图表"
                action={
                  <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="性能指标" />
                    <Tab label="事件趋势" />
                  </Tabs>
                }
              />
              <CardContent>
                {tabValue === 0 && (
                  <MonitoringChart
                    data={chartData?.performance}
                    loading={chartLoading}
                    type="line"
                  />
                )}
                {tabValue === 1 && (
                  <MonitoringChart
                    data={chartData?.events}
                    loading={chartLoading}
                    type="area"
                  />
                )}
              </CardContent>
            </StyledCard>
          </Grid>
          
          {/* 实时事件流 */}
          <Grid item xs={12} lg={4}>
            <StyledCard>
              <CardHeader
                title="实时事件流"
                action={
                  <Chip
                    label={monitoring && !paused ? '监控中' : '已停止'}
                    color={monitoring && !paused ? 'success' : 'default'}
                    size="small"
                  />
                }
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <RealTimeEventStream
                  events={realTimeEvents}
                  loading={false}
                  paused={paused}
                  onEventClick={handleEventClick}
                />
              </CardContent>
            </StyledCard>
          </Grid>
          
          {/* 服务状态 */}
          <Grid item xs={12}>
            <StyledCard>
              <CardHeader title="服务状态" />
              <CardContent>
                <ServiceStatus
                  services={[
                    {
                      name: 'Falco 引擎',
                      status: services?.data?.falco || 'unknown',
                      description: '实时安全监控引擎',
                      uptime: services?.falcoUptime,
                    },
                    {
                      name: 'AI 分析服务',
                      status: services?.data?.ai || 'unknown',
                      description: '智能威胁分析服务',
                      uptime: services?.aiUptime,
                    },
                    {
                      name: 'PostgreSQL',
                      status: services?.data?.database || 'unknown',
                      description: '主数据库服务',
                      uptime: services?.databaseUptime,
                    },
                    {
                      name: 'Redis',
                      status: services?.data?.queue || 'unknown',
                      description: '缓存和消息队列',
                      uptime: services?.queueUptime,
                    },
                    {
                      name: 'Web API',
                      status: services?.data?.web || 'unknown',
                      description: 'HTTP API 服务',
                      uptime: services?.webUptime,
                    },
                  ]}
                  loading={servicesLoading}
                />
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>
        
        {/* 事件详情对话框 */}
        <EventDetailDialog
          event={selectedEvent}
          open={eventDetailOpen}
          onClose={() => setEventDetailOpen(false)}
        />
      </Box>
    </ErrorBoundary>
  );
}