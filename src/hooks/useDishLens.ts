import { useState, useCallback } from 'react';

export interface TasteLensResult {
  name: string;
  restaurant: string;
  description: string;
  imageSearchQuery: string;
  servingSize: string;
  calories: string;
  dietaryTags: string[];
  spiceLevel: number;
  allergens: string[];
  estimatedPrice: string;
  pairings: string[];
  category: string;
  culturalNote: string;
}

export interface DishImage {
  url: string;
  thumb: string;
  alt: string;
  source: string;
  photographer?: string;
}

export function useTasteLens() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TasteLensResult | null>(null);
  const [images, setImages] = useState<DishImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const analyzeDish = useCallback(async (dishName: string, restaurant?: string, city?: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setImages([]);

    try {
      // Fetch AI analysis + dish-specific images in parallel
      // Use just the dish name for image search — we want photos of THE DISH, not the restaurant
      const [dishRes, imageRes] = await Promise.all([
        fetch('/api/dishlens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dishName, restaurant, city }),
        }),
        fetch(`/api/dish-image?q=${encodeURIComponent(dishName)}`).catch(() => null),
      ]);

      if (!dishRes.ok) {
        const data = await dishRes.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(data.error || 'Analysis failed');
      }

      const dishData: TasteLensResult = await dishRes.json();
      setResult(dishData);

      // Process images from initial fetch
      let imageList: DishImage[] = [];
      if (imageRes && imageRes.ok) {
        const imgData = await imageRes.json().catch(() => ({ images: [] }));
        imageList = imgData.images || [];
      }

      // If no images yet, retry with AI-suggested search query (no restaurant — generic dish image)
      if (imageList.length === 0 && dishData.imageSearchQuery) {
        try {
          const retryRes = await fetch(`/api/dish-image?q=${encodeURIComponent(dishData.imageSearchQuery)}`);
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            imageList = retryData.images || [];
          }
        } catch { /* ignore retry failures */ }
      }

      setImages(imageList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze dish');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setImages([]);
    setError(null);
  }, []);

  return {
    loading, result, images, error, analyzeDish, reset,
  };
}

// Keep backward-compatible export name
export { useTasteLens as useDishLens };
export type { TasteLensResult as DishLensResult };
