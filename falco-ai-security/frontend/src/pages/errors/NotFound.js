/**
 * 404 错误页面
 * 当用户访问不存在的页面时显示
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  useTheme,
} from '@mui/material';
import {
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
  SearchOff as SearchOffIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
// import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// 样式化组件
const ErrorContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: theme.spacing(4),
}));

const ErrorIcon = styled(SearchOffIcon)(({ theme }) => ({
  fontSize: '8rem',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(2),
}));

const ErrorCode = styled(Typography)(({ theme }) => ({
  fontSize: '6rem',
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  lineHeight: 1,
  marginBottom: theme.spacing(1),
}));

const NotFound = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <ErrorContainer maxWidth="md">
      <div style={{ textAlign: 'center' }}>
        <ErrorIcon />
        
        <ErrorCode variant="h1">
          404
        </ErrorCode>
        
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          color="text.primary"
          sx={{ mb: 2 }}
        >
          页面未找到
        </Typography>
        
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 600 }}
        >
          抱歉，您访问的页面不存在或已被移动。请检查URL是否正确，或返回首页继续浏览。
        </Typography>
        
        <Box
          display="flex"
          gap={2}
          flexDirection={{ xs: 'column', sm: 'row' }}
          justifyContent="center"
          alignItems="center"
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<HomeIcon />}
            onClick={handleGoHome}
            sx={{ minWidth: 160 }}
          >
            返回首页
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            startIcon={<ArrowBackIcon />}
            onClick={handleGoBack}
            sx={{ minWidth: 160 }}
          >
            返回上页
          </Button>
        </Box>
        
        {/* 装饰性元素 */}
        <Box
          sx={{
            mt: 6,
            opacity: 0.1,
            fontSize: '12rem',
            fontWeight: 'bold',
            color: 'text.secondary',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          404
        </Box>
      </div>
    </ErrorContainer>
  );
};

export default NotFound;