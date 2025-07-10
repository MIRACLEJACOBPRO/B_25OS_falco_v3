/**
 * 通用表单组件
 * 提供各种表单输入控件和验证功能
 */

import React from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Checkbox,
  Radio,
  RadioGroup,
  Switch,
  Slider,
  Autocomplete,
  Chip,
  Button,
  ButtonGroup,
  ToggleButton,
  ToggleButtonGroup,
  Rating,
  Box,
  Typography,
  Stack,
  Grid,
  Paper,
  Divider,
  Alert,
  Collapse,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { DatePicker, TimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { styled } from '@mui/material/styles';
import { useFormik } from 'formik';
import * as Yup from 'yup';

// 样式化组件
const StyledFormControl = styled(FormControl)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiFormLabel-root': {
    fontWeight: 500,
  },
  '& .MuiFormHelperText-root': {
    marginLeft: 0,
    marginTop: theme.spacing(0.5),
  },
}));

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiCardContent-root': {
    paddingBottom: theme.spacing(1),
  },
}));

const FileDropZone = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
  '&.dragover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light,
    opacity: 0.8,
  },
}));

// 表单字段类型
export const FIELD_TYPES = {
  TEXT: 'text',
  EMAIL: 'email',
  PASSWORD: 'password',
  NUMBER: 'number',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  MULTI_SELECT: 'multiSelect',
  AUTOCOMPLETE: 'autocomplete',
  CHECKBOX: 'checkbox',
  CHECKBOX_GROUP: 'checkboxGroup',
  RADIO: 'radio',
  SWITCH: 'switch',
  SLIDER: 'slider',
  RATING: 'rating',
  DATE: 'date',
  TIME: 'time',
  DATETIME: 'datetime',
  FILE: 'file',
  COLOR: 'color',
  TOGGLE_BUTTON: 'toggleButton',
  CUSTOM: 'custom',
};

// 验证规则
export const VALIDATION_RULES = {
  required: (message = '此字段为必填项') => Yup.mixed().required(message),
  email: (message = '请输入有效的邮箱地址') => Yup.string().email(message),
  minLength: (min, message) => Yup.string().min(min, message || `最少需要${min}个字符`),
  maxLength: (max, message) => Yup.string().max(max, message || `最多允许${max}个字符`),
  min: (min, message) => Yup.number().min(min, message || `最小值为${min}`),
  max: (max, message) => Yup.number().max(max, message || `最大值为${max}`),
  pattern: (regex, message = '格式不正确') => Yup.string().matches(regex, message),
  url: (message = '请输入有效的URL') => Yup.string().url(message),
  phone: (message = '请输入有效的手机号码') => 
    Yup.string().matches(/^1[3-9]\d{9}$/, message),
  password: (message = '密码至少8位，包含字母和数字') => 
    Yup.string().min(8).matches(/^(?=.*[A-Za-z])(?=.*\d)/, message),
  confirmPassword: (message = '密码不匹配') => 
    Yup.string().oneOf([Yup.ref('password'), null], message),
};

// 文本输入框
export function TextInput({
  name,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required = false,
  disabled = false,
  multiline = false,
  rows = 4,
  maxLength,
  startAdornment,
  endAdornment,
  showPasswordToggle = false,
  fullWidth = true,
  size = 'medium',
  variant = 'outlined',
  ...props
}) {
  const [showPassword, setShowPassword] = React.useState(false);
  
  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };
  
  const inputType = type === 'password' && showPassword ? 'text' : type;
  
  return (
    <StyledFormControl fullWidth={fullWidth} error={!!error}>
      <TextField
        name={name}
        label={label}
        type={inputType}
        placeholder={placeholder}
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
        error={!!error}
        helperText={error || helperText}
        required={required}
        disabled={disabled}
        multiline={multiline}
        rows={multiline ? rows : undefined}
        fullWidth={fullWidth}
        size={size}
        variant={variant}
        inputProps={{
          maxLength,
        }}
        InputProps={{
          startAdornment: startAdornment && (
            <InputAdornment position="start">{startAdornment}</InputAdornment>
          ),
          endAdornment: (
            <>
              {type === 'password' && showPasswordToggle && (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )}
              {endAdornment && (
                <InputAdornment position="end">{endAdornment}</InputAdornment>
              )}
            </>
          ),
        }}
        {...props}
      />
      {maxLength && value && (
        <FormHelperText sx={{ textAlign: 'right' }}>
          {value.length}/{maxLength}
        </FormHelperText>
      )}
    </StyledFormControl>
  );
}

// 选择框
export function SelectInput({
  name,
  label,
  value,
  onChange,
  onBlur,
  options = [],
  error,
  helperText,
  required = false,
  disabled = false,
  multiple = false,
  placeholder = '请选择',
  fullWidth = true,
  size = 'medium',
  ...props
}) {
  return (
    <StyledFormControl fullWidth={fullWidth} error={!!error}>
      <InputLabel required={required}>{label}</InputLabel>
      <Select
        name={name}
        value={value || (multiple ? [] : '')}
        onChange={onChange}
        onBlur={onBlur}
        label={label}
        multiple={multiple}
        disabled={disabled}
        size={size}
        displayEmpty
        renderValue={multiple ? undefined : (selected) => {
          if (!selected) {
            return <em>{placeholder}</em>;
          }
          const option = options.find(opt => opt.value === selected);
          return option ? option.label : selected;
        }}
        {...props}
      >
        {!multiple && (
          <MenuItem value="">
            <em>{placeholder}</em>
          </MenuItem>
        )}
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {multiple && (
              <Checkbox checked={(value || []).indexOf(option.value) > -1} />
            )}
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {(error || helperText) && (
        <FormHelperText>{error || helperText}</FormHelperText>
      )}
    </StyledFormControl>
  );
}

// 自动完成输入框
export function AutocompleteInput({
  name,
  label,
  value,
  onChange,
  onBlur,
  options = [],
  error,
  helperText,
  required = false,
  disabled = false,
  multiple = false,
  freeSolo = false,
  placeholder = '请选择或输入',
  fullWidth = true,
  size = 'medium',
  ...props
}) {
  return (
    <StyledFormControl fullWidth={fullWidth} error={!!error}>
      <Autocomplete
        name={name}
        value={value}
        onChange={(event, newValue) => {
          onChange({
            target: {
              name,
              value: newValue,
            },
          });
        }}
        onBlur={onBlur}
        options={options}
        getOptionLabel={(option) => option.label || option}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        multiple={multiple}
        freeSolo={freeSolo}
        disabled={disabled}
        size={size}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            required={required}
            error={!!error}
            helperText={error || helperText}
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              variant="outlined"
              label={option.label || option}
              {...getTagProps({ index })}
              key={index}
            />
          ))
        }
        {...props}
      />
    </StyledFormControl>
  );
}

// 复选框组
export function CheckboxGroup({
  name,
  label,
  value = [],
  onChange,
  options = [],
  error,
  helperText,
  required = false,
  disabled = false,
  row = false,
  ...props
}) {
  const handleChange = (optionValue) => (event) => {
    const newValue = event.target.checked
      ? [...value, optionValue]
      : value.filter(v => v !== optionValue);
    
    onChange({
      target: {
        name,
        value: newValue,
      },
    });
  };
  
  return (
    <StyledFormControl component="fieldset" error={!!error}>
      <FormLabel component="legend" required={required}>
        {label}
      </FormLabel>
      <FormGroup row={row}>
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            control={
              <Checkbox
                checked={value.includes(option.value)}
                onChange={handleChange(option.value)}
                disabled={disabled}
              />
            }
            label={option.label}
            {...props}
          />
        ))}
      </FormGroup>
      {(error || helperText) && (
        <FormHelperText>{error || helperText}</FormHelperText>
      )}
    </StyledFormControl>
  );
}

// 单选框组
export function RadioGroupInput({
  name,
  label,
  value,
  onChange,
  options = [],
  error,
  helperText,
  required = false,
  disabled = false,
  row = false,
  ...props
}) {
  return (
    <StyledFormControl component="fieldset" error={!!error}>
      <FormLabel component="legend" required={required}>
        {label}
      </FormLabel>
      <RadioGroup
        name={name}
        value={value || ''}
        onChange={onChange}
        row={row}
        {...props}
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio disabled={disabled} />}
            label={option.label}
          />
        ))}
      </RadioGroup>
      {(error || helperText) && (
        <FormHelperText>{error || helperText}</FormHelperText>
      )}
    </StyledFormControl>
  );
}

// 开关
export function SwitchInput({
  name,
  label,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  color = 'primary',
  size = 'medium',
  ...props
}) {
  return (
    <StyledFormControl error={!!error}>
      <FormControlLabel
        control={
          <Switch
            name={name}
            checked={!!value}
            onChange={onChange}
            disabled={disabled}
            color={color}
            size={size}
            {...props}
          />
        }
        label={label}
      />
      {(error || helperText) && (
        <FormHelperText>{error || helperText}</FormHelperText>
      )}
    </StyledFormControl>
  );
}

// 滑块
export function SliderInput({
  name,
  label,
  value,
  onChange,
  error,
  helperText,
  min = 0,
  max = 100,
  step = 1,
  marks = false,
  valueLabelDisplay = 'auto',
  disabled = false,
  ...props
}) {
  return (
    <StyledFormControl error={!!error}>
      <Typography gutterBottom>{label}</Typography>
      <Slider
        name={name}
        value={value || min}
        onChange={(event, newValue) => {
          onChange({
            target: {
              name,
              value: newValue,
            },
          });
        }}
        min={min}
        max={max}
        step={step}
        marks={marks}
        valueLabelDisplay={valueLabelDisplay}
        disabled={disabled}
        {...props}
      />
      {(error || helperText) && (
        <FormHelperText>{error || helperText}</FormHelperText>
      )}
    </StyledFormControl>
  );
}

// 评分
export function RatingInput({
  name,
  label,
  value,
  onChange,
  error,
  helperText,
  max = 5,
  precision = 1,
  disabled = false,
  size = 'medium',
  ...props
}) {
  return (
    <StyledFormControl error={!!error}>
      <Typography component="legend">{label}</Typography>
      <Rating
        name={name}
        value={value || 0}
        onChange={(event, newValue) => {
          onChange({
            target: {
              name,
              value: newValue,
            },
          });
        }}
        max={max}
        precision={precision}
        disabled={disabled}
        size={size}
        {...props}
      />
      {(error || helperText) && (
        <FormHelperText>{error || helperText}</FormHelperText>
      )}
    </StyledFormControl>
  );
}

// 日期时间选择器
export function DateTimeInput({
  name,
  label,
  type = 'date',
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  fullWidth = true,
  size = 'medium',
  ...props
}) {
  const handleChange = (newValue) => {
    onChange({
      target: {
        name,
        value: newValue,
      },
    });
  };
  
  const commonProps = {
    label,
    value: value || null,
    onChange: handleChange,
    disabled,
    slotProps: {
      textField: {
        required,
        error: !!error,
        helperText: error || helperText,
        fullWidth,
        size,
      },
    },
    ...props,
  };
  
  return (
    <StyledFormControl fullWidth={fullWidth} error={!!error}>
      {type === 'date' && <DatePicker {...commonProps} />}
      {type === 'time' && <TimePicker {...commonProps} />}
      {type === 'datetime' && <DateTimePicker {...commonProps} />}
    </StyledFormControl>
  );
}

// 文件上传
export function FileInput({
  name,
  label,
  value,
  onChange,
  error,
  helperText,
  accept,
  multiple = false,
  maxSize,
  disabled = false,
  showPreview = true,
  ...props
}) {
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef(null);
  
  const handleFileChange = (files) => {
    const fileList = Array.from(files);
    
    // 文件大小验证
    if (maxSize) {
      const oversizedFiles = fileList.filter(file => file.size > maxSize);
      if (oversizedFiles.length > 0) {
        // 处理文件过大错误
        return;
      }
    }
    
    onChange({
      target: {
        name,
        value: multiple ? fileList : fileList[0],
      },
    });
  };
  
  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileChange(files);
    }
  };
  
  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };
  
  const handleDragLeave = () => {
    setDragOver(false);
  };
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleInputChange = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      handleFileChange(files);
    }
  };
  
  return (
    <StyledFormControl error={!!error}>
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>
      
      <FileDropZone
        className={dragOver ? 'dragover' : ''}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
          {...props}
        />
        
        <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="body1" gutterBottom>
          点击或拖拽文件到此处上传
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {accept && `支持格式: ${accept}`}
          {maxSize && ` | 最大大小: ${(maxSize / 1024 / 1024).toFixed(1)}MB`}
        </Typography>
      </FileDropZone>
      
      {/* 文件预览 */}
      {showPreview && value && (
        <Box sx={{ mt: 2 }}>
          {Array.isArray(value) ? (
            value.map((file, index) => (
              <Chip
                key={index}
                label={file.name}
                onDelete={() => {
                  const newValue = value.filter((_, i) => i !== index);
                  onChange({
                    target: {
                      name,
                      value: newValue.length > 0 ? newValue : null,
                    },
                  });
                }}
                sx={{ mr: 1, mb: 1 }}
              />
            ))
          ) : (
            <Chip
              label={value.name}
              onDelete={() => {
                onChange({
                  target: {
                    name,
                    value: null,
                  },
                });
              }}
            />
          )}
        </Box>
      )}
      
      {(error || helperText) && (
        <FormHelperText>{error || helperText}</FormHelperText>
      )}
    </StyledFormControl>
  );
}

// 动态表单字段
export function DynamicFormField({ field, value, onChange, onBlur, error }) {
  const commonProps = {
    name: field.name,
    label: field.label,
    value,
    onChange,
    onBlur,
    error,
    helperText: field.helperText,
    required: field.required,
    disabled: field.disabled,
    fullWidth: field.fullWidth,
    size: field.size,
  };
  
  switch (field.type) {
    case FIELD_TYPES.TEXT:
    case FIELD_TYPES.EMAIL:
    case FIELD_TYPES.PASSWORD:
    case FIELD_TYPES.NUMBER:
      return (
        <TextInput
          {...commonProps}
          type={field.type}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          showPasswordToggle={field.type === FIELD_TYPES.PASSWORD}
        />
      );
      
    case FIELD_TYPES.TEXTAREA:
      return (
        <TextInput
          {...commonProps}
          multiline
          rows={field.rows || 4}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
        />
      );
      
    case FIELD_TYPES.SELECT:
      return (
        <SelectInput
          {...commonProps}
          options={field.options}
          placeholder={field.placeholder}
        />
      );
      
    case FIELD_TYPES.MULTI_SELECT:
      return (
        <SelectInput
          {...commonProps}
          options={field.options}
          multiple
          placeholder={field.placeholder}
        />
      );
      
    case FIELD_TYPES.AUTOCOMPLETE:
      return (
        <AutocompleteInput
          {...commonProps}
          options={field.options}
          multiple={field.multiple}
          freeSolo={field.freeSolo}
          placeholder={field.placeholder}
        />
      );
      
    case FIELD_TYPES.CHECKBOX_GROUP:
      return (
        <CheckboxGroup
          {...commonProps}
          options={field.options}
          row={field.row}
        />
      );
      
    case FIELD_TYPES.RADIO:
      return (
        <RadioGroup
          {...commonProps}
          options={field.options}
          row={field.row}
        />
      );
      
    case FIELD_TYPES.SWITCH:
      return (
        <SwitchInput
          {...commonProps}
          color={field.color}
        />
      );
      
    case FIELD_TYPES.SLIDER:
      return (
        <SliderInput
          {...commonProps}
          min={field.min}
          max={field.max}
          step={field.step}
          marks={field.marks}
        />
      );
      
    case FIELD_TYPES.RATING:
      return (
        <RatingInput
          {...commonProps}
          max={field.max}
          precision={field.precision}
        />
      );
      
    case FIELD_TYPES.DATE:
    case FIELD_TYPES.TIME:
    case FIELD_TYPES.DATETIME:
      return (
        <DateTimeInput
          {...commonProps}
          type={field.type}
        />
      );
      
    case FIELD_TYPES.FILE:
      return (
        <FileInput
          {...commonProps}
          accept={field.accept}
          multiple={field.multiple}
          maxSize={field.maxSize}
          showPreview={field.showPreview}
        />
      );
      
    case FIELD_TYPES.CUSTOM:
      return field.component ? (
        <field.component {...commonProps} {...field.props} />
      ) : null;
      
    default:
      return (
        <TextInput
          {...commonProps}
          placeholder={field.placeholder}
        />
      );
  }
}

// 表单构建器
export function FormBuilder({
  fields = [],
  initialValues = {},
  validationSchema,
  onSubmit,
  onReset,
  submitText = '提交',
  resetText = '重置',
  loading = false,
  disabled = false,
  showReset = true,
  layout = 'vertical', // vertical, horizontal, grid
  columns = 2, // for grid layout
  spacing = 2,
  ...props
}) {
  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit,
    enableReinitialize: true,
  });
  
  const handleReset = () => {
    formik.resetForm();
    onReset?.();
  };
  
  const renderField = (field) => (
    <DynamicFormField
      key={field.name}
      field={field}
      value={formik.values[field.name]}
      onChange={formik.handleChange}
      onBlur={formik.handleBlur}
      error={
        formik.touched[field.name] && formik.errors[field.name]
          ? formik.errors[field.name]
          : null
      }
    />
  );
  
  const renderFields = () => {
    if (layout === 'grid') {
      return (
        <Grid container spacing={spacing}>
          {fields.map((field) => (
            <Grid
              key={field.name}
              item
              xs={12}
              sm={field.gridSize?.sm || 12 / columns}
              md={field.gridSize?.md || 12 / columns}
              lg={field.gridSize?.lg || 12 / columns}
            >
              {renderField(field)}
            </Grid>
          ))}
        </Grid>
      );
    }
    
    return (
      <Stack spacing={spacing}>
        {fields.map(renderField)}
      </Stack>
    );
  };
  
  return (
    <Box component="form" onSubmit={formik.handleSubmit} {...props}>
      {renderFields()}
      
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        {showReset && (
          <Button
            type="button"
            variant="outlined"
            onClick={handleReset}
            disabled={loading || disabled}
          >
            {resetText}
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={loading || disabled || !formik.isValid}
        >
          {loading ? '提交中...' : submitText}
        </Button>
      </Box>
    </Box>
  );
}

// 表单验证Hook
export function useFormValidation(schema) {
  const [errors, setErrors] = React.useState({});
  
  const validate = React.useCallback(async (values) => {
    try {
      await schema.validate(values, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err) {
      const validationErrors = {};
      err.inner.forEach((error) => {
        validationErrors[error.path] = error.message;
      });
      setErrors(validationErrors);
      return false;
    }
  }, [schema]);
  
  return { errors, validate };
}

export default {
  TextInput,
  SelectInput,
  AutocompleteInput,
  CheckboxGroup,
  RadioGroup,
  SwitchInput,
  SliderInput,
  RatingInput,
  DateTimeInput,
  FileInput,
  DynamicFormField,
  FormBuilder,
  useFormValidation,
  FIELD_TYPES,
  VALIDATION_RULES,
};