#!/bin/bash
# =====================================================================
#  Instalador de Erza-Bot-MD para Oracle Cloud (Ubuntu, ARM o AMD)
#  Se pega en: Crear instancia → Mostrar opciones avanzadas → Gestión →
#              "Pegar script de cloud-init"
#  Solo cambia las 4 líneas de abajo (entre comillas).
# =====================================================================
NUMERO="522941992629"                 # número del bot, con 52, sin + ni espacios
DOMINIO="TUNOMBRE.duckdns.org"         # tu subdominio de DuckDNS
DUCKDNS_TOKEN="PEGA-AQUI-TU-TOKEN"     # el token que sale en duckdns.org
CLAVE="cambia-esta-clave"              # clave para ver el código de vinculación
# ---------------------------------------------------------------------
RAMA="oracle"
REPO="https://github.com/mikelennnn/Bot.git"
DIR=/opt/erzabot
set -x
exec > /var/log/erzabot-instalacion.log 2>&1
export DEBIAN_FRONTEND=noninteractive

# 1) Programas: git, Node 22 y Caddy (HTTPS automático)
apt-get update
apt-get install -y git curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https iptables-persistent
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

# 2) Abrir los puertos 80 y 443 en el firewall de la máquina (Oracle los trae cerrados)
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
netfilter-persistent save

# 3) DuckDNS: que el dominio apunte a esta máquina (y se actualice cada 5 min)
cat > /usr/local/bin/duckdns.sh <<EOS
#!/bin/sh
curl -s "https://www.duckdns.org/update?domains=${DOMINIO%%.duckdns.org}&token=${DUCKDNS_TOKEN}&ip=" > /var/log/duckdns.log
EOS
chmod +x /usr/local/bin/duckdns.sh
/usr/local/bin/duckdns.sh
echo "*/5 * * * * root /usr/local/bin/duckdns.sh" > /etc/cron.d/duckdns

# 4) El bot
git clone --branch "$RAMA" "$REPO" "$DIR"
cd "$DIR" && npm install --omit=dev
mkdir -p /opt/erzabot-sesion
cat > /etc/erzabot.env <<EOS
NUMERO=$NUMERO
PORT=8080
SESION_DIR=/opt/erzabot-sesion
CLAVE_VINCULAR=$CLAVE
EOS
chmod 600 /etc/erzabot.env

cat > /etc/systemd/system/erzabot.service <<'EOS'
[Unit]
Description=Erza-Bot-MD
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/opt/erzabot
EnvironmentFile=/etc/erzabot.env
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOS

# 5) Actualización automática: cada 2 min revisa GitHub; si hay cambios, los baja y reinicia
cat > /usr/local/bin/erzabot-actualizar.sh <<EOS
#!/bin/sh
cd $DIR || exit 0
git fetch -q origin $RAMA || exit 0
[ "\$(git rev-parse HEAD)" = "\$(git rev-parse origin/$RAMA)" ] && exit 0
git reset -q --hard origin/$RAMA
npm install --omit=dev --silent
systemctl restart erzabot
EOS
chmod +x /usr/local/bin/erzabot-actualizar.sh
echo "*/2 * * * * root /usr/local/bin/erzabot-actualizar.sh >> /var/log/erzabot-actualizar.log 2>&1" > /etc/cron.d/erzabot-actualizar

# 6) HTTPS con Caddy → página del bot
cat > /etc/caddy/Caddyfile <<EOS
$DOMINIO {
  reverse_proxy localhost:8080
}
EOS

systemctl daemon-reload
systemctl enable --now erzabot
systemctl restart caddy
echo "LISTO"
