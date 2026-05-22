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

// ---------------- MARKED.JS CONFIG ----------------

marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
});

// ---------------- CLOUDINARY CONFIG ----------------

const CLOUDINARY_CLOUD = "dlmal78dg";
const CLOUDINARY_PRESET = "nova_images";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;

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
let isImageGenMode = false;
let isWebSearchMode = false;
let isStreaming = false;
let streamingChatId = null;

// ---------------- MODE TOGGLE ----------------

function toggleMode() {
  document.body.classList.toggle("green-mode");
}

if (modeBtn) modeBtn.addEventListener("click", toggleMode);
if (chatModeBtn) chatModeBtn.addEventListener("click", toggleMode);

// ---------------- SIDEBAR TOGGLE ----------------

const sidebarOverlay = document.getElementById("sidebarOverlay");

function toggleSidebar() {
  chatSidebar.classList.toggle("active");
  if (sidebarOverlay) sidebarOverlay.classList.toggle("active");
}

if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener("click", toggleSidebar);
}
if (sidebarOverlay) {
  sidebarOverlay.addEventListener("click", toggleSidebar);
}

// ---------------- IMAGE GENERATION TOGGLE ----------------

const imgGenBtn = document.getElementById("imgGenBtn");

if (imgGenBtn) {
  imgGenBtn.addEventListener("click", () => {
    isImageGenMode = !isImageGenMode;
    imgGenBtn.classList.toggle("active", isImageGenMode);
    // Turn off web search if image gen is on
    if (isImageGenMode && isWebSearchMode) {
      isWebSearchMode = false;
      webSearchBtn.classList.remove("active");
    }
    updateInputPlaceholder();
  });
}

// ---------------- WEB SEARCH TOGGLE ----------------

const webSearchBtn = document.getElementById("webSearchBtn");

if (webSearchBtn) {
  webSearchBtn.addEventListener("click", () => {
    isWebSearchMode = !isWebSearchMode;
    webSearchBtn.classList.toggle("active", isWebSearchMode);
    // Turn off image gen if web search is on
    if (isWebSearchMode && isImageGenMode) {
      isImageGenMode = false;
      imgGenBtn.classList.remove("active");
    }
    updateInputPlaceholder();
  });
}

function updateInputPlaceholder() {
  if (isWebSearchMode) {
    chatInput.placeholder = "Search the web...";
  } else if (isImageGenMode) {
    chatInput.placeholder = "Describe an image to generate...";
  } else {
    chatInput.placeholder = "Message NOVA...";
  }
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
      const userCredential = await auth.createUserWithEmailAndPassword(
        regEmail.value,
        regPassword.value,
      );
      await userCredential.user.updateProfile({ displayName: regName.value });
      alert("Registration successful!");
      registerModal.classList.remove("active");
    } catch (error) {
      alert(error.message);
    }
  });
}

if (doLoginBtn) {
  doLoginBtn.addEventListener("click", async () => {
    try {
      await auth.signInWithEmailAndPassword(logEmail.value, logPassword.value);
      loginModal.classList.remove("active");
    } catch (error) {
      alert(error.message);
    }
  });
}

if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", async () => {
    if (!auth.currentUser) return;
    try {
      globalUserProfile = {
        name: profName.value,
        age: profAge.value,
        prefs: profPrefs.value,
      };
      await db
        .collection("users")
        .doc(auth.currentUser.uid)
        .set(globalUserProfile, { merge: true });
      alert("Profile saved!");
      profileModal.classList.remove("active");
    } catch (e) {
      alert("Error saving profile: " + e.message);
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
  } catch (e) {
    console.error("Profile load err:", e);
  }
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
  // Cancel any ongoing streaming
  isStreaming = false;
  streamingChatId = null;

  currentChatId = generateChatId();

  currentChatHistory = [
    {
      role: "system",
      content: "You are NOVA, a helpful AI assistant.",
    },
  ];

  chatBox.innerHTML = `
  <div class="message ai-message">
  <div class="avatar"><img src="images/logo.png" alt="Nova" class="avatar-img"></div>
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
    const firstUserMsg = currentChatHistory.find((m) => m.role === "user");
    const title = firstUserMsg
      ? firstUserMsg.content.substring(0, 40)
      : "New Chat";
    await db
      .collection("users")
      .doc(auth.currentUser.uid)
      .collection("chats")
      .doc(currentChatId)
      .set({
        title: title,
        messages: currentChatHistory,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    loadChatHistory();
  } catch (e) {
    console.error("Save chat error:", e);
  }
}

async function loadChatHistory() {
  if (!auth.currentUser) return;
  try {
    const snapshot = await db
      .collection("users")
      .doc(auth.currentUser.uid)
      .collection("chats")
      .orderBy("updatedAt", "desc")
      .get();
    renderChatHistory(snapshot.docs);
  } catch (e) {
    console.error("Load history error:", e);
  }
}

function renderChatHistory(docs) {
  chatHistoryList.innerHTML = "";
  docs.forEach((doc) => {
    const data = doc.data();
    const item = document.createElement("div");
    item.className =
      "history-item" + (doc.id === currentChatId ? " active" : "");
    item.innerHTML = `
      <span>${data.title || "Untitled"}</span>
      <button class="delete-chat-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
    `;
    item
      .querySelector("span")
      .addEventListener("click", () => loadChat(doc.id, data));
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
  currentChatHistory.forEach((m) => {
    if (m.role !== "system") renderMessage(m.role, m.content);
  });
  if (chatBox.innerHTML === "") {
    chatBox.innerHTML = `
      <div class="message ai-message">
        <div class="avatar"><img src="images/logo.png" alt="Nova" class="avatar-img"></div>
        <div class="msg-content">Hello! How can I help?</div>
      </div>
    `;
  }
  loadChatHistory();
}

async function deleteChat(chatId) {
  if (!auth.currentUser) return;
  try {
    await db
      .collection("users")
      .doc(auth.currentUser.uid)
      .collection("chats")
      .doc(chatId)
      .delete();
    if (chatId === currentChatId) startNewChat();
    loadChatHistory();
  } catch (e) {
    console.error("Delete chat error:", e);
  }
}

// ---------------- RENDER ----------------

/**
 * Clean raw AI content: strip <think> tags, trim whitespace.
 */
function cleanAIContent(content) {
  let cleaned = content.replace(/<\/?think>/gi, "").trim();
  if (!cleaned) {
    cleaned = "Sorry, I couldn't generate a response. Please try again.";
  }
  return cleaned;
}

/**
 * Inject a copy button into every <pre> code block inside a container.
 */
function addCopyButtons(container) {
  container.querySelectorAll("pre").forEach((pre) => {
    if (pre.querySelector(".copy-code-btn")) return;

    const btn = document.createElement("button");
    btn.className = "copy-code-btn";
    btn.innerHTML = '<i class="fa-regular fa-copy"></i>';
    btn.title = "Copy code";

    btn.addEventListener("click", () => {
      const code = pre.querySelector("code");
      const text = code ? code.innerText : pre.innerText;
      navigator.clipboard.writeText(text).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        btn.classList.add("copied");
        setTimeout(() => {
          btn.innerHTML = '<i class="fa-regular fa-copy"></i>';
          btn.classList.remove("copied");
        }, 2000);
      });
    });

    pre.appendChild(btn);
  });
}

/**
 * Render a message instantly (used for user messages and loading chat history).
 */
function renderMessage(role, content) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");

  if (role === "user") {
    msgDiv.classList.add("user-message");
    const escaped = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    msgDiv.innerHTML = `
      <div class="avatar"><img src="images/user.png" alt="User" class="avatar-img"></div>
      <div class="msg-content">${escaped}</div>
    `;
  } else {
    msgDiv.classList.add("ai-message");

    // Check if this is a persisted image message: [nova-img:URL|PROMPT]
    const imgMatch = content.match(/^\[nova-img:(.*?)\|([\s\S]*?)\]$/);
    // Check if this is a persisted search message: [nova-search:{...}]
    const searchMatch = content.match(/^\[nova-search:([\s\S]*?)\]$/);

    if (imgMatch) {
      const imageUrl = imgMatch[1];
      const prompt = imgMatch[2];
      msgDiv.innerHTML = `
        <div class="avatar">
          <img src="images/logo.png" alt="Nova" class="avatar-img">
        </div>
        <div class="msg-content img-msg-content">
          <div class="generated-image-wrapper">
            <img src="${imageUrl}" alt="${prompt}" class="generated-image" crossorigin="anonymous">
            <button class="img-download-btn" title="Download Image">
              <i class="fa-solid fa-download"></i>
            </button>
          </div>
          <div class="img-caption">🎨 ${prompt}</div>
        </div>
      `;

      const dlBtn = msgDiv.querySelector(".img-download-btn");
      const imgEl = msgDiv.querySelector(".generated-image");
      dlBtn.addEventListener("click", () => {
        const canvas = document.createElement("canvas");
        canvas.width = imgEl.naturalWidth;
        canvas.height = imgEl.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(imgEl, 0, 0);
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `nova-${prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, "image/png");
      });

    } else if (searchMatch) {
      // Persisted search result — re-render with sources
      try {
        const searchData = JSON.parse(searchMatch[1]);
        const cleanMsg = cleanAIContent(searchData.reply);
        const renderedHtml = marked.parse(cleanMsg);
        const sources = searchData.sources || [];

        let sourcesHtml = "";
        if (sources.length > 0) {
          const cards = sources.map((s) => {
            const domain = s.siteName || new URL(s.url).hostname;
            const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            return `
              <a href="${s.url}" target="_blank" rel="noopener" class="source-card">
                <div class="source-card-header">
                  <img src="${favicon}" alt="" class="source-favicon">
                  <span class="source-domain">${domain}</span>
                </div>
                <div class="source-title">${s.title || 'Untitled'}</div>
                <div class="source-snippet">${(s.snippet || '').substring(0, 100)}${s.snippet && s.snippet.length > 100 ? '...' : ''}</div>
              </a>
            `;
          }).join("");

          sourcesHtml = `
            <div class="search-sources-label"><i class="fa-solid fa-globe"></i> Sources</div>
            <div class="search-sources-row">${cards}</div>
          `;
        }

        msgDiv.innerHTML = `
          <div class="avatar">
            <img src="images/logo.png" alt="Nova" class="avatar-img">
          </div>
          <div class="msg-content search-msg-content">
            <div class="search-badge"><i class="fa-solid fa-globe"></i> Web Search</div>
            <button class="tts-btn"><i class="fa-solid fa-volume-high"></i></button>
            <div class="msg-text">${renderedHtml}</div>
            ${sourcesHtml}
          </div>
        `;

        msgDiv.querySelectorAll("pre code").forEach((block) => {
          hljs.highlightElement(block);
        });
        addCopyButtons(msgDiv);

        const btn = msgDiv.querySelector(".tts-btn");
        btn.onclick = () => {
          const ttsText = cleanMsg.replace(/[*#_=`~\[\]]/g, "").trim();
          playTTS(ttsText || "No text available.", btn);
        };
      } catch (e) {
        console.error("Failed to parse search result:", e);
        const cleanMsg = cleanAIContent(content);
        msgDiv.innerHTML = `
          <div class="avatar"><img src="images/logo.png" alt="Nova" class="avatar-img"></div>
          <div class="msg-content"><div class="msg-text">${marked.parse(cleanMsg)}</div></div>
        `;
      }

    } else {
      // Normal text message — render with markdown
      const cleanMsg = cleanAIContent(content);
      const renderedHtml = marked.parse(cleanMsg);

      msgDiv.innerHTML = `
        <div class="avatar">
          <img src="images/logo.png" alt="Nova" class="avatar-img">
        </div>
        <div class="msg-content">
          <button class="tts-btn"><i class="fa-solid fa-volume-high"></i></button>
          <div class="msg-text">${renderedHtml}</div>
        </div>
      `;

      // Highlight code blocks
      msgDiv.querySelectorAll("pre code").forEach((block) => {
        hljs.highlightElement(block);
      });
      addCopyButtons(msgDiv);

      const btn = msgDiv.querySelector(".tts-btn");
      btn.onclick = () => {
        const ttsText = cleanMsg.replace(/[*#_=`~\[\]]/g, "").trim();
        playTTS(ttsText || "No text available.", btn);
      };
    }
  }

  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Fake-stream an AI message word-by-word with a blinking cursor.
 * Uses marked.js for incremental markdown rendering.
 */
async function streamAIMessage(content) {
  const cleanMsg = cleanAIContent(content);

  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", "ai-message");
  msgDiv.innerHTML = `
    <div class="avatar">
      <img src="images/logo.png" alt="Nova" class="avatar-img">
    </div>
    <div class="msg-content">
      <button class="tts-btn hide"><i class="fa-solid fa-volume-high"></i></button>
      <div class="msg-text"></div>
    </div>
  `;
  chatBox.appendChild(msgDiv);

  const textEl = msgDiv.querySelector(".msg-text");
  const ttsBtn = msgDiv.querySelector(".tts-btn");

  // Blinking cursor element
  const cursor = document.createElement("span");
  cursor.className = "streaming-cursor";
  cursor.textContent = "▍";

  // Mark streaming as active
  isStreaming = true;
  streamingChatId = currentChatId;

  // Split into tokens: keeps whitespace as separate entries so markdown stays intact
  const tokens = cleanMsg.split(/(\s+)/);
  let buffer = "";

  for (let i = 0; i < tokens.length; i++) {
    // Break if streaming was cancelled (e.g. new chat started)
    if (!isStreaming || streamingChatId !== currentChatId) break;

    buffer += tokens[i];

    // Re-render markdown every 2 tokens or on the last one
    if (i % 2 === 0 || i === tokens.length - 1) {
      textEl.innerHTML = marked.parse(buffer);
      // Append cursor inside the last element
      const lastChild = textEl.lastElementChild || textEl;
      lastChild.appendChild(cursor);
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Variable speed for natural feel
    const word = tokens[i].trim();
    let delay = 25;
    if (!word) delay = 5;                              // whitespace — instant
    else if (word.length > 10) delay = 40;             // long words — slower
    else if (".!?".includes(word.slice(-1))) delay = 90;  // sentence-end — pause
    else if (",;:".includes(word.slice(-1))) delay = 55;  // clause — brief pause

    await new Promise((r) => setTimeout(r, delay));
  }

  // ---- Streaming complete ----
  isStreaming = false;
  streamingChatId = null;

  // Final clean render (no cursor, no partial tokens)
  textEl.innerHTML = marked.parse(cleanMsg);

  // Highlight all code blocks
  msgDiv.querySelectorAll("pre code").forEach((block) => {
    hljs.highlightElement(block);
  });
  addCopyButtons(msgDiv);

  // Show TTS button
  ttsBtn.classList.remove("hide");
  ttsBtn.onclick = () => {
    const ttsText = cleanMsg.replace(/[*#_=`~\[\]]/g, "").trim();
    playTTS(ttsText || "No text available.", ttsBtn);
  };

  chatBox.scrollTop = chatBox.scrollHeight;
}

// ---------------- CHAT SEND ----------------

async function sendMessage() {
  const msg = chatInput.value.trim();
  if (!msg) return;

  if (isImageGenMode) {
    await generateImage(msg);
    return;
  }

  if (isWebSearchMode) {
    await webSearch(msg);
    return;
  }

  // Disable input while processing
  chatInput.disabled = true;
  sendBtn.disabled = true;

  renderMessage("user", msg);
  chatInput.value = "";

  currentChatHistory.push({
    role: "user",
    content: msg,
  });

  saveChat();

  // Animated typing indicator
  const typing = document.createElement("div");
  typing.classList.add("message", "ai-message");
  typing.innerHTML = `
    <div class="avatar"><img src="images/logo.png" alt="Nova" class="avatar-img"></div>
    <div class="msg-content typing-indicator">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    </div>
  `;
  chatBox.appendChild(typing);
  chatBox.scrollTop = chatBox.scrollHeight;

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

      // Fake-stream the response word by word
      await streamAIMessage(data.reply);
      saveChat();
    }
  } catch (err) {
    typing.remove();
    renderMessage("assistant", "Sorry, something went wrong. Please try again.");
  }

  // Re-enable input
  chatInput.disabled = false;
  sendBtn.disabled = false;
  chatInput.focus();
}

// ---------------- WEB SEARCH ----------------

async function webSearch(query) {
  chatInput.disabled = true;
  sendBtn.disabled = true;

  renderMessage("user", query);
  chatInput.value = "";

  currentChatHistory.push({ role: "user", content: query });
  saveChat();

  // Searching indicator
  const searching = document.createElement("div");
  searching.classList.add("message", "ai-message");
  searching.innerHTML = `
    <div class="avatar"><img src="images/logo.png" alt="Nova" class="avatar-img"></div>
    <div class="msg-content typing-indicator search-indicator">
      <i class="fa-solid fa-globe fa-spin" style="margin-right:8px;opacity:0.6;"></i>
      <span>Searching the web...</span>
    </div>
  `;
  chatBox.appendChild(searching);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await fetch(`${API_BASE_URL}/web-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();
    searching.remove();

    if (data.reply) {
      // Save as special format for chat history
      const sources = data.sources || [];
      const historyContent = `[nova-search:${JSON.stringify({ reply: data.reply, sources })}]`;

      currentChatHistory.push({ role: "assistant", content: historyContent });

      // Render the search result
      await renderSearchResult(data.reply, sources);
      saveChat();
    }
  } catch (err) {
    searching.remove();
    console.error("Web search error:", err);
    renderMessage("assistant", "Sorry, the web search failed. Please try again.");
  }

  chatInput.disabled = false;
  sendBtn.disabled = false;
  chatInput.focus();
}

async function renderSearchResult(reply, sources) {
  const cleanMsg = cleanAIContent(reply);

  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", "ai-message");

  // Build source cards HTML
  let sourcesHtml = "";
  if (sources && sources.length > 0) {
    const cards = sources.map((s, i) => {
      const domain = s.siteName || new URL(s.url).hostname;
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      return `
        <a href="${s.url}" target="_blank" rel="noopener" class="source-card" style="animation-delay:${i * 0.08}s">
          <div class="source-card-header">
            <img src="${favicon}" alt="" class="source-favicon">
            <span class="source-domain">${domain}</span>
          </div>
          <div class="source-title">${s.title || 'Untitled'}</div>
          <div class="source-snippet">${(s.snippet || '').substring(0, 100)}${s.snippet && s.snippet.length > 100 ? '...' : ''}</div>
        </a>
      `;
    }).join("");

    sourcesHtml = `
      <div class="search-sources-label"><i class="fa-solid fa-globe"></i> Sources</div>
      <div class="search-sources-row">${cards}</div>
    `;
  }

  msgDiv.innerHTML = `
    <div class="avatar">
      <img src="images/logo.png" alt="Nova" class="avatar-img">
    </div>
    <div class="msg-content search-msg-content">
      <div class="search-badge"><i class="fa-solid fa-globe"></i> Web Search</div>
      <button class="tts-btn hide"><i class="fa-solid fa-volume-high"></i></button>
      <div class="msg-text"></div>
      ${sourcesHtml}
    </div>
  `;
  chatBox.appendChild(msgDiv);

  // Stream the text content
  const textEl = msgDiv.querySelector(".msg-text");
  const ttsBtn = msgDiv.querySelector(".tts-btn");

  const cursor = document.createElement("span");
  cursor.className = "streaming-cursor";
  cursor.textContent = "▍";

  isStreaming = true;
  streamingChatId = currentChatId;

  const tokens = cleanMsg.split(/(\s+)/);
  let buffer = "";

  for (let i = 0; i < tokens.length; i++) {
    if (!isStreaming || streamingChatId !== currentChatId) break;

    buffer += tokens[i];

    if (i % 2 === 0 || i === tokens.length - 1) {
      textEl.innerHTML = marked.parse(buffer);
      const lastChild = textEl.lastElementChild || textEl;
      lastChild.appendChild(cursor);
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    const word = tokens[i].trim();
    let delay = 20;
    if (!word) delay = 3;
    else if (word.length > 10) delay = 35;
    else if (".!?".includes(word.slice(-1))) delay = 80;
    else if (",;:".includes(word.slice(-1))) delay = 45;

    await new Promise((r) => setTimeout(r, delay));
  }

  isStreaming = false;
  streamingChatId = null;

  textEl.innerHTML = marked.parse(cleanMsg);

  msgDiv.querySelectorAll("pre code").forEach((block) => {
    hljs.highlightElement(block);
  });
  addCopyButtons(msgDiv);

  ttsBtn.classList.remove("hide");
  ttsBtn.onclick = () => {
    const ttsText = cleanMsg.replace(/[*#_=`~\[\]]/g, "").trim();
    playTTS(ttsText || "No text available.", ttsBtn);
  };

  chatBox.scrollTop = chatBox.scrollHeight;
}

// ---------------- IMAGE GENERATION ----------------

function generateImage(prompt) {
  renderMessage("user", `🎨 Generate image: ${prompt}`);

  chatInput.value = "";

  currentChatHistory.push({
    role: "user",
    content: `🎨 Generate image: ${prompt}`,
  });

  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux&key=pk_jmA19hPC2hmPW6eq`;

  // Image src is set immediately — browser loads it whenever the API is ready
  // Image overlays the shimmer and covers it once loaded
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", "ai-message");
  msgDiv.innerHTML = `
    <div class="avatar"><img src="images/logo.png" alt="Nova" class="avatar-img"></div>
    <div class="msg-content img-msg-content">
      <div class="generated-image-wrapper">
        <div class="shimmer-placeholder">
          <div class="shimmer-icon"><i class="fa-solid fa-image"></i></div>
          <div class="shimmer-text">Generating your image...</div>
        </div>
        <img src="${imageUrl}" alt="${prompt}" class="generated-image" crossorigin="anonymous">
        <button class="img-download-btn" title="Download Image">
          <i class="fa-solid fa-download"></i>
        </button>
      </div>
      <div class="img-caption">🎨 ${prompt}</div>
    </div>
  `;

  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  // When image loads, hide shimmer and enable download
  const img = msgDiv.querySelector(".generated-image");
  const shimmer = msgDiv.querySelector(".shimmer-placeholder");
  const dlBtn = msgDiv.querySelector(".img-download-btn");

  img.onload = async () => {
    shimmer.style.opacity = "0";
    setTimeout(() => shimmer.remove(), 400);
    dlBtn.style.pointerEvents = "auto";
    chatBox.scrollTop = chatBox.scrollHeight;

    // Upload to Cloudinary for persistent storage
    let permanentUrl = imageUrl; // fallback to Pollinations URL
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

      const formData = new FormData();
      formData.append("file", blob, "nova-image.png");
      formData.append("upload_preset", CLOUDINARY_PRESET);

      const uploadRes = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: formData,
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        permanentUrl = uploadData.secure_url;
        console.log("✅ Image uploaded to Cloudinary:", permanentUrl);
      }
    } catch (e) {
      console.error("Cloudinary upload failed, using original URL:", e);
    }

    currentChatHistory.push({
      role: "assistant",
      content: `[nova-img:${permanentUrl}|${prompt}]`,
    });
    saveChat();
  };

  // Download via canvas (avoids opening new tab)
  dlBtn.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nova-${prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");
  });
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
        if (currentTTSBtn !== btn) {
          URL.revokeObjectURL(url);
          return resolve();
        }
        currentAudio = new Audio(url);
        currentAudio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        currentAudio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        }; // Don't break loop on error
        currentAudio.play().catch(() => {
          URL.revokeObjectURL(url);
          resolve();
        });
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
      signal: ttsAbortController.signal,
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
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const duration = audioBuffer.duration;
    const chunkDuration = 29.5; // Use slightly under 30 seconds
    const numChunks = Math.ceil(duration / chunkDuration);
    const sampleRate = audioBuffer.sampleRate;

    const promises = [];
    for (let i = 0; i < numChunks; i++) {
      const startOffset = Math.floor(i * chunkDuration * sampleRate);
      const endOffset = Math.min(
        Math.floor((i + 1) * chunkDuration * sampleRate),
        audioBuffer.length,
      );
      const chunkLength = endOffset - startOffset;

      const chunkBlob = bufferToWav(audioBuffer, startOffset, chunkLength);
      promises.push(sendToSTT(chunkBlob, i));
    }

    const results = await Promise.all(promises);
    results.sort((a, b) => a.index - b.index);

    const fullText = results
      .map((r) => r.text)
      .filter((t) => t)
      .join(" ");

    if (fullText) {
      if (chatInput.value) chatInput.value += " " + fullText;
      else chatInput.value = fullText;
    }
  } catch (e) {
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

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + interleaved.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, interleaved.length * 2, true);

  let offset = 44;
  for (let i = 0; i < interleaved.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
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
    text: data.transcript || "",
  };
}
