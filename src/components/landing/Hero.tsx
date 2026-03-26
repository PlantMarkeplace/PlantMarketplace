import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Leaf, Cpu, BookOpen } from "lucide-react";

const Hero = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden bg-hero-gradient pt-16"
    >
      {/* Plants Background Image - High Quality */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1470058869958-2a77ade41c02?w=1920&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

     {/* Gradient Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-background/30 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/20 pointer-events-none" />

      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-secondary/40 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-secondary/30 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Text Content */}
          <div className="text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-secondary text-secondary-foreground text-sm font-medium mb-8 animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Smart Plant Marketplace
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground mb-6 animate-fade-in-up delay-100">
              The{" "}
              <span className="text-gradient">Intelligent</span>
              <br />
              Plant Platform
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 animate-fade-in-up delay-200">
              Innovative digital platform integrating E-commerce, Artificial
              Intelligence, and Internet of Things to revolutionize the plant
              market experience.
            </p>

            {/* CTA Buttons - Horizontal alignment */}
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-12 animate-fade-in-up delay-300">
              <Button variant="hero" size="xl" asChild>
                <Link to="/marketplace">
                  Explore Plants
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="heroOutline" size="xl" asChild>
                <Link to="/auth?mode=signup&role=seller">
                  Sell Your Plants
                </Link>
              </Button>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-start gap-4 animate-fade-in-up delay-400">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card shadow-soft border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  Plant E-commerce
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card shadow-soft border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  AI & IoT Integrated
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card shadow-soft border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  Expert Guidance
                </span>
              </div>
            </div>
          </div>

          
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

export default Hero;
