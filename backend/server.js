import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import { SarvamAIClient } from "sarvamai";
import os from "os";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

// Sarvam SDK
const sarvamClient = new SarvamAIClient({
  apiSubscriptionKey: SARVAM_API_KEY,
});

app.use(cors());
app.use(express.json());

// ---------------- FILE UPLOAD SETUP ----------------

const upload = multer({
  dest: os.tmpdir(),
});

// ---------------- CHAT API ----------------

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages) {
      return res.status(400).json({ error: "messages required" });
    }

    // Sarvam API requires strict user/assistant alternation, no "system" role
    let systemPrompt = "";
    const filtered = [];
    for (const msg of messages) {
      if (msg.role === "system") {
        systemPrompt += msg.content + "\n";
      } else if (msg.role === "user" || msg.role === "assistant") {
        filtered.push({ role: msg.role, content: msg.content });
      }
    }

    // Prepend system prompt to the first user message
    if (systemPrompt && filtered.length > 0 && filtered[0].role === "user") {
      filtered[0].content = `[System Instructions: ${systemPrompt.trim()}]\n\n${filtered[0].content}`;
    }

    // Ensure it starts with a user message
    if (filtered.length === 0 || filtered[0].role !== "user") {
      return res.status(400).json({ error: "Conversation must start with a user message" });
    }

    const response = await sarvamClient.chat.completions({
      messages: filtered,
      temperature: 0.2,
    });

    let reply = response.choices[0].message.content;

    // Strip <think> tags and their content — keep only the final answer
    // Handle closed <think>...</think> blocks
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    // Handle unclosed <think> tag — remove the tag, keep content after it
    reply = reply.replace(/<\/?think>/gi, "").trim();

    console.log("Reply:", reply.substring(0, 100) + "...");

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err.message || err);

    res.status(500).json({
      error: "Chat failed",
    });
  }
});

// ---------------- TEXT TO SPEECH ----------------

app.post("/api/text-to-speech", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text required" });
    }

    const response = await sarvamClient.textToSpeech.convert({
      text: text,
      target_language_code: "hi-IN",
      speaker: "shubh",
      model: "bulbul:v3",
    });

    const audio = response.audios?.[0];

    if (!audio) {
      throw new Error("No audio returned");
    }

    const buffer = Buffer.from(audio, "base64");

    res.set("Content-Type", "audio/wav");
    res.send(buffer);
  } catch (err) {
    console.error("TTS error:", err.message);

    res.status(500).json({
      error: "Text to speech failed",
    });
  }
});

// ---------------- SPEECH TO TEXT ----------------

app.post("/api/speech-to-text", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No audio uploaded",
      });
    }

    const audioFile = fs.createReadStream(req.file.path);

    const response = await sarvamClient.speechToText.transcribe({
      file: audioFile,
      model: "saaras:v3",
      mode: "transcribe",
    });

    // remove uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch(err) {
      console.error("Could not delete file:", err.message);
    }

    res.json(response);
  } catch (err) {
    console.error("STT error:", err);

    res.status(500).json({
      error: "Speech to text failed",
    });
  }
});

// ---------------- START SERVER ----------------

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
