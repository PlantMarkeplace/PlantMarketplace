import { useState , useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Leaf,
  ImageIcon,
  Plus,
  Package,
  DollarSign,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  MessageCircle,
  Settings,
  LogOut,
  Upload,
  X,
  BarChart3,
  Users,
  Star,
  CheckCircle,
  CreditCard,
  Check,
  X as XIcon,
  Image,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";



const SellerDashboard = () => {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [myListings, setMyListings] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [seller, setSeller] = useState<any>(null);

  const [stats, setStats] = useState({
  totalRevenue: 0,
  totalSales: 0,
  totalOrders: 0,
  avgRating: 0,
});

const [recentOrders, setRecentOrders] = useState<any[]>([]);

const [selectedOrder, setSelectedOrder] = useState<any>(null);

const [profileForm, setProfileForm] = useState({
  business_name: "",
  phone: "",
  location: "",
  bio: "",
  avatar_url: "",
});

const [editingPlant, setEditingPlant] = useState<any>(null);
const [isEditOpen, setIsEditOpen] = useState(false);

const ALGERIAN_CITIES = [
  "Adrar",
  "Chlef",
  "Laghouat",
  "Oum El Bouaghi",
  "Batna",
  "Béjaïa",
  "Biskra",
  "Béchar",
  "Blida",
  "Bouira",
  "Tamanrasset",
  "Tébessa",
  "Tlemcen",
  "Tiaret",
  "Tizi Ouzou",
  "Algiers",
  "Djelfa",
  "Jijel",
  "Sétif",
  "Saïda",
  "Skikda",
  "Sidi Bel Abbès",
  "Annaba",
  "Guelma",
  "Constantine",
  "Médéa",
  "Mostaganem",
  "M’sila",
  "Mascara",
  "Ouargla",
  "Oran",
  "El Bayadh",
  "Illizi",
  "Bordj Bou Arreridj",
  "Boumerdès",
  "El Tarf",
  "Tindouf",
  "Tissemsilt",
  "El Oued",
  "Khenchela",
  "Souk Ahras",
  "Tipaza",
  "Mila",
  "Aïn Defla",
  "Naâma",
  "Aïn Témouchent",
  "Ghardaïa",
  "Relizane"
];


  // Data loading function
  const loadData = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;

    const authUser = authData.user;

    // ================= PROFILE =================
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authUser.id)
      .single();

    setSeller({
      full_name: profileData?.full_name,
      email: profileData?.email || authUser.email,
    });

    setProfileForm({
      business_name: profileData?.business_name || "",
      phone: profileData?.phone || "",
      location: profileData?.location || "",
      bio: profileData?.bio || "",
      avatar_url: profileData?.avatar_url || "",
    });

    // ================= PLANTS =================
    const { data: plants } = await supabase
      .from("plants")
      .select("*")
      .eq("seller_id", authUser.id)
      .order("created_at", { ascending: false });

    setMyListings(plants || []);

    const plantIds = plants?.map((p) => p.id) || [];

    if (plantIds.length === 0) {
      setStats({
        totalRevenue: 0,
        totalSales: 0,
        totalOrders: 0,
        avgRating: 0,
      });
      setRecentOrders([]);
      return;
    }

    // ================= ORDER ITEMS =================
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("quantity, unit_price, order_id, plant_id")
      .in("plant_id", plantIds);

    const totalRevenue =
      orderItems?.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      ) || 0;

    const totalSales = orderItems?.length || 0;

    const orderIds = orderItems?.map((i) => i.order_id) || [];

    // ================= ORDERS =================
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
      .in("id", orderIds)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Error fetching seller orders:", ordersError);
      setRecentOrders([]);
      setStats((prev) => ({ ...prev, totalOrders: 0 }));
      return;
    }

    const buyerIds = Array.from(
      new Set((ordersData || []).map((order: any) => order.buyer_id).filter(Boolean))
    );

    const { data: buyersProfileData } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone, location")
      .in("user_id", buyerIds);

    const buyerMap = new Map<string, any>();
    ((buyersProfileData as any[]) || []).forEach((p: any) => buyerMap.set(p.user_id, p));

    const enrichedOrders = (ordersData || []).map((order: any) => ({
      ...order,
      buyer_profile: buyerMap.get(order.buyer_id) || null,
    }));

    setRecentOrders(enrichedOrders);

    const totalOrders = enrichedOrders?.length || 0;

    // ================= REVIEWS =================
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("seller_id", authUser.id);

    const avgRating =
      reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    setStats({
      totalRevenue,
      totalSales,
      totalOrders,
      avgRating,
    });

    // ================= MESSAGES =================
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, message, created_at, is_read')
        .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Messages fetch error:', error);
        throw error;
      }

      console.log('Messages fetched for seller:', data);

      const conversationMap = new Map<string, any>();
      
      (data || []).forEach((msg: any) => {
        const otherUserId = msg.sender_id === authUser.id ? msg.receiver_id : msg.sender_id;
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            id: msg.id,
            otherUserId,
            lastMessage: msg.message,
            lastMessageTime: msg.created_at,
            sender: msg.sender_id,
            otherUserName: '',
            plantId: null,
            unreadCount: 0,
          });
        }
      });

      // Count ONLY unread messages from other users to this seller
      (data || []).forEach((msg: any) => {
        // Skip if message is already read
        if (msg.is_read === true) return;
        
        // Skip if current user is the sender (we only count received messages)
        if (msg.sender_id === authUser.id) return;
        
        // Skip if current user is NOT the receiver (shouldn't happen but be safe)
        if (msg.receiver_id !== authUser.id) return;
        
        // Now count this unread received message
        const otherUserId = msg.sender_id;
        const conv = conversationMap.get(otherUserId);
        if (conv) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }
      });

      const conversationsWithNames = Array.from(conversationMap.values());
      for (const conv of conversationsWithNames) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', conv.otherUserId)
            .single();
          conv.otherUserName = profile?.full_name || 'Buyer';
        } catch (err) {
          console.warn('Error fetching profile for conversation:', err);
          conv.otherUserName = 'Buyer';
        }
      }

      setConversations(conversationsWithNames);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
    }
  };

  // Payment verification functions - REMOVED: Sellers cannot verify payments, only admins can

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

      // Refresh data
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    }
  };

useEffect(() => {
  loadData();

  // Set up real-time subscriptions for order and payment updates
  const ordersSubscription = supabase
    .channel('seller-orders')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
      },
      (payload) => {
        console.log('Order updated:', payload);
        loadData(); // Refresh data when an order is updated
      }
    )
    .subscribe();

  const paymentsSubscription = supabase
    .channel('seller-payments')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'payments',
      },
      (payload) => {
        console.log('Payment updated:', payload);
        loadData(); // Refresh data when a payment is updated
      }
    )
    .subscribe();

  // Cleanup subscriptions on unmount
  return () => {
    supabase.removeChannel(ordersSubscription);
    supabase.removeChannel(paymentsSubscription);
  };
}, [user]);

// Separate useEffect for message subscriptions
useEffect(() => {
  if (!user?.id) return;

  const authUser = user as any;

  // Set up real-time subscription for message updates (mark as read)
  const messagesSubscription = supabase
    .channel(`seller-messages-${authUser.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      },
      async (payload) => {
        console.log('Message updated (read status):', payload);
        // Refetch conversations only when messages are marked as read
        try {
          const { data, error } = await supabase
            .from('messages')
            .select('id, sender_id, receiver_id, message, created_at, is_read')
            .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
            .order('created_at', { ascending: false });

          if (error) throw error;

          const conversationMap = new Map<string, any>();
          
          (data || []).forEach((msg: any) => {
            const otherUserId = msg.sender_id === authUser.id ? msg.receiver_id : msg.sender_id;
            if (!conversationMap.has(otherUserId)) {
              conversationMap.set(otherUserId, {
                id: msg.id,
                otherUserId,
                lastMessage: msg.message,
                lastMessageTime: msg.created_at,
                sender: msg.sender_id,
                otherUserName: '',
                plantId: null,
                unreadCount: 0,
              });
            }
          });

          // Count ONLY unread messages from other users to this seller
          (data || []).forEach((msg: any) => {
            // Skip if message is already read
            if (msg.is_read === true) return;
            
            // Skip if current user is the sender (we only count received messages)
            if (msg.sender_id === authUser.id) return;
            
            // Skip if current user is NOT the receiver
            if (msg.receiver_id !== authUser.id) return;
            
            // Now count this unread received message
            const otherUserId = msg.sender_id;
            const conv = conversationMap.get(otherUserId);
            if (conv) {
              conv.unreadCount = (conv.unreadCount || 0) + 1;
            }
          });

          const conversationsWithNames = Array.from(conversationMap.values());
          for (const conv of conversationsWithNames) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', conv.otherUserId)
                .single();
              conv.otherUserName = profile?.full_name || 'Buyer';
            } catch (err) {
              console.warn('Error fetching profile for conversation:', err);
              conv.otherUserName = 'Buyer';
            }
          }

          console.log('Conversations updated from message subscription:', conversationsWithNames);
          setConversations(conversationsWithNames);
        } catch (err: any) {
          console.error('Error in message subscription refetch:', err);
        }
      }
    )
    .subscribe();

  // Cleanup subscriptions on unmount
  return () => {
    supabase.removeChannel(messagesSubscription);
  };
}, [user?.id]);

  const [activeTab, setActiveTab] = useState("overview");
  const [isAddPlantOpen, setIsAddPlantOpen] = useState(false);
  const [newPlant, setNewPlant] = useState({
  name: "",
  category: "",
  description: "",
  price: "",
  stock: "",
  difficulty: "",
  location: "",
  water: "",
  light: "",
  temperature: "",
  humidity: "",
});

  // handlers for multi-image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const combined = [...selectedImages, ...files].slice(0, 5);

    // revoke old urls
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));

    setSelectedImages(combined);
    setImagePreviews(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (idx: number) => {
    const newFiles = [...selectedImages];
    newFiles.splice(idx, 1);

    // revoke all previous urls and regenerate
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));

    setSelectedImages(newFiles);
    setImagePreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };


  // new states for multi-image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "listings", label: "My Listings", icon: Leaf },
    { id: "orders", label: "Orders", icon: Package },
    { id: "messages", label: "Messages", icon: MessageCircle },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleAddPlant = async () => {
  if (!newPlant.name || !newPlant.price || !newPlant.category) {
    toast({
      title: "Error",
      description: "Please fill in all required fields",
      variant: "destructive",
    });
    return;
  }

  const { data: authData } = await supabase.auth.getUser();
  const seller_id = authData?.user?.id;

  if (!seller_id) {
    toast({
      title: "Authentication Error",
      description: "Please login again.",
      variant: "destructive",
    });
    return;
  }

  // ✅ DEFAULT IMAGE (if no upload)
  let imageUrl =
    "https://images.unsplash.com/photo-1614594975525-e45190c55d0b";
  const imageUrls: string[] = [];

  // ✅ UPLOAD TO SUPABASE STORAGE (multiple images supported)
  if (selectedImages.length > 0) {
    for (const img of selectedImages) {
      const fileExt = img.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("plant-images")
        .upload(fileName, img);

      if (uploadError) {
        toast({
          title: "Image Upload Failed",
          description: uploadError.message,
          variant: "destructive",
        });
        return;
      }

      const { data } = supabase.storage
        .from("plant-images")
        .getPublicUrl(fileName);

      imageUrls.push(data.publicUrl);
    }

    // use first image as primary for now
    imageUrl = imageUrls[0];
  }


    // ✅ INSERT PLANT
  const { error } = await supabase.from("plants").insert([
    {
      seller_id,
      name: newPlant.name,
      description: newPlant.description || "",
      price: Number(newPlant.price),
      category: newPlant.category,
      difficulty: newPlant.difficulty || "Easy",
      location: newPlant.location,
      image_url: imageUrl,
      images: imageUrls.length > 0 ? imageUrls : [],
      stock_quantity: Number(newPlant.stock || 0),
      in_stock: Number(newPlant.stock || 0) > 0,
      scientific_name: "",
      care_instructions: JSON.stringify({
        water: newPlant.water || null,
        light: newPlant.light || null,
        temperature: newPlant.temperature || null,
        humidity: newPlant.humidity || null,
      }),
    },
  ]);

  if (error) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
    return;
  }

  // Reload plants
  const { data } = await supabase
    .from("plants")
    .select("*")
    .eq("seller_id", seller_id)
    .order("created_at", { ascending: false });

  setMyListings(data || []);

  toast({
    title: "Plant Added Successfully 🌿",
    description: `${newPlant.name} is now live.`,
  });

  setIsAddPlantOpen(false);
  setSelectedImages([]);
  setImagePreviews([]);

  setNewPlant({
  name: "",
  category: "",
  description: "",
  price: "",
  stock: "",
  difficulty: "",
  location: "",
  water: "",
  light: "",
  temperature: "",
  humidity: "",
});
};


  const handleDeleteListing = async (id: string, name: string) => {
  const { error } = await supabase.from("plants").delete().eq("id", id);

  if (!error) {
    setMyListings((prev) => prev.filter((p) => p.id !== id));

    toast({
      title: "Listing Deleted",
      description: `${name} has been removed.`,
    });
  }
};

const handleMarkAsSold = (id: number, name: string) => {
    toast({
      title: "Marked as Sold",
      description: `${name} has been marked as sold out.`,
    });
};

const handleSaveProfile = async () => {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return;
  // Ensure profile exists: upsert by user_id
  const payload = {
    user_id: user.id,
    business_name: profileForm.business_name || null,
    phone: profileForm.phone || null,
    location: profileForm.location || null,
    bio: profileForm.bio || null,
    avatar_url: profileForm.avatar_url || null,
    email: user.email || null,
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: 'user_id' });

  if (!error) {
    toast({
      title: "Profile Saved ✅",
      description: "Your store information has been saved.",
    });
  } else {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  }
};


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
            </Link>
            <div className="flex items-center gap-3">
              <Dialog
                open={isAddPlantOpen}
                onOpenChange={(open) => {
                  if (!open) {
                    // cleanup preview URLs
                    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
                    setSelectedImages([]);
                    setImagePreviews([]);
                    // optionally reset form fields if desired
                  }
                  setIsAddPlantOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="hero" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Plant
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Plant</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Plant Name *</Label>
                      <Input
                        value={newPlant.name}
                        onChange={(e) => setNewPlant({ ...newPlant, name: e.target.value })}
                        placeholder="e.g., Monstera Deliciosa"
                        className="mt-1"
                      />
                    </div>


                    <div className="grid grid-cols-2 gap-4">

  <div>
    <Label>Category *</Label>
    <Select
      value={newPlant.category}
      onValueChange={(value) =>
        setNewPlant({ ...newPlant, category: value })
      }
    >
      <SelectTrigger className="mt-1">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="indoor">Indoor Plants</SelectItem>
        <SelectItem value="outdoor">Outdoor Plants</SelectItem>
        <SelectItem value="succulents">Succulents & Cactus</SelectItem>
        <SelectItem value="aromatic">Aromatic & Medicinal</SelectItem>
        <SelectItem value="fruit">Fruit & Vegetable</SelectItem>
        <SelectItem value="rare">Rare & Exotic</SelectItem>
        <SelectItem value="seeds">Seeds & Bulbs</SelectItem>
        <SelectItem value="soil">Soil & Fertilizers</SelectItem>
        <SelectItem value="pots">Pots & Planters</SelectItem>
        <SelectItem value="tools">Gardening Tools</SelectItem>
        <SelectItem value="smart">Smart Pots & IoT</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <div>
    <Label>Difficulty</Label>
    <Select
      value={newPlant.difficulty}
      onValueChange={(value) =>
        setNewPlant({ ...newPlant, difficulty: value })
      }
    >
      <SelectTrigger className="mt-1">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Easy">Easy</SelectItem>
        <SelectItem value="Medium">Medium</SelectItem>
        <SelectItem value="Hard">Hard</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <div className="col-span-2">
    <Label>Location *</Label>
    <Select
      value={newPlant.location}
      onValueChange={(value) =>
        setNewPlant({ ...newPlant, location: value })
      }
    >
      <SelectTrigger className="mt-1">
        <SelectValue placeholder="Select City" />
      </SelectTrigger>
      <SelectContent>
        {ALGERIAN_CITIES.map((city) => (
          <SelectItem key={city} value={city}>
            {city}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

                   </div>

<div>
  <Label>Description</Label>
  <Textarea
    value={newPlant.description}
    onChange={(e) =>
      setNewPlant({ ...newPlant, description: e.target.value })
    }
    placeholder="Describe your plant..."
    className="mt-1"
    rows={3}
  />
</div>



  
                    <div className="border border-border rounded-xl p-4 space-y-3">
                      <h4 className="font-medium text-foreground text-sm">Care Instructions</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">💧 Water</Label>
                          <Input
                            value={newPlant.water}
                            onChange={(e) => setNewPlant({ ...newPlant, water: e.target.value })}
                            placeholder="e.g., Water when top 2 inches dry"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">☀️ Light</Label>
                          <Input
                            value={newPlant.light}
                            onChange={(e) => setNewPlant({ ...newPlant, light: e.target.value })}
                            placeholder="e.g., Bright indirect light"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">🌡️ Temperature</Label>
                          <Input
                            value={newPlant.temperature}
                            onChange={(e) => setNewPlant({ ...newPlant, temperature: e.target.value })}
                            placeholder="e.g., 65-85°F (18-29°C)"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">💨 Humidity</Label>
                          <Input
                            value={newPlant.humidity}
                            onChange={(e) => setNewPlant({ ...newPlant, humidity: e.target.value })}
                            placeholder="e.g., 60% or higher"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Price (DA) *</Label>
                        <Input
                          type="number"
                          value={newPlant.price}
                          onChange={(e) => setNewPlant({ ...newPlant, price: e.target.value })}
                          placeholder="0.00"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Stock Quantity</Label>
                        <Input
                          type="number"
                          value={newPlant.stock}
                          onChange={(e) => setNewPlant({ ...newPlant, stock: e.target.value })}
                          placeholder="1"
                          className="mt-1"
                        />
                      </div>
                    </div>

<div>
  <Label>Photos * (up to 5)</Label>
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    multiple
    className="hidden"
    onChange={handleImageSelect}
  />
  {imagePreviews.length > 0 && (
    <div className="flex gap-2 mt-2 flex-wrap">
      {imagePreviews.map((src, idx) => (
        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
          <img src={src} alt="" className="w-full h-full object-cover" />
          <button
            onClick={() => removeImage(idx)}
            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )}
  <div
    onClick={() => fileInputRef.current?.click()}
    className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors mt-2"
  >
    <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
    <p className="text-sm text-muted-foreground">
      Click to upload photos
    </p>
    <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 5MB each</p>
  </div>
</div>







  <Button
    variant="outline"
                  
    className="flex-1"
    onClick={() => setIsAddPlantOpen(false)}
  >
    Cancel
  </Button>

  <Button
    variant="hero"
    className="flex-1"
    onClick={handleAddPlant}
  >
    Add Plant
  </Button>
</div>
</DialogContent>
</Dialog>
                
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">
                        {seller?.full_name
                         ? seller.full_name
                         .split(" ")
                         .map((n: string) => n[0])
                         .join("")
                         .toUpperCase()
                          : "??"}
                </span>
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
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-semibold">
                  {seller?.full_name
                   ? seller.full_name
                   .split(" ")
                   .map((n: string) => n[0])
                   .join("")
                   .toUpperCase()
                   : "??"}
                  </span>
                </div>
                
                <h2 className="font-semibold text-foreground">
                   {seller?.full_name || "Loading..."}
                </h2>

                <p className="text-sm text-muted-foreground">
                 Seller
                </p>
                
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
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card rounded-xl border border-border p-4">
                    <DollarSign className="w-8 h-8 text-green-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">
  {stats.totalRevenue.toFixed(2)}DA
</p>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <Package className="w-8 h-8 text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">
                    {stats.totalSales}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Sales</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <Eye className="w-8 h-8 text-purple-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">0</p>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <Users className="w-8 h-8 text-orange-500 mb-2" />
                    <p className="text-2xl font-bold text-foreground">
                    {stats.totalOrders}
                    </p>
                    <p className="text-sm text-muted-foreground">Repeat Customers</p>
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
                        <div>
                          <p className="font-medium text-foreground">{order.id}</p>
                          <p className="text-sm text-muted-foreground">
                             Status: {order.status}
                                </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{order.total}DA</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            order.status === "delivered" ? "bg-green-100 text-green-700" :
                            order.status === "shipped" ? "bg-blue-100 text-blue-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* My Listings Preview */}
                <div className="bg-card rounded-2xl border border-border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">My Listings</h2>
                    <button onClick={() => setActiveTab("listings")} className="text-primary text-sm hover:underline">
                      View All
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {myListings.slice(0, 3).map((listing) => (
                      <div key={listing.id} className="rounded-xl border border-border overflow-hidden">
                        <img src={listing.image_url} alt={listing.name} className="w-full h-32 object-cover" />
                        <div className="p-3">
                          <p className="font-medium text-foreground text-sm">{listing.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-primary font-semibold">{listing.price}DA</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                             listing.in_stock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                              {listing.stock_quantity} in stock
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "listings" && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">My Listings</h2>
                  <Button variant="hero" size="sm" onClick={() => setIsAddPlantOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Plant
                  </Button>
                </div>
                <div className="space-y-4">
                  {myListings.map((listing) => (
                    <div key={listing.id} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                      <img src={listing.image_url} alt={listing.name} className="w-20 h-20 rounded-lg object-cover" />
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{listing.name}</h3>
                        <p className="text-primary font-semibold">{listing.price}DA</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" /> {listing.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" /> {listing.sales} sold
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          listing.in_stock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {listing.stock_quantity > 0 ? `${listing.stock_quantity} in stock` : "Out of stock"}
                        </span>
                        <Button
                             variant="ghost"
                         size="icon"
                           onClick={() => {
                            setEditingPlant(listing);
                              setIsEditOpen(true);
                              }}
                                >
                            <Edit className="w-4 h-4" />
                                  </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleMarkAsSold(listing.id, listing.name)}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteListing(listing.id, listing.name)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}

<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Plant</DialogTitle>
    </DialogHeader>

    {editingPlant && (
      <div className="space-y-4 mt-4">
        <Input
          value={editingPlant.name}
          onChange={(e) =>
            setEditingPlant({ ...editingPlant, name: e.target.value })
          }
        />

        <Input
          type="number"
          value={editingPlant.price}
          onChange={(e) =>
            setEditingPlant({ ...editingPlant, price: e.target.value })
          }
        />

        <Input
          type="number"
          value={editingPlant.stock_quantity}
          onChange={(e) =>
            setEditingPlant({
              ...editingPlant,
              stock_quantity: e.target.value,
            })
          }
        />

        <Input
          value={editingPlant.location || ''}
          onChange={(e) => setEditingPlant({ ...editingPlant, location: e.target.value })}
          placeholder="Location"
        />

        {/* Care instructions fields (try to parse existing value) */}
        <Input
          value={(typeof editingPlant.care_instructions === 'string' && (() => { try { const v = JSON.parse(editingPlant.care_instructions); return v.water || ''; } catch { return editingPlant.care_instructions || ''; } })()) || (editingPlant.care_instructions?.water || '')}
          onChange={(e) => {
            const raw = editingPlant.care_instructions;
            let parsed = {} as any;
            if (typeof raw === 'string') {
              try { parsed = JSON.parse(raw); } catch { parsed = { water: raw }; }
            } else parsed = raw || {};
            parsed.water = e.target.value;
            setEditingPlant({ ...editingPlant, care_instructions: parsed });
          }}
          placeholder="Water instructions"
        />

        <Input
          value={(typeof editingPlant.care_instructions === 'string' && (() => { try { const v = JSON.parse(editingPlant.care_instructions); return v.light || ''; } catch { return ''; } })()) || (editingPlant.care_instructions?.light || '')}
          onChange={(e) => {
            const raw = editingPlant.care_instructions;
            let parsed = {} as any;
            if (typeof raw === 'string') {
              try { parsed = JSON.parse(raw); } catch { parsed = {}; }
            } else parsed = raw || {};
            parsed.light = e.target.value;
            setEditingPlant({ ...editingPlant, care_instructions: parsed });
          }}
          placeholder="Light instructions"
        />

        <Input
          value={(typeof editingPlant.care_instructions === 'string' && (() => { try { const v = JSON.parse(editingPlant.care_instructions); return v.temperature || ''; } catch { return ''; } })()) || (editingPlant.care_instructions?.temperature || '')}
          onChange={(e) => {
            const raw = editingPlant.care_instructions;
            let parsed = {} as any;
            if (typeof raw === 'string') {
              try { parsed = JSON.parse(raw); } catch { parsed = {}; }
            } else parsed = raw || {};
            parsed.temperature = e.target.value;
            setEditingPlant({ ...editingPlant, care_instructions: parsed });
          }}
          placeholder="Temperature instructions"
        />

        <Input
          value={(typeof editingPlant.care_instructions === 'string' && (() => { try { const v = JSON.parse(editingPlant.care_instructions); return v.humidity || ''; } catch { return ''; } })()) || (editingPlant.care_instructions?.humidity || '')}
          onChange={(e) => {
            const raw = editingPlant.care_instructions;
            let parsed = {} as any;
            if (typeof raw === 'string') {
              try { parsed = JSON.parse(raw); } catch { parsed = {}; }
            } else parsed = raw || {};
            parsed.humidity = e.target.value;
            setEditingPlant({ ...editingPlant, care_instructions: parsed });
          }}
          placeholder="Humidity instructions"
        />

        <Button
            onClick={async () => {
            // prepare care_instructions string
            let careValue = editingPlant.care_instructions;
            if (typeof careValue === 'object') {
              careValue = JSON.stringify(careValue);
            }
            const { error } = await supabase
              .from("plants")
              .update({
                name: editingPlant.name,
                price: Number(editingPlant.price),
                stock_quantity: Number(editingPlant.stock_quantity),
                in_stock: Number(editingPlant.stock_quantity) > 0,
                location: editingPlant.location || null,
                care_instructions: careValue || null,
              })
              .eq("id", editingPlant.id);

            if (!error) {
              setMyListings((prev) =>
                prev.map((p) =>
                  p.id === editingPlant.id ? { ...p, ...editingPlant } : p
                )
              );

              toast({
                title: "Plant Updated 🌿",
              });

              setIsEditOpen(false);
            }
          }}
        >
          Save Changes
        </Button>
      </div>
    )}
  </DialogContent>
</Dialog>

                </div>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Orders Management</h2>
                <div className="space-y-6">
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No orders yet</p>
                      <p className="text-sm text-muted-foreground">Orders for your plants will appear here</p>
                    </div>
                  ) : (
                    recentOrders.map((order) => (
                      <div key={order.id} className="border border-border rounded-xl p-6 space-y-4">
                        {/* Order Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground">Order #{order.id.slice(-8)}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()} • {order.buyer_profile?.full_name || 'Customer'}
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

                        {/* Order Items */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-foreground">Items:</h4>
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                              <span>{item.plant_name}</span>
                              <span>Qty: {item.quantity} × ${item.unit_price}</span>
                            </div>
                          ))}
                        </div>

                        {/* Buyer Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-foreground">Buyer:</p>
                            <p>{order.buyer_profile?.full_name || 'N/A'}</p>
                            <p>{order.buyer_profile?.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Delivery Address:</p>
                            <p>{order.shipping_address || 'N/A'}</p>
                            {order.shipping_city && <p className="text-xs text-muted-foreground">{order.shipping_city}, {order.shipping_wilaya}</p>}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">Payment:</p>
                            <p>{order.payment_method === 'ccp_baridimob' ? 'CCP/BaridiMob' : 'Cash on Delivery'}</p>
                            {order.payment_method === 'ccp_baridimob' && order.payments && order.payments.length > 0 && (
                              <p className={`text-xs font-medium ${
                                order.payments[0].status === 'verified' ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {order.payments[0].status === 'verified' ? '✓ Payment Verified' : '⏳ Waiting for admin verification'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Payment Verification Section - Show only for CCP/BaridiMob */}
                        {order.payment_method === 'ccp_baridimob' && order.payments && order.payments.length > 0 && (
                          <div className="border-t pt-4">
                            <h4 className="font-medium text-sm text-foreground mb-3">Payment Status:</h4>
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
                                    {payment.status === 'verified' ? 'Verified' :
                                     payment.status === 'rejected' ? 'Rejected' :
                                     'Pending Verification'}
                                  </span>
                                </div>

                                {payment.screenshot_url && (
                                  <div className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" />
                                    <a
                                      href={payment.screenshot_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline text-sm"
                                    >
                                      View Payment Proof
                                    </a>
                                  </div>
                                )}

                                {payment.status !== 'verified' && (
                                  <div className="bg-orange-50 border border-orange-200 rounded p-3">
                                    <p className="text-sm text-orange-800">
                                      ⏳ This order is waiting for admin payment verification. You can update the status once payment is confirmed.
                                    </p>
                                  </div>
                                )}

                                {payment.status === 'verified' && order.status !== 'delivered' && (
                                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                    <p className="text-sm text-blue-800">
                                      ✅ Payment verified and funds held in escrow. Update order status to ship the product. Funds will be released once buyer confirms delivery.
                                    </p>
                                  </div>
                                )}

                                {payment.status === 'verified' && order.status === 'delivered' && (
                                  <div className="bg-green-50 border border-green-200 rounded p-3">
                                    <p className="text-sm text-green-800">
                                      💰 <span className="font-medium">Payment Released!</span> The buyer has confirmed delivery and funds have been transferred to your account.
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Order Actions */}
                        <div className="flex items-center justify-between border-t pt-4">
                          {order.payment_method === 'cash_on_delivery' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Update Status:</span>
                              <Select
                                value={order.status}
                                onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="processing">Start Preparing</SelectItem>
                                  <SelectItem value="in_transit">Mark as Shipped</SelectItem>
                                  <SelectItem value="delivered">Mark as Delivered</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-sm font-medium">Update Status:</span>
                              <Select
                                value={order.status}
                                onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                                disabled={
                                  // Only block CCP/BaridiMob orders while they are still waiting for admin verification
                                  (
                                    order.payment_method === 'ccp_baridimob' &&
                                    String(order.status || '').trim().toLowerCase() === 'pending_payment_verification' &&
                                    !order.payments?.some((p: any) => String(p?.status || '').trim().toLowerCase() === 'verified')
                                  )
                                }
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="processing">Start Preparing</SelectItem>
                                  <SelectItem value="in_transit">Mark as Shipped</SelectItem>
                                  <SelectItem value="delivered">Mark as Delivered</SelectItem>
                                </SelectContent>
                              </Select>
                              {/* Removed explicit 'Wait for admin payment verification' helper — sellers may now update normally once order leaves pending_payment_verification or a payment is verified. */}
                            </div>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
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
                    <p className="text-sm text-muted-foreground">Customer inquiries will appear here</p>
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
                          <MessageCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{conv.otherUserName || 'Customer'}</p>
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

            {activeTab === "analytics" && (
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Analytics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl border border-border">
                    <h3 className="font-medium text-foreground mb-4">Sales This Month</h3>
                    <div className="h-40 flex items-end gap-2">
                      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-primary/20 rounded-t-md hover:bg-primary/40 transition-colors"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-6 rounded-xl border border-border">
                    <h3 className="font-medium text-foreground mb-4">Top Products</h3>
                    {myListings.map((p, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="text-foreground">{p.name}</span>
                        <span className="text-muted-foreground">{p.sales} sales</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
  <div className="bg-card rounded-2xl border border-border p-6">
    <h2 className="text-xl font-semibold text-foreground mb-6">
      Store Settings
    </h2>

    <div className="space-y-4 max-w-md">

      <div>
        <Label>Full Name</Label>
        <Input value={seller?.full_name || ""} disabled className="mt-1" />
      </div>

      <div>
        <Label>Email</Label>
        <Input value={seller?.email || ""} disabled className="mt-1" />
      </div>

      <div>
        <Label>Business Name</Label>
        <Input
          value={profileForm.business_name}
          onChange={(e) =>
            setProfileForm({ ...profileForm, business_name: e.target.value })
          }
          className="mt-1"
        />
      </div>

      <div>
        <Label>Phone</Label>
        <Input
          value={profileForm.phone}
          onChange={(e) =>
            setProfileForm({ ...profileForm, phone: e.target.value })
          }
          className="mt-1"
        />
      </div>

      <div>
        <Label>Location</Label>
        <Input
          value={profileForm.location}
          onChange={(e) =>
            setProfileForm({ ...profileForm, location: e.target.value })
          }
          className="mt-1"
        />
      </div>

      <div>
        <Label>Bio</Label>
        <Textarea
          value={profileForm.bio}
          onChange={(e) =>
            setProfileForm({ ...profileForm, bio: e.target.value })
          }
          className="mt-1"
          rows={3}
        />
      </div>

      <Button variant="hero" onClick={handleSaveProfile}>
        Save Changes
      </Button>

    </div>
  </div>
)}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
