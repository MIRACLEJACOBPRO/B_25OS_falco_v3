/**
 * 配置管理页面
 * 提供系统配置、规则配置、用户设置等管理功能
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
  FormGroup,
  FormHelperText,
  InputAdornment,
  OutlinedInput,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Copy as CopyIcon,
  Share as ShareIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Schedule as TimeIcon,
  Security as SecurityIcon,
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
  Code as CodeIcon,
  Build as BuildIcon,
  Tune as TuneIcon,
  Dashboard as DashboardIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Webhook as WebhookIcon,
  Api as ApiIcon,
  Database as DatabaseIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  RestartAlt as RestartIcon,
  PowerSettingsNew as PowerIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  ImportExport as ImportExportIcon,
  Transform as TransformIcon,
  Rule as RuleIcon,
  Policy as PolicyIcon,
  AdminPanelSettings as AdminIcon,
  ManageAccounts as ManageIcon,
  AccountTree as TreeIcon,
  Extension as ExtensionIcon,
  Extension as IntegrationIcon,
  Webhook as WebhookIcon2,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format, subDays, subHours, subMinutes, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { apiService } from '../services/api';
import { useWebSocket, WS_EVENTS } from '../services/websocket';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import DataTable from '../components/common/DataTable';
import { FormBuilder } from '../components/common/FormComponents';
import ConnectionStatus from '../components/common/ConnectionStatus';

// 样式化组件
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const ConfigSection = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const ConfigItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(1),
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
}));

const RuleCard = styled(Card)(({ theme, status }) => {
  const statusColors = {
    active: theme.palette.success.main,
    inactive: theme.palette.grey[500],
    error: theme.palette.error.main,
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
      backgroundColor: statusColors[status] || theme.palette.primary.main,
      borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
    },
  };
});

// 配置类别
const CONFIG_CATEGORIES = {
  system: {
    label: '系统配置',
    icon: SettingsIcon,
    color: '#2196f3',
    description: '系统基础配置和运行参数',
  },
  security: {
    label: '安全配置',
    icon: SecurityIcon,
    color: '#f44336',
    description: '安全策略和防护配置',
  },
  monitoring: {
    label: '监控配置',
    icon: RadarIcon,
    color: '#ff9800',
    description: '监控规则和告警配置',
  },
  network: {
    label: '网络配置',
    icon: NetworkIcon,
    color: '#4caf50',
    description: '网络连接和通信配置',
  },
  storage: {
    label: '存储配置',
    icon: StorageIcon,
    color: '#9c27b0',
    description: '数据存储和备份配置',
  },
  integration: {
    label: '集成配置',
    icon: IntegrationIcon,
    color: '#607d8b',
    description: '第三方系统集成配置',
  },
  notification: {
    label: '通知配置',
    icon: NotificationsIcon,
    color: '#795548',
    description: '告警通知和消息配置',
  },
  user: {
    label: '用户配置',
    icon: PersonIcon,
    color: '#009688',
    description: '用户权限和访问配置',
  },
};

// 规则状态
const RULE_STATUS = {
  active: { label: '启用', color: 'success', icon: PlayIcon },
  inactive: { label: '禁用', color: 'default', icon: PauseIcon },
  error: { label: '错误', color: 'error', icon: ErrorIcon },
};

// 规则类型
const RULE_TYPES = {
  detection: { label: '检测规则', icon: RadarIcon, color: '#2196f3' },
  prevention: { label: '防护规则', icon: ShieldIcon, color: '#4caf50' },
  response: { label: '响应规则', icon: AutoFixIcon, color: '#ff9800' },
  correlation: { label: '关联规则', icon: HubIcon, color: '#9c27b0' },
  enrichment: { label: '增强规则', icon: ExtensionIcon, color: '#607d8b' },
};

// 模拟配置数据
const generateMockConfigData = () => {
  return {
    system: {
      general: {
        systemName: 'Falco AI Security',
        version: '1.0.0',
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
        logLevel: 'INFO',
        maxLogSize: '100MB',
        logRetention: '30',
        enableDebug: false,
        enableMetrics: true,
      },
      performance: {
        maxConcurrentTasks: 100,
        taskTimeout: 300,
        memoryLimit: '2GB',
        cpuLimit: '80%',
        diskSpaceThreshold: '85%',
        enableCaching: true,
        cacheSize: '512MB',
        cacheTTL: 3600,
      },
    },
    security: {
      authentication: {
        enableMFA: true,
        sessionTimeout: 3600,
        maxLoginAttempts: 5,
        lockoutDuration: 900,
        passwordMinLength: 8,
        passwordComplexity: true,
        enableSSO: false,
        ssoProvider: '',
      },
      encryption: {
        algorithm: 'AES-256',
        keyRotationInterval: 90,
        enableTLS: true,
        tlsVersion: '1.3',
        certificatePath: '/etc/ssl/certs/',
        enableHSM: false,
      },
    },
    monitoring: {
      collection: {
        enableRealtime: true,
        batchSize: 1000,
        flushInterval: 5,
        enableCompression: true,
        retentionPeriod: 90,
        enableSampling: false,
        samplingRate: 0.1,
      },
      alerting: {
        enableAlerts: true,
        alertThreshold: 'medium',
        maxAlertsPerMinute: 100,
        enableDeduplication: true,
        deduplicationWindow: 300,
        enableEscalation: true,
        escalationDelay: 1800,
      },
    },
    network: {
      connection: {
        bindAddress: '0.0.0.0',
        port: 8080,
        enableHTTPS: true,
        httpsPort: 8443,
        maxConnections: 1000,
        connectionTimeout: 30,
        keepAliveTimeout: 60,
      },
      proxy: {
        enableProxy: false,
        proxyHost: '',
        proxyPort: 8080,
        proxyUsername: '',
        proxyPassword: '',
        noProxyHosts: 'localhost,127.0.0.1',
      },
    },
    storage: {
      database: {
        type: 'PostgreSQL',
        host: 'localhost',
        port: 5432,
        database: 'falco_security',
        username: 'falco_user',
        maxConnections: 50,
        connectionTimeout: 30,
        enableSSL: true,
      },
      backup: {
        enableAutoBackup: true,
        backupInterval: 24,
        backupRetention: 30,
        backupLocation: '/var/backups/falco',
        enableCompression: true,
        enableEncryption: true,
      },
    },
    integration: {
      siem: {
        enableSplunk: false,
        splunkHost: '',
        splunkPort: 8088,
        splunkToken: '',
        enableElastic: true,
        elasticHost: 'localhost',
        elasticPort: 9200,
        elasticIndex: 'falco-events',
      },
      webhook: {
        enableWebhooks: true,
        maxRetries: 3,
        retryDelay: 5,
        timeout: 30,
        enableSignature: true,
        signatureSecret: '',
      },
    },
    notification: {
      email: {
        enableEmail: true,
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        enableTLS: true,
        fromAddress: 'noreply@example.com',
      },
      slack: {
        enableSlack: false,
        webhookUrl: '',
        channel: '#security-alerts',
        username: 'Falco Security',
        enableMentions: true,
      },
    },
    user: {
      defaults: {
        defaultRole: 'viewer',
        enableSelfRegistration: false,
        requireEmailVerification: true,
        defaultDashboard: 'overview',
        defaultTheme: 'light',
        enableNotifications: true,
      },
      permissions: {
        enableRBAC: true,
        enableAuditLog: true,
        auditRetention: 365,
        enableAPIAccess: true,
        apiRateLimit: 1000,
        enableBulkOperations: false,
      },
    },
  };
};

// 模拟规则数据
const generateMockRulesData = () => {
  const rules = [];
  const types = Object.keys(RULE_TYPES);
  const statuses = Object.keys(RULE_STATUS);
  
  for (let i = 0; i < 20; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    rules.push({
      id: `rule_${i + 1}`,
      name: `规则 ${i + 1}`,
      description: `这是一个${RULE_TYPES[type].label}的描述`,
      type,
      status,
      priority: Math.floor(Math.random() * 5) + 1,
      enabled: status === 'active',
      conditions: [
        {
          field: 'process.name',
          operator: 'equals',
          value: 'suspicious_process',
        },
        {
          field: 'file.path',
          operator: 'contains',
          value: '/tmp/',
        },
      ],
      actions: [
        {
          type: 'alert',
          severity: 'high',
          message: '检测到可疑活动',
        },
        {
          type: 'block',
          duration: 300,
        },
      ],
      tags: [`tag-${Math.floor(Math.random() * 5) + 1}`],
      author: `admin`,
      createdAt: subDays(new Date(), Math.random() * 30),
      updatedAt: subHours(new Date(), Math.random() * 24),
      lastTriggered: Math.random() > 0.5 ? subMinutes(new Date(), Math.random() * 60) : null,
      triggerCount: Math.floor(Math.random() * 100),
    });
  }
  
  return rules.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

// 配置项组件
function ConfigurationItem({ label, value, type = 'text', options = [], onChange, disabled = false, helperText = '' }) {
  const renderInput = () => {
    switch (type) {
      case 'boolean':
        return (
          <Switch
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
        );
      case 'select':
        return (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
            >
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'number':
        return (
          <TextField
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            size="small"
            sx={{ width: 200 }}
          />
        );
      case 'password':
        return (
          <TextField
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            size="small"
            sx={{ width: 200 }}
          />
        );
      default:
        return (
          <TextField
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            size="small"
            sx={{ width: 200 }}
          />
        );
    }
  };
  
  return (
    <ConfigItem>
      <Box>
        <Typography variant="body2" fontWeight="medium">
          {label}
        </Typography>
        {helperText && (
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        )}
      </Box>
      {renderInput()}
    </ConfigItem>
  );
}

// 配置分组组件
function ConfigurationGroup({ title, icon: IconComponent, configs, onConfigChange }) {
  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconComponent color="primary" />
          <Typography variant="h6">{title}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {Object.entries(configs).map(([key, config]) => (
            <ConfigurationItem
              key={key}
              label={config.label}
              value={config.value}
              type={config.type}
              options={config.options}
              onChange={(value) => onConfigChange(key, value)}
              disabled={config.disabled}
              helperText={config.helperText}
            />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

// 规则卡片组件
function RuleCardComponent({ rule, onEdit, onDelete, onToggle, onTest }) {
  const typeConfig = RULE_TYPES[rule.type] || RULE_TYPES.detection;
  const statusConfig = RULE_STATUS[rule.status] || RULE_STATUS.inactive;
  
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;
  
  return (
    <RuleCard status={rule.status}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: typeConfig.color }}>
            <TypeIcon />
          </Avatar>
        }
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" noWrap>
              {rule.name}
            </Typography>
            <Chip
              icon={<StatusIcon />}
              label={statusConfig.label}
              color={statusConfig.color}
              size="small"
            />
          </Box>
        }
        subheader={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip
              label={typeConfig.label}
              size="small"
              variant="outlined"
              sx={{ bgcolor: alpha(typeConfig.color, 0.1), color: typeConfig.color }}
            />
            <Chip
              label={`优先级: ${rule.priority}`}
              size="small"
              variant="outlined"
            />
          </Box>
        }
        action={
          <Switch
            checked={rule.enabled}
            onChange={() => onToggle(rule.id)}
            color="primary"
          />
        }
      />
      
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          {rule.description}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            条件 ({rule.conditions.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {rule.conditions.slice(0, 2).map((condition, index) => (
              <Chip
                key={index}
                label={`${condition.field} ${condition.operator} ${condition.value}`}
                size="small"
                variant="outlined"
              />
            ))}
            {rule.conditions.length > 2 && (
              <Chip
                label={`+${rule.conditions.length - 2} 更多`}
                size="small"
              />
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              触发次数: {rule.triggerCount}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {format(new Date(rule.updatedAt), 'MM-dd HH:mm', { locale: zhCN })}
          </Typography>
        </Box>
      </CardContent>
      
      <CardActions>
        <Button size="small" onClick={() => onEdit(rule)}>
          编辑
        </Button>
        <Button size="small" onClick={() => onTest(rule)}>
          测试
        </Button>
        <Button size="small" color="error" onClick={() => onDelete(rule.id)}>
          删除
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {rule.lastTriggered && (
          <Typography variant="caption" color="text.secondary">
            最后触发: {format(new Date(rule.lastTriggered), 'HH:mm', { locale: zhCN })}
          </Typography>
        )}
      </CardActions>
    </RuleCard>
  );
}

// 规则编辑对话框
function RuleEditDialog({ rule, open, onClose, onSave }) {
  const [formData, setFormData] = React.useState(rule || {
    name: '',
    description: '',
    type: 'detection',
    priority: 3,
    enabled: true,
    conditions: [],
    actions: [],
    tags: [],
  });
  
  React.useEffect(() => {
    if (rule) {
      setFormData(rule);
    }
  }, [rule]);
  
  const handleSave = () => {
    onSave(formData);
    onClose();
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {rule ? '编辑规则' : '创建规则'}
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="规则名称"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>规则类型</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="规则类型"
              >
                {Object.entries(RULE_TYPES).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="描述"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography gutterBottom>优先级</Typography>
            <Slider
              value={formData.priority}
              onChange={(e, value) => setFormData({ ...formData, priority: value })}
              min={1}
              max={5}
              marks
              step={1}
              valueLabelDisplay="auto"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
              }
              label="启用规则"
            />
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// 主配置管理页面组件
export default function Configuration() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  
  // 状态管理
  const [tabValue, setTabValue] = React.useState(0);
  const [selectedRule, setSelectedRule] = React.useState(null);
  const [ruleEditOpen, setRuleEditOpen] = React.useState(false);
  const [configData, setConfigData] = React.useState(generateMockConfigData());
  const [hasChanges, setHasChanges] = React.useState(false);
  
  // 获取规则数据
  const { data: rules, isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ['rules'],
    queryFn: () => {
      // 在实际应用中，这里应该调用真实的API
      // return apiService.getRules();
      
      // 模拟数据
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(generateMockRulesData());
        }, 1000);
      });
    },
  });
  
  // 保存配置的 mutation
  const saveConfigMutation = useMutation({
    mutationFn: (config) => {
      // 在实际应用中，这里应该调用真实的API
      // return apiService.saveConfiguration(config);
      
      // 模拟保存
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ success: true });
        }, 1000);
      });
    },
    onSuccess: () => {
      toast.success('配置已保存');
      setHasChanges(false);
    },
    onError: () => {
      toast.error('保存配置失败');
    },
  });
  
  // 事件处理函数
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleConfigChange = (category, section, key, value) => {
    setConfigData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [section]: {
          ...prev[category][section],
          [key]: value,
        },
      },
    }));
    setHasChanges(true);
  };
  
  const handleSaveConfig = () => {
    saveConfigMutation.mutate(configData);
  };
  
  const handleResetConfig = () => {
    setConfigData(generateMockConfigData());
    setHasChanges(false);
    toast.info('配置已重置');
  };
  
  const handleExportConfig = () => {
    const dataStr = JSON.stringify(configData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `falco-config-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('配置已导出');
  };
  
  const handleImportConfig = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedConfig = JSON.parse(e.target.result);
          setConfigData(importedConfig);
          setHasChanges(true);
          toast.success('配置已导入');
        } catch (error) {
          toast.error('导入配置失败：文件格式错误');
        }
      };
      reader.readAsText(file);
    }
  };
  
  const handleRuleEdit = (rule) => {
    setSelectedRule(rule);
    setRuleEditOpen(true);
  };
  
  const handleRuleDelete = (ruleId) => {
    toast.success('规则已删除');
    refetchRules();
  };
  
  const handleRuleToggle = (ruleId) => {
    toast.success('规则状态已更新');
    refetchRules();
  };
  
  const handleRuleTest = (rule) => {
    toast.info('规则测试功能开发中...');
  };
  
  const handleRuleSave = (ruleData) => {
    toast.success('规则已保存');
    refetchRules();
  };
  
  // 渲染配置表单
  const renderConfigurationForm = () => {
    return (
      <Box>
        {Object.entries(CONFIG_CATEGORIES).map(([categoryKey, categoryConfig]) => {
          const categoryData = configData[categoryKey];
          if (!categoryData) return null;
          
          return (
            <ConfigSection key={categoryKey}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <categoryConfig.icon sx={{ color: categoryConfig.color }} />
                <Typography variant="h5">{categoryConfig.label}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                {categoryConfig.description}
              </Typography>
              
              {Object.entries(categoryData).map(([sectionKey, sectionData]) => (
                <Accordion key={sectionKey} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                      {sectionKey.replace(/([A-Z])/g, ' $1').trim()}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {Object.entries(sectionData).map(([key, value]) => {
                        const configKey = `${categoryKey}.${sectionKey}.${key}`;
                        
                        // 根据值类型和键名推断输入类型
                        let inputType = 'text';
                        let options = [];
                        
                        if (typeof value === 'boolean') {
                          inputType = 'boolean';
                        } else if (typeof value === 'number') {
                          inputType = 'number';
                        } else if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
                          inputType = 'password';
                        } else if (key === 'logLevel') {
                          inputType = 'select';
                          options = [
                            { value: 'DEBUG', label: 'DEBUG' },
                            { value: 'INFO', label: 'INFO' },
                            { value: 'WARN', label: 'WARN' },
                            { value: 'ERROR', label: 'ERROR' },
                          ];
                        } else if (key === 'timezone') {
                          inputType = 'select';
                          options = [
                            { value: 'Asia/Shanghai', label: '上海' },
                            { value: 'UTC', label: 'UTC' },
                            { value: 'America/New_York', label: '纽约' },
                          ];
                        }
                        
                        return (
                          <Grid item xs={12} md={6} key={key}>
                            <ConfigurationItem
                              label={key.replace(/([A-Z])/g, ' $1').trim()}
                              value={value}
                              type={inputType}
                              options={options}
                              onChange={(newValue) => handleConfigChange(categoryKey, sectionKey, key, newValue)}
                              helperText={getConfigHelperText(configKey)}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </ConfigSection>
          );
        })}
      </Box>
    );
  };
  
  // 获取配置项帮助文本
  const getConfigHelperText = (configKey) => {
    const helpTexts = {
      'system.general.systemName': '系统显示名称',
      'system.general.logLevel': '日志记录级别',
      'system.performance.maxConcurrentTasks': '最大并发任务数',
      'security.authentication.enableMFA': '启用多因素认证',
      'security.authentication.sessionTimeout': '会话超时时间（秒）',
      'monitoring.collection.enableRealtime': '启用实时数据收集',
      'network.connection.port': 'HTTP 服务端口',
      'storage.database.maxConnections': '数据库最大连接数',
      // 添加更多帮助文本...
    };
    
    return helpTexts[configKey] || '';
  };
  
  return (
    <ErrorBoundary>
      <Box sx={{ flexGrow: 1 }}>
        {/* 页面标题 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              配置管理
            </Typography>
            <Typography variant="body1" color="text.secondary">
              系统配置、规则管理和用户设置
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {tabValue === 0 && (
              <>
                <input
                  accept=".json"
                  style={{ display: 'none' }}
                  id="import-config-file"
                  type="file"
                  onChange={handleImportConfig}
                />
                <label htmlFor="import-config-file">
                  <Button
                    component="span"
                    startIcon={<UploadIcon />}
                    variant="outlined"
                  >
                    导入
                  </Button>
                </label>
                
                <Button
                  startIcon={<DownloadIcon />}
                  onClick={handleExportConfig}
                  variant="outlined"
                >
                  导出
                </Button>
                
                <Button
                  startIcon={<RestartIcon />}
                  onClick={handleResetConfig}
                  disabled={!hasChanges}
                >
                  重置
                </Button>
                
                <Button
                  startIcon={<SaveIcon />}
                  onClick={handleSaveConfig}
                  disabled={!hasChanges || saveConfigMutation.isLoading}
                  variant="contained"
                >
                  {saveConfigMutation.isLoading ? '保存中...' : '保存配置'}
                </Button>
              </>
            )}
            
            {tabValue === 1 && (
              <>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedRule(null);
                    setRuleEditOpen(true);
                  }}
                  variant="contained"
                >
                  创建规则
                </Button>
                
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={() => refetchRules()}
                  disabled={rulesLoading}
                >
                  刷新
                </Button>
              </>
            )}
          </Box>
        </Box>
        
        {/* 连接状态显示 */}
        <ConnectionStatus isConnected={isConnected} />
        
        {/* 未保存更改警告 */}
        {hasChanges && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>有未保存的更改</AlertTitle>
            您有未保存的配置更改，请记得保存。
          </Alert>
        )}
        
        {/* 主要内容 */}
        <StyledCard>
          <CardHeader
            title={
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab
                  icon={<SettingsIcon />}
                  label="系统配置"
                  iconPosition="start"
                />
                <Tab
                  icon={<RuleIcon />}
                  label="规则管理"
                  iconPosition="start"
                />
                <Tab
                  icon={<IntegrationIcon />}
                  label="集成配置"
                  iconPosition="start"
                />
                <Tab
                  icon={<BackupIcon />}
                  label="备份恢复"
                  iconPosition="start"
                />
              </Tabs>
            }
          />
          
          <CardContent sx={{ flexGrow: 1, p: 0 }}>
            {/* 系统配置 */}
            {tabValue === 0 && (
              <Box sx={{ p: 3 }}>
                {renderConfigurationForm()}
              </Box>
            )}
            
            {/* 规则管理 */}
            {tabValue === 1 && (
              <Box sx={{ p: 3 }}>
                {rulesLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {rules?.map((rule) => (
                      <Grid item xs={12} sm={6} md={4} key={rule.id}>
                        <RuleCardComponent
                          rule={rule}
                          onEdit={handleRuleEdit}
                          onDelete={handleRuleDelete}
                          onToggle={handleRuleToggle}
                          onTest={handleRuleTest}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}
            
            {/* 集成配置 */}
            {tabValue === 2 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  第三方系统集成
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  配置与外部系统的集成，如 SIEM、通知系统等。
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader
                        avatar={<Avatar><ApiIcon /></Avatar>}
                        title="SIEM 集成"
                        subheader="Splunk, Elastic Stack"
                      />
                      <CardContent>
                        <Typography variant="body2" color="text.secondary">
                          配置与 SIEM 系统的集成，自动发送安全事件和日志。
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button size="small">配置</Button>
                        <Button size="small">测试连接</Button>
                      </CardActions>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader
                        avatar={<Avatar><NotificationsIcon /></Avatar>}
                        title="通知集成"
                        subheader="Email, Slack, Webhook"
                      />
                      <CardContent>
                        <Typography variant="body2" color="text.secondary">
                          配置告警通知渠道，及时接收安全事件通知。
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button size="small">配置</Button>
                        <Button size="small">发送测试</Button>
                      </CardActions>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            {/* 备份恢复 */}
            {tabValue === 3 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  备份与恢复
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  管理系统配置和数据的备份与恢复。
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader
                        avatar={<Avatar><BackupIcon /></Avatar>}
                        title="创建备份"
                        subheader="备份当前配置和数据"
                      />
                      <CardContent>
                        <Typography variant="body2" color="text.secondary">
                          创建包含所有配置、规则和数据的完整备份。
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button size="small" variant="contained">
                          立即备份
                        </Button>
                        <Button size="small">
                          计划备份
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader
                        avatar={<Avatar><RestoreIcon /></Avatar>}
                        title="恢复数据"
                        subheader="从备份恢复配置和数据"
                      />
                      <CardContent>
                        <Typography variant="body2" color="text.secondary">
                          从之前的备份文件恢复系统配置和数据。
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button size="small" variant="outlined">
                          选择备份
                        </Button>
                        <Button size="small">
                          查看历史
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </StyledCard>
        
        {/* 规则编辑对话框 */}
        <RuleEditDialog
          rule={selectedRule}
          open={ruleEditOpen}
          onClose={() => setRuleEditOpen(false)}
          onSave={handleRuleSave}
        />
      </Box>
    </ErrorBoundary>
  );
}