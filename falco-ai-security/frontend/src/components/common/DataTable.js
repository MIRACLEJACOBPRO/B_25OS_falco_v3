/**
 * 通用数据表格组件
 * 支持排序、筛选、分页、选择等功能
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Checkbox,
  IconButton,
  Toolbar,
  Typography,
  Box,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Tooltip,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { visuallyHidden } from '@mui/utils';
import LoadingSpinner from './LoadingSpinner';
import ErrorBoundary from './ErrorBoundary';

// 样式化组件
const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  '& .MuiTable-root': {
    minWidth: 650,
  },
  '& .MuiTableHead-root': {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
  },
  '& .MuiTableRow-root': {
    '&:nth-of-type(odd)': {
      backgroundColor: alpha(theme.palette.action.hover, 0.05),
    },
    '&:hover': {
      backgroundColor: alpha(theme.palette.action.hover, 0.1),
    },
    '&.Mui-selected': {
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.12),
      },
    },
  },
  '& .MuiTableCell-head': {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(1),
  minHeight: '64px !important',
  backgroundColor: alpha(theme.palette.primary.main, 0.02),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const SearchField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      backgroundColor: alpha(theme.palette.action.hover, 0.05),
    },
  },
}));

// 排序方向
const ORDER_DIRECTION = {
  ASC: 'asc',
  DESC: 'desc',
};

// 筛选类型
export const FILTER_TYPES = {
  TEXT: 'text',
  SELECT: 'select',
  MULTI_SELECT: 'multiSelect',
  DATE: 'date',
  DATE_RANGE: 'dateRange',
  NUMBER: 'number',
  NUMBER_RANGE: 'numberRange',
  BOOLEAN: 'boolean',
};

// 列对齐方式
export const COLUMN_ALIGN = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
};

// 工具栏操作
function DataTableToolbar({
  title,
  selected = [],
  searchValue,
  onSearchChange,
  onRefresh,
  onAdd,
  onBatchDelete,
  onExport,
  onImport,
  filters,
  onFilterChange,
  customActions = [],
  showSearch = true,
  showRefresh = true,
  showFilters = true,
}) {
  const [filterMenuAnchor, setFilterMenuAnchor] = React.useState(null);
  const [filtersVisible, setFiltersVisible] = React.useState(false);
  
  const numSelected = selected.length;
  
  const handleFilterMenuOpen = (event) => {
    setFilterMenuAnchor(event.currentTarget);
  };
  
  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };
  
  const toggleFilters = () => {
    setFiltersVisible(!filtersVisible);
  };
  
  return (
    <>
      <StyledToolbar>
        <Box sx={{ flex: '1 1 100%' }}>
          {numSelected > 0 ? (
            <Typography
              sx={{ flex: '1 1 100%' }}
              color="inherit"
              variant="subtitle1"
              component="div"
            >
              已选择 {numSelected} 项
            </Typography>
          ) : (
            <Typography
              sx={{ flex: '1 1 100%' }}
              variant="h6"
              id="tableTitle"
              component="div"
            >
              {title}
            </Typography>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 搜索框 */}
          {showSearch && (
            <SearchField
              size="small"
              placeholder="搜索..."
              value={searchValue || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchValue && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => onSearchChange?.('')}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
          )}
          
          {/* 筛选按钮 */}
          {showFilters && filters && filters.length > 0 && (
            <Tooltip title="筛选">
              <IconButton onClick={toggleFilters}>
                <FilterIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {/* 刷新按钮 */}
          {showRefresh && (
            <Tooltip title="刷新">
              <IconButton onClick={onRefresh}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {/* 批量操作 */}
          {numSelected > 0 ? (
            <>
              {onBatchDelete && (
                <Tooltip title="批量删除">
                  <IconButton onClick={() => onBatchDelete(selected)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
            </>
          ) : (
            <>
              {/* 添加按钮 */}
              {onAdd && (
                <Tooltip title="添加">
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAdd}
                    size="small"
                  >
                    添加
                  </Button>
                </Tooltip>
              )}
              
              {/* 导入导出 */}
              {(onExport || onImport) && (
                <>
                  {onExport && (
                    <Tooltip title="导出">
                      <IconButton onClick={onExport}>
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {onImport && (
                    <Tooltip title="导入">
                      <IconButton onClick={onImport}>
                        <UploadIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              )}
              
              {/* 自定义操作 */}
              {customActions.map((action, index) => (
                <Tooltip key={index} title={action.tooltip || action.label}>
                  <IconButton onClick={action.onClick}>
                    {action.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </>
          )}
        </Box>
      </StyledToolbar>
      
      {/* 筛选面板 */}
      {filtersVisible && filters && filters.length > 0 && (
        <Collapse in={filtersVisible}>
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {filters.map((filter) => (
                <FilterControl
                  key={filter.key}
                  filter={filter}
                  onChange={onFilterChange}
                />
              ))}
            </Stack>
          </Box>
        </Collapse>
      )}
    </>
  );
}

// 筛选控件
function FilterControl({ filter, onChange }) {
  const { key, label, type, options, value } = filter;
  
  const handleChange = (newValue) => {
    onChange?.(key, newValue);
  };
  
  switch (type) {
    case FILTER_TYPES.TEXT:
      return (
        <TextField
          size="small"
          label={label}
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          sx={{ minWidth: 150 }}
        />
      );
      
    case FILTER_TYPES.SELECT:
      return (
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>{label}</InputLabel>
          <Select
            value={value || ''}
            label={label}
            onChange={(e) => handleChange(e.target.value)}
          >
            <MenuItem value="">
              <em>全部</em>
            </MenuItem>
            {options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
      
    case FILTER_TYPES.MULTI_SELECT:
      return (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>{label}</InputLabel>
          <Select
            multiple
            value={value || []}
            label={label}
            onChange={(e) => handleChange(e.target.value)}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((val) => {
                  const option = options?.find(opt => opt.value === val);
                  return (
                    <Chip
                      key={val}
                      label={option?.label || val}
                      size="small"
                    />
                  );
                })}
              </Box>
            )}
          >
            {options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Checkbox checked={(value || []).indexOf(option.value) > -1} />
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
      
    case FILTER_TYPES.DATE:
      return (
        <TextField
          size="small"
          type="date"
          label={label}
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 150 }}
        />
      );
      
    case FILTER_TYPES.NUMBER:
      return (
        <TextField
          size="small"
          type="number"
          label={label}
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          sx={{ minWidth: 120 }}
        />
      );
      
    case FILTER_TYPES.BOOLEAN:
      return (
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>{label}</InputLabel>
          <Select
            value={value === undefined ? '' : value}
            label={label}
            onChange={(e) => handleChange(e.target.value === '' ? undefined : e.target.value)}
          >
            <MenuItem value="">
              <em>全部</em>
            </MenuItem>
            <MenuItem value={true}>是</MenuItem>
            <MenuItem value={false}>否</MenuItem>
          </Select>
        </FormControl>
      );
      
    default:
      return null;
  }
}

// 表头单元格
function DataTableHead({
  columns,
  order,
  orderBy,
  onRequestSort,
  onSelectAllClick,
  numSelected,
  rowCount,
  selectable = false,
}) {
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };
  
  return (
    <TableHead>
      <TableRow>
        {selectable && (
          <TableCell padding="checkbox">
            <Checkbox
              color="primary"
              indeterminate={numSelected > 0 && numSelected < rowCount}
              checked={rowCount > 0 && numSelected === rowCount}
              onChange={onSelectAllClick}
              inputProps={{
                'aria-label': 'select all items',
              }}
            />
          </TableCell>
        )}
        
        {columns.map((column) => (
          <TableCell
            key={column.key}
            align={column.align || COLUMN_ALIGN.LEFT}
            padding={column.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === column.key ? order : false}
            sx={{ minWidth: column.minWidth, width: column.width }}
          >
            {column.sortable !== false ? (
              <TableSortLabel
                active={orderBy === column.key}
                direction={orderBy === column.key ? order : ORDER_DIRECTION.ASC}
                onClick={createSortHandler(column.key)}
              >
                {column.label}
                {orderBy === column.key ? (
                  <Box component="span" sx={visuallyHidden}>
                    {order === ORDER_DIRECTION.DESC ? 'sorted descending' : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </TableCell>
        ))}
        
        {/* 操作列 */}
        <TableCell align="center" sx={{ minWidth: 120 }}>
          操作
        </TableCell>
      </TableRow>
    </TableHead>
  );
}

// 表格行
function DataTableRow({
  row,
  columns,
  selected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  customActions = [],
  selectable = false,
  expandable = false,
  expanded = false,
  onToggleExpand,
  renderExpandedContent,
}) {
  const [actionMenuAnchor, setActionMenuAnchor] = React.useState(null);
  
  const handleActionMenuOpen = (event) => {
    setActionMenuAnchor(event.currentTarget);
  };
  
  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
  };
  
  const handleClick = (event) => {
    if (selectable) {
      onSelect?.(event, row.id);
    }
  };
  
  const isSelected = selected?.includes(row.id);
  
  return (
    <>
      <TableRow
        hover
        onClick={handleClick}
        role="checkbox"
        aria-checked={isSelected}
        tabIndex={-1}
        selected={isSelected}
        sx={{ cursor: selectable ? 'pointer' : 'default' }}
      >
        {selectable && (
          <TableCell padding="checkbox">
            <Checkbox
              color="primary"
              checked={isSelected}
              inputProps={{
                'aria-labelledby': `enhanced-table-checkbox-${row.id}`,
              }}
            />
          </TableCell>
        )}
        
        {columns.map((column) => (
          <TableCell
            key={column.key}
            align={column.align || COLUMN_ALIGN.LEFT}
            padding={column.disablePadding ? 'none' : 'normal'}
          >
            {column.render ? column.render(row[column.key], row) : row[column.key]}
          </TableCell>
        ))}
        
        {/* 操作列 */}
        <TableCell align="center">
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            {expandable && (
              <Tooltip title={expanded ? "收起" : "展开"}>
                <IconButton size="small" onClick={() => onToggleExpand?.(row.id)}>
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Tooltip>
            )}
            
            {onView && (
              <Tooltip title="查看">
                <IconButton size="small" onClick={() => onView(row)}>
                  <ViewIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {onEdit && (
              <Tooltip title="编辑">
                <IconButton size="small" onClick={() => onEdit(row)}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {onDelete && (
              <Tooltip title="删除">
                <IconButton size="small" onClick={() => onDelete(row)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {customActions.length > 0 && (
              <>
                <Tooltip title="更多操作">
                  <IconButton size="small" onClick={handleActionMenuOpen}>
                    <MoreIcon />
                  </IconButton>
                </Tooltip>
                
                <Menu
                  anchorEl={actionMenuAnchor}
                  open={Boolean(actionMenuAnchor)}
                  onClose={handleActionMenuClose}
                >
                  {customActions.map((action, index) => (
                    <MenuItem
                      key={index}
                      onClick={() => {
                        action.onClick(row);
                        handleActionMenuClose();
                      }}
                      disabled={action.disabled?.(row)}
                    >
                      {action.icon && (
                        <Box sx={{ mr: 1, display: 'flex' }}>
                          {action.icon}
                        </Box>
                      )}
                      {action.label}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
          </Box>
        </TableCell>
      </TableRow>
      
      {/* 展开内容 */}
      {expandable && (
        <TableRow>
          <TableCell
            style={{ paddingBottom: 0, paddingTop: 0 }}
            colSpan={columns.length + (selectable ? 1 : 0) + 1}
          >
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1 }}>
                {renderExpandedContent?.(row)}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// 主数据表格组件
function DataTable({
  // 数据
  data = [],
  columns = [],
  loading = false,
  error = null,
  
  // 标题和工具栏
  title,
  showToolbar = true,
  
  // 选择功能
  selectable = false,
  selected = [],
  onSelectionChange,
  
  // 排序功能
  sortable = true,
  order = ORDER_DIRECTION.ASC,
  orderBy = '',
  onSortChange,
  
  // 分页功能
  pagination = true,
  page = 0,
  rowsPerPage = 10,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [5, 10, 25, 50],
  
  // 搜索功能
  searchable = true,
  searchValue = '',
  onSearchChange,
  
  // 筛选功能
  filters = [],
  onFilterChange,
  
  // 展开功能
  expandable = false,
  expandedRows = [],
  onToggleExpand,
  renderExpandedContent,
  
  // 操作功能
  onRefresh,
  onAdd,
  onView,
  onEdit,
  onDelete,
  onBatchDelete,
  onExport,
  onImport,
  customActions = [],
  customToolbarActions = [],
  
  // 样式
  size = 'medium',
  stickyHeader = false,
  maxHeight,
  
  // 其他
  emptyMessage = '暂无数据',
  ...props
}) {
  // 处理选择
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = data.map((row) => row.id);
      onSelectionChange?.(newSelected);
    } else {
      onSelectionChange?.([]);
    }
  };
  
  const handleSelect = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];
    
    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    
    onSelectionChange?.(newSelected);
  };
  
  // 处理排序
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === ORDER_DIRECTION.ASC;
    const newOrder = isAsc ? ORDER_DIRECTION.DESC : ORDER_DIRECTION.ASC;
    onSortChange?.(property, newOrder);
  };
  
  // 处理分页
  const handleChangePage = (event, newPage) => {
    onPageChange?.(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    onRowsPerPageChange?.(parseInt(event.target.value, 10));
    onPageChange?.(0);
  };
  
  // 错误状态
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">
          加载数据时发生错误: {error.message || error}
        </Alert>
      </Paper>
    );
  }
  
  return (
    <ErrorBoundary>
      <Paper sx={{ width: '100%', mb: 2 }} {...props}>
        {/* 工具栏 */}
        {showToolbar && (
          <DataTableToolbar
            title={title}
            selected={selected}
            searchValue={searchValue}
            onSearchChange={searchable ? onSearchChange : undefined}
            onRefresh={onRefresh}
            onAdd={onAdd}
            onBatchDelete={onBatchDelete}
            onExport={onExport}
            onImport={onImport}
            filters={filters}
            onFilterChange={onFilterChange}
            customActions={customToolbarActions}
            showSearch={searchable}
          />
        )}
        
        {/* 表格 */}
        <StyledTableContainer sx={{ maxHeight }}>
          <Table
            stickyHeader={stickyHeader}
            aria-labelledby="tableTitle"
            size={size}
          >
            <DataTableHead
              columns={columns}
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={sortable ? handleRequestSort : undefined}
              rowCount={data.length}
              selectable={selectable}
            />
            
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0) + 1}
                    align="center"
                    sx={{ py: 8 }}
                  >
                    <LoadingSpinner />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0) + 1}
                    align="center"
                    sx={{ py: 8 }}
                  >
                    <Typography variant="body1" color="text.secondary">
                      {emptyMessage}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <DataTableRow
                    key={row.id}
                    row={row}
                    columns={columns}
                    selected={selected}
                    onSelect={handleSelect}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    customActions={customActions}
                    selectable={selectable}
                    expandable={expandable}
                    expanded={expandedRows.includes(row.id)}
                    onToggleExpand={onToggleExpand}
                    renderExpandedContent={renderExpandedContent}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </StyledTableContainer>
        
        {/* 分页 */}
        {pagination && !loading && data.length > 0 && (
          <TablePagination
            rowsPerPageOptions={rowsPerPageOptions}
            component="div"
            count={totalCount || data.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="每页行数:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} 共 ${count !== -1 ? count : `超过 ${to}`} 条`
            }
          />
        )}
      </Paper>
    </ErrorBoundary>
  );
}

export default DataTable;
export {
  ORDER_DIRECTION,
  DataTableToolbar,
  DataTableHead,
  DataTableRow,
};