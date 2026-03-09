# NOVA GPT 🤖

> Your intelligent AI companion for every conversation.

NOVA GPT is a feature-rich, full-stack web application that leverages the power of **Sarvam AI** for intelligent chat, text-to-speech (TTS), and speech-to-text (STT) capabilities. It provides a natural, conversational, and highly interactive experience with voice support seamlessly built in.

---

## ✨ Features

- ⚡ **Lightning Fast Responses**: High-performance AI conversations powered by the Sarvam AI API.
- 💬 **Natural Chat History**: Context-aware, persistent chats using Firebase Firestore. Create, switch between, and delete recent chat sessions with ease.
- 🔒 **Secure & Private**: Full user authentication (Login/Registration) backed by Firebase Authentication.
- 🎙️ **Voice Interactions**: Talk directly to NOVA using your microphone (Speech-to-Text powered by Sarvam's \`saaras:v3\`) and listen to NOVA's responses (Text-to-Speech powered by \`bulbul:v3\`).
- 👤 **Custom User Profiles**: Store your age, name, and custom preferences in Firebase. NOVA uses these preferences as system prompts to tailor its responses perfectly to you.
- 🎨 **Dynamic Themes**: Toggle between a default dark design and a clean "Green mode" interface.
- 📱 **Fully Responsive**: Beautifully designed UI that works perfectly across desktops, tablets, and smartphones.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Authentication & Firestore)
- **AI Integration**: [Sarvam AI SDK](https://www.sarvam.ai/) (\`sarvamai\`)
- **Other Utilities**: \`multer\` (for handling audio uploads), \`cors\`, \`dotenv\`

---

## 📂 Project Structure

\`\`\`text
├── backend/
│   ├── server.js          # Express server handling the Sarvam AI logic (Chat, TTS, STT)
│   ├── package.json       # Backend dependencies
│   └── .env               # Environment file for secrets (Port, API Keys)
├── index.html             # Core Frontend UI with Login, Register, Profile and Chat Modals
├── style.css              # Custom styling, animations, colors, and responsive queries
└── script.js              # Frontend logic (DOM, Modals, Firebase interactions, Audio recording/processing)
\`\`\`

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.
- A [Firebase](https://console.firebase.google.com/) project configured with Authentication (Email/Password) and Cloud Firestore enabled.
- An API Key from [Sarvam AI](https://sarvam.ai).

### 2. Frontend Configuration
Open \`script.js\` and locate the \`firebaseConfig\` object at the top. Replace the values with your own Firebase project config:
\`\`\`javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID",
};
\`\`\`

### 3. Backend Configuration
Navigate to the \`backend\` directory and install the necessary dependencies:
\`\`\`bash
cd backend
npm install
\`\`\`

Create a \`\.env\` file in the \`backend\` directory and add your Sarvam AI API Key:
\`\`\`env
PORT=5000
SARVAM_API_KEY=your_sarvam_api_key_here
\`\`\`

Start the backend server:
\`\`\`bash
npm start
\`\`\`
*(The server will run on \`http://localhost:5000\` by default)*

### 4. Run the Application
Start a local static server in the root of the project to serve the \`index.html\` frontend (e.g., using the "Live Server" extension in VS Code). 
Ensure your backend Node process is running simultaneously.

Sign up for a new account on the landing page, log in, and begin your conversation with NOVA!
