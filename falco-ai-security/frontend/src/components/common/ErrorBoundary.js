/**
 * 错误边界组件
 * 捕获和处理React组件错误
 */

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  Stack,
  Divider,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  BugReport as BugReportIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import toast from 'react-hot-toast';

// 样式化组件
const ErrorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '400px',
  padding: theme.spacing(4),
  textAlign: 'center',
}));

const ErrorCard = styled(Card)(({ theme }) => ({
  maxWidth: 600,
  width: '100%',
  boxShadow: theme.shadows[8],
}));

const StyledErrorIcon = styled(ErrorIcon)(({ theme }) => ({
  fontSize: 64,
  color: theme.palette.error.main,
  marginBottom: theme.spacing(2),
}));

// 错误类型
const ERROR_TYPES = {
  CHUNK_LOAD_ERROR: 'ChunkLoadError',
  NETWORK_ERROR: 'NetworkError',
  PERMISSION_ERROR: 'PermissionError',
  AUTHENTICATION_ERROR: 'AuthenticationError',
  VALIDATION_ERROR: 'ValidationError',
  UNKNOWN_ERROR: 'UnknownError',
};

// 错误消息映射
const ERROR_MESSAGES = {
  [ERROR_TYPES.CHUNK_LOAD_ERROR]: {
    title: '资源加载失败',
    message: '页面资源加载失败，可能是网络问题或版本更新导致的。',
    suggestion: '请刷新页面重试，如果问题持续存在，请清除浏览器缓存。',
  },
  [ERROR_TYPES.NETWORK_ERROR]: {
    title: '网络连接错误',
    message: '无法连接到服务器，请检查网络连接。',
    suggestion: '请检查网络连接后重试，或联系系统管理员。',
  },
  [ERROR_TYPES.PERMISSION_ERROR]: {
    title: '权限不足',
    message: '您没有访问此资源的权限。',
    suggestion: '请联系管理员获取相应权限，或返回首页。',
  },
  [ERROR_TYPES.AUTHENTICATION_ERROR]: {
    title: '身份验证失败',
    message: '您的登录状态已过期或无效。',
    suggestion: '请重新登录后再试。',
  },
  [ERROR_TYPES.VALIDATION_ERROR]: {
    title: '数据验证错误',
    message: '提交的数据格式不正确或缺少必要信息。',
    suggestion: '请检查输入的数据并重试。',
  },
  [ERROR_TYPES.UNKNOWN_ERROR]: {
    title: '未知错误',
    message: '发生了意外错误，我们正在努力解决。',
    suggestion: '请刷新页面重试，如果问题持续存在，请联系技术支持。',
  },
};

// 错误分类函数
function classifyError(error) {
  if (!error) return ERROR_TYPES.UNKNOWN_ERROR;
  
  const errorMessage = error.message || error.toString();
  
  if (errorMessage.includes('ChunkLoadError') || errorMessage.includes('Loading chunk')) {
    return ERROR_TYPES.CHUNK_LOAD_ERROR;
  }
  
  if (errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
    return ERROR_TYPES.NETWORK_ERROR;
  }
  
  if (errorMessage.includes('Permission') || errorMessage.includes('Forbidden')) {
    return ERROR_TYPES.PERMISSION_ERROR;
  }
  
  if (errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized')) {
    return ERROR_TYPES.AUTHENTICATION_ERROR;
  }
  
  if (errorMessage.includes('Validation') || errorMessage.includes('Invalid')) {
    return ERROR_TYPES.VALIDATION_ERROR;
  }
  
  return ERROR_TYPES.UNKNOWN_ERROR;
}

// 错误报告函数
function reportError(error, errorInfo, context = {}) {
  const errorReport = {
    timestamp: new Date().toISOString(),
    error: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    },
    errorInfo,
    context: {
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('user_id'),
      ...context,
    },
  };
  
  // 发送错误报告到服务器
  try {
    fetch('/api/errors/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorReport),
    }).catch(console.error);
  } catch (e) {
    console.error('Failed to report error:', e);
  }
  
  // 记录到控制台
  console.error('Error Boundary caught an error:', error, errorInfo);
}

// 错误边界类组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showDetails: false,
    };
  }
  
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }
  
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    
    // 报告错误
    reportError(error, errorInfo, this.props.context);
    
    // 显示错误提示
    if (this.props.showToast !== false) {
      toast.error('页面发生错误，请刷新重试');
    }
  }
  
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showDetails: false,
    });
    
    // 调用重试回调
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };
  
  handleReload = () => {
    window.location.reload();
  };
  
  handleGoHome = () => {
    window.location.href = '/';
  };
  
  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };
  
  render() {
    if (this.state.hasError) {
      const errorType = classifyError(this.state.error);
      const errorConfig = ERROR_MESSAGES[errorType];
      
      // 如果提供了自定义错误组件
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.handleRetry);
      }
      
      return (
        <ErrorContainer>
          <ErrorCard>
            <CardContent>
              <StyledErrorIcon />
              
              <Typography variant="h4" component="h1" gutterBottom>
                {errorConfig.title}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" paragraph>
                {errorConfig.message}
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                <AlertTitle>建议解决方案</AlertTitle>
                {errorConfig.suggestion}
              </Alert>
              
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRetry}
                >
                  重试
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReload}
                >
                  刷新页面
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                >
                  返回首页
                </Button>
              </Stack>
              
              {/* 错误详情 */}
              <Box sx={{ textAlign: 'left' }}>
                <Button
                  size="small"
                  startIcon={<BugReportIcon />}
                  endIcon={this.state.showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={this.toggleDetails}
                  sx={{ mb: 1 }}
                >
                  错误详情
                </Button>
                
                <Collapse in={this.state.showDetails}>
                  <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        错误ID: {this.state.errorId}
                      </Typography>
                      
                      <Divider sx={{ my: 1 }} />
                      
                      {this.state.error && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            错误信息:
                          </Typography>
                          <Typography
                            variant="body2"
                            component="pre"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              bgcolor: 'background.paper',
                              p: 1,
                              borderRadius: 1,
                              border: 1,
                              borderColor: 'divider',
                            }}
                          >
                            {this.state.error.toString()}
                          </Typography>
                        </Box>
                      )}
                      
                      {this.state.error?.stack && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            堆栈跟踪:
                          </Typography>
                          <Typography
                            variant="body2"
                            component="pre"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              bgcolor: 'background.paper',
                              p: 1,
                              borderRadius: 1,
                              border: 1,
                              borderColor: 'divider',
                              maxHeight: 200,
                              overflow: 'auto',
                            }}
                          >
                            {this.state.error.stack}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Collapse>
              </Box>
            </CardContent>
          </ErrorCard>
        </ErrorContainer>
      );
    }
    
    return this.props.children;
  }
}

// 函数式错误边界Hook
export function useErrorHandler() {
  const [error, setError] = React.useState(null);
  
  const resetError = React.useCallback(() => {
    setError(null);
  }, []);
  
  const captureError = React.useCallback((error, context = {}) => {
    console.error('Error captured:', error);
    reportError(error, { componentStack: '' }, context);
    setError(error);
    toast.error('操作失败，请重试');
  }, []);
  
  return {
    error,
    resetError,
    captureError,
  };
}

// 异步错误边界Hook
export function useAsyncError() {
  const [, setError] = React.useState();
  
  return React.useCallback((error) => {
    setError(() => {
      throw error;
    });
  }, []);
}

// 简化的错误显示组件
export function ErrorDisplay({ error, onRetry, title, message }) {
  const errorType = classifyError(error);
  const errorConfig = ERROR_MESSAGES[errorType];
  
  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            重试
          </Button>
        )
      }
    >
      <AlertTitle>{title || errorConfig.title}</AlertTitle>
      {message || errorConfig.message}
    </Alert>
  );
}

// 网络错误组件
export function NetworkError({ onRetry }) {
  return (
    <ErrorDisplay
      error={{ message: 'NetworkError' }}
      onRetry={onRetry}
      title="网络连接失败"
      message="请检查网络连接后重试"
    />
  );
}

// 权限错误组件
export function PermissionError({ onGoHome }) {
  return (
    <Box sx={{ textAlign: 'center', p: 4 }}>
      <ErrorDisplay
        error={{ message: 'PermissionError' }}
        title="访问被拒绝"
        message="您没有访问此页面的权限"
      />
      {onGoHome && (
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={onGoHome}
          sx={{ mt: 2 }}
        >
          返回首页
        </Button>
      )}
    </Box>
  );
}

// 404错误组件
export function NotFoundError({ onGoHome }) {
  return (
    <ErrorContainer>
      <Typography variant="h1" component="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', mb: 2 }}>
        404
      </Typography>
      <Typography variant="h4" component="h2" gutterBottom>
        页面未找到
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        抱歉，您访问的页面不存在或已被移除。
      </Typography>
      <Button
        variant="contained"
        startIcon={<HomeIcon />}
        onClick={onGoHome || (() => window.location.href = '/')}
      >
        返回首页
      </Button>
    </ErrorContainer>
  );
}

// 导出默认组件
export default ErrorBoundary;