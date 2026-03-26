import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, MessageCircle, Star, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type Plant = {
  id: number;
  name: string;
  price: number;
  category: string;
  difficulty: string;
  location: string;
  rating: number;
  reviews: number;
  image: string;
  seller: string;
  sellerVerified: boolean;
  inStock: boolean;
};

type PlantCardProps = {
  plant: Plant;
  favorites: number[];
  cart: number[];
  onToggleFavorite: (id: number, e: React.MouseEvent) => void;
  onAddToCart: (id: number, name: string, e: React.MouseEvent) => void;
  onContactSeller: (sellerName: string, e: React.MouseEvent) => void;
  variant?: "default" | "compact";
};

const PlantCard = ({
  plant,
  favorites,
  cart,
  onToggleFavorite,
  onAddToCart,
  onContactSeller,
  variant = "default",
}: PlantCardProps) => {
  const navigate = useNavigate();

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/plant/${plant.id}`);
  };

  if (variant === "compact") {
    return (
      <Link
        to={`/plant/${plant.id}`}
        className="group bg-card rounded-xl border border-border overflow-hidden shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
      >
        <div className="relative aspect-square overflow-hidden">
          <img
            src={plant.image}
            alt={plant.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {!plant.inStock && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <span className="text-muted-foreground font-medium text-sm">Out of Stock</span>
            </div>
          )}
          <button
            onClick={(e) => onToggleFavorite(plant.id, e)}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                favorites.includes(plant.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
              }`}
            />
          </button>
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium">
              {plant.difficulty}
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div className="p-3">
          <h3 className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
            {plant.name}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-primary font-bold">${plant.price}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {plant.rating}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/plant/${plant.id}`}
      className="group bg-card rounded-2xl border border-border overflow-hidden shadow-soft hover:shadow-elevated transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={plant.image}
          alt={plant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {!plant.inStock && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <span className="text-muted-foreground font-medium">Out of Stock</span>
          </div>
        )}
        <button
          onClick={(e) => onToggleFavorite(plant.id, e)}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              favorites.includes(plant.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
            }`}
          />
        </button>
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium">
            {plant.difficulty}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {plant.name}
          </h3>
          <span className="text-lg font-bold text-primary">${plant.price}</span>
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
          <Button size="sm" variant="hero" className="flex-1" onClick={handleBuyNow}>
            Buy Now
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => onAddToCart(plant.id, plant.name, e)}
            disabled={cart.includes(plant.id)}
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={(e) => onContactSeller(plant.seller, e)}>
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Link>
  );
};

export default PlantCard;
