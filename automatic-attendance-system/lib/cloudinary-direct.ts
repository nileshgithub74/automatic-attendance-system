// Direct Cloudinary upload using fetch API
import crypto from 'crypto';

export async function uploadToCloudinaryDirect(
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
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return {
        success: false,
        error: 'Cloudinary credentials not configured'
      };
    }

    // Prepare upload parameters
    const timestamp = Math.round(Date.now() / 1000);
    const uploadParams: any = {
      timestamp: timestamp,
      folder: folder,
    };

    if (publicId) {
      uploadParams.public_id = publicId;
    }

    // Generate signature
    const paramsToSign = Object.keys(uploadParams)
      .sort()
      .map(key => `${key}=${uploadParams[key]}`)
      .join('&');
    
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex');

    // Prepare form data
    const formData = new FormData();
    formData.append('file', base64Image);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);
    
    if (publicId) {
      formData.append('public_id', publicId);
    }

    // Upload to Cloudinary
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    console.log('📤 Uploading directly to:', uploadUrl);
    console.log('📝 Upload params:', { folder, publicId, timestamp });

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', response.status, errorText);
      return {
        success: false,
        error: `Upload failed with status ${response.status}: ${errorText}`
      };
    }

    const result = await response.json();

    return {
      success: true,
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id
    };
  } catch (error: any) {
    console.error('❌ Direct upload error:', error);
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
}
