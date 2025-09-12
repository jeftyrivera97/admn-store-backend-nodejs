# 🏪 Store Backend

Sistema backend completo para gestión de sistema de Ingreso y Egresos de una tienda de venta de productos varios con operaciones CRUD, autenticación JWT, soft delete y API RESTful.

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-5.1.0-blue.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.16.0-brightgreen.svg)](https://prisma.io/)
[![Jest](https://img.shields.io/badge/Jest-30.1.3-red.svg)](https://jestjs.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-blue.svg)](https://postgresql.org/)

## 📋 Tabla de Contenidos

- [🚀 Características](#-características)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [⚙️ Instalación](#️-instalación)
- [🔧 Configuración](#-configuración)
- [📊 API Endpoints](#-api-endpoints)
- [🔐 Autenticación](#-autenticación)
- [🧪 Testing](#-testing)
- [📱 Uso](#-uso)
- [🔒 Seguridad](#-seguridad)
- [📈 Características Técnicas](#-características-técnicas)

## 🚀 Características

### ✨ Funcionalidades Principales
- 🔐 **Autenticación JWT** completa (registro, login, protección de rutas)
- 👥 **Gestión de Entidades**: Clientes, Empleados, Proveedores
- 💰 **Operaciones Financieras**: Compras, Ventas, Gastos, Ingresos
- 📊 **Administración**: Planillas, Comprobantes, Sesiones de Caja
- 🗂️ **Soft Delete** 
- 📄 **Paginación** automática en todas las listas
- 🔍 **Búsqueda** integrada en todos los endpoints
- 🛡️ **Validación** robusta de datos de entrada
- 📊 **Serialización** automática de BigInt y Date

### 🔧 Características Técnicas
- ⚡ **API RESTful** completa
- 🔄 **CRUD** completo para todas las entidades
- 🛠️ **Middleware** personalizado para autenticación y serialización
- 📝 **Logging** detallado con Morgan
- 🛡️ **Rate Limiting** para prevenir abuso
- ✅ **Testing** unitario e integración con Jest
- 🗄️ **ORM** con Prisma para PostgreSQL

## 🛠️ Stack Tecnológico

### 🖥️ Backend Core
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Node.js** | 18.x+ | Runtime de JavaScript |
| **Express.js** | 5.1.0 | Framework web |
| **Prisma** | 6.16.0 | ORM y cliente de base de datos |
| **PostgreSQL** | Latest | Base de datos principal |

### 🔐 Autenticación y Seguridad
| Paquete | Versión | Propósito |
|---------|---------|-----------|
| **jsonwebtoken** | 9.0.2 | Tokens JWT |
| **bcryptjs** | 3.0.2 | Hash de contraseñas |
| **helmet** | 8.1.0 | Headers de seguridad |
| **cors** | 2.8.5 | Cross-Origin Resource Sharing |
| **express-rate-limit** | 8.1.0 | Limitación de peticiones |

### ✅ Validación y Middleware
| Paquete | Versión | Propósito |
|---------|---------|-----------|
| **express-validator** | 7.2.1 | Validación de entrada |
| **morgan** | 1.10.1 | Logging HTTP |
| **dotenv** | 17.2.2 | Variables de entorno |

### 🧪 Testing
| Paquete | Versión | Propósito |
|---------|---------|-----------|
| **Jest** | 30.1.3 | Framework de testing |
| **Supertest** | 7.1.4 | Testing de APIs HTTP |
| **@types/jest** | 30.0.0 | Tipos TypeScript para Jest |

## 📁 Estructura del Proyecto

```
souvenir-backend/
├── 📁 src/
│   ├── 📁 controllers/           # Lógica de negocio
│   │   ├── auth.controller.js    # Autenticación
│   │   ├── clientes.controller.js
│   │   ├── compras.controller.js
│   │   ├── empleados.controller.js
│   │   ├── gastos.controller.js
│   │   ├── ingresos.controller.js
│   │   ├── planillas.controller.js
│   │   ├── proveedores.controller.js
│   │   ├── sesiones.controller.js
│   │   ├── ventas.controller.js
│   │   └── comprobantes.controller.js
│   │
│   ├── 📁 routes/                # Definición de rutas
│   │   ├── auth.routes.js
│   │   ├── clientes.route.js
│   │   ├── compras.route.js
│   │   ├── empleados.route.js
│   │   ├── gastos.route.js
│   │   ├── ingresos.route.js
│   │   ├── planillas.route.js
│   │   ├── proveedores.route.js
│   │   ├── sesiones.route.js
│   │   ├── ventas.routes.js
│   │   └── comprobantes.route.js
│   │
│   ├── 📁 middlewares/           # Middleware personalizado
│   │   ├── auth.middleware.js    # Verificación JWT
│   │   ├── json.middleware.js    # Serialización JSON
│   │   └── errorHandler.middleware.js
│   │
│   ├── 📁 generated/             # Código generado por Prisma
│   │   └── 📁 prisma/
│   │
│   ├── 📁 utils/                 # Utilidades
│   │   └── bigint.helper.js
│   │
│   └── app.js                    # Configuración principal
│
├── 📁 tests/                     # Tests automatizados
│   ├── 📁 unit/                  # Tests unitarios
│   ├── 📁 integration/           # Tests de integración
│   ├── 📁 helpers/              # Helpers para testing
│   ├── setup.js                 # Configuración global
│   └── env.setup.js             # Variables de entorno test
│
├── 📁 prisma/                    # Esquema de base de datos
│   └── schema.prisma
│
├── server.js                     # Punto de entrada
├── jest.config.js               # Configuración Jest
├── package.json                 # Dependencias y scripts
├── .env                         # Variables de entorno
└── README.md                    # Este archivo
```

## ⚙️ Instalación

### 📋 Prerrequisitos
- **Node.js** 18.x o superior
- **PostgreSQL** 12.x o superior
- **npm** o **yarn**

### 🔽 Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/usuario/souvenir-backend.git
cd souvenir-backend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus valores
```

4. **Configurar base de datos**
```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# (Opcional) Poblar con datos de prueba
npx prisma db seed
```

5. **Iniciar servidor**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🔧 Configuración

### 📝 Variables de Entorno (.env)

```env
# Servidor
PORT=3001
NODE_ENV=development

# Base de Datos
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/BDNAME"

# JWT
JWT_SECRET=tu-clave-secreta-super-larga-y-segura
JWT_EXPIRES_IN=7d

# Frontend (para CORS)
FRONTEND_URL=http://localhost:3000
```

### 🗄️ Base de Datos

El proyecto utiliza **PostgreSQL** con **Prisma** como ORM. La configuración se encuentra en `prisma/schema.prisma`.

**Modelos principales:**
- 👤 `usuarios` - Gestión de usuarios
- 👥 `clientes` - Información de clientes
- 🏢 `empleados` - Datos de empleados
- 🚚 `proveedores` - Información de proveedores
- 🛒 `compras` - Transacciones de compra
- 💰 `ventas` - Transacciones de venta
- 💸 `gastos` - Registro de gastos
- 💵 `ingresos` - Registro de ingresos
- 📊 `planillas` - Gestión de planillas
- 📄 `comprobantes` - Documentos fiscales
- 🏦 `cajas_sesiones` - Sesiones de caja

## 📊 API Endpoints

### 🔐 Autenticación
```http
POST /api/auth/register    # Registro de usuario
POST /api/auth/login       # Inicio de sesión
```

### 👥 Gestión de Entidades
```http
# CLIENTES
GET    /api/clientes           # Lista con paginación
GET    /api/clientes/:id       # Cliente específico
POST   /api/clientes           # Crear cliente
PUT    /api/clientes/:id       # Actualizar cliente
DELETE /api/clientes/:id       # Eliminar cliente (soft delete)

# EMPLEADOS
GET    /api/empleados          # Lista con paginación
GET    /api/empleados/:id      # Empleado específico
POST   /api/empleados          # Crear empleado
PUT    /api/empleados/:id      # Actualizar empleado
DELETE /api/empleados/:id      # Eliminar empleado (soft delete)

# PROVEEDORES
GET    /api/proveedores        # Lista con paginación
GET    /api/proveedores/:id    # Proveedor específico
POST   /api/proveedores        # Crear proveedor
PUT    /api/proveedores/:id    # Actualizar proveedor
DELETE /api/proveedores/:id    # Eliminar proveedor (soft delete)
```

###  Operaciones Financieras
```http
# COMPRAS
GET    /api/compras            # Lista con paginación
GET    /api/compras/:id        # Compra específica
POST   /api/compras            # Crear compra
PUT    /api/compras/:id        # Actualizar compra
DELETE /api/compras/:id        # Eliminar compra (soft delete)
POST   /api/compras/:id/detalles # Crear detalles de compra

# VENTAS
GET    /api/ventas             # Lista con paginación
GET    /api/ventas/:id         # Venta específica
POST   /api/ventas             # Crear venta
PUT    /api/ventas/:id         # Actualizar venta
DELETE /api/ventas/:id         # Eliminar venta (soft delete)

# GASTOS
GET    /api/gastos             # Lista con paginación
GET    /api/gastos/:id         # Gasto específico
POST   /api/gastos             # Crear gasto
PUT    /api/gastos/:id         # Actualizar gasto
DELETE /api/gastos/:id         # Eliminar gasto (soft delete)

# INGRESOS
GET    /api/ingresos           # Lista con paginación
GET    /api/ingresos/:id       # Ingreso específico
POST   /api/ingresos           # Crear ingreso
PUT    /api/ingresos/:id       # Actualizar ingreso
DELETE /api/ingresos/:id       # Eliminar ingreso (soft delete)
```

###  Administración
```http
# PLANILLAS
GET    /api/planillas          # Lista con paginación
GET    /api/planillas/:id      # Planilla específica
POST   /api/planillas          # Crear planilla
PUT    /api/planillas/:id      # Actualizar planilla
DELETE /api/planillas/:id      # Eliminar planilla (soft delete)

# COMPROBANTES
GET    /api/comprobantes       # Lista con paginación
GET    /api/comprobantes/:id   # Comprobante específico
POST   /api/comprobantes       # Crear comprobante
PUT    /api/comprobantes/:id   # Actualizar comprobante
DELETE /api/comprobantes/:id   # Eliminar comprobante (soft delete)

# SESIONES DE CAJA
GET    /api/sesiones           # Lista con paginación
GET    /api/sesiones/:id       # Sesión específica
POST   /api/sesiones           # Crear sesión
PUT    /api/sesiones/:id       # Actualizar sesión
DELETE /api/sesiones/:id       # Eliminar sesión (soft delete)
```

### Parámetros de Consulta

Todos los endpoints GET de lista soportan:

```http
GET /api/entidad?page=1&limit=10&search=texto
```

- `page`: Página actual (default: 1)
- `limit`: Elementos por página (default: 10)
- `search`: Término de búsqueda

### 📤 Estructura de Respuestas

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "Operación exitosa",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

**Respuesta de Error:**
```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": [ ... ]
}
```

## 🔐 Autenticación

### 🎫 JWT Token

Todas las rutas (excepto registro y login) requieren autenticación JWT.

**Header requerido:**
```http
Authorization: Bearer <tu-jwt-token>
```

### 📝 Registro de Usuario

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Usuario Test",
  "email": "test@example.com",
  "password": "contraseña123"
}
```

### 🔓 Inicio de Sesión

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "contraseña123"
}
```

## 🧪 Testing

### 🚀 Scripts de Testing

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Tests con coverage
npm run test:coverage

# Solo tests unitarios
npm test -- tests/unit

# Solo tests de integración
npm test -- tests/integration
```

### 📊 Tipos de Tests

1. **Tests Unitarios** - Funciones aisladas
   - Middlewares
   - Helpers
   - Utilidades

2. **Tests de Integración** - Endpoints completos
   - API endpoints
   - Autenticación
   - CRUD operations

3. **Tests E2E** - Flujos completos (por implementar)

### 📈 Coverage

El proyecto incluye configuración de coverage con Jest:

```bash
npm run test:coverage
```

## 📱 Uso

### 🔧 Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo (con nodemon)
npm run dev

# Servidor estará disponible en http://localhost:3001
```

### 🚀 Producción

```bash
# Iniciar en modo producción
npm start
```

### 🔍 Health Check

```http
GET /health
```

Respuesta:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔒 Seguridad

### 🛡️ Medidas Implementadas

- ✅ **Helmet** - Headers de seguridad HTTP
- ✅ **CORS** - Configurado para frontend específico
- ✅ **Rate Limiting** - 100 requests/15min por IP
- ✅ **JWT** - Tokens seguros con expiración
- ✅ **bcrypt** - Hash seguro de contraseñas (12 rounds)
- ✅ **Validación** - Validación robusta con express-validator
- ✅ **Environment Variables** - Configuración sensible en .env

### 🔐 Rate Limiting

- **Límite**: 100 peticiones por IP cada 15 minutos
- **Respuesta**: HTTP 429 cuando se excede

### 🔑 Contraseñas

- Hash con **bcryptjs** (12 rounds)
- Nunca se almacenan en texto plano
- Nunca se envían en respuestas API

## 📈 Características Técnicas

### ⚡ Rendimiento

- **Paginación** automática para prevenir sobrecarga
- **Queries paralelas** con Promise.all()
- **Índices** de base de datos optimizados
- **Middleware** de serialización eficiente

### 🔄 Serialización Automática

El middleware personalizado convierte automáticamente:
- **BigInt** → String
- **Date** → ISO String

### 🗂️ Soft Delete

Compatible con Laravel:
- Campo `deleted_at` para marcar eliminación
- Campo `id_estado` para estados lógicos
- Filtros automáticos en consultas

### 📝 Logging

- **Morgan** para logging HTTP
- **Console** para errores de aplicación
- Formato 'combined' para información detallada

---

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.


---

<div align="center">
  <strong>🏪 Store Backend - Sistema Completo de Gestión de Ingresos e Egresos</strong>
  <br>
  <em>Desarrollado en Node.js</em>
</div>
