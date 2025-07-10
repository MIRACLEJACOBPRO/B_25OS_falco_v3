/**
 * 报告管理页面
 * 提供报告生成、查看、下载和管理功能
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
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  MoreVert as MoreVertIcon,
  Assessment as ReportIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

// 报告状态映射
const REPORT_STATUS = {
  pending: { label: '等待中', color: 'warning', icon: PendingIcon },
  generating: { label: '生成中', color: 'info', icon: ScheduleIcon },
  completed: { label: '已完成', color: 'success', icon: CheckCircleIcon },
  failed: { label: '失败', color: 'error', icon: ErrorIcon },
};

// 报告类型
const REPORT_TYPES = {
  security_summary: '安全摘要报告',
  threat_analysis: '威胁分析报告',
  compliance: '合规性报告',
  incident: '事件报告',
  performance: '性能报告',
  custom: '自定义报告',
};

// 报告格式
const REPORT_FORMATS = {
  pdf: 'PDF',
  excel: 'Excel',
  csv: 'CSV',
  json: 'JSON',
};

// TabPanel组件
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// 报告状态芯片组件
function ReportStatusChip({ status }) {
  const statusConfig = REPORT_STATUS[status] || REPORT_STATUS.pending;
  const Icon = statusConfig.icon;
  
  return (
    <Chip
      icon={<Icon />}
      label={statusConfig.label}
      color={statusConfig.color}
      size="small"
      variant="outlined"
    />
  );
}

// 报告操作菜单组件
function ReportActionsMenu({ report, onView, onDownload, onDelete }) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    action();
    handleClose();
  };

  return (
    <>
      <IconButton onClick={handleClick} size="small">
        <MoreVertIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleAction(() => onView(report))}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>查看详情</ListItemText>
        </MenuItem>
        {report.status === 'completed' && (
          <MenuItem onClick={() => handleAction(() => onDownload(report))}>
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>下载报告</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => handleAction(() => onDelete(report))} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>删除报告</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

// 新建报告对话框组件
function CreateReportDialog({ open, onClose, onSubmit }) {
  const [formData, setFormData] = React.useState({
    name: '',
    type: '',
    format: 'pdf',
    description: '',
    dateRange: {
      start: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    },
    includeCharts: true,
    includeDetails: true,
  });

  const handleChange = (field) => (event) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: event.target.value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: event.target.value,
      }));
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
    onClose();
    setFormData({
      name: '',
      type: '',
      format: 'pdf',
      description: '',
      dateRange: {
        start: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
      },
      includeCharts: true,
      includeDetails: true,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>生成新报告</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="报告名称"
              value={formData.name}
              onChange={handleChange('name')}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>报告类型</InputLabel>
              <Select
                value={formData.type}
                onChange={handleChange('type')}
                label="报告类型"
              >
                {Object.entries(REPORT_TYPES).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>输出格式</InputLabel>
              <Select
                value={formData.format}
                onChange={handleChange('format')}
                label="输出格式"
              >
                {Object.entries(REPORT_FORMATS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="开始日期"
              value={formData.dateRange.start}
              onChange={handleChange('dateRange.start')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="结束日期"
              value={formData.dateRange.end}
              onChange={handleChange('dateRange.end')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="报告描述"
              value={formData.description}
              onChange={handleChange('description')}
              placeholder="请输入报告的详细描述..."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={!formData.name || !formData.type}
        >
          生成报告
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Reports() {
  const theme = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // 状态管理
  const [tabValue, setTabValue] = React.useState(0);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({
    status: '',
    type: '',
    search: '',
  });

  // 模拟报告数据
  const mockReports = [
    {
      id: '1',
      name: '安全摘要报告 - 2024年1月',
      type: 'security_summary',
      format: 'pdf',
      status: 'completed',
      createdAt: '2024-01-15T10:30:00Z',
      completedAt: '2024-01-15T10:35:00Z',
      size: '2.5 MB',
      description: '2024年1月份的安全事件摘要和分析报告',
      createdBy: 'admin',
    },
    {
      id: '2',
      name: '威胁分析报告 - 高危事件',
      type: 'threat_analysis',
      format: 'excel',
      status: 'generating',
      createdAt: '2024-01-15T11:00:00Z',
      progress: 65,
      description: '针对高危安全事件的详细威胁分析',
      createdBy: 'security_analyst',
    },
    {
      id: '3',
      name: '合规性检查报告',
      type: 'compliance',
      format: 'pdf',
      status: 'failed',
      createdAt: '2024-01-15T09:15:00Z',
      error: '数据源连接失败',
      description: '系统合规性检查和评估报告',
      createdBy: 'compliance_officer',
    },
    {
      id: '4',
      name: '事件响应报告 - INC-2024-001',
      type: 'incident',
      format: 'pdf',
      status: 'pending',
      createdAt: '2024-01-15T12:00:00Z',
      description: '安全事件INC-2024-001的响应和处理报告',
      createdBy: 'incident_responder',
    },
  ];

  // 获取报告列表
  const { data: reports = mockReports, isLoading, refetch } = useQuery({
    queryKey: ['reports', filters],
    queryFn: () => api.getReports(filters),
    refetchInterval: 30000, // 30秒刷新一次
  });

  // 生成报告
  const generateReportMutation = useMutation({
    mutationFn: api.generateReport,
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      setCreateDialogOpen(false);
    },
  });

  // 删除报告
  const deleteReportMutation = useMutation({
    mutationFn: api.deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
    },
  });

  // 处理函数
  const handleCreateReport = (reportData) => {
    generateReportMutation.mutate(reportData);
  };

  const handleViewReport = (report) => {
    console.log('查看报告:', report);
  };

  const handleDownloadReport = async (report) => {
    try {
      const blob = await api.downloadReport(report.id, report.format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name}.${report.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('下载报告失败:', error);
    }
  };

  const handleDeleteReport = (report) => {
    if (window.confirm(`确定要删除报告 "${report.name}" 吗？`)) {
      deleteReportMutation.mutate(report.id);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // 过滤报告
  const filteredReports = reports.filter(report => {
    if (filters.status && report.status !== filters.status) return false;
    if (filters.type && report.type !== filters.type) return false;
    if (filters.search && !report.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  // 统计数据
  const stats = {
    total: reports.length,
    completed: reports.filter(r => r.status === 'completed').length,
    generating: reports.filter(r => r.status === 'generating').length,
    failed: reports.filter(r => r.status === 'failed').length,
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题和操作 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          报告管理
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            生成报告
          </Button>
        </Stack>
      </Box>

      {/* 统计卡片 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    总报告数
                  </Typography>
                  <Typography variant="h4" component="div">
                    {stats.total}
                  </Typography>
                </Box>
                <ReportIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    已完成
                  </Typography>
                  <Typography variant="h4" component="div" color="success.main">
                    {stats.completed}
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    生成中
                  </Typography>
                  <Typography variant="h4" component="div" color="info.main">
                    {stats.generating}
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    失败
                  </Typography>
                  <Typography variant="h4" component="div" color="error.main">
                    {stats.failed}
                  </Typography>
                </Box>
                <ErrorIcon sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 主要内容区域 */}
      <Card>
        <CardHeader
          title="报告列表"
          action={
            <Stack direction="row" spacing={2}>
              <TextField
                size="small"
                placeholder="搜索报告..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>状态</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="状态"
                >
                  <MenuItem value="">全部</MenuItem>
                  {Object.entries(REPORT_STATUS).map(([key, config]) => (
                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>类型</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  label="类型"
                >
                  <MenuItem value="">全部</MenuItem>
                  {Object.entries(REPORT_TYPES).map(([key, label]) => (
                    <MenuItem key={key} value={key}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          }
        />
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>报告名称</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>格式</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>创建者</TableCell>
                  <TableCell>大小</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                          {report.name}
                        </Typography>
                        {report.description && (
                          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                            {report.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={REPORT_TYPES[report.type]}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={REPORT_FORMATS[report.format]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <ReportStatusChip status={report.status} />
                        {report.status === 'generating' && report.progress && (
                          <Box sx={{ mt: 1, width: 100 }}>
                            <LinearProgress variant="determinate" value={report.progress} />
                            <Typography variant="caption" color="textSecondary">
                              {report.progress}%
                            </Typography>
                          </Box>
                        )}
                        {report.status === 'failed' && report.error && (
                          <Tooltip title={report.error}>
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                              {report.error}
                            </Typography>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(parseISO(report.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                      </Typography>
                      {report.completedAt && (
                        <Typography variant="caption" color="textSecondary">
                          完成: {format(parseISO(report.completedAt), 'HH:mm')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {report.createdBy}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {report.size || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <ReportActionsMenu
                        report={report}
                        onView={handleViewReport}
                        onDownload={handleDownloadReport}
                        onDelete={handleDeleteReport}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {filteredReports.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <ReportIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                暂无报告
              </Typography>
              <Typography variant="body2" color="textSecondary">
                点击"生成报告"按钮创建您的第一个报告
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 生成报告对话框 */}
      <CreateReportDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateReport}
      />
    </Box>
  );
}