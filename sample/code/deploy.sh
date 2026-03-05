#!/bin/bash
# =============================================================================
# Local File Viewer - ShellScript シンタックスハイライト確認用サンプル
#
# このファイルはシンタックスハイライトの表示確認用です。
# 実行を意図したものではありません。
# =============================================================================

set -euo pipefail

# --- 変数定義 ---
APP_NAME="local-file-viewer"
VERSION="${1:-0.1.0}"
BUILD_DIR="./out"
LOG_FILE="/tmp/${APP_NAME}-deploy.log"
DEPLOY_TARGETS=("staging" "production")

# --- 関数定義 ---
log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] $*" | tee -a "$LOG_FILE"
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    local required_commands=("node" "npm" "git")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log "ERROR" "${cmd} is not installed"
            return 1
        fi
    done

    # バージョンチェック
    local node_version
    node_version=$(node --version | sed 's/v//')
    local major
    major=$(echo "$node_version" | cut -d. -f1)

    if [[ "$major" -lt 16 ]]; then
        log "ERROR" "Node.js >= 16 required (current: ${node_version})"
        return 1
    fi

    log "INFO" "All prerequisites met"
}

build() {
    log "INFO" "Building ${APP_NAME} v${VERSION}..."

    # クリーンビルド
    if [[ -d "$BUILD_DIR" ]]; then
        rm -rf "$BUILD_DIR"
    fi

    npm run compile 2>&1 | tee -a "$LOG_FILE"

    # ビルド成果物の確認
    local file_count
    file_count=$(find "$BUILD_DIR" -name '*.js' | wc -l)
    log "INFO" "Build complete: ${file_count} files generated"
}

deploy() {
    local target="${1:?Target environment required}"

    case "$target" in
        staging)
            log "INFO" "Deploying to staging..."
            ;;
        production)
            # 確認プロンプト
            read -rp "Deploy to production? (yes/no): " confirm
            if [[ "$confirm" != "yes" ]]; then
                log "WARN" "Production deploy cancelled"
                return 0
            fi
            log "INFO" "Deploying to production..."
            ;;
        *)
            log "ERROR" "Unknown target: ${target}"
            return 1
            ;;
    esac

    log "INFO" "Deploy to ${target} complete"
}

# --- メイン処理 ---
main() {
    log "INFO" "=== Starting deploy pipeline ==="

    check_prerequisites || exit 1
    build

    for target in "${DEPLOY_TARGETS[@]}"; do
        deploy "$target"
    done

    # ヒアドキュメント
    cat <<EOF

========================================
  Deploy Summary
  App:     ${APP_NAME}
  Version: ${VERSION}
  Date:    $(date '+%Y-%m-%d %H:%M:%S')
========================================

EOF

    log "INFO" "=== Deploy pipeline finished ==="
}

main "$@"
