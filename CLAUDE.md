# Memoria del proyecto Erza-Bot-MD

> Este archivo es la memoria de Claude para este repo. Léelo completo antes de hacer cualquier cosa.
> El dueño habla **español** (México). Responde siempre en español, claro y sin tecnicismos innecesarios.

## 1. Cómo trabajar con el dueño (muy importante)

- **Quiere los cambios en `main` y subidos ya** ("súbelo ya"). Suga construye solo al hacer push a `main`.
- **Cada push a `main` REINICIA el bot en Suga**: se pierde la fila de stickers en espera y el grupo grande
  tarda 2–3 min en "calentar" (el primer sticker puede tardar 80–160 s y a veces WhatsApp corta la conexión).
  Avisa de esto antes de subir algo cuando hay mucha gente usando la página, o junta varios cambios en un push.
- **No hagas cambios que no pidió.** Una vez cambié el diseño sin permiso y se molestó ("¿Quién te dijo que hicieras eso?").
- Cuando dice "dime por qué pasa antes de cambiarlo", explica primero y espera.
- Muchas veces prueba algo y luego pide **revertir** ("déjalo como estaba"): hazlo sin discutir.
- Seguridad: **nunca** pidas ni pegues API keys en el chat. Para credenciales usa el formulario seguro (request_credential).
- No metas identificadores de modelo en commits/código.

## 2. Qué es el proyecto

Bot de WhatsApp (Baileys) + **página web para hacer stickers con sonido**. La gente entra a la página,
elige un video, lo recorta, su **propio celular** hace el sticker (ffmpeg.wasm) y el bot lo manda a un grupo.

### Archivos
| Archivo | Qué hace |
|---|---|
| `index.js` | Arranca todo: carga comandos, conecta WhatsApp (código de 8 dígitos con env `NUMERO`), sesión en `SESION_DIR`. Interruptor `const APAGADO = false` (true = bot apagado y la página dice "apagado por ahora"). Ignora 2 grupos (`GRUPOS_IGNORADOS`). Usa cachés de `lib/cache.js`. |
| `lib/web.js` | Servidor HTTP (PORT 8080): sirve `web/index.html`, `/ffmpeg/*`, `/api/info`, `/api/sticker` (POST, cuerpo = webp+ogg, cabeceras `X-Tam-Sticker`, `X-Segundos`, `X-Cliente`), `/api/estado`. Fila en disco (`os.tmpdir()/fila-stickers`), 3 envíos a la vez, pausa 300 ms, máx 20 recepciones simultáneas (503 → el navegador reintenta). Sin repetidos (huella sha256) y **1 sticker en fila por persona** (`X-Cliente` = id en localStorage). Busca el grupo de destino. |
| `lib/sticker.js` | Crea/manda stickers con sonido. `enviarSticker()` sube sticker+audio y los cifra/manda **de uno en uno** (cola `colaCifrado`). Loguea `[envío] subida Xs, espera Ys, cifrado Zs`. También lo usa `#s2`. |
| `lib/cache.js` | Rendimiento: caché de datos de grupos (se actualiza con altas/bajas), caché de dispositivos (1 h), avisos de recibido/leído de grupos solo se confirman (ack) sin procesar, y log `[estado]` cada minuto (CPU, trabas, memoria, http/min, nodos de WhatsApp). |
| `web/index.html` | La página. Editor de recorte (esquinas, Auto/Cuadro/Todo, inicio y duración hasta 20 s), detección de bordes negros, conversión con ffmpeg.wasm, envío y seguimiento de fila. Arriba: apartado **"⚡ Stickers prioritarios"** (pago). |
| `comandos/main/menu.js` | `#menu` / `#help`: imagen + botón CANAL + footer. |
| `comandos/main/ping.js` | `#ping` / `#pong`: velocidad/estado. |
| `comandos/main/s2.js` | `#s2` respondiendo a un video: sticker con sonido (máx 10 s). |
| `deploy/oracle/` | Instalador y guía para Oracle Cloud (solo en la rama `oracle`). |
| `herramientas/videos/` | Scripts con los que se hicieron los videos tutoriales (referencia). |

### Detalles técnicos que costó descubrir
- Librería: fork **`@itsliaaa/baileys` ^0.5.6** (tiene botones `nativeFlow`). Mensajes propios del bot llevan `STARFALL` en el id.
- **Sticker con sonido** = `stickerMessage` con `isAnimated: true` y un `audioMessage` embebido dentro. (El envoltorio `audioStickerMessage` NO se ve.)
- **Mensaje interactivo con imagen**: construirlo a mano con `prepareWAMessageMedia` + `generateWAMessageFromContent`, con el `imageMessage` del header SIN caption; si no, WhatsApp dice "no compatible".
- **Nombre/autor del sticker**: chunk EXIF en el WebP (TIFF, tag 0x5741, JSON con `sticker-pack-name`/`sticker-pack-publisher`). Paquete `♦️ Erza-Bot-MD ♦️\n`, autor `mikelennn`.
- **Página (ffmpeg.wasm)**: `@ffmpeg/ffmpeg` 0.12.15, `@ffmpeg/core` 0.12.10 (jsDelivr con respaldo `/ffmpeg/*`). Límite 1 MB (`MAX_BYTES = 1000*1024`), fps [12,10,8], calidad mínima 35, calibración con 3 muestras de 1 s a q40 y tabla `PESO_RELATIVO`, `libwebp_anim` `compression_level 2`, escala `area` + `hqdn3d`, relleno a 512 con transparencia **en este orden**: `format=yuva420p,pad=512:512:-1:-1:color=0x00000000`.
- **Sincronía audio/imagen**: video `fps=N:start_time=0`; audio `aresample=async=1:first_pts=0,apad` y ambos cortados con `-t duración`.
- En Android Chrome hay que copiar el archivo a memoria al elegirlo (si no: "The requested file could not be read").
- Medir duración de frames del WebP: parsear los chunks ANMF (Pillow no da duraciones).

## 3. Dónde corre: Suga

- Proyecto Suga, entorno id `cd0ab690-29f8-48bf-9ed6-9ef02219bbd4`, contenedor `or81eiv6z8c6`.
- Plan gratis: **0.1 CPU, 256 MB RAM**, 1 GB disco. Auto-build con push a `main`. Cambios de variables/red requieren que el dueño dé clic en **Deploy** en Suga.
- Herramientas MCP de Suga: `get_logs`, `get_metrics`, `get_events` (para ver build), etc.
- **Problema principal**: con 0.1 CPU y un grupo de ~1,065 personas, cifrar cada sticker tarda 4–9 s, el bot se congela 5–30 s
  a ratos y a veces WhatsApp corta la conexión. Sale ~5–12 stickers/min. Al cortarse la conexión, en `main` los stickers
  en fila **se pierden** (el arreglo está solo en la rama `oracle`). Memoria llega a ~240/256 MB.
- Ya se optimizó todo lo razonable (cachés, llaves en memoria con `makeCacheableSignalKeyStore` conservadas entre
  reconexiones, cifrado en serie, sin repetidos, 1 por persona). La solución real es más CPU → **Oracle**.

## 4. Grupos de WhatsApp

| Código de invitación | Qué es |
|---|---|
| `GNl1GTL7aJxHrqgq4ScioO` | **Grupo grande "viejo"** (~1,065 miembros, nombre `〔♥️ Stickers con sonido ♥️〕`). **El bot manda aquí ahora.** Su enlace está **bloqueado por WhatsApp (`growth-locked`)**, así que el bot lo busca entre sus grupos (el de más miembros con ese nombre) y recuerda su id en `SESION_DIR/grupo-<código>.txt`. |
| `Fl6oAgZBCtLAZqCod1aOO7` | Grupo nuevo #1 (mismo nombre, sin el segundo ♥️). El dueño dijo que **aún no se usa**. Sale en los videos 4 y 5. |
| `BRl3dtRE6km2yguHb0XdJt` | Grupo nuevo #2. Sale en los videos 6 y 7 (link completo `https://chat.whatsapp.com/BRl3dtRE6km2yguHb0XdJt?s=cl&p=a&iam=2`). |
| `GDQuWpvGBbWI4JcpNKghzG`, `CpIIZ50p0gsBmyI7FQraBT` | Grupos donde el bot **no responde a nada**. |

Canal: `https://whatsapp.com/channel/0029Vb9eodxFsn0bzlsFDr0F`. Footer: `© Mikelennn\n© ErzaBot`.
Número del bot: `522941992629`.

**Pendiente de decidir con el dueño:** a qué grupo debe mandar el bot (los videos nuevos llevan al grupo `BRl3dtRE6km2yguHb0XdJt`).

## 5. Stickers prioritarios (pago)

En la página, arriba: transferencia **mínimo $50 pesos**, solo México. Datos: Nombre Romina Madai, Banco Santander,
CLABE 014890140031894817. Se sube el comprobante y se manda por WhatsApp a +52 294 199 2629 (es el número del bot).
**Ojo:** la prioridad NO está programada; por ahora es solo el apartado de pago (el dueño lo atendería a mano).
Idea ofrecida: lista de números prioritarios que el dueño active al confirmar cada pago.

## 6. Plan: mudarse a Oracle Cloud (DECIDIDO, falta hacerlo)

- El dueño eligió **Oracle Cloud "Always Free"**: ahora es **2 núcleos ARM (Ampere) y 12 GB RAM** (él lo corrigió; antes eran 4/24).
  Pide tarjeta solo para verificar. Se descartaron: GratisVPS (malas reseñas), Lunafy (sin puertos gratis, 256 MB, renovar cada 7 días),
  y otros hostings de 256 MB.
- Todo está listo en la **rama `oracle`** (es `main` + estos extras; mantenerla al día con `git merge origin/main`):
  - `deploy/oracle/instalar.sh`: script de cloud-init. Se pega al crear la instancia (Opciones avanzadas → Gestión → cloud-init),
    cambiando 4 líneas: `NUMERO`, `DOMINIO` (DuckDNS), `DUCKDNS_TOKEN`, `CLAVE`. Instala Node 22, git, Caddy (HTTPS automático),
    abre puertos 80/443 en iptables, DuckDNS cada 5 min, clona la rama `oracle` en `/opt/erzabot`, servicio systemd `erzabot`,
    y **se actualiza solo desde GitHub cada 2 min** (cron `erzabot-actualizar.sh`). Log: `/var/log/erzabot-instalacion.log`.
  - `deploy/oracle/GUIA.md`: pasos para el dueño (DuckDNS → cuenta Oracle → abrir puertos 80/443 en Security List → crear
    instancia Ubuntu `VM.Standard.A1.Flex` 2 OCPU/12 GB (si "Out of capacity": 1/6) → apagar Suga → vincular → cambiar link).
  - Página **`/vincular?clave=<CLAVE_VINCULAR>`** muestra el código de 8 dígitos para vincular el número sin consola.
  - **La fila ya no tira stickers si se corta la conexión** (los reintenta hasta 5 veces; `actualizarConexion(null)` al cerrar).
- **Antes de vincular en Oracle hay que apagar Suga** (`APAGADO = true` en `main`), si no los dos bots mandan doble.
- Cuando Oracle funcione: el link de la página cambia a `https://<dominio>.duckdns.org` (avisar al dueño para su TikTok).
- **Pendiente de decidir:** tope de envío para no parecer spam (propuesta: 1 sticker cada 2 s). Estimado en Oracle: ~0.5–1 s por sticker.
- Lo que el dueño debe tener listo: cuenta DuckDNS + token, tarjeta para Oracle, el celular del bot para vincular.

## 7. Videos tutoriales para TikTok

Se hicieron 7 versiones (todas distintas). Scripts en `herramientas/videos/` (rutas del scratchpad de la sesión; son referencia).
- Herramientas: ffmpeg estático de npm (`ffmpeg-static`, tiene `subtitles`/`xfade`/`zoompan`, NO `drawtext`), Pillow, fuentes Inter
  (`/usr/share/fonts/opentype/inter`), ElevenLabs por proxy (cabecera `xi-api-key: proxy-injected`, endpoint `/with-timestamps`).
- ElevenLabs plan gratis: solo voces "premade" (las de biblioteca como Mario/Antonio/Regina dan 402). Quedan ~110 caracteres; se renueva cada mes.
  Voces ya usadas: Liam (v1, v2), Jessica (v3), Charlie (v4), Laura (v5), Will (v6), Alice (v7). No usadas: Sarah, Roger, George, Callum, River, Harry, Matilda, Eric, Chris, Brian, Daniel, Lily, Adam, Bill, Bella.
- Video fuente (478x850, 66.5 s, sin audio): chat del grupo 0–9.8 (¡de 7 a 9.8 se ve la descripción con el link! usar 0–6.6),
  negro 9.83–13.67, página 13.9–17.8 (la barra de dirección muestra `…suga.run`: difuminar `crop=478:80:0:0`), galería 18–22,
  editor 22–36, creando 36–46.4, listo 46.4–51.5, cambio de app con link visible 51.5–54 (**cortar**), sticker en el chat 54–58.5
  (zoom al sticker: `crop=320:569:158:281`).
- Estilos hechos: v1 subtítulos simples; v2 zooms + palabra por palabra; v3 celular enmarcado fondo rojo + barra de progreso;
  v4 cuaderno (no le gustó: video muy chico); v5 pantalla completa estilo WhatsApp (notificaciones + burbujas);
  v6 neón **rojo** estilo Erza-Bot con lista de pasos y karaoke (le gustó); v7 tutorial simple ("Paso X de 4").
  Un estilo "tráiler de película" lo rechazó ("no tiene sentido, que sea simple").
- Siempre: link y QR al final cuando lo pida, el link **completo en una sola línea**, decir que también está en los comentarios.

## 8. Historial de decisiones (para no repetir errores)

- Se revirtieron a petición: 50 comandos extra, stickers a 15 fps / 2 MB, tamaño según duración (320/400 px), un texto "ya puedes salir".
- El dueño quiere stickers de hasta 20 s en la página y no bajar fps.
- `#s2` sigue en máx 10 s.
- Si el bot no recibe mensajes tras cambiar de librería: volver a vincular con un `SESION_DIR` nuevo.
