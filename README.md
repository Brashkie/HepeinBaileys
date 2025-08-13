<!-- Hero -->
<p align="center">
  <img alt="HepeinBaileys" src="https://img.shields.io/badge/HepeinBaileys-%F0%9F%A5%83-111?style=for-the-badge" />
</p>

<h1 align="center">🥃 HepeinBaileys</h1>

<p align="center">
  <em>Versión mejorada de Baileys para WhatsApp Web con enfoque en grupos, cifrado y sesiones.</em>
</p>

<!-- Animated underline (SVG) -->
<p align="center">
  <svg width="420" height="16" viewBox="0 0 420 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="420" y2="0">
        <stop offset="0%" stop-color="#8A2BE2"/>
        <stop offset="50%" stop-color="#00D1FF"/>
        <stop offset="100%" stop-color="#39FF14"/>
      </linearGradient>
    </defs>
    <rect x="0" y="7" width="420" height="2" rx="1" fill="url(#g)">
      <animate attributeName="x" from="-420" to="0" dur="2s" repeatCount="1" fill="freeze"/>
    </rect>
  </svg>
</p>

<!-- Badges -->
<p align="center">
  <img alt="Node" src="https://img.shields.io/badge/Node.js-18%2B-43853D?logo=nodedotjs&logoColor=white" />
  <img alt="TypeScript/JS" src="https://img.shields.io/badge/JS_Puro-Sí-3178C6?logo=javascript&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue" />
  <img alt="CI" src="https://img.shields.io/badge/CI-Passing-brightgreen" />
</p>

<!-- Subtle animated banner -->
<div align="center">
  <img alt="banner" src="https://capsule-render.vercel.app/api?type=rect&color=0:111111,100:1f2937&height=10&section=header&animation=fadeIn"/>
</div>

<!-- Intro -->
> HepeinBaileys es una versión modificada de **Baileys**, una librería para interactuar con **WhatsApp Web** mediante **Node.js**.  
> Esta versión incluye mejoras específicas para el manejo de **grupos**, **cifrado** y **sesiones**.

---

## 🚀 Características

<div class="grid">
  <div class="card">
    <div class="spark"></div>
    <span class="tag">🔐 Seguridad</span>
    <div class="kf">
      <div>(つ▀¯▀)つ━━━━━━━━━</div>
      <div>
        <b>Cifrado personalizado para grupos</b>
        <p>Refuerza el intercambio de claves y el manejo de mensajes protegidos en entornos multiusuario.</p>
      </div>
    </div>
    <div class="shimmer"></div>
  </div>

  <div class="card">
    <div class="spark"></div>
    <span class="tag">🧠 Sesiones</span>
    <div class="kf">
      <div>(つ▀¯▀)つ━━━━━━━━━</div>
      <div>
        <b>Construcción de sesiones grupales</b>
        <p>Administra estados por grupo con recuperación automática y aislamiento de contexto.</p>
      </div>
    </div>
    <div class="shimmer"></div>
  </div>

  <div class="card">
    <div class="spark"></div>
    <span class="tag">📡 Protocolos</span>
    <div class="kf">
      <div>(つ▀¯▀)つ━━━━━━━━━</div>
      <div>
        <b>Protocolos de señal</b>
        <p>Intercambio seguro y confiable para dispositivos enlazados y mensajería en tiempo real.</p>
      </div>
    </div>
    <div class="shimmer"></div>
  </div>

  <div class="card">
    <div class="spark"></div>
    <span class="tag">🛠️ Deploy</span>
    <div class="kf">
      <div>🛠️</div>
      <div>
        <b>Integración con Heroku (opcional)</b>
        <p>Variables, buildpacks y sesiones listas para subir a producción en minutos.</p>
      </div>
    </div>
    <div class="shimmer"></div>
  </div>

  <div class="card">
    <div class="spark"></div>
    <span class="tag">⚡ Core</span>
    <div class="kf">
      <div>(つ▀¯▀)つ━━━━━━━━━</div>
      <div>
        <b>Basado en JavaScript puro</b>
        <p>Sin dependencias innecesarias. Limpio, mínimo y fácil de extender.</p>
      </div>
    </div>
    <div class="shimmer"></div>
  </div>
</div>

---

## 📦 Instalación rápida

```bash
# 1) Instala
npm install hepeinbaileys

# 2) Crea un archivo de arranque
echo "import { makeWASocket } from 'hepeinbaileys';" > index.js

# 3) Ejecuta
node index.js

```


## ✨ Uso Basico

```bash
import { makeWASocket, useMultiFileAuthState } from 'hepeinbaileys'

const start = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const sock = makeWASocket({ printQRInTerminal: true, auth: state })

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('messages.upsert', ({ messages }) => {
    const m = messages[0]
    if (!m?.message) return
    if ((m.message.conversation || '').toLowerCase() === 'ping') {
      sock.sendMessage(m.key.remoteJid, { text: 'pong 🏓' })
    }
  })
}

start().catch(console.error)

```
