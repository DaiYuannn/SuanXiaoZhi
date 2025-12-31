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
  console.log('Starting Shared Ledger Smoke Test...');

  // 1. Create Family
  console.log('1. Creating Family...');
  const familyRes = await req('/family', 'POST', { name: 'Ledger Test Family' });
  if (familyRes.status !== 200) {
      console.log('   Family creation response:', familyRes.json.message);
  } else {
      console.log('   Family created:', familyRes.json.data.name);
  }

  // 2. Get Ledgers
  console.log('2. Fetching Ledgers...');
  const ledgersRes = await req('/family/ledgers');
  if (ledgersRes.status !== 200 || !Array.isArray(ledgersRes.json.data)) {
      console.error('Failed to fetch ledgers', ledgersRes);
      process.exit(1);
  }
  const ledgers = ledgersRes.json.data;
  console.log(`   Found ${ledgers.length} ledgers.`);
  
  if (ledgers.length === 0) {
      console.error('No ledgers found, cannot proceed.');
      process.exit(1);
  }
  const familyLedger = ledgers[0];
  console.log(`   Using ledger: ${familyLedger.name} (${familyLedger.id})`);

  // 3. Create Transaction in Family Ledger
  console.log('3. Creating Transaction in Family Ledger...');
  const txCreateRes = await req('/transactions', 'POST', {
      amount: 5000,
      category: '家庭采购',
      time: new Date().toISOString(),
      description: 'Shared Ledger Test Transaction',
      ledgerId: familyLedger.id
  });
  if (txCreateRes.status !== 200) {
      console.error('Failed to create transaction', txCreateRes);
  } else {
      console.log('   Transaction created in ledger.');
  }

  // 4. List Transactions for Ledger
  console.log('4. Listing Transactions for Ledger...');
  const txRes = await req(`/transactions?ledgerId=${familyLedger.id}`);
  if (txRes.status !== 200) {
      console.error('Failed to list transactions', txRes);
  } else {
      console.log(`   Found ${txRes.json.data.list.length} transactions in ledger.`);
  }

  console.log('Shared Ledger Test Completed.');
}

run().catch(console.error);
