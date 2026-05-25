import { Router } from "express";
import { streamText, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { Readable } from "stream";
import { getCurrentUser } from "../lib/auth.js";
import { retrieveContext, buildContextPrompt } from "../lib/rag.js";
import { connectToDatabase } from "../lib/db.js";
import { Chat } from "../lib/models/Chat.js";
import { SIT_SYSTEM_PROMPT } from "../lib/sit-prompt.js";
import { SIT_WEBSITE_URL } from "../data/sit-knowledge.js";

const router = Router();

function getUIMessageText(message) {
  if (!message.parts || !Array.isArray(message.parts)) return "";
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

async function saveChat(userId, chatId, messages) {
  try {
    await connectToDatabase();

    const firstUserMessage = messages.find((m) => m.role === "user");
    const firstText = firstUserMessage
      ? getUIMessageText(firstUserMessage)
      : "";
    const title = firstText
      ? firstText.slice(0, 50) + (firstText.length > 50 ? "..." : "")
      : "New Chat";

    const chatMessages = messages.map((m) => ({
      role: m.role,
      content: getUIMessageText(m),
      timestamp: new Date(),
    }));

    await Chat.findOneAndUpdate(
      { _id: chatId, userId },
      {
        $set: {
          title,
          messages: chatMessages,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          userId,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );
  } catch (error) {
    console.error("Save chat error:", error);
  }
}

router.post("/", async (req, res) => {
  try {
    const { messages, chatId } = req.body;

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    const userQuery = lastUserMessage ? getUIMessageText(lastUserMessage) : "";

    let contextPrompt = "";
    try {
      const contexts = await retrieveContext(
        userQuery || "Stanford Institute of Technology courses",
        6,
      );
      contextPrompt = buildContextPrompt(contexts);
    } catch (error) {
      console.error("RAG retrieval error:", error);
    }

    const systemPrompt = contextPrompt
      ? `${SIT_SYSTEM_PROMPT}\n\n${contextPrompt}`
      : `${SIT_SYSTEM_PROMPT}\n\nFor full details visit ${SIT_WEBSITE_URL}`;

    const result = streamText({
      model: google(process.env.GENERATIVE_MODEL || "gemini-flash-latest"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    const user = await getCurrentUser(req);
    if (user && chatId) {
      saveChat(user.userId, chatId, messages).catch(console.error);
    }

    const webResponse = result.toUIMessageStreamResponse();

    res.status(webResponse.status);
    webResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (webResponse.body) {
      Readable.fromWeb(webResponse.body)
        .on("error", (err) => {
          console.error("Stream error:", err);
          res.end();
        })
        .pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({ error: "Failed to process chat request" });
  }
});

export default router;
