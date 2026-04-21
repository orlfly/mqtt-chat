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