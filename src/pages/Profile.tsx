import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DashboardNavbar from "@/components/DashboardNavbar";
import { Profile as ProfileType } from "@/pages/Dashboard";
import PlanLimitsInfo from "@/components/PlanLimitsInfo";
import PlanStatusBadge from "@/components/PlanStatusBadge";
import { getUserPlan, openCustomerPortal, getUserPlanSimplified } from "@/api/websites";
import SimplifiedSubscriptionDisplay from "@/components/SimplifiedSubscriptionDisplay";

const profileSchema = z.object({
  full_name: z.string().min(2, { message: "Name must be at least 2 characters" }).optional(),
  email: z.string().email({ message: "Please enter a valid email address" }).optional(),
});

const Profile = () => {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [websiteCount, setWebsiteCount] = useState(0);
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    planName: string | null;
    subscriptionEnd: string | null;
    isActive: boolean;
  }>({
    planName: null,
    subscriptionEnd: null,
    isActive: false
  });
  const [isManageLoading, setIsManageLoading] = useState(false);
  const isInitialLoadDone = useRef(false);
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      email: "",
    },
  });

  // Effect for initial data loading - only runs once
  useEffect(() => {
    const loadData = async () => {
      if (isInitialLoadDone.current) return;
      
      try {
        setIsLoading(true);
        isInitialLoadDone.current = true;
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast.error("Please log in to view your profile");
          navigate("/auth");
          return;
        }
        
        // Load all data in parallel
        await Promise.all([
          fetchUserData(),
          fetchStatsData(),
          fetchSubscriptionInfo()
        ]);
      } catch (error) {
        console.error("Initial data load error:", error);
        toast.error("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const fetchSubscriptionInfo = async () => {
    try {
      setSubscriptionLoading(true);
      const data = await getUserPlanSimplified();
      setSubscriptionInfo(data);
      return data;
    } catch (error) {
      console.error("Error fetching subscription info:", error);
      return {
        planName: null,
        subscriptionEnd: null,
        isActive: false
      };
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      setProfile(data);
      form.reset({
        full_name: data.full_name || "",
        email: user.email || "",
      });
      
      return data;
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      return null;
    }
  };

  const fetchStatsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // Count products
      const { count: productsCount, error: productsError } = await supabase
        .from("products")
        .select("id", { count: 'exact', head: true })
        .eq("user_id", user.id);
      
      if (!productsError) {
        setProductCount(productsCount || 0);
      }
      
      // Count websites (simplified)
      const { data: websites, error: websitesError } = await supabase
        .from("websites")
        .select("id")
        .eq("owner_id", user.id);
      
      if (!websitesError) {
        setWebsiteCount(websites?.length || 0);
      }
      
      return { productsCount, websitesCount: websites?.length || 0 };
    } catch (error) {
      console.error("Error fetching stats:", error);
      return null;
    }
  };

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name,
        })
        .eq("id", user.id);
      
      if (error) {
        toast.error("Failed to update profile");
        console.error("Error updating profile:", error);
        return;
      }
      
      toast.success("Profile updated successfully");
      await fetchUserData();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setIsManageLoading(true);
      const { url, error } = await openCustomerPortal();
      
      if (error) {
        toast.error("Failed to access customer portal");
        console.error("Error accessing customer portal:", error);
        return;
      }
      
      if (url) {
        window.open(url, '_blank');
        toast.info("Opening customer portal in a new tab");
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsManageLoading(false);
    }
  };

  const handleSubscriptionUpdated = async () => {
    await fetchSubscriptionInfo();
    toast.success("Subscription information updated");
  };

  // When loading, show a static loader to prevent flicker
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar profile={null} />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Account Management</h1>
            </div>
            <div className="py-8 text-center">
              <div className="h-12 w-12 border-4 border-t-indigo-600 border-r-indigo-600 border-b-gray-200 border-l-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading profile...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar profile={profile} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Account Management</h1>
            {subscriptionInfo.isActive && (
              <PlanStatusBadge className="text-sm px-3 py-1.5" />
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Profile Settings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6">Profile Settings</h2>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="example@email.com" 
                            disabled 
                            className="bg-gray-100 cursor-not-allowed"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-indigo-600 to-purple-600"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </div>
            
            {/* Simplified Subscription Display */}
            <div>
              <SimplifiedSubscriptionDisplay
                loading={subscriptionLoading}
                planName={subscriptionInfo.planName}
                subscriptionEnd={subscriptionInfo.subscriptionEnd}
                onManageClick={handleManageSubscription}
                isManageLoading={isManageLoading}
              />
              
              {!subscriptionLoading && (
                <div className="mt-6">
                  <PlanLimitsInfo 
                    productCount={productCount}
                    websiteCount={websiteCount}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
