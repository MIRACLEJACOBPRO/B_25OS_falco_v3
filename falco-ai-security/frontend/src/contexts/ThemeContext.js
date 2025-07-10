/**
 * 主题上下文
 * 管理应用主题和样式配置
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { zhCN } from '@mui/material/locale';

// 主题模式
export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
};

// 主题颜色
export const THEME_COLORS = {
  BLUE: 'blue',
  GREEN: 'green',
  PURPLE: 'purple',
  ORANGE: 'orange',
  RED: 'red',
};

// 字体大小
export const FONT_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
};

// 紧凑度
export const DENSITY = {
  COMFORTABLE: 'comfortable',
  STANDARD: 'standard',
  COMPACT: 'compact',
};

// 颜色调色板
const COLOR_PALETTES = {
  [THEME_COLORS.BLUE]: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
  },
  [THEME_COLORS.GREEN]: {
    primary: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    secondary: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
  },
  [THEME_COLORS.PURPLE]: {
    primary: {
      main: '#7b1fa2',
      light: '#9c27b0',
      dark: '#4a148c',
    },
    secondary: {
      main: '#f57c00',
      light: '#ff9800',
      dark: '#ef6c00',
    },
  },
  [THEME_COLORS.ORANGE]: {
    primary: {
      main: '#f57c00',
      light: '#ff9800',
      dark: '#ef6c00',
    },
    secondary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
  },
  [THEME_COLORS.RED]: {
    primary: {
      main: '#d32f2f',
      light: '#f44336',
      dark: '#c62828',
    },
    secondary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
  },
};

// 字体大小配置
const FONT_SIZE_CONFIG = {
  [FONT_SIZES.SMALL]: {
    fontSize: 12,
    htmlFontSize: 14,
  },
  [FONT_SIZES.MEDIUM]: {
    fontSize: 14,
    htmlFontSize: 16,
  },
  [FONT_SIZES.LARGE]: {
    fontSize: 16,
    htmlFontSize: 18,
  },
};

// 密度配置
const DENSITY_CONFIG = {
  [DENSITY.COMFORTABLE]: {
    spacing: 8,
    dense: false,
  },
  [DENSITY.STANDARD]: {
    spacing: 6,
    dense: false,
  },
  [DENSITY.COMPACT]: {
    spacing: 4,
    dense: true,
  },
};

// Action类型
const THEME_ACTIONS = {
  SET_MODE: 'SET_MODE',
  SET_COLOR: 'SET_COLOR',
  SET_FONT_SIZE: 'SET_FONT_SIZE',
  SET_DENSITY: 'SET_DENSITY',
  SET_SIDEBAR_COLLAPSED: 'SET_SIDEBAR_COLLAPSED',
  SET_ANIMATIONS_ENABLED: 'SET_ANIMATIONS_ENABLED',
  RESET_THEME: 'RESET_THEME',
};

// 初始状态
const initialState = {
  mode: THEME_MODES.DARK,
  color: THEME_COLORS.BLUE,
  fontSize: FONT_SIZES.MEDIUM,
  density: DENSITY.STANDARD,
  sidebarCollapsed: false,
  animationsEnabled: true,
};

// 从localStorage加载设置
const loadThemeSettings = () => {
  try {
    const saved = localStorage.getItem('theme_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...initialState, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load theme settings:', error);
  }
  return initialState;
};

// 保存设置到localStorage
const saveThemeSettings = (settings) => {
  try {
    localStorage.setItem('theme_settings', JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save theme settings:', error);
  }
};

// Reducer
function themeReducer(state, action) {
  let newState;
  
  switch (action.type) {
    case THEME_ACTIONS.SET_MODE:
      newState = { ...state, mode: action.payload };
      break;
      
    case THEME_ACTIONS.SET_COLOR:
      newState = { ...state, color: action.payload };
      break;
      
    case THEME_ACTIONS.SET_FONT_SIZE:
      newState = { ...state, fontSize: action.payload };
      break;
      
    case THEME_ACTIONS.SET_DENSITY:
      newState = { ...state, density: action.payload };
      break;
      
    case THEME_ACTIONS.SET_SIDEBAR_COLLAPSED:
      newState = { ...state, sidebarCollapsed: action.payload };
      break;
      
    case THEME_ACTIONS.SET_ANIMATIONS_ENABLED:
      newState = { ...state, animationsEnabled: action.payload };
      break;
      
    case THEME_ACTIONS.RESET_THEME:
      newState = initialState;
      break;
      
    default:
      return state;
  }
  
  // 保存到localStorage
  saveThemeSettings(newState);
  return newState;
}

// 检测系统主题
const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

// 创建MUI主题
const createMuiTheme = (settings) => {
  const { mode, color, fontSize, density, animationsEnabled } = settings;
  
  // 确定实际主题模式
  const actualMode = mode === THEME_MODES.AUTO ? getSystemTheme() : mode;
  
  // 获取颜色配置
  const colorPalette = COLOR_PALETTES[color] || COLOR_PALETTES[THEME_COLORS.BLUE];
  
  // 获取字体配置
  const fontConfig = FONT_SIZE_CONFIG[fontSize] || FONT_SIZE_CONFIG[FONT_SIZES.MEDIUM];
  
  // 获取密度配置
  const densityConfig = DENSITY_CONFIG[density] || DENSITY_CONFIG[DENSITY.STANDARD];
  
  return createTheme({
    palette: {
      mode: actualMode,
      ...colorPalette,
      background: {
        default: actualMode === 'dark' ? '#0a0e27' : '#f5f5f5',
        paper: actualMode === 'dark' ? '#1e1e2e' : '#ffffff',
      },
      text: {
        primary: actualMode === 'dark' ? '#ffffff' : '#333333',
        secondary: actualMode === 'dark' ? '#b0b0b0' : '#666666',
      },
      divider: actualMode === 'dark' ? '#333333' : '#e0e0e0',
      // 安全相关颜色
      security: {
        critical: '#f44336',
        high: '#ff9800',
        medium: '#ffeb3b',
        low: '#4caf50',
        info: '#2196f3',
      },
      // 状态颜色
      status: {
        online: '#4caf50',
        offline: '#f44336',
        warning: '#ff9800',
        unknown: '#9e9e9e',
      },
    },
    typography: {
      fontSize: fontConfig.fontSize,
      htmlFontSize: fontConfig.htmlFontSize,
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.6,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.43,
      },
      caption: {
        fontSize: '0.75rem',
        lineHeight: 1.66,
      },
    },
    spacing: densityConfig.spacing,
    shape: {
      borderRadius: 8,
    },
    transitions: {
      duration: {
        shortest: animationsEnabled ? 150 : 0,
        shorter: animationsEnabled ? 200 : 0,
        short: animationsEnabled ? 250 : 0,
        standard: animationsEnabled ? 300 : 0,
        complex: animationsEnabled ? 375 : 0,
        enteringScreen: animationsEnabled ? 225 : 0,
        leavingScreen: animationsEnabled ? 195 : 0,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            scrollbarColor: actualMode === 'dark' ? '#6b6b6b #2b2b2b' : '#c1c1c1 #f1f1f1',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: actualMode === 'dark' ? '#2b2b2b' : '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: actualMode === 'dark' ? '#6b6b6b' : '#c1c1c1',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: actualMode === 'dark' ? '#8b8b8b' : '#a1a1a1',
              },
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: actualMode === 'dark' ? '#1e1e2e' : '#ffffff',
            color: actualMode === 'dark' ? '#ffffff' : '#333333',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: actualMode === 'dark' ? '#1a1a2e' : '#ffffff',
            borderRight: `1px solid ${actualMode === 'dark' ? '#333333' : '#e0e0e0'}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1)',
            borderRadius: 12,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: densityConfig.dense ? '8px 16px' : '16px',
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            paddingTop: densityConfig.dense ? 4 : 8,
            paddingBottom: densityConfig.dense ? 4 : 8,
          },
        },
      },
    },
  }, zhCN);
};

// 创建上下文
const ThemeContext = createContext(null);

// ThemeProvider组件
export function ThemeProvider({ children }) {
  const [settings, dispatch] = useReducer(themeReducer, loadThemeSettings());
  const [muiTheme, setMuiTheme] = React.useState(() => createMuiTheme(settings));
  
  // 监听系统主题变化
  useEffect(() => {
    if (settings.mode === THEME_MODES.AUTO && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = () => {
        setMuiTheme(createMuiTheme(settings));
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings]);
  
  // 更新MUI主题
  useEffect(() => {
    setMuiTheme(createMuiTheme(settings));
  }, [settings]);
  
  // 设置主题模式
  const setMode = (mode) => {
    dispatch({ type: THEME_ACTIONS.SET_MODE, payload: mode });
  };
  
  // 设置主题颜色
  const setColor = (color) => {
    dispatch({ type: THEME_ACTIONS.SET_COLOR, payload: color });
  };
  
  // 设置字体大小
  const setFontSize = (fontSize) => {
    dispatch({ type: THEME_ACTIONS.SET_FONT_SIZE, payload: fontSize });
  };
  
  // 设置密度
  const setDensity = (density) => {
    dispatch({ type: THEME_ACTIONS.SET_DENSITY, payload: density });
  };
  
  // 切换侧边栏
  const toggleSidebar = () => {
    dispatch({ type: THEME_ACTIONS.SET_SIDEBAR_COLLAPSED, payload: !settings.sidebarCollapsed });
  };
  
  // 设置侧边栏状态
  const setSidebarCollapsed = (collapsed) => {
    dispatch({ type: THEME_ACTIONS.SET_SIDEBAR_COLLAPSED, payload: collapsed });
  };
  
  // 设置动画
  const setAnimationsEnabled = (enabled) => {
    dispatch({ type: THEME_ACTIONS.SET_ANIMATIONS_ENABLED, payload: enabled });
  };
  
  // 重置主题
  const resetTheme = () => {
    dispatch({ type: THEME_ACTIONS.RESET_THEME });
  };
  
  // 切换主题模式
  const toggleMode = () => {
    const modes = [THEME_MODES.LIGHT, THEME_MODES.DARK, THEME_MODES.AUTO];
    const currentIndex = modes.indexOf(settings.mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  };
  
  // 获取当前实际主题模式
  const getActualMode = () => {
    return settings.mode === THEME_MODES.AUTO ? getSystemTheme() : settings.mode;
  };
  
  // 检查是否为暗色主题
  const isDark = () => {
    return getActualMode() === 'dark';
  };
  
  // 上下文值
  const contextValue = {
    // 设置
    ...settings,
    
    // MUI主题
    muiTheme,
    
    // 方法
    setMode,
    setColor,
    setFontSize,
    setDensity,
    toggleSidebar,
    setSidebarCollapsed,
    setAnimationsEnabled,
    resetTheme,
    toggleMode,
    
    // 工具方法
    getActualMode,
    isDark,
  };
  
  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={muiTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

// useTheme Hook
export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

// 主题设置Hook
export function useThemeSettings() {
  const {
    mode,
    color,
    fontSize,
    density,
    animationsEnabled,
    setMode,
    setColor,
    setFontSize,
    setDensity,
    setAnimationsEnabled,
    resetTheme,
    toggleMode,
  } = useTheme();
  
  return {
    settings: {
      mode,
      color,
      fontSize,
      density,
      animationsEnabled,
    },
    actions: {
      setMode,
      setColor,
      setFontSize,
      setDensity,
      setAnimationsEnabled,
      resetTheme,
      toggleMode,
    },
  };
}

// 侧边栏Hook
export function useSidebar() {
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useTheme();
  
  return {
    collapsed: sidebarCollapsed,
    toggle: toggleSidebar,
    setCollapsed: setSidebarCollapsed,
  };
}

// 导出常量已在文件开头完成