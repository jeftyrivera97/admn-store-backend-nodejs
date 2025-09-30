//  RUTAS DE EMPLEADOS
// Este archivo define todas las rutas para gestionar empleados (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const { body } = require('express-validator');           // Para validar datos
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const {
    getEmpleados,     // Obtener lista de empleados
    createEmpleado,   // Crear nueva empleado
    updateEmpleado,   // Actualizar empleado existente
    deleteEmpleado,   // DELETE /api/empleados/:id
    getEmpleadoById   // GET /api/empleados/:id
} = require('../controllers/empleados.controller');

// Crear router para agrupar rutas de empleados
const router = express.Router();

//  VALIDACIONES PARA EMPLEADO
// Reglas que deben cumplir los datos al crear o actualizar un empleado
const empleadoValidation = [
    // Código de empleado es obligatorio
    body('codigo_empleado')
        .notEmpty()
        .withMessage('Código de empleado es requerido'),

    // Categoría es obligatoria
    body('id_categoria')
        .notEmpty()
        .withMessage('Categoría es requerida'),

    // Área es obligatoria
    body('id_area')
        .notEmpty()
        .withMessage('Área es requerida'),


    body('nombre')
        .notEmpty()
        .withMessage('Nombre es requerido'),

    // Apellido es obligatorio
    body('apellido')
        .notEmpty()
        .withMessage('Apellido es requerido'),

    // Teléfono es obligatorio
    body('telefono')
        .notEmpty()
        .withMessage('Teléfono es requerido')
];

//   MIDDLEWARE DE AUTENTICACIÓN GLOBAL
// TODAS las rutas de empleados requieren estar autenticado
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación
// IMPORTANTE: Rutas específicas (:id) DEBEN ir ANTES que rutas genéricas (/)

// GET /api/empleados/:id - Obtener empleado por ID (DEBE IR PRIMERO)
router.get('/:id', getEmpleadoById);

// GET /api/empleados - Obtener lista de empleados con paginación
router.get('/', getEmpleados);

// POST /api/empleados - Crear nueva empleado
router.post('/', empleadoValidation, createEmpleado);

// PUT /api/empleados/:id - Actualizar empleado por ID
router.put('/:id', empleadoValidation, updateEmpleado);

// DELETE /api/empleados/:id - Eliminar empleado por ID
router.delete('/:id', deleteEmpleado);

// Exportar router
module.exports = router;