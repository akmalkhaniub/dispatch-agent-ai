# 🆓 Free Tier Deployment Guide for DispatchAgent AI

Deploy **DispatchAgent AI** using **Fly.io Anycast Edge VMs**, **Upstash Serverless Redis**, and **Cloudflare Tunnels**.

---

## 1. Low-Latency Edge Telephony Host: Fly.io
Fly.io runs containers globally close to telecom SIP trunks, minimizing jitter on voice streams:
```bash
fly launch --config fly.toml
fly deploy
```

---

## 2. Free Serverless A2A Message Bus: Upstash Redis
1. Create a free database at [upstash.com](https://upstash.com) (10,000 commands/day free forever).
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into `.env`.
3. The included adapter at `deploy/free/upstash_redis_adapter.js` provides zero-install HTTP REST Redis pub/sub.

---

## 3. Telephony Webhook Testing: Cloudflare Tunnel
```powershell
# Windows
.\deploy\free\tunnel.ps1 -Port 3003

# Linux / macOS
./deploy/free/tunnel.sh 3003
```
Point your Amazon Chime SDK Voice Connector or Twilio Voice webhook to:
`https://your-tunnel.trycloudflare.com/api/voice/inbound`
