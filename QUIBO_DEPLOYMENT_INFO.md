# Quibo - OpenClaw Deployment Info

## ✅ Deployment Status

**Fecha**: 2026-02-01
**Estado**: ✅ RUNNING
**Versión OpenClaw**: 2026.1.30

---

## 🖥️ VM Information

| Property | Value |
|----------|-------|
| **Instance Name** | `quibo` |
| **Project** | `openclaw-quibo-01` |
| **Zone** | `us-central1-a` |
| **Machine Type** | `e2-medium` (2 vCPUs, 4GB RAM) |
| **External IP** | `34.46.59.182` |
| **Boot Disk** | 20GB SSD |
| **OS** | Ubuntu 22.04 LTS |
| **Status** | 🟢 RUNNING |

---

## 🔌 OpenClaw Gateway

| Property | Value |
|----------|-------|
| **Port** | `18789` |
| **Mode** | `local` |
| **Bind** | `lan` (0.0.0.0 - accessible from all interfaces) |
| **Gateway Token** | `quibo-master-key-2026` |
| **Status** | 🟢 Active (systemd service) |
| **Service Name** | `openclaw-gateway.service` |

### Access URL
```
http://34.46.59.182:18789
```

### Authentication
Para acceder al dashboard, usa el token:
```
quibo-master-key-2026
```

O accede directamente con:
```
http://34.46.59.182:18789/?token=quibo-master-key-2026
```

---

## 🤖 AI Configuration

| Property | Value |
|----------|-------|
| **Provider** | Google Gemini |
| **Current Model** | `google/gemini-3-flash-preview` ✅ |
| **Fallback 1** | `google/gemini-2.5-flash` |
| **Fallback 2** | `openrouter/anthropic/claude-3.5-sonnet` |
| **Status** | 🟢 Configured and Working |

### ✅ Configuration Status (Updated 2026-02-08)
The gateway is using `google/gemini-3-flash-preview` as the primary model, with Gemini 2.5 Flash and Claude 3.5 Sonnet as fallbacks.

**Previous Issue (2026-02-08):** Gateway was crashing because `gateway.auth.token` was removed from the config. The token was restored and the model changed from `nvidia/moonshotai/kimi-k2.5` to `google/gemini-3-flash-preview`.

**Configured Models:**
- ✅ **Google Gemini 3 Flash** (Active): `google/gemini-3-flash-preview`
- 📝 **Google Gemini 2.5 Flash** (Fallback): `google/gemini-2.5-flash`
- 📝 **Anthropic Claude 3.5 Sonnet** (Fallback via OpenRouter)


---

## 💬 Telegram Bot

| Property | Value |
|----------|-------|
| **Bot Name** | `@Quibo_Quimera_bot` |
| **Bot Token** | `8345430943:AAGETOR0tRKpGSVVzXx808Gb40xDpmdDHCE` |
| **Status** | 🟢 Enabled and Running |
| **Mode** | Polling |

### Uso
1. Busca `@Quibo_Quimera_bot` en Telegram
2. Envía `/start`
3. Si recibes "Access not configured", necesitas autorizar tu Telegram ID:
   - Envía un mensaje a `@userinfobot` para obtener tu ID
   - Agrega tu ID en el dashboard: **Control > Channels > Telegram > Allow From**

---

## 🔥 Firewall Rules

| Rule | Value |
|------|-------|
| **Name** | `allow-openclaw-quibo` |
| **Port** | `TCP:18789` |
| **Target Tags** | `http-server` |
| **Source Ranges** | `0.0.0.0/0` (público) |

### 🔒 Recomendación de Seguridad
Para restringir el acceso solo a tu IP:
```bash
export MY_IP=$(curl -s ifconfig.me)
gcloud compute firewall-rules update allow-openclaw-quibo \
  --project=openclaw-quibo-01 \
  --source-ranges="${MY_IP}/32"
```

---

## 🛠️ Management Commands

### SSH Access
```bash
gcloud compute ssh quibo --project=openclaw-quibo-01 --zone=us-central1-a
```

### Service Management
```bash
# Ver estado
sudo systemctl status openclaw-gateway

# Reiniciar
sudo systemctl restart openclaw-gateway

# Ver logs
sudo journalctl -u openclaw-gateway -f

# Detener
sudo systemctl stop openclaw-gateway

# Iniciar
sudo systemctl start openclaw-gateway
```

### Configuration Files
```bash
# Configuración principal
~/.openclaw/openclaw.json

# Credenciales de Gemini
~/.openclaw/agents/main/agent/auth-profiles.json

# Logs
/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log
```

---

## 📝 Installation Summary

### What Was Installed:
1. ✅ VM `quibo` created in `openclaw-quibo-01` project
2. ✅ Node.js 22.22.0 installed
3. ✅ OpenClaw 2026.1.30 installed globally
4. ✅ Firewall rule `allow-openclaw-quibo` created for port 18789
5. ✅ Systemd service configured for auto-start
6. ✅ Gemini API credentials configured
7. ✅ Telegram bot integrated (`@Quibo_Quimera_bot`)
8. ✅ Gateway listening on `0.0.0.0:18789`

### Configuration Files Created:
- `/etc/systemd/system/openclaw-gateway.service` - Systemd service
- `~/.openclaw/openclaw.json` - Main configuration
- `~/.openclaw/agents/main/agent/auth-profiles.json` - Gemini API credentials

---

## 🚀 Next Steps

### 1. Configure Gemini Model
El gateway está usando el modelo Anthropic por defecto. Para cambiar a Gemini:

**Opción A: Via Dashboard**
1. Accede a http://34.46.59.182:18789/?token=quibo-master-key-2026
2. Settings > Config > Agents > Defaults
3. Usa el botón "Raw" para editar el JSON
4. Busca `"model": {}` y reemplázalo con:
   ```json
   "model": {
     "id": "gemini-2.0-flash"
   }
   ```

**Opción B: Via SSH**
```bash
gcloud compute ssh quibo --project=openclaw-quibo-01 --zone=us-central1-a

# Usar el configurador interactivo
export PATH="/home/armandoolmo/.npm-global/bin:$PATH"
openclaw configure
```

### 2. Test Telegram Bot
1. Abre Telegram
2. Busca `@Quibo_Quimera_bot`
3. Envía `/start`
4. Si necesitas autorización, obtén tu ID con `@userinfobot`

### 3. Enable Tailscale (Optional)
Para acceso HTTPS seguro sin exponer la IP pública:
```bash
# Instalar Tailscale en la VM
gcloud compute ssh quibo --project=openclaw-quibo-01 --zone=us-central1-a
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --hostname=quibo

# Habilitar Funnel para URL pública HTTPS
sudo tailscale funnel --bg 18789
```

---

## 🔍 Troubleshooting

### Gateway no inicia
```bash
# Ver logs detallados
sudo journalctl -u openclaw-gateway -n 100 --no-pager

# Verificar configuración
cat ~/.openclaw/openclaw.json | python3 -m json.tool

# Ejecutar doctor para diagnosticar
export PATH="/home/armandoolmo/.npm-global/bin:$PATH"
openclaw doctor
```

### Telegram no responde
```bash
# Verificar logs de Telegram
sudo journalctl -u openclaw-gateway | grep telegram

# Verificar configuración
cat ~/.openclaw/openclaw.json | grep -A5 telegram
```

### No puedo acceder al dashboard
1. Verifica que el firewall permita el puerto 18789
2. Verifica que uses el token correcto: `quibo-master-key-2026`
3. Accede via: http://34.46.59.182:18789/?token=quibo-master-key-2026

---

## 📞 Support & Resources

- **OpenClaw Docs**: https://docs.openclaw.ai
- **Dashboard**: http://34.46.59.182:18789
- **Telegram Bot**: @Quibo_Quimera_bot
- **Project**: openclaw-quibo-01
- **Zone**: us-central1-a

---

**Deployment Date**: 2026-02-01
**Deployed By**: Antigravity AI Assistant
**Status**: ✅ Production Ready
