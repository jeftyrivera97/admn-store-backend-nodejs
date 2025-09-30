# Usar Node.js 18 LTS como imagen base
FROM node:18-alpine

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache openssl

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar todas las dependencias (incluidas dev para Prisma)
RUN npm ci

# Copiar el resto del código
COPY . .

# Generar cliente Prisma
RUN npx prisma generate

# Eliminar dependencias de desarrollo para reducir tamaño
RUN npm prune --production

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Cambiar propiedad de archivos al usuario nodejs
USER nodejs

# Exponer puerto 3001
EXPOSE 3001

# Comando para iniciar la aplicación
CMD ["npm", "start"]