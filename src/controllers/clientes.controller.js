const { PrismaClient } = require('../generated/prisma');
const { validationResult } = require('express-validator');
const { serializeBigInt } = require('../utils/bigint.helper');

const prisma = new PrismaClient();

const getClientes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const whereCondition = search ? {
      OR: [
        { codigo_cliente: { contains: search } },
        { descripcion: { contains: search } }
      ]
    } : {};

    const [clientes, total] = await Promise.all([
      prisma.clientes.findMany({
        where: whereCondition,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { created_at: 'desc' }
      }),
      prisma.clientes.count({ where: whereCondition })
    ]);

    res.json({
      data: clientes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createCliente = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { codigo_cliente, descripcion, direccion, telefono } = req.body;
    const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma

    const cliente = await prisma.clientes.create({
      data: {
        codigo_cliente,
        descripcion,
        direccion,
        telefono,
        id_usuario: userId,
        id_estado: BigInt(1) // Estado activo por defecto
      }
    });

    res.status(201).json({
      message: 'Cliente creado exitosamente',
      data: cliente
    });
  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_cliente, descripcion, direccion, telefono } = req.body;

    const cliente = await prisma.clientes.update({
      where: { id: BigInt(id) },
      data: {
        codigo_cliente,
        descripcion,
        direccion,
        telefono,
        updated_at: new Date()
      }
    });

    res.json({
      message: 'Cliente actualizado exitosamente',
      data: cliente
    });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.clientes.delete({
      where: { id: BigInt(id) }
    });

    res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente
};