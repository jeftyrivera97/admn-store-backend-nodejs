//  RUTAS DE COMPROBANTES
// Este archivo define todas las rutas para gestionar comprobantes (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const { body } = require('express-validator');           // Para validar datos
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const {
    getComprobantes,     // Obtener lista de comprobantes
    createComprobante,   // Crear nueva comprobante
    updateComprobante,   // Actualizar comprobante existente
    deleteComprobante,   // DELETE /api/comprobantes/:id
    getComprobanteById   // GET /api/comprobantes/:id
} = require('../controllers/comprobantes.controller');

// Crear router para agrupar rutas de comprobantes
const router = express.Router();

//  VALIDACIONES PARA COMPROBANTE
// Reglas que deben cumplir los datos al crear o actualizar un comprobante
const comprobanteValidation = [
    // Código de comprobante es obligatorio
    body('codigo_comprobante')
        .notEmpty()
        .withMessage('Código de comprobante es requerido'),

    // Fecha es obligatoria
    body('fecha_apertura')
        .notEmpty()
        .withMessage('Fecha es requerida'),

    // Categoría es obligatoria
    body('total')
        .notEmpty()
        .withMessage('Total es requerido'),

    // Proveedor es obligatorio
    body('total_contado')
        .notEmpty()
        .withMessage('Total contado es requerido'),

];

//   MIDDLEWARE DE AUTENTICACIÓN GLOBAL
// TODAS las rutas de comprobantes requieren estar autenticado
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación
// IMPORTANTE: Rutas específicas (:id) DEBEN ir ANTES que rutas genéricas (/)

// GET /api/comprobantes/:id - Obtener comprobante por ID (DEBE IR PRIMERO)
router.get('/:id', getComprobanteById);

// GET /api/comprobantes - Obtener lista de comprobantes con paginación
router.get('/', getComprobantes);

// PUT /api/comprobantes/:id - Actualizar comprobante por ID
router.put('/:id', comprobanteValidation, updateComprobante);

// DELETE /api/comprobantes/:id - Eliminar comprobante por ID
router.delete('/:id', deleteComprobante);

// 📤 Exportar router
module.exports = router;