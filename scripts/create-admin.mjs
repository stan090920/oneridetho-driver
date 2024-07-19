import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Saunders090920', 10);

  const admin = await prisma.admin.create({
    data: {
      email: 'kenya.fleureny@gmail.com',
      password,
      name: 'Kenya Saunders',
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
