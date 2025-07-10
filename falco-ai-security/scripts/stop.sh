#!/bin/bash
# Falco AI Security System - 停止脚本
# 优雅地停止所有系统组件和服务

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取脚本目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 切换到项目目录
cd "$PROJECT_DIR"

# 检查服务状态
check_services_status() {
    log_info "检查当前服务状态..."
    
    running_containers=$(docker ps -q --filter "name=falco-")
    if [[ -z "$running_containers" ]]; then
        log_warning "没有发现正在运行的Falco服务"
        return 1
    else
        log_info "发现 $(echo $running_containers | wc -w) 个正在运行的Falco容器"
        return 0
    fi
}

# 停止所有服务
stop_all_services() {
    log_info "停止所有服务..."
    
    # 检查docker-compose.yml文件
    if [[ ! -f "docker-compose.yml" ]]; then
        log_error "未找到docker-compose.yml文件"
        exit 1
    fi
    
    # 检查服务状态
    if ! check_services_status; then
        log_warning "系统可能已经停止"
        return 0
    fi
    
    # 优雅停止服务（给容器时间保存数据）
    log_info "正在优雅停止服务..."
    docker-compose down --timeout 30
    
    # 验证所有容器是否已停止
    remaining_containers=$(docker ps -q --filter "name=falco-")
    if [[ -n "$remaining_containers" ]]; then
        log_warning "强制停止剩余容器..."
        docker stop $remaining_containers
        docker rm $remaining_containers
    fi
    
    log_success "所有容器已停止"
}

# 清理容器和网络
cleanup_resources() {
    log_info "清理Docker资源..."
    
    # 删除停止的容器
    stopped_containers=$(docker ps -aq --filter "status=exited")
    if [[ -n "$stopped_containers" ]]; then
        docker rm $stopped_containers
        log_info "已清理停止的容器"
    else
        log_info "没有需要清理的停止容器"
    fi
    
    # 清理未使用的网络
    docker network prune -f > /dev/null 2>&1
    log_info "已清理未使用的网络"
    
    # 清理未使用的数据卷（可选，谨慎使用）
    # docker volume prune -f
}

# 显示停止信息
show_stop_info() {
    log_success "=== Falco AI Security System 已停止 ==="
    echo
    log_info "所有服务已停止，数据已保留"
    echo
    log_info "重新启动系统: ./scripts/start.sh"
    log_info "完全清理系统: ./scripts/cleanup.sh"
    echo
}

# 主停止流程
main() {
    log_info "停止 Falco AI Security System..."
    echo
    
    stop_all_services
    cleanup_resources
    
    show_stop_info
}

# 执行主函数
main "$@"