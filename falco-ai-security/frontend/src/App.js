import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
// import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiService } from './services/api';
import { useAuth } from './contexts/AuthContext';

// 导入布局组件
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import { LoadingSpinner, PageLoader as LoadingPageLoader } from './components/common/LoadingSpinner';

// 懒加载页面组件
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const GraphVisualization = lazy(() => import('./pages/GraphVisualization'));
const EventAnalysis = lazy(() => import('./pages/EventAnalysis'));
const SecurityEvents = lazy(() => import('./pages/SecurityEvents'));
const AIAnalysis = lazy(() => import('./pages/AIAnalysis'));
const ThreatIntelligence = lazy(() => import('./pages/ThreatIntelligence'));
const Automation = lazy(() => import('./pages/Automation'));
const Reports = lazy(() => import('./pages/Reports'));
const Configuration = lazy(() => import('./pages/Configuration'));
const Settings = lazy(() => import('./pages/Settings'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Login = lazy(() => import('./pages/auth/Login'));
const TestAuth = lazy(() => import('./pages/TestAuth'));
const NotFound = lazy(() => import('./pages/errors/NotFound'));

// API服务

// 页面过渡动画配置 - 已禁用
// const pageVariants = {
//   initial: {
//     opacity: 0,
//     x: -20,
//   },
//   in: {
//     opacity: 1,
//     x: 0,
//   },
//   out: {
//     opacity: 0,
//     x: 20,
//   },
// };

// const pageTransition = {
//   type: 'tween',
//   ease: 'anticipate',
//   duration: 0.3,
// };

// 加载组件
const PageLoader = ({ message = '正在加载...' }) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="60vh"
    gap={2}
  >
    <CircularProgress size={40} thickness={4} />
    <Typography variant="body2" color="text.secondary">
      {message}
    </Typography>
  </Box>
);

// 页面包装器组件
const PageWrapper = ({ children }) => (
  <div>
    {children}
  </div>
);

// 受保护的路由组件
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <PageLoader message="验证用户身份..." />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// 主应用组件
function App() {
  // 系统健康检查
  const { data: healthStatus, isError: healthError } = useQuery(
    'system-health',
    () => apiService.getSystemHealth(),
    {
      refetchInterval: 30000, // 30秒检查一次
      retry: 3,
      onError: (error) => {
        console.error('系统健康检查失败:', error);
        toast.error('系统连接异常，请检查网络连接');
      },
    }
  );

  // 全局错误处理
  React.useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('未处理的Promise拒绝:', event.reason);
      toast.error('系统发生未知错误，请刷新页面重试');
    };

    const handleError = (event) => {
      console.error('全局错误:', event.error);
      toast.error('页面发生错误，请刷新页面重试');
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  // 系统状态监控
  React.useEffect(() => {
    if (healthStatus) {
      // 根据健康状态显示不同的提示
      if (healthStatus.status === 'healthy') {
        // 系统正常，不显示提示
      } else if (healthStatus.status === 'degraded') {
        toast.error('系统性能下降，部分功能可能受影响', {
          duration: 5000,
        });
      } else if (healthStatus.status === 'unhealthy') {
        toast.error('系统异常，请联系管理员', {
          duration: 10000,
        });
      }
    }
  }, [healthStatus]);

  return (
    <ErrorBoundary>
      <div className="App">
        <div>
          <Routes>
            {/* 登录页面 */}
            <Route
              path="/login"
              element={
                <Suspense fallback={<LoadingPageLoader />}>
                  <PageWrapper>
                    <Login />
                  </PageWrapper>
                </Suspense>
              }
            />
            
            {/* 测试页面 */}
            <Route path="/test-auth" element={<TestAuth />} />
            
            {/* 主应用路由 */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        {/* 仪表板 */}
                        <Route
                          path="/"
                          element={
                            <PageWrapper>
                              <Dashboard />
                            </PageWrapper>
                          }
                        />
                        <Route
                          path="/dashboard"
                          element={
                            <PageWrapper>
                              <Dashboard />
                            </PageWrapper>
                          }
                        />
                        
                        {/* 实时监控 */}
                        <Route
                          path="/monitoring"
                          element={
                            <PageWrapper>
                              <Monitoring />
                            </PageWrapper>
                          }
                        />
                        
                        {/* 图谱可视化 */}
                        <Route
                          path="/graph"
                          element={
                            <PageWrapper>
                              <GraphVisualization />
                            </PageWrapper>
                          }
                        />
                        
                        {/* 事件分析 */}
                        <Route path="/events/*" element={
                          <Routes>
                            <Route index element={
                              <PageWrapper>
                                <EventAnalysis />
                              </PageWrapper>
                            } />
                            <Route path="security" element={
                              <PageWrapper>
                                <SecurityEvents />
                              </PageWrapper>
                            } />
                            <Route path="threats" element={
                              <PageWrapper>
                                <ThreatIntelligence />
                              </PageWrapper>
                            } />
                            <Route path="ai-analysis" element={
                              <PageWrapper>
                                <AIAnalysis />
                              </PageWrapper>
                            } />
                          </Routes>
                        } />
                        
                        {/* 分析模块 */}
                        <Route path="/analysis/*" element={
                          <Routes>
                            <Route path="events" element={
                              <PageWrapper>
                                <EventAnalysis />
                              </PageWrapper>
                            } />
                            <Route path="ai" element={
                              <PageWrapper>
                                <AIAnalysis />
                              </PageWrapper>
                            } />
                            <Route path="threats" element={
                              <PageWrapper>
                                <ThreatIntelligence />
                              </PageWrapper>
                            } />
                          </Routes>
                        } />
                        
                        {/* 威胁情报 */}
                        <Route
                          path="/threats"
                          element={
                            <PageWrapper>
                              <ThreatIntelligence />
                            </PageWrapper>
                          }
                        />
                        
                        {/* 自动化管理 */}
                        <Route
                          path="/automation"
                          element={
                            <PageWrapper>
                              <Automation />
                            </PageWrapper>
                          }
                        />
                        
                        {/* 报告管理 */}
                        <Route
                          path="/reports"
                          element={
                            <PageWrapper>
                              <Reports />
                            </PageWrapper>
                          }
                        />
                        
                        {/* 配置管理 */}
                        <Route
                          path="/config"
                          element={
                            <PageWrapper>
                              <Configuration />
                            </PageWrapper>
                          }
                        />
                        
                        {/* 系统设置 */}
                        <Route
                          path="/settings"
                          element={
                            <PageWrapper>
                              <Settings />
                            </PageWrapper>
                          }
                        />
                        
                        {/* 用户管理 */}
                        <Route
                          path="/users"
                          element={
                            <PageWrapper>
                              <UserManagement />
                            </PageWrapper>
                          }
                        />
                        
                        {/* 404页面 */}
                        <Route
                          path="*"
                          element={
                            <PageWrapper>
                              <NotFound />
                            </PageWrapper>
                          }
                        />
                      </Routes>
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
        
        {/* 系统状态指示器 */}
        {healthError && (
          <Box
            position="fixed"
            bottom={16}
            right={16}
            bgcolor="error.main"
            color="white"
            px={2}
            py={1}
            borderRadius={1}
            zIndex={9999}
            display="flex"
            alignItems="center"
            gap={1}
          >
            <Box
              width={8}
              height={8}
              borderRadius="50%"
              bgcolor="white"
              className="animate-pulse"
            />
            <Typography variant="caption">
              系统连接异常
            </Typography>
          </Box>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;