# ===== Codex + Node 代理启动脚本 =====

$proxy = "http://127.0.0.1:10808"
$nodePath = "C:\Program Files\nodejs\node.exe"

# 设置当前会话代理
$env:HTTP_PROXY  = $proxy
$env:HTTPS_PROXY = $proxy
$env:http_proxy  = $proxy
$env:https_proxy = $proxy

Write-Host "代理已设置为: $proxy" -ForegroundColor Green

# 检查 Node 是否存在
if (-not (Test-Path $nodePath)) {
    Write-Host "未找到 node.exe: $nodePath" -ForegroundColor Red
    exit 1
}

Write-Host "Node 路径: $nodePath" -ForegroundColor Cyan

# 验证 Node 是否继承代理环境变量
& $nodePath -e "console.log('HTTP_PROXY=' + (process.env.HTTP_PROXY || '')); console.log('HTTPS_PROXY=' + (process.env.HTTPS_PROXY || ''))"

# 启动 codex
Write-Host "正在启动 codex..." -ForegroundColor Yellow
codex