//  RUTAS DE CATEGORIAS
// Este archivo define todas las rutas para gestionar categorias (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const { getCategoriaEmpleadoById, getCategoriasEmpleados } = require('../controllers/categorias-empleados.controller');

// Crear router para agrupar rutas de categorias
const router = express.Router();

//   MIDDLEWARE DE AUTENTICACIÓN GLOBAL
// TODAS las rutas de categorias requieren estar autenticado
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación
// IMPORTANTE: Rutas específicas (:id) DEBEN ir ANTES que rutas genéricas (/)

// GET /api/categorias/:id - Obtener empleado por ID (DEBE IR PRIMERO)
router.get('/empleados/:id', getCategoriaEmpleadoById);

// GET /api/categorias - Obtener lista de categorias con paginación
router.get('/empleados', getCategoriasEmpleados);


// 📤 Exportar router
module.exports = router;