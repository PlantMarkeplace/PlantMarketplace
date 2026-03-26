import { useState , useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Leaf,
  Search,
  Grid3X3,
  List,
  Heart,
  ShoppingCart,
  MessageCircle,
  Star,
  MapPin,
  Home,
  TreePine,
  Flower2,
  Apple,
  Sparkles,
  Package,
  Shovel,
  Cpu,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// All Plant Categories
const categories = [
  { id: "all", label: "All Categories", icon: Leaf },
  { id: "indoor", label: "Indoor Plants", icon: Home },
  { id: "outdoor", label: "Outdoor Plants", icon: TreePine },
  { id: "succulents", label: "Succulents & Cactus", icon: Flower2 },
  { id: "aromatic", label: "Aromatic & Medicinal", icon: Sparkles },
  { id: "fruit", label: "Fruit & Vegetable", icon: Apple },
  { id: "rare", label: "Rare & Exotic", icon: Star },
  { id: "seeds", label: "Seeds & Bulbs", icon: Package },
  { id: "soil", label: "Soil & Fertilizers", icon: Shovel },
  { id: "pots", label: "Pots & Planters", icon: Package },
  { id: "tools", label: "Gardening Tools", icon: Shovel },
  { id: "smart", label: "Smart Pots & IoT", icon: Cpu },
];

const Marketplace = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated, logout } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [cart, setCart] = useState<number[]>([]);
  const [plants, setPlants] = useState<any[]>([]);

useEffect(() => {
  fetchPlants();
}, []);

useEffect(() => {
  const fetchFavoritesForUser = async () => {
    if (!isAuthenticated || !user) {
      setFavorites([]);
      return;
    }

    const { data, error } = await supabase
      .from("wishlists")
      .select("plant_id")
      .eq("user_id", user.id);

    if (!error && data) {
      setFavorites(data.map((d: any) => d.plant_id));
    }
  };

  fetchFavoritesForUser();
}, [isAuthenticated, user]);


  const toggleFavorite = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || !user) {
      navigate('/auth');
      return;
    }

    const isFav = favorites.includes(id);

    try {
      if (isFav) {
        const { error } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('plant_id', id.toString());

        if (!error) {
          setFavorites(prev => prev.filter(f => f !== id));
          toast({ title: 'Removed from favorites', description: 'Plant removed from your favorites' });
        }
      } else {
        const { error } = await supabase
          .from('wishlists')
          .insert([{ user_id: user.id, plant_id: id.toString() }]);

        if (!error) {
          setFavorites(prev => [...prev, id]);
          toast({ title: 'Added to favorites', description: 'Plant added to your favorites' });
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'Unable to update favorites', });
    }
  };

  const addToCart = (id: number, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cart.includes(id)) {
      setCart(prev => [...prev, id]);
      toast({
        title: "Added to cart",
        description: `${name} has been added to your cart`,
      });
    }
  };

  const handleContactSeller = (sellerName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/chat', { state: { seller: sellerName } });
  };

  const handleBuyNow = (plant: typeof plants[0], e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/plant/${plant.id}`);
  };

  const filteredPlants = plants.filter(plant => {
    const matchesSearch = plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         plant.seller.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === "all" || plant.category === category;
    const matchesDifficulty = difficulty === "all" || plant.difficulty === difficulty;
    let matchesPrice = true;
    if (priceRange === "under25") matchesPrice = plant.price < 25;
    else if (priceRange === "25to50") matchesPrice = plant.price >= 25 && plant.price <= 50;
    else if (priceRange === "50to100") matchesPrice = plant.price > 50 && plant.price <= 100;
    else if (priceRange === "over100") matchesPrice = plant.price > 100;
    return matchesSearch && matchesCategory && matchesDifficulty && matchesPrice;
  });

const fetchPlants = async () => {

  const { data, error } = await supabase
    .from("plants")
    .select("*");

  console.log("Plants from DB:", data);

  if (!error && data) {

    const formatted = data.map((p: any) => {
  console.log("Image URL:", p.image_url);

  return {
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    difficulty: p.difficulty,
    location: p.location,
    seller: "Plant Seller",
    sellerVerified: true,
    image_url: p.image_url,
    inStock: p.in_stock,
    rating: 4.5,
    reviews: 10
  };
});

    setPlants(formatted);
  }
};

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:block">
                Nabtati
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/dashboard/buyer')}>
                <Heart className="w-5 h-5" />
                {favorites.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {favorites.length}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/chat')}>
                <MessageCircle className="w-5 h-5" />
              </Button>
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate('/profile')} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">{user?.fullName ? user.fullName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : 'ME'}</span>
                  </button>
                  <Button variant="outline" size="sm" onClick={async () => { await logout(); navigate('/'); }}>
                    Logout
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                  <User className="w-4 h-4 mr-2" />
                  Log In
                </Button>
              )}
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all duration-200 ${
                  category === cat.id
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search plants, sellers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Easy">Easy Care</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Expert</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="under25">Under 25 DA</SelectItem>
                  <SelectItem value="25to50">25 - 50 DA</SelectItem>
                  <SelectItem value="50to100">50 - 100 DA</SelectItem>
                  <SelectItem value="over100">Over 100 DA</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {category === "all" ? "All Products" : categories.find(c => c.id === category)?.label}
            </h1>
            <p className="text-muted-foreground">{filteredPlants.length} items available</p>
          </div>
        </div>

        {/* Plants Grid */}
        <div className={viewMode === "grid" 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
          : "flex flex-col gap-4"
        }>
          {filteredPlants.map((plant) => (
            <Link
              key={plant.id}
              to={`/plant/${plant.id}`}
              className={`group bg-card rounded-2xl border border-border overflow-hidden shadow-soft hover:shadow-elevated transition-all duration-300 ${
                viewMode === "list" ? "flex" : ""
              }`}
            >
              {/* Image */}
              <div className={`relative overflow-hidden ${viewMode === "list" ? "w-48 flex-shrink-0" : "aspect-square"}`}>
                <img
                  src={plant.image_url}
                  alt={plant.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {!plant.inStock && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <span className="text-muted-foreground font-medium">Out of Stock</span>
                  </div>
                )}
                <button
                  onClick={(e) => toggleFavorite(plant.id, e)}
                  className="absolute top-3 right-3 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
                >
                  <Heart className={`w-5 h-5 transition-colors ${favorites.includes(plant.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                </button>
                <div className="absolute top-3 left-3 flex flex-col gap-1">
                  <span className="px-2 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium">
                    {plant.difficulty}
                  </span>
                  {plant.sellerVerified && (
                    <span className="px-2 py-1 rounded-full bg-success/90 text-success-foreground text-xs font-medium flex items-center gap-1">
                      ✓ Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4 flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {plant.name}
                  </h3>
                  <span className="text-lg font-bold text-primary">{plant.price} DA</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{plant.seller}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {plant.rating}
                  </span>
                  <span>({plant.reviews} reviews)</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                  <MapPin className="w-4 h-4" />
                  {plant.location}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="hero" 
                    className="flex-1"
                    onClick={(e) => handleBuyNow(plant, e)}
                  >
                    Buy Now
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => addToCart(plant.id, plant.name, e)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => handleContactSeller(plant.seller, e)}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredPlants.length === 0 && (
          <div className="text-center py-16">
            <Leaf className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No products found</h2>
            <p className="text-muted-foreground mb-4">Try adjusting your search or filters</p>
            <Button variant="outline" onClick={() => { setCategory("all"); setSearchQuery(""); setDifficulty("all"); setPriceRange("all"); }}>
              Clear all filters
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Marketplace;