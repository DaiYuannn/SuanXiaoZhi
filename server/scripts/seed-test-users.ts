import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEST_USERS = [
  { username: 'shupukeji01', role: 'tester' },
  { username: 'shupukeji02', role: 'tester' },
  { username: 'shupukeji03', role: 'tester' },
  { username: 'shupukeji04', role: 'tester' },
  { username: 'shupukeji05', role: 'tester' },
];

const DEFAULT_PASSWORD = 'Test@12345';

async function main() {
  console.log('Seeding login-capable test users...');

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, saltRounds);

  for (const user of TEST_USERS) {
    const created = await prisma.user.upsert({
      where: { username: user.username },
      update: {
        passwordHash,
        role: user.role,
        isActive: true,
      },
      create: {
        username: user.username,
        passwordHash,
        role: user.role,
        isActive: true,
      },
    });
    console.log(`Ensured user ${created.username}`);
  }

  console.log('Seed test users completed. Default password:', DEFAULT_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
