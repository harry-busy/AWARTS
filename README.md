<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=e87a35&height=200&section=header&text=AWARTS&fontSize=80&fontAlignY=35&desc=AI%20Workflow%20Activity%20&%20Runtime%20Tracking%20System&descAlignY=55&descAlign=50&animation=twinkling" />

<a href="https://git.io/typing-svg"><img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=24&pause=1000&color=E87A35&center=true&vCenter=true&width=600&lines=The+Strava+for+AI+Coding;Track+your+Claude,+Codex,+and+Gemini+usage;Compete+on+global+leaderboards;Earn+achievements+and+streaks!" alt="Typing SVG" /></a>

<br/>

[![Vercel Status](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://awarts.club)
[![Convex](https://img.shields.io/badge/Convex-Backend-FF6B6B?style=for-the-badge&logo=convex&logoColor=white)](https://convex.dev)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

<br/>

### 🏆 Track, Share, and Compete in the New Era of AI-Assisted Development

[**Live Demo**](https://awarts.club) | [**Documentation**](https://awarts.club/docs) | [**Leaderboard**](https://awarts.club/leaderboard)

</div>

---

## 🚀 What is AWARTS?

**AWARTS** (AI Workflow Activity & Runtime Tracking System) is a social fitness tracker for AI-assisted coding. Think of it as **Strava for AI Developers**. 

### 🏃 Why "Strava for AI"?
Just like Strava tracks your runs and rides, AWARTS tracks your **vibe coding** sessions. Whether you are using **Claude Code**, **OpenAI Codex**, **Google Gemini**, or **Antigravity**, AWARTS quietly runs in the background, tracks your local usage automatically, and pushes it to a global leaderboard. 

*   **Compete** on global and country-specific leaderboards.
*   **Share** your coding sessions with the community.
*   **Maintain** daily coding streaks and earn "elite" badges.
*   **Analyze** your token usage and AI spend across all providers.

<div align="center">
  <img src="assets/dashboard.png" width="800" alt="AWARTS Dashboard Overview" />
</div>

## ✨ Features

🔥 **Background Tracking:** A silent CLI daemon (`awarts daemon start`) tracks your local usage automatically every hour.  
🌐 **Chrome Extension:** Seamlessly count Claude tokens straight from the web browser.  
📊 **Global Leaderboards:** See who is pushing the most AI code worldwide.  
🏅 **Achievements & Streaks:** Maintain your daily coding streak and unlock special badges.  
🔐 **Privacy First:** Only anonymous usage metrics (tokens, costs, providers) are sent to the cloud. Your source code and prompts **never** leave your machine.  

## 📦 Getting Started

You can install and setup the AWARTS CLI in seconds. It requires Node.js 18+.

```bash
# 1. Start the CLI
npx awarts@latest login

# 2. Sync your local AI usage
npx awarts@latest sync

# 3. Start the background daemon (auto-syncs every 1 hour)
npx awarts@latest daemon start
```

## 🛠️ Built With

*   **Frontend:** React (Vite), Tailwind CSS, Framer Motion, Recharts
*   **Backend:** Convex (Real-time database and serverless functions)
*   **Authentication:** Clerk (Email/Password & OAuth)
*   **CLI:** Node.js, Commander.js

## 🤝 Open Source Issues

AWARTS is currently seeking contributions for two major architectural improvements! Check out the active issues on GitHub:

*   [**Issue #20:** Support multi-account isolation for local token tracking](https://github.com/HarshalJain-cs/AWARTS/issues/20)
*   [**Issue #21:** Implement omnichannel tracking for all AI providers (Web, Desktop App, Terminal)](https://github.com/HarshalJain-cs/AWARTS/issues/21)

---

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=e87a35&height=100&section=footer" />
  <p>Shipped by <b>Harry</b></p>
</div>

---
Built by [Harshal Gandhi](https://www.harshalgandhi.com), Co-Founder & CEO of [Ospyr Ventures](https://ospyrventures.com).
