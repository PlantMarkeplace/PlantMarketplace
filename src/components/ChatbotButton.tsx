import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X, Leaf, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const ChatbotButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {isOpen && (
          <div className="absolute bottom-16 right-0 w-80 bg-card rounded-2xl shadow-elevated border border-border overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-foreground">Nabtati AI</h3>
                  <p className="text-xs text-primary-foreground/80 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-primary-foreground/10 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-muted-foreground text-sm mb-4">
                Hi! 👋 I'm your plant assistant. I can help you:
              </p>
              <ul className="space-y-2 text-sm text-foreground mb-4">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Find the perfect plant for your space
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Get plant care tips and advice
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Answer buying and selling questions
                </li>
              </ul>
              <Button
                variant="hero"
                className="w-full"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/ai-chat");
                }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start Chatting
              </Button>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-elevated flex items-center justify-center transition-all duration-300 ${
            isOpen
              ? "bg-muted text-muted-foreground rotate-0"
              : "bg-primary text-primary-foreground hover:scale-110"
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}
        </button>
      </div>
    </>
  );
};

export default ChatbotButton;
