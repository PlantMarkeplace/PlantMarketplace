import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CalendarIcon, Video, MapPin, Star, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const BookConsultation = () => {
  const { expertId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [expert, setExpert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [consultationType, setConsultationType] = useState<"online" | "onsite">("online");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [description, setDescription] = useState("");

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00",
  ];

  useEffect(() => {
    if (expertId) fetchExpert();
  }, [expertId]);

  const fetchExpert = async () => {
    const { data } = await supabase
      .from("experts")
      .select("*")
      .eq("id", expertId)
      .single();

    if (data) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", data.user_id)
        .single();
      setExpert({ ...data, profile });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !user) {
      toast({ title: "Please log in", description: "You need to be logged in to book a consultation", variant: "destructive" });
      navigate("/auth");
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast({ title: "Missing details", description: "Please select a date and time", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const price = consultationType === "online"
      ? expert.consultation_price_online
      : expert.consultation_price_onsite;

    const { error } = await supabase.from("consultations").insert({
      client_id: user.id,
      expert_id: expert.id,
      consultation_type: consultationType,
      scheduled_date: format(selectedDate, "yyyy-MM-dd"),
      scheduled_time: selectedTime,
      description,
      price,
    });

    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Consultation Requested!", description: "The expert will review your request shortly." });
      navigate("/dashboard/buyer");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading expert...</div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Expert not found</p>
          <Button asChild><Link to="/experts">Browse Experts</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/experts" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Experts
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Expert Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
              <div className="flex flex-col items-center text-center mb-4">
                <Avatar className="h-20 w-20 mb-3 border-2 border-primary/20">
                  <AvatarImage src={expert.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {expert.profile?.full_name?.slice(0, 2).toUpperCase() || "EX"}
                  </AvatarFallback>
                </Avatar>
                <h2 className="font-semibold text-foreground text-lg">{expert.profile?.full_name}</h2>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                  {expert.rating || "New"} · {expert.total_consultations} sessions
                </div>
                {expert.is_verified && <Badge variant="secondary" className="mt-2">Verified Expert</Badge>}
              </div>

              <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                {expert.specialization?.map((s: string) => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Online</span>
                  <span className="font-medium text-foreground">${expert.consultation_price_online}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> On-Site</span>
                  <span className="font-medium text-foreground">${expert.consultation_price_onsite}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="lg:col-span-2">
            <h1 className="text-2xl font-bold text-foreground mb-6">Book a Consultation</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type Selection */}
              <div>
                <Label className="mb-3 block">Consultation Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConsultationType("online")}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      consultationType === "online" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Video className={`w-6 h-6 mx-auto mb-2 ${consultationType === "online" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-medium text-sm">Online</p>
                    <p className="text-xs text-muted-foreground mt-1">${expert.consultation_price_online}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsultationType("onsite")}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      consultationType === "onsite" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <MapPin className={`w-6 h-6 mx-auto mb-2 ${consultationType === "onsite" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-medium text-sm">On-Site</p>
                    <p className="text-xs text-muted-foreground mt-1">${expert.consultation_price_onsite}</p>
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <Label className="mb-3 block">Select Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time */}
              <div>
                <Label className="mb-3 block">Select Time</Label>
                <div className="grid grid-cols-5 gap-2">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        selectedTime === time
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="mb-3 block">Describe Your Issue</Label>
                <Textarea
                  id="description"
                  placeholder="Tell the expert about your plant issue, what you've tried, and what help you need..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-xl p-4 border border-border">
                <h3 className="font-medium text-foreground mb-2">Booking Summary</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Expert: {expert.profile?.full_name}</p>
                  <p>Type: {consultationType === "online" ? "Online Video Call" : "On-Site Visit"}</p>
                  {selectedDate && <p>Date: {format(selectedDate, "PPP")}</p>}
                  {selectedTime && <p>Time: {selectedTime}</p>}
                  <p className="text-foreground font-semibold mt-2">
                    Total: ${consultationType === "online" ? expert.consultation_price_online : expert.consultation_price_onsite}
                  </p>
                </div>
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Request Consultation"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookConsultation;
