import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import DashboardNavbar from "@/components/DashboardNavbar";
import WebsiteCard from "@/components/WebsiteCard";
import PlansSection from "@/components/PlansSection";
import OnboardingFlow from "@/components/OnboardingFlow";
import RefreshSubscriptionButton from "@/components/RefreshSubscriptionButton";
import PlanStatusBadge from "@/components/PlanStatusBadge";
import { usePlan } from "@/contexts/PlanContext";
import { checkWebsiteLimit } from "@/utils/planRestrictions";

export type Website = {
  id: string;
  name: string;
  template: string | null;
  created_at: string;
  published: boolean;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan_id: string | null;
  is_subscribed: boolean;
  subscription_type: string | null;
  subscription_end: string | null;
};

const Dashboard = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newWebsiteId, setNewWebsiteId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { planName, restrictions } = usePlan();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setIsAuthenticated(true);
      fetchUserData();
      fetchWebsites();
    };

    // Set up auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      
      if (!session && event === 'SIGNED_OUT') {
        navigate("/auth");
      }
    });

    // Then check current auth state
    checkAuth();
    
    // Clean up subscription
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("No authenticated user found");
        return;
      }
      
      console.log("Fetching profile for user:", user.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }
      
      console.log("Profile data received:", data);
      setProfile(data);
    } catch (error) {
      console.error("Error in fetchUserData:", error);
    }
  };

  const fetchWebsites = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        toast.error("Failed to fetch websites");
        console.error("Error fetching websites:", error);
        return;
      }
      
      setWebsites(data || []);
    } catch (error) {
      console.error("Error in fetchWebsites:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewWebsite = async () => {
    try {
      // Check if we've reached the website limit before creating a new one
      if (restrictions) {
        const belowLimit = await checkWebsiteLimit(websites.length);
        if (!belowLimit) {
          // The checkWebsiteLimit function will already show a toast
          return;
        }
      }
      
      const name = `My Store ${websites.length + 1}`;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from("websites")
        .insert([
          { name, owner_id: user.id }
        ])
        .select()
        .single();
      
      if (error) {
        toast.error("Failed to create new website");
        console.error("Error creating website:", error);
        return;
      }
      
      toast.success("New website created");
      setNewWebsiteId(data.id);
    } catch (error) {
      console.error("Error in createNewWebsite:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const completeOnboarding = () => {
    setNewWebsiteId(null);
    fetchWebsites();
  };

  // Check if user has a subscription or not
  const hasSubscription = profile?.is_subscribed;

  // If onboarding is in progress, show onboarding flow
  if (newWebsiteId) {
    return (
      <OnboardingFlow 
        websiteId={newWebsiteId} 
        onComplete={completeOnboarding} 
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to access your dashboard</h1>
          <Button onClick={() => navigate("/auth")} className="bg-gradient-to-r from-indigo-600 to-purple-600">
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar profile={profile} />
      
      <main className="container mx-auto px-4 py-8">
        {!hasSubscription ? (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg shadow-md flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold mb-2">Choose a Plan to Get Started</h2>
                <p className="mb-0">Select a subscription plan to start creating your e-commerce websites.</p>
              </div>
              <RefreshSubscriptionButton 
                onRefresh={fetchUserData}
                variant="outline" 
                className="bg-white text-indigo-600 hover:bg-gray-100 border-none"
              />
            </div>
            
            <PlansSection profile={profile} onPlanSelected={fetchUserData} />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">My Websites</h1>
                <PlanStatusBadge />
              </div>
              <div className="flex space-x-4">
                <RefreshSubscriptionButton onRefresh={fetchUserData} />
                <Button 
                  onClick={createNewWebsite}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600"
                  disabled={restrictions && websites.length >= restrictions.maxWebsites}
                >
                  <Plus className="mr-2 h-4 w-4" /> New Website
                </Button>
              </div>
            </div>

            {/* Website limit warning */}
            {restrictions && websites.length > 0 && websites.length >= (restrictions.maxWebsites * 0.8) && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-6">
                <p className="text-amber-800 text-sm">
                  {websites.length >= restrictions.maxWebsites ? (
                    <>You've reached your plan's limit of {restrictions.maxWebsites} websites. Upgrade to add more.</>
                  ) : (
                    <>You're approaching your plan's limit of {restrictions.maxWebsites} websites ({websites.length}/{restrictions.maxWebsites}).</>
                  )}
                </p>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i}
                    className="bg-white p-6 rounded-lg shadow-md border border-gray-100 h-48 animate-pulse"
                  />
                ))}
              </div>
            ) : websites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {websites.map((website) => (
                  <WebsiteCard 
                    key={website.id}
                    website={website}
                    onWebsiteUpdate={fetchWebsites}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-xl font-medium text-gray-700 mb-2">No websites yet</h3>
                <p className="text-gray-500 mb-6">Create your first website to get started</p>
                <Button 
                  onClick={createNewWebsite}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600"
                >
                  <Plus className="mr-2 h-4 w-4" /> Create Website
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
