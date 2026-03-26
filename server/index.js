import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import plantsRoute from "./routes/plants.js";
import aiChatRoutes from "./routes/aiChat.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/plants", plantsRoute);
app.use("/api/ai-chat", aiChatRoutes); 

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️  WARNING: OPENAI_API_KEY is not set in .env file. AI chat will not work.");
  }
});