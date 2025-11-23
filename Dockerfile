# Usar Node.js 20 LTS como imagen base (más reciente y estable)
FROM node:20-alpine

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache openssl

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Copiar Prisma schema primero
COPY prisma ./prisma

# Generar cliente Prisma (necesario antes de copiar el código)
RUN npx prisma generate

# Copiar el resto del código
COPY . .

# Exponer puerto 3001
EXPOSE 3001

# Comando para iniciar la aplicación
CMD ["node", "server.js"]