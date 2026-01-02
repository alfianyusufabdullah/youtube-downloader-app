# YT-DLP Worker Downloader

A Node.js powered wrapper for `yt-dlp` using Docker-out-of-Docker (DooD) orchestration.

## Prerequisites
- Docker & Docker Compose installed.

## Setup
1. Clone the repository.
2. Build the images:
   ```bash
   docker compose build
   ```

## Usage

### Using Docker Compose (Recommended)
This project now uses BullMQ and Redis. The worker runs persistently.

1. Start the infrastructure:
   ```bash
   docker compose up -d
   ```

2. Add a job to the queue:
   You can use the provided `producer.js` (requires `npm install` in the root or running it via Docker):
   ```bash
   # Run producer from host (if Node is installed)
   cd worker-downloader && npm install
   node producer.js "https://www.youtube.com/watch?v=KfqU33wQn4c"
   ```

3. Monitoring:
   ```bash
   docker compose logs -f worker-downloader
   ```

## Advanced Features
- **BullMQ**: Reliable job queueing with Redis.
- **Resource Limits**: Download containers are restricted to 1 CPU and 512MB RAM.
- **Manual Polling**: The worker manually polls container status (`inspect`) every second.
- **Docker-out-of-Docker**: Maintains host-level container management.
