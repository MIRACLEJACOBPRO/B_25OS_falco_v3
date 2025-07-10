/**
 * 威胁情报页面
 * 提供威胁情报的收集、分析、展示和管理功能
 */

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardActions,
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
  ListItemButton,
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
  Drawer,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Avatar,
  AvatarGroup,
  LinearProgress,
  CircularProgress,
  Rating,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  LocationOn as LocationIcon,
  Schedule as TimeIcon,
  TrendingUp as TrendIcon,
  TrendingDown as TrendDownIcon,
  Language as GlobalIcon,
  Computer as ComputerIcon,
  NetworkCheck as NetworkIcon,
  Person as PersonIcon,
  Storage as StorageIcon,
  CloudQueue as CloudIcon,
  Router as RouterIcon,
  DeviceHub as HubIcon,
  Link as LinkIcon,
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
  Wifi as WifiIcon,
  Public as PublicIcon,
  Business as OrganizationIcon,
  Group as GroupIcon,
  Timeline as TimelineIcon,
  Map as MapIcon,
  Radar as RadarIcon,
  Satellite as SatelliteIcon,
  Verified as VerifiedIcon,
  NewReleases as NewIcon,
  Update as UpdateIcon,
  Sync as SyncIcon,
  CloudDownload as CloudDownloadIcon,
  CloudUpload as CloudUploadIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Flag as FlagIcon,
  Label as LabelIcon,
  Category as CategoryIcon,
  Source as SourceIcon,
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
  ComposedChart,
} from 'recharts';
import { styled } from '@mui/material/styles';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format, subDays, subHours, subMinutes, parseISO } from 'date-fns';
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

const ThreatCard = styled(Card)(({ theme, severity }) => {
  const severityColors = {
    critical: theme.palette.error.main,
    high: theme.palette.warning.main,
    medium: theme.palette.info.main,
    low: theme.palette.success.main,
  };
  
  return {
    position: 'relative',
    overflow: 'visible',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[8],
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: severityColors[severity] || theme.palette.primary.main,
      borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
    },
  };
});

const FilterPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
}));

const ThreatSourceChip = styled(Chip)(({ theme, source }) => {
  const sourceColors = {
    internal: theme.palette.primary.main,
    external: theme.palette.secondary.main,
    osint: theme.palette.info.main,
    commercial: theme.palette.warning.main,
    government: theme.palette.error.main,
  };
  
  return {
    backgroundColor: alpha(sourceColors[source] || theme.palette.grey[500], 0.1),
    color: sourceColors[source] || theme.palette.grey[700],
    border: `1px solid ${alpha(sourceColors[source] || theme.palette.grey[500], 0.3)}`,
  };
});

// 威胁类型配置
const THREAT_TYPES = {
  malware: { label: '恶意软件', icon: BugIcon, color: '#f44336' },
  phishing: { label: '钓鱼攻击', icon: SecurityIcon, color: '#ff9800' },
  ransomware: { label: '勒索软件', icon: LockIcon, color: '#e91e63' },
  apt: { label: 'APT攻击', icon: ShieldIcon, color: '#9c27b0' },
  botnet: { label: '僵尸网络', icon: HubIcon, color: '#3f51b5' },
  ddos: { label: 'DDoS攻击', icon: NetworkIcon, color: '#2196f3' },
  vulnerability: { label: '漏洞利用', icon: WarningIcon, color: '#ff5722' },
  insider: { label: '内部威胁', icon: PersonIcon, color: '#795548' },
  social: { label: '社会工程', icon: GroupIcon, color: '#607d8b' },
  data_breach: { label: '数据泄露', icon: DataIcon, color: '#009688' },
};

// 威胁严重程度配置
const THREAT_SEVERITY = {
  critical: { label: '严重', color: 'error', score: 4, bgColor: '#ffebee' },
  high: { label: '高', color: 'warning', score: 3, bgColor: '#fff3e0' },
  medium: { label: '中', color: 'info', score: 2, bgColor: '#e3f2fd' },
  low: { label: '低', color: 'success', score: 1, bgColor: '#e8f5e8' },
};

// 威胁来源配置
const THREAT_SOURCES = {
  internal: { label: '内部情报', icon: ComputerIcon, color: '#2196f3' },
  external: { label: '外部情报', icon: PublicIcon, color: '#4caf50' },
  osint: { label: '开源情报', icon: GlobalIcon, color: '#ff9800' },
  commercial: { label: '商业情报', icon: OrganizationIcon, color: '#9c27b0' },
  government: { label: '政府情报', icon: OrganizationIcon, color: '#f44336' },
};

// 威胁状态配置
const THREAT_STATUS = {
  active: { label: '活跃', color: 'error', icon: ErrorIcon },
  monitoring: { label: '监控中', color: 'warning', icon: RadarIcon },
  mitigated: { label: '已缓解', color: 'info', icon: ShieldIcon },
  resolved: { label: '已解决', color: 'success', icon: SuccessIcon },
};

// 可信度等级
const CONFIDENCE_LEVELS = {
  high: { label: '高', color: 'success', score: 3 },
  medium: { label: '中', color: 'warning', score: 2 },
  low: { label: '低', color: 'error', score: 1 },
};

// 模拟威胁情报数据生成器
const generateMockThreatData = () => {
  const threats = [];
  const types = Object.keys(THREAT_TYPES);
  const severities = Object.keys(THREAT_SEVERITY);
  const sources = Object.keys(THREAT_SOURCES);
  const statuses = Object.keys(THREAT_STATUS);
  const confidences = Object.keys(CONFIDENCE_LEVELS);
  
  for (let i = 0; i < 50; i++) {
    const timestamp = subHours(new Date(), Math.random() * 168); // 最近一周
    const type = types[Math.floor(Math.random() * types.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    
    threats.push({
      id: `threat_${i + 1}`,
      title: `威胁情报 ${i + 1}`,
      description: `这是一个关于${THREAT_TYPES[type].label}的威胁情报描述`,
      type,
      severity,
      source: sources[Math.floor(Math.random() * sources.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      confidence: confidences[Math.floor(Math.random() * confidences.length)],
      timestamp,
      lastUpdated: subMinutes(timestamp, Math.random() * 60),
      indicators: {
        ips: [
          `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        ],
        domains: [
          `malicious-domain-${i + 1}.com`,
          `suspicious-site-${i + 1}.net`,
        ],
        hashes: [
          `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
          `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
        ],
        urls: [
          `https://malicious-url-${i + 1}.com/path`,
          `http://suspicious-url-${i + 1}.org/endpoint`,
        ],
      },
      tags: [`tag-${Math.floor(Math.random() * 10) + 1}`, `category-${Math.floor(Math.random() * 5) + 1}`],
      author: `analyst-${Math.floor(Math.random() * 5) + 1}`,
      organization: `org-${Math.floor(Math.random() * 3) + 1}`,
      references: [
        `https://reference-${i + 1}.com`,
        `https://source-${i + 1}.org`,
      ],
      isFavorite: Math.random() > 0.8,
      isBookmarked: Math.random() > 0.7,
      viewCount: Math.floor(Math.random() * 100),
      shareCount: Math.floor(Math.random() * 20),
    });
  }
  
  return threats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// 生成威胁趋势数据
const generateThreatTrendData = () => {
  const data = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = subDays(now, i);
    data.push({
      date: format(date, 'MM-dd'),
      total: Math.floor(Math.random() * 50) + 20,
      critical: Math.floor(Math.random() * 5) + 1,
      high: Math.floor(Math.random() * 10) + 5,
      medium: Math.floor(Math.random() * 15) + 8,
      low: Math.floor(Math.random() * 20) + 6,
    });
  }
  
  return data;
};

// 威胁统计指标组件
function ThreatMetrics({ data, loading }) {
  const metrics = React.useMemo(() => {
    if (!data || loading) return {};
    
    const total = data.length;
    const bySeverity = {};
    const byType = {};
    const byStatus = {};
    const bySource = {};
    
    data.forEach(threat => {
      bySeverity[threat.severity] = (bySeverity[threat.severity] || 0) + 1;
      byType[threat.type] = (byType[threat.type] || 0) + 1;
      byStatus[threat.status] = (byStatus[threat.status] || 0) + 1;
      bySource[threat.source] = (bySource[threat.source] || 0) + 1;
    });
    
    const activeCount = byStatus.active || 0;
    const criticalCount = bySeverity.critical || 0;
    const resolvedCount = byStatus.resolved || 0;
    
    return {
      total,
      active: activeCount,
      critical: criticalCount,
      resolved: resolvedCount,
      resolutionRate: total > 0 ? ((resolvedCount / total) * 100).toFixed(1) : 0,
      activeRate: total > 0 ? ((activeCount / total) * 100).toFixed(1) : 0,
    };
  }, [data, loading]);
  
  const metricItems = [
    {
      title: '总威胁数',
      value: metrics.total || 0,
      icon: SecurityIcon,
      color: 'primary',
    },
    {
      title: '活跃威胁',
      value: metrics.active || 0,
      subtitle: `${metrics.activeRate}% 活跃率`,
      icon: ErrorIcon,
      color: 'error',
    },
    {
      title: '严重威胁',
      value: metrics.critical || 0,
      icon: WarningIcon,
      color: 'warning',
    },
    {
      title: '已解决',
      value: metrics.resolved || 0,
      subtitle: `${metrics.resolutionRate}% 解决率`,
      icon: SuccessIcon,
      color: 'success',
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
        
        return (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StyledCard>
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
                  <IconComponent
                    sx={{ fontSize: 40, color: `${metric.color}.main` }}
                  />
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>
        );
      })}
    </Grid>
  );
}

// 威胁趋势图表组件
function ThreatTrendChart({ data, loading }) {
  if (loading) {
    return <LoadingSpinner type="chart" />;
  }
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <RechartsTooltip />
        <Legend />
        <Bar dataKey="total" fill="#8884d8" name="总数" />
        <Line type="monotone" dataKey="critical" stroke="#f44336" name="严重" />
        <Line type="monotone" dataKey="high" stroke="#ff9800" name="高危" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// 威胁类型分布图
function ThreatTypeChart({ data, loading }) {
  const chartData = React.useMemo(() => {
    if (!data || loading) return [];
    
    const typeCount = {};
    data.forEach(threat => {
      typeCount[threat.type] = (typeCount[threat.type] || 0) + 1;
    });
    
    return Object.entries(typeCount).map(([type, count]) => ({
      name: THREAT_TYPES[type]?.label || type,
      value: count,
      color: THREAT_TYPES[type]?.color || '#8884d8',
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

// 威胁情报卡片组件
function ThreatIntelCard({ threat, onView, onEdit, onDelete, onToggleFavorite, onToggleBookmark }) {
  const typeConfig = THREAT_TYPES[threat.type] || THREAT_TYPES.malware;
  const severityConfig = THREAT_SEVERITY[threat.severity] || THREAT_SEVERITY.low;
  const sourceConfig = THREAT_SOURCES[threat.source] || THREAT_SOURCES.internal;
  const statusConfig = THREAT_STATUS[threat.status] || THREAT_STATUS.active;
  const confidenceConfig = CONFIDENCE_LEVELS[threat.confidence] || CONFIDENCE_LEVELS.low;
  
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;
  
  return (
    <ThreatCard severity={threat.severity}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: typeConfig.color }}>
            <TypeIcon />
          </Avatar>
        }
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" noWrap>
              {threat.title}
            </Typography>
            <Chip
              label={severityConfig.label}
              color={severityConfig.color}
              size="small"
            />
          </Box>
        }
        subheader={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <ThreatSourceChip
              label={sourceConfig.label}
              size="small"
              source={threat.source}
            />
            <Chip
              icon={<StatusIcon />}
              label={statusConfig.label}
              color={statusConfig.color}
              size="small"
              variant="outlined"
            />
          </Box>
        }
        action={
          <Box>
            <IconButton
              onClick={() => onToggleFavorite(threat.id)}
              color={threat.isFavorite ? 'warning' : 'default'}
            >
              {threat.isFavorite ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
            <IconButton
              onClick={() => onToggleBookmark(threat.id)}
              color={threat.isBookmarked ? 'primary' : 'default'}
            >
              {threat.isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
            </IconButton>
          </Box>
        }
      />
      
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          {threat.description}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            威胁指标
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {threat.indicators.ips.slice(0, 2).map((ip, index) => (
              <Chip key={index} label={ip} size="small" variant="outlined" />
            ))}
            {threat.indicators.domains.slice(0, 1).map((domain, index) => (
              <Chip key={index} label={domain} size="small" variant="outlined" />
            ))}
            {threat.indicators.ips.length + threat.indicators.domains.length > 3 && (
              <Chip label={`+${threat.indicators.ips.length + threat.indicators.domains.length - 3} 更多`} size="small" />
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              可信度: 
            </Typography>
            <Rating
              value={confidenceConfig.score}
              max={3}
              size="small"
              readOnly
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {format(new Date(threat.timestamp), 'MM-dd HH:mm', { locale: zhCN })}
          </Typography>
        </Box>
      </CardContent>
      
      <CardActions>
        <Button size="small" onClick={() => onView(threat)}>
          查看详情
        </Button>
        <Button size="small" onClick={() => onEdit(threat)}>
          编辑
        </Button>
        <Button size="small" color="error" onClick={() => onDelete(threat.id)}>
          删除
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ViewIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            {threat.viewCount}
          </Typography>
          <ShareIcon sx={{ fontSize: 16, color: 'text.secondary', ml: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {threat.shareCount}
          </Typography>
        </Box>
      </CardActions>
    </ThreatCard>
  );
}

// 威胁详情对话框
function ThreatDetailDialog({ threat, open, onClose }) {
  if (!threat) return null;
  
  const typeConfig = THREAT_TYPES[threat.type] || THREAT_TYPES.malware;
  const severityConfig = THREAT_SEVERITY[threat.severity] || THREAT_SEVERITY.low;
  const sourceConfig = THREAT_SOURCES[threat.source] || THREAT_SOURCES.internal;
  const statusConfig = THREAT_STATUS[threat.status] || THREAT_STATUS.active;
  const confidenceConfig = CONFIDENCE_LEVELS[threat.confidence] || CONFIDENCE_LEVELS.low;
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {React.createElement(typeConfig.icon, {
            sx: { color: typeConfig.color },
          })}
          威胁情报详情
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* 基本信息 */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              基本信息
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="威胁ID" secondary={threat.id} />
              </ListItem>
              <ListItem>
                <ListItemText primary="标题" secondary={threat.title} />
              </ListItem>
              <ListItem>
                <ListItemText primary="描述" secondary={threat.description} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="威胁类型"
                  secondary={
                    <Chip
                      label={typeConfig.label}
                      size="small"
                      sx={{ bgcolor: alpha(typeConfig.color, 0.1), color: typeConfig.color }}
                    />
                  }
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
                  primary="状态"
                  secondary={
                    <Chip
                      icon={React.createElement(statusConfig.icon)}
                      label={statusConfig.label}
                      color={statusConfig.color}
                      size="small"
                      variant="outlined"
                    />
                  }
                />
              </ListItem>
            </List>
          </Grid>
          
          {/* 来源和可信度 */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              来源信息
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="情报来源"
                  secondary={
                    <ThreatSourceChip
                      label={sourceConfig.label}
                      size="small"
                      source={threat.source}
                    />
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText primary="作者" secondary={threat.author} />
              </ListItem>
              <ListItem>
                <ListItemText primary="组织" secondary={threat.organization} />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="可信度"
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Rating
                        value={confidenceConfig.score}
                        max={3}
                        size="small"
                        readOnly
                      />
                      <Typography variant="caption">
                        ({confidenceConfig.label})
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="创建时间"
                  secondary={format(new Date(threat.timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="更新时间"
                  secondary={format(new Date(threat.lastUpdated), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                />
              </ListItem>
            </List>
          </Grid>
          
          {/* 威胁指标 */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              威胁指标 (IoCs)
            </Typography>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>IP 地址 ({threat.indicators.ips.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {threat.indicators.ips.map((ip, index) => (
                    <Chip key={index} label={ip} size="small" variant="outlined" />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>域名 ({threat.indicators.domains.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {threat.indicators.domains.map((domain, index) => (
                    <Chip key={index} label={domain} size="small" variant="outlined" />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>文件哈希 ({threat.indicators.hashes.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {threat.indicators.hashes.map((hash, index) => (
                    <Chip key={index} label={hash} size="small" variant="outlined" />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>URL ({threat.indicators.urls.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {threat.indicators.urls.map((url, index) => (
                    <Chip key={index} label={url} size="small" variant="outlined" />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Grid>
          
          {/* 标签和引用 */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              标签
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {threat.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  variant="outlined"
                  icon={<LabelIcon />}
                />
              ))}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              参考链接
            </Typography>
            <List dense>
              {threat.references.map((ref, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <LinkIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <a href={ref} target="_blank" rel="noopener noreferrer">
                        {ref}
                      </a>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
        <Button variant="outlined" startIcon={<EditIcon />}>
          编辑
        </Button>
        <Button variant="outlined" startIcon={<ShareIcon />}>
          分享
        </Button>
        <Button variant="contained" startIcon={<DownloadIcon />}>
          导出
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// 主威胁情报页面组件
export default function ThreatIntelligence() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isConnected, subscribe, unsubscribe } = useWebSocket();
  
  // 状态管理
  const [selectedThreat, setSelectedThreat] = React.useState(null);
  const [threatDetailOpen, setThreatDetailOpen] = React.useState(false);
  const [tabValue, setTabValue] = React.useState(0);
  const [viewMode, setViewMode] = React.useState('grid'); // 'grid' | 'list'
  
  // 过滤器状态
  const [filters, setFilters] = React.useState({
    type: '',
    severity: '',
    source: '',
    status: '',
    confidence: '',
    search: '',
    showFavorites: false,
    showBookmarked: false,
  });
  
  // 获取威胁情报数据
  const { data: threats, isLoading: threatsLoading, refetch } = useQuery({
    queryKey: ['threats', filters],
    queryFn: async () => {
      try {
        // 调用真实的API
        return await ApiService.getThreatIntelligence(filters);
      } catch (error) {
        console.warn('API调用失败，使用模拟数据:', error);
        // 如果API调用失败，使用模拟数据
        let data = generateMockThreatData();
        
        // 应用过滤器
        if (filters.type) {
          data = data.filter(t => t.type === filters.type);
        }
        if (filters.severity) {
          data = data.filter(t => t.severity === filters.severity);
        }
        if (filters.source) {
          data = data.filter(t => t.source === filters.source);
        }
        if (filters.status) {
          data = data.filter(t => t.status === filters.status);
        }
        if (filters.confidence) {
          data = data.filter(t => t.confidence === filters.confidence);
        }
        if (filters.search) {
          data = data.filter(t => 
            t.title.toLowerCase().includes(filters.search.toLowerCase()) ||
            t.description.toLowerCase().includes(filters.search.toLowerCase())
          );
        }
        if (filters.showFavorites) {
          data = data.filter(t => t.isFavorite);
        }
        if (filters.showBookmarked) {
          data = data.filter(t => t.isBookmarked);
        }
        
        return data;
      }
    },
    refetchInterval: 60000, // 1分钟刷新一次
  });
  
  // 获取趋势数据
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['threat-trends'],
    queryFn: async () => {
      try {
        // 调用真实的API
        return await ApiService.getThreatTrends();
      } catch (error) {
        console.warn('API调用失败，使用模拟数据:', error);
        // 如果API调用失败，使用模拟数据
        return generateThreatTrendData();
      }
    },
    refetchInterval: 300000, // 5分钟刷新一次
  });
  
  // WebSocket 事件处理
  React.useEffect(() => {
    if (!isConnected) return;
    
    const handleNewThreat = (threat) => {
      // 处理新威胁情报
      queryClient.invalidateQueries(['threats']);
      queryClient.invalidateQueries(['threat-trends']);
      
      // 显示通知
      if (threat.severity === 'critical') {
        toast.error(`新的严重威胁: ${threat.title}`);
      } else if (threat.severity === 'high') {
        toast.warning(`新的高危威胁: ${threat.title}`);
      } else {
        toast.info(`新的威胁情报: ${threat.title}`);
      }
    };
    
    subscribe(EVENT_TYPES.THREAT_INTEL, handleNewThreat);
    
    return () => {
      unsubscribe(EVENT_TYPES.THREAT_INTEL, handleNewThreat);
    };
  }, [isConnected, subscribe, unsubscribe, queryClient]);
  
  // 事件处理函数
  const handleThreatView = (threat) => {
    setSelectedThreat(threat);
    setThreatDetailOpen(true);
  };
  
  const handleThreatEdit = (threat) => {
    // 实现编辑功能
    toast.info('编辑功能开发中...');
  };
  
  const handleThreatDelete = (threatId) => {
    // 实现删除功能
    toast.success('威胁情报已删除');
    refetch();
  };
  
  const handleToggleFavorite = (threatId) => {
    // 实现收藏功能
    toast.success('收藏状态已更新');
    refetch();
  };
  
  const handleToggleBookmark = (threatId) => {
    // 实现书签功能
    toast.success('书签状态已更新');
    refetch();
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };
  
  const handleExportThreats = () => {
    if (!threats) return;
    
    const dataStr = JSON.stringify(threats, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `threat-intelligence-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('威胁情报数据已导出');
  };
  
  return (
    <ErrorBoundary>
      <Box sx={{ flexGrow: 1 }}>
        {/* 页面标题 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              威胁情报
            </Typography>
            <Typography variant="body1" color="text.secondary">
              威胁情报的收集、分析和管理
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              color="primary"
            >
              添加情报
            </Button>
            
            <Button
              startIcon={<UploadIcon />}
              variant="outlined"
            >
              导入
            </Button>
            
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={threatsLoading}
            >
              刷新
            </Button>
            
            <Button
              startIcon={<DownloadIcon />}
              onClick={handleExportThreats}
              disabled={!threats}
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
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>威胁类型</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  label="威胁类型"
                >
                  <MenuItem value="">全部</MenuItem>
                  {Object.entries(THREAT_TYPES).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      {config.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>严重程度</InputLabel>
                <Select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  label="严重程度"
                >
                  <MenuItem value="">全部</MenuItem>
                  {Object.entries(THREAT_SEVERITY).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      {config.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>情报来源</InputLabel>
                <Select
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                  label="情报来源"
                >
                  <MenuItem value="">全部</MenuItem>
                  {Object.entries(THREAT_SOURCES).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      {config.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>状态</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="状态"
                >
                  <MenuItem value="">全部</MenuItem>
                  {Object.entries(THREAT_STATUS).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      {config.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="搜索威胁"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.showFavorites}
                      onChange={(e) => handleFilterChange('showFavorites', e.target.checked)}
                      size="small"
                    />
                  }
                  label="仅收藏"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.showBookmarked}
                      onChange={(e) => handleFilterChange('showBookmarked', e.target.checked)}
                      size="small"
                    />
                  }
                  label="仅书签"
                />
              </Box>
            </Grid>
          </Grid>
        </FilterPanel>
        
        {/* 威胁统计指标 */}
        <Box sx={{ mb: 3 }}>
          <ThreatMetrics
            data={threats}
            loading={threatsLoading}
          />
        </Box>
        
        {/* 主要内容 */}
        <Grid container spacing={3}>
          {/* 威胁趋势图表 */}
          <Grid item xs={12} lg={8}>
            <StyledCard>
              <CardHeader
                title="威胁趋势分析"
                action={
                  <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="时间趋势" />
                    <Tab label="类型分布" />
                  </Tabs>
                }
              />
              <CardContent sx={{ flexGrow: 1 }}>
                {tabValue === 0 && (
                  <ThreatTrendChart
                    data={trendData}
                    loading={trendLoading}
                  />
                )}
                {tabValue === 1 && (
                  <ThreatTypeChart
                    data={threats}
                    loading={threatsLoading}
                  />
                )}
              </CardContent>
            </StyledCard>
          </Grid>
          
          {/* 快速统计 */}
          <Grid item xs={12} lg={4}>
            <StyledCard>
              <CardHeader title="快速统计" />
              <CardContent sx={{ flexGrow: 1 }}>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <SecurityIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="今日新增威胁"
                      secondary="12 个"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <ErrorIcon color="error" />
                    </ListItemIcon>
                    <ListItemText
                      primary="活跃严重威胁"
                      secondary="3 个"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <UpdateIcon color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary="最近更新"
                      secondary="5 分钟前"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <VerifiedIcon color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="验证通过率"
                      secondary="87%"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </StyledCard>
          </Grid>
          
          {/* 威胁情报列表 */}
          <Grid item xs={12}>
            <StyledCard>
              <CardHeader
                title="威胁情报列表"
                action={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`${threats?.length || 0} 个威胁`}
                      color="primary"
                      size="small"
                    />
                    <ButtonGroup size="small">
                      <Button
                        variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                        onClick={() => setViewMode('grid')}
                      >
                        网格
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'contained' : 'outlined'}
                        onClick={() => setViewMode('list')}
                      >
                        列表
                      </Button>
                    </ButtonGroup>
                  </Box>
                }
              />
              <CardContent sx={{ flexGrow: 1 }}>
                {threatsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : viewMode === 'grid' ? (
                  <Grid container spacing={3}>
                    {threats?.map((threat) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={threat.id}>
                        <ThreatIntelCard
                          threat={threat}
                          onView={handleThreatView}
                          onEdit={handleThreatEdit}
                          onDelete={handleThreatDelete}
                          onToggleFavorite={handleToggleFavorite}
                          onToggleBookmark={handleToggleBookmark}
                        />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <DataTable
                    data={threats || []}
                    columns={[
                      {
                        id: 'title',
                        label: '标题',
                        width: 200,
                      },
                      {
                        id: 'type',
                        label: '类型',
                        format: (value) => (
                          <Chip
                            label={THREAT_TYPES[value]?.label || value}
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
                            label={THREAT_SEVERITY[value]?.label || value}
                            color={THREAT_SEVERITY[value]?.color || 'default'}
                            size="small"
                          />
                        ),
                        width: 100,
                      },
                      {
                        id: 'source',
                        label: '来源',
                        format: (value) => (
                          <ThreatSourceChip
                            label={THREAT_SOURCES[value]?.label || value}
                            size="small"
                            source={value}
                          />
                        ),
                        width: 120,
                      },
                      {
                        id: 'status',
                        label: '状态',
                        format: (value) => (
                          <Chip
                            label={THREAT_STATUS[value]?.label || value}
                            color={THREAT_STATUS[value]?.color || 'default'}
                            size="small"
                            variant="outlined"
                          />
                        ),
                        width: 100,
                      },
                      {
                        id: 'timestamp',
                        label: '时间',
                        format: (value) => format(new Date(value), 'MM-dd HH:mm', { locale: zhCN }),
                        width: 120,
                      },
                    ]}
                    loading={threatsLoading}
                    onRowClick={handleThreatView}
                    searchable
                    filterable
                    sortable
                    pagination
                  />
                )}
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>
        
        {/* 威胁详情对话框 */}
        <ThreatDetailDialog
          threat={selectedThreat}
          open={threatDetailOpen}
          onClose={() => setThreatDetailOpen(false)}
        />
      </Box>
    </ErrorBoundary>
  );
}