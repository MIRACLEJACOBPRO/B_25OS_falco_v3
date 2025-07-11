/**
 * 图谱可视化页面
 * 显示安全事件关系图谱、网络拓扑和实体关联分析
 */

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  IconButton,
  Button,
  Chip,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
  AlertTitle,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  ButtonGroup,
  Menu,
  MenuList,
  MenuItem as MenuItemComponent,
  ListItemButton,
  Drawer,
  useTheme,
  alpha,
} from '@mui/material';
import {
  AccountTree as GraphIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Computer as ComputerIcon,
  NetworkCheck as NetworkIcon,
  Person as PersonIcon,
  Storage as StorageIcon,
  CloudQueue as CloudIcon,
  Router as RouterIcon,
  DeviceHub as HubIcon,
  Link as LinkIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  LocationOn as LocationIcon,
  Schedule as TimeIcon,
  TrendingUp as TrendIcon,
  Analytics as AnalyticsIcon,
  Hub as NodeIcon,
  Share as ShareIcon,
  GroupWork as ClusterIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { apiService } from '../services/api';
import { useWebSocket, WS_EVENTS, EVENT_TYPES } from '../services/websocket';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import ConnectionStatus from '../components/common/ConnectionStatus';

// 样式化组件
const GraphContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '600px',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
}));

const GraphToolbar = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  left: theme.spacing(1),
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  padding: theme.spacing(0.5),
}));

const GraphLegend = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  zIndex: 1000,
  padding: theme.spacing(1),
  maxWidth: 200,
}));

const NodeInfoPanel = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(1),
  left: theme.spacing(1),
  right: theme.spacing(1),
  zIndex: 1000,
  padding: theme.spacing(2),
  maxHeight: 200,
  overflow: 'auto',
}));

const FilterPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

// 节点类型配置
const NODE_TYPES = {
  host: {
    label: '主机',
    icon: ComputerIcon,
    color: '#2196F3',
    size: 30,
  },
  user: {
    label: '用户',
    icon: PersonIcon,
    color: '#4CAF50',
    size: 25,
  },
  process: {
    label: '进程',
    icon: SettingsIcon,
    color: '#FF9800',
    size: 20,
  },
  file: {
    label: '文件',
    icon: StorageIcon,
    color: '#9C27B0',
    size: 20,
  },
  network: {
    label: '网络',
    icon: NetworkIcon,
    color: '#F44336',
    size: 25,
  },
  service: {
    label: '服务',
    icon: CloudIcon,
    color: '#607D8B',
    size: 25,
  },
  event: {
    label: '事件',
    icon: SecurityIcon,
    color: '#E91E63',
    size: 15,
  },
};

// 关系类型配置
const EDGE_TYPES = {
  access: {
    label: '访问',
    color: '#2196F3',
    style: 'solid',
  },
  execute: {
    label: '执行',
    color: '#4CAF50',
    style: 'solid',
  },
  connect: {
    label: '连接',
    color: '#FF9800',
    style: 'dashed',
  },
  modify: {
    label: '修改',
    color: '#F44336',
    style: 'solid',
  },
  create: {
    label: '创建',
    color: '#9C27B0',
    style: 'dotted',
  },
  delete: {
    label: '删除',
    color: '#795548',
    style: 'solid',
  },
};

// 图谱布局算法
const LAYOUT_ALGORITHMS = {
  force: { label: '力导向布局', description: '基于物理模拟的自然布局' },
  circular: { label: '环形布局', description: '节点按圆形排列' },
  hierarchical: { label: '层次布局', description: '按层级关系排列' },
  grid: { label: '网格布局', description: '规则网格排列' },
  radial: { label: '径向布局', description: '以中心节点为核心的径向排列' },
};

// 处理Neo4j图谱数据并优化布局
function processNeo4jGraphData(rawData) {
  const { nodes = [], edges = [] } = rawData;
  
  // 如果没有数据，返回空图谱
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }
  
  // 处理节点数据
  const processedNodes = nodes.map((node, index) => {
    // 根据节点类型确定颜色和大小
    const nodeType = node.labels?.[0] || 'Unknown';
    const nodeConfig = NODE_TYPES[nodeType.toLowerCase()] || NODE_TYPES.event;
    
    return {
      id: node.id || `node_${index}`,
      label: node.properties?.name || node.properties?.label || `${nodeType}_${node.id}`,
      type: nodeType.toLowerCase(),
      color: nodeConfig.color,
      size: calculateNodeSize(node),
      x: 0, // 初始位置，后续会被布局算法重新计算
      y: 0,
      properties: node.properties || {},
      risk_score: node.properties?.risk_score || 0
    };
  });
  
  // 处理边数据
  const processedEdges = edges.map((edge, index) => {
    const edgeType = edge.type || 'RELATED';
    const edgeConfig = EDGE_TYPES[edgeType.toLowerCase()] || EDGE_TYPES.access;
    
    return {
      id: edge.id || `edge_${index}`,
      source: edge.source || edge.startNode,
      target: edge.target || edge.endNode,
      type: edgeType.toLowerCase(),
      label: edgeConfig.label,
      color: edgeConfig.color,
      width: calculateEdgeWidth(edge),
      properties: edge.properties || {}
    };
  });
  
  // 应用力导向布局算法
  const layoutData = applyForceDirectedLayout(processedNodes, processedEdges);
  
  return layoutData;
}

// 计算节点大小
function calculateNodeSize(node) {
  const baseSize = 20;
  const riskScore = node.properties?.risk_score || 0;
  const sizeMultiplier = 1 + (riskScore * 0.5); // 风险分数越高，节点越大
  return Math.max(baseSize * sizeMultiplier, 15);
}

// 计算边宽度
function calculateEdgeWidth(edge) {
  const baseWidth = 2;
  const weight = edge.properties?.weight || 1;
  return Math.max(baseWidth * weight, 1);
}

// 力导向布局算法
function applyForceDirectedLayout(nodes, edges) {
  const width = 800;
  const height = 600;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // 创建节点位置映射
  const nodePositions = new Map();
  
  // 根据节点类型进行分组布局
  const nodeGroups = {};
  nodes.forEach(node => {
    const type = node.type || 'unknown';
    if (!nodeGroups[type]) {
      nodeGroups[type] = [];
    }
    nodeGroups[type].push(node);
  });
  
  // 为每个组分配扇形区域
  const groupTypes = Object.keys(nodeGroups);
  const angleStep = (2 * Math.PI) / groupTypes.length;
  
  groupTypes.forEach((type, groupIndex) => {
    const groupNodes = nodeGroups[type];
    const groupAngle = groupIndex * angleStep;
    const groupRadius = 150 + (groupNodes.length * 5); // 根据节点数量调整半径
    
    groupNodes.forEach((node, nodeIndex) => {
      const nodeAngle = groupAngle + (nodeIndex * 0.3); // 在组内分散节点
      const nodeRadius = groupRadius + (nodeIndex * 20);
      
      const x = centerX + Math.cos(nodeAngle) * nodeRadius;
      const y = centerY + Math.sin(nodeAngle) * nodeRadius;
      
      node.x = Math.max(50, Math.min(width - 50, x));
      node.y = Math.max(50, Math.min(height - 50, y));
      
      nodePositions.set(node.id, { x: node.x, y: node.y });
    });
  });
  
  // 应用力导向调整
  for (let iteration = 0; iteration < 50; iteration++) {
    // 计算节点间的排斥力
    nodes.forEach(node1 => {
      let fx = 0, fy = 0;
      
      nodes.forEach(node2 => {
        if (node1.id !== node2.id) {
          const dx = node1.x - node2.x;
          const dy = node1.y - node2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0 && distance < 100) {
            const force = 500 / (distance * distance);
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
          }
        }
      });
      
      // 计算连接的吸引力
      edges.forEach(edge => {
        if (edge.source === node1.id) {
          const target = nodes.find(n => n.id === edge.target);
          if (target) {
            const dx = target.x - node1.x;
            const dy = target.y - node1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const idealDistance = 80;
            
            if (distance > idealDistance) {
              const force = 0.1;
              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
            }
          }
        }
      });
      
      // 应用力并限制移动范围
      const damping = 0.1;
      node1.x += fx * damping;
      node1.y += fy * damping;
      
      // 边界约束
      node1.x = Math.max(50, Math.min(width - 50, node1.x));
      node1.y = Math.max(50, Math.min(height - 50, node1.y));
    });
  }
  
  return { nodes, edges };
}

// 模拟图谱数据生成器
const generateMockGraphData = () => {
  const nodes = [
    { id: 'host1', type: 'host', label: 'Web-Server-01', properties: { ip: '192.168.1.10', os: 'Ubuntu 20.04' } },
    { id: 'host2', type: 'host', label: 'DB-Server-01', properties: { ip: '192.168.1.20', os: 'CentOS 8' } },
    { id: 'user1', type: 'user', label: 'admin', properties: { uid: 1000, groups: ['sudo', 'admin'] } },
    { id: 'user2', type: 'user', label: 'www-data', properties: { uid: 33, groups: ['www-data'] } },
    { id: 'proc1', type: 'process', label: 'nginx', properties: { pid: 1234, cmd: '/usr/sbin/nginx' } },
    { id: 'proc2', type: 'process', label: 'mysql', properties: { pid: 5678, cmd: '/usr/sbin/mysqld' } },
    { id: 'file1', type: 'file', label: '/etc/passwd', properties: { size: 2048, permissions: '644' } },
    { id: 'file2', type: 'file', label: '/var/log/auth.log', properties: { size: 10240, permissions: '640' } },
    { id: 'net1', type: 'network', label: '192.168.1.0/24', properties: { subnet: '192.168.1.0/24' } },
    { id: 'event1', type: 'event', label: '异常登录', properties: { severity: 'high', timestamp: new Date() } },
    { id: 'event2', type: 'event', label: '文件修改', properties: { severity: 'medium', timestamp: new Date() } },
  ];
  
  const edges = [
    { id: 'e1', source: 'user1', target: 'host1', type: 'access', label: 'SSH登录' },
    { id: 'e2', source: 'user1', target: 'proc1', type: 'execute', label: '启动进程' },
    { id: 'e3', source: 'proc1', target: 'file1', type: 'access', label: '读取文件' },
    { id: 'e4', source: 'host1', target: 'host2', type: 'connect', label: 'TCP连接' },
    { id: 'e5', source: 'proc2', target: 'file2', type: 'modify', label: '写入日志' },
    { id: 'e6', source: 'event1', target: 'user1', type: 'access', label: '关联用户' },
    { id: 'e7', source: 'event2', target: 'file1', type: 'modify', label: '关联文件' },
    { id: 'e8', source: 'host1', target: 'net1', type: 'connect', label: '网络接入' },
    { id: 'e9', source: 'host2', target: 'net1', type: 'connect', label: '网络接入' },
  ];
  
  return { nodes, edges };
};

// 图谱可视化组件（使用Canvas或SVG实现）
function GraphCanvas({ data, layout, filters, onNodeClick, onEdgeClick }) {
  const canvasRef = React.useRef(null);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = React.useState(null);
  const [hoveredNode, setHoveredNode] = React.useState(null);
  
  // 简化的Canvas渲染实现
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 应用变换
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    // 绘制边
    data.edges?.forEach(edge => {
      const sourceNode = data.nodes?.find(n => n.id === edge.source);
      const targetNode = data.nodes?.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const edgeConfig = EDGE_TYPES[edge.type] || EDGE_TYPES.access;
        
        ctx.beginPath();
        ctx.strokeStyle = edgeConfig.color;
        ctx.lineWidth = 2;
        
        if (edgeConfig.style === 'dashed') {
          ctx.setLineDash([5, 5]);
        } else if (edgeConfig.style === 'dotted') {
          ctx.setLineDash([2, 2]);
        } else {
          ctx.setLineDash([]);
        }
        
        // 简单的直线连接（实际应用中可以使用更复杂的路径算法）
        const sx = (sourceNode.x || Math.random() * canvas.width) / zoom;
        const sy = (sourceNode.y || Math.random() * canvas.height) / zoom;
        const tx = (targetNode.x || Math.random() * canvas.width) / zoom;
        const ty = (targetNode.y || Math.random() * canvas.height) / zoom;
        
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        
        // 绘制箭头
        const angle = Math.atan2(ty - sy, tx - sx);
        const arrowLength = 10;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(
          tx - arrowLength * Math.cos(angle - Math.PI / 6),
          ty - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(tx, ty);
        ctx.lineTo(
          tx - arrowLength * Math.cos(angle + Math.PI / 6),
          ty - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    });
    
    // 绘制节点
    data.nodes?.forEach(node => {
      const nodeConfig = NODE_TYPES[node.type] || NODE_TYPES.event;
      const x = (node.x || Math.random() * canvas.width) / zoom;
      const y = (node.y || Math.random() * canvas.height) / zoom;
      const radius = nodeConfig.size / 2;
      
      // 绘制节点圆圈
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = nodeConfig.color;
      ctx.fill();
      
      // 高亮选中或悬停的节点
      if (selectedNode?.id === node.id || hoveredNode?.id === node.id) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // 绘制节点标签
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, x, y + radius + 15);
    });
    
    ctx.restore();
  }, [data, zoom, pan, selectedNode, hoveredNode]);
  
  // 鼠标事件处理
  const handleMouseMove = (event) => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - pan.x) / zoom;
    const y = (event.clientY - rect.top - pan.y) / zoom;
    
    // 检测鼠标悬停的节点
    const hoveredNode = data.nodes?.find(node => {
      const nodeConfig = NODE_TYPES[node.type] || NODE_TYPES.event;
      const nx = node.x || Math.random() * canvas.width;
      const ny = node.y || Math.random() * canvas.height;
      const radius = nodeConfig.size / 2;
      
      return Math.sqrt((x - nx) ** 2 + (y - ny) ** 2) <= radius;
    });
    
    setHoveredNode(hoveredNode || null);
    canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
  };
  
  const handleClick = (event) => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
      onNodeClick?.(hoveredNode);
    }
  };
  
  const handleWheel = (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
  };
  
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onWheel={handleWheel}
      />
      
      {/* 图谱工具栏 */}
      <GraphToolbar>
        <Tooltip title="放大">
          <IconButton
            size="small"
            onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
          >
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="缩小">
          <IconButton
            size="small"
            onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
          >
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="居中">
          <IconButton
            size="small"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <CenterIcon />
          </IconButton>
        </Tooltip>
      </GraphToolbar>
      
      {/* 图例 */}
      <GraphLegend>
        <Typography variant="subtitle2" gutterBottom>
          节点类型
        </Typography>
        {Object.entries(NODE_TYPES).map(([type, config]) => {
          const IconComponent = config.icon;
          return (
            <Box key={type} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: config.color,
                  mr: 1,
                }}
              />
              <Typography variant="caption">
                {config.label}
              </Typography>
            </Box>
          );
        })}
      </GraphLegend>
      
      {/* 节点信息面板 */}
      {selectedNode && (
        <NodeInfoPanel>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">
              节点详情
            </Typography>
            <IconButton
              size="small"
              onClick={() => setSelectedNode(null)}
            >
              <HideIcon />
            </IconButton>
          </Box>
          
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                ID
              </Typography>
              <Typography variant="body2">
                {selectedNode.id}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                类型
              </Typography>
              <Typography variant="body2">
                {NODE_TYPES[selectedNode.type]?.label || selectedNode.type}
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                标签
              </Typography>
              <Typography variant="body2">
                {selectedNode.label}
              </Typography>
            </Grid>
            
            {selectedNode.properties && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  属性
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {Object.entries(selectedNode.properties).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${value}`}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        </NodeInfoPanel>
      )}
    </Box>
  );
}

// 图谱统计信息组件
function GraphStatistics({ data, loading }) {
  const stats = React.useMemo(() => {
    if (!data) return {};
    
    const nodesByType = {};
    const edgesByType = {};
    
    data.nodes?.forEach(node => {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    });
    
    data.edges?.forEach(edge => {
      edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
    });
    
    return {
      totalNodes: data.nodes?.length || 0,
      totalEdges: data.edges?.length || 0,
      nodesByType,
      edgesByType,
    };
  }, [data]);
  
  if (loading) {
    return <LoadingSpinner type="content" />;
  }
  
  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <NodeIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6">
            {stats.totalNodes}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            节点总数
          </Typography>
        </Paper>
      </Grid>
      
      <Grid item xs={6}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <LinkIcon sx={{ fontSize: 32, color: 'secondary.main', mb: 1 }} />
          <Typography variant="h6">
            {stats.totalEdges}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            关系总数
          </Typography>
        </Paper>
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>
          节点类型分布
        </Typography>
        {Object.entries(stats.nodesByType).map(([type, count]) => (
          <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">
              {NODE_TYPES[type]?.label || type}
            </Typography>
            <Chip label={count} size="small" />
          </Box>
        ))}
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>
          关系类型分布
        </Typography>
        {Object.entries(stats.edgesByType).map(([type, count]) => (
          <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">
              {EDGE_TYPES[type]?.label || type}
            </Typography>
            <Chip label={count} size="small" />
          </Box>
        ))}
      </Grid>
    </Grid>
  );
}

// 图谱过滤器组件
function GraphFilters({ filters, onFiltersChange }) {
  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };
  
  return (
    <FilterPanel>
      <Typography variant="subtitle2" gutterBottom>
        图谱过滤器
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>节点类型</InputLabel>
            <Select
              value={filters.nodeType || ''}
              onChange={(e) => handleFilterChange('nodeType', e.target.value)}
              label="节点类型"
            >
              <MenuItem value="">全部</MenuItem>
              {Object.entries(NODE_TYPES).map(([type, config]) => (
                <MenuItem key={type} value={type}>
                  {config.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>关系类型</InputLabel>
            <Select
              value={filters.edgeType || ''}
              onChange={(e) => handleFilterChange('edgeType', e.target.value)}
              label="关系类型"
            >
              <MenuItem value="">全部</MenuItem>
              {Object.entries(EDGE_TYPES).map(([type, config]) => (
                <MenuItem key={type} value={type}>
                  {config.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            size="small"
            label="搜索节点"
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>布局算法</InputLabel>
            <Select
              value={filters.layout || 'force'}
              onChange={(e) => handleFilterChange('layout', e.target.value)}
              label="布局算法"
            >
              {Object.entries(LAYOUT_ALGORITHMS).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  {config.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2">
              时间范围:
            </Typography>
            <Slider
              value={filters.timeRange || [0, 24]}
              onChange={(e, value) => handleFilterChange('timeRange', value)}
              valueLabelDisplay="auto"
              min={0}
              max={24}
              step={1}
              marks={[
                { value: 0, label: '0h' },
                { value: 6, label: '6h' },
                { value: 12, label: '12h' },
                { value: 18, label: '18h' },
                { value: 24, label: '24h' },
              ]}
              sx={{ flexGrow: 1, mx: 2 }}
            />
          </Box>
        </Grid>
      </Grid>
    </FilterPanel>
  );
}

// 主图谱可视化页面组件
export default function GraphVisualization() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isConnected, subscribe, unsubscribe } = useWebSocket();
  
  // 状态管理
  const [fullscreen, setFullscreen] = React.useState(false);
  const [selectedNode, setSelectedNode] = React.useState(null);
  const [selectedEdge, setSelectedEdge] = React.useState(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [tabValue, setTabValue] = React.useState(0);
  
  // 过滤器状态
  const [filters, setFilters] = React.useState({
    nodeType: '',
    edgeType: '',
    search: '',
    layout: 'force',
    timeRange: '',
  });
  
  // 获取图谱数据
  const { data: graphData, isLoading: graphLoading, refetch } = useQuery({
    queryKey: ['graph-data', filters],
    queryFn: async () => {
      try {
        // 调用真实的API获取图谱数据
        const response = await apiService.getGraphData(filters);
        
        // 检查API响应
        if (response?.success && response?.data) {
          console.log(`图谱数据来源: ${response.source}`);
          
          // 如果是Neo4j数据，进行数据处理和布局优化
          if (response.source === 'neo4j') {
            return processNeo4jGraphData(response.data);
          }
          
          return response.data;
        } else {
          console.warn('API返回数据异常，使用模拟数据');
          return generateMockGraphData();
        }
      } catch (error) {
        console.error('获取图谱数据失败，使用模拟数据:', error);
        // API调用失败时使用模拟数据作为降级方案
        return generateMockGraphData();
      }
    },
    refetchInterval: 30000, // 30秒刷新一次
    retry: 2, // 失败时重试2次
    retryDelay: 1000, // 重试延迟1秒
  });
  
  // WebSocket 事件处理
  React.useEffect(() => {
    if (!isConnected) return;
    
    const handleGraphUpdate = (event) => {
      // 处理图谱更新事件
      queryClient.invalidateQueries(['graph-data']);
    };
    
    subscribe(EVENT_TYPES.GRAPH_UPDATE, handleGraphUpdate);
    
    return () => {
      unsubscribe(EVENT_TYPES.GRAPH_UPDATE, handleGraphUpdate);
    };
  }, [isConnected, subscribe, unsubscribe, queryClient]);
  
  // 事件处理函数
  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setSidebarOpen(true);
  };
  
  const handleEdgeClick = (edge) => {
    setSelectedEdge(edge);
    setSidebarOpen(true);
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
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleExportGraph = () => {
    // 导出图谱数据
    const dataStr = JSON.stringify(graphData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graph-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('图谱数据已导出');
  };
  
  return (
    <ErrorBoundary>
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 页面标题 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              图谱可视化
            </Typography>
            <Typography variant="body1" color="text.secondary">
              安全事件关系图谱和网络拓扑分析
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={graphLoading}
            >
              刷新
            </Button>
            
            <Button
              startIcon={<DownloadIcon />}
              onClick={handleExportGraph}
              disabled={!graphData}
            >
              导出
            </Button>
            
            <Button
              startIcon={<FilterIcon />}
              onClick={() => setSidebarOpen(true)}
            >
              过滤器
            </Button>
            
            <Tooltip title={fullscreen ? '退出全屏' : '全屏'}>
              <IconButton onClick={handleFullscreenToggle}>
                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* 连接状态 */}
        <ConnectionStatus isConnected={isConnected} />
        
        {/* 过滤器面板 */}
        <GraphFilters
          filters={filters}
          onFiltersChange={setFilters}
        />
        
        {/* 主要内容 */}
        <Grid container spacing={3} sx={{ flexGrow: 1 }}>
          {/* 图谱可视化 */}
          <Grid item xs={12} lg={9}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title="关系图谱"
                action={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={graphLoading ? '加载中...' : `${graphData?.nodes?.length || 0} 节点`}
                      size="small"
                      color={graphLoading ? 'default' : 'primary'}
                    />
                    <Chip
                      label={`${graphData?.edges?.length || 0} 关系`}
                      size="small"
                      color="secondary"
                    />
                  </Box>
                }
              />
              <CardContent sx={{ height: 'calc(100% - 80px)', p: 0 }}>
                {graphLoading ? (
                  <LoadingSpinner type="chart" />
                ) : (
                  <GraphContainer>
                    <GraphCanvas
                      data={graphData}
                      layout={filters.layout}
                      filters={filters}
                      onNodeClick={handleNodeClick}
                      onEdgeClick={handleEdgeClick}
                    />
                  </GraphContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* 统计信息 */}
          <Grid item xs={12} lg={3}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title="图谱统计" />
              <CardContent>
                <GraphStatistics
                  data={graphData}
                  loading={graphLoading}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* 侧边栏 */}
        <Drawer
          anchor="right"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: 400,
              p: 2,
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              详细信息
            </Typography>
            <IconButton onClick={() => setSidebarOpen(false)}>
              <HideIcon />
            </IconButton>
          </Box>
          
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab label="节点" />
            <Tab label="关系" />
            <Tab label="分析" />
          </Tabs>
          
          {tabValue === 0 && selectedNode && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                节点信息
              </Typography>
              {/* 节点详细信息 */}
              <List>
                <ListItem>
                  <ListItemText primary="ID" secondary={selectedNode.id} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="类型" secondary={NODE_TYPES[selectedNode.type]?.label} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="标签" secondary={selectedNode.label} />
                </ListItem>
              </List>
            </Box>
          )}
          
          {tabValue === 1 && selectedEdge && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                关系信息
              </Typography>
              {/* 关系详细信息 */}
              <List>
                <ListItem>
                  <ListItemText primary="ID" secondary={selectedEdge.id} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="类型" secondary={EDGE_TYPES[selectedEdge.type]?.label} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="源节点" secondary={selectedEdge.source} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="目标节点" secondary={selectedEdge.target} />
                </ListItem>
              </List>
            </Box>
          )}
          
          {tabValue === 2 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                图谱分析
              </Typography>
              {/* 图谱分析结果 */}
              <Alert severity="info" sx={{ mb: 2 }}>
                基于当前图谱数据的智能分析结果将在此显示。
              </Alert>
            </Box>
          )}
        </Drawer>
      </Box>
    </ErrorBoundary>
  );
}