import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const hashedPassword = await bcrypt.hash('king1234', 10);
  
  const testUser = await prisma.user.upsert({
    where: { username: 'king' },
    update: {},
    create: {
      username: 'king',
      email: 'king@parkgolf.com',
      password: hashedPassword,
      name: 'Test King User',
      roles: [Role.ADMIN],
      isActive: true,
    },
  });

  console.log('Created test user:', testUser);

  // Create additional test users
  const users = [
    {
      username: 'user1',
      email: 'user1@parkgolf.com',
      password: 'user1234',
      name: 'Test User 1',
      roles: [Role.USER],
    },
    {
      username: 'moderator',
      email: 'moderator@parkgolf.com',
      password: 'mod1234',
      name: 'Test Moderator',
      roles: [Role.MODERATOR],
    },
  ];

  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: {
        ...userData,
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log('Created user:', user.username);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });