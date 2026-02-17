import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearMaterials() {
  try {
    console.log("Clearing all materials from database...");
    const result = await prisma.material.deleteMany({});
    console.log(`Deleted ${result.count} materials successfully!`);
    process.exit(0);
  } catch (error) {
    console.error("Error clearing materials:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearMaterials();
