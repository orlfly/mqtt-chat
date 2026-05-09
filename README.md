# MQTT Chat Application

A React-based chat application that uses MQTT protocol for real-time messaging. Supports both one-on-one and group chat functionality.

## Features

- Real-time messaging using MQTT protocol
- One-on-one conversations
- Group chats
- Responsive design
- Modern UI with chat bubbles

## Architecture

The application consists of:

- **Frontend**: React application built with TypeScript
- **Messaging Protocol**: MQTT for real-time communication
- **Components**:
  - ChatContainer: Main container for sidebar and chat room
  - Sidebar: Displays available chat rooms
  - ChatRoom: Handles individual chat room interactions
  - MQTT Service: Manages MQTT connections and messaging

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- An MQTT broker (for production, you'll need a running MQTT server)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mqtt-chat
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at http://localhost:3000

### Configuration

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_MQTT_BROKER_URL` | MQTT WebSocket URL (dev: `ws://localhost:8083/mqtt`, prod: comment out for nginx proxy) | `ws://localhost:8083/mqtt` |
| `REACT_APP_MQTT_CLIENT_ID` | MQTT client ID | `mqtt-chat-client` |
| `REACT_APP_EMQX_BASE_URL` | EMQX API base URL (use `/api/emqx` for both dev and prod) | `/api/emqx` |
| `REACT_APP_EMQX_API_KEY` | EMQX API key | - |
| `REACT_APP_EMQX_API_SECRET` | EMQX API secret | - |

> `REACT_APP_EMQX_BASE_URL` uses relative path `/api/emqx` in both development and production. The actual proxy target is configured separately in `setupProxy.js` (dev) or nginx (prod).

## Development

Development uses `setupProxy.js` to proxy API requests, no CORS issues:

```bash
npm start
```

Request flow: `/api/emqx/clients` → `setupProxy.js` → `http://localhost:18083/api/v5/clients`

## Production Deployment

### Nginx Deployment

1. Build the application:
```bash
npm run build
```

2. Copy the build files to nginx directory:
```bash
cp -r build/* /usr/share/nginx/html/
```

3. Create nginx configuration file `/etc/nginx/conf.d/mqtt-chat.conf`:
```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # EMQX API proxy (avoids CORS issues)
    location /api/emqx/ {
        proxy_pass http://localhost:18083/api/v5/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # MQTT WebSocket proxy
    location /mqtt {
        proxy_pass http://localhost:8083/mqtt;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

4. For production build, comment out `REACT_APP_MQTT_BROKER_URL` in `.env` to use nginx WebSocket proxy:
```bash
# REACT_APP_MQTT_BROKER_URL=ws://localhost:8083/mqtt
```

5. Build and deploy:
```bash
npm run build
cp -r build/* /usr/share/nginx/html/
```

6. Test and reload nginx:
```bash
nginx -t
nginx -s reload
```

**Request flow:**
- API: `/api/emqx/clients` → nginx → `http://localhost:18083/api/v5/clients`
- MQTT: `ws://your-domain/mqtt` → nginx → `http://localhost:8083/mqtt`

> **Note:** For development, keep `REACT_APP_MQTT_BROKER_URL=ws://localhost:8083/mqtt` to connect directly to EMQX. For nginx deployment, comment it out to use the nginx WebSocket proxy.

### Subdirectory Deployment

If deploying to a subdirectory (e.g., `/chat/`):

1. Add homepage field to `package.json`:
```json
{
  "homepage": "/chat/"
}
```

2. Rebuild and update nginx config:
```nginx
location /chat {
    alias /usr/share/nginx/html;
    try_files $uri $uri/ /chat/index.html;
}
```

### Docker Deployment

```dockerfile
FROM nginx:alpine
COPY build/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t mqtt-chat .
docker run -d -p 80:80 mqtt-chat
```

## MQTT Implementation

The application uses the `mqtt` library to connect to an MQTT broker and handles messaging through topics:

- Each room has a unique topic: `chat/{roomId}`
- Messages are published/subscribed using JSON format
- The MQTT service manages connections and message routing

## Project Structure

```
src/
├── components/
│   ├── ChatContainer.tsx
│   ├── ChatRoom.tsx
│   ├── Sidebar.tsx
├── services/
│   └── mqttService.ts
├── App.tsx
├── index.tsx
└── ...
```