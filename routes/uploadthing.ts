import { createRouteHandler } from 'uploadthing/express';
import { createUploadthing, type FileRouter } from 'uploadthing/server';

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const uploadRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  profileImage: f({
    image: {
      maxFileSize: '4MB',
      maxFileCount: 1,
    },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async () => {
      // This code runs on your server before upload
      // You can check if user is authenticated here
      // const user = await auth(req);
      // if (!user) throw new Error('Unauthorized');

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: 'user-id' };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log('Upload complete for userId:', metadata.userId);
      console.log('file url', file.url);

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Route for scanned product images (photo and barcode scans)
  scannedImage: f({
    image: {
      maxFileSize: '8MB', // Larger size for high-quality product photos
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      // Allow authenticated users to upload scanned images
      return { uploadType: 'scannedImage' };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Scanned image upload complete:', file.url);
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;

// Export the route handler
export const uploadthingRouteHandler = createRouteHandler({
  router: uploadRouter,
});
