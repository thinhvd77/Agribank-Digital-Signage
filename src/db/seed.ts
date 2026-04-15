import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run seed');
}

const adapter = new PrismaPg(new Pool({ connectionString: databaseUrl }));
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      isAdmin: true,
    },
  });

  const screens = [
    { name: 'Chi nhanh Ha Noi', location: 'Tang 1, sanh chinh', resolution: '1920x1080' },
    { name: 'Chi nhanh Ho Chi Minh', location: 'Tang 2, khu vuc giao dich', resolution: '1920x1080' },
    { name: 'Chi nhanh Da Nang', location: 'Tang 1, loi vao', resolution: '1920x1080' },
  ];

  for (const screen of screens) {
    await prisma.screen.upsert({
      where: { id: screen.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: screen,
    });
  }

  console.log('Seed completed: 1 admin user, 3 screens');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
