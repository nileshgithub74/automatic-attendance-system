import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    service: 'AI Face Recognition',
    version: '1.0.0'
  });
}
