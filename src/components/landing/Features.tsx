import {
  Bot,
  Cpu,
  BookOpen,
  ShoppingCart,
  Users,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: ShoppingCart,
    title: "Plant Marketplace",
    description:
      "Specialized e-commerce platform for buying and selling plants with advanced filters and personalized recommendations.",
    color: "primary",
  },
  {
    icon: Bot,
    title: "AI Chatbot Assistant",
    description:
      "Intelligent assistant offering personalized advice, environmental analysis, and continuous support for your plants.",
    color: "primary",
  },
  {
  icon: Cpu,
  title: "IoT Dashboard",
  description:
    "Real-time monitoring with sensors (humidity, temperature, light, pH) and smart alerts for each plant.",
  color: "primary",
},
  {
  icon: BookOpen,
  title: "Expert Guidance",
  description:
    "Connect with plant experts for professional advice, personalized recommendations, and consultation services online.",
  color: "primary",
  },
  {
  icon: Users,
  title: "Role-Based Dashboards",
  description:
    "Dedicated dashboards for buyers, sellers, and experts with personalized tools and secure access control.",
  color: "primary",
},
  {
  icon: TrendingUp,
  title: "Order & Sales Management",
  description:
    "Track orders, manage plant listings, and monitor sales activity through dynamic seller dashboards.",
  color: "primary",
},
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Cutting-Edge{" "}
            <span className="text-gradient">Technologies</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            An innovative fusion of e-commerce, artificial intelligence, and
            internet of things for a revolutionary plant experience.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative bg-card rounded-2xl p-8 border border-border shadow-soft hover:shadow-elevated transition-all duration-500 hover:-translate-y-2"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Gradient Overlay on Hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Content */}
              <div className="relative z-10">
                {/* Icon Container */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:shadow-glow transition-all duration-300">
                  <feature.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Decorative Elements */}
              <div className="absolute bottom-4 right-4 w-20 h-20 rounded-full bg-secondary/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
