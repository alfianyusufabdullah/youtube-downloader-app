# yt-dlp Docker Image
# A feature-rich command-line audio/video downloader
# https://github.com/yt-dlp/yt-dlp

FROM python:3.12-alpine

LABEL maintainer="alfian"
LABEL description="yt-dlp - A feature-rich command-line audio/video downloader"
LABEL version="1.0"

# Install runtime dependencies
# - ffmpeg: for merging separate video and audio files, post-processing
# - deno: JavaScript runtime for yt-dlp-ejs (YouTube n/sig deciphering) - recommended by yt-dlp
# - ca-certificates: for HTTPS connections
RUN apk add --no-cache \
    ffmpeg \
    deno \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Install yt-dlp with all optional dependencies
RUN pip install --no-cache-dir \
    "yt-dlp[default]" \
    yt-dlp-ejs

# Create non-root user for security
RUN adduser -D -h /downloads ytdlp

# Set working directory
WORKDIR /downloads

# Switch to non-root user
USER ytdlp

# Create default config directory
RUN mkdir -p /downloads/.config/yt-dlp

# Default output template and settings
ENV YT_DLP_OUTPUT="/downloads/%(title)s.%(ext)s"

# Set entrypoint with default mp4 output and progress output
ENTRYPOINT ["yt-dlp", "--progress", "--newline"]

# Default command (show help)
CMD ["--help"]
