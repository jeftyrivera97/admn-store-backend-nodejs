//  RUTAS DE CLIENTES
// Este archivo define todas las rutas para gestionar clientes (CRUD)

//  Importaciones necesarias
const express = require('express');                      // Para crear el router
const { body } = require('express-validator');           // Para validar datos
const authMiddleware = require('../middlewares/auth.middleware'); // Middleware de autenticación
const {
  getClientes,     // Obtener lista de clientes
  createCliente,   // Crear nuevo cliente
  updateCliente,   // Actualizar cliente existente
  deleteCliente    // Eliminar cliente
} = require('../controllers/clientes.controller');

//  Crear router para agrupar rutas de clientes
const router = express.Router();

//  VALIDACIONES PARA CLIENTE
// Reglas que deben cumplir los datos al crear o actualizar un cliente
const clienteValidation = [
  // Código de cliente es obligatorio
  body('codigo_cliente')
    .notEmpty()                                    // No puede estar vacío
    .withMessage('Código de cliente es requerido'),
  
  // Descripción (nombre) es obligatoria
  body('descripcion')
    .notEmpty()                                    // No puede estar vacío
    .withMessage('Descripción es requerida')
];

//  MIDDLEWARE DE AUTENTICACIÓN GLOBAL
// TODAS las rutas de clientes requieren estar autenticado
// Este middleware se ejecuta ANTES que cualquier ruta de abajo
router.use(authMiddleware);

//  DEFINICIÓN DE RUTAS PROTEGIDAS
// Todas estas rutas requieren token de autenticación

// GET /api/clientes - Obtener lista de clientes con paginación
// Flujo: petición -> authMiddleware -> getClientes
router.get('/', getClientes);

// POST /api/clientes - Crear nuevo cliente
// Flujo: petición -> authMiddleware -> clienteValidation -> createCliente
router.post('/', clienteValidation, createCliente);

// PUT /api/clientes/:id - Actualizar cliente por ID
// Flujo: petición -> authMiddleware -> clienteValidation -> updateCliente
router.put('/:id', clienteValidation, updateCliente);

// DELETE /api/clientes/:id - Eliminar cliente por ID
// Flujo: petición -> authMiddleware -> deleteCliente
router.delete('/:id', deleteCliente);

// Exportar router
module.exports = router;