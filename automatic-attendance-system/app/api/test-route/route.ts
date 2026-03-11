import { NextResponse } from 'next/server';

// Simple test route to verify API routes are working
export async function GET() {
  console.log('✅ Test route accessed successfully!');
  
  return NextResponse.json({
    success: true,
    message: 'API routes are working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}
