import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button, Box, Typography, Paper } from '@mui/material';

function TestAuth() {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    token, 
    status, 
    error,
    login,
    logout 
  } = useAuth();
  const navigate = useNavigate();

  const handleTestLogin = async () => {
    console.log('[TestAuth] 开始测试登录');
    const result = await login({
      username: 'admin',
      password: 'admin123'
    });
    console.log('[TestAuth] 登录结果:', result);
    
    // 等待状态更新
    setTimeout(() => {
      console.log('[TestAuth] 登录后状态检查:', {
        isAuthenticated,
        hasUser: !!user,
        hasToken: !!token,
        status
      });
      
      if (isAuthenticated) {
        console.log('[TestAuth] 认证成功，跳转到dashboard');
        navigate('/dashboard');
      } else {
        console.log('[TestAuth] 认证失败，无法跳转');
      }
    }, 1000);
  };

  const handleTestLogout = async () => {
    console.log('[TestAuth] 开始测试登出');
    await logout();
  };

  const handleGoDashboard = () => {
    console.log('[TestAuth] 手动跳转到dashboard');
    navigate('/dashboard');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        认证状态测试页面
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          当前认证状态
        </Typography>
        <Typography>isAuthenticated: {String(isAuthenticated)}</Typography>
        <Typography>isLoading: {String(isLoading)}</Typography>
        <Typography>status: {status}</Typography>
        <Typography>hasUser: {String(!!user)}</Typography>
        <Typography>hasToken: {String(!!token)}</Typography>
        <Typography>error: {error || 'null'}</Typography>
        {user && (
          <Typography>username: {user.username}</Typography>
        )}
      </Paper>
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          onClick={handleTestLogin}
          disabled={isLoading}
        >
          测试登录
        </Button>
        
        <Button 
          variant="outlined" 
          onClick={handleTestLogout}
          disabled={isLoading || !isAuthenticated}
        >
          测试登出
        </Button>
        
        <Button 
          variant="contained" 
          color="secondary"
          onClick={handleGoDashboard}
        >
          手动跳转Dashboard
        </Button>
        
        <Button 
          variant="outlined"
          onClick={() => navigate('/login')}
        >
          返回登录页
        </Button>
      </Box>
    </Box>
  );
}

export default TestAuth;