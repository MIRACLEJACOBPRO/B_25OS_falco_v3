import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Badge,
  Menu,
  MenuList,
  MenuItem as MenuItemComponent,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tab,
  Tabs,
  TabPanel,
  alpha,
  useTheme,
  styled
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as SupervisorIcon,
  AccountCircle as AccountIcon,
  Shield as ShieldIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
  Block as BlockIcon,
  VpnKey as KeyIcon,
  Assignment as AssignmentIcon,
  History as HistoryIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Flag as FlagIcon,
  Report as ReportIcon,
  BugReport as BugReportIcon,
  Feedback as FeedbackIcon,
  Help as HelpIcon,
  Support as SupportIcon,
  ContactSupport as ContactSupportIcon,
  LiveHelp as LiveHelpIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Chat as ChatIcon,
  Message as MessageIcon,
  Comment as CommentIcon,
  Forum as ForumIcon,
  RateReview as RateReviewIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Share as ShareIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  Send as SendIcon,
  Drafts as DraftsIcon,
  Inbox as InboxIcon,
  Mail as MailIcon,
  MailOutline as MailOutlineIcon,
  Markunread as MarkunreadIcon,
  MarkEmailRead as MarkEmailReadIcon,
  MarkEmailUnread as MarkEmailUnreadIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  FolderShared as FolderSharedIcon,
  CreateNewFolder as CreateNewFolderIcon,
  DriveFileMove as DriveFileMoveIcon,
  FileCopy as FileCopyIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
  AttachFile as AttachFileIcon,
  Attachment as AttachmentIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Launch as LaunchIcon,
  OpenInNew as OpenInNewIcon,
  OpenInBrowser as OpenInBrowserIcon,
  OpenWith as OpenWithIcon,
  GetApp as GetAppIcon,
  Publish as PublishIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  CloudSync as CloudSyncIcon,
  CloudOff as CloudOffIcon,
  CloudQueue as CloudQueueIcon,
  CloudDone as CloudDoneIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  RestoreFromTrash as RestoreFromTrashIcon,
  RestorePage as RestorePageIcon,
  Sync as SyncIcon,
  SyncAlt as SyncAltIcon,
  SyncDisabled as SyncDisabledIcon,
  SyncProblem as SyncProblemIcon,
  Update as UpdateIcon,
  Upgrade as UpgradeIcon,
  SystemUpdate as SystemUpdateIcon,
  SystemUpdateAlt as SystemUpdateAltIcon,
  GetApp as GetAppIcon2,
  InstallDesktop as InstallDesktopIcon,
  InstallMobile as InstallMobileIcon,
  Uninstall as UninstallIcon,
  Build as BuildIcon,
  Construction as ConstructionIcon,
  Engineering as EngineeringIcon,
  Handyman as HandymanIcon,
  HomeRepairService as HomeRepairServiceIcon,
  MiscellaneousServices as MiscellaneousServicesIcon,
  CleaningServices as CleaningServicesIcon,
  Plumbing as PlumbingIcon,
  ElectricalServices as ElectricalServicesIcon,
  Roofing as RoofingIcon,
  Carpenter as CarpenterIcon,
  Architecture as ArchitectureIcon,
  DesignServices as DesignServicesIcon,
  AutoFixHigh as AutoFixHighIcon,
  AutoFixNormal as AutoFixNormalIcon,
  AutoFixOff as AutoFixOffIcon,
  Tune as TuneIcon,
  DeveloperMode as DeveloperModeIcon,
  Code as CodeIcon,
  DataObject as DataObjectIcon,
  Terminal as TerminalIcon,
  Computer as ComputerIcon,
  DesktopMac as DesktopMacIcon,
  DesktopWindows as DesktopWindowsIcon,
  Laptop as LaptopIcon,
  LaptopMac as LaptopMacIcon,
  LaptopWindows as LaptopWindowsIcon,
  LaptopChromebook as LaptopChromebookIcon,
  Tablet as TabletIcon,
  TabletMac as TabletMacIcon,
  TabletAndroid as TabletAndroidIcon,
  PhoneAndroid as PhoneAndroidIcon,
  PhoneIphone as PhoneIphoneIcon,
  Smartphone as SmartphoneIcon,
  Watch as WatchIcon,
  SmartDisplay as SmartDisplayIcon,
  Tv as TvIcon,
  ConnectedTv as ConnectedTvIcon,
  LiveTv as LiveTvIcon,
  OndemandVideo as OndemandVideoIcon,
  VideoCall as VideoCallIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Camera as CameraIcon,
  CameraAlt as CameraAltIcon,
  PhotoCamera as PhotoCameraIcon,
  CameraEnhance as CameraEnhanceIcon,
  CameraFront as CameraFrontIcon,
  CameraRear as CameraRearIcon,
  FlipCameraAndroid as FlipCameraAndroidIcon,
  SwitchCamera as SwitchCameraIcon,
  CameraIndoor as CameraIndoorIcon,
  CameraOutdoor as CameraOutdoorIcon,
  Speaker as SpeakerIcon,
  SpeakerGroup as SpeakerGroupIcon,
  Headphones as HeadphonesIcon,
  HeadsetMic as HeadsetMicIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  VolumeUp as VolumeUpIcon,
  VolumeDown as VolumeDownIcon,
  VolumeMute as VolumeMuteIcon,
  VolumeOff as VolumeOffIcon,
  Hearing as HearingIcon,
  HearingDisabled as HearingDisabledIcon,
  RecordVoiceOver as RecordVoiceOverIcon,
  VoiceOverOff as VoiceOverOffIcon,
  Interpreter as InterpreterIcon,
  Translate as TranslateIcon,
  Language as LanguageIcon,
  Public as PublicIcon,
  PublicOff as PublicOffIcon,
  TravelExplore as TravelExploreIcon,
  Explore as ExploreIcon,
  ExploreOff as ExploreOffIcon,
  CompassCalibration as CompassCalibrationIcon,
  Navigation as NavigationIcon,
  NearMe as NearMeIcon,
  NearMeDisabled as NearMeDisabledIcon,
  MyLocation as MyLocationIcon,
  LocationOn as LocationOnIcon,
  LocationOff as LocationOffIcon,
  LocationSearching as LocationSearchingIcon,
  LocationDisabled as LocationDisabledIcon,
  GpsFixed as GpsFixedIcon,
  GpsNotFixed as GpsNotFixedIcon,
  GpsOff as GpsOffIcon,
  Map as MapIcon,
  Satellite as SatelliteIcon,
  SatelliteAlt as SatelliteAltIcon,
  Terrain as TerrainIcon,
  Layers as LayersIcon,
  LayersClear as LayersClearIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ZoomInMap as ZoomInMapIcon,
  ZoomOutMap as ZoomOutMapIcon,
  CenterFocusStrong as CenterFocusStrongIcon,
  CenterFocusWeak as CenterFocusWeakIcon,
  FilterCenterFocus as FilterCenterFocusIcon,
  FilterTiltShift as FilterTiltShiftIcon,
  CropFree as CropFreeIcon,
  Crop as CropIcon,
  CropOriginal as CropOriginalIcon,
  CropSquare as CropSquareIcon,
  Crop169 as Crop169Icon,
  Crop32 as Crop32Icon,
  Crop54 as Crop54Icon,
  Crop75 as Crop75Icon,
  AspectRatio as AspectRatioIcon,
  Straighten as StraightenIcon,
  Transform as TransformIcon,
  Rotate90DegreesCcw as Rotate90DegreesCcwIcon,
  Rotate90DegreesCw as Rotate90DegreesCwIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  FlipToBack as FlipToBackIcon,
  FlipToFront as FlipToFrontIcon,
  Flip as FlipIcon,
  Texture as TextureIcon,
  Gradient as GradientIcon,
  Grain as GrainIcon,
  BlurOn as BlurOnIcon,
  BlurOff as BlurOffIcon,
  BlurCircular as BlurCircularIcon,
  BlurLinear as BlurLinearIcon,
  Brightness1 as Brightness1Icon,
  Brightness2 as Brightness2Icon,
  Brightness3 as Brightness3Icon,
  Brightness4 as Brightness4Icon,
  Brightness5 as Brightness5Icon,
  Brightness6 as Brightness6Icon,
  Brightness7 as Brightness7Icon,
  BrightnessAuto as BrightnessAutoIcon,
  BrightnessHigh as BrightnessHighIcon,
  BrightnessLow as BrightnessLowIcon,
  BrightnessMedium as BrightnessMediumIcon,
  Contrast as ContrastIcon,
  InvertColors as InvertColorsIcon,
  InvertColorsOff as InvertColorsOffIcon,
  Colorize as ColorizeIcon,
  ColorLens as ColorLensIcon,
  Palette as PaletteIcon,
  FormatColorFill as FormatColorFillIcon,
  FormatColorReset as FormatColorResetIcon,
  FormatColorText as FormatColorTextIcon,
  Opacity as OpacityIcon,
  WaterDrop as WaterDropIcon,
  Water as WaterIcon,
  Waves as WavesIcon,
  Pool as PoolIcon,
  BeachAccess as BeachAccessIcon,
  Umbrella as UmbrellaIcon,
  AcUnit as AcUnitIcon,
  Thermostat as ThermostatIcon,
  DeviceThermostat as DeviceThermostatIcon,
  Whatshot as WhatshotIcon,
  LocalFireDepartment as LocalFireDepartmentIcon,
  Fireplace as FireplaceIcon,
  OutdoorGrill as OutdoorGrillIcon,
  Kitchen as KitchenIcon,
  Microwave as MicrowaveIcon,
  Blender as BlenderIcon,
  CoffeeMaker as CoffeeMakerIcon,
  Coffee as CoffeeIcon,
  LocalCafe as LocalCafeIcon,
  LocalBar as LocalBarIcon,
  LocalDining as LocalDiningIcon,
  Restaurant as RestaurantIcon,
  RestaurantMenu as RestaurantMenuIcon,
  Fastfood as FastfoodIcon,
  LunchDining as LunchDiningIcon,
  DinnerDining as DinnerDiningIcon,
  BreakfastDining as BreakfastDiningIcon,
  BrunchDining as BrunchDiningIcon,
  Cake as CakeIcon,
  Icecream as IcecreamIcon,
  LocalPizza as LocalPizzaIcon,
  EmojiFoodBeverage as EmojiFoodBeverageIcon,
  EmojiEvents as EmojiEventsIcon,
  EmojiFlags as EmojiFlagsIcon,
  EmojiNature as EmojiNatureIcon,
  EmojiObjects as EmojiObjectsIcon,
  EmojiPeople as EmojiPeopleIcon,
  EmojiSymbols as EmojiSymbolsIcon,
  EmojiTransportation as EmojiTransportationIcon,
  Celebration as CelebrationIcon,
  PartyMode as PartyModeIcon,
  Gift as GiftIcon,
  CardGiftcard as CardGiftcardIcon,
  Redeem as RedeemIcon,
  LocalOffer as LocalOfferIcon,
  Loyalty as LoyaltyIcon,
  Discount as DiscountIcon,
  Sell as SellIcon,
  MonetizationOn as MonetizationOnIcon,
  AttachMoney as AttachMoneyIcon,
  CurrencyExchange as CurrencyExchangeIcon,
  Paid as PaidIcon,
  Payment as PaymentIcon,
  Payments as PaymentsIcon,
  CreditCard as CreditCardIcon,
  CreditCardOff as CreditCardOffIcon,
  AccountBalance as AccountBalanceIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Savings as SavingsIcon,
  RequestQuote as RequestQuoteIcon,
  Receipt as ReceiptIcon,
  ReceiptLong as ReceiptLongIcon,
  ShoppingCart as ShoppingCartIcon,
  ShoppingCartCheckout as ShoppingCartCheckoutIcon,
  ShoppingBag as ShoppingBagIcon,
  ShoppingBasket as ShoppingBasketIcon,
  AddShoppingCart as AddShoppingCartIcon,
  RemoveShoppingCart as RemoveShoppingCartIcon,
  ProductionQuantityLimits as ProductionQuantityLimitsIcon,
  Inventory as InventoryIcon,
  Inventory2 as Inventory2Icon,
  Warehouse as WarehouseIcon,
  Store as StoreIcon,
  Storefront as StorefrontIcon,
  StoreMallDirectory as StoreMallDirectoryIcon,
  LocalGroceryStore as LocalGroceryStoreIcon,
  LocalConvenienceStore as LocalConvenienceStoreIcon,
  LocalMall as LocalMallIcon,
  LocalAtm as LocalAtmIcon,
  LocalBank as LocalBankIcon,
  LocalPostOffice as LocalPostOfficeIcon,
  LocalShipping as LocalShippingIcon,
  LocalLaundryService as LocalLaundryServiceIcon,
  LocalCarWash as LocalCarWashIcon,
  LocalGasStation as LocalGasStationIcon,
  EvStation as EvStationIcon,
  LocalParking as LocalParkingIcon,
  LocalAirport as LocalAirportIcon,
  LocalActivity as LocalActivityIcon,
  LocalFlorist as LocalFloristIcon,
  LocalHotel as LocalHotelIcon,
  LocalLibrary as LocalLibraryIcon,
  LocalMovies as LocalMoviesIcon,
  LocalPharmacy as LocalPharmacyIcon,
  LocalPhone as LocalPhoneIcon,
  LocalPlay as LocalPlayIcon,
  LocalPrintshop as LocalPrintshopIcon,
  LocalSee as LocalSeeIcon,
  LocalTaxi as LocalTaxiIcon,
  BeenHere as BeenHereIcon,
  Directions as DirectionsIcon,
  DirectionsBoat as DirectionsBoatIcon,
  DirectionsBus as DirectionsBusIcon,
  DirectionsCar as DirectionsCarIcon,
  DirectionsRailway as DirectionsRailwayIcon,
  DirectionsRun as DirectionsRunIcon,
  DirectionsSubway as DirectionsSubwayIcon,
  DirectionsTransit as DirectionsTransitIcon,
  DirectionsWalk as DirectionsWalkIcon,
  DirectionsBike as DirectionsBikeIcon,
  EditRoad as EditRoadIcon,
  AddRoad as AddRoadIcon,
  Traffic as TrafficIcon,
  AltRoute as AltRouteIcon,
  ForkLeft as ForkLeftIcon,
  ForkRight as ForkRightIcon,
  Merge as MergeIcon,
  Straight as StraightIcon,
  TurnLeft as TurnLeftIcon,
  TurnRight as TurnRightIcon,
  TurnSlightLeft as TurnSlightLeftIcon,
  TurnSlightRight as TurnSlightRightIcon,
  TurnSharpLeft as TurnSharpLeftIcon,
  TurnSharpRight as TurnSharpRightIcon,
  UTurnLeft as UTurnLeftIcon,
  UTurnRight as UTurnRightIcon,
  RoundaboutLeft as RoundaboutLeftIcon,
  RoundaboutRight as RoundaboutRightIcon,
  RampLeft as RampLeftIcon,
  RampRight as RampRightIcon,
  ExitToApp as ExitToAppIcon,
  Web as WebIcon,
  WebAsset as WebAssetIcon,
  WebAssetOff as WebAssetOffIcon
} from '@mui/icons-material';
import DataTable from '../components/common/DataTable';
import { WS_EVENTS, CONNECTION_STATUS } from '../services/websocket';
import apiService from '../services/api';
import ErrorBoundary from '../components/common/ErrorBoundary';

// 用户角色配置
const ROLE_CONFIG = {
  admin: {
    label: '管理员',
    color: 'error',
    icon: AdminIcon,
    permissions: ['all']
  },
  security_analyst: {
    label: '安全分析师',
    color: 'warning',
    icon: SecurityIcon,
    permissions: ['read', 'analyze', 'report']
  },
  operator: {
    label: '操作员',
    color: 'info',
    icon: PersonIcon,
    permissions: ['read', 'monitor']
  },
  viewer: {
    label: '查看者',
    color: 'default',
    icon: VisibilityIcon,
    permissions: ['read']
  }
};

// 用户状态配置
const STATUS_CONFIG = {
  active: {
    label: '活跃',
    color: 'success',
    icon: CheckIcon
  },
  inactive: {
    label: '非活跃',
    color: 'default',
    icon: CancelIcon
  },
  suspended: {
    label: '已暂停',
    color: 'error',
    icon: BlockIcon
  },
  pending: {
    label: '待审核',
    color: 'warning',
    icon: WarningIcon
  }
};

// 样式化组件
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[8]
  }
}));

const RoleChip = styled(Chip)(({ theme, rolecolor }) => ({
  backgroundColor: alpha(theme.palette[rolecolor]?.main || theme.palette.primary.main, 0.1),
  color: theme.palette[rolecolor]?.main || theme.palette.primary.main,
  fontWeight: 600,
  '& .MuiChip-icon': {
    color: 'inherit'
  }
}));

const StatusChip = styled(Chip)(({ theme, statuscolor }) => ({
  backgroundColor: alpha(theme.palette[statuscolor]?.main || theme.palette.default.main, 0.1),
  color: theme.palette[statuscolor]?.main || theme.palette.text.primary,
  fontWeight: 500
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  padding: theme.spacing(0.5),
  margin: theme.spacing(0.25),
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.1)',
    backgroundColor: alpha(theme.palette.primary.main, 0.1)
  }
}));

const SearchContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: alpha(theme.palette.primary.main, 0.02),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
}));

const StatsCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: 'center',
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[12]
  }
}));

const UserManagement = () => {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    pending: 0
  });

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/users');
      setUsers(response.data || []);
      
      // 计算统计信息
      const userStats = (response.data || []).reduce((acc, user) => {
        acc.total++;
        acc[user.status] = (acc[user.status] || 0) + 1;
        return acc;
      }, { total: 0, active: 0, inactive: 0, suspended: 0, pending: 0 });
      
      setStats(userStats);
      setError(null);
    } catch (err) {
      console.error('获取用户列表失败:', err);
      setError('获取用户列表失败');
      setSnackbar({
        open: true,
        message: '获取用户列表失败',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化数据
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 过滤和排序用户
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });

    // 排序
    filtered.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [users, searchTerm, roleFilter, statusFilter, sortBy, sortOrder]);

  // 分页数据
  const paginatedUsers = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredAndSortedUsers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedUsers, page, rowsPerPage]);

  // 处理用户操作
  const handleUserAction = useCallback(async (action, userId, data = {}) => {
    try {
      let response;
      switch (action) {
        case 'create':
          response = await apiService.post('/users', data);
          break;
        case 'update':
          response = await apiService.put(`/users/${userId}`, data);
          break;
        case 'delete':
          response = await apiService.delete(`/users/${userId}`);
          break;
        case 'suspend':
          response = await apiService.patch(`/users/${userId}/suspend`);
          break;
        case 'activate':
          response = await apiService.patch(`/users/${userId}/activate`);
          break;
        case 'reset-password':
          response = await apiService.post(`/users/${userId}/reset-password`);
          break;
        default:
          throw new Error('未知操作');
      }

      setSnackbar({
        open: true,
        message: `用户${action === 'create' ? '创建' : action === 'update' ? '更新' : action === 'delete' ? '删除' : '操作'}成功`,
        severity: 'success'
      });

      // 刷新用户列表
      await fetchUsers();
      
      // 关闭对话框
      setDialogOpen(false);
      setEditingUser(null);
      
    } catch (err) {
      console.error('用户操作失败:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || '操作失败',
        severity: 'error'
      });
    }
  }, [fetchUsers]);

  // 处理批量操作
  const handleBatchAction = useCallback(async (action) => {
    if (selectedUsers.length === 0) {
      setSnackbar({
        open: true,
        message: '请选择要操作的用户',
        severity: 'warning'
      });
      return;
    }

    try {
      await Promise.all(
        selectedUsers.map(userId => 
          apiService.patch(`/users/${userId}/${action}`)
        )
      );

      setSnackbar({
        open: true,
        message: `批量${action === 'suspend' ? '暂停' : '激活'}成功`,
        severity: 'success'
      });

      setSelectedUsers([]);
      await fetchUsers();
    } catch (err) {
      console.error('批量操作失败:', err);
      setSnackbar({
        open: true,
        message: '批量操作失败',
        severity: 'error'
      });
    }
  }, [selectedUsers, fetchUsers]);

  // 表格列定义
  const columns = [
    {
      id: 'avatar',
      label: '',
      minWidth: 60,
      align: 'center',
      format: (value, row) => (
        <Avatar
          src={row.avatar}
          alt={row.name}
          sx={{ width: 40, height: 40 }}
        >
          {row.name?.charAt(0)?.toUpperCase()}
        </Avatar>
      )
    },
    {
      id: 'name',
      label: '姓名',
      minWidth: 120,
      sortable: true
    },
    {
      id: 'username',
      label: '用户名',
      minWidth: 120,
      sortable: true
    },
    {
      id: 'email',
      label: '邮箱',
      minWidth: 180,
      sortable: true
    },
    {
      id: 'role',
      label: '角色',
      minWidth: 120,
      align: 'center',
      sortable: true,
      format: (value) => {
        const config = ROLE_CONFIG[value] || ROLE_CONFIG.viewer;
        const IconComponent = config.icon;
        return (
          <RoleChip
            icon={<IconComponent />}
            label={config.label}
            size="small"
            rolecolor={config.color}
          />
        );
      }
    },
    {
      id: 'status',
      label: '状态',
      minWidth: 100,
      align: 'center',
      sortable: true,
      format: (value) => {
        const config = STATUS_CONFIG[value] || STATUS_CONFIG.inactive;
        const IconComponent = config.icon;
        return (
          <StatusChip
            icon={<IconComponent />}
            label={config.label}
            size="small"
            statuscolor={config.color}
          />
        );
      }
    },
    {
      id: 'lastLogin',
      label: '最后登录',
      minWidth: 150,
      sortable: true,
      format: (value) => value ? new Date(value).toLocaleString() : '从未登录'
    },
    {
      id: 'createdAt',
      label: '创建时间',
      minWidth: 150,
      sortable: true,
      format: (value) => new Date(value).toLocaleString()
    },
    {
      id: 'actions',
      label: '操作',
      minWidth: 120,
      align: 'center',
      format: (value, row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="编辑">
            <ActionButton
              size="small"
              onClick={() => {
                setEditingUser(row);
                setDialogOpen(true);
              }}
            >
              <EditIcon fontSize="small" />
            </ActionButton>
          </Tooltip>
          <Tooltip title="更多操作">
            <ActionButton
              size="small"
              onClick={(e) => {
                setAnchorEl(e.currentTarget);
                setSelectedUser(row);
              }}
            >
              <MoreVertIcon fontSize="small" />
            </ActionButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  // 渲染统计卡片
  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatsCard>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <GroupIcon sx={{ fontSize: 32, color: 'primary.main', mr: 1 }} />
            <Typography variant="h4" component="div" fontWeight="bold">
              {stats.total}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            总用户数
          </Typography>
        </StatsCard>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatsCard>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <CheckIcon sx={{ fontSize: 32, color: 'success.main', mr: 1 }} />
            <Typography variant="h4" component="div" fontWeight="bold">
              {stats.active}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            活跃用户
          </Typography>
        </StatsCard>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatsCard>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <CancelIcon sx={{ fontSize: 32, color: 'grey.500', mr: 1 }} />
            <Typography variant="h4" component="div" fontWeight="bold">
              {stats.inactive}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            非活跃用户
          </Typography>
        </StatsCard>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatsCard>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <BlockIcon sx={{ fontSize: 32, color: 'error.main', mr: 1 }} />
            <Typography variant="h4" component="div" fontWeight="bold">
              {stats.suspended}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            已暂停用户
          </Typography>
        </StatsCard>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <StatsCard>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <WarningIcon sx={{ fontSize: 32, color: 'warning.main', mr: 1 }} />
            <Typography variant="h4" component="div" fontWeight="bold">
              {stats.pending}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            待审核用户
          </Typography>
        </StatsCard>
      </Grid>
    </Grid>
  );

  // 渲染搜索和过滤器
  const renderSearchAndFilters = () => (
    <SearchContainer>
      <TextField
        placeholder="搜索用户..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
        }}
        sx={{ minWidth: 300 }}
      />
      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel>角色</InputLabel>
        <Select
          value={roleFilter}
          label="角色"
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <MenuItem value="">全部</MenuItem>
          {Object.entries(ROLE_CONFIG).map(([key, config]) => (
            <MenuItem key={key} value={key}>
              {config.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel>状态</InputLabel>
        <Select
          value={statusFilter}
          label="状态"
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <MenuItem value="">全部</MenuItem>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <MenuItem key={key} value={key}>
              {config.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ flexGrow: 1 }} />
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => {
          setEditingUser(null);
          setDialogOpen(true);
        }}
      >
        添加用户
      </Button>
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={fetchUsers}
      >
        刷新
      </Button>
    </SearchContainer>
  );

  // 渲染用户对话框
  const renderUserDialog = () => (
    <Dialog
      open={dialogOpen}
      onClose={() => {
        setDialogOpen(false);
        setEditingUser(null);
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {editingUser ? '编辑用户' : '添加用户'}
      </DialogTitle>
      <DialogContent>
        <UserForm
          user={editingUser}
          onSubmit={(data) => {
            if (editingUser) {
              handleUserAction('update', editingUser.id, data);
            } else {
              handleUserAction('create', null, data);
            }
          }}
          onCancel={() => {
            setDialogOpen(false);
            setEditingUser(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );

  // 渲染操作菜单
  const renderActionMenu = () => (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={() => {
        setAnchorEl(null);
        setSelectedUser(null);
      }}
    >
      <MenuItemComponent
        onClick={() => {
          setEditingUser(selectedUser);
          setDialogOpen(true);
          setAnchorEl(null);
        }}
      >
        <ListItemIcon>
          <EditIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>编辑</ListItemText>
      </MenuItemComponent>
      
      {selectedUser?.status === 'active' ? (
        <MenuItemComponent
          onClick={() => {
            handleUserAction('suspend', selectedUser.id);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <BlockIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>暂停</ListItemText>
        </MenuItemComponent>
      ) : (
        <MenuItemComponent
          onClick={() => {
            handleUserAction('activate', selectedUser.id);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <CheckIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>激活</ListItemText>
        </MenuItemComponent>
      )}
      
      <MenuItemComponent
        onClick={() => {
          handleUserAction('reset-password', selectedUser.id);
          setAnchorEl(null);
        }}
      >
        <ListItemIcon>
          <KeyIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>重置密码</ListItemText>
      </MenuItemComponent>
      
      <Divider />
      
      <MenuItemComponent
        onClick={() => {
          if (window.confirm('确定要删除这个用户吗？')) {
            handleUserAction('delete', selectedUser.id);
            setAnchorEl(null);
          }
        }}
        sx={{ color: 'error.main' }}
      >
        <ListItemIcon>
          <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
        </ListItemIcon>
        <ListItemText>删除</ListItemText>
      </MenuItemComponent>
    </Menu>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          用户管理
        </Typography>
        
        {renderStatsCards()}
        {renderSearchAndFilters()}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <DataTable
          columns={columns}
          data={paginatedUsers}
          loading={loading}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={filteredAndSortedUsers.length}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onSort={(column, order) => {
            setSortBy(column);
            setSortOrder(order);
          }}
          sortBy={sortBy}
          sortOrder={sortOrder}
          selectable
          selectedRows={selectedUsers}
          onSelectionChange={setSelectedUsers}
          emptyMessage="暂无用户数据"
        />
        
        {selectedUsers.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => handleBatchAction('suspend')}
            >
              批量暂停
            </Button>
            <Button
              variant="outlined"
              color="success"
              onClick={() => handleBatchAction('activate')}
            >
              批量激活
            </Button>
          </Box>
        )}
        
        {renderUserDialog()}
        {renderActionMenu()}
        
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ErrorBoundary>
  );
};

// 用户表单组件
const UserForm = ({ user, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    role: 'viewer',
    status: 'active',
    password: '',
    confirmPassword: '',
    phone: '',
    department: '',
    ...user
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = '姓名不能为空';
    }
    
    if (!formData.username?.trim()) {
      newErrors.username = '用户名不能为空';
    }
    
    if (!formData.email?.trim()) {
      newErrors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确';
    }
    
    if (!user && !formData.password) {
      newErrors.password = '密码不能为空';
    }
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '密码确认不匹配';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData = { ...formData };
      delete submitData.confirmPassword;
      onSubmit(submitData);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="姓名"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={!!errors.name}
            helperText={errors.name}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="用户名"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            error={!!errors.username}
            helperText={errors.username}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="邮箱"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={!!errors.email}
            helperText={errors.email}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="电话"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>角色</InputLabel>
            <Select
              value={formData.role}
              label="角色"
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              {Object.entries(ROLE_CONFIG).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  {config.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>状态</InputLabel>
            <Select
              value={formData.status}
              label="状态"
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  {config.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="部门"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />
        </Grid>
        {!user && (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="密码"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={!!errors.password}
                helperText={errors.password}
                required
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="确认密码"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                required
              />
            </Grid>
          </>
        )}
      </Grid>
      
      <DialogActions sx={{ mt: 3, px: 0 }}>
        <Button onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" variant="contained">
          {user ? '更新' : '创建'}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default UserManagement;