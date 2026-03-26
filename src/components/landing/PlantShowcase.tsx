import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlantCard from "@/components/PlantCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PlantShowcase = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [cart, setCart] = useState<number[]>([]);

  const [showcasePlants, setShowcasePlants] = useState<any[]>([]);

  const fetchPlants = async () => {
  const { data, error } = await supabase
  .from("plants")
  .select(`
    *,
    profiles!plants_seller_user_fkey(full_name, location)
  `)
  .limit(6);

  if (error) {
    console.error(error);
    return;
  }

  if (data) {
    const formatted = data.map((p: any) => {
  console.log(p);

  return {
  id: p.id,
  name: p.name,
  price: p.price,
  category: p.category,
  difficulty: p.difficulty,
  location: p.profiles?.location || p.location,
  seller: p.profiles?.full_name || "Unknown Seller",
  sellerVerified: true,
  image: p.image_url,
  inStock: p.in_stock,
  rating: 4.5,
  reviews: 10,
};
});

    setShowcasePlants(formatted);
  }
  };

  useEffect(() => {
  fetchPlants();
  }, []);

  const toggleFavorite = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const newFavorites = prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id];
      toast({
        title: prev.includes(id) ? "Removed from favorites" : "Added to favorites",
        description: prev.includes(id)
          ? "Plant removed from your favorites"
          : "Plant added to your favorites",
      });
      return newFavorites;
    });
  };

  const addToCart = (id: number, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cart.includes(id)) {
      setCart((prev) => [...prev, id]);
      toast({
        title: "Added to cart",
        description: `${name} has been added to your cart`,
      });
    }
  };

  const handleContactSeller = (sellerName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/chat", { state: { seller: sellerName } });
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-secondary text-secondary-foreground text-sm font-medium mb-4">
            <Leaf className="w-4 h-4" />
            Featured Plants
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Discover Our <span className="text-gradient">Green Collection</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our curated selection of beautiful, healthy plants perfect for any space.
            Click on any plant to view details, add to cart, or wishlist.
          </p>
        </div>

        {/* Plants Grid - Fully Interactive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {showcasePlants.map((plant, index) => (
            <div
              key={plant.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <PlantCard
                plant={plant}
                favorites={favorites}
                cart={cart}
                onToggleFavorite={toggleFavorite}
                onAddToCart={addToCart}
                onContactSeller={handleContactSeller}
              />
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Button variant="hero" size="lg" onClick={() => navigate("/marketplace")}>
            View All Plants
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PlantShowcase;
