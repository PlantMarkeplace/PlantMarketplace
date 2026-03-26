import { Stethoscope, Video, MapPin, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const services = [
  {
    icon: Video,
    title: "Online Consultation",
    description: "Video call with certified plant experts from anywhere",
  },
  {
    icon: MapPin,
    title: "On-Site Visit",
    description: "Expert visits your location for hands-on diagnosis",
  },
];

const specializations = [
  "Indoor Plants",
  "Disease Treatment",
  "Smart Irrigation",
  "Garden Design",
  "Soil Analysis",
  "Pest Control",
  "Greenhouse Management",
  "Organic Farming",
];

const ExpertConsultation = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground text-sm font-medium mb-4">
              <Stethoscope className="w-4 h-4" />
              Plant Expert Consultation
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Get Advice from <span className="text-gradient">Certified Experts</span>
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Connect with plant professionals for personalized consultations.
              Whether online or on-site, our experts help diagnose issues,
              optimize care, and transform your green spaces.
            </p>

            {/* Service Cards */}
            <div className="grid gap-4 mb-8">
              {services.map((service) => (
                <div
                  key={service.title}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <service.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{service.title}</p>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Button variant="hero" size="lg" asChild>
                <Link to="/experts">
                  Browse Experts
                  <ArrowRight className="w<-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/auth?mode=signup&role=expert">
                  Become an Expert
                </Link>
              </Button>
            </div>
          </div>

          {/* Right - Specializations & Stats */}
          <div className="bg-card rounded-3xl border border-border p-8 shadow-elevated">
            <h3 className="text-xl font-semibold text-foreground mb-6">Expert Specializations</h3>
            <div className="flex flex-wrap gap-2 mb-8">
              {specializations.map((spec) => (
                <span
                  key={spec}
                  className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors cursor-default"
                >
                  {spec}
                </span>
              ))}
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-4">
How It Works
</h3>

<div className="grid gap-3 pt-6 border-t border-border">
  {[
    "1. Browse and choose your expert",
    "2. Select online or on-site consultation",
    "3. Book your preferred date & time",
    "4. Receive professional advice and follow-up support",
  ].map((step, i) => (
    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Check className="w-4 h-4 text-primary" />
      </div>
      <span className="text-foreground text-sm">{step}</span>
    </div>
  ))}
</div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default ExpertConsultation;
