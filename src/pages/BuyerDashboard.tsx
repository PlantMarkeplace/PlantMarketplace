import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/landing/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import {
  Leaf,
  Search,
  Heart,
  ShoppingCart,
  Package,
  Star,
  Clock,
  MessageCircle,
  User,
  Settings,
  LogOut,
  ChevronRight,
  TrendingUp,
  CheckCircle,
  Truck,
  XCircle,
  Eye,
} from "lucide-react";


const BuyerDashboard = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [conversations, setConversations] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setReviews(data);
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
    }
  };

  const handleSubmitReview = async (orderId: string, plantId: string, sellerId: string) => {
    if (!user || !reviewForm.comment.trim()) {
      alert('Please add a comment');
      return;
    }

    setSubmittingReview(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert([
          {
            reviewer_id: user.id,
            seller_id: sellerId,
            plant_id: plantId,
            order_id: orderId,
            rating: reviewForm.rating,
            comment: reviewForm.comment.trim(),
          }
        ]);

      if (error) throw error;

      // Show success message
      alert('Review submitted successfully!');
      
      // Reset form and refresh reviews
      setReviewForm({ rating: 5, comment: '' });
      setSelectedOrderForReview(null);
      await fetchReviews();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      alert(`Failed to submit review: ${error.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            plant_name,
            quantity,
            unit_price
          ),
          payments (
            id,
            transaction_reference,
            screenshot_url,
            amount,
            status
          )
        `)
        .eq("buyer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setRecentOrders(data);
    } catch (err: any) {
      console.error("Error fetching buyer orders:", err);
    }
  };

  // Handle navigation state for active tab
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }

    if (!user?.id) return;

    // Define all fetch functions inside useEffect
    const fetchFavorites = async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select(`
      plant_id,
      plants (
        id,
        name,
        price,
        image_url,
        seller_id,
        profiles (
          full_name
        )
      )
    `)
        .eq("user_id", user.id);

      if (!error && data) {
        const formatted = data.map((f: any) => ({
          id: f.plants.id,
          name: f.plants.name,
          price: f.plants.price,
          image: f.plants.image_url,
          seller: f.plants.profiles?.full_name || "Seller",
          inStock: true,
        }));
        setFavoriteProducts(formatted);
      }
    };

    const fetchRecommendations = async () => {
      const { data, error } = await supabase
        .from("plants")
        .select("*")
        .limit(4);

      if (!error && data) {
        setRecommendations(data);
      }
    };

    const fetchStats = async () => {
      const { count: orders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", user.id);

      const { count: messages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const { count: reviews } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("reviewer_id", user.id);

      setOrdersCount(orders || 0);
      setMessagesCount(messages || 0);
      setReviewsCount(reviews || 0);
    };

    const fetchConversations = async () => {
      try {
        // Fetch all messages where user is sender or receiver
        const { data, error } = await supabase
          .from('messages')
          .select('id, sender_id, receiver_id, message, created_at, is_read, plant_id')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Messages fetch error:', error);
          throw error;
        }

        console.log('Messages fetched:', data);

        // Group messages by conversation (with each unique seller/buyer)
        const conversationMap = new Map<string, any>();
        
        (data || []).forEach((msg: any) => {
          const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          
          // Only add if not already exists (keeps the most recent message)
          if (!conversationMap.has(otherUserId)) {
            conversationMap.set(otherUserId, {
              id: msg.id,
              otherUserId,
              lastMessage: msg.message,
              lastMessageTime: msg.created_at,
              sender: msg.sender_id,
              plantId: msg.plant_id,
              unreadCount: 0,
            });
          }
        });

        // Count unread messages for each conversation
        (data || []).forEach((msg: any) => {
          const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          const conv = conversationMap.get(otherUserId);
          if (conv && msg.receiver_id === user.id && msg.is_read === false) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
          }
        });

        // Fetch seller names for each conversation
        const conversationsWithNames = Array.from(conversationMap.values());
        for (const conv of conversationsWithNames) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', conv.otherUserId)
              .single();
            conv.otherUserName = profile?.full_name || 'User';
          } catch (err) {
            console.warn('Error fetching profile for conversation:', err);
            conv.otherUserName = 'User';
          }
        }

        console.log('Conversations grouped:', conversationsWithNames);
        setConversations(conversationsWithNames);
      } catch (err: any) {
        console.error('Error fetching conversations:', err);
        toast({ title: 'Error', description: 'Failed to load conversations', variant: 'destructive' });
      }
    };

    const fetchProfileData = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setProfileData(data);
      } catch (err: any) {
        console.error('Error fetching profile:', err);
      }
    };

    // Call all fetch functions
    fetchFavorites();
    fetchOrders();
    fetchRecommendations();
    fetchStats();
    fetchConversations();
    fetchProfileData();
    fetchReviews();

    // Set up real-time subscription for order updates
    const ordersSubscription = supabase
      .channel('buyer-orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Order updated:', payload);
          fetchOrders(); // Refresh orders when an order is updated
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, [isAuthenticated, isLoading, user, navigate]);

  const tabs = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "orders", label: "My Orders", icon: Package },
    { id: "favorites", label: "Favorites", icon: Heart },
    { id: "messages", label: "Messages", icon: MessageCircle },
    { id: "profile", label: "Profile", icon: User },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleConfirmDelivery = async (orderId: string) => {
    try {
      // Update order status to delivered
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // For CCP/BaridiMob orders, mark payment as released to seller
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ 
          status: 'verified', // Keep as verified, but add a note that funds are released
          updated_at: new Date().toISOString()
        })
        .eq('order_id', orderId);

      if (paymentError) {
        console.warn('Failed to update payment status:', paymentError);
        // Don't throw here as order update succeeded
      }

      // Refresh orders
      await fetchOrders();

      // Show success message
      alert('Delivery confirmed! Payment has been released to the seller.');
    } catch (error: any) {
      console.error('Error confirming delivery:', error);
      alert('Failed to confirm delivery. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const userName = user?.fullName || "User";
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl text-primary font-semibold">{userInitials}</span>
                </div>
                <h2 className="font-semibold text-foreground">{userName}</h2>
                <p className="text-sm text-muted-foreground">Buyer</p>
              </div>
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Log Out
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* Welcome Banner */}
                <div className="bg-primary rounded-2xl p-8 text-primary-foreground">
                  <h1 className="text-2xl font-bold mb-2">Welcome , {userName.split(" ")[0]}!</h1>
                  <p className="opacity-80 mb-4">Ready to explore more beautiful plants?</p>
                  <Button
                    variant="secondary"
                    className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                    asChild
                  >
                    <Link to="/marketplace">
                      Browse Marketplace
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card rounded-xl border border-border p-4">
                    <Package className="w-8 h-8 text-primary mb-2" />
                    <p className="text-2xl font-bold text-foreground">{ordersCount}</p>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <Heart className="w-8 h-8 text-red-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">{favoriteProducts.length}</p>
                    <p className="text-sm text-muted-foreground">Favorites</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <MessageCircle className="w-8 h-8 text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">{messagesCount}</p>
                    <p className="text-sm text-muted-foreground">Messages</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <Star className="w-8 h-8 text-yellow-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">{reviewsCount}</p>
                    <p className="text-sm text-muted-foreground">Reviews</p>
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
                    <button onClick={() => setActiveTab("orders")} className="text-primary text-sm hover:underline">
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{order.id}</p>
                            <p className="text-sm text-muted-foreground">{order.items} items • {order.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">${order.total}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            order.status === "Delivered" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Recommended for You</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {recommendations.map((plant) => (
                      <Link
                        key={plant.id}
                        to={`/plant/${plant.id}`}
                        className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-elevated transition-shadow"
                      >
                        <img src={plant.image_url} alt={plant.name} className="w-full aspect-square object-cover" />
                        <div className="p-3">
                          <p className="font-medium text-foreground text-sm">{plant.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-primary font-semibold">${plant.price}</span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {plant.rating}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">My Orders</h2>
                <div className="space-y-4">
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No orders yet</p>
                      <p className="text-sm text-muted-foreground">Your orders will appear here</p>
                    </div>
                  ) : (
                    recentOrders.map((order) => (
                      <div key={order.id} className="border border-border rounded-xl p-6 space-y-4">
                        {/* Order Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              order.status === "delivered" ? "bg-green-100" :
                              order.status === "in_transit" || order.status === "shipped" ? "bg-blue-100" :
                              order.status === "pending_payment_verification" ? "bg-orange-100" :
                              order.status === "cancelled" ? "bg-red-100" :
                              "bg-yellow-100"
                            }`}>
                              {order.status === "delivered" ? <CheckCircle className="w-6 h-6 text-green-600" /> :
                               order.status === "in_transit" || order.status === "shipped" ? <Truck className="w-6 h-6 text-blue-600" /> :
                               order.status === "pending_payment_verification" ? <Clock className="w-6 h-6 text-orange-600" /> :
                               order.status === "cancelled" ? <XCircle className="w-6 h-6 text-red-600" /> :
                               <Package className="w-6 h-6 text-yellow-600" />}
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">Order #{order.id.slice(-8)}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString()} • {order.order_items?.length || 0} items
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">${order.total_amount}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              order.status === "delivered" ? "bg-green-100 text-green-700" :
                              order.status === "in_transit" || order.status === "shipped" ? "bg-blue-100 text-blue-700" :
                              order.status === "pending_payment_verification" ? "bg-orange-100 text-orange-700" :
                              order.status === "cancelled" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {order.status.replace('_', ' ').charAt(0).toUpperCase() + order.status.replace('_', ' ').slice(1)}
                            </span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2">
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded">
                              <span>{item.plant_name}</span>
                              <span>Qty: {item.quantity} × ${item.unit_price} = ${(item.quantity * item.unit_price).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Payment Info */}
                        <div className="flex items-center justify-between text-sm border-t pt-3">
                          <div>
                            <span className="font-medium text-foreground">Payment: </span>
                            <span>{order.payment_method === 'ccp_baridimob' ? 'CCP/BaridiMob' : 'Cash on Delivery'}</span>
                            {order.status === 'pending_payment_verification' && order.payment_method === 'ccp_baridimob' && (
                              <span className="ml-2 text-orange-600 font-medium">⏳ Waiting for verification</span>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </div>

                        {/* Confirm Delivery Button for CCP Orders */}
                        {order.status === 'in_transit' && order.payment_method === 'ccp_baridimob' && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-blue-800">
                                  <span className="font-medium">📦 Order shipped</span> - Your order is on the way. Please confirm delivery once you receive it.
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                  <strong>Important:</strong> Confirming delivery will release the escrowed payment to the seller.
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleConfirmDelivery(order.id)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Confirm Delivery
                              </Button>
                            </div>
                          </div>
                        )}

                        {order.status === 'in_transit' && order.payment_method === 'cash_on_delivery' && (
                          <div className="bg-green-50 border border-green-200 rounded p-3">
                            <p className="text-sm text-green-800">
                              <span className="font-medium">🚚 Order in transit</span> - Your order is on the way. You'll pay cash upon delivery.
                            </p>
                          </div>
                        )}

                        {order.status === 'confirmed' && order.payment_method === 'ccp_baridimob' && (
                          <div className="bg-green-50 border border-green-200 rounded p-3">
                            <p className="text-sm text-green-800">
                              <span className="font-medium">✅ Payment confirmed</span> - Your payment has been verified and funds are held in escrow. The seller is preparing your order.
                            </p>
                          </div>
                        )}

                        {/* Order Timeline/Status Progress */}
                        <div className="border-t pt-4">
                          <h4 className="font-medium text-sm text-foreground mb-3">Order Progress</h4>
                          <div className="flex items-center space-x-4">
                            {(() => {
                              const fullFlow = [
                                { status: 'pending_delivery', label: 'Order Placed', icon: Package },
                                { status: 'pending_payment_verification', label: 'Payment Verification', icon: Clock },
                                { status: 'confirmed', label: 'Payment Confirmed', icon: CheckCircle },
                                { status: 'processing', label: 'Preparing', icon: Package },
                                { status: 'in_transit', label: 'In Transit', icon: Truck },
                                { status: 'delivered', label: 'Delivered', icon: CheckCircle }
                              ];

                              const codFlow = [
                                { status: 'pending_delivery', label: 'Order Placed', icon: Package },
                                { status: 'processing', label: 'Preparing', icon: Package },
                                { status: 'in_transit', label: 'In Transit', icon: Truck },
                                { status: 'delivered', label: 'Delivered', icon: CheckCircle }
                              ];

                              const steps = order.payment_method === 'ccp_baridimob' ? fullFlow : codFlow;

                              const orderIndex = Math.max(0, steps.findIndex((s) => s.status === order.status));

                              return steps.map((step, index) => {
                                const isCompleted = orderIndex >= index || order.status === 'delivered';

                                return (
                                  <div key={step.status} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                      <step.icon className="w-4 h-4" />
                                    </div>
                                    <span className={`ml-2 text-xs ${isCompleted ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                      {step.label}
                                    </span>
                                    {index < steps.length - 1 && <div className={`w-8 h-0.5 mx-2 ${isCompleted ? 'bg-green-200' : 'bg-gray-200'}`} />}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "favorites" && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">My Favorites</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favoriteProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={`/plant/${product.id}`}
                      className="flex gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                    >
                      <img src={product.image} alt={product.name} className="w-24 h-24 rounded-lg object-cover" />
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">{product.seller}</p>
                        <p className="text-primary font-semibold mt-2">${product.price}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "messages" && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Messages</h2>
                {conversations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground">Start chatting with sellers!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conversations.map((conv) => (
                      <div
                        key={conv.otherUserId}
                        onClick={() => navigate('/chat', { state: { sellerId: conv.otherUserId, plantName: conv.plantName } })}
                        className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{conv.otherUserName || 'Seller'}</p>
                          <p className="text-xs text-muted-foreground mb-1">Last message:</p>
                          <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                          {conv.unreadCount > 0 && (
                            <div className="bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
                              {conv.unreadCount}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(conv.lastMessageTime).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">My Profile</h2>
                {profileData ? (
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="text-sm text-muted-foreground">Full Name</label>
                      <Input value={profileData?.full_name || user?.fullName || ''} readOnly className="mt-1 bg-muted" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Email</label>
                      <Input value={user?.email || ''} readOnly className="mt-1 bg-muted" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Phone</label>
                      <Input value={profileData?.phone || 'Not provided'} readOnly className="mt-1 bg-muted" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Location</label>
                      <Input value={profileData?.location || 'Not provided'} readOnly className="mt-1 bg-muted" />
                    </div>
                    <p className="text-sm text-muted-foreground">Contact us to update your profile information.</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Loading profile...</div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Settings</h2>
                <div className="space-y-6 max-w-md">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div>
                      <p className="font-medium text-foreground">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive order updates</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div>
                      <p className="font-medium text-foreground">Marketing Emails</p>
                      <p className="text-sm text-muted-foreground">New plants and offers</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5 accent-primary" />
                  </div>
                  <Button variant="outline" className="w-full">Change Password</Button>
                  <Button variant="destructive" className="w-full">Delete Account</Button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;
