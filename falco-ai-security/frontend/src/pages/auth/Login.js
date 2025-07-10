/**
 * 登录页面
 * 提供用户认证功能
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Checkbox,
  FormControlLabel,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Security,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
// import { motion } from 'framer-motion';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

// 样式化组件
const LoginContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
  padding: theme.spacing(2),
}));

const LoginCard = styled(Card)(({ theme }) => ({
  maxWidth: 400,
  width: '100%',
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[10],
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(3),
  gap: theme.spacing(1),
}));

const Login = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated, error: authError } = useAuth();
  const [formData, setFormData] = useState({
    username: '', // 改为username以匹配后端API
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // 处理表单输入
  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    });
    if (error || authError) setError('');
  };

  // 处理登录提交
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const result = await login({
        username: formData.username,
        password: formData.password,
      });
      
      if (result.success) {
        console.log('[Login] 登录成功，准备跳转到dashboard');
        console.log('[Login] 当前URL:', window.location.href);
        
        // 使用更长的延迟确保认证状态完全更新
        setTimeout(() => {
          console.log('[Login] 检查认证状态后开始跳转');
          console.log('[Login] 当前认证状态:', { isAuthenticated, isLoading });
          
          // 直接使用window.location进行强制跳转，避免React Router的状态问题
          console.log('[Login] 使用window.location强制跳转到dashboard');
          window.location.href = '/dashboard';
        }, 1000); // 给认证状态更新更多时间
      } else {
        setError(result.error || '登录失败');
      }
    } catch (err) {
      setError('登录失败，请稍后重试');
    }
  };

  // 处理忘记密码
  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <LoginContainer>
      <div>
        <LoginCard>
          <CardContent>
            {/* Logo和标题 */}
            <LogoContainer>
              <Security color="primary" sx={{ fontSize: 40 }} />
              <Typography variant="h4" component="h1" fontWeight="bold">
                NeuronOS AI
              </Typography>
            </LogoContainer>
            
            <Typography
              variant="h5"
              component="h2"
              textAlign="center"
              gutterBottom
              color="text.primary"
            >
              欢迎回来
            </Typography>
            
            <Typography
              variant="body2"
              textAlign="center"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              登录到您的安全监控平台
            </Typography>

            {/* 错误提示 */}
            {(error || authError) && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error || authError}
              </Alert>
            )}

            {/* 登录表单 */}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="用户名"
                type="text"
                value={formData.username}
                onChange={handleChange('username')}
                margin="normal"
                required
                autoComplete="username"
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                fullWidth
                label="密码"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                margin="normal"
                required
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mt: 1, mb: 2 }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.rememberMe}
                      onChange={handleChange('rememberMe')}
                      color="primary"
                    />
                  }
                  label="记住我"
                />
                
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={handleForgotPassword}
                  sx={{ textDecoration: 'none' }}
                >
                  忘记密码？
                </Link>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ mt: 2, mb: 2, py: 1.5 }}
              >
                {isLoading ? '登录中...' : '登录'}
              </Button>
            </Box>

            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                或
              </Typography>
            </Divider>

            {/* 注册链接 */}
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                还没有账户？{' '}
                <Link
                  component={RouterLink}
                  to="/register"
                  variant="body2"
                  sx={{ textDecoration: 'none', fontWeight: 'medium' }}
                >
                  立即注册
                </Link>
              </Typography>
            </Box>

            {/* 演示账户信息 */}
            <Box
              sx={{
                mt: 3,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                演示账户：
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                用户名：admin
              </Typography>
              <Typography variant="body2">
                密码：admin123
              </Typography>
            </Box>
          </CardContent>
        </LoginCard>
      </div>
    </LoginContainer>
  );
};

export default Login;