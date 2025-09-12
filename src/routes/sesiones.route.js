//  RUTAS DE SESIONES
// Este archivo define todas las rutas para gestionar sesiones (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const { body } = require('express-validator');           // Para validar datos
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const {
    getSesiones,     // Obtener lista de ventas
    updateSesion,   // Actualizar venta existente
    deleteSesion,   // DELETE /api/cajas/sesiones/:id
    getSesionById      // GET /api/cajas/sesiones/:id
} = require('../controllers/sesiones.controller');

// Crear router para agrupar rutas de sesiones
const router = express.Router();

//  VALIDACIONES PARA SESION
// Reglas que deben cumplir los datos al crear o actualizar una sesion
const sesionValidation = [
    // Código de venta es obligatorio
    body('codigo_sesion')
        .notEmpty()
        .withMessage('Código de sesion es requerido'),

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
// TODAS las rutas de sesiones requieren estar autenticado
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación
// IMPORTANTE: Rutas específicas (:id) DEBEN ir ANTES que rutas genéricas (/)

// GET /api/sesiones/:id - Obtener sesion por ID (DEBE IR PRIMERO)
router.get('/:id', getSesionById);

// GET /api/sesiones - Obtener lista de sesiones con paginación
router.get('/', getSesiones);

// PUT /api/sesiones/:id - Actualizar sesion por ID
router.put('/:id', sesionValidation, updateSesion);

// DELETE /api/sesiones/:id - Eliminar sesion por ID
router.delete('/:id', deleteSesion);

// 📤 Exportar router
module.exports = router;