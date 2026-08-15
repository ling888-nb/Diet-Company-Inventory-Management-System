from __future__ import annotations

import base64
import csv
import hashlib
import hmac
import io
import json
import locale
import os
import secrets
import shutil
import socket
import sqlite3
import string
import subprocess
import time
import uuid
from datetime import datetime, timedelta, timezone
from ipaddress import ip_address
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

try:
    import bcrypt
except ImportError:  # pragma: no cover - handled at runtime for offline installs
    bcrypt = None

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

try:
    from openpyxl import Workbook
except ImportError:  # pragma: no cover
    Workbook = None


BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
DATA_DIR = Path(os.environ.get("LAN_INVENTORY_DATA_DIR", BASE_DIR / "data")).expanduser()
BACKUP_DIR = BASE_DIR / "backups"
DB_PATH = DATA_DIR / "inventory.sqlite3"
SECRET_PATH = DATA_DIR / "jwt_secret.key"
FRONTEND_DIST = PROJECT_DIR / "dist"

API_PREFIX = "/api"
ACCESS_TOKEN_HOURS = 2
REMEMBER_TOKEN_DAYS = 7
LOCK_MINUTES = 5
MAX_FAILED_ATTEMPTS = 3
PORT = int(os.environ.get("LAN_INVENTORY_PORT", "8080"))
ACTIVE_CLIENT_SECONDS = 300
ACTIVE_CLIENTS: Dict[str, Dict[str, Any]] = {}
STARTED_AT = datetime.now(timezone.utc).astimezone().replace(microsecond=0).isoformat()

COLLECTION_KEYS = [
    "customers",
    "products",
    "coatingProcesses",
    "processCombinations",
    "materials",
    "materialTypes",
    "materialColors",
    "materialSuppliers",
    "inboundRecords",
    "outboundRecords",
    "materialInboundRecords",
    "materialOutboundRecords",
    "materialRecycleRecords",
    "materialConsumptionRecords",
]

COLLECTION_MODULE = {collection: collection for collection in COLLECTION_KEYS}

PERMISSION_MODULES = {
    "dashboard": "首页概览",
    "customers": "客户资料",
    "products": "产品资料",
    "coatingProcesses": "涂装工艺项目",
    "processCombinations": "复合工艺组合",
    "materials": "材料资料",
    "materialTypes": "材料类型",
    "materialColors": "材料颜色",
    "materialSuppliers": "材料供应商",
    "inboundRecords": "产品入库单",
    "outboundRecords": "产品出库单",
    "materialInboundRecords": "材料入库单",
    "materialOutboundRecords": "材料出库单",
    "materialRecycleRecords": "材料回收单",
    "materialConsumptionRecords": "材料消耗单",
    "inventory": "库存查询",
    "reports": "报表查询",
    "settings": "系统设置",
    "admin-users": "账号管理",
    "admin-roles": "角色权限",
    "audit-logs": "操作日志",
    "backups": "数据库备份",
}
PERMISSION_ACTIONS = ["view", "create", "update", "delete"]

LEGACY_PERMISSION_ALIASES = {
    "coating-process": ["coatingProcesses", "processCombinations"],
    "inbound": ["inboundRecords"],
    "outbound": ["outboundRecords"],
}

DEFAULT_SYSTEM_SETTINGS = {
    "companyName": "南通迪特金属制品有限公司",
    "allowEdit": True,
    "cloudSync": True,
    "interfacePreferences": {
        "accent": "ocean",
        "density": "comfortable",
        "actionDock": "right",
        "motion": True,
    },
}


class LoginRequest(BaseModel):
    username: str
    password: str
    remember: bool = False


class UserCreate(BaseModel):
    username: str
    real_name: str
    password: Optional[str] = None
    status: str = "enabled"
    notes: str = ""
    role_ids: List[int] = Field(default_factory=list)
    permissions: Dict[str, Dict[str, bool]] = Field(default_factory=dict)


class UserUpdate(BaseModel):
    username: Optional[str] = None
    real_name: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    role_ids: Optional[List[int]] = None
    permissions: Optional[Dict[str, Dict[str, bool]]] = None


class PasswordReset(BaseModel):
    password: Optional[str] = None


class ProfileUpdate(BaseModel):
    real_name: str
    notes: str = ""


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


class RolePayload(BaseModel):
    name: str
    description: str = ""
    permissions: Dict[str, Dict[str, bool]] = Field(default_factory=dict)


class RecordPayload(BaseModel):
    id: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class SnapshotPayload(BaseModel):
    data: Dict[str, Any]


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().replace(microsecond=0).isoformat()


def utc_ts() -> int:
    return int(time.time())


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def is_private_ipv4(host: str) -> bool:
    try:
        address = ip_address(host.split("%")[0])
    except ValueError:
        return False
    return (
        address.version == 4
        and address.is_private
        and not address.is_loopback
        and not address.is_link_local
    )


def get_windows_primary_lan_ip() -> Optional[str]:
    if os.name != "nt":
        return None

    encodings = [
        locale.getpreferredencoding(False) or "mbcs",
        "gbk",
        "utf-8",
    ]

    output = ""
    for encoding in encodings:
        try:
            output = subprocess.check_output(
                ["ipconfig"],
                stderr=subprocess.DEVNULL,
                text=True,
                encoding=encoding,
                errors="ignore",
                timeout=5,
            )
            break
        except (OSError, subprocess.SubprocessError):
            continue

    if not output:
        return None

    adapters: List[Dict[str, Any]] = []
    current: Dict[str, Any] = {}
    for raw_line in output.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if raw_line and not raw_line.startswith(" ") and line.endswith(":"):
            if current:
                adapters.append(current)
            current = {"name": line.rstrip(":"), "ips": [], "gateway": False}
            continue
        if not current:
            continue
        if "IPv4" in line and ":" in line:
            candidate = line.rsplit(":", 1)[-1].strip()
            if is_private_ipv4(candidate):
                current["ips"].append(candidate)
        if ("Default Gateway" in line or "默认网关" in line) and ":" in line:
            gateway = line.rsplit(":", 1)[-1].strip()
            if gateway:
                current["gateway"] = True
    if current:
        adapters.append(current)

    usable = [item for item in adapters if item.get("ips")]
    with_gateway = [item for item in usable if item.get("gateway")]
    preferred = with_gateway or usable

    def adapter_score(adapter: Dict[str, Any]) -> int:
        name = str(adapter.get("name", "")).lower()
        score = 0
        if any(token in name for token in ["wlan", "wi-fi", "wireless", "无线", "以太网", "ethernet"]):
            score += 20
        if any(token in name for token in ["vmware", "virtualbox", "hyper-v", "vethernet", "virtual", "虚拟"]):
            score -= 50
        if adapter.get("gateway"):
            score += 100
        return score

    preferred.sort(key=adapter_score, reverse=True)
    return preferred[0]["ips"][0] if preferred else None


def get_lan_ip() -> str:
    primary_ip = get_windows_primary_lan_ip()
    if primary_ip:
        return primary_ip

    hostname = socket.gethostname()
    try:
        candidates = socket.getaddrinfo(hostname, None, socket.AF_INET)
    except OSError:
        candidates = []

    for item in candidates:
        host = item[4][0]
        if is_lan_address(host) and not ip_address(host).is_loopback:
            return host
    return "127.0.0.1"


def is_lan_address(host: str) -> bool:
    try:
        address = ip_address(host.split("%")[0])
    except ValueError:
        return False
    return address.is_private or address.is_loopback or address.is_link_local


def is_server_client(host: str) -> bool:
    try:
        address = ip_address(host.split("%")[0])
    except ValueError:
        return False
    if address.is_loopback:
        return True
    return str(address) == get_lan_ip()


def get_client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def cleanup_active_clients() -> None:
    cutoff = utc_ts() - ACTIVE_CLIENT_SECONDS
    stale_keys = [
        key for key, item in ACTIVE_CLIENTS.items()
        if int(item.get("last_seen_ts", 0)) < cutoff
    ]
    for key in stale_keys:
        ACTIVE_CLIENTS.pop(key, None)


def track_active_client(request: Request) -> None:
    client_host = request.client.host if request.client else ""
    if not client_host or request.url.path.startswith("/assets"):
        return
    cleanup_active_clients()
    user_agent = request.headers.get("user-agent", "")
    client_key = get_client_key(request)
    existing = ACTIVE_CLIENTS.get(client_key, {})
    ACTIVE_CLIENTS[client_key] = {
        **existing,
        "ip": client_host,
        "user_agent": user_agent[:160],
        "is_server": is_server_client(client_host),
        "last_seen": now_iso(),
        "last_seen_ts": utc_ts(),
    }


def get_active_client_summary() -> Dict[str, Any]:
    cleanup_active_clients()
    clients = list(ACTIVE_CLIENTS.values())
    remote_clients = [item for item in clients if not item.get("is_server")]
    return {
        "active_device_count": len(clients),
        "remote_device_count": len(remote_clients),
        "remote_logged_in_count": len([item for item in remote_clients if item.get("username")]),
        "clients": [
            {
                "ip": item.get("ip", ""),
                "is_server": bool(item.get("is_server")),
                "username": item.get("username", ""),
                "real_name": item.get("real_name", ""),
                "logged_in": bool(item.get("username")),
                "login_at": item.get("login_at", ""),
                "last_seen": item.get("last_seen", ""),
                "user_agent": item.get("user_agent", ""),
            }
            for item in sorted(clients, key=lambda item: item.get("last_seen_ts", 0), reverse=True)
        ],
    }


def mark_client_logged_in(request: Request, user: sqlite3.Row) -> None:
    client_host = request.client.host if request.client else ""
    if not client_host:
        return
    track_active_client(request)
    client_key = get_client_key(request)
    ACTIVE_CLIENTS.setdefault(client_key, {})
    ACTIVE_CLIENTS[client_key].update({
        "ip": client_host,
        "is_server": is_server_client(client_host),
        "username": user["username"],
        "real_name": user["real_name"],
        "login_at": now_iso(),
        "last_seen": now_iso(),
        "last_seen_ts": utc_ts(),
    })


def mark_client_logged_out(request: Request) -> None:
    client_key = get_client_key(request)
    if client_key not in ACTIVE_CLIENTS:
        return
    ACTIVE_CLIENTS[client_key].update({
        "username": "",
        "real_name": "",
        "login_at": "",
        "last_seen": now_iso(),
        "last_seen_ts": utc_ts(),
    })


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def get_secret() -> bytes:
    ensure_dirs()
    if not SECRET_PATH.exists():
        SECRET_PATH.write_bytes(os.urandom(48))
    return SECRET_PATH.read_bytes()


def encode_token(payload: Dict[str, Any]) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_part = b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_part = b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    signature = hmac.new(get_secret(), signing_input, hashlib.sha256).digest()
    return f"{header_part}.{payload_part}.{b64url_encode(signature)}"


def decode_token(token: str) -> Dict[str, Any]:
    try:
        header_part, payload_part, signature_part = token.split(".")
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="无效登录凭证") from exc

    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    expected = hmac.new(get_secret(), signing_input, hashlib.sha256).digest()
    supplied = b64url_decode(signature_part)
    if not hmac.compare_digest(expected, supplied):
        raise HTTPException(status_code=401, detail="无效登录凭证")

    payload = json.loads(b64url_decode(payload_part))
    if int(payload.get("exp", 0)) < utc_ts():
        raise HTTPException(status_code=401, detail="登录已过期")
    return payload


def hash_password(password: str) -> str:
    if bcrypt is None:
        raise RuntimeError("缺少 bcrypt 依赖，请按部署文档离线安装 backend/requirements.txt")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    if bcrypt is None:
        raise RuntimeError("缺少 bcrypt 依赖，请按部署文档离线安装 backend/requirements.txt")
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def validate_password_strength(password: str) -> None:
    if not password:
        raise HTTPException(status_code=400, detail="请输入新密码，或留空让系统自动生成")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="密码至少需要8位")
    if not any(ch.isalpha() for ch in password) or not any(ch.isdigit() for ch in password):
        raise HTTPException(status_code=400, detail="密码必须同时包含字母和数字")


def generate_secure_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if any(ch.isalpha() for ch in password) and any(ch.isdigit() for ch in password):
            return password


def dict_from_row(row: sqlite3.Row | None) -> Optional[Dict[str, Any]]:
    return dict(row) if row else None


def create_id(prefix: str = "") -> str:
    return f"{prefix}{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"


def audit_log(
    conn: sqlite3.Connection,
    request: Request,
    username: str,
    real_name: str,
    action_type: str,
    content: str,
    result: str = "成功",
) -> None:
    conn.execute(
        """
        INSERT INTO audit_logs (
          id, created_at, username, real_name, ip_address, action_type, content, result
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            create_id("log_"),
            now_iso(),
            username,
            real_name,
            request.client.host if request.client else "",
            action_type,
            content,
            result,
        ),
    )
    conn.commit()


def all_permissions(value: bool = True) -> Dict[str, Dict[str, bool]]:
    return {
        module: {action: value for action in PERMISSION_ACTIONS}
        for module in PERMISSION_MODULES
    }


def normalize_permissions(raw: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, bool]]:
    normalized: Dict[str, Dict[str, bool]] = {}
    for module in PERMISSION_MODULES:
        module_perms = raw.get(module, {}) if isinstance(raw, dict) else {}
        normalized[module] = {
            action: bool(module_perms.get(action, False))
            for action in PERMISSION_ACTIONS
        }

    if isinstance(raw, dict):
        for legacy_module, target_modules in LEGACY_PERMISSION_ALIASES.items():
            legacy_perms = raw.get(legacy_module, {})
            if not isinstance(legacy_perms, dict):
                continue
            for target_module in target_modules:
                if target_module not in normalized:
                    continue
                for action in PERMISSION_ACTIONS:
                    normalized[target_module][action] = normalized[target_module][action] or bool(legacy_perms.get(action, False))
    return normalized


def set_role_permissions(conn: sqlite3.Connection, role_id: int, permissions: Dict[str, Dict[str, bool]]) -> None:
    conn.execute("DELETE FROM role_permissions WHERE role_id = ?", (role_id,))
    for module, actions in normalize_permissions(permissions).items():
        for action, allowed in actions.items():
            conn.execute(
                "INSERT INTO role_permissions (role_id, module, action, allowed) VALUES (?, ?, ?, ?)",
                (role_id, module, action, 1 if allowed else 0),
            )


def set_user_permissions(conn: sqlite3.Connection, user_id: int, permissions: Dict[str, Dict[str, bool]]) -> None:
    conn.execute("DELETE FROM user_permissions WHERE user_id = ?", (user_id,))
    for module, actions in normalize_permissions(permissions).items():
        for action, allowed in actions.items():
            conn.execute(
                "INSERT INTO user_permissions (user_id, module, action, allowed) VALUES (?, ?, ?, ?)",
                (user_id, module, action, 1 if allowed else 0),
            )


def set_user_roles(conn: sqlite3.Connection, user_id: int, role_ids: Iterable[int]) -> None:
    conn.execute("DELETE FROM user_roles WHERE user_id = ?", (user_id,))
    for role_id in role_ids:
        conn.execute("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)", (user_id, role_id))


def get_effective_permissions(conn: sqlite3.Connection, user_id: int) -> Dict[str, Dict[str, bool]]:
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        return all_permissions(False)
    if int(user["is_admin"]):
        return all_permissions(True)

    permissions = all_permissions(False)
    role_rows = conn.execute(
        """
        SELECT rp.module, rp.action, rp.allowed
        FROM role_permissions rp
        JOIN user_roles ur ON ur.role_id = rp.role_id
        WHERE ur.user_id = ?
        """,
        (user_id,),
    ).fetchall()
    def apply_permission_row(module: str, action: str, allowed: Any) -> None:
        target_modules = [module]
        if module in LEGACY_PERMISSION_ALIASES:
            target_modules = LEGACY_PERMISSION_ALIASES[module]
        for target_module in target_modules:
            if target_module in permissions and action in permissions[target_module]:
                permissions[target_module][action] = bool(allowed)

    for row in role_rows:
        apply_permission_row(row["module"], row["action"], row["allowed"])

    direct_rows = conn.execute(
        "SELECT module, action, allowed FROM user_permissions WHERE user_id = ?",
        (user_id,),
    ).fetchall()
    for row in direct_rows:
        apply_permission_row(row["module"], row["action"], row["allowed"])
    return permissions


def has_permission(conn: sqlite3.Connection, user_id: int, module: str, action: str) -> bool:
    user = conn.execute("SELECT is_admin FROM users WHERE id = ?", (user_id,)).fetchone()
    if user and int(user["is_admin"]):
        return True
    permissions = get_effective_permissions(conn, user_id)
    return bool(permissions.get(module, {}).get(action))


def require_permission(module: str, action: str):
    def checker(current: Dict[str, Any] = Depends(csrf_required)):
        with get_conn() as conn:
            if not has_permission(conn, current["id"], module, action):
                raise HTTPException(status_code=403, detail="无权限执行该操作")
        return current
    return checker


def get_current_user(request: Request) -> Dict[str, Any]:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="请先登录")
    token = auth_header.removeprefix("Bearer ").strip()
    payload = decode_token(token)

    with get_conn() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (payload.get("sub"),)).fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="账号不存在")
        if user["status"] != "enabled":
            raise HTTPException(status_code=403, detail="账号已禁用")

        return serialize_user(conn, user)


def require_admin(current: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if not current.get("is_admin"):
        raise HTTPException(status_code=403, detail="仅超级管理员可操作")
    return current


def csrf_required(request: Request, current: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return current
    token = request.headers.get("X-CSRF-Token")
    expected = csrf_token_for_user(current["id"])
    if not token or not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=403, detail="CSRF校验失败")
    return current


def csrf_token_for_user(user_id: int) -> str:
    return hmac.new(get_secret(), f"csrf:{user_id}".encode("utf-8"), hashlib.sha256).hexdigest()


def require_admin_csrf(current: Dict[str, Any] = Depends(csrf_required)) -> Dict[str, Any]:
    if not current.get("is_admin"):
        raise HTTPException(status_code=403, detail="仅超级管理员可操作")
    return current


def serialize_user(conn: sqlite3.Connection, row: sqlite3.Row) -> Dict[str, Any]:
    role_rows = conn.execute(
        "SELECT role_id FROM user_roles WHERE user_id = ?",
        (row["id"],),
    ).fetchall()
    return {
        "id": row["id"],
        "username": row["username"],
        "real_name": row["real_name"],
        "status": row["status"],
        "created_at": row["created_at"],
        "last_login_at": row["last_login_at"],
        "last_login_ip": row["last_login_ip"],
        "notes": row["notes"] or "",
        "is_admin": bool(row["is_admin"]),
        "password_policy": "密码使用bcrypt哈希存储，不可查看历史明文；admin可为普通用户设置新密码",
        "role_ids": [item["role_id"] for item in role_rows],
        "permissions": get_effective_permissions(conn, row["id"]),
    }


def init_db() -> None:
    ensure_dirs()
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT NOT NULL UNIQUE,
              real_name TEXT NOT NULL,
              password_hash TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'enabled',
              is_admin INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              last_login_at TEXT,
              last_login_ip TEXT,
              notes TEXT,
              failed_attempts INTEGER NOT NULL DEFAULT 0,
              locked_until INTEGER
            );

            CREATE TABLE IF NOT EXISTS roles (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL UNIQUE,
              description TEXT,
              is_system INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS role_permissions (
              role_id INTEGER NOT NULL,
              module TEXT NOT NULL,
              action TEXT NOT NULL,
              allowed INTEGER NOT NULL DEFAULT 0,
              PRIMARY KEY (role_id, module, action),
              FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS user_roles (
              user_id INTEGER NOT NULL,
              role_id INTEGER NOT NULL,
              PRIMARY KEY (user_id, role_id),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS user_permissions (
              user_id INTEGER NOT NULL,
              module TEXT NOT NULL,
              action TEXT NOT NULL,
              allowed INTEGER NOT NULL DEFAULT 0,
              PRIMARY KEY (user_id, module, action),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS business_records (
              collection TEXT NOT NULL,
              record_id TEXT NOT NULL,
              data TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT,
              PRIMARY KEY (collection, record_id)
            );

            CREATE TABLE IF NOT EXISTS settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
              id TEXT PRIMARY KEY,
              created_at TEXT NOT NULL,
              username TEXT NOT NULL,
              real_name TEXT NOT NULL,
              ip_address TEXT NOT NULL,
              action_type TEXT NOT NULL,
              content TEXT NOT NULL,
              result TEXT NOT NULL
            );
            """
        )

        admin_role = conn.execute("SELECT id FROM roles WHERE name = ?", ("超级管理员",)).fetchone()
        if not admin_role:
            cur = conn.execute(
                "INSERT INTO roles (name, description, is_system, created_at) VALUES (?, ?, 1, ?)",
                ("超级管理员", "系统最高权限角色", now_iso()),
            )
            admin_role_id = cur.lastrowid
        else:
            admin_role_id = admin_role["id"]
        set_role_permissions(conn, admin_role_id, all_permissions(True))

        viewer_role = conn.execute("SELECT id FROM roles WHERE name = ?", ("普通用户",)).fetchone()
        viewer_permissions = all_permissions(False)
        for module in [
            "dashboard",
            "customers",
            "products",
            "coatingProcesses",
            "processCombinations",
            "materials",
            "materialTypes",
            "materialColors",
            "materialSuppliers",
            "inboundRecords",
            "outboundRecords",
            "materialInboundRecords",
            "materialOutboundRecords",
            "materialRecycleRecords",
            "materialConsumptionRecords",
            "inventory",
            "reports",
        ]:
            viewer_permissions[module]["view"] = True
        if not viewer_role:
            cur = conn.execute(
                "INSERT INTO roles (name, description, is_system, created_at) VALUES (?, ?, 1, ?)",
                ("普通用户", "默认只读业务角色", now_iso()),
            )
            viewer_role_id = cur.lastrowid
        else:
            viewer_role_id = viewer_role["id"]
        set_role_permissions(conn, viewer_role_id, viewer_permissions)

        if not conn.execute("SELECT id FROM users WHERE username = ?", ("admin",)).fetchone():
            conn.execute(
                """
                INSERT INTO users (username, real_name, password_hash, status, is_admin, created_at, notes)
                VALUES (?, ?, ?, 'enabled', 1, ?, ?)
                """,
                ("admin", "超级管理员", hash_password("admin123"), now_iso(), "系统预设账号，不可删除"),
            )
            admin_id = conn.execute("SELECT id FROM users WHERE username = ?", ("admin",)).fetchone()["id"]
            set_user_roles(conn, admin_id, [admin_role_id])

        if not conn.execute("SELECT id FROM users WHERE username = ?", ("user01",)).fetchone():
            conn.execute(
                """
                INSERT INTO users (username, real_name, password_hash, status, is_admin, created_at, notes)
                VALUES (?, ?, ?, 'enabled', 0, ?, ?)
                """,
                ("user01", "普通测试用户", hash_password("user1234"), now_iso(), "预设普通测试账号"),
            )
            user_id = conn.execute("SELECT id FROM users WHERE username = ?", ("user01",)).fetchone()["id"]
            set_user_roles(conn, user_id, [viewer_role_id])

        if not conn.execute("SELECT key FROM settings WHERE key = 'systemSettings'").fetchone():
            conn.execute(
                "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
                ("systemSettings", json.dumps(DEFAULT_SYSTEM_SETTINGS, ensure_ascii=False), now_iso()),
            )

        seed_default_business_data(conn)
        conn.commit()


def seed_default_business_data(conn: sqlite3.Connection) -> None:
    if conn.execute("SELECT 1 FROM business_records LIMIT 1").fetchone():
        return
    created = now_iso()
    defaults = {
        "customers": [
            {
                "id": "customer_1",
                "code": "C0001",
                "name": "示例客户",
                "contact": "张三",
                "phone": "13800138000",
                "address": "江苏省南通市",
                "notes": "示例客户信息",
                "createdAt": created,
            }
        ],
        "coatingProcesses": [
            {"id": "process_1", "code": "P001", "name": "喷粉", "type": "single", "createdAt": created},
            {"id": "process_2", "code": "P002", "name": "电泳", "type": "single", "createdAt": created},
            {"id": "process_3", "code": "P003", "name": "喷漆", "type": "single", "createdAt": created},
            {"id": "process_4", "code": "P004", "name": "喷砂", "type": "single", "createdAt": created},
        ],
        "materialTypes": [
            {"id": "type_1", "name": "钢材", "description": "各种规格的钢材", "createdAt": created},
            {"id": "type_2", "name": "铝材", "description": "各种规格的铝材", "createdAt": created},
            {"id": "type_3", "name": "塑料", "description": "塑料材料", "createdAt": created},
        ],
        "materialSuppliers": [
            {"id": "supplier_1", "name": "宝钢集团", "contact": "李经理", "phone": "021-12345678", "address": "上海市宝山区", "createdAt": created},
            {"id": "supplier_2", "name": "沙钢集团", "contact": "刘经理", "phone": "0512-87654321", "address": "江苏省张家港市", "createdAt": created},
        ],
    }
    for collection, rows in defaults.items():
        for row in rows:
            upsert_record(conn, collection, row["id"], row)


def list_records(conn: sqlite3.Connection, collection: str) -> List[Dict[str, Any]]:
    rows = conn.execute(
        "SELECT data FROM business_records WHERE collection = ? ORDER BY created_at ASC",
        (collection,),
    ).fetchall()
    return [json.loads(row["data"]) for row in rows]


def upsert_record(conn: sqlite3.Connection, collection: str, record_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    existing = conn.execute(
        "SELECT created_at FROM business_records WHERE collection = ? AND record_id = ?",
        (collection, record_id),
    ).fetchone()
    record = dict(data)
    record["id"] = record_id
    if not record.get("createdAt"):
        record["createdAt"] = existing["created_at"] if existing else now_iso()
    updated = now_iso()
    conn.execute(
        """
        INSERT INTO business_records (collection, record_id, data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(collection, record_id) DO UPDATE SET
          data = excluded.data,
          updated_at = excluded.updated_at
        """,
        (collection, record_id, json.dumps(record, ensure_ascii=False), record.get("createdAt"), updated),
    )
    return record


def get_snapshot(conn: sqlite3.Connection, current: Dict[str, Any]) -> Dict[str, Any]:
    data: Dict[str, Any] = {}
    for collection in COLLECTION_KEYS:
        module = COLLECTION_MODULE.get(collection, collection)
        data[collection] = list_records(conn, collection) if has_permission(conn, current["id"], module, "view") else []
    settings = conn.execute("SELECT value FROM settings WHERE key = 'systemSettings'").fetchone()
    data["systemSettings"] = json.loads(settings["value"]) if settings else DEFAULT_SYSTEM_SETTINGS
    data["schemaVersion"] = 1
    data["savedAt"] = now_iso()
    return data


def build_token_response(conn: sqlite3.Connection, user: sqlite3.Row, remember: bool = False) -> Dict[str, Any]:
    ttl = timedelta(days=REMEMBER_TOKEN_DAYS) if remember else timedelta(hours=ACCESS_TOKEN_HOURS)
    exp = int((datetime.now(timezone.utc) + ttl).timestamp())
    token = encode_token({"sub": user["id"], "username": user["username"], "exp": exp})
    serialized = serialize_user(conn, user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_at": exp,
        "csrf_token": csrf_token_for_user(user["id"]),
        "user": serialized,
        "permissions": serialized["permissions"],
    }


app = FastAPI(title="LAN Inventory API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
)


@app.middleware("http")
async def block_non_lan_clients(request: Request, call_next):
    client_host = request.client.host if request.client else ""
    if client_host and not is_lan_address(client_host):
        return JSONResponse(status_code=403, content={"detail": "仅允许局域网访问"})
    track_active_client(request)
    return await call_next(request)


@app.on_event("startup")
def startup_event() -> None:
    init_db()


@app.get(f"{API_PREFIX}/health")
def health(request: Request) -> Dict[str, Any]:
    client_host = request.client.host if request.client else ""
    active_summary = get_active_client_summary()
    server_client = is_server_client(client_host)
    return {
        "status": "ok",
        "backend_ok": True,
        "server_role": "server",
        "is_server_client": server_client,
        "client_ip": client_host,
        "lan_ip": get_lan_ip(),
        "port": PORT,
        "data_file": str(DB_PATH),
        "frontend_dist": FRONTEND_DIST.exists(),
        "started_at": STARTED_AT,
        "active_device_count": active_summary["active_device_count"],
        "remote_device_count": active_summary["remote_device_count"],
        "remote_logged_in_count": active_summary["remote_logged_in_count"],
        "active_clients": active_summary["clients"] if server_client else [],
        "startup_script": {
            "name": "start_lan_system.bat",
            "path": str(PROJECT_DIR / "start_lan_system.bat"),
            "download_url": f"{API_PREFIX}/server/start-script",
        },
    }


@app.get(f"{API_PREFIX}/server/start-script")
def download_start_script(request: Request):
    script_path = PROJECT_DIR / "start_lan_system.bat"
    if not script_path.exists():
        raise HTTPException(status_code=404, detail="启动脚本不存在")
    return FileResponse(script_path, filename="start_lan_system.bat", media_type="application/octet-stream")


@app.get(f"{API_PREFIX}/server/clients")
def list_server_clients(request: Request, current: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    client_host = request.client.host if request.client else ""
    if not is_server_client(client_host) and not current.get("is_admin"):
        raise HTTPException(status_code=403, detail="仅服务器本机或admin可查看连接设备")
    active_summary = get_active_client_summary()
    return {
        "active_device_count": active_summary["active_device_count"],
        "remote_device_count": active_summary["remote_device_count"],
        "remote_logged_in_count": active_summary["remote_logged_in_count"],
        "items": active_summary["clients"],
    }


@app.post(f"{API_PREFIX}/auth/login")
def login(payload: LoginRequest, request: Request) -> Dict[str, Any]:
    with get_conn() as conn:
        user = conn.execute("SELECT * FROM users WHERE username = ?", (payload.username,)).fetchone()
        if not user:
            audit_log(conn, request, payload.username, "", "登录", "账号不存在", "失败")
            raise HTTPException(status_code=401, detail="用户名或密码错误")

        if user["status"] != "enabled":
            audit_log(conn, request, user["username"], user["real_name"], "登录", "账号已禁用", "失败")
            raise HTTPException(status_code=403, detail="账号已禁用")

        if user["locked_until"] and int(user["locked_until"]) > utc_ts():
            audit_log(conn, request, user["username"], user["real_name"], "登录", "账号临时锁定", "失败")
            raise HTTPException(status_code=423, detail="登录失败次数过多，请5分钟后再试")

        if not verify_password(payload.password, user["password_hash"]):
            failed = int(user["failed_attempts"] or 0) + 1
            locked_until = utc_ts() + LOCK_MINUTES * 60 if failed >= MAX_FAILED_ATTEMPTS else None
            conn.execute(
                "UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?",
                (failed, locked_until, user["id"]),
            )
            audit_log(conn, request, user["username"], user["real_name"], "登录", f"密码错误，第{failed}次", "失败")
            raise HTTPException(status_code=401, detail="用户名或密码错误")

        login_at = now_iso()
        login_ip = request.client.host if request.client else ""
        conn.execute(
            """
            UPDATE users SET failed_attempts = 0, locked_until = NULL,
              last_login_at = ?, last_login_ip = ? WHERE id = ?
            """,
            (login_at, login_ip, user["id"]),
        )
        conn.commit()
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
        mark_client_logged_in(request, user)
        audit_log(conn, request, user["username"], user["real_name"], "登录", "登录成功", "成功")
        return build_token_response(conn, user, payload.remember)


@app.get(f"{API_PREFIX}/auth/me")
def me(current: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return current


@app.post(f"{API_PREFIX}/auth/refresh")
def refresh(current: Dict[str, Any] = Depends(csrf_required)) -> Dict[str, Any]:
    with get_conn() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (current["id"],)).fetchone()
        return build_token_response(conn, user, remember=False)


@app.post(f"{API_PREFIX}/auth/logout")
def logout(request: Request, current: Dict[str, Any] = Depends(csrf_required)) -> Dict[str, str]:
    with get_conn() as conn:
        audit_log(conn, request, current["username"], current["real_name"], "登出", "主动退出登录", "成功")
    mark_client_logged_out(request)
    return {"message": "已退出"}


@app.get(f"{API_PREFIX}/permissions/modules")
def permission_modules(current: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return {"modules": PERMISSION_MODULES, "actions": PERMISSION_ACTIONS}


@app.get(f"{API_PREFIX}/data/snapshot")
def data_snapshot(current: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    with get_conn() as conn:
        return get_snapshot(conn, current)


@app.put(f"{API_PREFIX}/data/snapshot")
def restore_snapshot(payload: SnapshotPayload, request: Request, current: Dict[str, Any] = Depends(require_admin_csrf)) -> Dict[str, str]:
    with get_conn() as conn:
        for collection in COLLECTION_KEYS:
            conn.execute("DELETE FROM business_records WHERE collection = ?", (collection,))
            for item in payload.data.get(collection, []):
                record_id = item.get("id") or create_id(f"{collection}_")
                upsert_record(conn, collection, record_id, item)
        if "systemSettings" in payload.data:
            conn.execute(
                """
                INSERT INTO settings (key, value, updated_at) VALUES ('systemSettings', ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                """,
                (json.dumps(payload.data["systemSettings"], ensure_ascii=False), now_iso()),
            )
        audit_log(conn, request, current["username"], current["real_name"], "数据库恢复", "通过快照恢复业务数据", "成功")
        conn.commit()
    return {"message": "数据已恢复"}


@app.get(f"{API_PREFIX}/data/{{collection}}")
def get_collection(collection: str, current: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if collection not in COLLECTION_KEYS:
        raise HTTPException(status_code=404, detail="未知数据集合")
    module = COLLECTION_MODULE.get(collection, collection)
    with get_conn() as conn:
        if not has_permission(conn, current["id"], module, "view"):
            raise HTTPException(status_code=403, detail="无权限查看")
        return {"items": list_records(conn, collection)}


@app.post(f"{API_PREFIX}/data/{{collection}}")
def create_record(collection: str, payload: RecordPayload, request: Request, current: Dict[str, Any] = Depends(csrf_required)) -> Dict[str, Any]:
    if collection not in COLLECTION_KEYS:
        raise HTTPException(status_code=404, detail="未知数据集合")
    module = COLLECTION_MODULE.get(collection, collection)
    with get_conn() as conn:
        if not has_permission(conn, current["id"], module, "create"):
            raise HTTPException(status_code=403, detail="无权限新增")
        record_id = payload.id or payload.data.get("id") or create_id(f"{collection}_")
        record = upsert_record(conn, collection, record_id, payload.data)
        audit_log(conn, request, current["username"], current["real_name"], "新增", f"新增 {collection} / {record_id}", "成功")
        conn.commit()
        return {"item": record}


@app.put(f"{API_PREFIX}/data/{{collection}}/{{record_id}}")
def update_record(collection: str, record_id: str, payload: RecordPayload, request: Request, current: Dict[str, Any] = Depends(csrf_required)) -> Dict[str, Any]:
    if collection not in COLLECTION_KEYS:
        raise HTTPException(status_code=404, detail="未知数据集合")
    module = COLLECTION_MODULE.get(collection, collection)
    with get_conn() as conn:
        if not has_permission(conn, current["id"], module, "update"):
            raise HTTPException(status_code=403, detail="无权限修改")
        exists = conn.execute(
            "SELECT 1 FROM business_records WHERE collection = ? AND record_id = ?",
            (collection, record_id),
        ).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="记录不存在")
        record = upsert_record(conn, collection, record_id, payload.data)
        audit_log(conn, request, current["username"], current["real_name"], "修改", f"修改 {collection} / {record_id}", "成功")
        conn.commit()
        return {"item": record}


@app.delete(f"{API_PREFIX}/data/{{collection}}/{{record_id}}")
def delete_record(collection: str, record_id: str, request: Request, current: Dict[str, Any] = Depends(csrf_required)) -> Dict[str, str]:
    if collection not in COLLECTION_KEYS:
        raise HTTPException(status_code=404, detail="未知数据集合")
    module = COLLECTION_MODULE.get(collection, collection)
    with get_conn() as conn:
        if not has_permission(conn, current["id"], module, "delete"):
            raise HTTPException(status_code=403, detail="无权限删除")
        conn.execute("DELETE FROM business_records WHERE collection = ? AND record_id = ?", (collection, record_id))
        audit_log(conn, request, current["username"], current["real_name"], "删除", f"删除 {collection} / {record_id}", "成功")
        conn.commit()
    return {"message": "已删除"}


@app.put(f"{API_PREFIX}/settings")
def update_settings(payload: Dict[str, Any], request: Request, current: Dict[str, Any] = Depends(csrf_required)) -> Dict[str, Any]:
    with get_conn() as conn:
        if not has_permission(conn, current["id"], "settings", "update"):
            raise HTTPException(status_code=403, detail="无权限修改系统设置")
        existing = conn.execute("SELECT value FROM settings WHERE key = 'systemSettings'").fetchone()
        settings = json.loads(existing["value"]) if existing else DEFAULT_SYSTEM_SETTINGS
        settings.update(payload)
        conn.execute(
            """
            INSERT INTO settings (key, value, updated_at) VALUES ('systemSettings', ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            """,
            (json.dumps(settings, ensure_ascii=False), now_iso()),
        )
        audit_log(conn, request, current["username"], current["real_name"], "修改", "修改系统设置", "成功")
        conn.commit()
        return {"systemSettings": settings}


@app.get(f"{API_PREFIX}/admin/users")
def list_users(current: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
        return {"items": [serialize_user(conn, row) for row in rows]}


@app.post(f"{API_PREFIX}/admin/users")
def create_user(payload: UserCreate, request: Request, current: Dict[str, Any] = Depends(require_admin_csrf)) -> Dict[str, Any]:
    initial_password = payload.password or generate_secure_password()
    validate_password_strength(initial_password)
    with get_conn() as conn:
        try:
            cur = conn.execute(
                """
                INSERT INTO users (username, real_name, password_hash, status, is_admin, created_at, notes)
                VALUES (?, ?, ?, ?, 0, ?, ?)
                """,
                (payload.username, payload.real_name, hash_password(initial_password), payload.status, now_iso(), payload.notes),
            )
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=400, detail="用户名已存在") from exc
        user_id = cur.lastrowid
        set_user_roles(conn, user_id, payload.role_ids)
        set_user_permissions(conn, user_id, payload.permissions)
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        audit_log(conn, request, current["username"], current["real_name"], "新增", f"新增账号 {payload.username}", "成功")
        conn.commit()
        return {
            "item": serialize_user(conn, row),
            "temporary_password": initial_password,
            "notice": "该密码仅本次返回，系统不会保存明文密码",
        }


@app.put(f"{API_PREFIX}/admin/users/{{user_id}}")
def update_user(user_id: int, payload: UserUpdate, request: Request, current: Dict[str, Any] = Depends(require_admin_csrf)) -> Dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="用户不存在")
        updates = {
            "username": payload.username if payload.username is not None else row["username"],
            "real_name": payload.real_name if payload.real_name is not None else row["real_name"],
            "status": payload.status if payload.status is not None else row["status"],
            "notes": payload.notes if payload.notes is not None else (row["notes"] or ""),
        }
        if row["username"] == "admin":
            updates["username"] = "admin"
            updates["status"] = "enabled"
        try:
            conn.execute(
                "UPDATE users SET username = ?, real_name = ?, status = ?, notes = ? WHERE id = ?",
                (updates["username"], updates["real_name"], updates["status"], updates["notes"], user_id),
            )
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=400, detail="用户名已存在") from exc
        if payload.role_ids is not None:
            set_user_roles(conn, user_id, payload.role_ids)
        if payload.permissions is not None:
            set_user_permissions(conn, user_id, payload.permissions)
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        audit_log(conn, request, current["username"], current["real_name"], "权限变更", f"修改账号 {row['username']} 的信息或权限", "成功")
        conn.commit()
        return {"item": serialize_user(conn, row)}


@app.delete(f"{API_PREFIX}/admin/users/{{user_id}}")
def delete_user(user_id: int, request: Request, current: Dict[str, Any] = Depends(require_admin_csrf)) -> Dict[str, str]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="用户不存在")
        if row["username"] == "admin":
            raise HTTPException(status_code=400, detail="admin账号不可删除")
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        audit_log(conn, request, current["username"], current["real_name"], "删除", f"删除账号 {row['username']}", "成功")
        conn.commit()
    return {"message": "用户已删除"}


@app.post(f"{API_PREFIX}/admin/users/{{user_id}}/reset-password")
def reset_user_password(user_id: int, payload: PasswordReset, request: Request, current: Dict[str, Any] = Depends(require_admin_csrf)) -> Dict[str, str]:
    new_password = payload.password or generate_secure_password()
    validate_password_strength(new_password)
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="用户不存在")
        if int(row["is_admin"]):
            raise HTTPException(status_code=400, detail="admin密码请在个人中心修改")
        conn.execute("UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?", (hash_password(new_password), user_id))
        audit_log(conn, request, current["username"], current["real_name"], "修改", f"重置账号 {row['username']} 的密码", "成功")
        conn.commit()
    return {
        "message": "密码已重置",
        "temporary_password": new_password,
        "notice": "该密码仅本次返回，系统不会保存明文密码",
    }


@app.get(f"{API_PREFIX}/admin/roles")
def list_roles(current: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    with get_conn() as conn:
        roles = []
        for row in conn.execute("SELECT * FROM roles ORDER BY id ASC").fetchall():
            perms: Dict[str, Dict[str, bool]] = all_permissions(False)
            for perm in conn.execute("SELECT module, action, allowed FROM role_permissions WHERE role_id = ?", (row["id"],)).fetchall():
                for target_module in LEGACY_PERMISSION_ALIASES.get(perm["module"], [perm["module"]]):
                    if target_module in perms and perm["action"] in perms[target_module]:
                        perms[target_module][perm["action"]] = bool(perm["allowed"])
            roles.append({**dict(row), "permissions": perms})
        return {"items": roles}


@app.post(f"{API_PREFIX}/admin/roles")
def create_role(payload: RolePayload, request: Request, current: Dict[str, Any] = Depends(require_admin_csrf)) -> Dict[str, Any]:
    with get_conn() as conn:
        try:
            cur = conn.execute(
                "INSERT INTO roles (name, description, is_system, created_at) VALUES (?, ?, 0, ?)",
                (payload.name, payload.description, now_iso()),
            )
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=400, detail="角色名已存在") from exc
        set_role_permissions(conn, cur.lastrowid, payload.permissions)
        audit_log(conn, request, current["username"], current["real_name"], "权限变更", f"新增角色 {payload.name}", "成功")
        conn.commit()
        return {"id": cur.lastrowid}


@app.put(f"{API_PREFIX}/admin/roles/{{role_id}}")
def update_role(role_id: int, payload: RolePayload, request: Request, current: Dict[str, Any] = Depends(require_admin_csrf)) -> Dict[str, str]:
    with get_conn() as conn:
        role = conn.execute("SELECT * FROM roles WHERE id = ?", (role_id,)).fetchone()
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        conn.execute("UPDATE roles SET name = ?, description = ? WHERE id = ?", (payload.name, payload.description, role_id))
        set_role_permissions(conn, role_id, payload.permissions)
        audit_log(conn, request, current["username"], current["real_name"], "权限变更", f"修改角色 {payload.name}", "成功")
        conn.commit()
    return {"message": "角色已更新"}


@app.delete(f"{API_PREFIX}/admin/roles/{{role_id}}")
def delete_role(role_id: int, request: Request, current: Dict[str, Any] = Depends(require_admin_csrf)) -> Dict[str, str]:
    with get_conn() as conn:
        role = conn.execute("SELECT * FROM roles WHERE id = ?", (role_id,)).fetchone()
        if not role:
            raise HTTPException(status_code=404, detail="角色不存在")
        if int(role["is_system"]):
            raise HTTPException(status_code=400, detail="系统角色不可删除")
        conn.execute("DELETE FROM roles WHERE id = ?", (role_id,))
        audit_log(conn, request, current["username"], current["real_name"], "权限变更", f"删除角色 {role['name']}", "成功")
        conn.commit()
    return {"message": "角色已删除"}


@app.put(f"{API_PREFIX}/profile")
def update_profile(payload: ProfileUpdate, request: Request, current: Dict[str, Any] = Depends(csrf_required)) -> Dict[str, Any]:
    with get_conn() as conn:
        conn.execute("UPDATE users SET real_name = ?, notes = ? WHERE id = ?", (payload.real_name, payload.notes, current["id"]))
        row = conn.execute("SELECT * FROM users WHERE id = ?", (current["id"],)).fetchone()
        audit_log(conn, request, current["username"], current["real_name"], "修改", "修改个人资料", "成功")
        conn.commit()
        return {"item": serialize_user(conn, row)}


@app.put(f"{API_PREFIX}/profile/password")
def update_profile_password(payload: PasswordChange, request: Request, current: Dict[str, Any] = Depends(csrf_required)) -> Dict[str, str]:
    validate_password_strength(payload.new_password)
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (current["id"],)).fetchone()
        if not verify_password(payload.old_password, row["password_hash"]):
            raise HTTPException(status_code=400, detail="原密码错误")
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(payload.new_password), current["id"]))
        audit_log(conn, request, current["username"], current["real_name"], "修改", "修改个人密码", "成功")
        conn.commit()
    return {"message": "密码已修改"}


@app.get(f"{API_PREFIX}/admin/audit-logs")
def list_audit_logs(
    start: Optional[str] = None,
    end: Optional[str] = None,
    username: Optional[str] = None,
    action_type: Optional[str] = None,
    current: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    sql = "SELECT * FROM audit_logs WHERE 1 = 1"
    params: List[Any] = []
    if start:
        sql += " AND created_at >= ?"
        params.append(start)
    if end:
        sql += " AND created_at <= ?"
        params.append(end)
    if username:
        sql += " AND username LIKE ?"
        params.append(f"%{username}%")
    if action_type:
        sql += " AND action_type = ?"
        params.append(action_type)
    sql += " ORDER BY created_at DESC LIMIT 2000"
    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
        return {"items": [dict(row) for row in rows]}


@app.get(f"{API_PREFIX}/admin/audit-logs/export")
def export_audit_logs(
    start: Optional[str] = None,
    end: Optional[str] = None,
    username: Optional[str] = None,
    action_type: Optional[str] = None,
    current: Dict[str, Any] = Depends(require_admin),
):
    sql = "SELECT * FROM audit_logs WHERE 1 = 1"
    params: List[Any] = []
    if start:
        sql += " AND created_at >= ?"
        params.append(start)
    if end:
        sql += " AND created_at <= ?"
        params.append(end)
    if username:
        sql += " AND username LIKE ?"
        params.append(f"%{username}%")
    if action_type:
        sql += " AND action_type = ?"
        params.append(action_type)
    sql += " ORDER BY created_at DESC"
    with get_conn() as conn:
        rows = [dict(row) for row in conn.execute(sql, params).fetchall()]

    headers = ["操作时间", "用户名", "真实姓名", "IP地址", "操作类型", "操作内容", "操作结果"]
    if Workbook is not None:
        wb = Workbook()
        ws = wb.active
        ws.title = "操作日志"
        ws.append(headers)
        for row in rows:
            ws.append([row["created_at"], row["username"], row["real_name"], row["ip_address"], row["action_type"], row["content"], row["result"]])
        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return StreamingResponse(
            stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=audit_logs.xlsx"},
        )

    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([row["created_at"], row["username"], row["real_name"], row["ip_address"], row["action_type"], row["content"], row["result"]])
    return Response(stream.getvalue(), media_type="text/csv; charset=utf-8")


@app.get(f"{API_PREFIX}/admin/backup/database")
def download_database_backup(request: Request, current: Dict[str, Any] = Depends(require_admin)):
    ensure_dirs()
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"inventory_backup_{stamp}.sqlite3"
    shutil.copy2(DB_PATH, backup_path)
    with get_conn() as conn:
        audit_log(conn, request, current["username"], current["real_name"], "数据库备份", f"导出备份 {backup_path.name}", "成功")
    return FileResponse(backup_path, filename=backup_path.name, media_type="application/octet-stream")


@app.post(f"{API_PREFIX}/admin/backup/restore")
def restore_database_backup(request: Request, file: UploadFile = File(...), current: Dict[str, Any] = Depends(require_admin_csrf)):
    ensure_dirs()
    if not file.filename.endswith(".sqlite3"):
        raise HTTPException(status_code=400, detail="仅支持 .sqlite3 备份文件")
    tmp_path = BACKUP_DIR / f"restore_{int(time.time())}.sqlite3"
    with tmp_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    with sqlite3.connect(tmp_path) as test_conn:
        test_conn.execute("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1").fetchone()
    shutil.copy2(DB_PATH, BACKUP_DIR / f"before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sqlite3")
    shutil.copy2(tmp_path, DB_PATH)
    with get_conn() as conn:
        audit_log(conn, request, current["username"], current["real_name"], "数据库恢复", f"恢复备份 {file.filename}", "成功")
    return {"message": "数据库已恢复，请重启服务"}


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


if FRONTEND_DIST.exists():
    app.mount("/", SPAStaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")


def print_startup_banner() -> None:
    lan_ip = get_lan_ip()
    frontend_mode = "网页+API统一端口" if FRONTEND_DIST.exists() else "仅API端口（未检测到dist）"
    print("")
    print("==============================================")
    print("  局域网进销存系统后端已启动")
    print(f"  本机访问:   http://127.0.0.1:{PORT}")
    print(f"  局域网访问: http://{lan_ip}:{PORT}")
    print(f"  运行模式:   {frontend_mode}")
    print(f"  数据库文件: {DB_PATH}")
    print("  默认账号: admin / admin123")
    print("==============================================")
    print("")


if __name__ == "__main__":
    import uvicorn

    init_db()
    print_startup_banner()
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
