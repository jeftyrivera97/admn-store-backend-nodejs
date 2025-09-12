//  RUTAS DE PROVEEDORES
// Este archivo define todas las rutas para gestionar proveedores (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const { body } = require('express-validator');           // Para validar datos
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const {
    getProveedores,     // Obtener lista de proveedores
    createProveedor,   // Crear nueva proveedor
    updateProveedor,   // Actualizar proveedor existente
    deleteProveedor,   // DELETE /api/proveedores/:id
    getProveedorById   // GET /api/proveedores/:id
} = require('../controllers/proveedores.controller');

// Crear router para agrupar rutas de porveedores
const router = express.Router();

//  VALIDACIONES PARA PROVEEDOR
// Reglas que deben cumplir los datos al crear o actualizar un proveedor
const proveedorValidation = [
    // Código de proveedor es obligatorio
    body('codigo_proveedor')
        .notEmpty()
        .withMessage('Código de proveedor es requerido'),

    // Categoría es obligatoria
    body('categoria')
        .notEmpty()
        .withMessage('Categoría es requerida'),

    // Descripción es obligatoria
    body('descripcion')
        .notEmpty()
        .withMessage('Descripción es requerida'),
    // Teléfono es obligatorio
    body('telefono')
        .notEmpty()
        .withMessage('Telefono es requerido')
];

//   MIDDLEWARE DE AUTENTICACIÓN GLOBAL
// TODAS las rutas de proveedores requieren estar autenticado
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación
// IMPORTANTE: Rutas específicas (:id) DEBEN ir ANTES que rutas genéricas (/)

// GET /api/proveedores/:id - Obtener proveedor por ID (DEBE IR PRIMERO)
router.get('/:id', getProveedorById);

// GET /api/proveedores - Obtener lista de proveedores con paginación
router.get('/', getProveedores);

// POST /api/proveedores - Crear nueva proveedor
router.post('/', proveedorValidation, createProveedor);

// PUT /api/proveedores/:id - Actualizar proveedor por ID
router.put('/:id', proveedorValidation, updateProveedor);

// DELETE /api/proveedores/:id - Eliminar proveedor por ID
router.delete('/:id', deleteProveedor);

// Exportar router
module.exports = router;