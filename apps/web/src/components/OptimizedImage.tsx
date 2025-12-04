import React, { useState, useRef, useEffect, useCallback, CSSProperties } from 'react';

// Styles using inline CSS for simplicity
const styles = {
  container: {
    position: 'relative',
    overflow: 'hidden',
    display: 'inline-block',
    backgroundColor: '#f3f4f6',
  } as CSSProperties,
  image: {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s ease-in-out',
  } as CSSProperties,
  loaded: {
    opacity: 1,
  } as CSSProperties,
  loading: {
    opacity: 0,
  } as CSSProperties,
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
    color: '#6b7280',
    fontSize: '0.875rem',
  } as CSSProperties,
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  } as CSSProperties,
  skeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-loading 1.5s infinite',
  } as CSSProperties,
};

// Add keyframes for skeleton animation
const skeletonAnimation = `
  @keyframes skeleton-loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

// Intersection Observer hook for lazy loading
function useIntersectionObserver(
  ref: React.RefObject<Element | null>,
  options: IntersectionObserverInit = {}
): [boolean, () => void] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!ref.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px', // Start loading 50px before element comes into view
        ...options,
      }
    );

    observerRef.current.observe(ref.current);

    return disconnect;
  }, [ref, disconnect]);

  return [isIntersecting, disconnect];
}

// Image optimization utilities
const imageUtils = {
  // Generate optimized image URL based on device capabilities
  getOptimizedUrl(src: string, width?: number, height?: number, quality = 80): string {
    const url = new URL(src, window.location.origin);

    // Add responsive parameters
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', quality.toString());

    // Prefer WebP format if supported
    if (this.supportsWebP()) {
      url.searchParams.set('format', 'webp');
    }

    return url.toString();
  },

  // Check WebP support
  supportsWebP(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch {
      return false;
    }
  },

  // Generate low-quality placeholder (LQIP)
  generatePlaceholder(width: number, height: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, width, height);

    // Add simple pattern
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width * 0.3, height * 0.3);
    ctx.lineTo(width * 0.7, height * 0.7);
    ctx.moveTo(width * 0.7, height * 0.3);
    ctx.lineTo(width * 0.3, height * 0.7);
    ctx.stroke();

    return canvas.toDataURL('image/jpeg', 0.1);
  },

  // Calculate responsive image sizes
  getResponsiveSizes(baseWidth: number, baseHeight: number): Array<{ width: number; height: number }> {
    return [
      { width: baseWidth * 0.5, height: baseHeight * 0.5 },
      { width: baseWidth * 0.75, height: baseHeight * 0.75 },
      { width: baseWidth, height: baseHeight },
      { width: baseWidth * 1.5, height: baseHeight * 1.5 },
      { width: baseWidth * 2, height: baseHeight * 2 },
    ];
  },
};

// Component props
export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
  quality?: number;
  placeholder?: string;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  enableIntersectionObserver?: boolean;
  threshold?: number;
  rootMargin?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 300,
  height = 200,
  className,
  style,
  loading = 'lazy',
  quality = 80,
  placeholder,
  fallback,
  onLoad,
  onError,
  enableIntersectionObserver = true,
  threshold = 0.1,
  rootMargin = '50px',
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate placeholder if not provided
  const placeholderSrc = placeholder || imageUtils.generatePlaceholder(width, height);

  // Setup intersection observer for lazy loading
  const [isIntersecting, disconnect] = useIntersectionObserver(
    containerRef,
    { threshold, rootMargin }
  );

  // Load image when it comes into view
  useEffect(() => {
    if (!enableIntersectionObserver || isIntersecting) {
      const optimizedSrc = imageUtils.getOptimizedUrl(src, width, height, quality);
      setCurrentSrc(optimizedSrc);
    }
  }, [isIntersecting, enableIntersectionObserver, src, width, height, quality]);

  // Handle image load success
  const handleLoad = useCallback(() => {
    setImageState('loaded');
    onLoad?.();
  }, [onLoad]);

  // Handle image load error
  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setImageState('error');
    onError?.(event);
    disconnect();
  }, [onError, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Inject skeleton animation styles
  useEffect(() => {
    const styleId = 'skeleton-animation-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = skeletonAnimation;
      document.head.appendChild(style);
    }
  }, []);

  // If fallback is provided and image failed to load
  if (imageState === 'error' && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...styles.container,
        width,
        height,
        ...style,
      }}
    >
      {/* Loading placeholder */}
      {imageState === 'loading' && (
        <div style={styles.placeholder}>
          <div style={styles.skeleton} />
        </div>
      )}

      {/* Main image */}
      {(enableIntersectionObserver ? isIntersecting : true) && currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          style={{
            ...styles.image,
            ...(imageState === 'loaded' ? styles.loaded : styles.loading),
            width,
            height,
          }}
          loading={loading}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Low quality image placeholder while loading */}
      {imageState === 'loading' && placeholder && (
        <img
          src={placeholderSrc}
          alt=""
          style={{
            ...styles.image,
            width,
            height,
            filter: 'blur(10px)',
            transform: 'scale(1.1)',
          }}
          aria-hidden="true"
        />
      )}

      {/* Error state */}
      {imageState === 'error' && !fallback && (
        <div style={{...styles.placeholder, ...styles.error}}>
          <span>Failed to load image</span>
        </div>
      )}
    </div>
  );
};

// Picture component for responsive images with multiple formats
export interface ResponsiveImageProps extends Omit<OptimizedImageProps, 'src'> {
  src: string;
  formats?: Array<'webp' | 'avif' | 'jpeg' | 'png'>;
  sizes?: string;
  srcSet?: Array<{ src: string; width: number; height: number }>;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  formats = ['webp', 'jpeg'],
  sizes = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
  srcSet,
  ...props
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate srcSet for responsive images
  const generateSrcSet = (baseSrc: string, format: string): string => {
    if (srcSet) {
      return srcSet
        .map(({ src: variantSrc, width, height }) => {
          const optimizedSrc = imageUtils.getOptimizedUrl(
            variantSrc || baseSrc,
            width,
            height,
            props.quality
          ).replace(/\.(webp|jpeg|png|avif)/i, `.${format}`);
          return `${optimizedSrc} ${width}w`;
        })
        .join(', ');
    }

    // Default responsive sources
    const responsiveSizes = imageUtils.getResponsiveSizes(props.width || 300, props.height || 200);
    return responsiveSizes
      .map(({ width: w, height: h }) => {
        const optimizedSrc = imageUtils.getOptimizedUrl(baseSrc, w, h, props.quality)
          .replace(/\.(webp|jpeg|png|avif)/i, `.${format}`);
        return `${optimizedSrc} ${w}w`;
      })
      .join(', ');
  };

  // Set up sources when component mounts or src changes
  useEffect(() => {
    setCurrentSrc(imageUtils.getOptimizedUrl(src, props.width, props.height, props.quality));
  }, [src, props.width, props.height, props.quality]);

  const handleLoad = useCallback(() => {
    setImageState('loaded');
    props.onLoad?.();
  }, [props.onLoad]);

  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setImageState('error');
    props.onError?.(event);
  }, [props.onError]);

  return (
    <picture>
      {/* Multiple format sources */}
      {formats.map(format => (
        <source
          key={format}
          type={`image/${format}`}
          srcSet={generateSrcSet(src, format)}
          sizes={sizes}
        />
      ))}

      {/* Fallback image */}
      <OptimizedImage
        {...props}
        src={currentSrc}
        alt={alt}
        enableIntersectionObserver={false}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          ...props.style,
          width: props.width,
          height: props.height,
        }}
      />
    </picture>
  );
};

export default OptimizedImage;