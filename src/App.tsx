
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import PremiumFeatures from "@/pages/PremiumFeatures";
import Builder from "@/pages/Builder";
import BuilderShop from "@/pages/builder/Shop";
import ProductsManager from "@/pages/builder/Products";
import Orders from "@/pages/builder/Orders";
import ShippingSettings from "@/pages/builder/ShippingSettings";
import SiteSettings from "@/pages/builder/SiteSettings";
import PageSettings from "@/pages/builder/PageSettings";
import PaymentSettings from "@/pages/builder/PaymentSettings";
import Website from "@/pages/WebsiteViewer";
import { PlanProvider } from "@/contexts/PlanContext";

const queryClient = new QueryClient();

import DebugInfo from "@/components/DebugInfo";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlanProvider>
        <Router>
          <div className="min-h-screen bg-background font-sans antialiased">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/premium-features" element={<PremiumFeatures />} />
              <Route path="/builder/:id" element={<Builder />} />
              <Route path="/builder/:id/shop" element={<BuilderShop />} />
              <Route path="/builder/:id/products" element={<ProductsManager />} />
              <Route path="/builder/:id/orders" element={<Orders />} />
              <Route path="/builder/:id/shipping-settings" element={<ShippingSettings />} />
              <Route path="/builder/:id/site-settings" element={<SiteSettings />} />
              <Route path="/builder/:id/pages" element={<PageSettings />} />
              <Route path="/builder/:id/payment-settings" element={<PaymentSettings />} />
              <Route path="/view/:id" element={<Website />} />
              <Route path="/site/:id" element={<Website />} />
            </Routes>
            <Toaster />
            <DebugInfo />
          </div>
        </Router>
      </PlanProvider>
    </QueryClientProvider>
  );
}

export default App;
