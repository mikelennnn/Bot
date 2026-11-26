# Pasar Erza-Bot-MD a Oracle Cloud (gratis, 2 núcleos y 12 GB)

Tiempo: unos 30–40 minutos. Todo se puede hacer desde el celular.

## 1. Dominio gratis (DuckDNS) — 3 min
1. Entra a **duckdns.org** e inicia sesión con Google o GitHub.
2. En *sub domain* escribe un nombre (ej. `erzastickers`) y dale **add domain**.
   Tu dominio queda como `erzastickers.duckdns.org`.
3. Copia el **token** que sale arriba en la página (lo vas a pegar en el instalador).

## 2. Cuenta de Oracle Cloud — 10 min
1. Entra a **oracle.com/cloud/free** → *Start for free*.
2. País: México. **Región de inicio**: elige una y **no se puede cambiar después**
   (ej. *Mexico Central (Queretaro)* o *US West (Phoenix)*).
3. Pide tarjeta solo para verificar; no cobra mientras uses lo "Always Free".

## 3. Abrir los puertos 80 y 443 — 3 min
Menú ☰ → **Networking → Virtual cloud networks** → tu red (si no hay, se crea sola
al crear la instancia; regresa a este paso después) → **Security Lists** →
*Default Security List* → **Add Ingress Rules**:
- Source CIDR: `0.0.0.0/0` · IP Protocol: TCP · Destination port range: `80,443`

## 4. Crear la máquina — 5 min
Menú ☰ → **Compute → Instances → Create instance**
- **Image**: Canonical **Ubuntu 22.04** (o 24.04)
- **Shape**: *Change shape* → **Ampere** → `VM.Standard.A1.Flex` → **2 OCPU, 12 GB**
  (si dice *Out of capacity*: prueba 1 OCPU / 6 GB, u otro *Availability domain*)
- **Networking**: deja que cree la red y marca **Assign a public IPv4 address**
- **SSH keys**: *Save private key* (guárdala por si acaso)
- **Show advanced options → Management → Paste cloud-init script**:
  pega todo el archivo `deploy/oracle/instalar.sh`, **cambiando las 4 líneas de arriba**
  (número, dominio, token de DuckDNS y una clave tuya).
- **Create**.

La instalación tarda ~10 min después de que la máquina diga *Running*.

## 5. Apagar el bot de Suga
Antes de vincular, Claude apaga el bot de Suga (si los dos están prendidos con el mismo
número, mandarían todo doble).

## 6. Vincular el número — 2 min
Abre en el celular: `https://TU-DOMINIO.duckdns.org/vincular?clave=TU-CLAVE`
Sale un código de 8 letras → WhatsApp → **Dispositivos vinculados → Vincular dispositivo
→ Vincular con número de teléfono** → escribe el código.
Cuando diga "✅ El bot ya está vinculado", listo.

## 7. Cambiar el enlace
La página ahora es `https://TU-DOMINIO.duckdns.org` → ponlo en tu bio de TikTok.

## Actualizaciones
La máquina revisa GitHub (rama `oracle`) cada 2 minutos y se actualiza sola,
igual que hacía Suga.
