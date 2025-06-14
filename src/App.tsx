
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
import BuilderPages from "@/pages/builder/Pages";
import PaymentSettings from "@/pages/builder/PaymentSettings";
import Website from "@/pages/WebsiteViewer";
import Cart from "@/pages/Cart";
import ProductDetails from "@/pages/ProductDetails";
import Checkout from "@/pages/Checkout";
import { PlanProvider } from "@/contexts/PlanContext";
import { CartProvider } from "@/contexts/CartContext";

const queryClient = new QueryClient();

import DebugInfo from "@/components/DebugInfo";

function App() {
  // Check if this is a custom domain (not localhost, lovable.app, lovableproject.com, or aetherwebsites.com)
  const isCustomDomain = window.location.hostname !== 'localhost' && 
                         !window.location.hostname.includes('lovable.app') &&
                         !window.location.hostname.includes('lovableproject.com') &&
                         !window.location.hostname.includes('aetherwebsites.com');

  console.log("App routing info:", {
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    isCustomDomain,
    fullUrl: window.location.href
  });

  // If it's a custom domain, show the website viewer directly
  if (isCustomDomain) {
    return (
      <QueryClientProvider client={queryClient}>
        <PlanProvider>
          <CartProvider>
            <Router>
              <div className="min-h-screen bg-background font-sans antialiased">
                <Routes>
                  {/* Custom domain routes - all paths go to Website component */}
                  <Route path="/*" element={<Website />} />
                </Routes>
                <Toaster />
                <DebugInfo />
              </div>
            </Router>
          </CartProvider>
        </PlanProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PlanProvider>
        <CartProvider>
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
                <Route path="/builder/:id/settings" element={<SiteSettings />} />
                <Route path="/builder/:id/pages" element={<BuilderPages />} />
                <Route path="/builder/:id/payment-settings" element={<PaymentSettings />} />
                
                {/* Published sites using folder structure */}
                <Route path="/site/:id" element={<Website />} />
                <Route path="/site/:id/*" element={<Website />} />
                
                {/* Legacy view routes for backward compatibility */}
                <Route path="/view/:id" element={<Website />} />
                <Route path="/view/:id/cart" element={<Website />} />
                <Route path="/view/:id/product/:productId" element={<Website />} />
                <Route path="/view/:id/checkout" element={<Website />} />
                <Route path="/view/:id/order-confirmation" element={<Website />} />
                
                {/* Global cart/checkout routes */}
                <Route path="/cart" element={<Cart />} />
                <Route path="/product/:productId" element={<ProductDetails />} />
                <Route path="/checkout" element={<Checkout />} />
              </Routes>
              <Toaster />
              <DebugInfo />
            </div>
          </Router>
        </CartProvider>
      </PlanProvider>
    </QueryClientProvider>
  );
}

export default App;
