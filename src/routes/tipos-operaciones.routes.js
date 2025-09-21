//  RUTAS DE TIPOS OPERACIONES
// Este archivo define todas las rutas para gestionar tipos de operaciones (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const { getTipoOperacionById, getTiposOperaciones } = require('../controllers/tipos-operaciones.controller');


// Crear router para agrupar rutas de tipos de operaciones
const router = express.Router();

//   MIDDLEWARE DE AUTENTICACIÓN GLOBAL
// TODAS las rutas de categorias requieren estar autenticado
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación
// IMPORTANTE: Rutas específicas (:id) DEBEN ir ANTES que rutas genéricas (/)

// GET /api/tiposOperaciones/:id - Obtener tipo de operación por ID (DEBE IR PRIMERO)
router.get('/:id', getTipoOperacionById);

// GET /api/tiposOperaciones - Obtener lista de tipos de operaciones con paginación
router.get('/', getTiposOperaciones);


// 📤 Exportar router
module.exports = router;