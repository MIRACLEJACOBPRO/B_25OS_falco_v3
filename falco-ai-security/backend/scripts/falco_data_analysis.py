#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Falco数据采集分析脚本

该脚本用于分析Falco数据采集的性能和完整性，包括：
1. 读取频率分析
2. 数据量统计
3. 重复数据检测
4. 性能瓶颈识别
5. 优化建议生成

作者: Falco AI Security Team
版本: 1.0.0
创建时间: 2024-05-15
"""

import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any

# 添加项目根目录到Python路径
sys.path.append(str(Path(__file__).parent.parent))

from app.services.falco_data_integrity import FalcoDataIntegrityService
from app.services.falco_monitor import FalcoMonitorService
from app.config_simple import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class FalcoDataAnalyzer:
    """Falco数据采集分析器"""
    
    def __init__(self):
        # 使用宿主机上的实际日志文件路径
        self.log_file_path = "/home/xzj/01_Project/B_25OS_falco_v3/falco-ai-security/logs/falco.log"
        self.analysis_duration = 15   # 分析持续时间（秒）
        self.sample_interval = 1      # 采样间隔（秒）
        
        # 分析结果
        self.analysis_results = {
            'start_time': None,
            'end_time': None,
            'duration': 0,
            'file_stats': {},
            'read_performance': {},
            'data_integrity': {},
            'recommendations': []
        }
    
    def analyze_file_stats(self) -> Dict[str, Any]:
        """分析文件统计信息"""
        try:
            if not os.path.exists(self.log_file_path):
                return {'error': f'日志文件不存在: {self.log_file_path}'}
            
            stat = os.stat(self.log_file_path)
            
            # 计算文件增长速率
            file_size = stat.st_size
            mtime = stat.st_mtime
            
            # 读取最近的几行来估算事件频率
            recent_events = self._sample_recent_events(100)
            
            return {
                'file_path': self.log_file_path,
                'file_size': file_size,
                'file_size_mb': round(file_size / 1024 / 1024, 2),
                'last_modified': datetime.fromtimestamp(mtime).isoformat(),
                'recent_events_count': len(recent_events),
                'estimated_events_per_minute': self._estimate_event_rate(recent_events)
            }
            
        except Exception as e:
            logger.error(f"分析文件统计失败: {e}")
            return {'error': str(e)}
    
    def _sample_recent_events(self, count: int = 100) -> List[Dict]:
        """采样最近的事件"""
        try:
            with open(self.log_file_path, 'r', encoding='utf-8') as f:
                # 移动到文件末尾
                f.seek(0, 2)
                file_size = f.tell()
                
                # 估算需要读取的字节数（假设每行平均500字节）
                estimated_bytes = count * 500
                start_pos = max(0, file_size - estimated_bytes)
                
                f.seek(start_pos)
                lines = f.readlines()
                
                # 解析JSON事件
                events = []
                for line in lines[-count:]:
                    line = line.strip()
                    if line and line.startswith('{'):
                        try:
                            event = json.loads(line)
                            events.append(event)
                        except json.JSONDecodeError:
                            continue
                
                return events
                
        except Exception as e:
            logger.error(f"采样最近事件失败: {e}")
            return []
    
    def _estimate_event_rate(self, events: List[Dict]) -> float:
        """估算事件频率（每分钟）"""
        if len(events) < 2:
            return 0.0
        
        try:
            # 获取时间戳
            timestamps = []
            for event in events:
                if 'time' in event:
                    # ISO格式时间戳
                    ts = datetime.fromisoformat(event['time'].replace('Z', '+00:00'))
                    timestamps.append(ts.timestamp())
                elif 'timestamp' in event:
                    # Unix时间戳
                    timestamps.append(float(event['timestamp']))
            
            if len(timestamps) < 2:
                return 0.0
            
            # 计算时间跨度
            time_span = max(timestamps) - min(timestamps)
            if time_span <= 0:
                return 0.0
            
            # 计算每分钟事件数
            events_per_second = len(timestamps) / time_span
            return round(events_per_second * 60, 2)
            
        except Exception as e:
            logger.error(f"估算事件频率失败: {e}")
            return 0.0
    
    async def analyze_read_performance(self) -> Dict[str, Any]:
        """分析读取性能"""
        logger.info("开始分析读取性能...")
        
        start_time = time.time()
        read_stats = []
        
        # 监控读取性能 - 直接从文件读取最近事件进行测试
        for i in range(self.analysis_duration // self.sample_interval):
            sample_start = time.time()
            
            # 直接读取最近的事件进行性能测试
            events = self._sample_recent_events(50)  # 每次读取50个最近事件
            
            sample_end = time.time()
            read_time = sample_end - sample_start
            
            read_stats.append({
                'timestamp': sample_start,
                'read_time': read_time,
                'events_count': len(events),
                'events_per_second': len(events) / read_time if read_time > 0 else 0
            })
            
            logger.info(f"样本 {i+1}/{self.analysis_duration // self.sample_interval}: "
                       f"读取 {len(events)} 个事件，耗时 {read_time:.3f}s")
            
            await asyncio.sleep(self.sample_interval)
        
        end_time = time.time()
        
        # 计算统计指标
        total_events = sum(stat['events_count'] for stat in read_stats)
        total_read_time = sum(stat['read_time'] for stat in read_stats)
        avg_read_time = total_read_time / len(read_stats) if read_stats else 0
        avg_events_per_read = total_events / len(read_stats) if read_stats else 0
        
        return {
            'analysis_duration': end_time - start_time,
            'total_samples': len(read_stats),
            'total_events_read': total_events,
            'total_read_time': total_read_time,
            'avg_read_time': avg_read_time,
            'avg_events_per_read': avg_events_per_read,
            'max_read_time': max((stat['read_time'] for stat in read_stats), default=0),
            'min_read_time': min((stat['read_time'] for stat in read_stats), default=0),
            'events_per_minute': (total_events / (end_time - start_time)) * 60 if end_time > start_time else 0
        }
    
    async def analyze_data_integrity(self) -> Dict[str, Any]:
        """分析数据完整性"""
        logger.info("开始分析数据完整性...")
        
        # 创建数据完整性服务实例
        integrity_service = FalcoDataIntegrityService()
        
        # 运行完整性验证
        validation_result = await integrity_service.validate_data_integrity(
            check_duration=min(self.analysis_duration, 60)
        )
        
        # 获取统计信息
        stats = integrity_service.get_stats()
        
        return {
            'validation_result': validation_result,
            'service_stats': stats,
            'integrity_score': validation_result.get('integrity_score', 0.0)
        }
    
    def generate_recommendations(self) -> List[str]:
        """生成优化建议"""
        recommendations = []
        
        # 基于文件统计的建议
        file_stats = self.analysis_results.get('file_stats', {})
        if 'estimated_events_per_minute' in file_stats:
            event_rate = file_stats['estimated_events_per_minute']
            
            if event_rate > 1000:
                recommendations.append(
                    f"事件频率较高 ({event_rate:.1f}/分钟)，建议增加批处理大小或降低处理频率"
                )
            elif event_rate < 10:
                recommendations.append(
                    f"事件频率较低 ({event_rate:.1f}/分钟)，可以增加处理频率以提高实时性"
                )
        
        # 检查文件是否为空
        if file_stats.get('file_size', 0) == 0:
            recommendations.append(
                "Falco日志文件为空，请检查Falco服务是否正常运行"
            )
        
        # 基于读取性能的建议
        read_perf = self.analysis_results.get('read_performance', {})
        if 'avg_read_time' in read_perf:
            avg_read_time = read_perf['avg_read_time']
            
            if avg_read_time > 0.1:
                recommendations.append(
                    f"平均读取时间较长 ({avg_read_time:.3f}s)，建议优化I/O操作或增加缓存"
                )
            
            if read_perf.get('max_read_time', 0) > avg_read_time * 3:
                recommendations.append(
                    "检测到读取时间波动较大，建议检查系统负载和磁盘性能"
                )
        
        # 基于数据完整性的建议
        integrity = self.analysis_results.get('data_integrity', {})
        if 'integrity_score' in integrity:
            score = integrity['integrity_score']
            
            if score < 0.9:
                recommendations.append(
                    f"数据完整性得分较低 ({score:.2f})，建议检查重复处理逻辑"
                )
        
        # 基于配置的建议
        current_interval = getattr(settings, 'FALCO_PROCESSING_INTERVAL', 1)
        current_batch_size = getattr(settings, 'FALCO_MAX_EVENTS_PER_BATCH', 100)
        
        if read_perf.get('avg_events_per_read', 0) < current_batch_size * 0.5:
            recommendations.append(
                f"实际读取事件数 ({read_perf.get('avg_events_per_read', 0):.1f}) "
                f"远低于批处理大小 ({current_batch_size})，建议降低批处理大小"
            )
        
        return recommendations
    
    async def run_analysis(self) -> Dict[str, Any]:
        """运行完整分析"""
        logger.info(f"开始Falco数据采集分析，持续时间: {self.analysis_duration}秒")
        
        self.analysis_results['start_time'] = datetime.now().isoformat()
        start_time = time.time()
        
        try:
            # 1. 分析文件统计
            logger.info("1/3 分析文件统计...")
            self.analysis_results['file_stats'] = self.analyze_file_stats()
            
            # 2. 分析读取性能
            logger.info("2/3 分析读取性能...")
            self.analysis_results['read_performance'] = await self.analyze_read_performance()
            
            # 3. 分析数据完整性
            logger.info("3/3 分析数据完整性...")
            self.analysis_results['data_integrity'] = await self.analyze_data_integrity()
            
            # 生成建议
            self.analysis_results['recommendations'] = self.generate_recommendations()
            
        except Exception as e:
            logger.error(f"分析过程中发生错误: {e}")
            self.analysis_results['error'] = str(e)
        
        finally:
            end_time = time.time()
            self.analysis_results['end_time'] = datetime.now().isoformat()
            self.analysis_results['duration'] = end_time - start_time
        
        return self.analysis_results
    
    def save_results(self, output_file: str = None):
        """保存分析结果"""
        if output_file is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = f'/tmp/falco_analysis_{timestamp}.json'
        
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(self.analysis_results, f, indent=2, ensure_ascii=False)
            
            logger.info(f"分析结果已保存到: {output_file}")
            return output_file
            
        except Exception as e:
            logger.error(f"保存分析结果失败: {e}")
            return None
    
    def print_summary(self):
        """打印分析摘要"""
        print("\n" + "="*60)
        print("Falco数据采集分析报告")
        print("="*60)
        
        # 文件统计
        file_stats = self.analysis_results.get('file_stats', {})
        if 'file_size_mb' in file_stats:
            print(f"\n📁 文件统计:")
            print(f"  文件大小: {file_stats['file_size_mb']} MB")
            print(f"  事件频率: {file_stats.get('estimated_events_per_minute', 0):.1f} 事件/分钟")
        
        # 读取性能
        read_perf = self.analysis_results.get('read_performance', {})
        if 'avg_read_time' in read_perf:
            print(f"\n⚡ 读取性能:")
            print(f"  平均读取时间: {read_perf['avg_read_time']:.3f}s")
            print(f"  平均事件数/次: {read_perf['avg_events_per_read']:.1f}")
            print(f"  事件处理速率: {read_perf['events_per_minute']:.1f} 事件/分钟")
        
        # 数据完整性
        integrity = self.analysis_results.get('data_integrity', {})
        if 'integrity_score' in integrity:
            score = integrity['integrity_score']
            print(f"\n🔒 数据完整性:")
            print(f"  完整性得分: {score:.2f}/1.00")
            
            if score >= 0.95:
                print(f"  状态: 优秀 ✅")
            elif score >= 0.85:
                print(f"  状态: 良好 ⚠️")
            else:
                print(f"  状态: 需要改进 ❌")
        
        # 优化建议
        recommendations = self.analysis_results.get('recommendations', [])
        if recommendations:
            print(f"\n💡 优化建议:")
            for i, rec in enumerate(recommendations, 1):
                print(f"  {i}. {rec}")
        else:
            print(f"\n💡 优化建议: 当前配置良好，无需调整")
        
        print("\n" + "="*60)


async def main():
    """主函数"""
    analyzer = FalcoDataAnalyzer()
    
    # 运行分析
    results = await analyzer.run_analysis()
    
    # 打印摘要
    analyzer.print_summary()
    
    # 保存结果
    output_file = analyzer.save_results()
    if output_file:
        print(f"\n详细结果已保存到: {output_file}")


if __name__ == "__main__":
    asyncio.run(main())