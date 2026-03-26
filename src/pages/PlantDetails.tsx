import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Leaf,
  ArrowLeft,
  Heart,
  ShoppingCart,
  MessageCircle,
  Star,
  MapPin,
  Truck,
  Shield,
  Droplets,
  Sun,
  Thermometer,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  PenLine,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import ProfileDropdown from "@/components/ProfileDropdown";

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800&h=800&fit=crop";


const PlantDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [currentImage, setCurrentImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [plant, setPlant] = useState<any | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerProfile, setSellerProfile] = useState<any | null>(null);

  // review dialog/state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const images = (() => {
    if (!plant) return [PLACEHOLDER_IMAGE];
    const collected: string[] = [];
    if (plant.tags && Array.isArray(plant.tags)) collected.push(...plant.tags);
    if (plant.image_url && typeof plant.image_url === 'string') collected.push(plant.image_url);
    const filtered = collected.filter((u) => !!u);
    return filtered.length ? filtered : [PLACEHOLDER_IMAGE];
  })();
  const careInstructions = (() => {
    const raw = plant?.care_instructions;
    if (!raw) return { water: "-", light: "-", temperature: "-", humidity: "-" };
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') {
      // Try JSON first, otherwise parse labeled lines (legacy format)
      try {
        return JSON.parse(raw);
      } catch {
        const parsed = { water: "-", light: "-", temperature: "-", humidity: "-" };
        const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
          const mWater = line.match(/^(water|water:)\s*[:\-]?\s*(.*)$/i);
          const mLight = line.match(/^(light|light:)\s*[:\-]?\s*(.*)$/i);
          const mTemp = line.match(/^(temperature|temp|temperature:)\s*[:\-]?\s*(.*)$/i);
          const mHum = line.match(/^(humidity|humidity:)\s*[:\-]?\s*(.*)$/i);
          if (mWater) parsed.water = mWater[2] || mWater[1];
          else if (mLight) parsed.light = mLight[2] || mLight[1];
          else if (mTemp) parsed.temperature = mTemp[2] || mTemp[1];
          else if (mHum) parsed.humidity = mHum[2] || mHum[1];
          else {
            // if unlabeled, assign to water if empty
            if (parsed.water === "-") parsed.water = line;
          }
        }
        return parsed;
      }
    }
    return { water: "-", light: "-", temperature: "-", humidity: "-" };
  })();

  const [addingToCart, setAddingToCart] = useState(false);

  const handleAddToCart = async () => {
    if (!isAuthenticated || !user) {
      navigate('/auth');
      return;
    }
    if (!plant) return;
    setAddingToCart(true);
    try {
      // check existing cart item
      const { data: existing, error: fetchErr } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('plant_id', plant.id)
        .maybeSingle();
      if (!fetchErr) {
        if (existing) {
          // update quantity
          const { error: updErr } = await supabase
            .from('cart_items')
            .update({ quantity: existing.quantity + quantity })
            .eq('id', existing.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('cart_items')
            .insert([{ user_id: user.id, plant_id: plant.id, quantity }]);
          if (insErr) throw insErr;
        }
      }
      toast({
        title: 'Added to Cart',
        description: `${quantity}x ${plant.name} added to your cart.`,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add to cart' });
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    toast({
      title: "Proceeding to Checkout",
      description: "Redirecting to payment...",
    });
    // In a real app, this would navigate to checkout
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated || !user) {
      navigate('/auth');
      return;
    }

    if (!plant) return;

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('plant_id', plant.id);

        if (!error) {
          setIsFavorite(false);
          toast({ title: 'Removed from Favorites', description: `${plant.name} removed from favorites` });
        }
      } else {
        const { error } = await supabase
          .from('wishlists')
          .insert([{ user_id: user.id, plant_id: plant.id }]);

        if (!error) {
          setIsFavorite(true);
          toast({ title: 'Added to Favorites', description: `${plant.name} added to favorites` });
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Unable to update favorites' });
    }
  };

  const handleChatWithSeller = () => {
    if (!isAuthenticated || !user) {
      navigate('/auth');
      return;
    }
    navigate('/chat', { 
      state: { 
        sellerId: plant?.seller_id,
        sellerName: sellerProfile?.full_name || sellerProfile?.business_name || 'Seller',
        plantId: plant?.id,
        plantName: plant?.name
      } 
    });
  };

  const handleSubmitReview = async () => {
    if (!plant || !user) return;
    if (reviewRating < 1) {
      toast({ title: 'Please select a rating' });
      return;
    }
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from('reviews').insert([{ 
        plant_id: plant.id,
        reviewer_id: user.id,
        reviewer_name: user.fullName || null,
        rating: reviewRating,
        comment: reviewText || null,
        created_at: new Date().toISOString(),
      }]);
      if (!error) {
        // refresh reviews list
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('*')
          .eq('plant_id', plant.id)
          .order('created_at', { ascending: false });
        setReviews(reviewsData || []);
        setHasReviewed(true);
        setReviewOpen(false);
        setReviewRating(0);
        setReviewText('');
        toast({ title: 'Thank you for your review!' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to submit review' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  useEffect(() => {
    if (!id) {
      navigate('/marketplace');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: plantData, error: plantError } = await supabase
          .from('plants')
          .select('*')
          .eq('id', id)
          .single();

        if (plantError) throw plantError;
        setPlant(plantData as any);

        // Fetch seller profile (try matching profile id or user_id)
        try {
          const sellerId = (plantData as any)?.seller_id;
          if (sellerId) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .or(`id.eq.${sellerId},user_id.eq.${sellerId}`)
              .maybeSingle();

            if (!profileError) {
              setSellerProfile(profileData ?? null);
            } else {
              console.warn('Seller profile fetch error', profileError);
            }
          }
        } catch (err) {
          console.warn('Error fetching seller profile', err);
        }

        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('*')
          .eq('plant_id', id)
          .order('created_at', { ascending: false });

        if (reviewsError) {
          // non-fatal
          console.warn(reviewsError);
          setReviews([]);
        } else {
          setReviews(reviewsData ?? []);
        }

        // Check if current user has this plant in their wishlist
        try {
          if (isAuthenticated && user) {
            const { data: favData, error: favError } = await supabase
              .from('wishlists')
              .select('*')
              .eq('user_id', user.id)
              .eq('plant_id', id)
              .maybeSingle();

            if (!favError) {
              setIsFavorite(!!favData);
            }
            // can review if buyer and not the seller
            setCanReview((user.role === 'buyer') && ((plantData as any)?.seller_id !== user.id));
            // also check if already reviewed
            const { data: myReview, error: reviewErr } = await supabase
              .from('reviews')
              .select('*')
              .eq('plant_id', id)
              .eq('reviewer_id', user.id)
              .maybeSingle();
            if (!reviewErr) {
              setHasReviewed(!!myReview);
            }
          }
        } catch (err) {
          console.warn('Failed to fetch favorite status or review info', err);
        }
      } catch (err: any) {
        console.error('Failed to load plant', err);
        toast({ title: 'Failed to load plant', description: err.message ?? String(err) });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/marketplace" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to Marketplace</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground hidden sm:block">
                  Nabtati
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="w-5 h-5" />
              </Button>
              {isAuthenticated ? <ProfileDropdown /> : (
                <Button variant="default" size="sm" asChild>
                  <Link to="/auth">Log In</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
              <img
                src={images[currentImage] ?? PLACEHOLDER_IMAGE}
                alt={plant?.name ?? "Plant image"}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={handleToggleFavorite}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
              >
                <Heart className={`w-5 h-5 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
              </button>
            </div>
            <div className="flex gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImage(idx)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                    currentImage === idx ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
                {plant?.category ?? "-"} • {plant?.difficulty ?? "-"}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                {plant?.name ?? "Plant"}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  {plant?.rating ?? "-"} ({reviews.length} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {plant?.location ?? "-"}
                </span>
              </div>
            </div>

            <div className="text-4xl font-bold text-primary">
              {plant?.price ?? "-"}DA
            </div>

            <p className="text-muted-foreground leading-relaxed">
              {plant?.description ?? "-"}
            </p>

            {/* Care Instructions */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                <Droplets className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Water</p>
                  <p className="text-sm font-medium text-foreground">{careInstructions.water}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                <Sun className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Light</p>
                  <p className="text-sm font-medium text-foreground">{careInstructions.light}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                <Thermometer className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Temperature</p>
                  <p className="text-sm font-medium text-foreground">{careInstructions.temperature}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                <Droplets className="w-5 h-5 text-teal-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Humidity</p>
                  <p className="text-sm font-medium text-foreground">{careInstructions.humidity}</p>
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">{sellerProfile?.full_name ? sellerProfile.full_name[0] : (sellerProfile?.business_name ? sellerProfile.business_name[0] : (plant?.seller_id ?? '').toString().slice(0,2).toUpperCase() || 'S')}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{sellerProfile?.full_name ?? sellerProfile?.business_name ?? plant?.seller ?? plant?.seller_id ?? 'Seller'}</p>
                  {sellerProfile?.is_verified && (
                    <CheckCircle className="w-4 h-4 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{sellerProfile?.location ?? (plant?.location ?? '')}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleChatWithSeller}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </Button>
            </div>

            {/* Quantity & Actions */}
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 text-foreground hover:bg-muted transition-colors"
                >
                  -
                </button>
                <span className="px-4 py-2 font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2 text-foreground hover:bg-muted transition-colors"
                >
                  +
                </button>
              </div>
              <span className="text-sm text-muted-foreground">
                {plant?.stock_quantity ?? 0} in stock
              </span>
            </div>

            <div className="flex gap-4">
              <Button
                variant="hero"
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={addingToCart || !plant?.in_stock}
              >
                {addingToCart ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="w-5 h-5 mr-2" />
                )}
                Add to Cart
              </Button>
              <Button
                variant="heroOutline"
                size="lg"
                className="flex-1"
                onClick={() => navigate('/cart')}
              >
                View Cart
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-6 pt-4 border-t border-border text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Fast Shipping
              </span>
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Secure Payment
              </span>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              Customer Reviews ({reviews.length})
            </h2>
            {isAuthenticated && canReview && !hasReviewed && (
              <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" size="sm">
                    <PenLine className="w-4 h-4 mr-2" />
                    Write a Review
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Review {plant?.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    {/* Star selector */}
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Your Rating</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            onClick={() => setReviewRating(s)}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-7 h-7 ${
                                s <= reviewRating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Your Review</p>
                      <Textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Share your experience with this plant..."
                        rows={4}
                      />
                    </div>
                    <Button
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                      className="w-full"
                      variant="hero"
                    >
                      {submittingReview ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Submit Review
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {isAuthenticated && hasReviewed && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-primary" /> You reviewed this plant
              </span>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="p-8 rounded-xl bg-muted/30 border border-border text-center">
              <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="p-6 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium text-sm">
                          {(review.reviewer_name || "A")[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{review.reviewer_name || "Anonymous"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-muted-foreground">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PlantDetails;

