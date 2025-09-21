//  RUTAS DE PLANILLAS
// Este archivo define todas las rutas para gestionar planillas (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const { body } = require('express-validator');           // Para validar datos
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const {
    getPlanillas,     // Obtener lista de planillas
    createPlanilla,   // Crear nueva planilla
    updatePlanilla,   // Actualizar planilla existente
    deletePlanilla,   // DELETE /api/planillas/:id
    getPlanillaById   // GET /api/planillas/:id
} = require('../controllers/planillas.controller');

// Crear router para agrupar rutas de planillas
const router = express.Router();

//  VALIDACIONES PARA PLANILLA
// Reglas que deben cumplir los datos al crear o actualizar un planilla
const planillaValidation = [
    // Código de planilla es obligatorio
    body('codigo_planilla')
        .notEmpty()
        .withMessage('Código de planilla es requerido'),

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
// TODAS las rutas de planillas requieren estar autenticado
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación
// IMPORTANTE: Rutas específicas (:id) DEBEN ir ANTES que rutas genéricas (/)

// GET /api/planillas/:id - Obtener planilla por ID (DEBE IR PRIMERO)
router.get('/:id', getPlanillaById);

// GET /api/planillas - Obtener lista de planillas con paginación
router.get('/', getPlanillas);

// POST /api/planillas - Crear nueva planilla
router.post('/', planillaValidation, createPlanilla);

// PUT /api/planillas/:id - Actualizar planilla por ID
router.put('/:id', planillaValidation, updatePlanilla);

// DELETE /api/planillas/:id - Eliminar planilla por ID
router.delete('/:id', deletePlanilla);

// Exportar router
module.exports = router;