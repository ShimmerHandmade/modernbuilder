
import React, { useState } from "react";
import { BuilderElement } from "@/contexts/BuilderContext";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import CartButton from "@/components/CartButton";
import { useNavigate, useLocation } from "react-router-dom";

interface ElementProps {
  element: BuilderElement;
  isLiveSite?: boolean;
}

const NavbarElement: React.FC<ElementProps> = ({ element, isLiveSite = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const siteName = element.props?.siteName || "Your Website";
  const showCartButton = element.props?.showCartButton !== false;
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use the logo from element props, or fall back to the global site settings if available
  const logo = element.props?.logo || 
               (typeof window !== 'undefined' && 
                window.__SITE_SETTINGS__?.logoUrl) || 
               "";
               
  const links = element.props?.links || [
    { text: "Home", url: "#" },
    { text: "About", url: "#" },
    { text: "Services", url: "#" },
    { text: "Contact", url: "#" }
  ];
  const variant = element.props?.variant || "default";
  
  // Variants for navbar
  const navbarStyles = {
    default: "bg-white shadow-sm border-b border-gray-200",
    transparent: "bg-transparent",
    dark: "bg-gray-900 text-white",
    primary: "bg-indigo-600 text-white",
    accent: "bg-amber-500 text-white"
  };
  
  // Link styles based on variant
  const linkStyles = {
    default: "text-gray-600 hover:text-indigo-600 transition-colors font-medium",
    transparent: "text-gray-800 hover:text-indigo-600 transition-colors font-medium",
    dark: "text-gray-300 hover:text-white transition-colors font-medium",
    primary: "text-white/80 hover:text-white transition-colors font-medium",
    accent: "text-white/90 hover:text-white transition-colors font-medium"
  };
  
  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Get the current site URL to build site-specific cart URL
  const getSiteCartUrl = () => {
    // When in the website viewer, we use relative path
    // The route structure is /site/:id/* so we want to maintain that base
    const currentPath = window.location.pathname;
    if (currentPath.includes('/site/')) {
      // Extract the base site path (e.g., /site/123)
      const baseSitePath = currentPath.split('/').slice(0, 3).join('/');
      return `${baseSitePath}/cart`;
    }
    // Fallback to regular cart path
    return '/cart';
  };
  
  // Handle link clicks with proper navigation
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    e.preventDefault();
    
    // Only use real navigation in live site mode
    if (isLiveSite) {
      // In live site mode, we want to use actual navigation
      // Check if this is an internal link
      if (url.startsWith('/') || url === '#') {
        navigate(url === '#' ? '/' : url);
      } else if (url.startsWith('http')) {
        // External link - open in new tab
        window.open(url, '_blank');
      } else {
        // Treat as internal path
        navigate(url);
      }
      
      // Close mobile menu after navigation
      setMobileMenuOpen(false);
    }
    
    // In builder mode, we just prevent default navigation
    // which stops the page from reloading
  };

  return (
    <header className={navbarStyles[variant as keyof typeof navbarStyles]}>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {logo ? (
              <img src={logo} alt={`${siteName} logo`} className="h-8" />
            ) : (
              <div className={cn(
                "w-8 h-8 rounded flex items-center justify-center text-white font-bold",
                variant === 'default' || variant === 'transparent' ? 'bg-indigo-600' : 'bg-white/20'
              )}>
                {siteName.charAt(0)}
              </div>
            )}
            <span className={cn(
              "text-lg font-bold", 
              variant === 'dark' || variant === 'primary' || variant === 'accent' ? 'text-white' : 'text-gray-800'
            )}>
              {siteName}
            </span>
          </div>
          
          <nav className="hidden md:block">
            <ul className="flex space-x-8">
              {links.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.url} 
                    className={linkStyles[variant as keyof typeof linkStyles]}
                    onClick={(e) => handleLinkClick(e, link.url)}
                  >
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="flex items-center space-x-2">
            {showCartButton && (
              <CartButton 
                variant={variant === 'dark' || variant === 'primary' || variant === 'accent' ? "ghost" : "outline"} 
                size="icon" 
                className="text-inherit" 
                siteCartUrl={getSiteCartUrl()}
              />
            )}
            
            <div className="md:hidden">
              <button 
                className={cn(
                  "p-2 rounded-md transition-colors",
                  variant === 'dark' || variant === 'primary' || variant === 'accent' ? 
                    'text-white/80 hover:bg-white/10 hover:text-white' : 
                    'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
                aria-label="Menu"
                onClick={toggleMobileMenu}
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-col space-y-3">
              {links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  className={linkStyles[variant as keyof typeof linkStyles]}
                  onClick={(e) => {
                    handleLinkClick(e, link.url);
                    setMobileMenuOpen(false);
                  }}
                >
                  {link.text}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default NavbarElement;
