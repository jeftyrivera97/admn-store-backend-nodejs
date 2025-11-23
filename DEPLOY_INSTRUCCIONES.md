# 🚀 Instrucciones de Deploy en Dokploy

## ⚠️ Cambio Importante Realizado

Se modificó `server.js` para escuchar en `0.0.0.0` (necesario para Docker):

```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
});
```

## 📋 Variables de Entorno en Dokploy

**Configura estas variables en la sección "Environment Variables" de tu aplicación:**

```env
DATABASE_URL=postgresql://postgres:TU_PASSWORD@TU_HOST:5432/souvenirbd?schema=public
JWT_SECRET=b87d321b84f8a288932ab2a3bb0ed0ce871c656f38dfb553f14117f424b22c69d2eaecd93d4e45ba2d7ed2535ef4b96072ad906af46102bebf4ffef91be90d4a
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://administracion.elbuenamigosouvenir.site
```

### ⚠️ Importante - Reemplaza estos valores:

1. **DATABASE_URL**: 
   - Obtén el host y password de tu PostgreSQL en Dokploy
   - Ejemplo: `postgresql://postgres:mipassword@postgres-xxxx.dokploy.com:5432/souvenirbd?schema=public`

2. **TU_HOST**: El host de PostgreSQL que te da Dokploy (algo como `postgres-xxxx.dokploy.com`)

3. **TU_PASSWORD**: La contraseña de tu base de datos PostgreSQL en Dokploy

## 🔍 Verificar que el Deploy Funcionó

### 1. Ver los logs en Dokploy

Deberías ver:
```
🚀 Servidor corriendo en http://0.0.0.0:3001
```

### 2. Verificar el health check

Desde tu máquina local:
```bash
curl https://api.elbuenamigosouvenir.site/health
```

Debería responder:
```json
{"status":"OK","timestamp":"2025-11-23T04:20:00.000Z"}
```

### 3. Probar el login (debe dar error 400 si no existe el usuario)

```bash
curl -X POST https://api.elbuenamigosouvenir.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' \
  -v
```

## 🐛 Si el Deploy Falla

### Error: "Can't reach database server"

❌ **Problema**: `DATABASE_URL` está mal configurada

✅ **Solución**: 
1. Ve a tu PostgreSQL en Dokploy
2. Copia la connection string exacta
3. Pégala en `DATABASE_URL`

### Error: "Port 3001 is already in use"

❌ **Problema**: Otro contenedor está usando el puerto

✅ **Solución**:
1. En Dokploy, detén la aplicación
2. Elimina contenedores viejos
3. Vuelve a hacer deploy

### Error: "Cannot find module './src/generated/prisma'"

❌ **Problema**: Prisma Client no se generó

✅ **Solución**:
- El Dockerfile ya tiene `RUN npx prisma generate`
- Verifica que el archivo `prisma/schema.prisma` esté en el repositorio
- Haz rebuild del contenedor en Dokploy

### Error 502 Bad Gateway

❌ **Problema**: El contenedor no está corriendo

✅ **Solución**:
1. Ver logs en Dokploy (sección Logs)
2. Buscar el error específico
3. Corregir y hacer redeploy

## 📝 Checklist de Deploy

- [ ] Commit y push de los cambios a GitHub
- [ ] Variables de entorno configuradas en Dokploy
- [ ] `DATABASE_URL` con el host y password correctos de Dokploy
- [ ] Deploy ejecutado
- [ ] Logs muestran "🚀 Servidor corriendo"
- [ ] Health check responde OK
- [ ] Frontend actualizado con la URL correcta: `https://api.elbuenamigosouvenir.site/api`

## 🌐 Configuración del Frontend

El frontend debe apuntar a:

```javascript
// axios.js o config.js
const API_BASE_URL = 'https://api.elbuenamigosouvenir.site/api'

// Ejemplo de uso:
axios.post(`${API_BASE_URL}/auth/login`, { email, password })
```

## ✅ Después del Deploy Exitoso

Una vez que el health check responda OK, el frontend debería poder:

1. ✅ Hacer login
2. ✅ Obtener datos de clientes, compras, gastos, etc.
3. ✅ Crear, editar y eliminar registros

## 🆘 Comandos Útiles para Debug

Si tienes acceso SSH al servidor de Dokploy:

```bash
# Ver logs del contenedor
docker logs $(docker ps -q --filter "name=souvenir") --tail 100

# Ver si el contenedor está corriendo
docker ps | grep souvenir

# Entrar al contenedor
docker exec -it $(docker ps -q --filter "name=souvenir") sh

# Probar el health check desde dentro del servidor
curl http://localhost:3001/health
```
