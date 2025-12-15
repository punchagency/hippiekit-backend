export const WP_API_URL =
  process.env.WP_API_URL ||
  'https://dodgerblue-otter-660921.hostingersite.com/wp-json/wp/v2';

export interface WPProduct {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  meta?: { cta_button_text?: string };
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string; alt_text?: string }>;
  };
  ['product-categories']?: number[];
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  meta?: { featured_image?: string };
}

export async function fetchWPProduct(
  productId: number
): Promise<WPProduct | null> {
  const res = await fetch(`${WP_API_URL}/products/${productId}?_embed`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch WP product ${productId}`);
  }
  return (await res.json()) as WPProduct;
}

export async function fetchWPCategoriesByIds(
  ids: number[]
): Promise<WPCategory[]> {
  if (!ids.length) return [];
  const unique = Array.from(new Set(ids));
  const url = `${WP_API_URL}/product-categories?include=${unique.join(',')}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch WP categories');
  }
  const categories = (await res.json()) as WPCategory[];

  // Fetch featured images for categories that have them
  const categoriesWithImages = await Promise.all(
    categories.map(async (category) => {
      if (category.meta?.featured_image) {
        try {
          console.log(
            `Fetching media for category ${category.name}, ID: ${category.meta.featured_image}`
          );
          const mediaResponse = await fetch(
            `${WP_API_URL}/media/${category.meta.featured_image}`
          );
          if (mediaResponse.ok) {
            const mediaData = (await mediaResponse.json()) as {
              source_url?: string;
            };
            console.log(
              `Resolved image URL for ${category.name}:`,
              mediaData.source_url
            );
            return {
              ...category,
              meta: {
                ...category.meta,
                featured_image: mediaData.source_url || '',
              },
            };
          } else {
            console.error(
              `Failed to fetch media ${category.meta.featured_image}, status:`,
              mediaResponse.status
            );
          }
        } catch (error) {
          console.error(
            'Failed to fetch media for category:',
            category.id,
            error
          );
        }
      }
      return category;
    })
  );

  return categoriesWithImages;
}
