/**
 * Backend Test Script
 * Tests if Next.js backend and MongoDB are working
 */

const https = require('https');
const http = require('http');

// Test configuration
const NEXTJS_URL = process.env.NEXTJS_URL || 'http://localhost:3000';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    }).on('error', reject).on('timeout', () => {
      reject(new Error('Request timeout'));
    });
  });
}

async function testNextJS() {
  log('\n🧪 Testing Next.js Backend...', 'cyan');
  
  try {
    const response = await makeRequest(NEXTJS_URL);
    
    if (response.status === 200) {
      log('✅ Next.js is running', 'green');
      log(`   Status: ${response.status}`, 'cyan');
      return true;
    } else {
      log(`⚠️  Next.js returned status: ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log('❌ Next.js is NOT running', 'red');
    log(`   Error: ${error.message}`, 'red');
    log('   💡 Start with: npm run dev', 'yellow');
    return false;
  }
}

async function testAIService() {
  log('\n🧪 Testing AI Service...', 'cyan');
  
  try {
    const response = await makeRequest(`${AI_SERVICE_URL}/health`);
    
    if (response.status === 200) {
      const data = JSON.parse(response.data);
      if (data.status === 'healthy') {
        log('✅ AI Service is healthy', 'green');
        log(`   Status: ${data.status}`, 'cyan');
        return true;
      }
    }
    
    log(`⚠️  AI Service returned unexpected response`, 'yellow');
    return false;
  } catch (error) {
    log('❌ AI Service is NOT running', 'red');
    log(`   Error: ${error.message}`, 'red');
    log('   💡 Start with: cd ai-service && uvicorn main:app --reload --port 8000', 'yellow');
    return false;
  }
}

async function testMongoDB() {
  log('\n🧪 Testing MongoDB Connection...', 'cyan');
  
  try {
    // Test by calling an API that uses MongoDB
    const response = await makeRequest(`${NEXTJS_URL}/api/admin/users`);
    
    if (response.status === 200 || response.status === 401) {
      log('✅ MongoDB connection working', 'green');
      log('   (API endpoint responded)', 'cyan');
      return true;
    } else {
      log(`⚠️  API returned status: ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log('❌ MongoDB connection test failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    log('   💡 Check MONGODB_URI in .env', 'yellow');
    return false;
  }
}

async function testAPIEndpoints() {
  log('\n🧪 Testing API Endpoints...', 'cyan');
  
  const endpoints = [
    '/api/admin/users',
    '/api/admin/classes',
    '/api/attendance'
  ];
  
  let passed = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${NEXTJS_URL}${endpoint}`);
      
      if (response.status === 200 || response.status === 401) {
        log(`✅ ${endpoint}`, 'green');
        passed++;
      } else {
        log(`⚠️  ${endpoint} - Status: ${response.status}`, 'yellow');
      }
    } catch (error) {
      log(`❌ ${endpoint} - ${error.message}`, 'red');
    }
  }
  
  log(`\n   ${passed}/${endpoints.length} endpoints working`, 'cyan');
  return passed === endpoints.length;
}

async function runAllTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║           Backend Testing - Health Check                  ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  const results = {
    nextjs: await testNextJS(),
    aiService: await testAIService(),
    mongodb: await testMongoDB(),
    apiEndpoints: await testAPIEndpoints()
  };
  
  // Summary
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    Test Summary                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');
  
  log(`Next.js Backend:    ${results.nextjs ? '✅ PASS' : '❌ FAIL'}`, results.nextjs ? 'green' : 'red');
  log(`AI Service:         ${results.aiService ? '✅ PASS' : '❌ FAIL'}`, results.aiService ? 'green' : 'red');
  log(`MongoDB:            ${results.mongodb ? '✅ PASS' : '❌ FAIL'}`, results.mongodb ? 'green' : 'red');
  log(`API Endpoints:      ${results.apiEndpoints ? '✅ PASS' : '❌ FAIL'}`, results.apiEndpoints ? 'green' : 'red');
  
  const allPassed = Object.values(results).every(r => r);
  
  console.log('\n');
  if (allPassed) {
    log('╔════════════════════════════════════════════════════════════╗', 'green');
    log('║              ✅ ALL TESTS PASSED! ✅                       ║', 'green');
    log('║         Backend is working correctly!                      ║', 'green');
    log('╚════════════════════════════════════════════════════════════╝', 'green');
  } else {
    log('╔════════════════════════════════════════════════════════════╗', 'red');
    log('║              ❌ SOME TESTS FAILED ❌                       ║', 'red');
    log('║         Check the errors above                             ║', 'red');
    log('╚════════════════════════════════════════════════════════════╝', 'red');
  }
  
  console.log('\n');
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n');
  log(`Test runner crashed: ${error.message}`, 'red');
  process.exit(1);
});
