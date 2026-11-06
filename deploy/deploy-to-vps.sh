#!/usr/bin/env bash
# ==============================================================================
# Skrip Deploy Mandiri UmfaGo ke VPS (Bypass GitHub Actions / Tanpa Kuota GitHub)
# Menjalankan kompilasi Linux di laptop Anda, lalu mengirim hasil jadi via SSH.
# ==============================================================================
set -eo pipefail

COLOR_RESET="\033[0m"
COLOR_GREEN="\033[1;32m"
COLOR_CYAN="\033[1;36m"
COLOR_YELLOW="\033[1;33m"
COLOR_RED="\033[1;31m"

VPS_HOST="${VPS_HOST:-72.61.209.123}"
VPS_USER="${VPS_USER:-root}"
VPS_PORT="${VPS_PORT:-22}"
TARGET_DIR="${TARGET_DIR:-/var/www/umfago}"
SSH_KEY="${SSH_KEY:-}"

# Tentukan opsi SSH
SSH_OPTS=(-p "$VPS_PORT")
SCP_OPTS=(-P "$VPS_PORT")

if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
    SSH_OPTS+=(-i "$SSH_KEY")
    SCP_OPTS+=(-i "$SSH_KEY")
fi

echo -e "${COLOR_CYAN}========================================================================${COLOR_RESET}"
echo -e "${COLOR_CYAN}  [DEPLOY] Memulai Deploy Mandiri UmfaGo ke VPS: ${VPS_USER}@${VPS_HOST}${COLOR_RESET}"
echo -e "${COLOR_CYAN}========================================================================${COLOR_RESET}"

# 1. Bersihkan folder rilis lama
rm -rf /tmp/umfago-release /tmp/umfago-release.tar.gz
mkdir -p /tmp/umfago-release/bin /tmp/umfago-release/admin /tmp/umfago-release/deploy

# 2. Build SvelteKit Admin Frontend
echo -e "\n${COLOR_CYAN}[1/4] Membangun Frontend Web Admin (SvelteKit)...${COLOR_RESET}"
cd frontend/admin
npm run build
cp -r build/* /tmp/umfago-release/admin/
cd ../..
echo -e "${COLOR_GREEN}✓ Web Admin berhasil di-build.${COLOR_RESET}"

# 3. Cross-Compile Go Backend Binary untuk Linux Server AMD64
echo -e "\n${COLOR_CYAN}[2/4] Meng-compile Go Backend Binary (Linux AMD64)...${COLOR_RESET}"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /tmp/umfago-release/bin/umfago-api ./cmd/api
cp -r deploy/* /tmp/umfago-release/deploy/
echo -e "${COLOR_GREEN}✓ Binary Linux AMD64 berhasil dikompilasi.${COLOR_RESET}"

# 4. Paketkan rilis ke tar.gz (tanpa folder android)
echo -e "\n${COLOR_CYAN}[3/4] Mengompres paket rilis (tanpa folder Android)...${COLOR_RESET}"
tar -czf /tmp/umfago-release.tar.gz -C /tmp/umfago-release .
RELEASE_SIZE=$(ls -lh /tmp/umfago-release.tar.gz | awk '{print $5}')
echo -e "${COLOR_GREEN}✓ Paket rilis siap (${RELEASE_SIZE}).${COLOR_RESET}"

# 5. Kirim ke VPS via SCP dan jalankan reload
echo -e "\n${COLOR_CYAN}[4/4] Mengirim paket ke VPS dan merestart service...${COLOR_RESET}"
scp "${SCP_OPTS[@]}" /tmp/umfago-release.tar.gz "${VPS_USER}@${VPS_HOST}:/tmp/umfago-release.tar.gz"

ssh "${SSH_OPTS[@]}" "${VPS_USER}@${VPS_HOST}" bash -s << REMOTE_EOF
set -e
TARGET="$TARGET_DIR"

echo "  -> Menyiapkan direktori target: \$TARGET"
mkdir -p "\$TARGET/bin" "\$TARGET/admin" "\$TARGET/uploads" "\$TARGET/deploy"

echo "  -> Mengekstrak rilis baru..."
tar -xzf /tmp/umfago-release.tar.gz -C "\$TARGET"
rm -f /tmp/umfago-release.tar.gz
chmod +x "\$TARGET/bin/umfago-api"

echo "  -> Menyesuaikan hak akses file ke www-data..."
chown -R www-data:www-data "\$TARGET"

echo "  -> Memperbarui systemd service..."
if [ -f "\$TARGET/deploy/umfago-backend.service" ]; then
    cp "\$TARGET/deploy/umfago-backend.service" /etc/systemd/system/umfago-backend.service
    systemctl daemon-reload
    systemctl enable umfago-backend >/dev/null 2>&1 || true
fi

echo "  -> Merestart umfago-backend service..."
systemctl restart umfago-backend

echo "  -> Menguji dan me-reload Nginx (zero downtime)..."
if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx
    echo "  -> Nginx berhasil di-reload."
fi
REMOTE_EOF

# Bersihkan file temp lokal
rm -rf /tmp/umfago-release /tmp/umfago-release.tar.gz

echo ""
echo -e "${COLOR_GREEN}========================================================================${COLOR_RESET}"
echo -e "${COLOR_GREEN}  [SUKSES] Deploy Mandiri Selesai! Aplikasi Anda sudah Live di VPS.${COLOR_RESET}"
echo -e "${COLOR_GREEN}    - Backend API : https://umfa-core.fazalabs.sbs${COLOR_RESET}"
echo -e "${COLOR_GREEN}    - Web Admin   : https://umfa.fazalabs.sbs${COLOR_RESET}"
echo -e "${COLOR_GREEN}========================================================================${COLOR_RESET}"

