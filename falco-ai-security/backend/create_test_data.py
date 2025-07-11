#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建Neo4j测试数据
"""

import sys
import os
from neo4j import GraphDatabase
from datetime import datetime, timedelta
import random

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def create_test_data():
    """创建测试数据"""
    # Neo4j连接配置
    uri = "bolt://localhost:7687"
    username = "neo4j"
    password = "falco-neo4j-password"
    
    driver = GraphDatabase.driver(uri, auth=(username, password))
    
    try:
        with driver.session() as session:
            # 清除现有数据
            print("清除现有数据...")
            session.run("MATCH (n) DETACH DELETE n")
            
            # 创建主机节点
            hosts = [
                {"id": "host1", "name": "web-server-01", "ip": "192.168.1.10", "os": "Ubuntu 20.04", "risk_score": 7.5},
                {"id": "host2", "name": "db-server-01", "ip": "192.168.1.20", "os": "CentOS 8", "risk_score": 8.2},
                {"id": "host3", "name": "app-server-01", "ip": "192.168.1.30", "os": "Ubuntu 18.04", "risk_score": 6.8},
                {"id": "host4", "name": "backup-server", "ip": "192.168.1.40", "os": "Debian 11", "risk_score": 5.5},
            ]
            
            for host in hosts:
                session.run(
                    "CREATE (h:Host {id: $id, name: $name, ip: $ip, os: $os, risk_score: $risk_score, timestamp: $timestamp})",
                    id=host["id"], name=host["name"], ip=host["ip"], os=host["os"], 
                    risk_score=host["risk_score"], timestamp=datetime.now().isoformat()
                )
            
            # 创建用户节点
            users = [
                {"id": "user1", "name": "admin", "uid": 0, "groups": "root,sudo", "risk_score": 9.0},
                {"id": "user2", "name": "webuser", "uid": 1001, "groups": "www-data", "risk_score": 4.5},
                {"id": "user3", "name": "dbuser", "uid": 1002, "groups": "mysql", "risk_score": 6.0},
                {"id": "user4", "name": "appuser", "uid": 1003, "groups": "app", "risk_score": 5.2},
            ]
            
            for user in users:
                session.run(
                    "CREATE (u:User {id: $id, name: $name, uid: $uid, groups: $groups, risk_score: $risk_score, timestamp: $timestamp})",
                    id=user["id"], name=user["name"], uid=user["uid"], groups=user["groups"],
                    risk_score=user["risk_score"], timestamp=datetime.now().isoformat()
                )
            
            # 创建进程节点
            processes = [
                {"id": "proc1", "name": "nginx", "pid": 1234, "cmd": "/usr/sbin/nginx -g 'daemon off;'", "risk_score": 3.5},
                {"id": "proc2", "name": "mysql", "pid": 2345, "cmd": "/usr/sbin/mysqld", "risk_score": 7.0},
                {"id": "proc3", "name": "ssh", "pid": 3456, "cmd": "/usr/sbin/sshd -D", "risk_score": 8.5},
                {"id": "proc4", "name": "apache2", "pid": 4567, "cmd": "/usr/sbin/apache2 -DFOREGROUND", "risk_score": 6.2},
            ]
            
            for proc in processes:
                session.run(
                    "CREATE (p:Process {id: $id, name: $name, pid: $pid, cmd: $cmd, risk_score: $risk_score, timestamp: $timestamp})",
                    id=proc["id"], name=proc["name"], pid=proc["pid"], cmd=proc["cmd"],
                    risk_score=proc["risk_score"], timestamp=datetime.now().isoformat()
                )
            
            # 创建事件节点
            events = [
                {"id": "event1", "name": "异常登录", "severity": "high", "description": "检测到异常SSH登录尝试", "risk_score": 8.8},
                {"id": "event2", "name": "文件访问", "severity": "medium", "description": "敏感文件被访问", "risk_score": 6.5},
                {"id": "event3", "name": "网络连接", "severity": "low", "description": "建立外部网络连接", "risk_score": 4.0},
                {"id": "event4", "name": "权限提升", "severity": "critical", "description": "检测到权限提升行为", "risk_score": 9.5},
            ]
            
            for event in events:
                session.run(
                    "CREATE (e:Event {id: $id, name: $name, severity: $severity, description: $description, risk_score: $risk_score, timestamp: $timestamp})",
                    id=event["id"], name=event["name"], severity=event["severity"], description=event["description"],
                    risk_score=event["risk_score"], timestamp=datetime.now().isoformat()
                )
            
            # 创建关系
            relationships = [
                ("user1", "host1", "ACCESS", {"method": "ssh", "timestamp": datetime.now().isoformat()}),
                ("user1", "proc3", "EXECUTE", {"action": "start", "timestamp": datetime.now().isoformat()}),
                ("user2", "host1", "ACCESS", {"method": "web", "timestamp": datetime.now().isoformat()}),
                ("user2", "proc1", "EXECUTE", {"action": "restart", "timestamp": datetime.now().isoformat()}),
                ("user3", "host2", "ACCESS", {"method": "local", "timestamp": datetime.now().isoformat()}),
                ("user3", "proc2", "EXECUTE", {"action": "query", "timestamp": datetime.now().isoformat()}),
                ("event1", "user1", "TRIGGERED_BY", {"reason": "multiple_failed_attempts", "timestamp": datetime.now().isoformat()}),
                ("event1", "host1", "OCCURRED_ON", {"location": "/var/log/auth.log", "timestamp": datetime.now().isoformat()}),
                ("event2", "user2", "TRIGGERED_BY", {"reason": "file_access", "timestamp": datetime.now().isoformat()}),
                ("event3", "proc1", "TRIGGERED_BY", {"reason": "external_connection", "timestamp": datetime.now().isoformat()}),
                ("event4", "user1", "TRIGGERED_BY", {"reason": "sudo_usage", "timestamp": datetime.now().isoformat()}),
                ("proc1", "host1", "RUNS_ON", {"status": "active", "timestamp": datetime.now().isoformat()}),
                ("proc2", "host2", "RUNS_ON", {"status": "active", "timestamp": datetime.now().isoformat()}),
                ("proc3", "host1", "RUNS_ON", {"status": "active", "timestamp": datetime.now().isoformat()}),
            ]
            
            for source, target, rel_type, props in relationships:
                session.run(
                    f"MATCH (s {{id: $source}}), (t {{id: $target}}) CREATE (s)-[r:{rel_type} $props]->(t)",
                    source=source, target=target, props=props
                )
            
            # 验证数据创建
            node_count = session.run("MATCH (n) RETURN count(n) as count").single()["count"]
            rel_count = session.run("MATCH ()-[r]->() RETURN count(r) as count").single()["count"]
            
            print(f"✅ 测试数据创建成功!")
            print(f"   节点数量: {node_count}")
            print(f"   关系数量: {rel_count}")
            
            # 显示节点类型统计
            node_types = session.run(
                "MATCH (n) RETURN labels(n)[0] as type, count(n) as count ORDER BY type"
            )
            print("\n节点类型统计:")
            for record in node_types:
                print(f"   {record['type']}: {record['count']}")
            
            # 显示关系类型统计
            rel_types = session.run(
                "MATCH ()-[r]->() RETURN type(r) as type, count(r) as count ORDER BY type"
            )
            print("\n关系类型统计:")
            for record in rel_types:
                print(f"   {record['type']}: {record['count']}")
                
    except Exception as e:
        print(f"❌ 创建测试数据失败: {e}")
    finally:
        driver.close()

if __name__ == "__main__":
    create_test_data()