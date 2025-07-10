import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Switch,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Divider,
  Alert,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Slider,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
  Language as LanguageIcon,
  Storage as StorageIcon,
  Backup as BackupIcon,
  RestoreFromTrash as RestoreIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import toast from 'react-hot-toast';

// 模拟API调用
const mockApiCall = (delay = 1000) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, message: '操作成功' });
    }, delay);
  });
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
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

function GeneralSettings() {
  const [settings, setSettings] = useState({
    systemName: 'Falco AI Security',
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    autoSave: true,
    enableNotifications: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await mockApiCall();
      toast.success('通用设置已保存');
    } catch (error) {
      toast.error('保存失败');
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="基本设置" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="系统名称"
                value={settings.systemName}
                onChange={(e) => handleSettingChange('systemName', e.target.value)}
                fullWidth
              />
              
              <FormControl fullWidth>
                <InputLabel>语言</InputLabel>
                <Select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                >
                  <MenuItem value="zh-CN">中文（简体）</MenuItem>
                  <MenuItem value="zh-TW">中文（繁体）</MenuItem>
                  <MenuItem value="en-US">English</MenuItem>
                  <MenuItem value="ja-JP">日本語</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>时区</InputLabel>
                <Select
                  value={settings.timezone}
                  onChange={(e) => handleSettingChange('timezone', e.target.value)}
                >
                  <MenuItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</MenuItem>
                  <MenuItem value="Asia/Tokyo">Asia/Tokyo (UTC+9)</MenuItem>
                  <MenuItem value="America/New_York">America/New_York (UTC-5)</MenuItem>
                  <MenuItem value="Europe/London">Europe/London (UTC+0)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="系统行为" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoSave}
                    onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                  />
                }
                label="自动保存"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableNotifications}
                    onChange={(e) => handleSettingChange('enableNotifications', e.target.checked)}
                  />
                }
                label="启用通知"
              />
              
              <Box>
                <Typography gutterBottom>会话超时时间（分钟）</Typography>
                <Slider
                  value={settings.sessionTimeout}
                  onChange={(e, value) => handleSettingChange('sessionTimeout', value)}
                  min={5}
                  max={120}
                  step={5}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
              
              <TextField
                label="最大登录尝试次数"
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 10 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            重置
          </Button>
          <Button variant="contained" onClick={handleSave}>
            保存设置
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}

function SecuritySettings() {
  const [settings, setSettings] = useState({
    twoFactorAuth: false,
    passwordPolicy: 'medium',
    sessionSecurity: true,
    ipWhitelist: [],
    auditLog: true,
    encryptionLevel: 'aes256'
  });
  
  const [newIp, setNewIp] = useState('');
  const [ipDialogOpen, setIpDialogOpen] = useState(false);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const addIpToWhitelist = () => {
    if (newIp && !settings.ipWhitelist.includes(newIp)) {
      setSettings(prev => ({
        ...prev,
        ipWhitelist: [...prev.ipWhitelist, newIp]
      }));
      setNewIp('');
      setIpDialogOpen(false);
      toast.success('IP地址已添加到白名单');
    }
  };

  const removeIpFromWhitelist = (ip) => {
    setSettings(prev => ({
      ...prev,
      ipWhitelist: prev.ipWhitelist.filter(item => item !== ip)
    }));
    toast.success('IP地址已从白名单移除');
  };

  const handleSave = async () => {
    try {
      await mockApiCall();
      toast.success('安全设置已保存');
    } catch (error) {
      toast.error('保存失败');
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="认证设置" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.twoFactorAuth}
                    onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
                  />
                }
                label="双因素认证"
              />
              
              <FormControl fullWidth>
                <InputLabel>密码策略</InputLabel>
                <Select
                  value={settings.passwordPolicy}
                  onChange={(e) => handleSettingChange('passwordPolicy', e.target.value)}
                >
                  <MenuItem value="low">低（6位以上）</MenuItem>
                  <MenuItem value="medium">中（8位，包含数字和字母）</MenuItem>
                  <MenuItem value="high">高（12位，包含特殊字符）</MenuItem>
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.sessionSecurity}
                    onChange={(e) => handleSettingChange('sessionSecurity', e.target.checked)}
                  />
                }
                label="会话安全检查"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="访问控制" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">IP白名单</Typography>
                <IconButton onClick={() => setIpDialogOpen(true)}>
                  <AddIcon />
                </IconButton>
              </Box>
              
              <List dense>
                {settings.ipWhitelist.map((ip, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={ip} />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => removeIpFromWhitelist(ip)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {settings.ipWhitelist.length === 0 && (
                  <ListItem>
                    <ListItemText primary="暂无IP白名单" secondary="点击右上角+号添加" />
                  </ListItem>
                )}
              </List>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.auditLog}
                    onChange={(e) => handleSettingChange('auditLog', e.target.checked)}
                  />
                }
                label="启用审计日志"
              />
              
              <FormControl fullWidth>
                <InputLabel>加密级别</InputLabel>
                <Select
                  value={settings.encryptionLevel}
                  onChange={(e) => handleSettingChange('encryptionLevel', e.target.value)}
                >
                  <MenuItem value="aes128">AES-128</MenuItem>
                  <MenuItem value="aes256">AES-256</MenuItem>
                  <MenuItem value="rsa2048">RSA-2048</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            重置
          </Button>
          <Button variant="contained" onClick={handleSave}>
            保存设置
          </Button>
        </Box>
      </Grid>
      
      {/* IP添加对话框 */}
      <Dialog open={ipDialogOpen} onClose={() => setIpDialogOpen(false)}>
        <DialogTitle>添加IP到白名单</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="IP地址"
            placeholder="例如：192.168.1.100"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIpDialogOpen(false)}>取消</Button>
          <Button onClick={addIpToWhitelist} variant="contained">添加</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    alertTypes: {
      security: true,
      system: true,
      performance: false,
      maintenance: true
    },
    notificationFrequency: 'immediate',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleAlertTypeChange = (type, value) => {
    setSettings(prev => ({
      ...prev,
      alertTypes: { ...prev.alertTypes, [type]: value }
    }));
  };

  const handleQuietHoursChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      quietHours: { ...prev.quietHours, [key]: value }
    }));
  };

  const handleSave = async () => {
    try {
      await mockApiCall();
      toast.success('通知设置已保存');
    } catch (error) {
      toast.error('保存失败');
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="通知方式" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  />
                }
                label="邮件通知"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.smsNotifications}
                    onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                  />
                }
                label="短信通知"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.pushNotifications}
                    onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                  />
                }
                label="推送通知"
              />
              
              <FormControl fullWidth>
                <InputLabel>通知频率</InputLabel>
                <Select
                  value={settings.notificationFrequency}
                  onChange={(e) => handleSettingChange('notificationFrequency', e.target.value)}
                >
                  <MenuItem value="immediate">立即</MenuItem>
                  <MenuItem value="hourly">每小时汇总</MenuItem>
                  <MenuItem value="daily">每日汇总</MenuItem>
                  <MenuItem value="weekly">每周汇总</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="通知类型" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.alertTypes.security}
                    onChange={(e) => handleAlertTypeChange('security', e.target.checked)}
                  />
                }
                label="安全告警"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.alertTypes.system}
                    onChange={(e) => handleAlertTypeChange('system', e.target.checked)}
                  />
                }
                label="系统告警"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.alertTypes.performance}
                    onChange={(e) => handleAlertTypeChange('performance', e.target.checked)}
                  />
                }
                label="性能告警"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.alertTypes.maintenance}
                    onChange={(e) => handleAlertTypeChange('maintenance', e.target.checked)}
                  />
                }
                label="维护通知"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Card>
          <CardHeader title="免打扰时间" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.quietHours.enabled}
                    onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                  />
                }
                label="启用免打扰时间"
              />
              
              {settings.quietHours.enabled && (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    label="开始时间"
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Typography>至</Typography>
                  <TextField
                    label="结束时间"
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            重置
          </Button>
          <Button variant="contained" onClick={handleSave}>
            保存设置
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}

function BackupSettings() {
  const [settings, setSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    backupRetention: 30,
    backupLocation: 'local',
    compressionEnabled: true
  });
  
  const [backups] = useState([
    { id: 1, name: 'backup_2024_01_15.zip', size: '2.3 GB', date: '2024-01-15 02:00:00', type: 'auto' },
    { id: 2, name: 'backup_2024_01_14.zip', size: '2.1 GB', date: '2024-01-14 02:00:00', type: 'auto' },
    { id: 3, name: 'manual_backup_config.zip', size: '156 MB', date: '2024-01-13 14:30:00', type: 'manual' }
  ]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleBackup = async () => {
    try {
      await mockApiCall(3000);
      toast.success('备份创建成功');
    } catch (error) {
      toast.error('备份失败');
    }
  };

  const handleRestore = async (backupId) => {
    try {
      await mockApiCall(5000);
      toast.success('系统恢复成功');
    } catch (error) {
      toast.error('恢复失败');
    }
  };

  const handleSave = async () => {
    try {
      await mockApiCall();
      toast.success('备份设置已保存');
    } catch (error) {
      toast.error('保存失败');
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="备份设置" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoBackup}
                    onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                  />
                }
                label="自动备份"
              />
              
              <FormControl fullWidth>
                <InputLabel>备份频率</InputLabel>
                <Select
                  value={settings.backupFrequency}
                  onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                  disabled={!settings.autoBackup}
                >
                  <MenuItem value="hourly">每小时</MenuItem>
                  <MenuItem value="daily">每日</MenuItem>
                  <MenuItem value="weekly">每周</MenuItem>
                  <MenuItem value="monthly">每月</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="备份保留天数"
                type="number"
                value={settings.backupRetention}
                onChange={(e) => handleSettingChange('backupRetention', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 365 }}
              />
              
              <FormControl fullWidth>
                <InputLabel>备份位置</InputLabel>
                <Select
                  value={settings.backupLocation}
                  onChange={(e) => handleSettingChange('backupLocation', e.target.value)}
                >
                  <MenuItem value="local">本地存储</MenuItem>
                  <MenuItem value="cloud">云存储</MenuItem>
                  <MenuItem value="network">网络存储</MenuItem>
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.compressionEnabled}
                    onChange={(e) => handleSettingChange('compressionEnabled', e.target.checked)}
                  />
                }
                label="启用压缩"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="备份操作" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<BackupIcon />}
                onClick={handleBackup}
                fullWidth
              >
                立即备份
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                fullWidth
              >
                导入备份
              </Button>
              
              <Divider />
              
              <Alert severity="info">
                下次自动备份时间：2024-01-16 02:00:00
              </Alert>
              
              <Alert severity="warning">
                备份文件较大，建议在系统空闲时进行备份操作
              </Alert>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Card>
          <CardHeader title="备份历史" />
          <CardContent>
            <List>
              {backups.map((backup) => (
                <ListItem key={backup.id} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">{backup.name}</Typography>
                        <Chip
                          label={backup.type === 'auto' ? '自动' : '手动'}
                          size="small"
                          color={backup.type === 'auto' ? 'primary' : 'secondary'}
                        />
                      </Box>
                    }
                    secondary={`大小: ${backup.size} | 创建时间: ${backup.date}`}
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton onClick={() => toast.success('备份下载开始')}>
                        <DownloadIcon />
                      </IconButton>
                      <IconButton onClick={() => handleRestore(backup.id)}>
                        <RestoreIcon />
                      </IconButton>
                      <IconButton onClick={() => toast.success('备份已删除')}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            重置
          </Button>
          <Button variant="contained" onClick={handleSave}>
            保存设置
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}

function Settings() {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const tabs = [
    { label: '通用设置', icon: <SettingsIcon />, component: <GeneralSettings /> },
    { label: '安全设置', icon: <SecurityIcon />, component: <SecuritySettings /> },
    { label: '通知设置', icon: <NotificationsIcon />, component: <NotificationSettings /> },
    { label: '备份恢复', icon: <BackupIcon />, component: <BackupSettings /> }
  ];

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          系统设置
        </Typography>
        <Typography variant="body1" color="text.secondary">
          管理系统配置、安全策略、通知设置和数据备份
        </Typography>
      </Box>

      {/* 设置面板 */}
      <Paper sx={{ width: '100%', bgcolor: 'background.paper' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="settings tabs"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
                sx={{ minHeight: 64 }}
              />
            ))}
          </Tabs>
        </Box>

        {tabs.map((tab, index) => (
          <TabPanel key={index} value={tabValue} index={index}>
            {tab.component}
          </TabPanel>
        ))}
      </Paper>
    </Box>
  );
}

export default Settings;