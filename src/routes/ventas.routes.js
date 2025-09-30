//  RUTAS DE VENTAS
// Este archivo define todas las rutas para gestionar ventas (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const { body } = require('express-validator');           // Para validar datos
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const {
    getVentas,     // Obtener lista de ventas
    createVenta,   // Crear nueva venta
    updateVenta,   // Actualizar venta existente
    deleteVenta,   // DELETE /api/ventas/:id
    getVentaById   // GET /api/ventas/:id
} = require('../controllers/ventas.controller');

// Crear router para agrupar rutas de ventas
const router = express.Router();

//  VALIDACIONES PARA VENTA
// Reglas que deben cumplir los datos al crear o actualizar un venta
const ventaValidation = [
    // Código de venta es obligatorio
    body('codigo_venta')
        .notEmpty()
        .withMessage('Código de venta es requerido'),

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
// TODAS las rutas de ventas requieren estar autenticado
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación
// IMPORTANTE: Rutas específicas (:id) DEBEN ir ANTES que rutas genéricas (/)

// GET /api/ventas/:id - Obtener venta por ID (DEBE IR PRIMERO)
router.get('/:id', getVentaById);

// GET /api/ventas - Obtener lista de ventas con paginación
router.get('/', getVentas);


// PUT /api/ventas/:id - Actualizar venta por ID
router.put('/:id', ventaValidation, updateVenta);

// DELETE /api/ventas/:id - Eliminar venta por ID
router.delete('/:id', deleteVenta);

// 📤 Exportar router
module.exports = router;