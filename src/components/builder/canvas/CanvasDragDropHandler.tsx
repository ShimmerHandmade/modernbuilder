import React, { useState, useRef } from "react";
import { useBuilder } from "@/contexts/builder/BuilderProvider";
import { v4 as uuidv4 } from "@/lib/uuid";
import { toast } from "@/components/ui/use-toast";

interface CanvasDragDropHandlerProps {
  children: React.ReactNode;
  isPreviewMode: boolean;
  onCanvasClick: (e: React.MouseEvent) => void;
  className: string;
  containerId?: string; 
}

const CanvasDragDropHandler: React.FC<CanvasDragDropHandlerProps> = ({ 
  children, 
  isPreviewMode, 
  onCanvasClick,
  className,
  containerId
}) => {
  const { addElement, moveElement, elements, findElementById, removeElement } = useBuilder();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropTarget, setDropTarget] = useState<{top: boolean, element: string | null}>({top: true, element: null});
  const dragOverTimer = useRef<number | null>(null);
  
  const handleDragOver = (e: React.DragEvent) => {
    if (isPreviewMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }

    // Determine if we're dropping above or below an element
    const targetElement = findDropTarget(e);
    if (targetElement) {
      setDropTarget(targetElement);
    }
  };

  const findDropTarget = (e: React.DragEvent): {top: boolean, element: string | null} => {
    // Find the closest element we're hovering over
    const elementsFromPoint = document.elementsFromPoint(e.clientX, e.clientY);
    
    // Find element with data-element-id
    for (const el of elementsFromPoint) {
      const elementId = (el as HTMLElement).dataset?.elementId;
      if (elementId) {
        const rect = el.getBoundingClientRect();
        const isTopHalf = e.clientY < rect.top + rect.height / 2;
        return {
          top: isTopHalf,
          element: elementId
        };
      }
    }
    
    return {top: true, element: null};
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    setDropTarget({top: true, element: null});
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    setDropTarget({top: true, element: null});
    
    if (isPreviewMode) return;
    
    try {
      const data = e.dataTransfer.getData("application/json");
      if (!data) {
        console.log("No data in drop event");
        return;
      }
      
      const elementData = JSON.parse(data);
      console.log("Dropped element data:", elementData);
      
      // Add new element from palette
      if (!elementData.id) {
        let newElement = {
          id: uuidv4(),
          type: elementData.type,
          content: elementData.content || "",
          props: elementData.props || {},
        };
        
        // Special handling for certain element types
        if (elementData.type === 'productsList') {
          // Ensure we have default properties for the products list
          newElement.props = {
            columns: 3,
            productsPerPage: 6,
            showPagination: true,
            cardStyle: 'default',
            sortBy: 'created_at',
            sortOrder: 'desc',
            categoryFilter: 'all',
            ...newElement.props
          };
        }

        // If we have a target element, insert relative to it
        if (dropTarget.element && containerId) {
          const targetIndex = findElementIndex(dropTarget.element, containerId);
          if (targetIndex !== -1) {
            const insertIndex = dropTarget.top ? targetIndex : targetIndex + 1;
            console.log(`Adding new element to container ${containerId} at position ${insertIndex}`);
            addElement(newElement, insertIndex, containerId);
            
            toast({
              title: "Element Added",
              description: `Added new ${elementData.type} element`
            });
            
            return;
          }
        }
        
        // Add to container or root if no specific position
        if (containerId) {
          // Find the container
          const container = findElementById(containerId);
          
          if (container) {
            // Always add to the end of the container if no specific index
            const childrenCount = container.children?.length || 0;
            console.log(`Adding new element to container ${containerId} at end position (${childrenCount})`);
            addElement(newElement, containerId);
          } else {
            console.log("Container not found:", containerId);
          }
        } else {
          // Add to root
          console.log("Adding new element to root");
          addElement(newElement, null);
        }
        
        // Show toast notification for successful drop
        toast({
          title: "Element Added",
          description: `Added new ${elementData.type} element`
        });
        
        return;
      }
      
      // Element already exists, handle moving
      if (elementData.id) {
        const sourceElement = findElementById(elementData.id);
        if (!sourceElement) {
          console.log("Source element not found:", elementData.id);
          return;
        }
        
        const sourceParentId = elementData.parentId;
        const sourceIndex = elementData.sourceIndex !== undefined ? Number(elementData.sourceIndex) : -1;
        
        // Moving within the same container
        if (sourceParentId === containerId) {
          // If we have a target element, determine position
          if (dropTarget.element && dropTarget.element !== elementData.id) {
            const targetIndex = findElementIndex(dropTarget.element, containerId);
            if (targetIndex !== -1) {
              const adjustedTargetIndex = dropTarget.top ? targetIndex : targetIndex + 1;
              // Adjust index if source is before target and getting removed
              const destinationIndex = 
                sourceIndex !== -1 && sourceIndex < targetIndex ? 
                  adjustedTargetIndex - 1 : adjustedTargetIndex;
              
              console.log(`Moving element from ${sourceIndex} to ${destinationIndex} in same container`);
              moveElement(sourceIndex, destinationIndex, sourceParentId);
              return;
            }
          }
          
          // If at root level with no specific target
          if (!containerId && sourceIndex !== -1) {
            const dropIndex = elements.length - 1; // Default to end of list
            moveElement(sourceIndex, dropIndex);
            console.log(`Moving element from ${sourceIndex} to ${dropIndex} at root level`);
            return;
          }
        }
        
        // Moving between different containers
        const elementCopy = {
          ...sourceElement
        };
        
        // If we have a target element in the new container
        if (dropTarget.element) {
          const targetIndex = findElementIndex(dropTarget.element, containerId);
          if (targetIndex !== -1) {
            const insertIndex = dropTarget.top ? targetIndex : targetIndex + 1;
            addElement(elementCopy, insertIndex, containerId);
            console.log(`Added element to new container at position ${insertIndex}`);
          } else {
            // Add to the end of the new container
            addElement(elementCopy, containerId);
            console.log("Added element to new container at the end");
          }
        } else {
          // Add to the end of the new container
          addElement(elementCopy, containerId || null);
          console.log("Added element to new container at the end");
        }
        
        // Remove from the original location
        if (sourceIndex !== -1) {
          // We need to delay the removal slightly to avoid React rendering issues
          setTimeout(() => {
            removeElement(elementData.id);
          }, 50);
        }
      }
    } catch (error) {
      console.error("Error handling drop:", error);
      toast({
        title: "Error",
        description: "Error adding element. Please try again."
      });
    }
  };

  // Helper function to find element index in its container
  const findElementIndex = (elementId: string, parentId?: string): number => {
    if (!parentId) {
      // Look at root level elements
      return elements.findIndex(el => el.id === elementId);
    }
    
    // Look in the specified container
    const parent = findElementById(parentId);
    if (parent && parent.children) {
      return parent.children.findIndex(el => el.id === elementId);
    }
    
    return -1;
  };

  // Generate class names based on state
  const canvasClassName = `${className} transition-colors duration-150 ${
    isDraggingOver && !isPreviewMode 
      ? 'bg-indigo-50 border-indigo-300 border-2 border-dashed shadow-inner' 
      : ''
  }`;

  return (
    <div 
      className={canvasClassName}
      onClick={onCanvasClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-container-id={containerId}
    >
      {children}
    </div>
  );
};

export default CanvasDragDropHandler;
