#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco AI Security System - 自动执行引擎

该模块实现安全命令的自动执行、监控和回滚功能，
确保AI决策的安全可靠执行。

作者: Falco AI Security Team
版本: 1.0.0
创建时间: 2024-01-20
"""

import asyncio
import json
import logging
import os
import signal
import subprocess
import threading
import time
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import psutil
import queue

from .command_mapper import MappedCommand, CommandPriority, ExecutionMode


class ExecutionStatus(Enum):
    """执行状态"""
    PENDING = "pending"  # 等待执行
    RUNNING = "running"  # 正在执行
    COMPLETED = "completed"  # 执行完成
    FAILED = "failed"  # 执行失败
    TIMEOUT = "timeout"  # 执行超时
    CANCELLED = "cancelled"  # 已取消
    ROLLBACK = "rollback"  # 回滚中
    ROLLBACK_COMPLETED = "rollback_completed"  # 回滚完成
    ROLLBACK_FAILED = "rollback_failed"  # 回滚失败


class ApprovalStatus(Enum):
    """审批状态"""
    PENDING = "pending"  # 等待审批
    APPROVED = "approved"  # 已批准
    REJECTED = "rejected"  # 已拒绝
    AUTO_APPROVED = "auto_approved"  # 自动批准


@dataclass
class ExecutionResult:
    """执行结果"""
    command_id: str
    status: ExecutionStatus
    return_code: Optional[int] = None
    stdout: str = ""
    stderr: str = ""
    execution_time: float = 0.0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    error_message: Optional[str] = None
    rollback_result: Optional['ExecutionResult'] = None
    
    def __post_init__(self):
        if self.start_time is None:
            self.start_time = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        result = asdict(self)
        result['status'] = self.status.value
        if self.start_time:
            result['start_time'] = self.start_time.isoformat()
        if self.end_time:
            result['end_time'] = self.end_time.isoformat()
        if self.rollback_result:
            result['rollback_result'] = self.rollback_result.to_dict()
        return result


@dataclass
class ExecutionContext:
    """执行上下文"""
    command: MappedCommand
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    execution_result: Optional[ExecutionResult] = None
    approval_time: Optional[datetime] = None
    approval_user: Optional[str] = None
    approval_reason: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    dependencies_met: bool = True
    conditions_met: bool = True
    
    def __post_init__(self):
        if self.execution_result is None:
            self.execution_result = ExecutionResult(
                command_id=self.command.command_id,
                status=ExecutionStatus.PENDING
            )


class ExecutionEngine:
    """自动执行引擎"""
    
    def __init__(self, max_concurrent_executions: int = 5):
        """初始化执行引擎"""
        self.logger = logging.getLogger(__name__)
        self.max_concurrent_executions = max_concurrent_executions
        
        # 执行队列和上下文
        self.execution_queue = queue.PriorityQueue()
        self.execution_contexts: Dict[str, ExecutionContext] = {}
        self.running_executions: Dict[str, subprocess.Popen] = {}
        
        # 线程池
        self.executor = ThreadPoolExecutor(max_workers=max_concurrent_executions)
        
        # 控制标志
        self.is_running = False
        self.shutdown_event = threading.Event()
        
        # 监控线程
        self.monitor_thread = None
        self.cleanup_thread = None
        
        # 配置
        self.config = {
            'auto_approve_low_risk': True,
            'auto_approve_info': True,
            'require_approval_high_risk': True,
            'require_approval_critical': True,
            'max_execution_time': 300,  # 5分钟
            'cleanup_interval': 3600,  # 1小时
            'max_history_age_hours': 24,
            'enable_rollback': True,
            'rollback_timeout': 60,
            'dry_run_mode': False
        }
        
        # 回调函数
        self.approval_callback: Optional[Callable] = None
        self.notification_callback: Optional[Callable] = None
        self.audit_callback: Optional[Callable] = None
        
        # 统计信息
        self.stats = {
            'total_executed': 0,
            'successful_executions': 0,
            'failed_executions': 0,
            'rollbacks_performed': 0,
            'auto_approved': 0,
            'manual_approved': 0,
            'rejected': 0
        }
    
    def start(self):
        """启动执行引擎"""
        if self.is_running:
            self.logger.warning("执行引擎已在运行")
            return
        
        self.logger.info("启动执行引擎")
        self.is_running = True
        self.shutdown_event.clear()
        
        # 启动监控线程
        self.monitor_thread = threading.Thread(target=self._monitor_executions, daemon=True)
        self.monitor_thread.start()
        
        # 启动清理线程
        self.cleanup_thread = threading.Thread(target=self._cleanup_worker, daemon=True)
        self.cleanup_thread.start()
        
        self.logger.info("执行引擎启动完成")
    
    def stop(self):
        """停止执行引擎"""
        if not self.is_running:
            return
        
        self.logger.info("停止执行引擎")
        self.is_running = False
        self.shutdown_event.set()
        
        # 取消所有等待执行的命令
        self._cancel_pending_executions()
        
        # 等待正在执行的命令完成或超时
        self._wait_for_running_executions(timeout=30)
        
        # 关闭线程池
        self.executor.shutdown(wait=True)
        
        self.logger.info("执行引擎已停止")
    
    def submit_command(self, command: MappedCommand) -> str:
        """提交命令执行"""
        try:
            self.logger.info(f"提交命令执行: {command.command_id}")
            
            # 创建执行上下文
            context = ExecutionContext(command=command)
            
            # 检查依赖和条件
            context.dependencies_met = self._check_dependencies(command)
            context.conditions_met = self._check_conditions(command)
            
            # 自动审批检查
            if self._should_auto_approve(command):
                context.approval_status = ApprovalStatus.AUTO_APPROVED
                context.approval_time = datetime.utcnow()
                context.approval_user = "system"
                context.approval_reason = "自动批准"
                self.stats['auto_approved'] += 1
            
            # 保存执行上下文
            self.execution_contexts[command.command_id] = context
            
            # 添加到执行队列
            priority = self._get_execution_priority(command)
            self.execution_queue.put((priority, command.command_id))
            
            # 触发审批回调（如果需要人工审批）
            if context.approval_status == ApprovalStatus.PENDING and self.approval_callback:
                try:
                    self.approval_callback(command, context)
                except Exception as e:
                    self.logger.error(f"审批回调失败: {str(e)}")
            
            # 记录审计日志
            self._audit_log("COMMAND_SUBMITTED", command.command_id, {
                "command": command.command,
                "priority": command.priority.value,
                "execution_mode": command.execution_mode.value,
                "approval_status": context.approval_status.value
            })
            
            return command.command_id
            
        except Exception as e:
            self.logger.error(f"提交命令失败: {str(e)}")
            raise
    
    def approve_command(self, command_id: str, user: str, reason: str = "") -> bool:
        """批准命令执行"""
        try:
            if command_id not in self.execution_contexts:
                self.logger.warning(f"命令不存在: {command_id}")
                return False
            
            context = self.execution_contexts[command_id]
            
            if context.approval_status != ApprovalStatus.PENDING:
                self.logger.warning(f"命令已处理: {command_id}, 状态: {context.approval_status.value}")
                return False
            
            # 更新审批状态
            context.approval_status = ApprovalStatus.APPROVED
            context.approval_time = datetime.utcnow()
            context.approval_user = user
            context.approval_reason = reason
            
            self.stats['manual_approved'] += 1
            
            # 记录审计日志
            self._audit_log("COMMAND_APPROVED", command_id, {
                "user": user,
                "reason": reason
            })
            
            self.logger.info(f"命令已批准: {command_id}, 用户: {user}")
            return True
            
        except Exception as e:
            self.logger.error(f"批准命令失败: {str(e)}")
            return False
    
    def reject_command(self, command_id: str, user: str, reason: str = "") -> bool:
        """拒绝命令执行"""
        try:
            if command_id not in self.execution_contexts:
                self.logger.warning(f"命令不存在: {command_id}")
                return False
            
            context = self.execution_contexts[command_id]
            
            if context.approval_status != ApprovalStatus.PENDING:
                self.logger.warning(f"命令已处理: {command_id}, 状态: {context.approval_status.value}")
                return False
            
            # 更新审批状态
            context.approval_status = ApprovalStatus.REJECTED
            context.approval_time = datetime.utcnow()
            context.approval_user = user
            context.approval_reason = reason
            
            # 更新执行结果
            context.execution_result.status = ExecutionStatus.CANCELLED
            context.execution_result.error_message = f"用户拒绝: {reason}"
            
            self.stats['rejected'] += 1
            
            # 记录审计日志
            self._audit_log("COMMAND_REJECTED", command_id, {
                "user": user,
                "reason": reason
            })
            
            self.logger.info(f"命令已拒绝: {command_id}, 用户: {user}, 原因: {reason}")
            return True
            
        except Exception as e:
            self.logger.error(f"拒绝命令失败: {str(e)}")
            return False
    
    def cancel_command(self, command_id: str, reason: str = "") -> bool:
        """取消命令执行"""
        try:
            if command_id not in self.execution_contexts:
                self.logger.warning(f"命令不存在: {command_id}")
                return False
            
            context = self.execution_contexts[command_id]
            
            # 如果正在执行，尝试终止
            if command_id in self.running_executions:
                process = self.running_executions[command_id]
                try:
                    # 发送SIGTERM信号
                    process.terminate()
                    
                    # 等待进程结束
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        # 强制杀死进程
                        process.kill()
                        process.wait()
                    
                    del self.running_executions[command_id]
                    
                except Exception as e:
                    self.logger.error(f"终止进程失败: {str(e)}")
            
            # 更新执行结果
            context.execution_result.status = ExecutionStatus.CANCELLED
            context.execution_result.error_message = f"用户取消: {reason}"
            context.execution_result.end_time = datetime.utcnow()
            
            # 记录审计日志
            self._audit_log("COMMAND_CANCELLED", command_id, {
                "reason": reason
            })
            
            self.logger.info(f"命令已取消: {command_id}, 原因: {reason}")
            return True
            
        except Exception as e:
            self.logger.error(f"取消命令失败: {str(e)}")
            return False
    
    def get_execution_status(self, command_id: str) -> Optional[ExecutionResult]:
        """获取执行状态"""
        if command_id in self.execution_contexts:
            return self.execution_contexts[command_id].execution_result
        return None
    
    def get_pending_approvals(self) -> List[Dict[str, Any]]:
        """获取待审批命令"""
        pending = []
        
        for command_id, context in self.execution_contexts.items():
            if context.approval_status == ApprovalStatus.PENDING:
                pending.append({
                    "command_id": command_id,
                    "command": context.command.command,
                    "description": context.command.description,
                    "priority": context.command.priority.value,
                    "risk_level": context.command.risk_level,
                    "requires_sudo": context.command.requires_sudo,
                    "submitted_time": context.execution_result.start_time.isoformat() if context.execution_result.start_time else None
                })
        
        return pending
    
    def _monitor_executions(self):
        """监控执行队列"""
        self.logger.info("启动执行监控线程")
        
        while self.is_running and not self.shutdown_event.is_set():
            try:
                # 检查是否有可执行的命令
                if (len(self.running_executions) < self.max_concurrent_executions and 
                    not self.execution_queue.empty()):
                    
                    try:
                        # 获取下一个命令
                        priority, command_id = self.execution_queue.get_nowait()
                        
                        if command_id in self.execution_contexts:
                            context = self.execution_contexts[command_id]
                            
                            # 检查是否可以执行
                            if self._can_execute(context):
                                # 提交执行
                                future = self.executor.submit(self._execute_command, context)
                                # 不需要保存future，因为我们通过其他方式跟踪执行状态
                    
                    except queue.Empty:
                        pass
                
                # 检查超时的执行
                self._check_execution_timeouts()
                
                # 短暂休眠
                time.sleep(1)
                
            except Exception as e:
                self.logger.error(f"执行监控异常: {str(e)}")
                time.sleep(5)
        
        self.logger.info("执行监控线程已停止")
    
    def _can_execute(self, context: ExecutionContext) -> bool:
        """检查是否可以执行"""
        # 检查审批状态
        if context.approval_status not in [ApprovalStatus.APPROVED, ApprovalStatus.AUTO_APPROVED]:
            return False
        
        # 检查执行模式
        command = context.command
        
        if command.execution_mode == ExecutionMode.MANUAL:
            return False  # 手动执行模式不自动执行
        
        if command.execution_mode == ExecutionMode.CONDITIONAL:
            if not context.conditions_met:
                return False
        
        if command.execution_mode == ExecutionMode.SCHEDULED:
            # TODO: 实现计划执行逻辑
            pass
        
        # 检查依赖
        if not context.dependencies_met:
            return False
        
        return True
    
    def _execute_command(self, context: ExecutionContext):
        """执行命令"""
        command = context.command
        result = context.execution_result
        
        try:
            self.logger.info(f"开始执行命令: {command.command_id}")
            
            # 更新状态
            result.status = ExecutionStatus.RUNNING
            result.start_time = datetime.utcnow()
            
            # 记录审计日志
            self._audit_log("COMMAND_STARTED", command.command_id, {
                "command": command.command
            })
            
            # 发送通知
            self._send_notification("EXECUTION_STARTED", command, result)
            
            # 干运行模式
            if self.config['dry_run_mode']:
                self.logger.info(f"干运行模式，模拟执行: {command.command}")
                time.sleep(2)  # 模拟执行时间
                result.status = ExecutionStatus.COMPLETED
                result.return_code = 0
                result.stdout = "干运行模式 - 命令未实际执行"
                result.end_time = datetime.utcnow()
                result.execution_time = (result.end_time - result.start_time).total_seconds()
                
                self.stats['total_executed'] += 1
                self.stats['successful_executions'] += 1
                
                self._audit_log("COMMAND_COMPLETED", command.command_id, {
                    "status": "success",
                    "dry_run": True
                })
                
                self._send_notification("EXECUTION_COMPLETED", command, result)
                return
            
            # 准备执行环境
            env = os.environ.copy()
            cwd = None
            
            # 构建完整命令
            full_command = command.command
            if command.requires_sudo and os.getuid() != 0:
                full_command = f"sudo {full_command}"
            
            # 执行命令
            process = subprocess.Popen(
                full_command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env,
                cwd=cwd,
                preexec_fn=os.setsid if hasattr(os, 'setsid') else None
            )
            
            # 记录运行中的进程
            self.running_executions[command.command_id] = process
            
            try:
                # 等待执行完成或超时
                stdout, stderr = process.communicate(timeout=command.timeout_seconds)
                
                # 更新结果
                result.return_code = process.returncode
                result.stdout = stdout
                result.stderr = stderr
                result.end_time = datetime.utcnow()
                result.execution_time = (result.end_time - result.start_time).total_seconds()
                
                # 判断执行状态
                if process.returncode == 0:
                    result.status = ExecutionStatus.COMPLETED
                    self.stats['successful_executions'] += 1
                    
                    # 检查成功条件
                    if not self._check_success_criteria(command, result):
                        result.status = ExecutionStatus.FAILED
                        result.error_message = "未满足成功条件"
                        self.stats['failed_executions'] += 1
                else:
                    result.status = ExecutionStatus.FAILED
                    result.error_message = f"命令执行失败，返回码: {process.returncode}"
                    self.stats['failed_executions'] += 1
                
            except subprocess.TimeoutExpired:
                # 超时处理
                self.logger.warning(f"命令执行超时: {command.command_id}")
                
                # 终止进程
                try:
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                    time.sleep(5)
                    if process.poll() is None:
                        os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                except Exception as e:
                    self.logger.error(f"终止超时进程失败: {str(e)}")
                
                result.status = ExecutionStatus.TIMEOUT
                result.error_message = f"执行超时 ({command.timeout_seconds}秒)"
                result.end_time = datetime.utcnow()
                result.execution_time = command.timeout_seconds
                
                self.stats['failed_executions'] += 1
            
            finally:
                # 清理运行记录
                if command.command_id in self.running_executions:
                    del self.running_executions[command.command_id]
            
            self.stats['total_executed'] += 1
            
            # 检查是否需要回滚
            if (result.status == ExecutionStatus.FAILED and 
                command.rollback_command and 
                self.config['enable_rollback']):
                
                self.logger.info(f"执行失败，开始回滚: {command.command_id}")
                rollback_result = self._execute_rollback(command, result)
                result.rollback_result = rollback_result
            
            # 记录审计日志
            self._audit_log("COMMAND_COMPLETED", command.command_id, {
                "status": result.status.value,
                "return_code": result.return_code,
                "execution_time": result.execution_time,
                "error_message": result.error_message
            })
            
            # 发送通知
            self._send_notification("EXECUTION_COMPLETED", command, result)
            
            self.logger.info(f"命令执行完成: {command.command_id}, 状态: {result.status.value}")
            
        except Exception as e:
            self.logger.error(f"执行命令异常: {command.command_id}, 错误: {str(e)}")
            
            result.status = ExecutionStatus.FAILED
            result.error_message = f"执行异常: {str(e)}"
            result.end_time = datetime.utcnow()
            if result.start_time:
                result.execution_time = (result.end_time - result.start_time).total_seconds()
            
            self.stats['total_executed'] += 1
            self.stats['failed_executions'] += 1
            
            # 清理运行记录
            if command.command_id in self.running_executions:
                del self.running_executions[command.command_id]
            
            # 记录审计日志
            self._audit_log("COMMAND_FAILED", command.command_id, {
                "error": str(e)
            })
            
            # 发送通知
            self._send_notification("EXECUTION_FAILED", command, result)
    
    def _execute_rollback(self, command: MappedCommand, original_result: ExecutionResult) -> ExecutionResult:
        """执行回滚命令"""
        rollback_result = ExecutionResult(
            command_id=f"{command.command_id}_rollback",
            status=ExecutionStatus.ROLLBACK
        )
        
        try:
            self.logger.info(f"执行回滚命令: {command.rollback_command}")
            
            # 执行回滚命令
            process = subprocess.Popen(
                command.rollback_command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = process.communicate(timeout=self.config['rollback_timeout'])
            
            rollback_result.return_code = process.returncode
            rollback_result.stdout = stdout
            rollback_result.stderr = stderr
            rollback_result.end_time = datetime.utcnow()
            rollback_result.execution_time = (rollback_result.end_time - rollback_result.start_time).total_seconds()
            
            if process.returncode == 0:
                rollback_result.status = ExecutionStatus.ROLLBACK_COMPLETED
                self.stats['rollbacks_performed'] += 1
                self.logger.info(f"回滚成功: {command.command_id}")
            else:
                rollback_result.status = ExecutionStatus.ROLLBACK_FAILED
                rollback_result.error_message = f"回滚失败，返回码: {process.returncode}"
                self.logger.error(f"回滚失败: {command.command_id}")
            
        except subprocess.TimeoutExpired:
            rollback_result.status = ExecutionStatus.ROLLBACK_FAILED
            rollback_result.error_message = "回滚超时"
            self.logger.error(f"回滚超时: {command.command_id}")
            
        except Exception as e:
            rollback_result.status = ExecutionStatus.ROLLBACK_FAILED
            rollback_result.error_message = f"回滚异常: {str(e)}"
            self.logger.error(f"回滚异常: {command.command_id}, 错误: {str(e)}")
        
        # 记录审计日志
        self._audit_log("ROLLBACK_EXECUTED", command.command_id, {
            "rollback_status": rollback_result.status.value,
            "rollback_command": command.rollback_command
        })
        
        return rollback_result
    
    def _should_auto_approve(self, command: MappedCommand) -> bool:
        """检查是否应该自动批准"""
        # 检查风险等级
        if command.risk_level == 'low' and self.config['auto_approve_low_risk']:
            return True
        
        if command.priority == CommandPriority.INFO and self.config['auto_approve_info']:
            return True
        
        # 高风险命令需要人工审批
        if (command.priority in [CommandPriority.HIGH, CommandPriority.CRITICAL] and 
            self.config['require_approval_high_risk']):
            return False
        
        if command.risk_level in ['high', 'critical'] and self.config['require_approval_critical']:
            return False
        
        # 需要sudo的命令谨慎处理
        if command.requires_sudo and command.risk_level != 'low':
            return False
        
        return True
    
    def _get_execution_priority(self, command: MappedCommand) -> int:
        """获取执行优先级（数字越小优先级越高）"""
        priority_map = {
            CommandPriority.CRITICAL: 1,
            CommandPriority.HIGH: 2,
            CommandPriority.MEDIUM: 3,
            CommandPriority.LOW: 4,
            CommandPriority.INFO: 5
        }
        
        return priority_map.get(command.priority, 3)
    
    def _check_dependencies(self, command: MappedCommand) -> bool:
        """检查命令依赖"""
        if not command.dependencies:
            return True
        
        # TODO: 实现依赖检查逻辑
        # 检查其他命令的执行状态
        
        return True
    
    def _check_conditions(self, command: MappedCommand) -> bool:
        """检查执行条件"""
        if not command.conditions:
            return True
        
        # TODO: 实现条件检查逻辑
        # 检查系统状态、资源使用情况等
        
        return True
    
    def _check_success_criteria(self, command: MappedCommand, result: ExecutionResult) -> bool:
        """检查成功条件"""
        if not command.success_criteria:
            return True
        
        # 检查返回码
        if result.return_code != 0:
            return False
        
        # 检查输出内容
        for criteria in command.success_criteria:
            if criteria == "命令执行成功" and result.return_code == 0:
                continue
            elif criteria == "无错误输出" and result.stderr:
                return False
            # TODO: 添加更多成功条件检查
        
        return True
    
    def _check_execution_timeouts(self):
        """检查执行超时"""
        current_time = datetime.utcnow()
        
        for command_id, context in self.execution_contexts.items():
            result = context.execution_result
            
            if (result.status == ExecutionStatus.RUNNING and 
                result.start_time and 
                (current_time - result.start_time).total_seconds() > context.command.timeout_seconds):
                
                self.logger.warning(f"检测到超时执行: {command_id}")
                
                # 尝试取消命令
                self.cancel_command(command_id, "执行超时")
    
    def _cancel_pending_executions(self):
        """取消所有等待执行的命令"""
        # 清空队列
        while not self.execution_queue.empty():
            try:
                _, command_id = self.execution_queue.get_nowait()
                self.cancel_command(command_id, "系统关闭")
            except queue.Empty:
                break
    
    def _wait_for_running_executions(self, timeout: int = 30):
        """等待正在执行的命令完成"""
        start_time = time.time()
        
        while self.running_executions and (time.time() - start_time) < timeout:
            time.sleep(1)
        
        # 强制终止剩余的执行
        for command_id in list(self.running_executions.keys()):
            self.cancel_command(command_id, "强制关闭")
    
    def _cleanup_worker(self):
        """清理工作线程"""
        self.logger.info("启动清理工作线程")
        
        while self.is_running and not self.shutdown_event.is_set():
            try:
                # 清理过期的执行上下文
                self._cleanup_old_contexts()
                
                # 等待下次清理
                self.shutdown_event.wait(self.config['cleanup_interval'])
                
            except Exception as e:
                self.logger.error(f"清理工作异常: {str(e)}")
                time.sleep(60)
        
        self.logger.info("清理工作线程已停止")
    
    def _cleanup_old_contexts(self):
        """清理旧的执行上下文"""
        cutoff_time = datetime.utcnow() - timedelta(hours=self.config['max_history_age_hours'])
        
        to_remove = []
        for command_id, context in self.execution_contexts.items():
            result = context.execution_result
            
            # 只清理已完成的命令
            if (result.status in [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, 
                                ExecutionStatus.TIMEOUT, ExecutionStatus.CANCELLED] and
                result.end_time and result.end_time < cutoff_time):
                to_remove.append(command_id)
        
        for command_id in to_remove:
            del self.execution_contexts[command_id]
        
        if to_remove:
            self.logger.info(f"清理了 {len(to_remove)} 个过期的执行上下文")
    
    def _audit_log(self, action: str, command_id: str, details: Dict[str, Any]):
        """记录审计日志"""
        audit_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "action": action,
            "command_id": command_id,
            "details": details
        }
        
        # 调用审计回调
        if self.audit_callback:
            try:
                self.audit_callback(audit_entry)
            except Exception as e:
                self.logger.error(f"审计回调失败: {str(e)}")
        
        # 记录到日志
        self.logger.info(f"AUDIT: {action} - {command_id} - {json.dumps(details, ensure_ascii=False)}")
    
    def _send_notification(self, event_type: str, command: MappedCommand, result: ExecutionResult):
        """发送通知"""
        if self.notification_callback:
            try:
                notification = {
                    "event_type": event_type,
                    "command_id": command.command_id,
                    "command": command.command,
                    "priority": command.priority.value,
                    "status": result.status.value,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                self.notification_callback(notification)
            except Exception as e:
                self.logger.error(f"通知回调失败: {str(e)}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            "stats": self.stats.copy(),
            "current_state": {
                "is_running": self.is_running,
                "pending_executions": self.execution_queue.qsize(),
                "running_executions": len(self.running_executions),
                "total_contexts": len(self.execution_contexts),
                "pending_approvals": len(self.get_pending_approvals())
            },
            "config": self.config.copy()
        }
    
    def update_config(self, config_updates: Dict[str, Any]):
        """更新配置"""
        self.config.update(config_updates)
        self.logger.info(f"配置已更新: {config_updates}")
    
    def set_callbacks(self, 
                     approval_callback: Optional[Callable] = None,
                     notification_callback: Optional[Callable] = None,
                     audit_callback: Optional[Callable] = None):
        """设置回调函数"""
        if approval_callback:
            self.approval_callback = approval_callback
        if notification_callback:
            self.notification_callback = notification_callback
        if audit_callback:
            self.audit_callback = audit_callback


# 测试函数
if __name__ == "__main__":
    import sys
    import time
    from .command_mapper import CommandMapper, CommandType, CommandPriority, ExecutionMode
    
    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 创建执行引擎
    engine = ExecutionEngine()
    
    # 设置回调函数
    def approval_callback(command, context):
        print(f"需要审批: {command.command_id} - {command.command}")
    
    def notification_callback(notification):
        print(f"通知: {notification['event_type']} - {notification['command_id']}")
    
    def audit_callback(audit_entry):
        print(f"审计: {audit_entry['action']} - {audit_entry['command_id']}")
    
    engine.set_callbacks(
        approval_callback=approval_callback,
        notification_callback=notification_callback,
        audit_callback=audit_callback
    )
    
    # 启用干运行模式
    engine.update_config({"dry_run_mode": True})
    
    # 启动引擎
    engine.start()
    
    try:
        # 创建测试命令
        from .command_mapper import MappedCommand
        
        test_command = MappedCommand(
            command_id="test_001",
            command_type=CommandType.SYSTEM,
            priority=CommandPriority.LOW,
            execution_mode=ExecutionMode.IMMEDIATE,
            command="echo 'Hello, World!'",
            description="测试命令",
            risk_level="low",
            requires_sudo=False,
            timeout_seconds=10
        )
        
        # 提交命令
        command_id = engine.submit_command(test_command)
        print(f"提交命令: {command_id}")
        
        # 等待执行完成
        time.sleep(5)
        
        # 获取执行结果
        result = engine.get_execution_status(command_id)
        if result:
            print(f"执行结果: {result.status.value}")
            print(f"输出: {result.stdout}")
        
        # 获取统计信息
        stats = engine.get_statistics()
        print(f"统计信息: {json.dumps(stats, ensure_ascii=False, indent=2)}")
        
    finally:
        # 停止引擎
        engine.stop()