import { useParams, useNavigate } from "react-router-dom";
import { BuilderProvider } from "@/contexts/builder/BuilderProvider";
import BuilderLayout from "@/components/builder/BuilderLayout";
import BuilderNavbar from "@/components/builder/BuilderNavbar";
import BuilderContent from "@/components/builder/BuilderContent";
import { useWebsite } from "@/hooks/useWebsite";
import { BuilderElement, PageSettings } from "@/contexts/builder/types";
import { useState, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "@/lib/uuid";
import { toast } from "sonner";
import { CartProvider } from "@/contexts/CartContext";

// No need to declare this interface here as it's already defined in vite-env.d.ts

const Builder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { 
    website, 
    isLoading, 
    isSaving,
    isPublishing,
    websiteName, 
    elements,
    pageSettings,
    setWebsiteName, 
    saveWebsite, 
    publishWebsite,
    refreshWebsite,
    lastSaved,
    unsavedChanges
  } = useWebsite(id, navigate, {
    autoSave: true,
    autoSaveInterval: 30000, // Auto-save every 30 seconds
  });
  
  // Track preview mode state at this level
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [currentPageElements, setCurrentPageElements] = useState<BuilderElement[]>([]);
  const [currentPageSettings, setCurrentPageSettings] = useState<PageSettings | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const latestElementsRef = useRef<BuilderElement[]>([]);

  // Format the last saved time
  useEffect(() => {
    if (!lastSaved) return;
    
    const updateSaveStatus = () => {
      if (lastSaved) {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
        
        if (diffInSeconds < 60) {
          setSaveStatus(`Saved ${diffInSeconds} seconds ago`);
        } else if (diffInSeconds < 3600) {
          const minutes = Math.floor(diffInSeconds / 60);
          setSaveStatus(`Saved ${minutes} minute${minutes > 1 ? 's' : ''} ago`);
        } else {
          const formattedTime = lastSaved.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          setSaveStatus(`Saved at ${formattedTime}`);
        }
      } else {
        setSaveStatus('');
      }
    };
    
    updateSaveStatus();
    
    // Update the status every minute
    const interval = setInterval(updateSaveStatus, 60000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  // Update save status when saving state changes
  useEffect(() => {
    if (isSaving) {
      setSaveStatus('Saving...');
    } else if (unsavedChanges) {
      setSaveStatus('Unsaved changes');
    }
  }, [isSaving, unsavedChanges]);

  // Check URL params for preview mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const preview = urlParams.get('preview');
    if (preview === 'true') {
      setIsPreviewMode(true);
    }
  }, []);

  // Set current page to home page by default or from URL param
  useEffect(() => {
    if (website?.settings?.pages && website.settings.pages.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const pageId = urlParams.get('pageId');
      
      // If pageId is specified in URL, try to use it
      if (pageId) {
        const page = website.settings.pages.find(page => page.id === pageId);
        if (page) {
          setCurrentPageId(pageId);
          return;
        }
      }
      
      // If no pageId in URL or the specified page doesn't exist,
      // default to home page or first page
      const homePage = website.settings.pages.find(page => page.isHomePage);
      if (homePage) {
        setCurrentPageId(homePage.id);
        // Update URL to include the home page ID for consistency
        if (!pageId) {
          navigate(`/builder/${id}?pageId=${homePage.id}`, { replace: true });
        }
      } else if (website.settings.pages.length > 0) {
        // If no home page exists, use the first page
        setCurrentPageId(website.settings.pages[0].id);
        // Update URL to include the first page ID for consistency
        if (!pageId) {
          navigate(`/builder/${id}?pageId=${website.settings.pages[0].id}`, { replace: true });
        }
      }

      // Ensure we have at least a home page, shop page, and about page
      ensureRequiredPages();
    }
  }, [website, navigate, id]);

  // Set global site settings for components to access
  useEffect(() => {
    if (website?.settings) {
      // Make site settings available globally for components
      window.__SITE_SETTINGS__ = {
        logoUrl: website.settings.logoUrl,
        // Add other global settings here as needed
      };
    }
  }, [website?.settings]);

  // Load page content when currentPageId changes
  useEffect(() => {
    if (!website || !currentPageId) return;
    
    try {
      // Get content for current page
      const pagesContent = website.settings.pagesContent || {};
      const pageContent = pagesContent[currentPageId] || [];
      const pageSettings = website.settings.pagesSettings?.[currentPageId] || { title: websiteName };
      
      // Set current page elements and settings
      setCurrentPageElements(pageContent.length ? pageContent : elements || []);
      setCurrentPageSettings(pageSettings);
      
      console.log("Loaded page content for:", currentPageId, pageContent);
    } catch (error) {
      console.error("Error loading page content:", error);
      toast.error("Failed to load page content");
    }
  }, [currentPageId, website, elements, websiteName]);

  // Subscribe to builder content changes
  useEffect(() => {
    const handleContentChanged = () => {
      setSaveStatus('Unsaved changes');
    };
    
    document.addEventListener('builder-content-changed', handleContentChanged);
    
    return () => {
      document.removeEventListener('builder-content-changed', handleContentChanged);
    };
  }, []);

  // Ensure Home, Shop and About pages exist
  const ensureRequiredPages = async () => {
    if (!website?.settings?.pages) return;
    
    let updatedPages = [...(website.settings.pages || [])];
    let hasChanged = false;
    
    // Check for Home page
    const homePage = updatedPages.find(page => page.isHomePage || page.title.toLowerCase() === 'home');
    if (!homePage) {
      const newHomePage = {
        id: uuidv4(),
        title: 'Home',
        slug: '/',
        isHomePage: true
      };
      updatedPages.push(newHomePage);
      hasChanged = true;
    } else if (!homePage.isHomePage) {
      // Ensure the home page has isHomePage set to true
      updatedPages = updatedPages.map(p => 
        p.id === homePage.id ? {...p, isHomePage: true} : p
      );
      hasChanged = true;
    }
    
    // Check for Shop page
    const shopPage = updatedPages.find(page => page.title.toLowerCase() === 'shop');
    if (!shopPage) {
      const newShopPage = {
        id: uuidv4(),
        title: 'Shop',
        slug: '/shop',
        isHomePage: false
      };
      updatedPages.push(newShopPage);
      hasChanged = true;
    }
    
    // Add About page if it doesn't exist
    const aboutPage = updatedPages.find(page => page.title.toLowerCase() === 'about');
    if (!aboutPage) {
      const newAboutPage = {
        id: uuidv4(),
        title: 'About',
        slug: '/about',
        isHomePage: false
      };
      updatedPages.push(newAboutPage);
      hasChanged = true;
    }
    
    // If changes were made, update the website settings
    if (hasChanged && website) {
      const updatedSettings = {
        ...website.settings,
        pages: updatedPages
      };
      
      try {
        await saveWebsite(website.content, website.pageSettings, updatedSettings);
        console.log("Required pages created successfully");
      } catch (error) {
        console.error("Error creating required pages:", error);
      }
    }
  };

  // This function triggers the save event and gets the current builder elements
  const handleSave = async () => {
    if (!currentPageId || !website) {
      toast.error("Cannot save: No page selected");
      return;
    }
    
    // Dispatch event to trigger save in builder context
    document.dispatchEvent(new CustomEvent('save-website'));
    setSaveStatus('Saving...');
    console.log("Manual save triggered");
  };

  // This is called when the BuilderProvider's onSave is triggered
  const handleSaveComplete = async (updatedElements: BuilderElement[], updatedPageSettings: PageSettings) => {
    if (!currentPageId || !website) {
      toast.error("Cannot save: Missing page or website data");
      return;
    }

    console.log("Saving page content:", updatedElements);
    latestElementsRef.current = updatedElements;
    
    // Create deep copies of objects to avoid mutation issues
    const pagesContent = website.settings.pagesContent ? JSON.parse(JSON.stringify(website.settings.pagesContent)) : {};
    const pagesSettings = website.settings.pagesSettings ? JSON.parse(JSON.stringify(website.settings.pagesSettings)) : {};
    
    // Update content and settings for current page
    pagesContent[currentPageId] = updatedElements;
    pagesSettings[currentPageId] = updatedPageSettings;
    
    console.log("Saving content for page:", currentPageId, updatedElements);
    
    // Check if this is the home page
    const isHomePage = website.settings.pages?.find(p => p.isHomePage)?.id === currentPageId;
    
    // Save to database - if this is the home page, update the main content as well
    try {
      const success = await saveWebsite(
        isHomePage ? updatedElements : website.content, 
        updatedPageSettings, 
        {
          pagesContent,
          pagesSettings
        }
      );
      
      if (success) {
        setSaveStatus(`Saved just now`);
        toast.success("Website saved successfully");
      } else {
        setSaveStatus('Save failed');
        toast.error("Failed to save website");
      }
    } catch (error) {
      console.error("Error saving website:", error);
      setSaveStatus('Save failed');
      toast.error("Failed to save website");
    }
  };
  
  const handleChangePage = (pageId: string) => {
    // Save current page first
    handleSave();
    
    // Update URL with pageId parameter
    navigate(`/builder/${id}?pageId=${pageId}`);
    setCurrentPageId(pageId);
  };

  const handleShopLinkClick = useCallback(() => {
    // Save current page first
    handleSave();
    
    // Navigate to the shop page
    navigate(`/builder/${id}/shop`);
  }, [handleSave, id, navigate]);
  
  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };

  const handleViewSite = () => {
    window.open(`/site/${id}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-t-blue-600 border-r-blue-600 border-b-gray-200 border-l-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading builder...</p>
        </div>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Website not found</h2>
          <p className="text-gray-600 mb-6">The website you're looking for doesn't exist or you don't have permission to access it.</p>
          <button onClick={() => navigate("/dashboard")} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const pages = website?.settings?.pages || [];
  const currentPage = pages.find(page => page.id === currentPageId);

  // If in preview mode via URL parameter, only show the canvas without builder UI
  if (isPreviewMode && new URLSearchParams(window.location.search).get('preview') === 'true') {
    return (
      <CartProvider>
        <BuilderProvider 
          initialElements={currentPageElements} 
          initialPageSettings={currentPageSettings || { title: currentPage?.title || websiteName }}
          onSave={handleSaveComplete}
        >
          <div className="w-full min-h-screen">
            <BuilderContent isPreviewMode={true} />
          </div>
        </BuilderProvider>
      </CartProvider>
    );
  }

  return (
    <CartProvider>
      <BuilderProvider 
        initialElements={currentPageElements} 
        initialPageSettings={currentPageSettings || { title: currentPage?.title || websiteName }}
        onSave={handleSaveComplete}
      >
        <BuilderLayout isPreviewMode={isPreviewMode} setIsPreviewMode={setIsPreviewMode}>
          <BuilderNavbar 
            websiteName={websiteName} 
            setWebsiteName={setWebsiteName} 
            onSave={handleSave} 
            onPublish={publishWebsite}
            isPublished={website?.published}
            isSaving={isSaving}
            isPublishing={isPublishing}
            isPreviewMode={isPreviewMode}
            setIsPreviewMode={setIsPreviewMode}
            currentPage={currentPage}
            pages={pages}
            onChangePage={handleChangePage}
            onShopLinkClick={handleShopLinkClick}
            onReturnToDashboard={handleReturnToDashboard}
            viewSiteUrl={`/view/${id}`}
            saveStatus={saveStatus}
          />
          <BuilderContent isPreviewMode={isPreviewMode} />
        </BuilderLayout>
      </BuilderProvider>
    </CartProvider>
  );
};

export default Builder;
