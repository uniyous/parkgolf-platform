import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function updateUserPasswords() {
  console.log('Starting user password update process...');
  
  try {
    // Get all users from the database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      }
    });

    console.log(`Found ${users.length} users to update`);
    
    if (users.length === 0) {
      console.log('No users found in the database');
      return;
    }

    // Hash the new password
    const newPassword = 'user123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log(`Generated hashed password for: ${newPassword}`);

    // Update all user passwords
    const updateResult = await prisma.user.updateMany({
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      }
    });

    console.log(`Successfully updated ${updateResult.count} user passwords`);
    
    // Display updated users
    console.log('\nUpdated users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user.id}) - ${user.name || 'No name'} - Active: ${user.isActive}`);
    });
    
    console.log(`\n✅ All user passwords have been updated to: ${newPassword}`);
    console.log('🔐 Passwords are properly hashed with bcrypt (salt rounds: 10)');
    
  } catch (error) {
    console.error('❌ Error updating user passwords:', error);
    throw error;
  }
}

async function main() {
  try {
    await updateUserPasswords();
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('Database connection closed');
  }
}

// Run the script
main();