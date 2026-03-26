import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Eye, EyeOff, ArrowLeft, User, Store, Stethoscope, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, UserRole } from "@/contexts/AuthContext";

type AuthMode = "login" | "signup" | "forgot";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, signup, isAuthenticated, user } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [role, setRole] = useState<UserRole>(
    (searchParams.get("role") as UserRole) || "buyer"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    businessName: "",
    specialization: "",
    yearsOfExperience: "",
    certifications: "",
    priceOnline: "",
    priceOnsite: "",
    expertLocation: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const getRoleDashboard = (role?: string) => {
    if (role === "admin") return "/admin";
    if (role === "expert") return "/dashboard/expert";
    if (role === "seller") return "/dashboard/seller";
    return "/dashboard/buyer";
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRoleDashboard(user.role));
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "signup") setMode("signup");
    else if (modeParam === "forgot") setMode("forgot");
    else setMode("login");
    
    const roleParam = searchParams.get("role");
    if (roleParam === "seller") setRole("seller");
    else if (roleParam === "expert") setRole("expert");
  }, [searchParams]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (mode !== "forgot") {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }

    if (mode === "signup") {
      if (!formData.fullName.trim()) {
        newErrors.fullName = "Full name is required";
      } else if (formData.fullName.trim().length < 2) {
        newErrors.fullName = "Please enter your full name";
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }

      if (role === "expert") {
        if (!formData.specialization.trim()) {
          newErrors.specialization = "Specialization is required";
        }
        if (!formData.priceOnline.trim()) {
          newErrors.priceOnline = "Online consultation price is required";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    if (mode === "forgot") {
      // Simulate password reset
      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Email Sent",
          description: "Check your inbox for password reset instructions",
        });
        setMode("login");
      }, 1500);
      return;
    }

    if (mode === "login") {
      const result = await login(formData.email, formData.password);
      setIsLoading(false);
      
      if (result.success) {
        toast({
          title: "Welcome back!",
          description: "Logged in successfully",
        });
        // Wait briefly for auth state to update, then redirect
        const waitForUser = () => {
          return new Promise<string>((resolve) => {
            const check = setInterval(async () => {
              const { data: { session } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
              if (session?.user) {
                clearInterval(check);
                const { data: roleRow } = await (await import("@/integrations/supabase/client")).supabase
                  .from("user_roles")
                  .select("role")
                  .eq("user_id", session.user.id)
                  .single();
                resolve(getRoleDashboard(roleRow?.role));
              }
            }, 200);
            setTimeout(() => { clearInterval(check); resolve("/"); }, 5000);
          });
        };
        const dashboard = await waitForUser();
        navigate(dashboard, { replace: true });
      } else {
        toast({
          title: "Login failed",
          description: result.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } else {
      const result = await signup({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role,
        businessName: formData.businessName,
        specialization: formData.specialization,
        yearsOfExperience: formData.yearsOfExperience,
        certifications: formData.certifications,
        priceOnline: formData.priceOnline,
        priceOnsite: formData.priceOnsite,
        expertLocation: formData.expertLocation,
      });
      setIsLoading(false);
      
      if (result.success) {
        toast({
          title: "Account created!",
          description: `Welcome to Nabtati, ${formData.fullName}!`,
        });
        // For signup, we know the role from the form, redirect immediately
        // Wait for session to be established first
        const waitForSession = () => {
          return new Promise<void>((resolve) => {
            const check = setInterval(async () => {
              const { data: { session } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
              if (session?.user) {
                clearInterval(check);
                resolve();
              }
            }, 200);
            setTimeout(() => { clearInterval(check); resolve(); }, 5000);
          });
        };
        await waitForSession();
        navigate(getRoleDashboard(role), { replace: true });
      } else {
        toast({
          title: "Signup failed",
          description: result.error || "Could not create account",
          variant: "destructive",
        });
      }
    }
  };

  const roles = [
    { id: "buyer", label: "Customer", icon: User, description: "Buy plants for your home" },
    { id: "seller", label: "Seller", icon: Store, description: "Sell your plants" },
    { id: "expert", label: "Expert", icon: Stethoscope, description: "Offer consultations" },
  ];

  if (mode === "forgot") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link 
            to="/auth" 
            onClick={() => setMode("login")}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>

          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Green<span className="text-primary">Connect</span>
            </span>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">Reset Password</h1>
          <p className="text-muted-foreground mb-8">
            Enter your email and we'll send you reset instructions
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`mt-1 ${errors.email ? "border-destructive" : ""}`}
              />
              {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Nabtati
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-muted-foreground">
              {mode === "login" 
                ? "Enter your credentials to access your account" 
                : "Join the Nabtati community today"}
            </p>
          </div>

          {/* Role Selection (Signup only) */}
          {mode === "signup" && (
            <div className="mb-6">
              <Label className="text-sm font-medium mb-3 block">I want to...</Label>
              <div className="grid grid-cols-3 gap-3">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id as UserRole)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                      role === r.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <r.icon className={`w-6 h-6 mx-auto mb-2 ${role === r.id ? "text-primary" : "text-muted-foreground"}`} />
                    <p className={`text-sm font-medium ${role === r.id ? "text-primary" : "text-foreground"}`}>
                      {r.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 hidden sm:block">{r.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={`mt-1 ${errors.fullName ? "border-destructive" : ""}`}
                />
                {errors.fullName && <p className="text-destructive text-sm mt-1">{errors.fullName}</p>}
              </div>
            )}

            {mode === "signup" && role === "expert" && (
              <>
                <div>
                  <Label htmlFor="specialization">Specialization *</Label>
                  <Input
                    id="specialization"
                    type="text"
                    placeholder="e.g. Indoor Plants, Disease Treatment, Smart Irrigation"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className={`mt-1 ${errors.specialization ? "border-destructive" : ""}`}
                  />
                  {errors.specialization && <p className="text-destructive text-sm mt-1">{errors.specialization}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                    <Input
                      id="yearsOfExperience"
                      type="number"
                      min="0"
                      placeholder="5"
                      value={formData.yearsOfExperience}
                      onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="certifications">Certifications</Label>
                    <Input
                      id="certifications"
                      type="text"
                      placeholder="e.g. Horticulture Cert"
                      value={formData.certifications}
                      onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="priceOnline">Online Price ($) *</Label>
                    <Input
                      id="priceOnline"
                      type="number"
                      min="0"
                      placeholder="25"
                      value={formData.priceOnline}
                      onChange={(e) => setFormData({ ...formData, priceOnline: e.target.value })}
                      className={`mt-1 ${errors.priceOnline ? "border-destructive" : ""}`}
                    />
                    {errors.priceOnline && <p className="text-destructive text-sm mt-1">{errors.priceOnline}</p>}
                  </div>
                  <div>
                    <Label htmlFor="priceOnsite">On-Site Price ($)</Label>
                    <Input
                      id="priceOnsite"
                      type="number"
                      min="0"
                      placeholder="50"
                      value={formData.priceOnsite}
                      onChange={(e) => setFormData({ ...formData, priceOnsite: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="expertLocation">Location (for on-site visits)</Label>
                  <Input
                    id="expertLocation"
                    type="text"
                    placeholder="City, Country"
                    value={formData.expertLocation}
                    onChange={(e) => setFormData({ ...formData, expertLocation: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`mt-1 ${errors.email ? "border-destructive" : ""}`}
              />
              {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={errors.password ? "border-destructive" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
            </div>

            {mode === "signup" && (
              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`mt-1 ${errors.confirmPassword ? "border-destructive" : ""}`}
                />
                {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

            {mode === "login" && (
              <div className="flex justify-end">
                <button 
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
            </Button>
          </form>

          {/* Features for signup */}
          {mode === "signup" && (
            <div className="mt-6 p-4 bg-muted rounded-xl">
              <p className="text-sm font-medium text-foreground mb-2">What you get:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  Access to thousands of plants
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  Direct chat with sellers
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  AI-powered plant care assistant
                </li>
              </ul>
            </div>
          )}

          {/* Toggle Mode */}
          <p className="text-center mt-6 text-muted-foreground">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-primary font-medium hover:underline"
            >
              {mode === "login" ? "Sign Up" : "Log In"}
            </button>
          </p>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "30px 30px",
            }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-primary-foreground">
            <Leaf className="w-24 h-24 mx-auto mb-8 opacity-80" />
            <h2 className="text-4xl font-bold mb-4">
              {mode === "login" ? "Welcome Back!" : "Join Nabtati"}
            </h2>
            <p className="text-xl opacity-80 max-w-md">
              {mode === "login" 
                ? "Access your dashboard, manage your plants, and connect with the community."
                : "Start buying or selling plants today with our smart platform."}
            </p>           
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;