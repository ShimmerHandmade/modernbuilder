
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useWebsite } from "@/hooks/useWebsite";
import { BuilderProvider } from "@/contexts/BuilderContext";
import BuilderLayout from "@/components/builder/BuilderLayout";
import BuilderNavbar from "@/components/builder/BuilderNavbar";
import BuilderContent from "@/components/builder/BuilderContent";
import { v4 as uuidv4 } from "@/lib/uuid";
import { BuilderElement, PageSettings } from "@/contexts/BuilderContext";

const BuilderShop = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    website, 
    isLoading, 
    isSaving,
    isPublishing,
    websiteName, 
    saveWebsite,
    refreshWebsite,
    lastSaved,
    unsavedChanges
  } = useWebsite(id, navigate, {
    autoSave: true,
    autoSaveInterval: 30000 // Auto-save every 30 seconds
  });
  
  // Use state hooks from the Builder component
  const [isPreviewMode, setIsPreviewMode] = React.useState(false);
  const [shopPageElements, setShopPageElements] = React.useState<BuilderElement[]>([]);
  const [shopPageSettings, setShopPageSettings] = React.useState<PageSettings | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<string>('');

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

  // Initialize shop page elements
  useEffect(() => {
    if (!website) return;
    
    // Check if there's shop page content already
    const shopPageId = website.settings?.pages?.find(page => page.title.toLowerCase() === 'shop')?.id;
    
    if (shopPageId && website.settings.pagesContent && website.settings.pagesContent[shopPageId]) {
      // Use existing shop page content
      setShopPageElements(website.settings.pagesContent[shopPageId]);
      setShopPageSettings(website.settings.pagesSettings?.[shopPageId] || { title: 'Shop' });
    } else {
      // Create default shop page elements with navbar, products list, and footer
      const defaultElements: BuilderElement[] = [
        {
          id: uuidv4(),
          type: "navbar",
          content: "",
          props: {
            siteName: websiteName,
            links: [
              { text: "Home", url: "#" },
              { text: "About", url: "#" },
              { text: "Shop", url: "#" },
              { text: "Contact", url: "#" }
            ],
            variant: "default"
          }
        },
        {
          id: uuidv4(),
          type: "section",
          content: "",
          props: {
            padding: "large",
            backgroundColor: "bg-white",
            className: "py-12"
          },
          children: [
            {
              id: uuidv4(),
              type: "heading",
              content: "Our Shop",
              props: {
                level: "h1",
                className: "text-3xl font-bold text-center mb-8"
              }
            },
            {
              id: uuidv4(),
              type: "text",
              content: "Browse our collection of amazing products.",
              props: {
                className: "text-center text-gray-600 max-w-2xl mx-auto mb-12"
              }
            }
          ]
        },
        {
          id: uuidv4(),
          type: "section",
          content: "",
          props: {
            padding: "large",
            backgroundColor: "bg-gray-50",
            className: "py-12"
          },
          children: [
            {
              id: uuidv4(),
              type: "productsList",
              content: "",
              props: {
                columns: 4,
                productsPerPage: 8,
                showPagination: true,
                cardStyle: "default"
              }
            }
          ]
        },
        {
          id: uuidv4(),
          type: "footer",
          content: "",
          props: {
            siteName: websiteName,
            links: [
              { text: "Home", url: "#" },
              { text: "About", url: "#" },
              { text: "Shop", url: "#" },
              { text: "Contact", url: "#" }
            ],
            variant: "dark"
          }
        }
      ];
      
      setShopPageElements(defaultElements);
      setShopPageSettings({ title: 'Shop' });
    }
  }, [website, websiteName]);

  const handleSave = async () => {
    // Dispatch custom event to get latest elements from builder context
    document.dispatchEvent(new CustomEvent('save-website'));
    setSaveStatus('Saving...');
  };

  const handleSaveComplete = async (elements: BuilderElement[], pageSettings: PageSettings) => {
    if (!id || !website) return;
    
    console.log("Saving shop page content:", elements);
    
    // Get shop page ID
    const shopPage = website.settings.pages?.find(page => page.title.toLowerCase() === 'shop');
    if (!shopPage?.id) return;
    
    // Update content for shop page - create deep copies to avoid mutation issues
    const pagesContent = JSON.parse(JSON.stringify(website.settings.pagesContent || {}));
    const pagesSettings = JSON.parse(JSON.stringify(website.settings.pagesSettings || {}));
    
    pagesContent[shopPage.id] = elements;
    pagesSettings[shopPage.id] = pageSettings;
    
    // Save to database
    const success = await saveWebsite(
      website.content, 
      pageSettings, 
      {
        pagesContent,
        pagesSettings
      }
    );
    
    if (success) {
      setSaveStatus(`Saved just now`);
    } else {
      setSaveStatus('Save failed');
    }
    
    // Refresh website data after save
    refreshWebsite();
  };

  const handleBackToBuilder = () => {
    // If there are unsaved changes, ask for confirmation
    if (unsavedChanges) {
      const confirmed = window.confirm("You have unsaved changes. Would you like to save before leaving?");
      if (confirmed) {
        // Save first, then navigate
        handleSave();
      }
    }
    
    // Navigate back
    navigate(`/builder/${id}`);
  };
  
  const handleReturnToDashboard = () => {
    // If there are unsaved changes, ask for confirmation
    if (unsavedChanges) {
      const confirmed = window.confirm("You have unsaved changes. Would you like to save before leaving?");
      if (confirmed) {
        // Save first, then navigate
        handleSave();
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
        return;
      }
    }
    
    navigate('/dashboard');
  };

  // Track unsaved changes
  useEffect(() => {
    const markAsUnsaved = () => {
      setSaveStatus('Unsaved changes');
    };
    const markAsSaved = () => {
      setSaveStatus('Saved just now');
    };
    
    document.addEventListener('builder-content-changed', markAsUnsaved);
    document.addEventListener('save-complete', markAsSaved);
    
    return () => {
      document.removeEventListener('builder-content-changed', markAsUnsaved);
      document.removeEventListener('save-complete', markAsSaved);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-t-blue-600 border-r-blue-600 border-b-gray-200 border-l-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
          <Button onClick={() => navigate("/dashboard")} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white shadow-sm py-2 px-4 flex items-center">
        <Button variant="outline" size="sm" onClick={handleBackToBuilder} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Builder
        </Button>
        <h2 className="text-lg font-medium">Shop Page Editor</h2>
        
        {/* Save status indicator */}
        {saveStatus && (
          <span className="text-xs text-gray-500 ml-4">
            {saveStatus}
          </span>
        )}
        
        <div className="ml-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="mr-2"
            onClick={() => navigate(`/builder/${id}/products`)}
          >
            Manage Products
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReturnToDashboard}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
      
      <BuilderProvider 
        initialElements={shopPageElements} 
        initialPageSettings={shopPageSettings || { title: 'Shop' }}
        onSave={handleSaveComplete}
      >
        <BuilderLayout isPreviewMode={isPreviewMode} setIsPreviewMode={setIsPreviewMode}>
          <BuilderNavbar 
            websiteName={websiteName}
            setWebsiteName={() => {}} // Read-only in this context
            onSave={handleSave}
            onPublish={() => {}}
            isPublished={website?.published}
            isSaving={isSaving}
            isPublishing={isPublishing}
            isPreviewMode={isPreviewMode}
            setIsPreviewMode={setIsPreviewMode}
            currentPage={website.settings.pages?.find(p => p.title.toLowerCase() === 'shop')}
            pages={website.settings.pages || []}
            onChangePage={() => {}}
            onShopLinkClick={() => {}}
            onReturnToDashboard={handleReturnToDashboard}
            saveStatus={saveStatus}
          />
          <div className="mx-auto max-w-[1400px] px-4">
            <BuilderContent isPreviewMode={isPreviewMode} />
          </div>
        </BuilderLayout>
      </BuilderProvider>
    </div>
  );
};

export default BuilderShop;
