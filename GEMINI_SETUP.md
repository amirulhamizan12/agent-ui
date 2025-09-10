# Gemini AI Chat Setup

This application now includes a Gemini AI chat feature with voice input capabilities.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 3. Environment Configuration
Create a `.env.local` file in the root directory and add:
```
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Application
```bash
npm run dev
```

## Features

- **Voice Input**: Real-time audio processing with microphone input
- **Text Input**: Traditional text-based chat interface
- **WebSocket Connection**: Real-time communication with Gemini API
- **Connection Status**: Visual indicators for connection state
- **Responsive Design**: Works on desktop and mobile devices

## Usage

1. Navigate to the "AI Chat" tab in the application
2. Wait for the connection to establish (green status indicator)
3. Use either:
   - **Voice**: Click the microphone button and speak
   - **Text**: Type your message in the text input field

## Technical Details

- Uses Gemini 2.0 Flash Live model
- Audio processing via Web Audio API and AudioWorklet
- Real-time WebSocket communication
- PCM audio encoding for optimal performance
- Automatic reconnection on connection loss

## Troubleshooting

- Ensure microphone permissions are granted
- Check that the API key is correctly set in `.env.local`
- Verify internet connection for WebSocket communication
- Check browser console for any error messages
