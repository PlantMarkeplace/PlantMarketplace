import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const CTA = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return null;

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="relative bg-primary rounded-3xl p-12 md:p-16 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: "30px 30px",
              }}
            />
          </div>

          {/* Floating Elements */}
          <div className="absolute top-8 right-8 opacity-20">
            <Leaf className="w-24 h-24 text-primary-foreground animate-leaf" />
          </div>
          <div className="absolute bottom-8 left-8 opacity-20">
            <Sparkles className="w-16 h-16 text-primary-foreground animate-pulse-soft" />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
              Join the Plant Revolution
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
              Sign up now to discover a new way to buy, sell, and care for your
              plants through technological innovation.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="xl"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-elevated hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                asChild
              >
                <Link to="/auth?mode=signup">
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                size="xl"
                variant="outline"
                className="border-2 border-primary-foreground/30 text-primary-foreground bg-transparent hover:bg-primary-foreground/10 hover:border-primary-foreground/50 transition-all duration-300"
                asChild
              >
                <Link to="/marketplace">
                  Browse Plants
                </Link>
              </Button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
