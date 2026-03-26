import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Leaf, Send, User, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  sender_name?: string;
  is_read?: boolean;
  plant_id?: string;
};

const Chat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { sellerId, sellerName = "Seller", plantId, plantName } = location.state || {};

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actualSellerName, setActualSellerName] = useState<string>("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch seller's actual name from profiles
  useEffect(() => {
    if (!sellerId) return;

    const fetchSellerName = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', sellerId)
          .single();

        if (error) throw error;
        if (data?.full_name) {
          setActualSellerName(data.full_name);
        }
      } catch (err: any) {
        console.error('Error fetching seller name:', err);
      }
    };

    fetchSellerName();
  }, [sellerId]);

  useEffect(() => {
    if (!isAuthenticated || !user || !sellerId) {
      navigate('/auth');
      return;
    }

    console.log('Chat initialized:', {
      userId: user.id,
      userEmail: user.email,
      sellerId: sellerId,
      userName: user.fullName
    });

    const markMessagesAsRead = async () => {
      if (!user?.id) return;
      try {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('receiver_id', user.id)
          .eq('sender_id', sellerId);
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    };

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('messages')
          .select('id, sender_id, receiver_id, message, created_at, is_read')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${sellerId}),and(sender_id.eq.${sellerId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages((data || []) as Message[]);
        
        // Mark messages as read when user opens chat
        markMessagesAsRead();
      } catch (err: any) {
        console.error('Error fetching messages:', err);
        toast({ title: 'Error loading messages', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages in real-time
    const subscription = supabase
      .channel(`messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          
          // Show toast notification for new message
          const senderName = newMessage.sender_name || actualSellerName || 'New Message';
          toast({
            title: senderName,
            description: newMessage.message.substring(0, 50) + (newMessage.message.length > 50 ? '...' : ''),
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, sellerId, isAuthenticated]);

  const handleSend = async () => {
    if (!input.trim() || !user || !sellerId) return;

    setSending(true);
    try {
      // Validate that user.id and sellerId are valid UUIDs
      if (!user.id) {
        throw new Error('User ID not available. Please log in again.');
      }
      if (!sellerId) {
        throw new Error('Seller ID not available.');
      }

      // Check if IDs are valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user.id)) {
        console.error('Invalid sender_id format:', user.id);
        throw new Error('User ID format is invalid. Please log in again.');
      }
      if (!uuidRegex.test(sellerId)) {
        console.error('Invalid receiver_id format:', sellerId);
        throw new Error('Seller ID format is invalid.');
      }

      console.log('Sending message with validated UUIDs:', {
        sender_id: user.id,
        receiver_id: sellerId,
        message: input.trim()
      });

      const messageData = {
        sender_id: user.id,
        receiver_id: sellerId,
        message: input.trim(),
      };

      console.log('Message data to insert:', messageData);

      const { error } = await supabase
        .from('messages')
        .insert([messageData]);

      if (error) {
        console.error('Insert error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Failed to send message: ${error.message}`);
      }

      // Fetch fresh messages to display the newly sent message
      const { data: msgData, error: fetchError } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, message, created_at')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${sellerId}),and(sender_id.eq.${sellerId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (!fetchError && msgData) {
        setMessages((msgData || []) as Message[]);
      }

      setInput('');
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast({ title: 'Failed to send message', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated || !user || !sellerId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-semibold text-foreground">{actualSellerName || sellerName}</h1>
                  {plantName ? (
                    <p className="text-xs text-muted-foreground">About: {plantName}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Buyer</p>
                  )}
                </div>
              </div>
            </div>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Leaf className="w-4 h-4 text-primary-foreground" />
              </div>
            </Link>
          </div>
          {plantName && (
            <div className="mt-2 text-xs text-muted-foreground">
              Regarding: <span className="text-foreground font-medium">{plantName}</span>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No messages yet. Start a conversation with {actualSellerName || sellerName}!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.sender_id === user.id ? "justify-end" : "justify-start"}`}
                >
                  {message.sender_id !== user.id && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.sender_id === user.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.message}</div>
                    {plantName && (
                      <p className={`text-xs mt-2 opacity-70 ${message.sender_id === user.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        🌱 {plantName}
                      </p>
                    )}
                    <p className={`text-xs mt-1 ${message.sender_id === user.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {message.sender_id === user.id && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

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
              placeholder="Type your message..."
              className="flex-1"
              disabled={sending}
            />
            <Button type="submit" variant="hero" size="icon" disabled={!input.trim() || sending}>
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
