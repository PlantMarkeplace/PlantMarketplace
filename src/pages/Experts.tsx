import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Search, Star, Video, MapPin, Clock, Filter } from "lucide-react";

interface Expert {
  id: string;
  user_id: string;
  specialization: string[];
  years_of_experience: number;
  certifications: string[];
  consultation_price_online: number;
  consultation_price_onsite: number;
  location: string | null;
  bio: string | null;
  is_verified: boolean;
  rating: number;
  total_consultations: number;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

const Experts = () => {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);

  const specializations = [
    "Indoor Plants", "Disease Treatment", "Smart Irrigation",
    "Garden Design", "Soil Analysis", "Pest Control",
    "Greenhouse Management", "Organic Farming",
  ];

  useEffect(() => {
    fetchExperts();
  }, []);

  const fetchExperts = async () => {
    const { data, error } = await supabase
      .from("experts")
      .select("*");

    if (data && !error) {
      // Fetch profiles for each expert
      const expertIds = data.map((e: any) => e.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", expertIds);

      const enriched = data.map((expert: any) => ({
        ...expert,
        profile: profiles?.find((p: any) => p.user_id === expert.user_id),
      }));
      setExperts(enriched);
    }
    setLoading(false);
  };

  const filtered = experts.filter((e) => {
    const matchesSearch = !search ||
      e.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.specialization?.some((s: string) => s.toLowerCase().includes(search.toLowerCase()));
    const matchesSpec = !selectedSpec ||
      e.specialization?.includes(selectedSpec);
    return matchesSearch && matchesSpec;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary/5 border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">🌿 Plant Expert Consultation</h1>
          <p className="text-muted-foreground">Find certified experts for personalized plant care advice</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search experts by name or specialization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Specialization Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedSpec(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedSpec ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          {specializations.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpec(spec === selectedSpec ? null : spec)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedSpec === spec ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {spec}
            </button>
          ))}
        </div>

        {/* Expert Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-2">No experts found</p>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((expert) => (
              <div key={expert.id} className="bg-card rounded-2xl border border-border p-6 hover:shadow-elevated transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/20">
                    <AvatarImage src={expert.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {expert.profile?.full_name?.slice(0, 2).toUpperCase() || "EX"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{expert.profile?.full_name || "Expert"}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                      <span>{expert.rating || "New"}</span>
                      <span>·</span>
                      <span>{expert.total_consultations} consultations</span>
                    </div>
                    {expert.is_verified && (
                      <Badge variant="secondary" className="mt-1 text-xs">Verified</Badge>
                    )}
                  </div>
                </div>

                {expert.bio && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{expert.bio}</p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {expert.specialization?.slice(0, 3).map((spec: string) => (
                    <Badge key={spec} variant="outline" className="text-xs">{spec}</Badge>
                  ))}
                  {expert.specialization?.length > 3 && (
                    <Badge variant="outline" className="text-xs">+{expert.specialization.length - 3}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {expert.years_of_experience}y exp
                  </span>
                  {expert.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {expert.location}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-xl">
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                      <Video className="w-3.5 h-3.5" /> Online
                    </div>
                    <p className="font-semibold text-foreground">${expert.consultation_price_online}</p>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                      <MapPin className="w-3.5 h-3.5" /> On-Site
                    </div>
                    <p className="font-semibold text-foreground">${expert.consultation_price_onsite}</p>
                  </div>
                </div>

                <Button variant="hero" className="w-full" asChild>
                  <Link to={`/experts/${expert.id}/book`}>Book Consultation</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Experts;
