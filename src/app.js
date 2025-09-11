//  CONFIGURACIÓN PRINCIPAL DE EXPRESS
// Este archivo configura toda la aplicación web

//  Importación de dependencias principales
const express = require('express');           // Framework web para Node.js
const cors = require('cors');                 // Permite peticiones desde otros dominios
const helmet = require('helmet');             // Agrega headers de seguridad HTTP
const morgan = require('morgan');             // Logger de peticiones HTTP
const rateLimit = require('express-rate-limit'); // Limita número de peticiones por IP

//  Importación de rutas (endpoints de la API)
const authRoutes = require('./routes/auth.routes');         // Rutas de autenticación (/api/auth)
const clientesRoutes = require('./routes/clientes.route');  // Rutas de clientes (/api/clientes)
const comprasRoutes = require('./routes/compras.route');    // Rutas de compras (/api/compras)

//  Importación de middlewares personalizados
const errorHandler = require('./middlewares/errorHandler.middleware');  // Maneja errores globalmente
const jsonSerializationMiddleware = require('./middlewares/json.middleware'); // Serializa BigInt y Date automáticamente

//  Crear instancia de Express
// Esta es la aplicación principal que manejará todas las peticiones HTTP
const app = express();

//  MIDDLEWARE DE SERIALIZACIÓN JSON (DEBE IR PRIMERO)
// Convierte automáticamente BigInt y Date a strings en TODAS las respuestas
app.use(jsonSerializationMiddleware);

//  MIDDLEWARES DE SEGURIDAD
// Estos se ejecutan ANTES de procesar cualquier petición

// Helmet agrega headers de seguridad automáticamente
// Ejemplo: X-Content-Type-Options, X-Frame-Options, etc.
app.use(helmet());

// CORS (Cross-Origin Resource Sharing) permite que el frontend pueda hacer peticiones
// Solo permite peticiones desde la URL definida en FRONTEND_URL (.env)
app.use(cors({
  origin: process.env.FRONTEND_URL,  // Solo permite peticiones desde http://localhost:3000
  credentials: true                   // Permite envío de cookies y headers de autorización
}));

// 🚦 LIMITADOR DE PETICIONES (Rate Limiting)
// Previene ataques de fuerza bruta y spam
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos en milisegundos
  max: 100                   // Máximo 100 peticiones por IP cada 15 minutos
  // Si se supera el límite, responde con error 429 (Too Many Requests)
});
app.use(limiter);

//  MIDDLEWARES GENERALES
// Estos procesan y transforman las peticiones entrantes

// Morgan registra información de cada petición HTTP en la consola
// 'combined' es un formato que incluye: IP, método, URL, status, tiempo, etc.
app.use(morgan('combined'));

// express.json() convierte el body de las peticiones JSON en objetos JavaScript
// limit: '10mb' permite archivos JSON de hasta 10MB
app.use(express.json({ limit: '10mb' }));

// express.urlencoded() convierte datos de formularios HTML en objetos JavaScript
// extended: true permite objetos y arrays anidados en los formularios
app.use(express.urlencoded({ extended: true }));

//  HEALTH CHECK
// Endpoint simple para verificar que el servidor está funcionando
// GET /health responde con estado OK y timestamp
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString() 
  });
});

// RUTAS PRINCIPALES DE LA API
// Todas las rutas que empiecen con /api/auth van al router de autenticación
// Ejemplo: POST /api/auth/login -> va a authRoutes
app.use('/api/auth', authRoutes);

// Todas las rutas que empiecen con /api/clientes van al router de clientes
// Ejemplo: GET /api/clientes -> va a clientesRoutes  
app.use('/api/clientes', clientesRoutes);

// Todas las rutas que empiecen con /api/compras van al router de compras
// Ejemplo: GET /api/compras -> va a comprasRoutes
app.use('/api/compras', comprasRoutes);

//  MANEJO DE RUTAS NO ENCONTRADAS (404)
// Si ninguna ruta anterior coincide, ejecuta este middleware
// Responde con error 404 para cualquier endpoint que no exista
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

//  MANEJO GLOBAL DE ERRORES
// Este middleware se ejecuta cuando cualquier parte de la app lanza un error
// Debe ir al final de todos los middlewares
app.use(errorHandler);

//  EXPORTAR LA APLICACIÓN
// Permite que server.js importe y use esta configuración
module.exports = app;