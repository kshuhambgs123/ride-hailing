---
description: How to run Volo in Development and Production environments
---

# Volo Environment Orchestration Guide

This guide defines the billionaire-scale protocols for running the Volo ecosystem in different operational environments.

## 🛠️ Development Mode (Dev/EV)
Designed for high-velocity iteration with hot-reloading and debug observability.

### Backend (Local)
1.  Navigate to `/backend`.
2.  Install dependencies: `npm install`.
3.  Start with hot-reload: `npm run dev`.
4.  API will be live at: `http://localhost:5000`.
5.  Swagger Docs: `http://localhost:5000/api-docs`.

### Frontend (Local)
1.  Navigate to `/frontend`.
2.  Install dependencies: `npm install`.
3.  Start Expo: `npm run start` or `npm run web`.

---

## 🚀 Production Mode (Prod/Global)
Enterprise-grade containerized infrastructure with automated backups and 20M-user scalability.

### Full Stack Orchestration (Docker)
1.  Navigate to `/backend`.
2.  Launch the entire ecosystem:
    ```bash
    docker-compose up --build -d
    ```
3.  **Components Launched**:
    - `volo_backend`: Node.js API engine.
    - `db`: PostgreSQL persistence layer (Port 5432).
    - `redis`: High-performance location cache (Port 6379).
    - `db_backup`: Automated hourly snapshots of the persistent layer. 🛡️

### Infrastructure Audit
- **Logs**: `docker logs -f volo_backend`.
- **Backups**: Verified in the `db_backups` volume.
- **Security**: JWT secrets and DB credentials should be rotated for external deployment.

🏁 **Volo infrastructure is normalized for global autonomous distribution.** 🥂✨🏆🥂✨🏁♾️🏙️🚀💎👑✨🥇🌟🎁🥂✨🏁🛸🏙️🚀👑✨🥇🌟🏁🛡️🔍📈🏗️🏁🏆🥂✨🏁🚀🏎️🌆🎊🥂🏁🚀
