#!/bin/bash
set -euo pipefail

USERNAME=tavernkeeper
PROJECT=tavernkeeper
SERVICE=tavernkeeper
DOMAIN=tavernkeeper.xyz
PORT=3101
REPO_URL="https://github.com/dutchiono/TavernKeeper.git"
APP_DIR="/var/www/${PROJECT}"

if ! id "$USERNAME" &>/dev/null; then
  PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | head -c 24)
  adduser --disabled-password --gecos "TavernKeeper app" "$USERNAME"
  echo "${USERNAME}:${PASSWORD}" | chpasswd
  echo "${PASSWORD}" > /root/tavernkeeper-deploy-password.txt
  chmod 600 /root/tavernkeeper-deploy-password.txt
  echo "Created user $USERNAME"
else
  echo "User $USERNAME already exists"
fi

mkdir -p "$APP_DIR"
chown "$USERNAME:$USERNAME" "$APP_DIR"

cat > /etc/sudoers.d/${USERNAME} << EOF
${USERNAME} ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart ${SERVICE}
${USERNAME} ALL=(ALL) NOPASSWD: /usr/bin/systemctl stop ${SERVICE}
${USERNAME} ALL=(ALL) NOPASSWD: /usr/bin/systemctl start ${SERVICE}
${USERNAME} ALL=(ALL) NOPASSWD: /usr/bin/systemctl status ${SERVICE}
${USERNAME} ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx
EOF
chmod 440 /etc/sudoers.d/${USERNAME}

if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$USERNAME" git -C "$APP_DIR" pull origin main
else
  sudo -u "$USERNAME" git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
sudo -u "$USERNAME" npm install --omit=dev

if [ ! -f "$APP_DIR/.env" ]; then
  sudo -u "$USERNAME" tee "$APP_DIR/.env" > /dev/null << EOF
PORT=${PORT}
OPENAI_API_KEY=
EOF
fi

# Ensure PORT is set correctly
if grep -q '^PORT=' "$APP_DIR/.env"; then
  sed -i "s/^PORT=.*/PORT=${PORT}/" "$APP_DIR/.env"
else
  echo "PORT=${PORT}" >> "$APP_DIR/.env"
fi

cat > /etc/systemd/system/${SERVICE}.service << EOF
[Unit]
Description=TavernKeeper RPG Server
After=network.target

[Service]
Type=simple
User=${USERNAME}
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=${APP_DIR}/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${SERVICE}
systemctl restart ${SERVICE}
sleep 2
systemctl status ${SERVICE} --no-pager | head -15

cat > /etc/nginx/sites-available/${DOMAIN} << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }
}
EOF

ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
nginx -t
systemctl reload nginx

echo "SETUP_DONE port=${PORT}"
