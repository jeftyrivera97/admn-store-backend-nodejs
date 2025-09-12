//  RUTAS DE GASTOS
// Este archivo define todas las rutas para gestionar gastos (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const { body } = require('express-validator');           // Para validar datos
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const {
    getGastos,     // Obtener lista de gastos
    createGasto,   // Crear nueva gasto
    updateGasto,   // Actualizar gasto existente
    deleteGasto,   // DELETE /api/gastos/:id
    getGastoById   // GET /api/gastos/:id
} = require('../controllers/gastos.controller');

// Crear router para agrupar rutas de gastos
const router = express.Router();

//  VALIDACIONES PARA GASTO
// Reglas que deben cumplir los datos al crear o actualizar un gasto
const gastoValidation = [
    // Código de gasto es obligatorio
    body('codigo_gasto')
        .notEmpty()
        .withMessage('Código de gasto es requerido'),

    // Fecha es obligatoria
    body('fecha')
        .notEmpty()
        .withMessage('Fecha es requerida'),

    // Categoría es obligatoria
    body('id_categoria')
        .notEmpty()
        .withMessage('Categoría es requerida'),

    // Descripción es obligatoria
    body('descripcion')
        .notEmpty()
        .withMessage('Descripción es requerida'),
    // Total es obligatorio
    body('total')
        .notEmpty()
        .withMessage('Total es requerido')
];

//   MIDDLEWARE DE AUTENTICACIÓN GLOBAL
// TODAS las rutas de gastos requieren estar autenticado
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación
// IMPORTANTE: Rutas específicas (:id) DEBEN ir ANTES que rutas genéricas (/)

// GET /api/gastos/:id - Obtener gasto por ID (DEBE IR PRIMERO)
router.get('/:id', getGastoById);

// GET /api/gastos - Obtener lista de gastos con paginación
router.get('/', getGastos);

// POST /api/gastos - Crear nueva gasto
router.post('/', gastoValidation, createGasto);

// PUT /api/gastos/:id - Actualizar gasto por ID
router.put('/:id', gastoValidation, updateGasto);

// DELETE /api/gastos/:id - Eliminar gasto por ID
router.delete('/:id', deleteGasto);

// Exportar router
module.exports = router;