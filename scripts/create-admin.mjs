import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('#George50', 10);

  const admin = await prisma.admin.create({
    data: {
      email: 'sydneyochieng06@gmail.com',
      password,
      name: 'Sydney',
    },
  });

  console.log('Admin created', admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
