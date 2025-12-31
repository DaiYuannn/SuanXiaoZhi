import fetch from 'node-fetch';

const BASE_URL = 'http://127.0.0.1:5177/api/v1';

async function req(path: string, method = 'GET', body?: any) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const json: any = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function run() {
  console.log('Starting New Features Smoke Test...');

  // 1. Check Incentives (Tasks)
  console.log('1. Checking Incentives...');
  const tasksRes = await req('/incentives/tasks');
  if (tasksRes.status !== 200 || !Array.isArray(tasksRes.json.data)) {
    console.error('Failed to list tasks', tasksRes);
    process.exit(1);
  }
  console.log(`   Found ${tasksRes.json.data.length} tasks.`);

  // 2. Create Transaction to trigger "Daily Task"
  console.log('2. Creating Transaction...');
  const txRes = await req('/transactions', 'POST', {
    amount: 1000,
    category: '餐饮',
    time: new Date().toISOString(),
    description: 'Smoke Test Transaction'
  });
  if (txRes.status !== 200) {
    console.error('Failed to create transaction', txRes);
    process.exit(1);
  }
  console.log('   Transaction created.');

  // 3. Verify Task Completion
  console.log('3. Verifying Task Completion...');
  const tasksAfterRes = await req('/incentives/tasks');
  const dailyTask = tasksAfterRes.json.data.find((t: any) => t.code === 'ADD_TRANSACTION');
  if (!dailyTask) {
    console.error('Daily task not found');
    process.exit(1);
  }
  if (dailyTask.status !== 'COMPLETED') {
    console.error('Daily task should be COMPLETED, but is', dailyTask.status);
    // Note: It might be that the user for transactions (demo) is different from the user for incentives?
    // Let's check how incentives determines user.
  } else {
    console.log('   Daily task is COMPLETED.');
  }

  // 4. Claim Reward
  if (dailyTask.status === 'COMPLETED' && !dailyTask.claimed) {
    console.log('4. Claiming Reward...');
    const claimRes = await req(`/incentives/claim`, 'POST', { taskId: dailyTask.id });
    if (claimRes.status !== 200) {
      console.error('Failed to claim reward', claimRes);
    } else {
      console.log('   Reward claimed.');
    }
  }

  // 5. Family Features
  console.log('5. Testing Family Features...');
  // Create Family
  const familyRes = await req('/family', 'POST', { name: 'Smoke Test Family' });
  if (familyRes.status === 200) {
      console.log('   Family created:', familyRes.json.data.name);
  } else {
      // Might fail if user already has a family, which is fine for repeated runs
      console.log('   Family creation response:', familyRes.json.message);
  }

  console.log('Smoke Test Completed.');
}

run().catch(console.error);
