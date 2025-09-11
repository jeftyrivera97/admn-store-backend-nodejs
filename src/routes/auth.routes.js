//  RUTAS DE AUTENTICACIÓN
// Este archivo define todas las rutas relacionadas con login y registro

//  Importaciones necesarias
const express = require('express');                    // Para crear el router
const { body } = require('express-validator');         // Para validar datos de entrada
const { register, login } = require('../controllers/auth.controller'); // Funciones que procesan las peticiones

//  Crear un router (mini aplicación de Express)
// Un router agrupa rutas relacionadas y las organiza
const router = express.Router();

//  VALIDACIONES PARA REGISTRO
// Array de validaciones que se ejecutan antes del controlador
const registerValidation = [
  // Validar email
  body('email')
    .isEmail()                               // Debe tener formato de email válido
    .withMessage('Email debe ser válido')    // Mensaje si falla la validación
    .normalizeEmail(),                       // Convierte a minúsculas y limpia espacios
  
  // Validar password
  body('password')
    .isLength({ min: 6 })                    // Mínimo 6 caracteres
    .withMessage('Password debe tener al menos 6 caracteres'),
  
  // Validar nombre
  body('name')
    .notEmpty()                              // No puede estar vacío
    .withMessage('Nombre es requerido')
    .trim()                                  // Elimina espacios al inicio y final
];

//  VALIDACIONES PARA LOGIN
// Validaciones más simples porque solo necesitamos email y password
const loginValidation = [
  // Validar email
  body('email')
    .isEmail()                               // Debe tener formato válido
    .withMessage('Email debe ser válido')
    .normalizeEmail(),                       // Normalizar formato
  
  // Validar password
  body('password')
    .notEmpty()                              // Solo verificar que no esté vacío
    .withMessage('Password es requerido')
];

// DEFINICIÓN DE RUTAS PÚBLICAS
// Estas rutas NO requieren autenticación (token)

// POST /api/auth/register - Crear nueva cuenta
// Flujo: petición -> registerValidation -> register (controlador)
router.post('/register', registerValidation, register);

// POST /api/auth/login - Iniciar sesión  
// Flujo: petición -> loginValidation -> login (controlador)
router.post('/login', loginValidation, login);

// Exportar el router para que app.js pueda usarlo
module.exports = router;
