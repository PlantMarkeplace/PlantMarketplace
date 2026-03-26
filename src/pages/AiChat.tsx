import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, ArrowLeft, Leaf, Sparkles, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const API_BASE_URL = "http://localhost:5000/api/ai-chat";

export const AiChat = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hello! 👋 I'm your Nabtati AI assistant powered by OpenAI. I can help you with plant care, recommendations, troubleshooting, and more. What would you like to know?",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Rate limit: prevent requests faster than 2 seconds apart
    const now = Date.now();
    if (now - lastRequestTime < 2000) {
      toast({
        title: "Please wait",
        description: "Wait a moment before sending another message.",
      });
      return;
    }

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setApiError(null);
    setLastRequestTime(now);

    try {
      const response = await fetch(`${API_BASE_URL}/openai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const botMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.answer || "Sorry, I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error: any) {
      console.error("Error calling AI API:", error);
      
      let errorMsg = "An error occurred while processing your request.";
      
      if (error.message.includes("Failed to fetch")) {
        errorMsg = "Unable to connect to the AI service. Make sure the backend server is running on port 5000.";
      } else if (error.message.includes("429")) {
        errorMsg = "⚠️ Rate limit exceeded. OpenAI usage quota may be exhausted. Check your account at https://platform.openai.com/account/billing/overview";
      } else {
        errorMsg = error.message || errorMsg;
      }
      
      setApiError(errorMsg);
      
      const errorBotMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: `⚠️ ${errorMsg}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorBotMsg]);
      
      toast({
        title: "Connection Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickSuggestion = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-semibold text-foreground">Nabtati AI</h1>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {isTyping ? "Thinking..." : "Online"}
                  </p>
                </div>
              </div>
            </div>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Leaf className="w-4 h-4 text-primary-foreground" />
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* API Error Alert */}
      {apiError && (
        <div className="bg-destructive/10 border border-destructive/30 mx-4 mt-4 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm text-destructive">{apiError}</div>
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <div className="space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                    <p className={`text-xs mt-2 ${isUser ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Quick Suggestions */}
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {["Best plants for beginners", "Low light recommendations", "Pet-safe plants", "Watering tips"].map((s) => (
            <button
              key={s}
              onClick={() => handleQuickSuggestion(s)}
              disabled={isTyping}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground text-sm hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border p-4">
        <div className="container mx-auto max-w-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about plants, care tips, recommendations..."
              className="flex-1"
              disabled={isTyping}
            />
            <Button 
              type="submit" 
              variant="hero" 
              size="icon" 
              disabled={!input.trim() || isTyping || (Date.now() - lastRequestTime < 2000)}
              title={Date.now() - lastRequestTime < 2000 ? "Wait before sending another message" : "Send message"}
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            Powered by Nabtati AI (OpenAI)
          </p>
        </div>
      </div>
    </div>
  );
};

export default AiChat;
