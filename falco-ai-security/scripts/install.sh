#!/bin/bash
# Falco AI Security System - 一键安装脚本
# 适用于OpenKylin系统的自动化部署脚本

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

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要root权限运行，请使用sudo执行"
        exit 1
    fi
}

# 检查系统版本
check_system() {
    log_info "检查系统环境..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        log_info "检测到系统: $NAME $VERSION"
    else
        log_warning "无法检测系统版本，继续安装..."
    fi
    
    # 检查架构
    ARCH=$(uname -m)
    log_info "系统架构: $ARCH"
}

# 更新系统包
update_system() {
    log_info "更新系统包..."
    apt-get update -y
    apt-get upgrade -y
    apt-get install -y curl wget git vim htop net-tools
}

# 安装Docker
install_docker() {
    log_info "安装Docker..."
    
    # 检查Docker是否已安装
    if command -v docker &> /dev/null; then
        log_success "Docker已安装，版本: $(docker --version)"
        return
    fi
    
    # 安装Docker依赖
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # 添加Docker官方GPG密钥
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # 添加Docker仓库
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装Docker Engine
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # 启动Docker服务
    systemctl start docker
    systemctl enable docker
    
    # 添加当前用户到docker组
    usermod -aG docker $SUDO_USER
    
    log_success "Docker安装完成"
}

# 安装Docker Compose
install_docker_compose() {
    log_info "安装Docker Compose..."
    
    # 检查Docker Compose是否已安装
    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose已安装，版本: $(docker-compose --version)"
        return
    fi
    
    # 下载Docker Compose
    DOCKER_COMPOSE_VERSION="2.23.3"
    curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # 设置执行权限
    chmod +x /usr/local/bin/docker-compose
    
    # 创建软链接
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log_success "Docker Compose安装完成"
}

# 安装Falco
install_falco() {
    log_info "安装Falco..."
    
    # 检查Falco是否已安装
    if command -v falco &> /dev/null; then
        log_success "Falco已安装，版本: $(falco --version)"
        return
    fi
    
    # 添加Falco仓库
    curl -s https://falco.org/repo/falcosecurity-packages.asc | apt-key add -
    echo "deb https://download.falco.org/packages/deb stable main" | tee -a /etc/apt/sources.list.d/falcosecurity.list
    
    # 安装Falco
    apt-get update -y
    apt-get install -y falco
    
    # 创建Falco配置目录
    mkdir -p /etc/falco
    mkdir -p /var/log/falco
    
    log_success "Falco安装完成"
}

# 创建项目目录结构
setup_directories() {
    log_info "创建项目目录结构..."
    
    # 创建主要目录
    mkdir -p /opt/falco-ai-security/{data,scripts,logs,config}
    mkdir -p /var/log/falco-ai-security
    
    # 设置权限
    chown -R $SUDO_USER:$SUDO_USER /opt/falco-ai-security
    chown -R $SUDO_USER:$SUDO_USER /var/log/falco-ai-security
    
    log_success "目录结构创建完成"
}

# 配置防火墙
# setup_firewall() {
#     log_info "配置防火墙规则..."
    
#     # 检查ufw是否安装
#     if ! command -v ufw &> /dev/null; then
#         apt-get install -y ufw
#     fi
    
#     # 配置防火墙规则
#     ufw --force reset
#     ufw default deny incoming
#     ufw default allow outgoing
    
#     # 允许SSH
#     ufw allow ssh
    
#     # 允许应用端口
#     ufw allow 3000/tcp  # Frontend
#     ufw allow 8000/tcp  # Backend API
#     ufw allow 7474/tcp  # Neo4j HTTP
#     ufw allow 7687/tcp  # Neo4j Bolt
#     ufw allow 6379/tcp  # Redis
#     ufw allow 5060/tcp  # Falco gRPC
    
#     # 启用防火墙
#     ufw --force enable
    
#     log_success "防火墙配置完成"
# }

setup_firewall() {
    log_info "配置防火墙规则..."
    return 0

    # 安装 ufw（如未安装）
    if ! command -v ufw &> /dev/null; then
        apt-get install -y ufw
    fi

    # 重置防火墙规则并设定默认策略
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing

    # 放行基本联网出站流量
    ufw allow out 53             # DNS
    ufw allow out 80             # HTTP
    ufw allow out 443            # HTTPS
    ufw allow out 123            # NTP
    ufw allow out 67             # DHCP 请求
    ufw allow out 68             # DHCP 响应
    ufw allow out proto icmp     # Ping
    ufw allow out 7890           # Clash HTTP 代理
    ufw allow out 7891           # Clash SOCKS 代理（如使用）

    # 放行 Clash TUN 虚拟网卡接口
    ufw allow in on tun0         # 虚拟网卡入站流量（TUN 模式必须）

    # 保证远程连接不中断
    ufw allow ssh

    # 放行系统相关服务端口
    ufw allow 3000/tcp  # Web前端
    ufw allow 8000/tcp  # 后端 API
    ufw allow 7474/tcp  # Neo4j HTTP
    ufw allow 7687/tcp  # Neo4j Bolt
    ufw allow 6379/tcp  # Redis
    ufw allow 5060/tcp  # Falco gRPC

    # 启用防火墙
    ufw --force enable

    log_success "防火墙规则配置完成（已适配 Clash TUN 模式）"
}



# 配置系统服务
setup_services() {
    log_info "配置系统服务..."
    
    # 创建systemd服务文件
    cat > /etc/systemd/system/falco-ai-security.service << EOF
[Unit]
Description=Falco AI Security System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/falco-ai-security
ExecStart=/opt/falco-ai-security/scripts/start.sh
ExecStop=/opt/falco-ai-security/scripts/stop.sh
TimeoutStartSec=0
User=$SUDO_USER

[Install]
WantedBy=multi-user.target
EOF
    
    # 重新加载systemd
    systemctl daemon-reload
    
    log_success "系统服务配置完成"
}

# 复制配置文件
setup_config() {
    log_info "设置配置文件..."
    
    # 获取当前脚本目录
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
    
    # 安全地复制项目文件到系统目录
    # 先删除可能存在的冲突目录/文件
    if [[ -d "/opt/falco-ai-security/config/nginx/nginx.conf" ]]; then
        log_warning "检测到nginx.conf冲突，正在清理..."
        rm -rf "/opt/falco-ai-security/config/nginx/nginx.conf"
    fi
    
    # 逐个复制主要目录，避免冲突
    for item in "$PROJECT_DIR"/*; do
        if [[ -e "$item" ]]; then
            item_name=$(basename "$item")
            target_path="/opt/falco-ai-security/$item_name"
            
            # 如果目标已存在且是目录，则递归复制内容
            if [[ -d "$item" && -d "$target_path" ]]; then
                log_info "合并目录: $item_name"
                cp -rf "$item"/* "$target_path"/
            else
                # 直接复制文件或新目录
                cp -rf "$item" "$target_path"
            fi
        fi
    done
    
    # 复制环境变量文件
    if [[ -f "$PROJECT_DIR/.env.example" ]]; then
        cp "$PROJECT_DIR/.env.example" /opt/falco-ai-security/.env
        log_info "请编辑 /opt/falco-ai-security/.env 文件配置API密钥"
    fi
    
    # 设置权限
    chown -R $SUDO_USER:$SUDO_USER /opt/falco-ai-security
    chmod +x /opt/falco-ai-security/scripts/*.sh
    
    log_success "配置文件设置完成"
}

# 验证安装
verify_installation() {
    log_info "验证安装..."
    
    # 检查Docker
    if ! docker --version &> /dev/null; then
        log_error "Docker安装失败"
        exit 1
    fi
    
    # 检查Docker Compose
    if ! docker-compose --version &> /dev/null; then
        log_error "Docker Compose安装失败"
        exit 1
    fi
    
    # 检查Falco
    if ! falco --version &> /dev/null; then
        log_error "Falco安装失败"
        exit 1
    fi
    
    log_success "所有组件安装验证通过"
}

# 显示安装完成信息
show_completion_info() {
    log_success "=== Falco AI Security System 安装完成 ==="
    echo
    log_info "系统已安装到: /opt/falco-ai-security"
    log_info "日志目录: /var/log/falco-ai-security"
    echo
    log_warning "下一步操作:"
    echo "1. 编辑配置文件: sudo vim /opt/falco-ai-security/.env"
    echo "2. 配置API密钥 (OpenAI, Pinecone)"
    echo "3. 启动系统: sudo /opt/falco-ai-security/scripts/start.sh"
    echo "4. 访问Web界面: http://192.168.200.129:3000"
    echo
    log_info "系统服务管理:"
    echo "- 启动: sudo systemctl start falco-ai-security"
    echo "- 停止: sudo systemctl stop falco-ai-security"
    echo "- 开机自启: sudo systemctl enable falco-ai-security"
    echo
}

# 主安装流程
main() {
    log_info "开始安装 Falco AI Security System..."
    echo
    
    check_root
    check_system
    update_system
    install_docker
    install_docker_compose
    install_falco
    setup_directories
    setup_firewall
    setup_services
    setup_config
    verify_installation
    
    show_completion_info
}

# 执行主函数
main "$@"