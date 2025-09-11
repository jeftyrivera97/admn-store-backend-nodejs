//  RUTAS DE COMPRAS
// Este archivo define todas las rutas para gestionar compras (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const { body } = require('express-validator');           // Para validar datos
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const {
    getCompras,     // Obtener lista de compras
    createCompra,   // Crear nueva compra
    updateCompra,   // Actualizar compra existente
    deleteCompra,   // DELETE /api/compras/:id
    getCompraById   // GET /api/compras/:id
} = require('../controllers/compras.controller');

// Crear router para agrupar rutas de compras
const router = express.Router();

//  VALIDACIONES PARA COMPRA
// Reglas que deben cumplir los datos al crear o actualizar una compra
const compraValidation = [
    // Código de compra es obligatorio
    body('codigo_compra')
        .notEmpty()
        .withMessage('Código de compra es requerido'),

    // Fecha es obligatoria
    body('fecha')
        .notEmpty()
        .withMessage('Fecha es requerida'),

    // Categoría es obligatoria
    body('id_categoria')
        .notEmpty()
        .withMessage('Categoría es requerida'),

    // Proveedor es obligatorio
    body('id_proveedor')
        .notEmpty()
        .withMessage('Proveedor es requerido'),

    body('id_tipo_operacion')
        .notEmpty()
        .withMessage('Tipo de operación es requerido'),

    body('gravado15')
        .notEmpty()
        .withMessage('Gravado 15% es requerido'),

    body('gravado18')
        .notEmpty()
        .withMessage('Gravado 18% es requerido'),

    body('impuesto15')
        .notEmpty()
        .withMessage('Impuesto 15% es requerido'),
    body('impuesto18')
        .notEmpty()
        .withMessage('Impuesto 18% es requerido'),
    body('exento')
        .notEmpty()
        .withMessage('Exento es requerido'),
    body('exonerado')
        .notEmpty()
        .withMessage('Exonerado es requerido'),

    // Total es obligatorio
    body('total')
        .notEmpty()
        .withMessage('Total es requerido')
];

//   MIDDLEWARE DE AUTENTICACIÓN GLOBAL
// TODAS las rutas de compras requieren estar autenticado
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación
// IMPORTANTE: Rutas específicas (:id) DEBEN ir ANTES que rutas genéricas (/)

// GET /api/compras/:id - Obtener compra por ID (DEBE IR PRIMERO)
router.get('/:id', getCompraById);

// GET /api/compras - Obtener lista de compras con paginación
router.get('/', getCompras);

// POST /api/compras - Crear nueva compra
router.post('/', compraValidation, createCompra);

// PUT /api/compras/:id - Actualizar compra por ID
router.put('/:id', compraValidation, updateCompra);

// DELETE /api/compras/:id - Eliminar compra por ID
router.delete('/:id', deleteCompra);

// 📤 Exportar router
module.exports = router;