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

The MQTT broker URL is configured in `src/services/mqttService.ts`:
```typescript
private readonly brokerUrl: string = 'ws://localhost:8080';
```

Update this URL to point to your MQTT broker.

## Development

To run the application in development mode:
```bash
npm start
```

To build for production:
```bash
npm run build
```

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
    server_name your-domain.com;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

4. Test and reload nginx:
```bash
nginx -t
nginx -s reload
```

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