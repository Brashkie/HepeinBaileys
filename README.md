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

<!-- Animated feature grid -->
<style>
/* Puede que algunos hosts (p.ej. GitHub) ignoren <style>. En VS Code y muchos renderizadores sí funciona. */
:root { --card:#0f172a; --text:#e5e7eb; --muted:#94a3b8; --ring:#22d3ee; }
.grid {
  display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.card {
  background: var(--card);
  color: var(--text);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255,255,255,0.06);
  box-shadow: 0 6px 24px rgba(0,0,0,.25);
  position: relative;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .2s ease;
}
.card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,.35); }
.card .spark {
  position:absolute; inset:-1px; border-radius:16px;
  background: conic-gradient(from 0deg, #00D1FF, #39FF14, #8A2BE2, #00D1FF);
  filter: blur(18px); opacity:.18; animation: spin 6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.tag {
  display:inline-block; font-size:12px; color:var(--muted); border:1px solid rgba(255,255,255,0.12);
  padding:4px 8px; border-radius:999px; margin-bottom:8px;
}
.kf { display:flex; gap:10px; align-items:flex-start; }
.kf b { font-size:16px; }
.kf p { margin:4px 0 0; color:var(--muted); font-size:13px; line-height:1.35; }
.shimmer {
  background: linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.16), rgba(255,255,255,0.06));
  background-size: 200% 100%;
  animation: shimmer 2.5s infinite;
  height: 8px; border-radius: 6px; margin-top: 10px;
}
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.btn {
  display:inline-block; padding:10px 14px; border-radius:12px; border:1px solid rgba(255,255,255,0.12);
  text-decoration:none; color:white; margin-right:8px; font-weight:600;
}
.btn:hover { box-shadow:0 6px 22px rgba(34,211,238,.2); }
.primary { border-color: var(--ring); }
</style>

## 🚀 Características

<div class="grid">
  <div class="card">
    <div class="spark"></div>
    <span class="tag">🔐 Seguridad</span>
    <div class="kf">
      <div>🔐</div>
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
      <div>🧠</div>
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
      <div>📡</div>
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
      <div>⚡</div>
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
