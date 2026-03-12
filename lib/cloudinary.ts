// Cloudinary Configuration for Image Storage
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload base64 image to Cloudinary
 * @param base64Image - Base64 encoded image string
 * @param folder - Folder name in Cloudinary (e.g., 'face-registrations', 'attendance-captures')
 * @param publicId - Optional custom public ID
 * @returns Promise with upload result containing URL
 */
export async function uploadToCloudinary(
  base64Image: string,
  folder: string = 'attendance-system',
  publicId?: string
): Promise<{
  success: boolean;
  url?: string;
  secureUrl?: string;
  publicId?: string;
  error?: string;
}> {
  try {
    // Ensure base64 has proper format
    const imageData = base64Image.includes('base64,') 
      ? base64Image 
      : `data:image/jpeg;base64,${base64Image}`;

    const uploadOptions: any = {
      folder,
      resource_type: 'image',
      quality: 'auto:good', // Automatic quality optimization
      fetch_format: 'auto', // Automatic format selection (WebP, etc.)
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(imageData, uploadOptions);

    return {
      success: true,
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
}

/**
 * Upload multiple images to Cloudinary
 * @param base64Images - Array of base64 encoded images
 * @param folder - Folder name in Cloudinary
 * @returns Promise with array of upload results
 */
export async function uploadMultipleToCloudinary(
  base64Images: string[],
  folder: string = 'attendance-system'
): Promise<Array<{
  success: boolean;
  url?: string;
  secureUrl?: string;
  publicId?: string;
  error?: string;
}>> {
  const uploadPromises = base64Images.map((image, index) => 
    uploadToCloudinary(image, folder, `image_${Date.now()}_${index}`)
  );

  return Promise.all(uploadPromises);
}

/**
 * Delete image from Cloudinary
 * @param publicId - Public ID of the image to delete
 * @returns Promise with deletion result
 */
export async function deleteFromCloudinary(
  publicId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message || 'Delete failed'
    };
  }
}

/**
 * Get optimized image URL with transformations
 * @param publicId - Public ID of the image
 * @param width - Desired width
 * @param height - Desired height
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  publicId: string,
  width?: number,
  height?: number
): string {
  const transformations: any = {
    quality: 'auto:good',
    fetch_format: 'auto'
  };

  if (width) transformations.width = width;
  if (height) transformations.height = height;
  if (width || height) transformations.crop = 'fill';

  return cloudinary.url(publicId, transformations);
}

export default cloudinary;
