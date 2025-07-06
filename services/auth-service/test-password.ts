import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: 'king' }
  });
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log('User found:', user.username);
  console.log('Testing password: king1234');
  
  const isValid = await bcrypt.compare('king1234', user.password);
  console.log('Password valid:', isValid);
  
  // Also test the hash directly
  const testHash = await bcrypt.hash('king1234', 10);
  console.log('New hash for king1234:', testHash);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });