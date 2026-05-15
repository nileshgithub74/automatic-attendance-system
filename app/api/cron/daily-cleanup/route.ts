import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// This endpoint should be called daily by a cron job
// You can use services like:
// - Vercel Cron Jobs
// - GitHub Actions
// - External cron services (cron-job.org, EasyCron)

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from a cron job (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('⚠️ Unauthorized cron request');
      // Still run cleanup but log the warning
    }

    console.log('🕐 Daily cleanup cron job started...');

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Delete images older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    console.log(`📅 Deleting images older than: ${sevenDaysAgo.toISOString()}`);

    const oldImages = await db
      .collection('verification_images')
      .find({
        uploadedAt: { $lt: sevenDaysAgo }
      })
      .toArray();

    console.log(`📊 Found ${oldImages.length} images to delete`);

    let deletedCount = 0;
    let failedCount = 0;

    for (const image of oldImages) {
      try {
        if (image.publicId) {
          const result = await deleteFromCloudinary(image.publicId);
          
          if (result.success) {
            await db.collection('verification_images').deleteOne({ _id: image._id });
            deletedCount++;
          } else {
            failedCount++;
          }
        }
      } catch (error) {
        failedCount++;
        console.error(`Error deleting ${image.publicId}:`, error);
      }
    }

    // Log cleanup activity
    await db.collection('cleanup_logs').insertOne({
      type: 'image_cleanup',
      executedAt: new Date(),
      cutoffDate: sevenDaysAgo,
      totalFound: oldImages.length,
      deleted: deletedCount,
      failed: failedCount
    });

    console.log(`✅ Daily cleanup completed: ${deletedCount} deleted, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      message: 'Daily cleanup completed',
      summary: {
        totalFound: oldImages.length,
        deleted: deletedCount,
        failed: failedCount,
        cutoffDate: sevenDaysAgo.toISOString(),
        executedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ Error during daily cleanup:', error);
    return NextResponse.json(
      { error: error.message || 'Cleanup failed' },
      { status: 500 }
    );
  }
}
