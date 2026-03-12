import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if Cloudinary environment variables are set
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const config = {
      cloudName: cloudName ? '✅ Set' : '❌ Missing',
      apiKey: apiKey ? '✅ Set' : '❌ Missing',
      apiSecret: apiSecret ? '✅ Set' : '❌ Missing',
      cloudNameValue: cloudName || 'Not set',
      apiKeyValue: apiKey || 'Not set'
    };

    // Test Cloudinary connection
    let connectionTest = 'Not tested';
    if (cloudName && apiKey && apiSecret) {
      try {
        const { uploadToCloudinary } = await import('@/lib/cloudinary');
        
        // Create a small test image (1x1 red pixel)
        const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
        
        const result = await uploadToCloudinary(testImage, 'test', `test_${Date.now()}`);
        
        if (result.success) {
          connectionTest = '✅ Upload successful';
          
          // Clean up test image
          const { deleteFromCloudinary } = await import('@/lib/cloudinary');
          if (result.publicId) {
            await deleteFromCloudinary(result.publicId);
          }
        } else {
          connectionTest = `❌ Upload failed: ${result.error}`;
        }
      } catch (error: any) {
        connectionTest = `❌ Error: ${error.message}`;
      }
    } else {
      connectionTest = '⚠️ Skipped - Missing credentials';
    }

    return NextResponse.json({
      status: 'Cloudinary Configuration Test',
      environment: process.env.NODE_ENV,
      config,
      connectionTest,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'Error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
