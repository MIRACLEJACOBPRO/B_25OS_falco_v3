/**
 * 加载动画组件
 * 提供各种样式的加载指示器
 */

import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Typography,
  Fade,
  Backdrop,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

// 脉冲动画
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

// 波浪动画
const wave = keyframes`
  0%, 60%, 100% {
    transform: initial;
  }
  30% {
    transform: translateY(-15px);
  }
`;

// 旋转动画
const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// 样式化组件
const StyledLoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  minHeight: '200px',
}));

const PulseLoader = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  animation: `${pulse} 1.5s ease-in-out infinite`,
}));

const WaveLoader = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(0.5),
  '& > div': {
    width: 8,
    height: 40,
    backgroundColor: theme.palette.primary.main,
    borderRadius: 4,
    animation: `${wave} 1.2s infinite ease-in-out`,
    '&:nth-of-type(1)': { animationDelay: '-1.1s' },
    '&:nth-of-type(2)': { animationDelay: '-1.0s' },
    '&:nth-of-type(3)': { animationDelay: '-0.9s' },
    '&:nth-of-type(4)': { animationDelay: '-0.8s' },
    '&:nth-of-type(5)': { animationDelay: '-0.7s' },
  },
}));

const SpinLoader = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  border: `4px solid ${theme.palette.action.disabled}`,
  borderTop: `4px solid ${theme.palette.primary.main}`,
  borderRadius: '50%',
  animation: `${rotate} 1s linear infinite`,
}));

const DotsLoader = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(0.5),
  '& > div': {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: theme.palette.primary.main,
    animation: `${pulse} 1.4s ease-in-out infinite both`,
    '&:nth-of-type(1)': { animationDelay: '-0.32s' },
    '&:nth-of-type(2)': { animationDelay: '-0.16s' },
    '&:nth-of-type(3)': { animationDelay: '0s' },
  },
}));

// 基础加载器组件
export function LoadingSpinner({
  size = 'medium',
  variant = 'circular',
  message = '',
  fullScreen = false,
  overlay = false,
  color = 'primary',
  ...props
}) {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 56,
  };
  
  const actualSize = typeof size === 'number' ? size : sizeMap[size];
  
  const renderLoader = () => {
    switch (variant) {
      case 'linear':
        return (
          <Box sx={{ width: '100%', maxWidth: 300 }}>
            <LinearProgress color={color} />
            {message && (
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                {message}
              </Typography>
            )}
          </Box>
        );
        
      case 'pulse':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <PulseLoader sx={{ width: actualSize, height: actualSize }} />
            {message && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                {message}
              </Typography>
            )}
          </Box>
        );
        
      case 'wave':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <WaveLoader>
              <div />
              <div />
              <div />
              <div />
              <div />
            </WaveLoader>
            {message && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                {message}
              </Typography>
            )}
          </Box>
        );
        
      case 'spin':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <SpinLoader sx={{ width: actualSize, height: actualSize }} />
            {message && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                {message}
              </Typography>
            )}
          </Box>
        );
        
      case 'dots':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <DotsLoader>
              <div />
              <div />
              <div />
            </DotsLoader>
            {message && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                {message}
              </Typography>
            )}
          </Box>
        );
        
      case 'circular':
      default:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress size={actualSize} color={color} />
            {message && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                {message}
              </Typography>
            )}
          </Box>
        );
    }
  };
  
  const content = (
    <StyledLoadingContainer {...props}>
      {renderLoader()}
    </StyledLoadingContainer>
  );
  
  if (fullScreen) {
    return (
      <Backdrop
        open={true}
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}
      >
        <Fade in={true}>
          {content}
        </Fade>
      </Backdrop>
    );
  }
  
  if (overlay) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Fade in={true}>
          {content}
        </Fade>
      </Box>
    );
  }
  
  return content;
}

// 页面加载器
export function PageLoader({ message = '正在加载页面...' }) {
  return (
    <LoadingSpinner
      variant="circular"
      size="large"
      message={message}
      fullScreen
    />
  );
}

// 内容加载器
export function ContentLoader({ message = '正在加载内容...' }) {
  return (
    <LoadingSpinner
      variant="pulse"
      size="medium"
      message={message}
      sx={{ minHeight: 300 }}
    />
  );
}

// 按钮加载器
export function ButtonLoader({ size = 20 }) {
  return (
    <CircularProgress
      size={size}
      color="inherit"
      sx={{ mr: 1 }}
    />
  );
}

// 表格加载器
export function TableLoader({ rows = 5, columns = 4 }) {
  return (
    <Box sx={{ p: 2 }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box key={rowIndex} sx={{ display: 'flex', gap: 2, mb: 1 }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="rectangular"
              height={40}
              sx={{ flex: 1 }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}

// 卡片加载器
export function CardLoader({ height = 200 }) {
  return (
    <Box sx={{ p: 2 }}>
      <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 1 }} />
    </Box>
  );
}

// 列表加载器
export function ListLoader({ items = 5 }) {
  return (
    <Box>
      {Array.from({ length: items }).map((_, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="80%" height={24} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="60%" height={20} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// 图表加载器
export function ChartLoader({ height = 300 }) {
  return (
    <Box sx={{ p: 2 }}>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 1 }} />
    </Box>
  );
}

// 头像加载器
export function AvatarLoader({ size = 40 }) {
  return (
    <Skeleton variant="circular" width={size} height={size} />
  );
}

// 文本加载器
export function TextLoader({ lines = 3, width = '100%' }) {
  return (
    <Box>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? '70%' : width}
          height={24}
          sx={{ mb: 0.5 }}
        />
      ))}
    </Box>
  );
}

// 进度加载器
export function ProgressLoader({ value, message = '', showPercentage = true }) {
  return (
    <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        </Box>
        {showPercentage && (
          <Typography variant="body2" color="text.secondary">
            {`${Math.round(value)}%`}
          </Typography>
        )}
      </Box>
      <LinearProgress variant="determinate" value={value} />
    </Box>
  );
}

// 延迟加载器
export function DelayedLoader({ delay = 300, children, fallback }) {
  const [show, setShow] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  if (!show) {
    return fallback || null;
  }
  
  return children;
}

// 条件加载器
export function ConditionalLoader({ loading, children, loader, ...props }) {
  if (loading) {
    return loader || <LoadingSpinner {...props} />;
  }
  
  return children;
}

// 导出默认组件
export default LoadingSpinner;