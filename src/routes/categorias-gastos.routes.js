//  RUTAS DE CATEGORIAS
// Este archivo define todas las rutas para gestionar categorias (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const { getCategoriaGastoById, getCategoriasGastos } = require('../controllers/categorias-gastos.controller');

// Crear router para agrupar rutas de categorias
const router = express.Router();

//   MIDDLEWARE DE AUTENTICACIÓN GLOBAL
// TODAS las rutas de categorias requieren estar autenticado
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación
// IMPORTANTE: Rutas específicas (:id) DEBEN ir ANTES que rutas genéricas (/)

// GET /api/categorias/:id - Obtener gastos por ID (DEBE IR PRIMERO)
router.get('/gastos/:id', getCategoriaGastoById);

// GET /api/categorias - Obtener lista de categorias con paginación
router.get('/gastos', getCategoriasGastos);


// 📤 Exportar router
module.exports = router;