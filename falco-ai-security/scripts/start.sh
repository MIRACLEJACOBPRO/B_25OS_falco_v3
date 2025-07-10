#!/bin/bash
# Falco AI Security System - 一键启动脚本
# 启动所有系统组件和服务

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

# 检查Docker服务
check_docker() {
    log_info "检查Docker服务状态..."
    
    if ! systemctl is-active --quiet docker; then
        log_info "启动Docker服务..."
        sudo systemctl start docker
        sleep 3
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker服务未正常运行"
        exit 1
    fi
    
    log_success "Docker服务正常"
}

# 检查配置文件
check_config() {
    log_info "检查配置文件..."
    
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            log_warning "未找到.env文件，复制.env.example作为默认配置"
            cp .env.example .env
        else
            log_error "未找到配置文件"
            exit 1
        fi
    fi
    
    # 检查关键配置
    if grep -q "sk-xxx" .env; then
        log_warning "请配置OpenAI API密钥"
    fi
    
    if grep -q "pc-xxx" .env; then
        log_warning "请配置Pinecone API密钥"
    fi
    
    log_success "配置文件检查完成"
}

# 创建必要目录
setup_directories() {
    log_info "创建必要目录..."
    
    # 创建日志目录
    sudo mkdir -p /var/log/falco-ai-security
    sudo mkdir -p /var/log/falco
    
    # 创建数据目录
    sudo mkdir -p /opt/falco-ai-security/data
    
    # 设置权限
    sudo chown -R $USER:$USER /var/log/falco-ai-security
    sudo chown -R $USER:$USER /opt/falco-ai-security 2>/dev/null || true
    
    log_success "目录创建完成"
}

# 拉取Docker镜像
pull_images() {
    log_info "拉取Docker镜像..."
    
    # 拉取基础镜像
    docker-compose pull --quiet
    
    log_success "镜像拉取完成"
}

# 构建自定义镜像
build_images() {
    log_info "构建自定义镜像..."
    
    # 构建后端镜像
    if [[ -f "backend/Dockerfile" ]]; then
        docker-compose build backend
    fi
    
    # 构建前端镜像
    if [[ -f "frontend/Dockerfile" ]]; then
        docker-compose build frontend
    fi
    
    log_success "镜像构建完成"
}

# 启动基础服务
start_base_services() {
    log_info "启动基础服务..."
    
    # 启动Neo4j
    log_info "启动Neo4j数据库..."
    docker-compose up -d neo4j
    
    # 等待Neo4j启动
    log_info "等待Neo4j启动..."
    timeout=60
    while ! docker-compose exec -T neo4j cypher-shell -u neo4j -p falco-neo4j-password "RETURN 1" &> /dev/null; do
        sleep 2
        timeout=$((timeout - 2))
        if [[ $timeout -le 0 ]]; then
            log_error "Neo4j启动超时"
            exit 1
        fi
    done
    log_success "Neo4j启动完成"
    
    # 启动Redis
    log_info "启动Redis缓存..."
    docker-compose up -d redis
    
    # 等待Redis启动
    log_info "等待Redis启动..."
    timeout=30
    while ! docker-compose exec -T redis redis-cli ping &> /dev/null; do
        sleep 1
        timeout=$((timeout - 1))
        if [[ $timeout -le 0 ]]; then
            log_error "Redis启动超时"
            exit 1
        fi
    done
    log_success "Redis启动完成"
}

# 启动监控服务
start_monitoring_services() {
    log_info "启动监控服务..."
    
    # 启动Falco监控服务 (使用modern eBPF模式)
    log_info "启动Falco安全监控服务..."
    docker-compose up -d falco
    
    # 等待Falco启动
    log_info "等待Falco监控服务启动..."
    timeout=30
    while ! docker-compose ps falco | grep -q "Up"; do
        sleep 2
        timeout=$((timeout - 2))
        if [[ $timeout -le 0 ]]; then
            log_warning "Falco启动超时，但服务可能仍在初始化中"
            break
        fi
    done
    log_success "Falco监控服务启动完成"
}

# 启动应用服务
start_app_services() {
    log_info "启动应用服务..."
    
    # 启动后端API
    log_info "启动后端API服务..."
    docker-compose up -d backend
    
    # 等待后端启动
    log_info "等待后端API启动..."
    timeout=60
    while ! curl -f http://localhost:8000/health &> /dev/null; do
        sleep 2
        timeout=$((timeout - 2))
        if [[ $timeout -le 0 ]]; then
            log_error "后端API启动超时"
            docker-compose logs backend
            exit 1
        fi
    done
    log_success "后端API启动完成"
    
    # 启动前端
    log_info "启动前端Web界面..."
    docker-compose up -d frontend
    
    # 等待前端启动
    log_info "等待前端启动..."
    timeout=60
    while ! curl -f http://localhost:3000 &> /dev/null; do
        sleep 2
        timeout=$((timeout - 2))
        if [[ $timeout -le 0 ]]; then
            log_warning "前端启动超时，但可能仍在构建中"
            break
        fi
    done
    log_success "前端启动完成"
}

# 启动代理服务
start_proxy_services() {
    log_info "启动代理服务..."
    
    # 检查nginx配置是否存在
    if [[ -f "config/nginx/nginx.conf" ]]; then
        docker-compose up -d nginx
        log_success "Nginx代理启动完成"
    else
        log_warning "Nginx配置文件不存在，跳过代理服务"
    fi
}

# 验证服务状态
verify_services() {
    log_info "验证服务状态..."
    
    # 检查所有容器状态
    echo
    log_info "容器状态:"
    docker-compose ps
    echo
    
    # 检查服务健康状态
    services=("neo4j" "redis" "backend" "falco")
    
    for service in "${services[@]}"; do
        if docker-compose ps $service | grep -q "Up"; then
            log_success "$service: 运行正常"
        else
            log_error "$service: 运行异常"
        fi
    done
}

# 显示访问信息
show_access_info() {
    log_success "=== Falco AI Security System 启动完成 ==="
    echo
    log_info "服务访问地址:"
    echo "- Web界面: http://192.168.200.129:3000"
    echo "- API接口: http://192.168.200.129:8000"
    echo "- API文档: http://192.168.200.129:8000/docs"
    echo "- Neo4j浏览器: http://192.168.200.129:7474"
    echo "  用户名: neo4j"
    echo "  密码: falco-neo4j-password"
    echo
    log_info "系统管理命令:"
    echo "- 查看日志: docker-compose logs -f [service_name]"
    echo "- 停止系统: ./scripts/stop.sh"
    echo "- 重启系统: ./scripts/restart.sh"
    echo "- 查看状态: docker-compose ps"
    echo
    log_info "监控日志:"
    echo "- Falco日志: docker-compose logs -f falco"
    echo "- 后端日志: docker-compose logs -f backend"
    echo "- 系统日志: tail -f /var/log/falco-ai-security/app.log"
    echo
}

# 主启动流程
main() {
    log_info "启动 Falco AI Security System..."
    echo
    
    check_docker
    check_config
    setup_directories
    pull_images
    build_images
    start_base_services
    start_monitoring_services
    start_app_services
    start_proxy_services
    verify_services
    
    show_access_info
}

# 信号处理
trap 'log_error "启动过程被中断"; exit 1' INT TERM

# 执行主函数
main "$@"