import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Leaf,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  Shield,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Settings,
  LogOut,
  Eye,
  Ban,
  Trash2,
  Truck,
  Clock,
  Check,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const users = [
  { id: 1, name: "John", email: "john@example.com", role: "buyer", status: "active", joined: "2024-01-15" },
  { id: 2, name: "Sarah Johnson", email: "sarah@greengardens.com", role: "seller", status: "active", joined: "2024-01-10" },
  { id: 3, name: "Mike Chen", email: "mike@example.com", role: "buyer", status: "suspended", joined: "2024-01-05" },
  { id: 4, name: "Emily Brown", email: "emily@plantparadise.com", role: "professional", status: "pending", joined: "2024-01-01" },
];

const listings = [
  { id: 1, name: "Monstera Deliciosa", seller: "Green Gardens", price: 45.99, status: "active", reports: 0 },
  { id: 2, name: "Suspicious Listing", seller: "Unknown", price: 999.99, status: "flagged", reports: 5 },
  { id: 3, name: "Fiddle Leaf Fig", seller: "Plant Paradise", price: 89.99, status: "active", reports: 0 },
];

const AdminPanel = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "orders", label: "Orders", icon: Package },
    { id: "users", label: "Users", icon: Users },
    { id: "listings", label: "Listings", icon: Package },
    { id: "security", label: "Security", icon: Shield },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleApprove = (name: string) => {
    toast({ title: "Approved", description: `${name} has been approved.` });
  };

  const handleSuspend = (name: string) => {
    toast({ title: "Suspended", description: `${name} has been suspended.`, variant: "destructive" });
  };

  const handleDelete = (name: string) => {
    toast({ title: "Deleted", description: `${name} has been deleted.`, variant: "destructive" });
  };

  // Orders management functions
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            plant_id,
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
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      const userIds = Array.from(
        new Set(
          ordersData
            .flatMap((order: any) => [order.buyer_id, order.seller_id])
            .filter(Boolean)
        )
      );

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, location, business_name")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map<string, any>();
      (profilesData || []).forEach((p: any) => profilesMap.set(p.user_id, p));

      const enrichedOrders = ordersData.map((order: any) => ({
        ...order,
        buyer: profilesMap.get(order.buyer_id) || null,
        seller_profile: profilesMap.get(order.seller_id) || null,
      }));

      // Generate signed URLs for payment proofs
      const newSignedUrls = new Map<string, string>();
      for (const order of enrichedOrders) {
        if (order.payments && order.payments.length > 0) {
          for (const payment of order.payments) {
            if (payment.screenshot_url) {
              try {
                // screenshot_url may be either a stored object path (folder/file.ext)
                // or a previously stored public URL. createSignedUrl expects the
                // object path inside the bucket. Extract the path when needed.
                let objectPath = payment.screenshot_url;
                if (typeof objectPath === 'string' && objectPath.startsWith('http')) {
                  const m = objectPath.match(/payment-proofs\/(.*)$/);
                  if (m && m[1]) objectPath = m[1];
                }

                const { data, error } = await supabase.storage
                  .from('payment-proofs')
                  .createSignedUrl(objectPath, 3600); // 1 hour expiry

                if (!error && data && data.signedUrl) {
                  newSignedUrls.set(payment.id, data.signedUrl);
                } else {
                  // fallback: if signing failed but we have a public url stored, use it
                  if (typeof payment.screenshot_url === 'string' && payment.screenshot_url.startsWith('http')) {
                    newSignedUrls.set(payment.id, payment.screenshot_url);
                  } else {
                    console.error('Failed to sign or fallback not available for payment:', payment.id, error);
                  }
                }
              } catch (err) {
                console.error('Failed to generate signed URL for payment:', payment.id, err);
                if (typeof payment.screenshot_url === 'string' && payment.screenshot_url.startsWith('http')) {
                  newSignedUrls.set(payment.id, payment.screenshot_url);
                }
              }
            }
          }
        }
      }
      setSignedUrls(newSignedUrls);

      setOrders(enrichedOrders);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (paymentId: string, orderId: string) => {
    try {
      // Update payment status
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ status: 'verified' })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast({
        title: "Payment Verified",
        description: "Payment has been verified and order confirmed.",
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify payment",
        variant: "destructive",
      });
    }
  };

  const handleRejectPayment = async (paymentId: string, orderId: string) => {
    try {
      // Update payment status
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ status: 'rejected' })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast({
        title: "Payment Rejected",
        description: "Payment has been rejected and order cancelled.",
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject payment",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Order status updated to ${newStatus.replace('_', ' ')}.`,
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();

      // Set up real-time subscriptions for order and payment updates
      const ordersSubscription = supabase
        .channel('admin-orders')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
          },
          (payload) => {
            console.log('Order updated:', payload);
            fetchOrders(); // Refresh orders when an order is updated
          }
        )
        .subscribe();

      const paymentsSubscription = supabase
        .channel('admin-payments')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'payments',
          },
          (payload) => {
            console.log('Payment updated:', payload);
            fetchOrders(); // Refresh orders when a payment is updated
          }
        )
        .subscribe();

      // Cleanup subscriptions when tab changes
      return () => {
        supabase.removeChannel(ordersSubscription);
        supabase.removeChannel(paymentsSubscription);
      };
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:block">
                Nabtati
              </span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                Admin
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="text-red-500 font-semibold">AD</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="font-semibold text-foreground">Admin Panel</h2>
                <p className="text-sm text-muted-foreground">System Management</p>
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
                <Link
                  to="/"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Log Out
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card rounded-xl border border-border p-4">
                    <Users className="w-8 h-8 text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">5,234</p>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <Package className="w-8 h-8 text-green-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">12,456</p>
                    <p className="text-sm text-muted-foreground">Active Listings</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <DollarSign className="w-8 h-8 text-emerald-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">$89,432</p>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <TrendingUp className="w-8 h-8 text-purple-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">+24%</p>
                    <p className="text-sm text-muted-foreground">Growth Rate</p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-foreground">New seller "Plant Paradise" verified</span>
                      <span className="text-xs text-muted-foreground ml-auto">2 min ago</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-foreground">Listing flagged for review</span>
                      <span className="text-xs text-muted-foreground ml-auto">15 min ago</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <Users className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-foreground">50 new users registered today</span>
                      <span className="text-xs text-muted-foreground ml-auto">1 hour ago</span>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">User Growth</h3>
                    <div className="h-40 flex items-end gap-2">
                      {[30, 45, 55, 70, 65, 85, 90].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-primary/20 rounded-t-md hover:bg-primary/40 transition-colors"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                        <span key={d}>{d}</span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-4">Revenue</h3>
                    <div className="h-40 flex items-end gap-2">
                      {[50, 65, 45, 80, 75, 95, 85].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-green-500/20 rounded-t-md hover:bg-green-500/40 transition-colors"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                        <span key={d}>{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Order Management</h2>
                  <Button onClick={fetchOrders} disabled={loading}>
                    {loading ? "Loading..." : "Refresh"}
                  </Button>
                </div>

                <div className="space-y-6">
                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No orders found</p>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div key={order.id} className="border border-border rounded-xl p-6 space-y-4">
                        {/* Order Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground">Order #{order.id.slice(-8)}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()} • {order.buyer?.full_name || 'Unknown Buyer'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">${order.total_amount}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              order.status === "delivered" ? "bg-green-100 text-green-700" :
                              order.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                              order.status === "pending_payment_verification" ? "bg-orange-100 text-orange-700" :
                              order.status === "cancelled" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {order.status.replace('_', ' ').charAt(0).toUpperCase() + order.status.replace('_', ' ').slice(1)}
                            </span>
                          </div>
                        </div>

                        {/* Order Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-foreground">Buyer:</p>
                            <p>{order.buyer?.full_name || 'N/A'}</p>
                            <p>{order.buyer?.phone || 'N/A'}</p>
                            <p>{order.buyer?.location || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Seller:</p>
                            <p>{order.seller_profile?.business_name || order.seller_profile?.full_name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Payment:</p>
                            <p>{order.payment_method === 'ccp_baridimob' ? 'CCP/BaridiMob' : 'Cash on Delivery'}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.shipping_city && `${order.shipping_city}, `}{order.shipping_wilaya}
                            </p>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-foreground">Items:</h4>
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded">
                              <span>{item.plant_name}</span>
                              <span>Qty: {item.quantity} × ${item.unit_price} = ${(item.quantity * item.unit_price).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Payment Verification Section */}
                        {order.payment_method === 'ccp_baridimob' && order.payments && order.payments.length > 0 && (
                          <div className="border-t pt-4">
                            <h4 className="font-medium text-sm text-foreground mb-3">Payment Verification:</h4>
                            {order.payments.map((payment: any) => (
                              <div key={payment.id} className="bg-muted/50 rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">Transaction: {payment.transaction_reference || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">Amount: ${payment.amount}</p>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    payment.status === "verified" ? "bg-green-100 text-green-700" :
                                    payment.status === "rejected" ? "bg-red-100 text-red-700" :
                                    "bg-orange-100 text-orange-700"
                                  }`}>
                                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                  </span>
                                </div>

                                {/* Escrow Status for CCP Orders */}
                                {order.payment_method === 'ccp_baridimob' && (
                                  <div className="mt-2">
                                    <span className="text-xs font-medium text-muted-foreground">Escrow Status: </span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                      order.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                                      payment.status === 'verified' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-orange-100 text-orange-700'
                                    }`}>
                                      {order.status === 'delivered' ? 'Funds Released to Seller' :
                                       order.status === 'in_transit' ? 'Funds Held - Awaiting Buyer Confirmation' :
                                       payment.status === 'verified' ? 'Funds Held - Seller Processing' :
                                       'Funds Held - Payment Verification'}
                                    </span>
                                  </div>
                                )}

                                {payment.screenshot_url && signedUrls.has(payment.id) && (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <ImageIcon className="w-4 h-4" />
                                      <span className="text-sm font-medium text-foreground">Payment Proof:</span>
                                    </div>
                                    <a
                                      href={signedUrls.get(payment.id)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-block"
                                    >
                                      <img
                                        src={signedUrls.get(payment.id)}
                                        alt="Payment proof"
                                        className="max-w-xs max-h-64 rounded border border-border hover:shadow-md transition-shadow cursor-pointer"
                                        onError={(e: any) => {
                                          console.error("Image failed to load:", signedUrls.get(payment.id));
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    </a>
                                    <a
                                      href={signedUrls.get(payment.id)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline text-xs block"
                                    >
                                      Open full image
                                    </a>
                                  </div>
                                )}

                                {payment.status === 'pending_verification' && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleVerifyPayment(payment.id, order.id)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      Verify Payment
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleRejectPayment(payment.id, order.id)}
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Reject Payment
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Order Actions */}
                        <div className="flex items-center justify-between border-t pt-4">
                          {order.payment_method === 'ccp_baridimob' ? (
                            <div className="bg-green-50 border border-green-200 rounded p-3 flex-1">
                              <p className="text-sm text-green-800">
                                ✓ CCP Order: Payment verified and funds held in escrow. Seller manages order status. Funds release upon buyer delivery confirmation.
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-sm font-medium">Update Status:</span>
                              <Select
                                value={order.status}
                                onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                                disabled={order.status === 'pending_delivery'}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="processing">Preparing</SelectItem>
                                  <SelectItem value="in_transit">In Transit</SelectItem>
                                  <SelectItem value="delivered">Delivered</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                  <SelectItem value="refunded">Refunded</SelectItem>
                                </SelectContent>
                              </Select>
                              {order.status === 'pending_delivery' && (
                                <p className="text-xs text-muted-foreground ml-2">Seller will start processing soon</p>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "users" && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">User Management</h2>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Joined</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-foreground">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="capitalize text-foreground">{user.role}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.status === "active" ? "bg-green-100 text-green-700" :
                              user.status === "suspended" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{user.joined}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleApprove(user.name)}>
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleSuspend(user.name)}>
                                <Ban className="w-4 h-4 text-yellow-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(user.name)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "listings" && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Listing Management</h2>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Listings</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="removed">Removed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  {listings.map((listing) => (
                    <div key={listing.id} className="flex items-center justify-between p-4 rounded-xl border border-border">
                      <div>
                        <p className="font-medium text-foreground">{listing.name}</p>
                        <p className="text-sm text-muted-foreground">by {listing.seller} • ${listing.price}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {listing.reports > 0 && (
                          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
                            {listing.reports} reports
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          listing.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {listing.status}
                        </span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleApprove(listing.name)}>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(listing.name)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-6">Security Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                      <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                      <p className="font-semibold text-foreground">System Status</p>
                      <p className="text-sm text-muted-foreground">All systems operational</p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                      <Shield className="w-8 h-8 text-blue-500 mb-2" />
                      <p className="font-semibold text-foreground">Security Score</p>
                      <p className="text-sm text-muted-foreground">98/100 - Excellent</p>
                    </div>
                    <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
                      <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
                      <p className="font-semibold text-foreground">Alerts</p>
                      <p className="text-sm text-muted-foreground">2 low-priority alerts</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-2xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-4">Recent Security Events</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-foreground">Failed login attempt blocked</span>
                      <span className="text-xs text-muted-foreground ml-auto">5 min ago</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <Shield className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-foreground">Security scan completed</span>
                      <span className="text-xs text-muted-foreground ml-auto">1 hour ago</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-foreground">Unusual API activity detected</span>
                      <span className="text-xs text-muted-foreground ml-auto">3 hours ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Platform Settings</h2>
                <div className="space-y-6 max-w-md">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div>
                      <p className="font-medium text-foreground">Maintenance Mode</p>
                      <p className="text-sm text-muted-foreground">Disable public access</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5 accent-primary" />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div>
                      <p className="font-medium text-foreground">New Registrations</p>
                      <p className="text-sm text-muted-foreground">Allow new user signups</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div>
                      <p className="font-medium text-foreground">Email Verification</p>
                      <p className="text-sm text-muted-foreground">Require email verification</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary" />
                  </div>
                  <Button variant="hero">Save Settings</Button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
