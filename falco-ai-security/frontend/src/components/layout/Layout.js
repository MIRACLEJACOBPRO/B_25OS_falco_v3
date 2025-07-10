/**
 * 主布局组件
 * 提供应用的整体布局结构，包括导航栏、侧边栏、主内容区域等
 */

import React from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  Chip,
  useTheme,
  useMediaQuery,
  alpha,
  Breadcrumbs,
  Link,
  Container,
  Paper,
  Fab,
  Zoom,
  Backdrop,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandLess,
  ExpandMore,
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Search as SearchIcon,
  Help as HelpIcon,
  KeyboardArrowUp as ScrollTopIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Timeline as TimelineIcon,
  AccountTree as GraphIcon,
  Assessment as ReportIcon,
  AdminPanelSettings as AdminIcon,
  SmartToy as AIIcon,
  PlayArrow as ExecuteIcon,
  Storage as DatabaseIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import { useWebSocket } from '../../services/websocket';

// 布局常量
const DRAWER_WIDTH = 280;
const MINI_DRAWER_WIDTH = 64;
const HEADER_HEIGHT = 64;
const FOOTER_HEIGHT = 48;

// 样式化组件
const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'drawerWidth',
})(({ theme, open, drawerWidth }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  width: open ? DRAWER_WIDTH : MINI_DRAWER_WIDTH,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    width: open ? DRAWER_WIDTH : MINI_DRAWER_WIDTH,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

const MainContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'drawerWidth',
})(({ theme, open, drawerWidth }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginTop: HEADER_HEIGHT,
  marginBottom: FOOTER_HEIGHT,
  marginLeft: open ? drawerWidth : MINI_DRAWER_WIDTH,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  minHeight: `calc(100vh - ${HEADER_HEIGHT + FOOTER_HEIGHT}px)`,
  [theme.breakpoints.down('md')]: {
    marginLeft: 0,
    padding: theme.spacing(2),
  },
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  height: HEADER_HEIGHT,
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}));

const Footer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: FOOTER_HEIGHT,
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  zIndex: theme.zIndex.appBar - 1,
}));

const ScrollToTopFab = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(10),
  right: theme.spacing(2),
  zIndex: theme.zIndex.speedDial,
}));

// 导航菜单配置
const NAVIGATION_ITEMS = [
  {
    id: 'dashboard',
    label: '仪表板',
    icon: DashboardIcon,
    path: '/dashboard',
    badge: null,
  },
  {
    id: 'monitoring',
    label: '实时监控',
    icon: TimelineIcon,
    path: '/monitoring',
    badge: 'live',
  },
  {
    id: 'graph',
    label: '图谱可视化',
    icon: GraphIcon,
    path: '/graph',
    badge: null,
  },
  {
    id: 'analysis',
    label: '事件分析',
    icon: AnalyticsIcon,
    path: '/analysis',
    badge: null,
    children: [
      {
        id: 'events',
        label: '安全事件',
        path: '/analysis/events',
      },
      {
        id: 'threats',
        label: '威胁情报',
        path: '/analysis/threats',
      },
      {
        id: 'ai-analysis',
        label: 'AI 分析',
        icon: AIIcon,
        path: '/analysis/ai',
      },
    ],
  },
  {
    id: 'automation',
    label: '自动执行',
    icon: ExecuteIcon,
    path: '/automation',
    badge: null,
    children: [
      {
        id: 'rules',
        label: '执行规则',
        path: '/automation/rules',
      },
      {
        id: 'history',
        label: '执行历史',
        path: '/automation/history',
      },
    ],
  },
  {
    id: 'reports',
    label: '报告中心',
    icon: ReportIcon,
    path: '/reports',
    badge: null,
  },
  {
    id: 'settings',
    label: '系统设置',
    icon: SettingsIcon,
    path: '/settings',
    badge: null,
    children: [
      {
        id: 'general',
        label: '常规设置',
        path: '/settings/general',
      },
      {
        id: 'security',
        label: '安全配置',
        path: '/settings/security',
      },
      {
        id: 'users',
        label: '用户管理',
        icon: AdminIcon,
        path: '/settings/users',
      },
    ],
  },
];

// 导航项组件
function NavigationItem({ item, open, level = 0, onItemClick }) {
  const [expanded, setExpanded] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const isActive = location.pathname === item.path ||
    (item.children && item.children.some(child => location.pathname === child.path));
  
  const hasChildren = item.children && item.children.length > 0;
  
  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded);
    } else {
      navigate(item.path);
      onItemClick?.();
    }
  };
  
  const IconComponent = item.icon;
  
  return (
    <>
      <ListItemButton
        onClick={handleClick}
        selected={isActive}
        sx={{
          minHeight: 48,
          justifyContent: open ? 'initial' : 'center',
          px: 2.5,
          pl: level > 0 ? 4 + level * 2 : 2.5,
          '&.Mui-selected': {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
            '&:hover': {
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.16),
            },
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            mr: open ? 3 : 'auto',
            justifyContent: 'center',
            color: isActive ? 'primary.main' : 'inherit',
          }}
        >
          {IconComponent ? <IconComponent /> : <DashboardIcon />}
        </ListItemIcon>
        
        <ListItemText
          primary={item.label}
          sx={{
            opacity: open ? 1 : 0,
            color: isActive ? 'primary.main' : 'inherit',
          }}
        />
        
        {open && item.badge && (
          <Chip
            label={item.badge}
            size="small"
            color={item.badge === 'live' ? 'error' : 'default'}
            variant={item.badge === 'live' ? 'filled' : 'outlined'}
          />
        )}
        
        {open && hasChildren && (
          expanded ? <ExpandLess /> : <ExpandMore />
        )}
      </ListItemButton>
      
      {hasChildren && (
        <Collapse in={expanded && open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children.map((child) => (
              <NavigationItem
                key={child.id}
                item={child}
                open={open}
                level={level + 1}
                onItemClick={onItemClick}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

// 用户菜单组件
function UserMenu() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleProfile = () => {
    navigate('/profile');
    handleMenuClose();
  };
  
  const handleLogout = () => {
    logout();
    handleMenuClose();
  };
  
  return (
    <>
      <Tooltip title="用户菜单">
        <IconButton
          size="large"
          edge="end"
          aria-label="user menu"
          aria-controls="user-menu"
          aria-haspopup="true"
          onClick={handleMenuOpen}
          color="inherit"
        >
          <Avatar
            sx={{ width: 32, height: 32 }}
            src={user?.avatar}
            alt={user?.name}
          >
            {user?.name?.charAt(0)?.toUpperCase()}
          </Avatar>
        </IconButton>
      </Tooltip>
      
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        PaperProps={
          {
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }
        }
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleProfile}>
          <Avatar /> 个人资料
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          退出登录
        </MenuItem>
      </Menu>
    </>
  );
}

// 通知菜单组件
function NotificationMenu() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [notifications, setNotifications] = React.useState([]);
  const { isConnected } = useWebSocket();
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <>
      <Tooltip title="通知">
        <IconButton
          size="large"
          aria-label="notifications"
          color="inherit"
          onClick={handleMenuOpen}
        >
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      
      <Menu
        id="notification-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 400,
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">通知</Typography>
        </Box>
        
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              暂无通知
            </Typography>
          </Box>
        ) : (
          notifications.slice(0, 5).map((notification) => (
            <MenuItem key={notification.id} onClick={handleMenuClose}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" noWrap>
                  {notification.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {notification.time}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
        
        {notifications.length > 5 && (
          <MenuItem onClick={handleMenuClose}>
            <Typography variant="body2" color="primary">
              查看全部通知
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

// 面包屑导航组件
function BreadcrumbNavigation() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);
  
  const getBreadcrumbName = (pathname) => {
    const item = NAVIGATION_ITEMS.find(item => 
      item.path === `/${pathname}` || 
      (item.children && item.children.find(child => child.path === `/${pathname}`))
    );
    
    if (item) {
      if (item.path === `/${pathname}`) {
        return item.label;
      }
      const child = item.children?.find(child => child.path === `/${pathname}`);
      return child?.label || pathname;
    }
    
    return pathname;
  };
  
  return (
    <Breadcrumbs
      aria-label="breadcrumb"
      separator={<NavigateNextIcon fontSize="small" />}
      sx={{ mb: 2 }}
    >
      <Link
        component={RouterLink}
        to="/dashboard"
        color="inherit"
        sx={{ display: 'flex', alignItems: 'center' }}
      >
        <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
        首页
      </Link>
      
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const name = getBreadcrumbName(pathnames.slice(0, index + 1).join('/'));
        
        return last ? (
          <Typography color="text.primary" key={to}>
            {name}
          </Typography>
        ) : (
          <Link
            component={RouterLink}
            to={to}
            key={to}
            color="inherit"
          >
            {name}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}

// 回到顶部组件
function ScrollToTop() {
  const [visible, setVisible] = React.useState(false);
  
  React.useEffect(() => {
    const toggleVisible = () => {
      const scrolled = document.documentElement.scrollTop;
      setVisible(scrolled > 300);
    };
    
    window.addEventListener('scroll', toggleVisible);
    return () => window.removeEventListener('scroll', toggleVisible);
  }, []);
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };
  
  return (
    <Zoom in={visible}>
      <ScrollToTopFab
        color="primary"
        size="small"
        onClick={scrollToTop}
        aria-label="scroll back to top"
      >
        <ScrollTopIcon />
      </ScrollToTopFab>
    </Zoom>
  );
}

// 主布局组件
export default function Layout({ children, loading = false }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = React.useState(!isMobile);
  const [fullscreen, setFullscreen] = React.useState(false);
  
  const { themeMode, toggleTheme } = useCustomTheme();
  const { isConnected } = useWebSocket();
  
  React.useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };
  
  const drawerWidth = drawerOpen ? DRAWER_WIDTH : MINI_DRAWER_WIDTH;
  
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* 顶部导航栏 */}
      <StyledAppBar
        position="fixed"
        open={!isMobile && drawerOpen}
        drawerWidth={!isMobile ? drawerWidth : 0}
      >
        <StyledToolbar>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="toggle drawer"
              onClick={handleDrawerToggle}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            
            <Typography variant="h6" noWrap component="div">
              Falco AI Security
            </Typography>
            
            {/* 连接状态指示器 */}
            <Chip
              label={isConnected ? '已连接' : '连接中断'}
              color={isConnected ? 'success' : 'error'}
              size="small"
              sx={{ ml: 2 }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* 搜索按钮 */}
            <Tooltip title="搜索">
              <IconButton color="inherit">
                <SearchIcon />
              </IconButton>
            </Tooltip>
            
            {/* 全屏切换 */}
            <Tooltip title={fullscreen ? '退出全屏' : '全屏'}>
              <IconButton color="inherit" onClick={handleFullscreenToggle}>
                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
            
            {/* 主题切换 */}
            <Tooltip title="切换主题">
              <IconButton color="inherit" onClick={toggleTheme}>
                {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            
            {/* 通知菜单 */}
            <NotificationMenu />
            
            {/* 用户菜单 */}
            <UserMenu />
          </Box>
        </StyledToolbar>
      </StyledAppBar>
      
      {/* 侧边栏 */}
      <StyledDrawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
      >
        <Toolbar />
        
        <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
          <List>
            {NAVIGATION_ITEMS.map((item) => (
              <NavigationItem
                key={item.id}
                item={item}
                open={drawerOpen}
                onItemClick={isMobile ? handleDrawerToggle : undefined}
              />
            ))}
          </List>
        </Box>
        
        {/* 侧边栏底部 */}
        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
          {drawerOpen && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 2 }}>
              版本 v1.0.0
            </Typography>
          )}
        </Box>
      </StyledDrawer>
      
      {/* 主内容区域 */}
      <MainContent
        component="main"
        open={!isMobile && drawerOpen}
        drawerWidth={!isMobile ? drawerWidth : 0}
      >
        <Container maxWidth={false} sx={{ px: 0 }}>
          <BreadcrumbNavigation />
          
          <Paper
            elevation={0}
            sx={{
              p: 3,
              minHeight: 'calc(100vh - 200px)',
              backgroundColor: 'background.default',
            }}
          >
            {children}
          </Paper>
        </Container>
      </MainContent>
      
      {/* 底部状态栏 */}
      <Footer>
        <Typography variant="caption" color="text.secondary">
          © 2024 Falco AI Security. All rights reserved.
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            系统状态: 正常运行
          </Typography>
          
          <Tooltip title="帮助">
            <IconButton size="small" color="inherit">
              <HelpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Footer>
      
      {/* 回到顶部按钮 */}
      <ScrollToTop />
      
      {/* 全局加载遮罩 */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
}

// 导出布局相关组件和常量
export {
  DRAWER_WIDTH,
  MINI_DRAWER_WIDTH,
  HEADER_HEIGHT,
  FOOTER_HEIGHT,
  NAVIGATION_ITEMS,
  BreadcrumbNavigation,
  ScrollToTop,
};