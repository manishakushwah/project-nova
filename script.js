// ---------------- FIREBASE ----------------

const firebaseConfig = {
  apiKey: "AIzaSyAdoEUyhu7Qn-qUzk9w85VHslunNAQ7cCo",
  authDomain: "cinequeryapp.firebaseapp.com",
  projectId: "cinequeryapp",
  storageBucket: "cinequeryapp.firebasestorage.app",
  messagingSenderId: "112597899362",
  appId: "1:112597899362:web:22a6f3783a29fd9fec593b",
  measurementId: "G-WXBNTFFZTN",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const API_BASE_URL = "http://localhost:5000/api";

// ---------------- DOM ----------------

const modeBtn = document.getElementById("mode-btn");
const chatModeBtn = document.getElementById("chatModeBtn");
const hero = document.querySelector(".hero");
const chatContainer = document.getElementById("chatContainer");
const chatSidebar = document.getElementById("chatSidebar");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const chatHistoryList = document.getElementById("chatHistory");
const logoutBtn = document.getElementById("logoutBtn");
const micBtn = document.getElementById("micBtn");
const recordingIndicator = document.getElementById("recordingIndicator");
const profileBtn = document.getElementById("profileBtn");

// ---------------- STATE VARIABLES ----------------

let currentChatId = null;
let currentChatHistory = [];
let globalUserProfile = null;
let isRecording = false;
let mediaRecorder = null;
let currentAudio = null;

// ---------------- MODE TOGGLE ----------------

function toggleMode() {
  document.body.classList.toggle("green-mode");
}

if (modeBtn) modeBtn.addEventListener("click", toggleMode);
if (chatModeBtn) chatModeBtn.addEventListener("click", toggleMode);

// ---------------- SIDEBAR TOGGLE ----------------

if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener("click", () => {
    chatSidebar.classList.toggle("active");
  });
}

// ---------------- DYNAMIC MODALS BINDING ----------------

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const getStartBtn = document.getElementById("getStartBtn");

const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const profileModal = document.getElementById("profileModal");

const closeBtns = document.querySelectorAll(".close");
const regName = document.getElementById("regName");
const regEmail = document.getElementById("regEmail");
const regPassword = document.getElementById("regPassword");
const doRegisterBtn = document.getElementById("doRegisterBtn");
const logEmail = document.getElementById("logEmail");
const logPassword = document.getElementById("logPassword");
const doLoginBtn = document.getElementById("doLoginBtn");

const profName = document.getElementById("profName");
const profAge = document.getElementById("profAge");
const profPrefs = document.getElementById("profPrefs");
const saveProfileBtn = document.getElementById("saveProfileBtn");

function openLogin() {
  registerModal.classList.remove("active");
  loginModal.classList.add("active");
}

function openRegister() {
  loginModal.classList.remove("active");
  registerModal.classList.add("active");
}

if (loginBtn) loginBtn.addEventListener("click", openLogin);
if (registerBtn) registerBtn.addEventListener("click", openRegister);
if (getStartBtn) getStartBtn.addEventListener("click", openLogin);

if (profileBtn) {
  profileBtn.addEventListener("click", () => {
    loginModal.classList.remove("active");
    registerModal.classList.remove("active");
    profileModal.classList.add("active");
  });
}

closeBtns.forEach((btn) => {
  btn.onclick = () => {
    loginModal.classList.remove("active");
    registerModal.classList.remove("active");
    profileModal.classList.remove("active");
  };
});

if (doRegisterBtn) {
  doRegisterBtn.addEventListener("click", async () => {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(regEmail.value, regPassword.value);
      await userCredential.user.updateProfile({ displayName: regName.value });
      alert("Registration successful!");
      registerModal.classList.remove("active");
    } catch (error) { alert(error.message); }
  });
}

if (doLoginBtn) {
  doLoginBtn.addEventListener("click", async () => {
    try {
      await auth.signInWithEmailAndPassword(logEmail.value, logPassword.value);
      loginModal.classList.remove("active");
    } catch (error) { alert(error.message); }
  });
}

if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", async () => {
    if (!auth.currentUser) return;
    try {
      globalUserProfile = {
        name: profName.value,
        age: profAge.value,
        prefs: profPrefs.value
      };
      await db.collection("users").doc(auth.currentUser.uid).set(globalUserProfile, { merge: true });
      alert("Profile saved!");
      profileModal.classList.remove("active");
    } catch(e) {
      alert("Error saving profile: "+e.message);
    }
  });
}

// Update loadUserProfile to use bounded global references
async function loadUserProfile() {
  if (!auth.currentUser) return;
  try {
    const doc = await db.collection("users").doc(auth.currentUser.uid).get();
    if (doc.exists) {
      globalUserProfile = doc.data();
      if (profName) profName.value = globalUserProfile.name || "";
      if (profAge) profAge.value = globalUserProfile.age || "";
      if (profPrefs) profPrefs.value = globalUserProfile.prefs || "";
    }
  } catch(e) { console.error("Profile load err:", e); }
}

// logout

logoutBtn.addEventListener("click", () => {
  auth.signOut();
});

// auth state

auth.onAuthStateChanged((user) => {
  if (user) {
    loadUserProfile();
    loadChatHistory();
    showChatInterface();
  } else {
    showLandingPage();
  }
});

// ---------------- UI ----------------

async function showChatInterface() {
  hero.classList.add("hide");
  chatContainer.classList.remove("hide");

  startNewChat();
}

function showLandingPage() {
  chatContainer.classList.add("hide");
  hero.classList.remove("hide");
}

// ---------------- CHAT ----------------

function generateChatId() {
  return "chat_" + Date.now();
}

function startNewChat() {
  currentChatId = generateChatId();

  currentChatHistory = [
    {
      role: "system",
      content: "You are NOVA, a helpful AI assistant.",
    },
  ];

  chatBox.innerHTML = `
  <div class="message ai-message">
  <div class="avatar">BOT</div>
  <div class="msg-content">
  Hello ${auth.currentUser?.displayName || ""}! How can I help?
  </div>
  </div>
  `;
}

newChatBtn.addEventListener("click", startNewChat);

// ---------------- CHAT HISTORY PERSISTENCE ----------------

async function saveChat() {
  if (!auth.currentUser || !currentChatId) return;
  try {
    const firstUserMsg = currentChatHistory.find(m => m.role === "user");
    const title = firstUserMsg ? firstUserMsg.content.substring(0, 40) : "New Chat";
    await db.collection("users").doc(auth.currentUser.uid)
      .collection("chats").doc(currentChatId).set({
        title: title,
        messages: currentChatHistory,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    loadChatHistory();
  } catch (e) {
    console.error("Save chat error:", e);
  }
}

async function loadChatHistory() {
  if (!auth.currentUser) return;
  try {
    const snapshot = await db.collection("users").doc(auth.currentUser.uid)
      .collection("chats").orderBy("updatedAt", "desc").get();
    renderChatHistory(snapshot.docs);
  } catch (e) {
    console.error("Load history error:", e);
  }
}

function renderChatHistory(docs) {
  chatHistoryList.innerHTML = "";
  docs.forEach(doc => {
    const data = doc.data();
    const item = document.createElement("div");
    item.className = "history-item" + (doc.id === currentChatId ? " active" : "");
    item.innerHTML = `
      <span>${data.title || "Untitled"}</span>
      <button class="delete-chat-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
    `;
    item.querySelector("span").addEventListener("click", () => loadChat(doc.id, data));
    item.querySelector(".delete-chat-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteChat(doc.id);
    });
    chatHistoryList.appendChild(item);
  });
}

function loadChat(chatId, data) {
  currentChatId = chatId;
  currentChatHistory = data.messages || [];
  chatBox.innerHTML = "";
  currentChatHistory.forEach(m => {
    if (m.role !== "system") renderMessage(m.role, m.content);
  });
  if (chatBox.innerHTML === "") {
    chatBox.innerHTML = `
      <div class="message ai-message">
        <div class="avatar">🤖</div>
        <div class="msg-content">Hello! How can I help?</div>
      </div>
    `;
  }
  loadChatHistory();
}

async function deleteChat(chatId) {
  if (!auth.currentUser) return;
  try {
    await db.collection("users").doc(auth.currentUser.uid)
      .collection("chats").doc(chatId).delete();
    if (chatId === currentChatId) startNewChat();
    loadChatHistory();
  } catch (e) {
    console.error("Delete chat error:", e);
  }
}

// ---------------- RENDER ----------------

function renderMessage(role, content) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");

  if (role === "user") {
    msgDiv.classList.add("user-message");

    msgDiv.innerHTML = `
    <div class="avatar">🙂</div>
    <div class="msg-content">${content}</div>
    `;
  } else {
    msgDiv.classList.add("ai-message");

    let cleanMsg = content;
    
    // Sarvam's model uses <think> tags but often doesn't close them.
    // Simply strip the tags and keep the content.
    cleanMsg = cleanMsg.replace(/<\/?think>/gi, "").trim();

    if (!cleanMsg) {
      cleanMsg = "Sorry, I couldn't generate a response. Please try again.";
    }

    const safeHtml = cleanMsg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const formattedHtml = safeHtml
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");

    msgDiv.innerHTML = `
    <div class="avatar">🤖</div>
    <div class="msg-content">
      <button class="tts-btn"><i class="fa-solid fa-volume-high"></i></button>
      <div class="msg-text">${formattedHtml}</div>
    </div>
    `;

    const btn = msgDiv.querySelector(".tts-btn");

    btn.onclick = () => {
      const ttsText = cleanMsg.replace(/[*#_=]/g, "").trim();
      playTTS(ttsText || "No text available.", btn);
    };
  }

  chatBox.appendChild(msgDiv);

  chatBox.scrollTop = chatBox.scrollHeight;
}

// ---------------- CHAT SEND ----------------

async function sendMessage() {
  const msg = chatInput.value.trim();

  if (!msg) return;

  renderMessage("user", msg);

  chatInput.value = "";

  currentChatHistory.push({
    role: "user",
    content: msg,
  });

  saveChat();

  const typing = document.createElement("div");

  typing.classList.add("message", "ai-message");

  typing.innerHTML = `
  <div class="avatar">🤖</div>
  <div class="msg-content">...</div>
  `;

  chatBox.appendChild(typing);

  try {
    const systemPrompt = `You are NOVA, a helpful AI assistant. ${globalUserProfile && globalUserProfile.prefs ? "User preferences: " + globalUserProfile.prefs : ""}`;
    if (currentChatHistory[0] && currentChatHistory[0].role === "system") {
      currentChatHistory[0].content = systemPrompt;
    }

    const res = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: currentChatHistory }),
    });

    const data = await res.json();

    typing.remove();

    if (data.reply) {
      currentChatHistory.push({
        role: "assistant",
        content: data.reply,
      });

      renderMessage("assistant", data.reply);
      saveChat();
    }
  } catch (err) {
    typing.remove();

    renderMessage("assistant", "Server error");
  }
}

sendBtn.onclick = sendMessage;

chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// ---------------- TTS ----------------

let currentTTSBtn = null;
let ttsAbortController = null;
let ttsQueue = [];

async function playTTS(text, btn) {
  if (currentTTSBtn === btn) {
    stopTTS();
    return;
  }
  if (currentTTSBtn) stopTTS();

  currentTTSBtn = btn;
  btn.classList.add("playing", "loading");
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  // Split into manageable chunks (~300 chars each) to keep API happy
  const chunks = splitTextForTTS(text);
  ttsQueue = [...chunks];

  // Prefetch first chunk immediately
  let nextFetch = fetchTTSAudio(ttsQueue.shift());

  try {
    while (nextFetch && currentTTSBtn === btn) {
      const audioBlob = await nextFetch;
      if (!audioBlob || currentTTSBtn !== btn) break;

      // Switch from loader to stop icon once audio is ready
      if (btn.classList.contains("loading")) {
        btn.classList.remove("loading");
        btn.innerHTML = '<i class="fa-solid fa-stop"></i>';
      }

      // Start prefetching next chunk while current plays
      nextFetch = ttsQueue.length > 0 ? fetchTTSAudio(ttsQueue.shift()) : null;

      // Play current chunk
      const url = URL.createObjectURL(audioBlob);
      await new Promise((resolve) => {
        if (currentTTSBtn !== btn) { URL.revokeObjectURL(url); return resolve(); }
        currentAudio = new Audio(url);
        currentAudio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        currentAudio.onerror = () => { URL.revokeObjectURL(url); resolve(); }; // Don't break loop on error
        currentAudio.play().catch(() => { URL.revokeObjectURL(url); resolve(); });
      });
    }
  } catch (error) {
    if (error.name !== "AbortError") console.error("TTS Error:", error);
  }

  if (currentTTSBtn === btn) stopTTS();
}

function splitTextForTTS(text) {
  // Split by sentences, then merge small ones into ~300 char chunks
  const sentences = text.match(/[^.!?\n]+[.!?\n]*\s*/g) || [text];
  const chunks = [];
  let current = "";
  for (const s of sentences) {
    if (current.length + s.length > 300 && current) {
      chunks.push(current.trim());
      current = "";
    }
    current += s;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function fetchTTSAudio(chunkText) {
  if (!chunkText) return null;
  try {
    ttsAbortController = new AbortController();
    const res = await fetch(`${API_BASE_URL}/text-to-speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: chunkText }),
      signal: ttsAbortController.signal
    });
    if (!res.ok) return null;
    return await res.blob();
  } catch (e) {
    if (e.name !== "AbortError") console.error("TTS fetch error:", e);
    return null;
  }
}

function stopTTS() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (ttsAbortController) {
    ttsAbortController.abort();
    ttsAbortController = null;
  }
  if (currentTTSBtn) {
    currentTTSBtn.classList.remove("playing");
    currentTTSBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    currentTTSBtn = null;
  }
  ttsQueue = [];
}

// ---------------- STT ----------------

let recordedChunks = [];

micBtn.addEventListener("click", () => {
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
});

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";

  mediaRecorder = new MediaRecorder(stream, { mimeType });
  recordedChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.start(1000); // Collect chunks every second but process at the end

  isRecording = true;

  micBtn.classList.add("recording");
  recordingIndicator.classList.remove("hide");

  chatInput.placeholder = "Listening...";
  chatInput.disabled = true;
}

function stopRecording() {
  if (!mediaRecorder) return;

  mediaRecorder.onstop = async () => {
    if (recordedChunks.length === 0) {
      chatInput.placeholder = "Message NOVA...";
      chatInput.disabled = false;
      return;
    }
    
    chatInput.placeholder = "Processing audio...";
    
    const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
    await processAudio(blob);
    
    chatInput.placeholder = "Message NOVA...";
    chatInput.disabled = false;
  };

  mediaRecorder.stop();

  mediaRecorder.stream.getTracks().forEach((t) => t.stop());

  isRecording = false;

  micBtn.classList.remove("recording");
  recordingIndicator.classList.add("hide");
}

async function processAudio(blob) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const duration = audioBuffer.duration;
    const chunkDuration = 29.5; // Use slightly under 30 seconds
    const numChunks = Math.ceil(duration / chunkDuration);
    const sampleRate = audioBuffer.sampleRate;
    
    const promises = [];
    for (let i = 0; i < numChunks; i++) {
      const startOffset = Math.floor(i * chunkDuration * sampleRate);
      const endOffset = Math.min(Math.floor((i + 1) * chunkDuration * sampleRate), audioBuffer.length);
      const chunkLength = endOffset - startOffset;
      
      const chunkBlob = bufferToWav(audioBuffer, startOffset, chunkLength);
      promises.push(sendToSTT(chunkBlob, i));
    }
    
    const results = await Promise.all(promises);
    results.sort((a, b) => a.index - b.index);
    
    const fullText = results.map(r => r.text).filter(t => t).join(" ");
    
    if (fullText) {
      if (chatInput.value) chatInput.value += " " + fullText;
      else chatInput.value = fullText;
    }
  } catch(e) {
    console.error("Audio processing failed:", e);
    alert("Audio processing failed: " + e.message);
  }
}

function bufferToWav(audioBuffer, startOffset, length) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  
  const interleaved = new Float32Array(length * numChannels);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      interleaved[i * numChannels + channel] = channelData[startOffset + i];
    }
  }
  
  const buffer = new ArrayBuffer(44 + interleaved.length * 2);
  const view = new DataView(buffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + interleaved.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, interleaved.length * 2, true);
  
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

async function sendToSTT(blob, index) {
  const formData = new FormData();
  formData.append("audio", blob, `chunk_${index}.wav`);
  
  const res = await fetch(`${API_BASE_URL}/speech-to-text`, {
    method: "POST",
    body: formData,
  });
  
  const data = await res.json();
  console.log(`STT chunk ${index}:`, data);
  
  return {
    index,
    text: data.transcript || ""
  };
}
