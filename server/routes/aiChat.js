// routes/aiChat.js
import express from "express";
import fetch from "node-fetch"; 
const router = express.Router();

router.post("/openai", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ answer: "Message is required" });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured");
    return res.status(500).json({ 
      answer: "⚠️ AI service is not properly configured. Please contact the administrator." 
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are Nabtati AI, a helpful expert assistant specialized in plants, gardening, and plant care. Provide accurate, friendly, and practical advice about plant species, care instructions, troubleshooting plant problems, and recommendations. Always include specific plant names and actionable tips."
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API Error:", errorData);
      
      if (response.status === 401) {
        return res.status(401).json({ 
          answer: "⚠️ Authentication failed. The API key may be invalid or expired." 
        });
      }
      
      if (response.status === 429) {
        return res.status(429).json({ 
          answer: "⚠️ Rate limit exceeded. Please try again in a moment." 
        });
      }
      
      return res.status(response.status).json({ 
        answer: `⚠️ AI service error (${response.status}). Please try again.` 
      });
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return res.status(500).json({ 
        answer: "⚠️ Unexpected response from AI service." 
      });
    }
    
    const answer = data.choices[0].message.content;
    res.json({ answer });
  } catch (error) {
    console.error("AI Chat Error:", error.message);
    res.status(500).json({ 
      answer: "⚠️ Something went wrong. Please try again later." 
    });
  }
});

export default router;