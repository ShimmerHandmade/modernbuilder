
import { useState, useEffect, useRef } from 'react';
import { BuilderElement } from '@/contexts/builder/types';
import { useBuilder } from '@/contexts/builder';

type ResizeDirection = 'top' | 'right' | 'bottom' | 'left' | 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';

interface ResizeOptions {
  elementId: string;
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: boolean;
  onResizeStart?: () => void;
  onResizeEnd?: (newWidth: number, newHeight: number) => void;
}

export function useResize({
  elementId, 
  minWidth = 50, 
  minHeight = 50, 
  aspectRatio = false,
  onResizeStart,
  onResizeEnd
}: ResizeOptions) {
  const { findElementById, updateElement } = useBuilder();
  const [isResizing, setIsResizing] = useState(false);
  const [direction, setDirection] = useState<ResizeDirection | null>(null);
  const resizingRef = useRef<boolean>(false);
  const startPositionRef = useRef({ x: 0, y: 0 });
  const initialSizeRef = useRef({ width: 0, height: 0 });
  
  // Start resize
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, resizeDirection: ResizeDirection) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log(`Starting resize operation in direction: ${resizeDirection}`);
    
    // Get the element
    const element = findElementById(elementId);
    if (!element) {
      console.error(`Element with ID ${elementId} not found`);
      return;
    }
    
    // Get current size (with defaults if not set)
    const width = element.props?.width || 200;
    const height = element.props?.height || 100;
    
    console.log(`Initial size: ${width}x${height}`);
    
    // Store initial values
    initialSizeRef.current = { width, height };
    
    // Get client position
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    startPositionRef.current = { x: clientX, y: clientY };
    setDirection(resizeDirection);
    setIsResizing(true);
    resizingRef.current = true;
    
    // Call onResizeStart callback if provided
    if (onResizeStart) onResizeStart();
    
    // Add document listeners
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
    document.addEventListener('touchmove', handleResize, { passive: false });
    document.addEventListener('touchend', handleResizeEnd);
  };
  
  // Handle resize movement
  const handleResize = (e: MouseEvent | TouchEvent) => {
    if (!resizingRef.current || !direction) return;
    
    // Prevent default behavior to avoid scrolling while resizing
    if (e.cancelable) {
      e.preventDefault();
    }
    
    // Get client position
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Calculate delta
    const deltaX = clientX - startPositionRef.current.x;
    const deltaY = clientY - startPositionRef.current.y;
    
    // Get initial size
    let { width, height } = initialSizeRef.current;
    
    // Calculate new dimensions based on resize direction
    let newWidth = width;
    let newHeight = height;
    
    switch(direction) {
      case 'right':
        newWidth = Math.max(width + deltaX, minWidth);
        break;
      case 'bottom':
        newHeight = Math.max(height + deltaY, minHeight);
        break;
      case 'bottomRight':
        newWidth = Math.max(width + deltaX, minWidth);
        newHeight = Math.max(height + deltaY, minHeight);
        break;
      default:
        // Other directions are simplified in this version
        break;
    }
    
    // Maintain aspect ratio if needed
    if (aspectRatio && width > 0 && height > 0) {
      const originalRatio = width / height;
      
      if (direction === 'right') {
        newHeight = newWidth / originalRatio;
      } else if (direction === 'bottom') {
        newWidth = newHeight * originalRatio;
      } else if (direction === 'bottomRight') {
        // Let the user choose which dimension to prioritize in diagonal resizing
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / originalRatio;
        } else {
          newWidth = newHeight * originalRatio;
        }
      }
    }
    
    // Round the values to avoid decimal dimensions that might cause layout issues
    const roundedWidth = Math.round(newWidth);
    const roundedHeight = Math.round(newHeight);
    
    console.log(`Resizing to: ${roundedWidth}x${roundedHeight}`);
    
    // Update element props
    updateElement(elementId, {
      props: {
        width: roundedWidth,
        height: roundedHeight
      }
    });
  };
  
  // End resize
  const handleResizeEnd = () => {
    if (!resizingRef.current) return;
    
    console.log('Resize operation ended');
    
    resizingRef.current = false;
    setIsResizing(false);
    setDirection(null);
    
    // Remove document listeners
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.removeEventListener('touchmove', handleResize);
    document.removeEventListener('touchend', handleResizeEnd);
    
    // Call onResizeEnd callback if provided
    if (onResizeEnd) {
      const element = findElementById(elementId);
      if (element) {
        onResizeEnd(
          element.props?.width || initialSizeRef.current.width,
          element.props?.height || initialSizeRef.current.height
        );
      }
    }
    
    // Trigger any necessary layout recalculations
    requestAnimationFrame(() => {
      // This forces a reflow which can help fix spacing issues
      document.dispatchEvent(new CustomEvent('builder-content-changed'));
    });
  };
  
  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('touchmove', handleResize);
      document.removeEventListener('touchend', handleResizeEnd);
    };
  }, []);
  
  return {
    isResizing,
    handleResizeStart,
    resizableProps: { isResizing, direction }
  };
}
