/**
 * 自动化管理页面
 * 提供自动化规则配置、执行监控和管理功能
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Paper,
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
  Tooltip,
  Badge,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  AutoMode as AutoIcon,
  SmartToy as AIIcon,
  Security as SecurityIcon,
  Notifications as NotificationIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { apiService } from '../services/api';

// 模拟数据
const mockAutomationRules = [
  {
    id: '1',
    name: '高危威胁自动阻断',
    description: '检测到高危威胁时自动执行阻断操作',
    type: 'security',
    status: 'active',
    trigger: 'threat_detected',
    conditions: [
      { field: 'severity', operator: 'equals', value: 'critical' },
      { field: 'confidence', operator: 'greater_than', value: 0.9 }
    ],
    actions: [
      { type: 'block_ip', params: { duration: '1h' } },
      { type: 'send_alert', params: { channel: 'email' } }
    ],
    enabled: true,
    lastExecuted: '2024-01-15T10:30:00Z',
    executionCount: 15,
    successRate: 0.93
  },
  {
    id: '2',
    name: '异常行为分析',
    description: '定期分析用户行为异常并生成报告',
    type: 'analysis',
    status: 'active',
    trigger: 'schedule',
    schedule: '0 */6 * * *', // 每6小时执行一次
    conditions: [],
    actions: [
      { type: 'run_analysis', params: { type: 'behavior' } },
      { type: 'generate_report', params: { format: 'pdf' } }
    ],
    enabled: true,
    lastExecuted: '2024-01-15T06:00:00Z',
    executionCount: 48,
    successRate: 0.98
  },
  {
    id: '3',
    name: '系统资源监控',
    description: '监控系统资源使用情况，超阈值时发送告警',
    type: 'monitoring',
    status: 'paused',
    trigger: 'metric_threshold',
    conditions: [
      { field: 'cpu_usage', operator: 'greater_than', value: 80 },
      { field: 'memory_usage', operator: 'greater_than', value: 85 }
    ],
    actions: [
      { type: 'send_notification', params: { urgency: 'high' } },
      { type: 'scale_resources', params: { auto: true } }
    ],
    enabled: false,
    lastExecuted: '2024-01-14T15:45:00Z',
    executionCount: 3,
    successRate: 1.0
  }
];

const mockExecutionHistory = [
  {
    id: '1',
    ruleId: '1',
    ruleName: '高危威胁自动阻断',
    startTime: '2024-01-15T10:30:00Z',
    endTime: '2024-01-15T10:30:15Z',
    status: 'success',
    duration: 15000,
    triggeredBy: 'threat_detected',
    actions: [
      { type: 'block_ip', status: 'success', target: '192.168.1.100' },
      { type: 'send_alert', status: 'success', target: 'admin@company.com' }
    ],
    logs: [
      { timestamp: '2024-01-15T10:30:00Z', level: 'info', message: '检测到高危威胁' },
      { timestamp: '2024-01-15T10:30:05Z', level: 'info', message: '开始执行阻断操作' },
      { timestamp: '2024-01-15T10:30:10Z', level: 'success', message: 'IP地址已成功阻断' },
      { timestamp: '2024-01-15T10:30:15Z', level: 'success', message: '告警邮件已发送' }
    ]
  },
  {
    id: '2',
    ruleId: '2',
    ruleName: '异常行为分析',
    startTime: '2024-01-15T06:00:00Z',
    endTime: '2024-01-15T06:15:30Z',
    status: 'success',
    duration: 930000,
    triggeredBy: 'schedule',
    actions: [
      { type: 'run_analysis', status: 'success', target: 'behavior_analysis' },
      { type: 'generate_report', status: 'success', target: 'report_20240115.pdf' }
    ],
    logs: [
      { timestamp: '2024-01-15T06:00:00Z', level: 'info', message: '开始行为分析' },
      { timestamp: '2024-01-15T06:10:00Z', level: 'info', message: '分析完成，生成报告' },
      { timestamp: '2024-01-15T06:15:30Z', level: 'success', message: '报告生成完成' }
    ]
  }
];

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`automation-tabpanel-${index}`}
      aria-labelledby={`automation-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function AutomationRuleCard({ rule, onEdit, onDelete, onToggle, onExecute }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'security': return <SecurityIcon />;
      case 'analysis': return <AIIcon />;
      case 'monitoring': return <TimelineIcon />;
      default: return <AutoIcon />;
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader
        avatar={getTypeIcon(rule.type)}
        title={rule.name}
        subheader={rule.description}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={rule.status}
              color={getStatusColor(rule.status)}
              size="small"
            />
            <Switch
              checked={rule.enabled}
              onChange={(e) => onToggle(rule.id, e.target.checked)}
              size="small"
            />
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              触发器
            </Typography>
            <Typography variant="body1">
              {rule.trigger === 'schedule' ? '定时执行' : 
               rule.trigger === 'threat_detected' ? '威胁检测' :
               rule.trigger === 'metric_threshold' ? '指标阈值' : rule.trigger}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              执行次数
            </Typography>
            <Typography variant="body1">
              {rule.executionCount}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              成功率
            </Typography>
            <Typography variant="body1">
              {(rule.successRate * 100).toFixed(1)}%
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              最后执行
            </Typography>
            <Typography variant="body1">
              {new Date(rule.lastExecuted).toLocaleString()}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
      <CardActions>
        <Button
          size="small"
          startIcon={<PlayIcon />}
          onClick={() => onExecute(rule.id)}
          disabled={!rule.enabled}
        >
          立即执行
        </Button>
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={() => onEdit(rule)}
        >
          编辑
        </Button>
        <Button
          size="small"
          startIcon={<DeleteIcon />}
          color="error"
          onClick={() => onDelete(rule.id)}
        >
          删除
        </Button>
      </CardActions>
    </Card>
  );
}

function ExecutionHistoryTable({ executions, loading }) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckIcon color="success" />;
      case 'error': return <ErrorIcon color="error" />;
      case 'running': return <AutoIcon color="primary" />;
      default: return <InfoIcon />;
    }
  };

  if (loading) {
    return <LoadingSpinner type="table" />;
  }

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>状态</TableCell>
              <TableCell>规则名称</TableCell>
              <TableCell>开始时间</TableCell>
              <TableCell>持续时间</TableCell>
              <TableCell>触发方式</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {executions
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(execution.status)}
                      <Typography variant="body2">
                        {execution.status}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{execution.ruleName}</TableCell>
                  <TableCell>
                    {new Date(execution.startTime).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {(execution.duration / 1000).toFixed(1)}s
                  </TableCell>
                  <TableCell>{execution.triggeredBy}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined">
                      查看详情
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={executions.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />
    </Paper>
  );
}

function AutomationStats({ rules, executions }) {
  const activeRules = rules.filter(rule => rule.enabled).length;
  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter(exec => exec.status === 'success').length;
  const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100).toFixed(1) : 0;

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AutoIcon color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" component="div">
                  {rules.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  自动化规则
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
              <PlayIcon color="success" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" component="div">
                  {activeRules}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  活跃规则
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
              <TimelineIcon color="info" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" component="div">
                  {totalExecutions}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  总执行次数
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
              <CheckIcon color="success" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" component="div">
                  {successRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  成功率
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default function Automation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = React.useState(0);
  const [rules, setRules] = React.useState(mockAutomationRules);
  const [executions, setExecutions] = React.useState(mockExecutionHistory);
  const [loading, setLoading] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState(null);

  // 处理规则操作
  const handleToggleRule = (ruleId, enabled) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled } : rule
    ));
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setCreateDialogOpen(true);
  };

  const handleDeleteRule = (ruleId) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  const handleExecuteRule = (ruleId) => {
    // 模拟执行规则
    console.log('执行规则:', ruleId);
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setCreateDialogOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          自动化管理
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => queryClient.invalidateQueries(['automation'])}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateRule}
          >
            创建规则
          </Button>
        </Box>
      </Box>

      {/* 统计信息 */}
      <AutomationStats rules={rules} executions={executions} />

      {/* 主要内容区域 */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="自动化规则" />
            <Tab label="执行历史" />
            <Tab label="系统设置" />
          </Tabs>
        </Box>

        {/* 自动化规则标签页 */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="搜索规则..."
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>状态</InputLabel>
              <Select label="状态">
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="active">活跃</MenuItem>
                <MenuItem value="paused">暂停</MenuItem>
                <MenuItem value="error">错误</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>类型</InputLabel>
              <Select label="类型">
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="security">安全</MenuItem>
                <MenuItem value="analysis">分析</MenuItem>
                <MenuItem value="monitoring">监控</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {rules.map((rule) => (
            <AutomationRuleCard
              key={rule.id}
              rule={rule}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
              onToggle={handleToggleRule}
              onExecute={handleExecuteRule}
            />
          ))}
        </TabPanel>

        {/* 执行历史标签页 */}
        <TabPanel value={tabValue} index={1}>
          <ExecutionHistoryTable executions={executions} loading={loading} />
        </TabPanel>

        {/* 系统设置标签页 */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="执行引擎设置" />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="启用自动化执行"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="并行执行规则"
                    />
                    <TextField
                      label="最大并发执行数"
                      type="number"
                      defaultValue={5}
                      size="small"
                    />
                    <TextField
                      label="执行超时时间(秒)"
                      type="number"
                      defaultValue={300}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="通知设置" />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="执行成功通知"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="执行失败通知"
                    />
                    <FormControlLabel
                      control={<Switch />}
                      label="定期状态报告"
                    />
                    <TextField
                      label="通知邮箱"
                      type="email"
                      defaultValue="admin@company.com"
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* 创建/编辑规则对话框 */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingRule ? '编辑自动化规则' : '创建自动化规则'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="规则名称"
              fullWidth
              defaultValue={editingRule?.name || ''}
            />
            <TextField
              label="描述"
              fullWidth
              multiline
              rows={2}
              defaultValue={editingRule?.description || ''}
            />
            <FormControl fullWidth>
              <InputLabel>规则类型</InputLabel>
              <Select
                label="规则类型"
                defaultValue={editingRule?.type || 'security'}
              >
                <MenuItem value="security">安全</MenuItem>
                <MenuItem value="analysis">分析</MenuItem>
                <MenuItem value="monitoring">监控</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>触发器</InputLabel>
              <Select
                label="触发器"
                defaultValue={editingRule?.trigger || 'threat_detected'}
              >
                <MenuItem value="threat_detected">威胁检测</MenuItem>
                <MenuItem value="schedule">定时执行</MenuItem>
                <MenuItem value="metric_threshold">指标阈值</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch defaultChecked={editingRule?.enabled ?? true} />
              }
              label="启用规则"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={() => setCreateDialogOpen(false)}>
            {editingRule ? '更新' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}