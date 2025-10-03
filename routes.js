import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";

// Initialize OpenAI client with API key
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export async function registerRoutes(app: Express): Promise<Server> {
  // SoulSyncAI chat endpoint
  app.post("/chat", async (req, res) => {
    try {
      const { message, conversationHistory } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Build messages array with conversation history
      const messages: any[] = [
        {
          role: "system",
          content: "You are SoulSyncAI, an intelligent and empathetic AI assistant. Provide helpful, thoughtful, and engaging responses. Be concise but thorough."
        }
      ];

      // Add conversation history if provided
      if (conversationHistory && Array.isArray(conversationHistory)) {
        conversationHistory.forEach((msg: any) => {
          if (msg.role && msg.content) {
            messages.push({
              role: msg.role,
              content: msg.content
            });
          }
        });
      }

      // Always add the current user message
      messages.push({
        role: "user",
        content: message
      });

      // Call OpenAI API
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: messages,
        max_completion_tokens: 2048,
      });

      const aiResponse = completion.choices[0].message.content;

      res.json({ message: aiResponse });
    } catch (error: any) {
      console.error("OpenAI API Error:", error);
      res.status(500).json({ 
        error: "Failed to get response from AI",
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
