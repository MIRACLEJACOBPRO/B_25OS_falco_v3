/**
 * 确认对话框组件
 * 用于用户操作确认
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Box,
  Typography,
  Alert,
  AlertTitle,
  Chip,
  Stack,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Block as BlockIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import LoadingSpinner from './LoadingSpinner';

// 样式化组件
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: theme.spacing(2),
    minWidth: 400,
    maxWidth: 600,
  },
}));

const IconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 64,
  height: 64,
  borderRadius: '50%',
  margin: '0 auto 16px',
}));

// 对话框类型
export const DIALOG_TYPES = {
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info',
  SUCCESS: 'success',
  DELETE: 'delete',
  SECURITY: 'security',
};

// 对话框配置
const DIALOG_CONFIG = {
  [DIALOG_TYPES.WARNING]: {
    icon: WarningIcon,
    color: 'warning',
    bgColor: 'warning.light',
    confirmText: '确认',
    confirmColor: 'warning',
  },
  [DIALOG_TYPES.ERROR]: {
    icon: ErrorIcon,
    color: 'error',
    bgColor: 'error.light',
    confirmText: '确认',
    confirmColor: 'error',
  },
  [DIALOG_TYPES.INFO]: {
    icon: InfoIcon,
    color: 'info',
    bgColor: 'info.light',
    confirmText: '确认',
    confirmColor: 'primary',
  },
  [DIALOG_TYPES.SUCCESS]: {
    icon: SuccessIcon,
    color: 'success',
    bgColor: 'success.light',
    confirmText: '确认',
    confirmColor: 'success',
  },
  [DIALOG_TYPES.DELETE]: {
    icon: DeleteIcon,
    color: 'error',
    bgColor: 'error.light',
    confirmText: '删除',
    confirmColor: 'error',
  },
  [DIALOG_TYPES.SECURITY]: {
    icon: SecurityIcon,
    color: 'warning',
    bgColor: 'warning.light',
    confirmText: '执行',
    confirmColor: 'warning',
  },
};

// 基础确认对话框
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  content,
  type = DIALOG_TYPES.INFO,
  confirmText,
  cancelText = '取消',
  loading = false,
  disabled = false,
  showIcon = true,
  maxWidth = 'sm',
  fullWidth = true,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  children,
  // 额外配置
  severity,
  details,
  tags,
  actions,
  ...props
}) {
  const config = DIALOG_CONFIG[type] || DIALOG_CONFIG[DIALOG_TYPES.INFO];
  const IconComponent = config.icon;
  
  const handleClose = (event, reason) => {
    if (disableBackdropClick && reason === 'backdropClick') return;
    if (disableEscapeKeyDown && reason === 'escapeKeyDown') return;
    if (loading) return;
    onClose?.(event, reason);
  };
  
  const handleConfirm = async () => {
    if (loading || disabled) return;
    await onConfirm?.();
  };
  
  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      {...props}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          {!disableBackdropClick && !loading && (
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{ color: 'grey.500' }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {showIcon && (
          <IconContainer
            sx={{
              bgcolor: config.bgColor,
              color: config.color + '.main',
            }}
          >
            <IconComponent sx={{ fontSize: 32 }} />
          </IconContainer>
        )}
        
        {content && (
          <DialogContentText sx={{ textAlign: showIcon ? 'center' : 'left', mb: 2 }}>
            {content}
          </DialogContentText>
        )}
        
        {severity && (
          <Alert severity={severity} sx={{ mb: 2 }}>
            {severity === 'warning' && <AlertTitle>警告</AlertTitle>}
            {severity === 'error' && <AlertTitle>错误</AlertTitle>}
            {severity === 'info' && <AlertTitle>提示</AlertTitle>}
            {severity === 'success' && <AlertTitle>成功</AlertTitle>}
            {details}
          </Alert>
        )}
        
        {tags && tags.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              相关标签:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}
        
        {children}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        {actions ? (
          actions
        ) : (
          <>
            <Button
              onClick={handleClose}
              disabled={loading}
              color="inherit"
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={disabled}
              color={config.confirmColor}
              variant="contained"
              startIcon={loading ? <LoadingSpinner size={16} /> : null}
            >
              {confirmText || config.confirmText}
            </Button>
          </>
        )}
      </DialogActions>
    </StyledDialog>
  );
}

// 删除确认对话框
export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '确认删除',
  itemName,
  itemType = '项目',
  warning,
  consequences,
  ...props
}) {
  const content = itemName
    ? `确定要删除${itemType} "${itemName}" 吗？`
    : `确定要删除选中的${itemType}吗？`;
  
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      content={content}
      type={DIALOG_TYPES.DELETE}
      severity={warning ? 'warning' : 'error'}
      details={consequences || '此操作不可撤销，请谨慎操作。'}
      {...props}
    />
  );
}

// 批量删除确认对话框
export function BatchDeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  count,
  itemType = '项目',
  selectedItems = [],
  ...props
}) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="批量删除确认"
      content={`确定要删除选中的 ${count} 个${itemType}吗？`}
      type={DIALOG_TYPES.DELETE}
      severity="error"
      details="此操作将永久删除所有选中的项目，且不可撤销。"
      tags={selectedItems.slice(0, 5).map(item => item.name || item.title || item.id)}
      {...props}
    >
      {selectedItems.length > 5 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          还有 {selectedItems.length - 5} 个项目未显示...
        </Typography>
      )}
    </ConfirmDialog>
  );
}

// 安全操作确认对话框
export function SecurityConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '安全操作确认',
  action,
  target,
  risks = [],
  requirements = [],
  ...props
}) {
  const content = action && target
    ? `确定要对 "${target}" 执行 "${action}" 操作吗？`
    : '确定要执行此安全操作吗？';
  
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      content={content}
      type={DIALOG_TYPES.SECURITY}
      severity="warning"
      details="此操作可能影响系统安全，请确认您有足够的权限和理由。"
      {...props}
    >
      {risks.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom color="error">
            潜在风险:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {risks.map((risk, index) => (
              <li key={index}>
                <Typography variant="body2" color="error">
                  {risk}
                </Typography>
              </li>
            ))}
          </ul>
        </Box>
      )}
      
      {requirements.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom color="warning.main">
            操作要求:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {requirements.map((requirement, index) => (
              <li key={index}>
                <Typography variant="body2" color="warning.main">
                  {requirement}
                </Typography>
              </li>
            ))}
          </ul>
        </Box>
      )}
    </ConfirmDialog>
  );
}

// 保存确认对话框
export function SaveConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '保存确认',
  hasUnsavedChanges = false,
  changesCount,
  ...props
}) {
  const content = hasUnsavedChanges
    ? `检测到未保存的更改${changesCount ? ` (${changesCount} 处)` : ''}，确定要保存吗？`
    : '确定要保存当前更改吗？';
  
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      content={content}
      type={DIALOG_TYPES.SUCCESS}
      confirmText="保存"
      {...props}
    />
  );
}

// 发送确认对话框
export function SendConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '发送确认',
  recipient,
  subject,
  preview,
  ...props
}) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      content="确定要发送此消息吗？"
      type={DIALOG_TYPES.INFO}
      confirmText="发送"
      {...props}
    >
      {(recipient || subject || preview) && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          {recipient && (
            <Typography variant="body2" gutterBottom>
              <strong>收件人:</strong> {recipient}
            </Typography>
          )}
          {subject && (
            <Typography variant="body2" gutterBottom>
              <strong>主题:</strong> {subject}
            </Typography>
          )}
          {preview && (
            <>
              <Typography variant="body2" gutterBottom>
                <strong>内容预览:</strong>
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  maxHeight: 100,
                  overflow: 'auto',
                  p: 1,
                  bgcolor: 'background.paper',
                  borderRadius: 0.5,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                {preview}
              </Typography>
            </>
          )}
        </Box>
      )}
    </ConfirmDialog>
  );
}

// 阻止操作确认对话框
export function BlockConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = '阻止确认',
  target,
  reason,
  duration,
  ...props
}) {
  const content = target
    ? `确定要阻止 "${target}" 吗？`
    : '确定要执行阻止操作吗？';
  
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      content={content}
      type={DIALOG_TYPES.WARNING}
      confirmText="阻止"
      severity="warning"
      details="阻止操作将限制目标的访问权限。"
      {...props}
    >
      {(reason || duration) && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          {reason && (
            <Typography variant="body2" gutterBottom>
              <strong>阻止原因:</strong> {reason}
            </Typography>
          )}
          {duration && (
            <Typography variant="body2">
              <strong>阻止时长:</strong> {duration}
            </Typography>
          )}
        </Box>
      )}
    </ConfirmDialog>
  );
}

// 自定义Hook：使用确认对话框
export function useConfirmDialog() {
  const [dialogState, setDialogState] = React.useState({
    open: false,
    type: DIALOG_TYPES.INFO,
    title: '',
    content: '',
    onConfirm: null,
    loading: false,
    ...{},
  });
  
  const openDialog = React.useCallback((config) => {
    setDialogState({
      open: true,
      loading: false,
      ...config,
    });
  }, []);
  
  const closeDialog = React.useCallback(() => {
    setDialogState(prev => ({
      ...prev,
      open: false,
      loading: false,
    }));
  }, []);
  
  const confirmDialog = React.useCallback(async () => {
    if (dialogState.onConfirm) {
      setDialogState(prev => ({ ...prev, loading: true }));
      try {
        await dialogState.onConfirm();
        closeDialog();
      } catch (error) {
        console.error('Confirm dialog error:', error);
        setDialogState(prev => ({ ...prev, loading: false }));
      }
    } else {
      closeDialog();
    }
  }, [dialogState.onConfirm, closeDialog]);
  
  const ConfirmDialogComponent = React.useCallback(() => (
    <ConfirmDialog
      {...dialogState}
      onClose={closeDialog}
      onConfirm={confirmDialog}
    />
  ), [dialogState, closeDialog, confirmDialog]);
  
  return {
    openDialog,
    closeDialog,
    ConfirmDialog: ConfirmDialogComponent,
    isOpen: dialogState.open,
    isLoading: dialogState.loading,
  };
}

export default ConfirmDialog;