# YT-DLP Video Downloader

A full-stack YouTube video downloader with a modern web dashboard, built using Docker-out-of-Docker (DooD) orchestration. Features real-time download progress, job queue management, and a sleek UI.

![Architecture](https://img.shields.io/badge/Docker-DooD-blue) ![Queue](https://img.shields.io/badge/Queue-BullMQ-red) ![DB](https://img.shields.io/badge/DB-PostgreSQL-blue) ![UI](https://img.shields.io/badge/UI-React_Router_7-purple)

## 📦 Architecture

```mermaid
flowchart TB
    subgraph Docker["Docker Host"]
        subgraph Services["Services"]
            Redis["Redis<br/>(Queue)"]
            Postgres["PostgreSQL<br/>(Data)"]
            App["app-downloader<br/>(Web UI - :5173)"]
        end
        
        subgraph Worker["worker-downloader (BullMQ Worker)"]
            DooD["Spawns yt-dlp containers<br/>via Docker socket (DooD)"]
        end
        
        Redis <--> Worker
        Postgres <--> Worker
        Postgres <--> App
        Redis <--> App
        
        Worker --> YT["yt-dlp container"]
    end
    
    User((User)) --> App
```

### Components

| Service | Description | Tech Stack |
|---------|-------------|------------|
| **app-downloader** | Web dashboard with real-time updates | React Router 7, shadcn/ui, TailwindCSS, Drizzle ORM |
| **worker-downloader** | Background job processor | Node.js, BullMQ, Dockerode |
| **yt-downloader** | yt-dlp container image | Python, yt-dlp, ffmpeg |
| **Redis** | Job queue broker | Redis Alpine |
| **PostgreSQL** | Persistent data storage | PostgreSQL 16 |

## 🚀 Getting Started

### Prerequisites

- **Docker** & **Docker Compose** installed
- Ports `5173`, `5432`, and `6379` available

### Quick Start (Development)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd yt-dlp
   ```

2. **Build the yt-dlp image**
   ```bash
   docker build -t yt-dlp-local ./yt-downloader
   ```

3. **Start all services in development mode**
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

4. **Run database migrations** (in a new terminal)
   ```bash
   cd app-downloader
   npm install
   DATABASE_URL=postgresql://downloader:downloader@localhost:5434/downloader npm run db:push
   ```

5. **Open the dashboard**
   
   Navigate to [http://localhost:5173](http://localhost:5173)

## 💻 Development

### Development Environment

The development setup includes:
- **Hot reload** for both `app-downloader` and `worker-downloader`
- **PostgreSQL** exposed on port `5434`
- **Redis** exposed on port `6379`
- **Vite dev server** on port `5173`

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up --build

# View logs for specific service
docker compose -f docker-compose.dev.yml logs -f worker-downloader
docker compose -f docker-compose.dev.yml logs -f app-downloader
```

### Project Structure

```
yt-dlp/
├── app-downloader/          # Web dashboard (React Router 7)
│   ├── app/
│   │   ├── components/      # shadcn/ui components
│   │   ├── db/              # Drizzle ORM schema
│   │   ├── routes/          # React Router routes
│   │   ├── services/        # Business logic
│   │   └── lib/             # Utilities & queue client
│   ├── drizzle/             # Database migrations
│   └── Dockerfile
├── worker-downloader/       # BullMQ worker
│   ├── src/
│   │   ├── config/          # Redis & Docker config
│   │   ├── db/              # Database queries
│   │   ├── queues/          # Queue definitions
│   │   ├── services/        # Docker container service
│   │   └── workers/         # Job processors
│   └── Dockerfile
├── yt-downloader/           # yt-dlp Docker image
│   └── Dockerfile
├── downloads/               # Downloaded videos (gitignored)
├── docker-compose.yml       # Production setup
└── docker-compose.dev.yml   # Development setup
```

### Database Management

```bash
# Generate migration from schema changes
cd app-downloader
DATABASE_URL=postgresql://downloader:downloader@localhost:5434/downloader npm run db:generate

# Apply pending migrations
DATABASE_URL=postgresql://downloader:downloader@localhost:5434/downloader npm run db:migrate

# Push schema directly (development only)
DATABASE_URL=postgresql://downloader:downloader@localhost:5434/downloader npm run db:push

# Open Drizzle Studio (database GUI)
DATABASE_URL=postgresql://downloader:downloader@localhost:5434/downloader npm run db:studio
```

### Environment Variables

| Variable | Service | Default | Description |
|----------|---------|---------|-------------|
| `REDIS_HOST` | All | `redis` | Redis server hostname |
| `REDIS_PORT` | All | `6379` | Redis server port |
| `DATABASE_URL` | All | - | PostgreSQL connection string |
| `DOCKER_DOWNLOADS_PATH` | worker | `${PWD}/downloads` | Host path for downloaded videos |

## 🏭 Production

### Production Deployment

1. **Build all images**
   ```bash
   docker compose build
   ```

2. **Build the yt-dlp image** (required before first run)
   ```bash
   docker build -t yt-dlp-local ./yt-downloader
   ```

3. **Start production services**
   ```bash
   docker compose up -d
   ```

4. **View logs**
   ```bash
   docker compose logs -f
   ```

### Production Notes

- Downloads are persisted in the `./downloads` directory
- Production uses port `3000` for the web dashboard (vs `5173` in development)
- The `app-downloader` container runs the built React Router SSR server
- Resource limits: yt-dlp containers are restricted to **1 CPU** and **512MB RAM**

### Production Docker Compose

The production `docker-compose.yml` differs from development:
- No volume mounts for source code (uses built images)
- Uses production build targets
- No hot reload
- Uses `restart: always` for reliability

## ⚙️ Features

### Download Queue
- **BullMQ** for reliable job queueing with Redis
- Duplicate detection (prevents re-downloading same video)
- Concurrent downloads (up to 5 simultaneous)
- Failed job tracking with error messages

### Real-Time Updates
- **Server-Sent Events (SSE)** for live progress updates
- Automatic UI refresh every 2 seconds
- Visual status indicators (Queued → Processing → Merging → Completed/Failed)

### Docker-out-of-Docker (DooD)
- Worker spawns isolated yt-dlp containers
- Each download runs in its own container
- Resource isolation (CPU/Memory limits)
- Automatic container cleanup

### Download Statuses

| Status | Description |
|--------|-------------|
| `queued` | Job is waiting in the queue |
| `processing` | Video is being downloaded |
| `merging` | ffmpeg is merging video and audio streams |
| `completed` | Download finished successfully |
| `failed` | Download failed (check error message) |

## 🔧 Troubleshooting

### Common Issues

**Container permission denied on Docker socket**
```bash
# Add current user to docker group
sudo usermod -aG docker $USER
# Then logout and login again
```

**yt-dlp-local image not found**
```bash
# Build the image first
docker build -t yt-dlp-local ./yt-downloader
```

**Database connection refused**
```bash
# Ensure PostgreSQL is running
docker compose -f docker-compose.dev.yml up -d postgres
# Wait a few seconds, then try again
```

**Port already in use**
```bash
# Find and kill the process using the port
lsof -ti:5173 | xargs kill -9
# Or change the port in docker-compose.dev.yml
```

## 📝 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Built with ❤️ using Docker, React Router 7, yt-dlp, Google Antigravity**
