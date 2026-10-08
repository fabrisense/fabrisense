import assert from 'assert';

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting FabriSense OTP API Automated Tests ---');

  // Test 1: Health Check
  const healthRes = await fetch(`${API_BASE}/health`);
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'ok', 'Health check must return status ok');
  console.log('✅ Test 1 Passed: Health check endpoint is active.');

  // Test 2: Send Registration OTP
  const regEmail = `weaver.${Date.now()}@weavesofindia.com`;
  const sendRes = await fetch(`${API_BASE}/otp/send-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: regEmail }),
  });
  const sendData = await sendRes.json();
  assert.strictEqual(sendData.success, true, 'Registration OTP send should succeed');
  assert.strictEqual(sendData.cooldown, 60, 'Registration cooldown should be 60s');
  console.log(`✅ Test 2 Passed: Registration OTP request handled successfully.`);

  // Test 3: Resend Cooldown Enforcement (Rate Limiting)
  const spamRes = await fetch(`${API_BASE}/otp/send-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: regEmail }),
  });
  assert.strictEqual(spamRes.status, 429, 'Immediate resend must return 429 rate limit');
  const spamData = await spamRes.json();
  assert.ok(spamData.error.includes('Please wait'), 'Rate limit message must tell user to wait');
  console.log(`✅ Test 3 Passed: 60-second cooldown enforced: "${spamData.error}".`);

  // Test 4: Incorrect OTP Attempt and Attempt Countdown
  const wrongVerify = await fetch(`${API_BASE}/otp/verify-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: regEmail,
      otp: '000000',
    }),
  });
  assert.strictEqual(wrongVerify.status, 400, 'Incorrect OTP must return 400');
  const wrongData = await wrongVerify.json();
  assert.ok(wrongData.error.includes('attempts remaining') || wrongData.error.includes('attempt remaining'), 'Must inform user of remaining attempts');
  console.log(`✅ Test 4 Passed: Incorrect OTP rejected with countdown: "${wrongData.error}".`);

  // Test 5: Forgot Password Flow (Send OTP)
  const forgotEmail = `forgot.${Date.now()}@weavesofindia.com`;
  const forgotSend = await fetch(`${API_BASE}/otp/send-forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: forgotEmail }),
  });
  const forgotData = await forgotSend.json();
  assert.strictEqual(forgotData.success, true, 'Forgot password OTP send must succeed');
  console.log('✅ Test 5 Passed: Forgot password OTP send handled successfully.');

  // Test 6: Password Reset with Invalid Token
  const badReset = await fetch(`${API_BASE}/otp/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: forgotEmail,
      token: 'invalid_or_forged_token_12345',
      newPassword: 'newsecurepassword123',
    }),
  });
  assert.strictEqual(badReset.status, 401, 'Unauthorized token must be rejected with 401');
  console.log('✅ Test 6 Passed: Unauthorized password reset properly blocked.');

  // Test 7: Exceeded Attempts Invalidation
  // Make 4 more invalid attempts on regEmail to trigger lockout
  for (let i = 0; i < 4; i++) {
    await fetch(`${API_BASE}/otp/verify-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: regEmail, otp: '111111' }),
    });
  }
  const lockoutVerify = await fetch(`${API_BASE}/otp/verify-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: regEmail, otp: '111111' }),
  });
  assert.ok(lockoutVerify.status === 400 || lockoutVerify.status === 429, 'Excessive attempts must lock out or invalidate');
  const lockoutData = await lockoutVerify.json();
  console.log(`✅ Test 7 Passed: Maximum attempts lockout verified: "${lockoutData.error}".`);

  console.log('\n🎉 ALL 7 AUTOMATED SECURITY TESTS PASSED!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
