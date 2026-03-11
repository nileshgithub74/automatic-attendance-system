// Test AI Service Endpoints
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

// Sample base64 image (1x1 pixel PNG)
const SAMPLE_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  try {
    const response = await fetch(`${BASE_URL}/api/ai/health`);
    const data = await response.json();
    console.log('✅ Health Check:', data);
    return true;
  } catch (error) {
    console.error('❌ Health Check Failed:', error.message);
    return false;
  }
}

async function testFaceDetection() {
  console.log('\n🔍 Testing Face Detection...');
  try {
    const response = await fetch(`${BASE_URL}/api/ai/face/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: SAMPLE_IMAGE })
    });
    const data = await response.json();
    console.log('✅ Face Detection:', data);
    return true;
  } catch (error) {
    console.error('❌ Face Detection Failed:', error.message);
    return false;
  }
}

async function testEmbeddingExtraction() {
  console.log('\n🔍 Testing Embedding Extraction...');
  try {
    const response = await fetch(`${BASE_URL}/api/ai/face/extract-embedding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: SAMPLE_IMAGE })
    });
    const data = await response.json();
    console.log('✅ Embedding Extraction:', {
      faceDetected: data.faceDetected,
      quality: data.quality,
      embeddingLength: data.embedding?.length || 0
    });
    return true;
  } catch (error) {
    console.error('❌ Embedding Extraction Failed:', error.message);
    return false;
  }
}

async function testFaceRecognition() {
  console.log('\n🔍 Testing Face Recognition...');
  try {
    const response = await fetch(`${BASE_URL}/api/ai/face/recognize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: SAMPLE_IMAGE,
        embeddings: [
          { studentId: 'student1', embedding: new Array(49152).fill(0.5) }
        ],
        threshold: 0.6
      })
    });
    const data = await response.json();
    console.log('✅ Face Recognition:', data);
    return true;
  } catch (error) {
    console.error('❌ Face Recognition Failed:', error.message);
    return false;
  }
}

async function testFaceComparison() {
  console.log('\n🔍 Testing Face Comparison...');
  try {
    const response = await fetch(`${BASE_URL}/api/ai/face/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image1: SAMPLE_IMAGE,
        image2: SAMPLE_IMAGE
      })
    });
    const data = await response.json();
    console.log('✅ Face Comparison:', data);
    return true;
  } catch (error) {
    console.error('❌ Face Comparison Failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting AI Service Tests...');
  console.log('📍 Base URL:', BASE_URL);
  console.log('⚠️  Make sure the dev server is running: npm run dev\n');

  const results = {
    health: await testHealthCheck(),
    detection: await testFaceDetection(),
    embedding: await testEmbeddingExtraction(),
    recognition: await testFaceRecognition(),
    comparison: await testFaceComparison()
  };

  console.log('\n📊 Test Results:');
  console.log('─────────────────────────────');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const totalPassed = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  console.log(`\n🎯 Total: ${totalPassed}/${totalTests} tests passed`);
}

runTests();
