#!/bin/bash
# 修复nginx配置文件复制问题的脚本

set -e

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

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要root权限运行，请使用sudo执行"
        exit 1
    fi
}

# 修复nginx配置问题
fix_nginx_config() {
    log_info "修复nginx配置文件问题..."
    
    # 获取当前脚本目录
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
    
    # 检查目标目录是否存在
    if [[ -d "/opt/falco-ai-security/config/nginx/nginx.conf" ]]; then
        log_warning "检测到nginx.conf是一个目录，正在删除..."
        rm -rf "/opt/falco-ai-security/config/nginx/nginx.conf"
    fi
    
    # 确保nginx目录存在
    mkdir -p "/opt/falco-ai-security/config/nginx"
    
    # 复制nginx配置文件
    if [[ -f "$PROJECT_DIR/config/nginx/nginx.conf" ]]; then
        cp "$PROJECT_DIR/config/nginx/nginx.conf" "/opt/falco-ai-security/config/nginx/nginx.conf"
        log_success "nginx.conf文件复制成功"
    else
        log_error "源nginx.conf文件不存在: $PROJECT_DIR/config/nginx/nginx.conf"
        exit 1
    fi
    
    # 复制ssl目录（如果存在）
    if [[ -d "$PROJECT_DIR/config/nginx/ssl" ]]; then
        cp -r "$PROJECT_DIR/config/nginx/ssl" "/opt/falco-ai-security/config/nginx/"
        log_success "SSL配置目录复制成功"
    fi
    
    # 设置正确的权限
    chown -R $SUDO_USER:$SUDO_USER "/opt/falco-ai-security/config/nginx"
    chmod 644 "/opt/falco-ai-security/config/nginx/nginx.conf"
    
    log_success "nginx配置修复完成"
}

# 重新复制所有配置文件
recopy_all_configs() {
    log_info "重新复制所有配置文件..."
    
    # 获取当前脚本目录
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
    
    # 确保目标目录存在
    mkdir -p "/opt/falco-ai-security/config"
    
    # 复制falco配置
    if [[ -d "$PROJECT_DIR/config/falco" ]]; then
        cp -r "$PROJECT_DIR/config/falco" "/opt/falco-ai-security/config/"
        log_success "Falco配置复制成功"
    fi
    
    # 复制其他配置文件
    for config_dir in "$PROJECT_DIR/config"/*; do
        if [[ -d "$config_dir" && "$(basename "$config_dir")" != "nginx" ]]; then
            cp -r "$config_dir" "/opt/falco-ai-security/config/"
            log_info "复制配置目录: $(basename "$config_dir")"
        fi
    done
    
    # 设置权限
    chown -R $SUDO_USER:$SUDO_USER "/opt/falco-ai-security/config"
    
    log_success "所有配置文件复制完成"
}

# 主函数
main() {
    log_info "开始修复nginx配置问题..."
    echo
    
    check_root
    fix_nginx_config
    recopy_all_configs
    
    echo
    log_success "=== 修复完成 ==="
    log_info "现在可以继续运行安装脚本或直接启动系统"
    log_info "启动命令: sudo /opt/falco-ai-security/scripts/start.sh"
}

# 执行主函数
main "$@"