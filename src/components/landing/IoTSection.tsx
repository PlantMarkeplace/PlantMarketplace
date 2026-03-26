import { Droplets, Sun, Thermometer, Wind } from "lucide-react";

const sensors = [
  {
    icon: Droplets,
    label: "Humidity",
    value: "68%",
    status: "optimal",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Thermometer,
    label: "Temperature",
    value: "24°C",
    status: "optimal",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: Sun,
    label: "Light",
    value: "850 lux",
    status: "good",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: Wind,
    label: "Soil pH",
    value: "6.5",
    status: "optimal",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
];

const IoTSection = () => {
  return (
    <section id="iot" className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground text-sm font-medium mb-4">
              Internet of Things
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Smart Plant{" "}
              <span className="text-gradient">Monitoring</span>
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Connect your plants to IoT sensors for real-time health tracking.
              Receive personalized alerts and care advice based on environmental
              data.
            </p>

            {/* Feature List */}
            <ul className="space-y-4 mb-8">
              {[
                "Industrial-grade precision sensors",
                "Real-time intelligent alerts",
                "Historical data and analysis",
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right - IoT Dashboard Preview */}
          <div className="relative">
            {/* Main Dashboard Card */}
            <div className="bg-card rounded-3xl border border-border shadow-elevated p-6 relative z-10">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    IoT Dashboard
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Monstera Deliciosa - Living Room
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm text-emerald-600 font-medium">
                    Online
                  </span>
                </div>
              </div>

              {/* Sensor Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {sensors.map((sensor) => (
                  <div
                    key={sensor.label}
                    className="bg-muted/50 rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-colors duration-300"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-10 h-10 rounded-lg ${sensor.bgColor} flex items-center justify-center`}
                      >
                        <sensor.icon className={`w-5 h-5 ${sensor.color}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {sensor.label}
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {sensor.value}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-emerald-600 capitalize">
                        {sensor.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Decorative Background */}
            <div className="absolute -top-4 -right-4 w-full h-full bg-secondary/30 rounded-3xl -z-10" />
            <div className="absolute -bottom-4 -left-4 w-full h-full bg-primary/5 rounded-3xl -z-20" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default IoTSection;
