#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 命令映射器

该模块实现从AI分析结果到具体执行命令的映射功能，
将安全分析建议转换为可执行的系统命令和操作。

作者: Falco AI Security Team
版本: 1.0.0
创建时间: 2024-01-20
"""

import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
import re
import shlex


class CommandType(Enum):
    """命令类型"""
    SYSTEM = "system"  # 系统命令
    NETWORK = "network"  # 网络命令
    PROCESS = "process"  # 进程管理
    FILE = "file"  # 文件操作
    SERVICE = "service"  # 服务管理
    FIREWALL = "firewall"  # 防火墙规则
    LOG = "log"  # 日志操作
    MONITORING = "monitoring"  # 监控配置
    BACKUP = "backup"  # 备份操作
    NOTIFICATION = "notification"  # 通知操作
    CUSTOM = "custom"  # 自定义命令


class CommandPriority(Enum):
    """命令优先级"""
    CRITICAL = "critical"  # 紧急
    HIGH = "high"  # 高
    MEDIUM = "medium"  # 中等
    LOW = "low"  # 低
    INFO = "info"  # 信息


class ExecutionMode(Enum):
    """执行模式"""
    IMMEDIATE = "immediate"  # 立即执行
    SCHEDULED = "scheduled"  # 计划执行
    MANUAL = "manual"  # 手动执行
    CONDITIONAL = "conditional"  # 条件执行


@dataclass
class CommandTemplate:
    """命令模板"""
    name: str
    command_type: CommandType
    template: str
    description: str
    required_params: List[str]
    optional_params: List[str] = None
    risk_level: str = "medium"
    requires_sudo: bool = False
    timeout_seconds: int = 30
    rollback_command: Optional[str] = None
    
    def format_command(self, **kwargs) -> str:
        """格式化命令"""
        # 检查必需参数
        missing_params = [param for param in self.required_params if param not in kwargs]
        if missing_params:
            raise ValueError(f"缺少必需参数: {missing_params}")
        
        # 安全检查参数
        safe_kwargs = self._sanitize_params(kwargs)
        
        return self.template.format(**safe_kwargs)
    
    def _sanitize_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """参数安全检查"""
        safe_params = {}
        
        for key, value in params.items():
            if isinstance(value, str):
                # 移除危险字符
                safe_value = re.sub(r'[;&|`$(){}\[\]<>]', '', str(value))
                # 转义shell特殊字符
                safe_params[key] = shlex.quote(safe_value)
            else:
                safe_params[key] = value
        
        return safe_params


@dataclass
class MappedCommand:
    """映射的命令"""
    command_id: str
    command_type: CommandType
    priority: CommandPriority
    execution_mode: ExecutionMode
    command: str
    description: str
    risk_level: str
    requires_sudo: bool
    timeout_seconds: int
    rollback_command: Optional[str] = None
    conditions: List[str] = None
    dependencies: List[str] = None
    expected_output: Optional[str] = None
    success_criteria: List[str] = None
    failure_criteria: List[str] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
        if self.conditions is None:
            self.conditions = []
        if self.dependencies is None:
            self.dependencies = []
        if self.success_criteria is None:
            self.success_criteria = []
        if self.failure_criteria is None:
            self.failure_criteria = []
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        result = asdict(self)
        result['command_type'] = self.command_type.value
        result['priority'] = self.priority.value
        result['execution_mode'] = self.execution_mode.value
        result['timestamp'] = self.timestamp.isoformat()
        return result


class CommandMapper:
    """命令映射器"""
    
    def __init__(self):
        """初始化命令映射器"""
        self.logger = logging.getLogger(__name__)
        self.command_templates = self._initialize_command_templates()
        self.mapping_rules = self._initialize_mapping_rules()
        self.command_history: List[MappedCommand] = []
        
        # 安全配置
        self.max_commands_per_analysis = 10
        self.dangerous_commands = {
            'rm -rf', 'dd if=', 'mkfs', 'fdisk', 'parted',
            'shutdown', 'reboot', 'halt', 'poweroff',
            'passwd', 'userdel', 'groupdel'
        }
    
    def _initialize_command_templates(self) -> Dict[str, CommandTemplate]:
        """初始化命令模板"""
        templates = {}
        
        # ==================== 进程管理命令 ====================
        
        templates['kill_process'] = CommandTemplate(
            name="kill_process",
            command_type=CommandType.PROCESS,
            template="kill -9 {pid}",
            description="强制终止进程",
            required_params=["pid"],
            risk_level="medium",
            requires_sudo=True,
            timeout_seconds=10
        )
        
        templates['kill_process_by_name'] = CommandTemplate(
            name="kill_process_by_name",
            command_type=CommandType.PROCESS,
            template="pkill -f {process_name}",
            description="根据进程名终止进程",
            required_params=["process_name"],
            risk_level="medium",
            requires_sudo=True,
            timeout_seconds=15
        )
        
        templates['suspend_process'] = CommandTemplate(
            name="suspend_process",
            command_type=CommandType.PROCESS,
            template="kill -STOP {pid}",
            description="暂停进程",
            required_params=["pid"],
            risk_level="low",
            requires_sudo=True,
            timeout_seconds=5,
            rollback_command="kill -CONT {pid}"
        )
        
        # ==================== 网络管理命令 ====================
        
        templates['block_ip'] = CommandTemplate(
            name="block_ip",
            command_type=CommandType.FIREWALL,
            template="iptables -A INPUT -s {ip_address} -j DROP",
            description="阻止IP地址访问",
            required_params=["ip_address"],
            risk_level="medium",
            requires_sudo=True,
            timeout_seconds=10,
            rollback_command="iptables -D INPUT -s {ip_address} -j DROP"
        )
        
        templates['block_port'] = CommandTemplate(
            name="block_port",
            command_type=CommandType.FIREWALL,
            template="iptables -A INPUT -p {protocol} --dport {port} -j DROP",
            description="阻止端口访问",
            required_params=["port", "protocol"],
            optional_params=["source_ip"],
            risk_level="medium",
            requires_sudo=True,
            timeout_seconds=10,
            rollback_command="iptables -D INPUT -p {protocol} --dport {port} -j DROP"
        )
        
        templates['disconnect_connection'] = CommandTemplate(
            name="disconnect_connection",
            command_type=CommandType.NETWORK,
            template="ss -K dst {destination}",
            description="断开网络连接",
            required_params=["destination"],
            risk_level="medium",
            requires_sudo=True,
            timeout_seconds=10
        )
        
        # ==================== 文件操作命令 ====================
        
        templates['quarantine_file'] = CommandTemplate(
            name="quarantine_file",
            command_type=CommandType.FILE,
            template="mv {file_path} /var/quarantine/{filename}.quarantine",
            description="隔离可疑文件",
            required_params=["file_path", "filename"],
            risk_level="medium",
            requires_sudo=True,
            timeout_seconds=15,
            rollback_command="mv /var/quarantine/{filename}.quarantine {file_path}"
        )
        
        templates['change_file_permissions'] = CommandTemplate(
            name="change_file_permissions",
            command_type=CommandType.FILE,
            template="chmod {permissions} {file_path}",
            description="修改文件权限",
            required_params=["file_path", "permissions"],
            risk_level="low",
            requires_sudo=True,
            timeout_seconds=10
        )
        
        templates['backup_file'] = CommandTemplate(
            name="backup_file",
            command_type=CommandType.BACKUP,
            template="cp {file_path} {backup_path}/{filename}.backup.$(date +%Y%m%d_%H%M%S)",
            description="备份文件",
            required_params=["file_path", "backup_path", "filename"],
            risk_level="low",
            requires_sudo=False,
            timeout_seconds=30
        )
        
        # ==================== 服务管理命令 ====================
        
        templates['stop_service'] = CommandTemplate(
            name="stop_service",
            command_type=CommandType.SERVICE,
            template="systemctl stop {service_name}",
            description="停止系统服务",
            required_params=["service_name"],
            risk_level="high",
            requires_sudo=True,
            timeout_seconds=30,
            rollback_command="systemctl start {service_name}"
        )
        
        templates['restart_service'] = CommandTemplate(
            name="restart_service",
            command_type=CommandType.SERVICE,
            template="systemctl restart {service_name}",
            description="重启系统服务",
            required_params=["service_name"],
            risk_level="medium",
            requires_sudo=True,
            timeout_seconds=60
        )
        
        templates['disable_service'] = CommandTemplate(
            name="disable_service",
            command_type=CommandType.SERVICE,
            template="systemctl disable {service_name}",
            description="禁用系统服务",
            required_params=["service_name"],
            risk_level="high",
            requires_sudo=True,
            timeout_seconds=20,
            rollback_command="systemctl enable {service_name}"
        )
        
        # ==================== 监控命令 ====================
        
        templates['monitor_process'] = CommandTemplate(
            name="monitor_process",
            command_type=CommandType.MONITORING,
            template="watch -n {interval} 'ps aux | grep {process_name}'",
            description="监控进程状态",
            required_params=["process_name"],
            optional_params=["interval"],
            risk_level="low",
            requires_sudo=False,
            timeout_seconds=300
        )
        
        templates['monitor_network'] = CommandTemplate(
            name="monitor_network",
            command_type=CommandType.MONITORING,
            template="netstat -tuln | grep {port}",
            description="监控网络端口",
            required_params=["port"],
            risk_level="low",
            requires_sudo=False,
            timeout_seconds=10
        )
        
        # ==================== 日志操作命令 ====================
        
        templates['collect_logs'] = CommandTemplate(
            name="collect_logs",
            command_type=CommandType.LOG,
            template="journalctl -u {service_name} --since '{since_time}' > {output_file}",
            description="收集服务日志",
            required_params=["service_name", "since_time", "output_file"],
            risk_level="low",
            requires_sudo=True,
            timeout_seconds=60
        )
        
        templates['rotate_logs'] = CommandTemplate(
            name="rotate_logs",
            command_type=CommandType.LOG,
            template="logrotate -f {config_file}",
            description="强制日志轮转",
            required_params=["config_file"],
            risk_level="low",
            requires_sudo=True,
            timeout_seconds=30
        )
        
        # ==================== 通知命令 ====================
        
        templates['send_alert'] = CommandTemplate(
            name="send_alert",
            command_type=CommandType.NOTIFICATION,
            template="echo '{message}' | mail -s '{subject}' {email}",
            description="发送邮件告警",
            required_params=["message", "subject", "email"],
            risk_level="low",
            requires_sudo=False,
            timeout_seconds=30
        )
        
        templates['log_incident'] = CommandTemplate(
            name="log_incident",
            command_type=CommandType.LOG,
            template="echo '[{timestamp}] SECURITY_INCIDENT: {incident_details}' >> /var/log/security/incidents.log",
            description="记录安全事件",
            required_params=["timestamp", "incident_details"],
            risk_level="low",
            requires_sudo=True,
            timeout_seconds=10
        )
        
        return templates
    
    def _initialize_mapping_rules(self) -> Dict[str, List[Dict[str, Any]]]:
        """初始化映射规则"""
        return {
            # 高风险事件映射
            "high_risk": [
                {
                    "keywords": ["malware", "trojan", "backdoor", "rootkit"],
                    "commands": ["kill_process", "quarantine_file", "block_ip"],
                    "priority": CommandPriority.CRITICAL,
                    "execution_mode": ExecutionMode.IMMEDIATE
                },
                {
                    "keywords": ["unauthorized access", "privilege escalation"],
                    "commands": ["kill_process", "disable_service", "send_alert"],
                    "priority": CommandPriority.HIGH,
                    "execution_mode": ExecutionMode.IMMEDIATE
                }
            ],
            
            # 网络威胁映射
            "network_threat": [
                {
                    "keywords": ["suspicious connection", "port scan", "ddos"],
                    "commands": ["block_ip", "block_port", "disconnect_connection"],
                    "priority": CommandPriority.HIGH,
                    "execution_mode": ExecutionMode.IMMEDIATE
                },
                {
                    "keywords": ["data exfiltration", "c2 communication"],
                    "commands": ["block_ip", "kill_process", "collect_logs"],
                    "priority": CommandPriority.CRITICAL,
                    "execution_mode": ExecutionMode.IMMEDIATE
                }
            ],
            
            # 进程异常映射
            "process_anomaly": [
                {
                    "keywords": ["suspicious process", "unknown binary"],
                    "commands": ["suspend_process", "quarantine_file", "monitor_process"],
                    "priority": CommandPriority.MEDIUM,
                    "execution_mode": ExecutionMode.CONDITIONAL
                },
                {
                    "keywords": ["cpu spike", "memory leak"],
                    "commands": ["monitor_process", "restart_service"],
                    "priority": CommandPriority.MEDIUM,
                    "execution_mode": ExecutionMode.SCHEDULED
                }
            ],
            
            # 文件系统威胁映射
            "file_threat": [
                {
                    "keywords": ["file modification", "unauthorized write"],
                    "commands": ["backup_file", "change_file_permissions", "quarantine_file"],
                    "priority": CommandPriority.MEDIUM,
                    "execution_mode": ExecutionMode.IMMEDIATE
                },
                {
                    "keywords": ["ransomware", "file encryption"],
                    "commands": ["kill_process", "quarantine_file", "stop_service"],
                    "priority": CommandPriority.CRITICAL,
                    "execution_mode": ExecutionMode.IMMEDIATE
                }
            ],
            
            # 服务异常映射
            "service_anomaly": [
                {
                    "keywords": ["service failure", "service crash"],
                    "commands": ["restart_service", "collect_logs", "monitor_process"],
                    "priority": CommandPriority.MEDIUM,
                    "execution_mode": ExecutionMode.IMMEDIATE
                },
                {
                    "keywords": ["service compromise", "service hijack"],
                    "commands": ["stop_service", "disable_service", "send_alert"],
                    "priority": CommandPriority.HIGH,
                    "execution_mode": ExecutionMode.IMMEDIATE
                }
            ]
        }
    
    def map_analysis_to_commands(self, 
                               analysis_result: Dict[str, Any],
                               context: Optional[Dict[str, Any]] = None) -> List[MappedCommand]:
        """将分析结果映射为命令"""
        try:
            self.logger.info("开始映射分析结果到命令")
            
            mapped_commands = []
            
            # 提取关键信息
            risk_level = analysis_result.get('risk_level', 'medium').lower()
            analysis_summary = analysis_result.get('analysis_summary', '')
            remediation_steps = analysis_result.get('remediation_steps', [])
            ioc_indicators = analysis_result.get('ioc_indicators', [])
            
            # 基于风险等级确定优先级
            priority = self._determine_priority(risk_level)
            execution_mode = self._determine_execution_mode(risk_level, context)
            
            # 基于关键词匹配映射规则
            matched_rules = self._match_mapping_rules(analysis_summary, remediation_steps)
            
            # 生成基础命令
            for rule in matched_rules:
                for command_name in rule['commands']:
                    if command_name in self.command_templates:
                        try:
                            command = self._create_mapped_command(
                                command_name,
                                analysis_result,
                                context,
                                rule.get('priority', priority),
                                rule.get('execution_mode', execution_mode)
                            )
                            if command:
                                mapped_commands.append(command)
                        except Exception as e:
                            self.logger.warning(f"创建命令失败: {command_name}, 错误: {str(e)}")
            
            # 生成自定义命令
            custom_commands = self._generate_custom_commands(
                analysis_result, context, priority, execution_mode
            )
            mapped_commands.extend(custom_commands)
            
            # 添加通用响应命令
            generic_commands = self._add_generic_commands(
                analysis_result, priority, execution_mode
            )
            mapped_commands.extend(generic_commands)
            
            # 限制命令数量
            if len(mapped_commands) > self.max_commands_per_analysis:
                mapped_commands = mapped_commands[:self.max_commands_per_analysis]
            
            # 排序命令（按优先级和依赖关系）
            mapped_commands = self._sort_commands(mapped_commands)
            
            # 保存到历史记录
            self.command_history.extend(mapped_commands)
            
            self.logger.info(f"成功映射 {len(mapped_commands)} 个命令")
            return mapped_commands
            
        except Exception as e:
            self.logger.error(f"命令映射失败: {str(e)}")
            return []
    
    def _determine_priority(self, risk_level: str) -> CommandPriority:
        """确定命令优先级"""
        risk_mapping = {
            'critical': CommandPriority.CRITICAL,
            'severe': CommandPriority.CRITICAL,
            'high': CommandPriority.HIGH,
            'medium': CommandPriority.MEDIUM,
            'low': CommandPriority.LOW,
            'info': CommandPriority.INFO
        }
        
        return risk_mapping.get(risk_level, CommandPriority.MEDIUM)
    
    def _determine_execution_mode(self, 
                                risk_level: str, 
                                context: Optional[Dict[str, Any]]) -> ExecutionMode:
        """确定执行模式"""
        if risk_level in ['critical', 'severe', 'high']:
            return ExecutionMode.IMMEDIATE
        elif context and context.get('auto_execute', False):
            return ExecutionMode.IMMEDIATE
        elif risk_level == 'medium':
            return ExecutionMode.CONDITIONAL
        else:
            return ExecutionMode.MANUAL
    
    def _match_mapping_rules(self, 
                           analysis_summary: str, 
                           remediation_steps: List[str]) -> List[Dict[str, Any]]:
        """匹配映射规则"""
        matched_rules = []
        
        # 合并分析文本
        full_text = (analysis_summary + ' ' + ' '.join(remediation_steps)).lower()
        
        # 遍历所有映射规则
        for category, rules in self.mapping_rules.items():
            for rule in rules:
                # 检查关键词匹配
                keywords = rule.get('keywords', [])
                if any(keyword.lower() in full_text for keyword in keywords):
                    matched_rules.append(rule)
        
        return matched_rules
    
    def _create_mapped_command(self, 
                             command_name: str,
                             analysis_result: Dict[str, Any],
                             context: Optional[Dict[str, Any]],
                             priority: CommandPriority,
                             execution_mode: ExecutionMode) -> Optional[MappedCommand]:
        """创建映射命令"""
        template = self.command_templates[command_name]
        
        try:
            # 提取参数
            params = self._extract_command_params(command_name, analysis_result, context)
            
            if not params:
                return None
            
            # 格式化命令
            formatted_command = template.format_command(**params)
            
            # 安全检查
            if not self._is_command_safe(formatted_command):
                self.logger.warning(f"命令安全检查失败: {formatted_command}")
                return None
            
            # 创建映射命令
            command_id = f"{command_name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}"
            
            mapped_command = MappedCommand(
                command_id=command_id,
                command_type=template.command_type,
                priority=priority,
                execution_mode=execution_mode,
                command=formatted_command,
                description=template.description,
                risk_level=template.risk_level,
                requires_sudo=template.requires_sudo,
                timeout_seconds=template.timeout_seconds,
                rollback_command=template.rollback_command.format(**params) if template.rollback_command else None,
                success_criteria=["命令执行成功", "无错误输出"],
                failure_criteria=["命令执行失败", "权限不足", "超时"]
            )
            
            return mapped_command
            
        except Exception as e:
            self.logger.error(f"创建映射命令失败: {command_name}, 错误: {str(e)}")
            return None
    
    def _extract_command_params(self, 
                              command_name: str,
                              analysis_result: Dict[str, Any],
                              context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """提取命令参数"""
        params = {}
        
        # 从上下文提取参数
        if context:
            params.update(context.get('command_params', {}))
        
        # 根据命令类型提取特定参数
        if command_name in ['kill_process', 'suspend_process']:
            # 进程相关参数
            if 'proc' in analysis_result:
                proc_info = analysis_result['proc']
                if 'pid' in proc_info:
                    params['pid'] = str(proc_info['pid'])
                if 'name' in proc_info:
                    params['process_name'] = proc_info['name']
        
        elif command_name in ['block_ip', 'disconnect_connection']:
            # 网络相关参数
            if 'connection' in analysis_result:
                conn_info = analysis_result['connection']
                if 'dest' in conn_info:
                    dest = conn_info['dest']
                    if ':' in dest:
                        ip, port = dest.split(':', 1)
                        params['ip_address'] = ip
                        params['destination'] = dest
                    else:
                        params['ip_address'] = dest
                        params['destination'] = dest
        
        elif command_name == 'block_port':
            # 端口阻止参数
            if 'connection' in analysis_result:
                conn_info = analysis_result['connection']
                if 'dest' in conn_info and ':' in conn_info['dest']:
                    _, port = conn_info['dest'].split(':', 1)
                    params['port'] = port
                if 'proto' in conn_info:
                    params['protocol'] = conn_info['proto']
                else:
                    params['protocol'] = 'tcp'  # 默认协议
        
        elif command_name in ['quarantine_file', 'backup_file', 'change_file_permissions']:
            # 文件相关参数
            if 'file' in analysis_result:
                file_info = analysis_result['file']
                if 'path' in file_info:
                    file_path = file_info['path']
                    params['file_path'] = file_path
                    params['filename'] = file_path.split('/')[-1]
                    params['backup_path'] = '/var/backup/security'
            
            if command_name == 'change_file_permissions':
                params['permissions'] = '000'  # 移除所有权限
        
        elif command_name in ['stop_service', 'restart_service', 'disable_service']:
            # 服务相关参数
            if 'service' in analysis_result:
                params['service_name'] = analysis_result['service']
            elif 'proc' in analysis_result and 'name' in analysis_result['proc']:
                # 尝试从进程名推断服务名
                proc_name = analysis_result['proc']['name']
                params['service_name'] = proc_name
        
        elif command_name == 'collect_logs':
            # 日志收集参数
            params['service_name'] = 'falco'
            params['since_time'] = '1 hour ago'
            params['output_file'] = f'/tmp/security_logs_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.log'
        
        elif command_name == 'send_alert':
            # 告警参数
            params['message'] = analysis_result.get('analysis_summary', '安全事件检测')
            params['subject'] = f"安全告警: {analysis_result.get('risk_level', 'Unknown')}"
            params['email'] = 'security@company.com'
        
        elif command_name == 'log_incident':
            # 事件记录参数
            params['timestamp'] = datetime.utcnow().isoformat()
            params['incident_details'] = json.dumps(analysis_result, ensure_ascii=False)
        
        # 添加默认参数
        if command_name == 'monitor_process' and 'interval' not in params:
            params['interval'] = '5'
        
        return params
    
    def _generate_custom_commands(self, 
                                analysis_result: Dict[str, Any],
                                context: Optional[Dict[str, Any]],
                                priority: CommandPriority,
                                execution_mode: ExecutionMode) -> List[MappedCommand]:
        """生成自定义命令"""
        custom_commands = []
        
        # 基于修复建议生成自定义命令
        remediation_steps = analysis_result.get('remediation_steps', [])
        
        for i, step in enumerate(remediation_steps):
            if isinstance(step, str) and len(step) > 10:
                # 尝试从修复建议中提取可执行命令
                command = self._extract_command_from_text(step)
                
                if command and self._is_command_safe(command):
                    command_id = f"custom_{i}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}"
                    
                    custom_command = MappedCommand(
                        command_id=command_id,
                        command_type=CommandType.CUSTOM,
                        priority=priority,
                        execution_mode=ExecutionMode.MANUAL,  # 自定义命令默认手动执行
                        command=command,
                        description=f"自定义修复命令: {step[:50]}...",
                        risk_level="medium",
                        requires_sudo=True,
                        timeout_seconds=60,
                        success_criteria=["命令执行完成"],
                        failure_criteria=["命令执行失败"]
                    )
                    
                    custom_commands.append(custom_command)
        
        return custom_commands
    
    def _add_generic_commands(self, 
                            analysis_result: Dict[str, Any],
                            priority: CommandPriority,
                            execution_mode: ExecutionMode) -> List[MappedCommand]:
        """添加通用响应命令"""
        generic_commands = []
        
        # 总是添加事件记录命令
        log_command = self._create_mapped_command(
            'log_incident',
            analysis_result,
            None,
            CommandPriority.LOW,
            ExecutionMode.IMMEDIATE
        )
        
        if log_command:
            generic_commands.append(log_command)
        
        # 高风险事件添加告警命令
        risk_level = analysis_result.get('risk_level', '').lower()
        if risk_level in ['high', 'critical', 'severe']:
            alert_command = self._create_mapped_command(
                'send_alert',
                analysis_result,
                None,
                CommandPriority.HIGH,
                ExecutionMode.IMMEDIATE
            )
            
            if alert_command:
                generic_commands.append(alert_command)
        
        return generic_commands
    
    def _extract_command_from_text(self, text: str) -> Optional[str]:
        """从文本中提取命令"""
        # 简单的命令提取逻辑
        # 查找常见的命令模式
        command_patterns = [
            r'运行\s+`([^`]+)`',
            r'执行\s+`([^`]+)`',
            r'使用命令\s+`([^`]+)`',
            r'命令：\s*([^\n]+)',
            r'执行：\s*([^\n]+)'
        ]
        
        for pattern in command_patterns:
            match = re.search(pattern, text)
            if match:
                command = match.group(1).strip()
                # 基本安全检查
                if not any(dangerous in command for dangerous in self.dangerous_commands):
                    return command
        
        return None
    
    def _is_command_safe(self, command: str) -> bool:
        """检查命令安全性"""
        # 检查危险命令
        for dangerous in self.dangerous_commands:
            if dangerous in command.lower():
                return False
        
        # 检查危险字符
        dangerous_chars = ['&&', '||', ';', '|', '>', '>>', '<', '`', '$(']
        for char in dangerous_chars:
            if char in command:
                return False
        
        # 检查命令长度
        if len(command) > 500:
            return False
        
        return True
    
    def _sort_commands(self, commands: List[MappedCommand]) -> List[MappedCommand]:
        """排序命令"""
        # 定义优先级权重
        priority_weights = {
            CommandPriority.CRITICAL: 5,
            CommandPriority.HIGH: 4,
            CommandPriority.MEDIUM: 3,
            CommandPriority.LOW: 2,
            CommandPriority.INFO: 1
        }
        
        # 定义执行模式权重
        execution_weights = {
            ExecutionMode.IMMEDIATE: 4,
            ExecutionMode.CONDITIONAL: 3,
            ExecutionMode.SCHEDULED: 2,
            ExecutionMode.MANUAL: 1
        }
        
        # 排序函数
        def sort_key(cmd: MappedCommand) -> Tuple[int, int, str]:
            priority_weight = priority_weights.get(cmd.priority, 0)
            execution_weight = execution_weights.get(cmd.execution_mode, 0)
            return (-priority_weight, -execution_weight, cmd.command_id)
        
        return sorted(commands, key=sort_key)
    
    def validate_command(self, command: MappedCommand) -> Dict[str, Any]:
        """验证命令"""
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "recommendations": []
        }
        
        # 检查命令安全性
        if not self._is_command_safe(command.command):
            validation_result["valid"] = False
            validation_result["errors"].append("命令包含危险操作")
        
        # 检查必需参数
        if command.command_type in self.command_templates:
            template = self.command_templates[command.command_type.value]
            for param in template.required_params:
                if f"{{{param}}}" in command.command:
                    validation_result["valid"] = False
                    validation_result["errors"].append(f"缺少必需参数: {param}")
        
        # 检查权限要求
        if command.requires_sudo:
            validation_result["warnings"].append("命令需要管理员权限")
        
        # 检查风险等级
        if command.risk_level in ['high', 'critical']:
            validation_result["warnings"].append(f"命令风险等级: {command.risk_level}")
            validation_result["recommendations"].append("建议在执行前进行人工审核")
        
        # 检查回滚命令
        if not command.rollback_command and command.risk_level in ['medium', 'high', 'critical']:
            validation_result["warnings"].append("缺少回滚命令")
            validation_result["recommendations"].append("建议添加回滚机制")
        
        return validation_result
    
    def get_command_history(self, limit: int = 100) -> List[MappedCommand]:
        """获取命令历史"""
        return self.command_history[-limit:]
    
    def get_command_statistics(self) -> Dict[str, Any]:
        """获取命令统计信息"""
        if not self.command_history:
            return {
                "total_commands": 0,
                "command_types": {},
                "priority_distribution": {},
                "execution_modes": {},
                "risk_levels": {}
            }
        
        # 统计命令类型
        command_types = {}
        for cmd in self.command_history:
            cmd_type = cmd.command_type.value
            command_types[cmd_type] = command_types.get(cmd_type, 0) + 1
        
        # 统计优先级分布
        priority_distribution = {}
        for cmd in self.command_history:
            priority = cmd.priority.value
            priority_distribution[priority] = priority_distribution.get(priority, 0) + 1
        
        # 统计执行模式
        execution_modes = {}
        for cmd in self.command_history:
            mode = cmd.execution_mode.value
            execution_modes[mode] = execution_modes.get(mode, 0) + 1
        
        # 统计风险等级
        risk_levels = {}
        for cmd in self.command_history:
            risk = cmd.risk_level
            risk_levels[risk] = risk_levels.get(risk, 0) + 1
        
        return {
            "total_commands": len(self.command_history),
            "command_types": command_types,
            "priority_distribution": priority_distribution,
            "execution_modes": execution_modes,
            "risk_levels": risk_levels
        }
    
    def clear_history(self, older_than_hours: int = 24):
        """清理历史记录"""
        cutoff_time = datetime.utcnow() - timedelta(hours=older_than_hours)
        
        self.command_history = [
            cmd for cmd in self.command_history
            if cmd.timestamp > cutoff_time
        ]
        
        self.logger.info(f"清理了 {older_than_hours} 小时前的命令历史")


# 测试函数
if __name__ == "__main__":
    # 测试命令映射器
    mapper = CommandMapper()
    
    # 测试分析结果
    test_analysis = {
        "analysis_summary": "检测到可疑进程执行异常网络连接",
        "risk_level": "high",
        "remediation_steps": [
            "终止可疑进程",
            "阻止恶意IP地址",
            "隔离受影响文件"
        ],
        "proc": {
            "name": "suspicious_binary",
            "pid": 1234
        },
        "connection": {
            "dest": "192.168.1.100:4444",
            "proto": "tcp"
        },
        "file": {
            "path": "/tmp/malware.bin"
        }
    }
    
    # 映射命令
    commands = mapper.map_analysis_to_commands(test_analysis)
    
    print(f"映射生成了 {len(commands)} 个命令:")
    for cmd in commands:
        print(f"- {cmd.command_type.value}: {cmd.command}")
        print(f"  优先级: {cmd.priority.value}, 执行模式: {cmd.execution_mode.value}")
        print(f"  风险等级: {cmd.risk_level}, 需要sudo: {cmd.requires_sudo}")
        print()
    
    # 获取统计信息
    stats = mapper.get_command_statistics()
    print("命令统计信息:")
    print(json.dumps(stats, ensure_ascii=False, indent=2))