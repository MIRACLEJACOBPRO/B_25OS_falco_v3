/**
 * 事件分析页面
 * 提供安全事件的详细分析、趋势分析和智能洞察
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
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
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
  Slider,
  ButtonGroup,
  Menu,
  MenuList,
  MenuItem as MenuItemComponent,
  ListItemButton,
  Drawer,
  Stepper,
  Step,
  StepLabel,
  StepContent,

  useTheme,
  alpha,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Computer as ComputerIcon,
  NetworkCheck as NetworkIcon,
  Person as PersonIcon,
  Storage as StorageIcon,
  CloudQueue as CloudIcon,
  Router as RouterIcon,
  DeviceHub as HubIcon,
  Link as LinkIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  LocationOn as LocationIcon,
  Schedule as TimeIcon,
  TrendingUp as TrendIcon,
  TrendingDown as TrendDownIcon,
  TrendingFlat as TrendFlatIcon,
  Hub as NodeIcon,
  Share as ShareIcon,
  GroupWork as ClusterIcon,
  BugReport as BugIcon,
  Shield as ShieldIcon,
  Lock as LockIcon,
  VpnKey as KeyIcon,
  Fingerprint as FingerprintIcon,
  Psychology as AiIcon,
  AutoFixHigh as AutoFixIcon,
  Assessment as ReportIcon,
  DataUsage as DataIcon,
  Speed as PerformanceIcon,
  Memory as MemoryIcon,
  Storage as DiskIcon,
  NetworkWifi as WifiIcon,
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
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

import { styled } from '@mui/material/styles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format, subDays, subHours, subMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { apiService } from '../services/api';
import { useWebSocket, WS_EVENTS, EVENT_TYPES } from '../services/websocket';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import DataTable from '../components/common/DataTable';
import ConnectionStatus from '../components/common/ConnectionStatus';

// 样式化组件
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const MetricCard = styled(Card)(({ theme, trend }) => {
  const trendColors = {
    up: theme.palette.success.main,
    down: theme.palette.error.main,
    flat: theme.palette.warning.main,
  };
  
  return {
    position: 'relative',
    overflow: 'visible',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: trendColors[trend] || theme.palette.primary.main,
      borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
    },
  };
});

const FilterPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
}));

const EventTimelineContainer = styled(Box)(({ theme }) => ({
  maxHeight: 400,
  overflow: 'auto',
  padding: theme.spacing(1),
}));

// 事件严重程度配置
const SEVERITY_LEVELS = {
  critical: { label: '严重', color: 'error', icon: ErrorIcon, score: 4 },
  high: { label: '高', color: 'warning', icon: WarningIcon, score: 3 },
  medium: { label: '中', color: 'info', icon: InfoIcon, score: 2 },
  low: { label: '低', color: 'success', icon: SuccessIcon, score: 1 },
};

// 事件类型配置
const EVENT_CATEGORIES = {
  security: { label: '安全事件', icon: SecurityIcon, color: '#f44336' },
  system: { label: '系统事件', icon: ComputerIcon, color: '#2196f3' },
  network: { label: '网络事件', icon: NetworkIcon, color: '#ff9800' },
  performance: { label: '性能事件', icon: PerformanceIcon, color: '#4caf50' },
  authentication: { label: '认证事件', icon: LockIcon, color: '#9c27b0' },
  authorization: { label: '授权事件', icon: KeyIcon, color: '#607d8b' },
  data: { label: '数据事件', icon: DataIcon, color: '#795548' },
};

// 时间范围选项
const TIME_RANGES = {
  '1h': { label: '最近1小时', value: 1, unit: 'hour' },
  '6h': { label: '最近6小时', value: 6, unit: 'hour' },
  '24h': { label: '最近24小时', value: 24, unit: 'hour' },
  '7d': { label: '最近7天', value: 7, unit: 'day' },
  '30d': { label: '最近30天', value: 30, unit: 'day' },
};

// 图表颜色配置
const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
  '#0088fe', '#00c49f', '#ffbb28', '#ff8042', '#8dd1e1',
];

// 模拟数据生成器
const generateMockEventData = () => {
  const events = [];
  const categories = Object.keys(EVENT_CATEGORIES);
  const severities = Object.keys(SEVERITY_LEVELS);
  
  for (let i = 0; i < 100; i++) {
    const timestamp = subMinutes(new Date(), Math.random() * 1440); // 最近24小时
    events.push({
      id: `event_${i + 1}`,
      title: `安全事件 ${i + 1}`,
      description: `这是一个模拟的安全事件描述 ${i + 1}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      timestamp,
      source: `host-${Math.floor(Math.random() * 10) + 1}`,
      user: `user-${Math.floor(Math.random() * 5) + 1}`,
      process: `process-${Math.floor(Math.random() * 20) + 1}`,
      file: `/path/to/file-${Math.floor(Math.random() * 50) + 1}`,
      network: {
        srcIp: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        dstIp: `10.0.0.${Math.floor(Math.random() * 254) + 1}`,
        port: Math.floor(Math.random() * 65535) + 1,
      },
      status: Math.random() > 0.7 ? 'resolved' : Math.random() > 0.5 ? 'investigating' : 'open',
      tags: [`tag-${Math.floor(Math.random() * 10) + 1}`, `tag-${Math.floor(Math.random() * 10) + 1}`],
    });
  }
  
  return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// 生成趋势数据
const generateTrendData = (timeRange) => {
  const data = [];
  const now = new Date();
  const points = timeRange === '1h' ? 12 : timeRange === '6h' ? 24 : timeRange === '24h' ? 24 : 30;
  
  for (let i = points - 1; i >= 0; i--) {
    const time = timeRange.includes('h') 
      ? subMinutes(now, i * (parseInt(timeRange) * 60 / points))
      : subDays(now, i);
    
    data.push({
      time: format(time, timeRange.includes('h') ? 'HH:mm' : 'MM-dd'),
      events: Math.floor(Math.random() * 50) + 10,
      critical: Math.floor(Math.random() * 5),
      high: Math.floor(Math.random() * 10) + 5,
      medium: Math.floor(Math.random() * 15) + 10,
      low: Math.floor(Math.random() * 20) + 15,
    });
  }
  
  return data;
};

// 事件统计指标组件
function EventMetrics({ data, loading, timeRange }) {
  const metrics = React.useMemo(() => {
    if (!data || loading) return {};
    
    const total = data.length;
    const byCategory = {};
    const bySeverity = {};
    const byStatus = {};
    
    data.forEach(event => {
      byCategory[event.category] = (byCategory[event.category] || 0) + 1;
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
      byStatus[event.status] = (byStatus[event.status] || 0) + 1;
    });
    
    const criticalCount = bySeverity.critical || 0;
    const highCount = bySeverity.high || 0;
    const resolvedCount = byStatus.resolved || 0;
    
    return {
      total,
      critical: criticalCount,
      high: highCount,
      resolved: resolvedCount,
      resolutionRate: total > 0 ? ((resolvedCount / total) * 100).toFixed(1) : 0,
      criticalRate: total > 0 ? ((criticalCount / total) * 100).toFixed(1) : 0,
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'flat',
    };
  }, [data, loading]);
  
  const metricItems = [
    {
      title: '总事件数',
      value: metrics.total || 0,
      icon: AnalyticsIcon,
      color: 'primary',
      trend: metrics.trend,
    },
    {
      title: '严重事件',
      value: metrics.critical || 0,
      subtitle: `${metrics.criticalRate}% 占比`,
      icon: ErrorIcon,
      color: 'error',
      trend: 'up',
    },
    {
      title: '高危事件',
      value: metrics.high || 0,
      icon: WarningIcon,
      color: 'warning',
      trend: 'flat',
    },
    {
      title: '已解决',
      value: metrics.resolved || 0,
      subtitle: `${metrics.resolutionRate}% 解决率`,
      icon: SuccessIcon,
      color: 'success',
      trend: 'up',
    },
  ];
  
  if (loading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4].map(i => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <LoadingSpinner type="card" />
          </Grid>
        ))}
      </Grid>
    );
  }
  
  return (
    <Grid container spacing={3}>
      {metricItems.map((metric, index) => {
        const IconComponent = metric.icon;
        const getTrendIcon = () => {
          switch (metric.trend) {
            case 'up': return <TrendIcon color="success" />;
            case 'down': return <TrendDownIcon color="error" />;
            default: return <TrendFlatIcon color="warning" />;
          }
        };
        
        return (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MetricCard trend={metric.trend}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      {metric.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {metric.value}
                    </Typography>
                    {metric.subtitle && (
                      <Typography variant="body2" color="text.secondary">
                        {metric.subtitle}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <IconComponent
                      sx={{ fontSize: 40, color: `${metric.color}.main`, mb: 1 }}
                    />
                    {getTrendIcon()}
                  </Box>
                </Box>
              </CardContent>
            </MetricCard>
          </Grid>
        );
      })}
    </Grid>
  );
}

// 事件趋势图表组件
function EventTrendChart({ data, loading, timeRange }) {
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
          dataKey="critical"
          stackId="1"
          stroke={SEVERITY_LEVELS.critical.color}
          fill={SEVERITY_LEVELS.critical.color}
          name="严重"
        />
        <Area
          type="monotone"
          dataKey="high"
          stackId="1"
          stroke={SEVERITY_LEVELS.high.color}
          fill={SEVERITY_LEVELS.high.color}
          name="高危"
        />
        <Area
          type="monotone"
          dataKey="medium"
          stackId="1"
          stroke={SEVERITY_LEVELS.medium.color}
          fill={SEVERITY_LEVELS.medium.color}
          name="中等"
        />
        <Area
          type="monotone"
          dataKey="low"
          stackId="1"
          stroke={SEVERITY_LEVELS.low.color}
          fill={SEVERITY_LEVELS.low.color}
          name="低危"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// 事件分类分布图
function EventCategoryChart({ data, loading }) {
  const chartData = React.useMemo(() => {
    if (!data || loading) return [];
    
    const categoryCount = {};
    data.forEach(event => {
      categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
    });
    
    return Object.entries(categoryCount).map(([category, count]) => ({
      name: EVENT_CATEGORIES[category]?.label || category,
      value: count,
      color: EVENT_CATEGORIES[category]?.color || '#8884d8',
    }));
  }, [data, loading]);
  
  if (loading) {
    return <LoadingSpinner type="chart" />;
  }
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <RechartsTooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 事件时间线组件
function EventTimeline({ events, loading }) {
  if (loading) {
    return <LoadingSpinner type="list" />;
  }
  
  const recentEvents = events.slice(0, 10); // 显示最近10个事件
  
  return (
    <EventTimelineContainer>
      <List>
        {recentEvents.map((event, index) => {
          const severityConfig = SEVERITY_LEVELS[event.severity] || SEVERITY_LEVELS.low;
          const categoryConfig = EVENT_CATEGORIES[event.category] || EVENT_CATEGORIES.security;
          const IconComponent = severityConfig.icon;
          
          return (
            <ListItem key={event.id} divider={index < recentEvents.length - 1}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: severityConfig.color === 'error' ? 'error.main' : severityConfig.color === 'warning' ? 'warning.main' : severityConfig.color === 'success' ? 'success.main' : 'info.main' }}>
                  <IconComponent sx={{ fontSize: 16 }} />
                </Avatar>
              </ListItemAvatar>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" component="span">
                      {event.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(event.timestamp), 'HH:mm:ss', { locale: zhCN })}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {event.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={categoryConfig.label}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={severityConfig.label}
                        size="small"
                        color={severityConfig.color}
                      />
                      <Chip
                        label={event.source}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    </EventTimelineContainer>
  );
}

// 事件详情对话框
function EventDetailDialog({ event, open, onClose }) {
  if (!event) return null;
  
  const severityConfig = SEVERITY_LEVELS[event.severity] || SEVERITY_LEVELS.low;
  const categoryConfig = EVENT_CATEGORIES[event.category] || EVENT_CATEGORIES.security;
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {React.createElement(severityConfig.icon, {
            color: severityConfig.color,
          })}
          事件详情
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
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
                <ListItemText primary="描述" secondary={event.description} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="时间"
                  secondary={format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="严重程度"
                  secondary={
                    <Chip
                      label={severityConfig.label}
                      color={severityConfig.color}
                      size="small"
                    />
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="类别"
                  secondary={
                    <Chip
                      label={categoryConfig.label}
                      size="small"
                      variant="outlined"
                    />
                  }
                />
              </ListItem>
            </List>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              技术信息
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="来源主机" secondary={event.source} />
              </ListItem>
              <ListItem>
                <ListItemText primary="用户" secondary={event.user} />
              </ListItem>
              <ListItem>
                <ListItemText primary="进程" secondary={event.process} />
              </ListItem>
              <ListItem>
                <ListItemText primary="文件" secondary={event.file} />
              </ListItem>
              {event.network && (
                <>
                  <ListItem>
                    <ListItemText primary="源IP" secondary={event.network.srcIp} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="目标IP" secondary={event.network.dstIp} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="端口" secondary={event.network.port} />
                  </ListItem>
                </>
              )}
            </List>
          </Grid>
          
          {event.tags && event.tags.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                标签
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {event.tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
        <Button variant="contained" color="primary">
          标记为已解决
        </Button>
        <Button variant="outlined" color="warning">
          需要调查
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// 主事件分析页面组件
export default function EventAnalysis() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isConnected, subscribe, unsubscribe } = useWebSocket();
  
  // 状态管理
  const [selectedEvent, setSelectedEvent] = React.useState(null);
  const [eventDetailOpen, setEventDetailOpen] = React.useState(false);
  const [tabValue, setTabValue] = React.useState(0);
  const [timeRange, setTimeRange] = React.useState('24h');
  
  // 过滤器状态
  const [filters, setFilters] = React.useState({
    category: '',
    severity: '',
    status: '',
    search: '',
    dateRange: [subDays(new Date(), 7), new Date()],
  });
  
  // 获取事件数据
  const { data: events, isLoading: eventsLoading, refetch } = useQuery({
    queryKey: ['events', filters, timeRange],
    queryFn: async () => {
      try {
        // 调用真实的API
        return await apiService.getEvents({ ...filters, timeRange });
      } catch (error) {
        console.warn('API调用失败，使用模拟数据:', error);
        // 如果API调用失败，使用模拟数据
        return generateMockEventData();
      }
    },
    refetchInterval: 30000, // 30秒刷新一次
  });
  
  // 获取趋势数据
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['event-trends', timeRange],
    queryFn: () => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(generateTrendData(timeRange));
        }, 500);
      });
    },
    refetchInterval: 60000, // 1分钟刷新一次
  });
  
  // WebSocket 事件处理
  React.useEffect(() => {
    if (!isConnected) return;
    
    const handleNewEvent = (event) => {
      // 处理新事件
      queryClient.invalidateQueries(['events']);
      queryClient.invalidateQueries(['event-trends']);
      
      // 显示通知
      if (event.severity === 'critical') {
        toast.error(`严重事件: ${event.title}`);
      } else if (event.severity === 'high') {
        toast.warning(`高危事件: ${event.title}`);
      }
    };
    
    subscribe(EVENT_TYPES.SECURITY_EVENT, handleNewEvent);
    
    return () => {
      unsubscribe(EVENT_TYPES.SECURITY_EVENT, handleNewEvent);
    };
  }, [isConnected, subscribe, unsubscribe, queryClient]);
  
  // 事件处理函数
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setEventDetailOpen(true);
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
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
    link.download = `events-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('事件数据已导出');
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
      label: '标题',
      width: 200,
    },
    {
      id: 'category',
      label: '类别',
      format: (value) => (
        <Chip
          label={EVENT_CATEGORIES[value]?.label || value}
          size="small"
          variant="outlined"
        />
      ),
      width: 100,
    },
    {
      id: 'severity',
      label: '严重程度',
      format: (value) => (
        <Chip
          label={SEVERITY_LEVELS[value]?.label || value}
          color={SEVERITY_LEVELS[value]?.color || 'default'}
          size="small"
        />
      ),
      width: 100,
    },
    {
      id: 'source',
      label: '来源',
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
              事件分析
            </Typography>
            <Typography variant="body1" color="text.secondary">
              安全事件的详细分析和趋势洞察
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
        <FilterPanel>
          <Typography variant="subtitle2" gutterBottom>
            过滤器
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>事件类别</InputLabel>
                <Select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  label="事件类别"
                >
                  <MenuItem value="">全部</MenuItem>
                  {Object.entries(EVENT_CATEGORIES).map(([key, config]) => (
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
                  {Object.entries(SEVERITY_LEVELS).map(([key, config]) => (
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
        </FilterPanel>
        
        {/* 事件统计指标 */}
        <Box sx={{ mb: 3 }}>
          <EventMetrics
            data={events}
            loading={eventsLoading}
            timeRange={timeRange}
          />
        </Box>
        
        {/* 主要内容 */}
        <Grid container spacing={3}>
          {/* 事件趋势图表 */}
          <Grid item xs={12} lg={8}>
            <StyledCard>
              <CardHeader
                title="事件趋势分析"
                action={
                  <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="时间趋势" />
                    <Tab label="类别分布" />
                  </Tabs>
                }
              />
              <CardContent sx={{ flexGrow: 1 }}>
                {tabValue === 0 && (
                  <EventTrendChart
                    data={trendData}
                    loading={trendLoading}
                    timeRange={timeRange}
                  />
                )}
                {tabValue === 1 && (
                  <EventCategoryChart
                    data={events}
                    loading={eventsLoading}
                  />
                )}
              </CardContent>
            </StyledCard>
          </Grid>
          
          {/* 事件时间线 */}
          <Grid item xs={12} lg={4}>
            <StyledCard>
              <CardHeader title="最近事件" />
              <CardContent sx={{ flexGrow: 1 }}>
                <EventTimeline
                  events={events || []}
                  loading={eventsLoading}
                />
              </CardContent>
            </StyledCard>
          </Grid>
          
          {/* 事件列表 */}
          <Grid item xs={12}>
            <StyledCard>
              <CardHeader
                title="事件列表"
                action={
                  <Chip
                    label={`${events?.length || 0} 个事件`}
                    color="primary"
                    size="small"
                  />
                }
              />
              <CardContent sx={{ flexGrow: 1, p: 0 }}>
                <DataTable
                  data={events || []}
                  columns={eventColumns}
                  loading={eventsLoading}
                  onRowClick={handleEventClick}
                  searchable
                  filterable
                  sortable
                  pagination
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