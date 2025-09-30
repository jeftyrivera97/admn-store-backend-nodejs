//  RUTAS DE CATEGORIAS
// Este archivo define todas las rutas para gestionar areas (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const { getAreaEmpleadoById, getAreasEmpleados } = require('../controllers/areas-empleados.controller');

// Crear router para agrupar rutas de areas
const router = express.Router();

//   MIDDLEWARE DE AUTENTICACIÓN GLOBAL
// TODAS las rutas de areas requieren estar autenticado
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación
// IMPORTANTE: Rutas específicas (:id) DEBEN ir ANTES que rutas genéricas (/)

// GET /api/areas/:id - Obtener area por ID (DEBE IR PRIMERO)
router.get('/empleados/:id', getAreaEmpleadoById);

// GET /api/areas - Obtener lista de areas con paginación
router.get('/empleados', getAreasEmpleados);


// 📤 Exportar router
module.exports = router;