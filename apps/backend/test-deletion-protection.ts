import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDeletionProtection() {
  console.log('🧪 Testing deletion protection...\n');

  try {
    await prisma.$executeRaw`DELETE FROM clients WHERE id = 'default-client'`;

    console.log('❌ DELETION SUCCEEDED - TRIGGER FAILED');
    console.log('   Bootstrap client was deleted - system is UNSAFE');
    process.exit(1);

  } catch (error: any) {
    if (error.message && error.message.includes('Cannot delete bootstrap client')) {
      console.log('✅ DELETION BLOCKED - Trigger working correctly');
      console.log(`   Error: ${error.message}`);
      console.log('\n✅ Deletion protection verified');
    } else {
      console.log('❌ UNEXPECTED ERROR:', error.message);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDeletionProtection();
