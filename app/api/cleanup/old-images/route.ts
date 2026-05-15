import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for cleanup
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting cleanup of old verification images...');

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    console.log(`📅 Deleting images older than: ${sevenDaysAgo.toISOString()}`);

    // Find all images older than 7 days
    const oldImages = await db
      .collection('verification_images')
      .find({
        uploadedAt: { $lt: sevenDaysAgo }
      })
      .toArray();

    console.log(`📊 Found ${oldImages.length} images to delete`);

    let deletedCount = 0;
    let failedCount = 0;

    // Delete each image from Cloudinary
    for (const image of oldImages) {
      try {
        if (image.publicId) {
          console.log(`🗑️ Deleting: ${image.publicId}`);
          const result = await deleteFromCloudinary(image.publicId);
          
          if (result.success) {
            // Remove from database
            await db.collection('verification_images').deleteOne({ _id: image._id });
            deletedCount++;
            console.log(`✅ Deleted: ${image.publicId}`);
          } else {
            failedCount++;
            console.error(`❌ Failed to delete: ${image.publicId}`);
          }
        }
      } catch (error) {
        failedCount++;
        console.error(`❌ Error deleting ${image.publicId}:`, error);
      }
    }

    console.log(`✅ Cleanup completed: ${deletedCount} deleted, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      summary: {
        totalFound: oldImages.length,
        deleted: deletedCount,
        failed: failedCount,
        cutoffDate: sevenDaysAgo.toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ Error during cleanup:', error);
    return NextResponse.json(
      { error: error.message || 'Cleanup failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to check how many images would be deleted
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const count = await db
      .collection('verification_images')
      .countDocuments({
        uploadedAt: { $lt: sevenDaysAgo }
      });

    return NextResponse.json({
      success: true,
      count: count,
      cutoffDate: sevenDaysAgo.toISOString(),
      message: `${count} images are older than 7 days and can be deleted`
    });
  } catch (error: any) {
    console.error('Error checking old images:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check images' },
      { status: 500 }
    );
  }
}
