// SINGLETON DE PRISMA CLIENT
// Evita crear múltiples instancias de Prisma Client y problemas de conexiones

const { PrismaClient } = require('../generated/prisma');

// Variable global para mantener la instancia única
let prisma;

/**
 * Obtiene o crea una instancia única de Prisma Client
 * @returns {PrismaClient} Instancia singleton de Prisma
 */
function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    // Manejar cierre graceful
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
    });
  }

  return prisma;
}

module.exports = getPrismaClient();
