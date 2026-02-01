// Quick test of the build service
// Run with: node test-build.js

const { spawn } = require('child_process');
const path = require('path');

const PREBID_SOURCE_DIR = path.join(__dirname, 'prebid-builds/prebid-source');

console.log('Testing Prebid.js build...');
console.log('Source directory:', PREBID_SOURCE_DIR);

// Test with a few bidders only
const modules = ['rubiconBidAdapter', 'appnexusBidAdapter'];
const moduleList = modules.join(',');

console.log('\nBuilding with modules:', moduleList);
console.log('\nExecuting: npx gulp build-bundle-prod --modules=' + moduleList);
console.log('\n--- BUILD OUTPUT ---\n');

const buildProcess = spawn('npx', ['gulp', 'build-bundle-prod', '--modules', moduleList], {
  cwd: PREBID_SOURCE_DIR,
  env: { ...process.env },
  shell: true,
});

buildProcess.stdout.on('data', (data) => {
  process.stdout.write(data.toString());
});

buildProcess.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

buildProcess.on('close', (code) => {
  console.log('\n--- BUILD COMPLETE ---');
  console.log('Exit code:', code);

  if (code === 0) {
    console.log('✅ Build successful!');
    console.log('\nOutput file should be at:', path.join(PREBID_SOURCE_DIR, 'build/dist/prebid.js'));
  } else {
    console.log('❌ Build failed');
  }
});

buildProcess.on('error', (err) => {
  console.error('❌ Build process error:', err);
});
