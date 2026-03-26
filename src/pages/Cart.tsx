import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Leaf,
  ArrowLeft,
  Trash2,
  ShoppingCart,
  Plus,
  Minus,
  Loader2,
  ShoppingBag,
  Truck,
  Banknote,
  Smartphone,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Store,
  Upload,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CartItem {
  id: string;
  plant_id: string;
  quantity: number;
  plant: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    stock_quantity: number;
    seller_id: string;
  };
}

interface SellerInfo {
  full_name: string;
  business_name: string | null;
  location: string | null;
}

interface SellerGroup {
  sellerId: string;
  sellerInfo: SellerInfo | null;
  items: CartItem[];
  total: number;
}

interface PlatformSettings {
  ccp_number: string;
  baridimob_number: string;
  account_name: string;
}

const WILAYAS = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra",
  "Béchar", "Blida", "Bouira", "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret",
  "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saïda", "Skikda",
  "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem",
  "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh", "Illizi",
  "Bordj Bou Arréridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt",
  "El Oued", "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla",
  "Naâma", "Aïn Témouchent", "Ghardaïa", "Relizane",
  "El M'Ghair", "El Meniaa", "Ouled Djellal", "Bordj Badji Mokhtar",
  "Béni Abbès", "Timimoun", "Touggourt", "Djanet", "In Salah", "In Guezzam",
];

type CheckoutStep = "cart" | "checkout" | "payment" | "confirmation";

const Cart = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [submitting, setSubmitting] = useState(false);
  const [sellerProfiles, setSellerProfiles] = useState<Record<string, SellerInfo>>({});
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);

  // Which seller group is being checked out


  // Store checkout group data for payment step (since items get removed after order)
  const [paymentCheckoutGroups, setPaymentCheckoutGroups] = useState<SellerGroup[] | null>(null);

  // Checkout form
  const [paymentMethod, setPaymentMethod] = useState<string>("cash_on_delivery");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("delivery");
  const DELIVERY_COST = 500; // 500 DA flat delivery fee
  const [wilaya, setWilaya] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Payment proof form
  const [createdOrderIds, setCreatedOrderIds] = useState<string[]>([]);
  const [transactionRef, setTransactionRef] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirmation data
  const [confirmedOrder, setConfirmedOrder] = useState<{
    total: number;
    paymentMethod: string;
    sellerName: string;
  } | null>(null);

  const fetchCart = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("cart_items")
      .select("id, plant_id, quantity, plants:plant_id(id, name, price, image_url, stock_quantity, seller_id)")
      .eq("user_id", user.id);

    if (data) {
      const mapped = data
        .filter((d: any) => d.plants)
        .map((d: any) => ({
          id: d.id,
          plant_id: d.plant_id,
          quantity: d.quantity,
          plant: d.plants,
        }));
      setItems(mapped);

      // Fetch seller profiles
      const sellerIds = [...new Set(mapped.map((m: CartItem) => m.plant.seller_id))];
      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, business_name, location")
          .in("user_id", sellerIds);
        if (profiles) {
          const map: Record<string, SellerInfo> = {};
          profiles.forEach((p: any) => {
            map[p.user_id] = {
              full_name: p.full_name,
              business_name: p.business_name,
              location: p.location,
            };
          });
          setSellerProfiles(map);
        }
      }
    }

    // Fetch platform settings
    try {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("ccp_number, baridimob_number, account_name")
        .limit(1);
      if (settings && settings.length > 0) {
        setPlatformSettings(settings[0] as PlatformSettings);
      } else {
        // Set default platform settings if none exist
        setPlatformSettings({
          ccp_number: "1234567890",
          baridimob_number: "9876543210",
          account_name: "Nabtati Platform"
        });
      }
    } catch (error) {
      console.warn("Platform settings not available:", error);
      // Set default platform settings on error
      setPlatformSettings({
        ccp_number: "1234567890",
        baridimob_number: "9876543210",
        account_name: "Nabtati Platform"
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    fetchCart();
  }, [user]);

  const updateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setUpdatingId(itemId);
    await supabase.from("cart_items").update({ quantity: newQty }).eq("id", itemId);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i))
    );
    setUpdatingId(null);
  };

  const removeItem = async (itemId: string) => {
    await supabase.from("cart_items").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    toast({ title: "Item removed from cart" });
  };

  // Group items by seller
  const sellerGroups: SellerGroup[] = useMemo(() => {
    const groups: Record<string, CartItem[]> = {};
    items.forEach((item) => {
      const sid = item.plant.seller_id;
      if (!groups[sid]) groups[sid] = [];
      groups[sid].push(item);
    });
    return Object.entries(groups).map(([sellerId, groupItems]) => ({
      sellerId,
      sellerInfo: sellerProfiles[sellerId] || null,
      items: groupItems,
      total: groupItems.reduce((sum, i) => sum + i.plant.price * i.quantity, 0),
    }));
  }, [items, sellerProfiles]);

  const grandTotal = items.reduce((sum, i) => sum + i.plant.price * i.quantity, 0);

  const handleProceedToCheckoutAll = () => {
    setPaymentMethod("cash_on_delivery");
    setDeliveryMethod("delivery");
    setStep("checkout");
    window.scrollTo(0, 0);
  };

  const handlePlaceOrder = async () => {
    if (!user || sellerGroups.length === 0) return;

    if (deliveryMethod === "delivery") {
      if (!wilaya) {
        toast({ title: "Please select your wilaya", variant: "destructive" });
        return;
      }
      if (!city.trim()) {
        toast({ title: "Please enter your city", variant: "destructive" });
        return;
      }
      if (!address.trim()) {
        toast({ title: "Please enter your address", variant: "destructive" });
        return;
      }
      if (!phone.trim()) {
        toast({ title: "Please enter your phone number", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);

    try {
      const deliveryCost = deliveryMethod === "delivery" ? DELIVERY_COST : 0;
      const shippingAddress = deliveryMethod === "delivery" ? `${address}, ${city}, ${wilaya}` : null;
      const orderStatus = paymentMethod === "ccp_baridimob" ? "pending_payment_verification" : "pending_delivery";

      const newOrderIds: string[] = [];

      for (const group of sellerGroups) {
        try {
          // Create order
          const { data: order, error: orderErr } = await supabase
            .from("orders")
            .insert({
              buyer_id: user.id,
              seller_id: group.sellerId,
              total_amount: group.total + deliveryCost,
              shipping_address: shippingAddress,
              shipping_city: deliveryMethod === "delivery" ? city : null,
              shipping_wilaya: deliveryMethod === "delivery" ? wilaya : null,
              payment_method: paymentMethod,
              delivery_method: deliveryMethod,
              delivery_cost: deliveryCost,
              seller_pickup_location: deliveryMethod === "pickup" ? group.sellerInfo?.location : null,
              status: orderStatus,
              notes: notes || null,
            })
            .select("id")
            .single();

          if (orderErr) {
            console.error("Order creation error:", orderErr);
            throw new Error(orderErr.message || "Failed to create order");
          }

          if (!order || !order.id) {
            throw new Error("Order ID not received from database");
          }

          newOrderIds.push(order.id);

          // Create order items
          const orderItems = group.items.map((i) => ({
            order_id: order.id,
            plant_id: i.plant_id,
            plant_name: i.plant.name,
            quantity: i.quantity,
            unit_price: i.plant.price,
          }));

          const { error: itemsErr } = await supabase
            .from("order_items")
            .insert(orderItems);

          if (itemsErr) {
            console.error("Order items creation error:", itemsErr);
            throw new Error(itemsErr.message || "Failed to create order items");
          }
        } catch (err: any) {
          console.error("Error creating order for seller:", err);
          toast({
            title: "Error",
            description: err.message || "Failed to create order",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      }

      if (newOrderIds.length === 0) {
        throw new Error("No orders were created");
      }

      // Remove checked-out items from cart
      const itemIds = sellerGroups.flatMap((g) => g.items.map((i) => i.id));
      const { error: deleteErr } = await supabase
        .from("cart_items")
        .delete()
        .in("id", itemIds);

      if (deleteErr) {
        console.warn("Warning: Failed to clear cart items:", deleteErr);
        // Non-fatal, continue anyway
      }

      setItems((prev) => prev.filter((i) => !itemIds.includes(i.id)));

      const finalTotal = grandTotal + deliveryCost * sellerGroups.length;

      if (paymentMethod === "ccp_baridimob") {
        setCreatedOrderIds(newOrderIds);
        setPaymentCheckoutGroups(sellerGroups);
        setTransactionRef("");
        setScreenshotFile(null);
        setStep("payment");
        toast({
          title: "Orders created!",
          description: "Please proceed to submit payment proof.",
        });
      } else {
        setConfirmedOrder({
          total: finalTotal,
          paymentMethod,
          sellerName: sellerGroups.length === 1 ? getSellerDisplayName(sellerGroups[0]) : "Multiple Sellers",
        });
        setStep("confirmation");
        toast({
          title: "Order placed successfully!",
          description: "Your order has been confirmed.",
        });
      }
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error("Unexpected error in handlePlaceOrder:", err);
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!user || createdOrderIds.length === 0 || !paymentCheckoutGroups) return;

    if (!transactionRef.trim()) {
      toast({ title: "Please enter the transaction reference", variant: "destructive" });
      return;
    }
    if (!screenshotFile) {
      toast({ title: "Please upload a payment screenshot", variant: "destructive" });
      return;
    }

    setUploadingProof(true);

    const fileExt = screenshotFile.name.split(".").pop();
    const filePath = `${user.id}/${createdOrderIds[0]}_proof.${fileExt}`;

    let uploadErr = null;
    try {
      const uploadResult = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, screenshotFile, { upsert: true });
      uploadErr = uploadResult.error;
    } catch (error) {
      console.warn("Storage bucket not available:", error);
      toast({ title: "Error", description: "Payment proof upload failed. Please try again later.", variant: "destructive" });
      setUploadingProof(false);
      return;
    }

    if (uploadErr) {
      toast({ title: "Upload failed", description: uploadErr.message, variant: "destructive" });
      setUploadingProof(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("payment-proofs")
      .getPublicUrl(filePath);

    const deliveryCost = deliveryMethod === "delivery" ? DELIVERY_COST : 0;

    for (let i = 0; i < createdOrderIds.length; i++) {
        const oId = createdOrderIds[i];
        const groupTotal = paymentCheckoutGroups[i]?.total || 0;
        try {
          await supabase.from("payments").insert({
            order_id: oId,
            buyer_id: user.id,
            transaction_reference: transactionRef.trim(),
            screenshot_url: filePath, // Store the path instead of public URL
            amount: groupTotal + deliveryCost,
            status: "pending_verification",
          });
        } catch (error) {
           console.warn("Failed recording payment", error);
        }
    }

    setUploadingProof(false);
    
    const finalTotal = paymentCheckoutGroups.reduce((acc, g) => acc + g.total, 0) + (deliveryCost * paymentCheckoutGroups.length);

    setConfirmedOrder({
      total: finalTotal,
      paymentMethod: "ccp_baridimob",
      sellerName: paymentCheckoutGroups.length === 1 ? getSellerDisplayName(paymentCheckoutGroups[0]) : "Multiple Sellers",
    });
    setStep("confirmation");
    window.scrollTo(0, 0);
  };

  const getSellerDisplayName = (group: SellerGroup | null) => {
  return (
    group?.sellerInfo?.business_name ||
    group?.sellerInfo?.full_name ||
    "Unknown Seller"
  );
};

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (step === "checkout" || step === "payment") { setStep("cart"); setPaymentCheckoutGroups(null); }
                else if (step === "confirmation") { setStep("cart"); setPaymentCheckoutGroups(null); }
                else navigate("/marketplace");
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">
                {step === "checkout" || step === "payment" ? "Back to Cart" : step === "confirmation" ? "Back to Cart" : "Continue Shopping"}
              </span>
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Leaf className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground hidden sm:block">
                  Nabtati
              </span>
            </Link>
            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        <div className="flex items-center justify-center gap-2 text-sm">
          {[
            { key: "cart", label: "Cart", icon: ShoppingCart },
            { key: "checkout", label: "Checkout", icon: Truck },
            { key: "payment", label: "Payment", icon: CreditCard },
            { key: "confirmation", label: "Confirmed", icon: CheckCircle2 },
          ].map((s, i) => {
            const stepOrder = ["cart", "checkout", "payment", "confirmation"];
            const currentIdx = stepOrder.indexOf(step);
            const thisIdx = stepOrder.indexOf(s.key);
            const isActive = step === s.key;
            const isPast = thisIdx < currentIdx;
            return (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && <div className={`w-8 h-px ${isActive || isPast ? "bg-primary" : "bg-border"}`} />}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isPast
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <s.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      

      <main className="container mx-auto px-4 py-4 max-w-4xl">
        {/* STEP: CART — grouped by seller */}
        {step === "cart" && (
          <>
            <h1 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-primary" />
              Your Cart ({items.length})
            </h1>

            {items.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto" />
                <p className="text-xl text-muted-foreground">Your cart is empty</p>
                <Button asChild variant="hero">
                  <Link to="/marketplace">Browse Plants</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {sellerGroups.map((group) => (
                  <div key={group.sellerId} className="rounded-xl border border-border overflow-hidden">
                    {/* Seller Header */}
                    <div className="bg-muted/50 px-5 py-3 flex items-center justify-between border-b border-border">
                      <div className="flex items-center gap-2">
                        <Store className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-foreground">{getSellerDisplayName(group)}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {group.items.length} {group.items.length === 1 ? "item" : "items"}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-border">
                      {group.items.map((item) => (
                        <div key={item.id} className="flex gap-4 p-4 bg-card">
                          <Link to={`/plant/${item.plant_id}`} className="flex-shrink-0">
                            <img
                              src={item.plant.image_url || "/placeholder.svg"}
                              alt={item.plant.name}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link to={`/plant/${item.plant_id}`}>
                              <h3 className="font-semibold text-foreground hover:text-primary transition-colors truncate text-sm">
                                {item.plant.name}
                              </h3>
                            </Link>
                            <p className="text-primary font-bold text-sm mt-0.5">
                              {item.plant.price.toLocaleString()} DA
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center border border-border rounded-lg">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1 || updatingId === item.id}
                                  className="p-1 text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-2.5 py-0.5 text-sm font-medium">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.plant.stock_quantity || updatingId === item.id}
                                  className="p-1 text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-foreground text-sm">
                              {(item.plant.price * item.quantity).toLocaleString()} DA
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Seller Total only */}
                    <div className="bg-muted/30 px-5 py-4 flex items-center justify-between border-t border-border">
                      <div>
                        <span className="text-sm text-muted-foreground">Subtotal: </span>
                        <span className="text-lg font-bold text-primary">{group.total.toLocaleString()} DA</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Grand Total Checkout */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-card border border-border mt-6">
                  <div>
                    <span className="text-muted-foreground mr-3">Grand Total (all sellers):</span>
                    <span className="text-2xl font-bold text-primary">{grandTotal.toLocaleString()} DA</span>
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    <Button variant="outline" className="w-full md:w-auto" asChild>
                      <Link to="/marketplace">Continue Shopping</Link>
                    </Button>
                    <Button variant="hero" className="w-full md:w-auto" onClick={handleProceedToCheckoutAll}>
                      Checkout All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* STEP: CHECKOUT — for all cart items */}
        {step === "checkout" && (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Truck className="w-6 h-6 text-primary" />
                Checkout
              </h2>

              {/* Delivery Method */}
              <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  Delivery Method
                </h3>
                <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod} className="space-y-3">
                  <label
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      deliveryMethod === "delivery"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <RadioGroupItem value="delivery" />
                    <Truck className="w-6 h-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Home Delivery</p>
                      <p className="text-sm text-muted-foreground">
                        We deliver to your address — {DELIVERY_COST.toLocaleString()} DA delivery fee
                      </p>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      deliveryMethod === "pickup"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <RadioGroupItem value="pickup" />
                    <Store className="w-6 h-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Pickup from Seller</p>
                      <p className="text-sm text-muted-foreground">
                        Pick up your order directly from the seller — free
                      </p>
                    </div>
                  </label>
                </RadioGroup>

                {deliveryMethod === "pickup" && (
                  <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                    <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Seller Pickup Location
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Contact sellers directly for their exact pickup addresses. Multiple sellers will require coordination.
                    </p>
                  </div>
                )}
              </div>

              {/* Delivery Address — only for home delivery */}
              {deliveryMethod === "delivery" && (
                <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Delivery Address
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wilaya">Wilaya *</Label>
                      <Select value={wilaya} onValueChange={setWilaya}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select wilaya" />
                        </SelectTrigger>
                        <SelectContent>
                          {WILAYAS.map((w, i) => (
                            <SelectItem key={w} value={w}>
                              {String(i + 1).padStart(2, "0")} - {w}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City / Commune *</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Bab Ezzouar"
                        maxLength={100}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Cité 1000 logements, Bloc 5, Apt 12"
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0555 12 34 56"
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Order Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special instructions for delivery..."
                      maxLength={500}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-primary" />
                  Payment Method
                </h3>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  <label
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      paymentMethod === "cash_on_delivery"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <RadioGroupItem value="cash_on_delivery" />
                    <Banknote className="w-6 h-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">
                        {deliveryMethod === "pickup" ? "Cash on Pickup" : "Cash on Delivery"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {deliveryMethod === "pickup"
                          ? "Pay in cash when you pick up your order"
                          : "Pay in cash when you receive your order — hand to hand"}
                      </p>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      paymentMethod === "ccp_baridimob"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <RadioGroupItem value="ccp_baridimob" />
                    <Smartphone className="w-6 h-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">CCP / BaridiMob</p>
                      <p className="text-sm text-muted-foreground">
                        Transfer to the platform account — admin will verify your payment
                      </p>
                    </div>
                  </label>
                </RadioGroup>

                {paymentMethod === "ccp_baridimob" && platformSettings && (
                  <div className="mt-4 p-4 rounded-lg bg-accent/10 border border-accent/30 space-y-2">
                    <p className="font-semibold text-foreground text-sm">
                      📋 After placing your order, you'll be asked to submit payment proof.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You'll see the platform payment details and upload a screenshot of your transfer.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Summary */}
            <div className="lg:col-span-1">
              <div className="p-6 rounded-xl bg-card border border-border sticky top-24 space-y-4 max-h-[80vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-foreground">Order Summary</h3>
                <div className="space-y-4 text-sm">
                  {sellerGroups.map((group) => (
                    <div key={group.sellerId} className="space-y-2">
                       <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 border-b border-border pb-1">
                         <Store className="w-3.5 h-3.5 text-primary" />
                         {getSellerDisplayName(group)}
                       </p>
                       {group.items.map((item) => (
                         <div key={item.id} className="flex justify-between text-muted-foreground text-xs">
                           <span className="truncate mr-2">
                             {item.plant.name} × {item.quantity}
                           </span>
                           <span>{(item.plant.price * item.quantity).toLocaleString()} DA</span>
                         </div>
                       ))}
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Products Total</span>
                    <span className="font-medium text-foreground">{grandTotal.toLocaleString()} DA</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Cost</span>
                    <span className="font-medium text-foreground">
                      {deliveryMethod === "delivery" ? `${(DELIVERY_COST * sellerGroups.length).toLocaleString()} DA` : "Free"}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Payment</span>
                    <span className="font-medium text-foreground">
                      {paymentMethod === "cash_on_delivery"
                        ? deliveryMethod === "pickup" ? "Cash on Pickup" : "Cash on Delivery"
                        : "CCP / BaridiMob"}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery</span>
                    <span className="font-medium text-foreground">
                      {deliveryMethod === "delivery" ? "Home Delivery" : "Pickup"}
                    </span>
                  </div>
                  {deliveryMethod === "delivery" && wilaya && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Wilaya</span>
                      <span className="font-medium text-foreground">{wilaya}</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between text-lg font-bold text-foreground">
                    <span>Total</span>
                    <span className="text-primary">
                      {deliveryMethod === "delivery" 
                        ? (grandTotal + (DELIVERY_COST * sellerGroups.length)).toLocaleString() 
                        : grandTotal.toLocaleString()} DA
                    </span>
                  </div>
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <ShoppingBag className="w-5 h-5 mr-2" />
                  )}
                  {submitting ? "Placing Order..." : "Place Order"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: PAYMENT PROOF — for CCP/BaridiMob */}
        {step === "payment" && paymentCheckoutGroups && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              Submit Payment Proof
            </h2>

            {/* Platform payment details */}
            <div className="p-6 rounded-xl bg-card border border-border space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Payment Instructions</h3>
              {platformSettings ? (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Send payment to the platform account:
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2 rounded bg-background">
                      <span className="text-muted-foreground">Account Name</span>
                      <span className="font-semibold text-foreground">{platformSettings.account_name}</span>
                    </div>
                    {platformSettings.ccp_number && (
                      <div className="flex justify-between items-center p-2 rounded bg-background">
                        <span className="text-muted-foreground">📧 CCP Number</span>
                        <span className="font-mono font-semibold text-foreground">{platformSettings.ccp_number}</span>
                      </div>
                    )}
                    {platformSettings.baridimob_number && (
                      <div className="flex justify-between items-center p-2 rounded bg-background">
                        <span className="text-muted-foreground">📱 BaridiMob</span>
                        <span className="font-mono font-semibold text-foreground">{platformSettings.baridimob_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center p-3 rounded bg-primary/10 border border-primary/20">
                      <span className="font-semibold text-foreground">💰 Amount to Transfer</span>
                      <span className="text-lg font-bold text-primary">{(paymentCheckoutGroups.reduce((acc, g) => acc + g.total, 0)).toLocaleString()} DA</span>
                    </div>
                  </div>
                  <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                    <li>Send <strong>{(paymentCheckoutGroups.reduce((acc, g) => acc + g.total, 0)).toLocaleString()} DA</strong> via BaridiMob or CCP to the account above</li>
                    <li>Take a screenshot of the transfer confirmation</li>
                    <li>Fill in the form below with the transaction reference and screenshot</li>
                  </ol>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 space-y-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Platform payment details are currently unavailable. Please contact support for payment instructions.
                  </p>
                  <div className="flex justify-between items-center p-3 rounded bg-yellow-100 border border-yellow-300">
                    <span className="font-semibold text-yellow-900">💰 Amount to Transfer</span>
                    <span className="text-lg font-bold text-yellow-900">{(paymentCheckoutGroups.reduce((acc, g) => acc + g.total, 0)).toLocaleString()} DA</span>
                  </div>
                  <ol className="text-xs text-yellow-700 mt-2 space-y-1 list-decimal list-inside">
                    <li>Send <strong>{(paymentCheckoutGroups.reduce((acc, g) => acc + g.total, 0)).toLocaleString()} DA</strong> via BaridiMob or CCP</li>
                    <li>Take a screenshot of the transfer confirmation</li>
                    <li>Fill in the form below with the transaction reference and screenshot</li>
                  </ol>
                </div>
              )}
            </div>

            {/* Payment proof form */}
            <div className="p-6 rounded-xl bg-card border border-border space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Payment Confirmation</h3>
              <div className="space-y-2">
                <Label htmlFor="txRef">Transaction Reference Number *</Label>
                <Input
                  id="txRef"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. TXN-123456789"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Upload Payment Screenshot *</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
                        return;
                      }
                      setScreenshotFile(file);
                    }
                  }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {screenshotFile ? (
                    <div className="space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-primary mx-auto" />
                      <p className="text-sm font-medium text-foreground">{screenshotFile.name}</p>
                      <p className="text-xs text-muted-foreground">Click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={handleSubmitProof}
                disabled={uploadingProof}
              >
                {uploadingProof ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                )}
                {uploadingProof ? "Submitting..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP: CONFIRMATION */}
        {step === "confirmation" && (
          <div className="text-center py-16 space-y-6 max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">Order Confirmed! 🎉</h2>
            <p className="text-muted-foreground">
  {confirmedOrder?.paymentMethod === "cash_on_delivery"
    ? `Your order with ${confirmedOrder?.sellerName} has been placed. Please prepare the payment for delivery.`
    : `Your order with ${confirmedOrder?.sellerName} has been placed. The admin will verify your CCP/BaridiMob payment.`}
</p>
            <p className="text-lg font-bold text-primary">
  {confirmedOrder?.total?.toLocaleString?.() ?? 0} DA
</p>
            {confirmedOrder?.paymentMethod === "ccp_baridimob" && (
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/30 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">⏳ Payment Verification Pending</p>
                <p>Your payment proof has been submitted. The admin will verify your transfer and confirm the order.</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button variant="hero" onClick={() => navigate("/dashboard/buyer", { state: { activeTab: "orders" } })}>
                View My Orders
              </Button>
              {items.length > 0 ? (
                <Button variant="outline" onClick={() => { setStep("cart"); setPaymentCheckoutGroups(null); }}>
                  Back to Cart ({items.length} remaining)
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link to="/marketplace">Continue Shopping</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
