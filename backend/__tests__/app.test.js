import { jest } from "@jest/globals";
import path from "path";
import fs from "fs";
import os from "os";

// ─── Mock external dependencies BEFORE importing the app ───

// Mock the SarvamAIClient
const mockChatCompletions = jest.fn();
const mockTextToSpeechConvert = jest.fn();
const mockSpeechToTextTranscribe = jest.fn();

jest.unstable_mockModule("sarvamai", () => ({
  SarvamAIClient: jest.fn().mockImplementation(() => ({
    chat: { completions: mockChatCompletions },
    textToSpeech: { convert: mockTextToSpeechConvert },
    speechToText: { transcribe: mockSpeechToTextTranscribe },
  })),
}));

// Mock axios for web-search endpoint
const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();
jest.unstable_mockModule("axios", () => ({
  default: {
    get: mockAxiosGet,
    post: mockAxiosPost,
  },
}));

// Now import app (after mocks are in place)
const { default: app } = await import("../server.js");

// Import supertest
const { default: request } = await import("supertest");

// ─────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────

function resetAllMocks() {
  mockChatCompletions.mockReset();
  mockTextToSpeechConvert.mockReset();
  mockSpeechToTextTranscribe.mockReset();
  mockAxiosGet.mockReset();
  mockAxiosPost.mockReset();
}

// ─────────────────────────────────────────────────────────
//  TEST SUITES
// ─────────────────────────────────────────────────────────

// ===================== /api/chat =====================

describe("POST /api/chat", () => {
  beforeEach(resetAllMocks);

  test("returns 400 when messages field is missing", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("messages required");
  });

  test("returns 400 when conversation starts with assistant message", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [{ role: "assistant", content: "Hello" }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Conversation must start with a user message");
  });

  test("returns 400 when messages array is empty", async () => {
    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Conversation must start with a user message");
  });

  test("successfully returns a reply for a valid user message", async () => {
    mockChatCompletions.mockResolvedValue({
      choices: [{ message: { content: "Hello! How can I help you?" } }],
    });

    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [{ role: "user", content: "Hi there" }],
      });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Hello! How can I help you?");
    expect(mockChatCompletions).toHaveBeenCalledTimes(1);
  });

  test("strips <think> tags from the reply", async () => {
    mockChatCompletions.mockResolvedValue({
      choices: [{
        message: {
          content: "<think>Let me reason about this...</think>The answer is 42.",
        },
      }],
    });

    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [{ role: "user", content: "What is the answer?" }],
      });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("The answer is 42.");
    expect(res.body.reply).not.toContain("<think>");
  });

  test("strips unclosed <think> tags from the reply", async () => {
    mockChatCompletions.mockResolvedValue({
      choices: [{
        message: {
          content: "<think>reasoning here\nThe final answer is yes.",
        },
      }],
    });

    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [{ role: "user", content: "Is this correct?" }],
      });

    expect(res.status).toBe(200);
    expect(res.body.reply).not.toContain("<think>");
  });

  test("filters system messages and prepends to first user message", async () => {
    mockChatCompletions.mockResolvedValue({
      choices: [{ message: { content: "I am NOVA." } }],
    });

    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [
          { role: "system", content: "You are NOVA" },
          { role: "user", content: "Who are you?" },
        ],
      });

    expect(res.status).toBe(200);

    // Verify the system prompt was prepended to the user message
    const calledMessages = mockChatCompletions.mock.calls[0][0].messages;
    expect(calledMessages[0].role).toBe("user");
    expect(calledMessages[0].content).toContain("[System Instructions: You are NOVA]");
    expect(calledMessages[0].content).toContain("Who are you?");
  });

  test("filters out unknown roles (only keeps user/assistant/system)", async () => {
    mockChatCompletions.mockResolvedValue({
      choices: [{ message: { content: "Response" } }],
    });

    await request(app)
      .post("/api/chat")
      .send({
        messages: [
          { role: "user", content: "Hello" },
          { role: "tool", content: "tool output" },
          { role: "assistant", content: "Hi" },
          { role: "function", content: "function output" },
          { role: "user", content: "Bye" },
        ],
      });

    const calledMessages = mockChatCompletions.mock.calls[0][0].messages;
    expect(calledMessages).toHaveLength(3); // user, assistant, user
    expect(calledMessages.every((m) => ["user", "assistant"].includes(m.role))).toBe(true);
  });

  test("handles multi-turn conversation", async () => {
    mockChatCompletions.mockResolvedValue({
      choices: [{ message: { content: "Goodbye!" } }],
    });

    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi! How can I help?" },
          { role: "user", content: "Nothing, bye" },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Goodbye!");

    const calledMessages = mockChatCompletions.mock.calls[0][0].messages;
    expect(calledMessages).toHaveLength(3);
  });

  test("returns 500 when Sarvam API throws", async () => {
    mockChatCompletions.mockRejectedValue(new Error("API key expired"));

    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [{ role: "user", content: "Hello" }],
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Chat failed");
  });
});

// ===================== /api/text-to-speech =====================

describe("POST /api/text-to-speech", () => {
  beforeEach(resetAllMocks);

  test("returns 400 when text field is missing", async () => {
    const res = await request(app)
      .post("/api/text-to-speech")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Text required");
  });

  test("returns 400 when text is empty string", async () => {
    const res = await request(app)
      .post("/api/text-to-speech")
      .send({ text: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Text required");
  });

  test("returns audio buffer for valid text", async () => {
    const fakeBase64Audio = Buffer.from("fake-audio-data").toString("base64");
    mockTextToSpeechConvert.mockResolvedValue({
      audios: [fakeBase64Audio],
    });

    const res = await request(app)
      .post("/api/text-to-speech")
      .send({ text: "Hello world" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/audio\/wav/);
    expect(Buffer.isBuffer(res.body)).toBe(true);

    // Verify the SDK was called with correct parameters
    expect(mockTextToSpeechConvert).toHaveBeenCalledWith({
      text: "Hello world",
      target_language_code: "en-IN",
      speaker: "shubh",
      model: "bulbul:v3",
    });
  });

  test("returns 500 when no audio is returned by the API", async () => {
    mockTextToSpeechConvert.mockResolvedValue({
      audios: [],
    });

    const res = await request(app)
      .post("/api/text-to-speech")
      .send({ text: "Hello" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Text to speech failed");
  });

  test("returns 500 when API returns null audios", async () => {
    mockTextToSpeechConvert.mockResolvedValue({
      audios: null,
    });

    const res = await request(app)
      .post("/api/text-to-speech")
      .send({ text: "Hello" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Text to speech failed");
  });

  test("returns 500 when Sarvam TTS API throws", async () => {
    mockTextToSpeechConvert.mockRejectedValue(new Error("TTS service down"));

    const res = await request(app)
      .post("/api/text-to-speech")
      .send({ text: "Hello" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Text to speech failed");
  });
});

// ===================== /api/speech-to-text =====================

describe("POST /api/speech-to-text", () => {
  beforeEach(resetAllMocks);

  test("returns 400 when no audio file is uploaded", async () => {
    const res = await request(app)
      .post("/api/speech-to-text");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No audio uploaded");
  });

  test("successfully transcribes an uploaded audio file", async () => {
    mockSpeechToTextTranscribe.mockResolvedValue({
      transcript: "Hello world",
      language_code: "en-IN",
    });

    // Create a temp audio file to upload
    const tempFile = path.join(os.tmpdir(), "test-audio.wav");
    fs.writeFileSync(tempFile, "fake-audio-bytes");

    const res = await request(app)
      .post("/api/speech-to-text")
      .attach("audio", tempFile);

    expect(res.status).toBe(200);
    expect(res.body.transcript).toBe("Hello world");
    expect(mockSpeechToTextTranscribe).toHaveBeenCalledTimes(1);

    // Clean up
    try { fs.unlinkSync(tempFile); } catch {}
  });

  test("returns 500 when Sarvam STT API throws", async () => {
    mockSpeechToTextTranscribe.mockRejectedValue(new Error("STT service down"));

    const tempFile = path.join(os.tmpdir(), "test-audio-fail.wav");
    fs.writeFileSync(tempFile, "fake-audio-bytes");

    const res = await request(app)
      .post("/api/speech-to-text")
      .attach("audio", tempFile);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Speech to text failed");

    // Clean up
    try { fs.unlinkSync(tempFile); } catch {}
  });
});

// ===================== /api/web-search =====================

describe("POST /api/web-search", () => {
  beforeEach(resetAllMocks);

  test("returns 400 when query is missing", async () => {
    const res = await request(app)
      .post("/api/web-search")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("query required");
  });

  test("returns 400 when query is empty string", async () => {
    const res = await request(app)
      .post("/api/web-search")
      .send({ query: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("query required");
  });

  test("returns no-results message when search returns empty", async () => {
    mockAxiosGet.mockResolvedValue({
      data: { results: [] },
    });

    const res = await request(app)
      .post("/api/web-search")
      .send({ query: "nonexistent topic" });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("couldn't find any relevant results");
    expect(res.body.sources).toEqual([]);
  });

  test("successfully performs web search and returns AI summary", async () => {
    // Mock Tinyfish Search API
    mockAxiosGet.mockResolvedValue({
      data: {
        results: [
          {
            position: 1,
            title: "Node.js Guide",
            snippet: "Node.js is a runtime...",
            url: "https://example.com/nodejs",
            site_name: "Example",
          },
          {
            position: 2,
            title: "Express.js Guide",
            snippet: "Express is a framework...",
            url: "https://example.com/express",
            site_name: "Example",
          },
        ],
      },
    });

    // Mock Tinyfish Fetch API
    mockAxiosPost.mockResolvedValue({
      data: {
        results: [
          {
            url: "https://example.com/nodejs",
            title: "Node.js Guide",
            text: "Detailed Node.js content here...",
          },
        ],
      },
    });

    // Mock Sarvam AI chat for summarization
    mockChatCompletions.mockResolvedValue({
      choices: [{
        message: {
          content: "<think>processing</think>Node.js is a JavaScript runtime built on Chrome's V8 engine.",
        },
      }],
    });

    const res = await request(app)
      .post("/api/web-search")
      .send({ query: "What is Node.js?" });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Node.js is a JavaScript runtime built on Chrome's V8 engine.");
    expect(res.body.reply).not.toContain("<think>");
    expect(res.body.sources).toHaveLength(2);
    expect(res.body.sources[0].title).toBe("Node.js Guide");
  });

  test("falls back to snippets when Tinyfish Fetch API fails", async () => {
    mockAxiosGet.mockResolvedValue({
      data: {
        results: [
          {
            position: 1,
            title: "Test Page",
            snippet: "This is the snippet content",
            url: "https://example.com/test",
            site_name: "Example",
          },
        ],
      },
    });

    // Fetch API fails
    mockAxiosPost.mockRejectedValue(new Error("Fetch timeout"));

    // Sarvam still works
    mockChatCompletions.mockResolvedValue({
      choices: [{ message: { content: "Summary based on snippets." } }],
    });

    const res = await request(app)
      .post("/api/web-search")
      .send({ query: "test query" });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Summary based on snippets.");
    expect(res.body.sources).toHaveLength(1);
  });

  test("limits sources to top 5 results", async () => {
    const manyResults = Array.from({ length: 10 }, (_, i) => ({
      position: i + 1,
      title: `Result ${i + 1}`,
      snippet: `Snippet ${i + 1}`,
      url: `https://example.com/page${i + 1}`,
      site_name: "Example",
    }));

    mockAxiosGet.mockResolvedValue({ data: { results: manyResults } });
    mockAxiosPost.mockResolvedValue({ data: { results: [] } });
    mockChatCompletions.mockResolvedValue({
      choices: [{ message: { content: "Summary" } }],
    });

    const res = await request(app)
      .post("/api/web-search")
      .send({ query: "many results" });

    expect(res.status).toBe(200);
    expect(res.body.sources).toHaveLength(5);
  });

  test("returns 500 when Tinyfish Search API throws", async () => {
    mockAxiosGet.mockRejectedValue(new Error("Network error"));

    const res = await request(app)
      .post("/api/web-search")
      .send({ query: "failing query" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Web search failed");
  });

  test("returns 500 when Sarvam summarization throws after successful search", async () => {
    mockAxiosGet.mockResolvedValue({
      data: {
        results: [
          {
            position: 1,
            title: "Test",
            snippet: "Snippet",
            url: "https://example.com",
            site_name: "Example",
          },
        ],
      },
    });

    mockAxiosPost.mockResolvedValue({
      data: { results: [{ url: "https://example.com", title: "Test", text: "Content" }] },
    });

    mockChatCompletions.mockRejectedValue(new Error("Sarvam API error"));

    const res = await request(app)
      .post("/api/web-search")
      .send({ query: "test" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Web search failed");
  });
});

// ===================== General / Edge Cases =====================

describe("General API behavior", () => {
  test("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
  });

  test("handles GET request to POST-only endpoint", async () => {
    const res = await request(app).get("/api/chat");
    expect(res.status).toBe(404);
  });

  test("handles malformed JSON body gracefully", async () => {
    const res = await request(app)
      .post("/api/chat")
      .set("Content-Type", "application/json")
      .send("this is not json{{{");

    // Express 5 returns 400 for malformed JSON
    expect([400, 500]).toContain(res.status);
  });
});
