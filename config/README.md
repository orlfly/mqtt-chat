# Application Configuration

This document describes the configuration system for the MQTT Chat application.

## Configuration Structure

The application uses a centralized configuration system with the following hierarchy:

1. Environment variables (highest priority)
2. Default values (lowest priority)

## Configuration Options

### MQTT Configuration

- `REACT_APP_MQTT_BROKER_URL`: The WebSocket URL for the MQTT broker (default: `ws://localhost:8083/mqtt`)
- `REACT_APP_MQTT_USERNAME`: Username for MQTT authentication (default: `admin`)
- `REACT_APP_MQTT_PASSWORD`: Password for MQTT authentication (default: `public`)
- `REACT_APP_MQTT_CONNECT_TIMEOUT`: Connection timeout in milliseconds (default: `30000`)
- `REACT_APP_MQTT_RECONNECT_PERIOD`: Reconnection interval in milliseconds (default: `5000`)

### EMQX API Configuration

- `REACT_APP_EMQX_BASE_URL`: Base URL for EMQX REST API (default: `http://localhost:18083`)
- `REACT_APP_EMQX_API_KEY`: API key for EMQX authentication
- `REACT_APP_EMQX_API_SECRET`: API secret for EMQX authentication

### Development Configuration

- `REACT_APP_DEV_PROXY_PATH`: Path used for API proxy in development (default: `/api/v5`)

## Environment Setup

Copy the `.env.example` file to `.env` and update the values as needed:

```bash
cp .env.example .env
```

Then modify the values in the `.env` file to match your environment.