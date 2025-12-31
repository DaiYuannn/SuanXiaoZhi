import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5177/api/v1';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('Testing Family API...');

  // 0. Setup: Get User IDs
  const user1 = await prisma.user.findUnique({ where: { username: 'test_user_01' } });
  const user2 = await prisma.user.findUnique({ where: { username: 'test_user_02' } });

  if (!user1 || !user2) {
    console.error('Test users not found. Run seed script first.');
    return;
  }

  // Clean up previous test data
  await prisma.ledger.deleteMany({ where: { familyId: { not: null } } });
  await prisma.user.updateMany({ where: { id: { in: [user1.id, user2.id] } }, data: { familyId: null } });
  await prisma.family.deleteMany({ where: { members: { some: { id: user1.id } } } });
  
  console.log('Cleaned up previous family data.');

  // Wait for server to be ready
  let retries = 5;
  while (retries > 0) {
    try {
      await fetch(`${BASE_URL}/health`);
      break;
    } catch (e) {
      console.log(`Waiting for server... (${retries} left)`);
      await sleep(2000);
      retries--;
    }
  }

  // 1. Create Family
  console.log('1. Creating Family...');
  const res1 = await fetch(`${BASE_URL}/family`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user1.id,
      name: '幸福一家人',
      description: 'Our shared financial space'
    })
  });
  const json1: any = await res1.json();
  console.log('Create Family Result:', json1);

  if (json1.code !== 0) throw new Error('Failed to create family');
  const familyId = json1.data.id;

  // 2. Add Member
  console.log('2. Adding Member (test_user_02)...');
  const res2 = await fetch(`${BASE_URL}/family/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user1.id, // Requester
      username: 'test_user_02',
      role: 'MEMBER'
    })
  });
  const json2: any = await res2.json();
  console.log('Add Member Result:', json2);

  // 3. Create Shared Ledger
  console.log('3. Creating Shared Ledger...');
  const res3 = await fetch(`${BASE_URL}/family/ledgers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user1.id,
      name: '家庭公共基金',
      type: 'SHARED',
      description: 'For groceries and utilities'
    })
  });
  const json3: any = await res3.json();
  console.log('Create Ledger Result:', json3);

  // 4. Get Family Details
  console.log('4. Getting Family Details...');
  const res4 = await fetch(`${BASE_URL}/family?userId=${user1.id}`);
  const json4: any = await res4.json();
  console.log('Get Family Result:', JSON.stringify(json4, null, 2));

  if (json4.data.members.length !== 2) {
    throw new Error('Expected 2 members in family');
  }
  if (json4.data.ledgers.length !== 1) {
    throw new Error('Expected 1 shared ledger');
  }

  console.log('Family API Test Passed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
