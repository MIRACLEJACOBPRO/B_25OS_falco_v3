import React from 'react';
import { Alert, AlertTitle, Box, CircularProgress, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

// 样式化组件
const ConnectingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5),
  backgroundColor: theme.palette.info.light,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(3),
}));

/**
 * 连接状态组件
 * 优化了连接状态显示逻辑：
 * 1. 显示"正在连接..."而不是立即显示"连接中断"
 * 2. 延迟显示警告（连接超过5秒后才显示警告）
 */
const ConnectionStatus = ({ isConnected, showConnectionStatus = true }) => {
  const [showWarning, setShowWarning] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(true);
  
  React.useEffect(() => {
    let warningTimer;
    let initTimer;
    
    if (!isConnected) {
      // 初始化阶段，显示"正在连接..."
      setIsInitializing(true);
      setShowWarning(false);
      
      // 5秒后如果还未连接，显示警告
      warningTimer = setTimeout(() => {
        setShowWarning(true);
        setIsInitializing(false);
      }, 5000);
      
      // 15秒后停止显示"正在连接..."
      initTimer = setTimeout(() => {
        setIsInitializing(false);
      }, 15000);
    } else {
      // 连接成功，重置状态
      setShowWarning(false);
      setIsInitializing(false);
    }
    
    return () => {
      if (warningTimer) clearTimeout(warningTimer);
      if (initTimer) clearTimeout(initTimer);
    };
  }, [isConnected]);
  
  // 如果不需要显示连接状态，直接返回null
  if (!showConnectionStatus) {
    return null;
  }
  
  // 连接正常，不显示任何提示
  if (isConnected) {
    return null;
  }
  
  // 正在连接中（初始化阶段）
  if (isInitializing && !showWarning) {
    return (
      <ConnectingContainer>
        <CircularProgress size={20} />
        <Typography variant="body2" color="info.main">
          正在连接服务器...
        </Typography>
      </ConnectingContainer>
    );
  }
  
  // 连接失败警告（延迟显示）
  if (showWarning) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        <AlertTitle>连接中断</AlertTitle>
        与服务器的实时连接已中断，无法接收实时事件。请检查网络连接或刷新页面重试。
      </Alert>
    );
  }
  
  return null;
};

export default ConnectionStatus;