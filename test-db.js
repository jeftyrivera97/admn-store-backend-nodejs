// Script simple para verificar la conexión a la base de datos
const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Intentando conectar a la base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión exitosa a la base de datos');
    
    // Intentar una query simple
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query de prueba exitosa:', result);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error.message);
    console.error('❌ DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'NO configurada');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
