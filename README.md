# MQTT Chat Application

A modern React-based chat application that uses MQTT protocol for real-time messaging, featuring both private and group chat functionality with EMQX API integration.

## ✨ Features

### Core Features
- **Real-time messaging** using MQTT v5 protocol
- **Private chats** (one-on-one conversations)
- **Group chats** with member management
- **File sharing** (images and documents up to 10MB)
- **Markdown support** in messages
- **@mentions** in group chats with autocomplete
- **Message copy** with clipboard fallback for HTTP environments

### User Experience
- **Responsive design** with collapsible sidebar
- **Modern UI** with Material-UI components
- **Message bubbles** with sender avatars and timestamps
- **Online/offline status** indicators
- **Message persistence** in localStorage
- **Optimistic UI updates** for immediate feedback

### Group Management
- **Create groups** with member selection
- **Invite members** to existing groups
- **Remove members** from groups
- **Delete groups** with member notifications
- **View group members** with online status
- **Group member details** with client information

### EMQX Integration
- **Client monitoring** via EMQX REST API
- **Topic subscription management**
- **Broker status and metrics**
- **Authentication and authorization sources**
- **Rule engine statistics**

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **UI Framework**: Material-UI (MUI) v5
- **State Management**: Zustand + React Context
- **Messaging**: MQTT v5 via `mqtt` library
- **HTTP Client**: Axios for EMQX API calls
- **Build Tool**: Create React App (CRA)

### Component Architecture
```
src/
├── components/
│   ├── ChatContainer.tsx      # Main container (sidebar + chat)
│   ├── ChatMainContent.tsx    # Chat area with messages and input
│   ├── Sidebar.tsx            # Collapsible room list with search
│   ├── LoginPage.tsx          # MQTT connection authentication
│   ├── ChatLayout.tsx         # Layout wrapper
│   ├── CreateGroupDialog.tsx  # Group creation dialog
│   └── InviteMemberDialog.tsx # Group member invitation dialog
├── services/
│   ├── mqttService.ts         # MQTT connection and message handling
│   ├── emqxApiService.ts      # EMQX REST API client
│   ├── emqxApiClient.ts       # EMQX API singleton instance
│   └── mockMQTTService.ts     # Fallback service for development
├── context/
│   └── ClientContext.tsx      # Client state management
├── config/
│   └── appConfig.ts           # Application configuration
└── setupProxy.js              # Development proxy for EMQX API
```

### Message Flow
1. **Connection**: User logs in with MQTT credentials
2. **Subscription**: Client subscribes to personal inbound topic (`{clientId}/inbound`)
3. **Message Send**: Messages published to target topics
4. **Message Receive**: MQTT broker delivers messages to subscribed topics
5. **Storage**: Messages saved to localStorage for persistence
6. **Display**: React components render messages with real-time updates

### Topic Patterns
- **Private messages**: `{targetClientId}/inbound`
- **Group messages**: `group_{groupName}/bound`
- **System messages**: `{clientId}/inbound` (invites, dismissals)

## 🚀 Getting Started

### Prerequisites
- Node.js v14 or higher
- MQTT broker (EMQX recommended)
- EMQX v5+ with REST API enabled

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

3. Configure environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
# MQTT Configuration
REACT_APP_MQTT_BROKER_URL=ws://localhost:8083/mqtt
REACT_APP_MQTT_CLIENT_ID=mqtt-chat-client

# EMQX API Configuration
REACT_APP_EMQX_BASE_URL=http://localhost:18083
REACT_APP_EMQX_API_KEY=your-api-key
REACT_APP_EMQX_API_SECRET=your-api-secret
```

5. Start the development server:
```bash
npm start
```

The application will be available at http://localhost:3000

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_MQTT_BROKER_URL` | MQTT WebSocket URL | `ws://localhost:8083/mqtt` |
| `REACT_APP_MQTT_CLIENT_ID` | MQTT client identifier | `mqtt-chat-client` |
| `REACT_APP_EMQX_BASE_URL` | EMQX API base URL | `http://localhost:18083` |
| `REACT_APP_EMQX_API_KEY` | EMQX API key for authentication | - |
| `REACT_APP_EMQX_API_SECRET` | EMQX API secret for authentication | - |

### EMQX Setup
1. Install and start EMQX v5+
2. Enable REST API in EMQX configuration
3. Create API credentials in EMQX Dashboard
4. Configure CORS or use proxy (see Deployment section)

## 🔧 Development

### Development Server
```bash
npm start
```

The development server includes a proxy configuration (`setupProxy.js`) that forwards API requests to EMQX, avoiding CORS issues.

### Development Proxy
During development, the proxy handles:
- `/api/v5/*` → `http://localhost:18083/api/v5/*` (EMQX API)
- WebSocket connections are handled directly by the MQTT client

### Building for Production
```bash
npm run build
```

Builds the app for production to the `build` folder.

## 🚢 Production Deployment

### Nginx Deployment

1. Build the application:
```bash
npm run build
```

2. Copy build files to nginx directory:
```bash
cp -r build/* /usr/share/nginx/html/
```

3. Create nginx configuration (`/etc/nginx/conf.d/mqtt-chat.conf`):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /usr/share/nginx/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # EMQX API proxy
    location /api/v5/ {
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

4. Update environment variables for production:
```env
# Comment out direct MQTT URL to use nginx proxy
# REACT_APP_MQTT_BROKER_URL=ws://localhost:8083/mqtt

# Use relative path for EMQX API
REACT_APP_EMQX_BASE_URL=/api/v5
```

5. Reload nginx:
```bash
nginx -t
nginx -s reload
```

### Docker Deployment

1. Create Dockerfile:
```dockerfile
FROM nginx:alpine
COPY build/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. Build and run:
```bash
docker build -t mqtt-chat .
docker run -d -p 80:80 mqtt-chat
```

## 🔌 API Integration

### EMQX REST API Endpoints

The application uses the following EMQX v5 API endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/clients` | GET | List connected clients |
| `/clients/{clientid}` | GET, DELETE | Client details, disconnect |
| `/nodes` | GET | Broker node status |
| `/monitor_current` | GET | Broker metrics |
| `/subscriptions` | GET | Topic subscriptions |
| `/topics` | GET | Active topics |
| `/authentication` | GET | Authentication sources |
| `/authorization/sources` | GET | Authorization sources |
| `/bridges` | GET | Data bridges |

### MQTT Implementation

The MQTT service (`src/services/mqttService.ts`) handles:
- Connection management with user properties
- Topic subscription/unsubscription
- Message publishing with QoS settings
- Real-time message listening
- Connection fallback to mock service
- LocalStorage persistence

### Message Format

```typescript
interface Message {
  id: string;
  text?: string;
  senderId: string;
  timestamp: Date;
  targetIds?: string[];
  type?: 'text' | 'file';
  fileName?: string;
  fileType?: string;
  fileData?: string;
}
```

### User Properties (MQTT v5)

Messages include user properties for metadata:
- `name`: Sender display name
- `description`: Sender description
- `emoji`: Sender avatar emoji
- `reply_to`: Reply target topic

## 📁 Project Structure

### Key Components

1. **ChatMainContent** (`src/components/ChatMainContent.tsx`)
   - Renders chat messages with bubbles
   - Handles message input and sending
   - Manages file uploads and @mentions
   - Implements message copy functionality

2. **Sidebar** (`src/components/Sidebar.tsx`)
   - Displays chat rooms (private and group)
   - Search and filter functionality
   - Collapsible design with responsive layout
   - Group management actions (invite, detail, delete)

3. **MQTT Service** (`src/services/mqttService.ts`)
   - Singleton MQTT client management
   - Connection state handling
   - Message publishing/subscription
   - LocalStorage integration
   - Mock service fallback

4. **EMQX API Service** (`src/services/emqxApiService.ts`)
   - REST API client for EMQX
   - Authentication with Basic Auth
   - Error handling and logging
   - Type-safe API responses

### State Management

- **ClientContext**: Manages client list and online status
- **LocalStorage**: Persists messages and client details
- **React State**: Component-level state for UI interactions
- **Zustand**: Global state management (if extended)

## 🧪 Testing

### Running Tests
```bash
npm test
```

### Type Checking
```bash
npx tsc --noEmit
```

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Use proxy in development (`setupProxy.js`)
   - Configure nginx proxy in production
   - Enable CORS in EMQX configuration

2. **WebSocket Connection Issues**
   - Verify MQTT broker is running
   - Check WebSocket port accessibility
   - Ensure nginx proxy configuration is correct

3. **EMQX API 404 Errors**
   - Verify EMQX v5+ is installed
   - Check API endpoint compatibility
   - Update API URLs if using older EMQX version

4. **Clipboard API Errors in HTTP**
   - Application includes fallback to `document.execCommand`
   - No action required - handled automatically

### Debugging

Enable debug logging in the browser console:
- All MQTT operations are logged with `console.log`
- API calls include error handling and logging
- Message flow is traced with detailed logs

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 🙏 Acknowledgments

- [EMQX](https://www.emqx.io/) - MQTT broker and API
- [Material-UI](https://mui.com/) - React component library
- [MQTT.js](https://github.com/mqttjs/MQTT.js) - MQTT client library
- [Create React App](https://create-react-app.dev/) - React development tooling