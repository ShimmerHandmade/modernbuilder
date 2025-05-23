
import { useState, useEffect, useRef } from "react";
import { getUserPlanRestrictions, PlanRestriction } from "@/utils/planRestrictions";
import { getUserPlanSimplified } from "@/api/websites/getUserPlanSimplified";
import { toast } from "sonner";

export interface PlanInfo {
  planName: string | null;
  restrictions: PlanRestriction | null;
  loading: boolean;
  error: string | null;
  isPremium: boolean; // Professional or Enterprise plan
  isEnterprise: boolean;
}

/**
 * Custom hook to provide plan information throughout the application
 */
export const usePlanInfo = () => {
  const [planInfo, setPlanInfo] = useState<PlanInfo>({
    planName: null,
    restrictions: null,
    loading: true,
    error: null,
    isPremium: false,
    isEnterprise: false
  });
  
  const isMounted = useRef(true);
  const initialLoadComplete = useRef(false);
  const loadAttempts = useRef(0);

  // Clean up the useEffect to improve loading stability
  useEffect(() => {
    const loadPlanInfo = async () => {
      // Prevent reloading after 3 attempts
      if (initialLoadComplete.current || loadAttempts.current >= 3) return;
      
      try {
        loadAttempts.current += 1;
        console.log(`Loading plan info, attempt ${loadAttempts.current}`);
        
        // First handle restrictions, which shouldn't fail even without auth
        let restrictions;
        try {
          restrictions = await getUserPlanRestrictions();
        } catch (restrictionsError) {
          console.warn("Failed to load plan restrictions:", restrictionsError);
          restrictions = null;
        }
        
        // Then try to get the plan data
        try {
          const planData = await getUserPlanSimplified();
          
          if (planData && planData.isActive) {
            const isPremium = planData.planName === "Professional" || planData.planName === "Enterprise";
            const isEnterprise = planData.planName === "Enterprise";
            
            console.log("Plan data loaded successfully:", {
              planName: planData.planName,
              isPremium,
              isEnterprise
            });
            
            if (isMounted.current) {
              setPlanInfo({
                planName: planData.planName,
                restrictions,
                loading: false,
                error: null,
                isPremium,
                isEnterprise
              });
            }
          } else {
            console.log("No active plan found, using default values");
            if (isMounted.current) {
              setPlanInfo({
                planName: null,
                restrictions,
                loading: false,
                error: null,
                isPremium: false,
                isEnterprise: false
              });
            }
          }
        } catch (planError) {
          console.warn("Failed to load plan data:", planError);
          // Even if plan data fails, we can still proceed with restrictions
          if (isMounted.current) {
            setPlanInfo({
              planName: null,
              restrictions,
              loading: false,
              error: "Failed to load subscription information",
              isPremium: false,
              isEnterprise: false
            });
          }
        }
        
        initialLoadComplete.current = true;
      } catch (error) {
        console.error("Error in usePlanInfo:", error);
        if (isMounted.current) {
          // Even on error, we stop loading to prevent UI blocking
          setPlanInfo(prev => ({
            ...prev,
            loading: false,
            error: "Failed to load subscription information"
          }));
          
          // Only show toast on first attempt to avoid spam
          if (loadAttempts.current === 1) {
            toast.error("Failed to load plan information", {
              description: "Using default settings",
              duration: 3000,
            });
          }
        }
        
        // Even with error, mark as completed to prevent endless retries
        initialLoadComplete.current = true;
      }
    };

    loadPlanInfo();
    
    return () => {
      isMounted.current = false;
    };
  }, []); // Only run on mount

  return planInfo;
};
