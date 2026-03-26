import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Calendar, Clock, DollarSign, CheckCircle,
  XCircle, Video, MapPin, User, TrendingUp
} from "lucide-react";

const ExpertDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expertProfile, setExpertProfile] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    // Get expert profile
    const { data: expert } = await supabase
      .from("experts")
      .select("*")
      .eq("user_id", user!.id)
      .single();

    if (expert) {
      setExpertProfile(expert);

      // Get consultations
      const { data: consults } = await supabase
        .from("consultations")
        .select("*")
        .eq("expert_id", expert.id)
        .order("created_at", { ascending: false });

      if (consults) {
        // Enrich with client profiles
        const clientIds = [...new Set(consults.map((c: any) => c.client_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", clientIds);

        const enriched = consults.map((c: any) => ({
          ...c,
          client: profiles?.find((p: any) => p.user_id === c.client_id),
        }));
        setConsultations(enriched);
      }
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("consultations")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `Consultation ${status}` });
      fetchData();
    }
  };

  const pending = consultations.filter((c) => c.status === "pending");
  const accepted = consultations.filter((c) => c.status === "accepted");
  const completed = consultations.filter((c) => c.status === "completed");
  const totalEarnings = completed.reduce((sum, c) => sum + (c.price || 0), 0);

  const [activeTab, setActiveTab] = useState<string>("pending");

  const statusColors: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    accepted: "bg-primary/10 text-primary border-primary/20",
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
    cancelled: "bg-muted text-muted-foreground border-border",
  };

  const ConsultationCard = ({ consultation }: { consultation: any }) => (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-soft transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{consultation.client?.full_name || "Client"}</p>
            <p className="text-xs text-muted-foreground">
              {consultation.consultation_type === "online" ? "Online" : "On-Site"} · ${consultation.price}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={statusColors[consultation.status] || ""}>
          {consultation.status}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {consultation.scheduled_date}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {consultation.scheduled_time}
        </span>
        {consultation.consultation_type === "online" ? (
          <Video className="w-3.5 h-3.5" />
        ) : (
          <MapPin className="w-3.5 h-3.5" />
        )}
      </div>

      {consultation.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{consultation.description}</p>
      )}

      {consultation.status === "pending" && (
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={() => updateStatus(consultation.id, "accepted")}>
            <CheckCircle className="w-4 h-4 mr-1" /> Accept
          </Button>
          <Button size="sm" variant="outline" onClick={() => updateStatus(consultation.id, "rejected")}>
            <XCircle className="w-4 h-4 mr-1" /> Reject
          </Button>
        </div>
      )}
      {consultation.status === "accepted" && (
        <Button size="sm" variant="default" onClick={() => updateStatus(consultation.id, "completed")}>
          <CheckCircle className="w-4 h-4 mr-1" /> Mark Completed
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">E</span>
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:block">Nabtati</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Expert</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center">
                <span className="text-primary font-semibold">EX</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-semibold">EX</span>
                </div>
                <h2 className="font-semibold text-foreground">Expert Panel</h2>
                <p className="text-sm text-muted-foreground">Manage consultations</p>
              </div>
              <nav className="space-y-1">
                <button onClick={() => setActiveTab('pending')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${activeTab === 'pending' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <Calendar className="w-5 h-5" /> Pending
                </button>
                <button onClick={() => setActiveTab('upcoming')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${activeTab === 'upcoming' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <Clock className="w-5 h-5" /> Upcoming
                </button>
                <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${activeTab === 'history' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <CheckCircle className="w-5 h-5" /> History
                </button>
                <button onClick={() => setActiveTab('all')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <TrendingUp className="w-5 h-5" /> All
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">Expert Dashboard</h1>
              <p className="text-muted-foreground mb-4">Manage your consultations and earnings</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{pending.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Upcoming</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{accepted.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{completed.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Earnings</span>
            </div>
            <p className="text-2xl font-bold text-foreground">${totalEarnings}</p>
          </div>
        </div>

        {/* Tabs (controlled by sidebar) */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
          <TabsList className="mb-6">
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({accepted.length})</TabsTrigger>
            <TabsTrigger value="history">History ({completed.length})</TabsTrigger>
            <TabsTrigger value="all">All ({consultations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="grid gap-4">
              {pending.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No pending consultations</p>
              ) : pending.map((c) => <ConsultationCard key={c.id} consultation={c} />)}
            </div>
          </TabsContent>

          <TabsContent value="upcoming">
            <div className="grid gap-4">
              {accepted.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No upcoming consultations</p>
              ) : accepted.map((c) => <ConsultationCard key={c.id} consultation={c} />)}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="grid gap-4">
              {completed.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No completed consultations yet</p>
              ) : completed.map((c) => <ConsultationCard key={c.id} consultation={c} />)}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-4">
              {consultations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No consultations yet</p>
              ) : consultations.map((c) => <ConsultationCard key={c.id} consultation={c} />)}
            </div>
          </TabsContent>
        </Tabs>
        </main>
      </div>
    </div>
  </div>
  );
};

export default ExpertDashboard;
