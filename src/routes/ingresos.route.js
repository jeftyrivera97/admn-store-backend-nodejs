//  RUTAS DE INGRESOS
// Este archivo define todas las rutas para gestionar ingresos (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const { body } = require('express-validator');           // Para validar datos
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const {
    getIngresos,     // Obtener lista de ingresos
    createIngreso,   // Crear nueva ingreso
    updateIngreso,   // Actualizar ingreso existente
    deleteIngreso,   // DELETE /api/ingresos/:id
    getIngresoById   // GET /api/ingresos/:id
} = require('../controllers/ingresos.controller');

// Crear router para agrupar rutas de ingresos
const router = express.Router();

//  VALIDACIONES PARA GASTO
// Reglas que deben cumplir los datos al crear o actualizar un ingreso
const ingresoValidation = [
    // Código de ingreso es obligatorio
    body('codigo_ingreso')
        .notEmpty()
        .withMessage('Código de ingreso es requerido'),

    // Fecha es obligatoria
    body('fecha')
        .notEmpty()
        .withMessage('Fecha es requerida'),

    // Categoría es obligatoria
    body('id_categoria')
        .notEmpty()
        .withMessage('Categoría es requerida'),

    // Proveedor es obligatorio
    body('descripcion')
        .notEmpty()
        .withMessage('Proveedor es requerido'),
    // Total es obligatorio
    body('total')
        .notEmpty()
        .withMessage('Total es requerido')
];

//   MIDDLEWARE DE AUTENTICACIÓN GLOBAL
// TODAS las rutas de ingresos requieren estar autenticado
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación
// IMPORTANTE: Rutas específicas (:id) DEBEN ir ANTES que rutas genéricas (/)

// GET /api/ingresos/:id - Obtener ingreso por ID (DEBE IR PRIMERO)
router.get('/:id', getIngresoById);

// GET /api/ingresos - Obtener lista de ingresos con paginación
router.get('/', getIngresos);

// POST /api/ingresos - Crear nueva ingreso
router.post('/', ingresoValidation, createIngreso);

// PUT /api/ingresos/:id - Actualizar ingreso por ID
router.put('/:id', ingresoValidation, updateIngreso);

// DELETE /api/ingresos/:id - Eliminar ingreso por ID
router.delete('/:id', deleteIngreso);

// 📤 Exportar router
module.exports = router;