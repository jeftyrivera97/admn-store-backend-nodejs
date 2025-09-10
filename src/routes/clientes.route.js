const express = require('express');
const { body } = require('express-validator');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente
} = require('../controllers/clientes.controller');

const router = express.Router();

// Validaciones
const clienteValidation = [
  body('codigo_cliente').notEmpty().withMessage('Código de cliente es requerido'),
  body('descripcion').notEmpty().withMessage('Descripción es requerida')
];

// Rutas protegidas
router.use(authMiddleware);

router.get('/', getClientes);
router.post('/', clienteValidation, createCliente);
router.put('/:id', clienteValidation, updateCliente);
router.delete('/:id', deleteCliente);

module.exports = router;