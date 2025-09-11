//  CONTROLADOR DE CLIENTES
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar clientes

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient();

//  OBTENER LISTA DE CLIENTES (READ)
// GET /api/clientes - Con paginación y búsqueda
const getClientes = async (req, res) => {
  try {
    // 1.  Extraer parámetros de consulta con valores por defecto
    const { 
      page = 1,      // Página actual (por defecto: 1)
      limit = 10,    // Elementos por página (por defecto: 10) 
      search = ''    // Término de búsqueda (por defecto: vacío)
    } = req.query;

    // 2.  Calcular cuántos registros saltar para la paginación
    // Ejemplo: página 2 con límite 10 = saltar los primeros 10 registros
    const skip = (page - 1) * limit;

    // 3.  Configurar filtros de búsqueda
    const whereCondition = search ? {
      OR: [  // Buscar en cualquiera de estos campos
        { codigo_cliente: { contains: search } },  // Buscar en código
        { descripcion: { contains: search } }      // Buscar en descripción
      ]
    } : {}; // Si no hay búsqueda, traer todos

    // 4.  Ejecutar consultas en paralelo para optimizar rendimiento
    const [clientes, total] = await Promise.all([
      // Obtener clientes con paginación y filtros
      prisma.clientes.findMany({
        where: whereCondition,
        skip: parseInt(skip),           // Saltar registros para paginación
        take: parseInt(limit),          // Limitar cantidad de resultados
        orderBy: { created_at: 'desc' } // Ordenar por fecha de creación (más recientes primero)
      }),
      
      // Contar total de registros que coinciden con los filtros
      prisma.clientes.count({ where: whereCondition })
    ]);

    // 5.  Enviar respuesta con datos y metadatos de paginación
    res.json({
      data: clientes,  // Array de clientes
      pagination: {
        page: parseInt(page),           // Página actual
        limit: parseInt(limit),         // Elementos por página
        total,                          // Total de registros
        pages: Math.ceil(total / limit) // Total de páginas
      }
    });
    
  } catch (error) {
    //  Manejar errores
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

//  CREAR NUEVO CLIENTE (CREATE)
// POST /api/clientes
const createCliente = async (req, res) => {
  try {
    // 1.  Verificar que las validaciones pasaron
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // 2.  Extraer datos del cuerpo de la petición
    const { codigo_cliente, descripcion, direccion, telefono } = req.body;
    
    // 3.  Obtener ID del usuario autenticado desde el token JWT
    // req.user fue establecido por authMiddleware
    const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma

    // 4.  Crear cliente en la base de datos
    const cliente = await prisma.clientes.create({
      data: {
        codigo_cliente,
        descripcion,
        direccion,
        telefono,
        id_usuario: userId,        // Usuario que creó el registro
        id_estado: BigInt(1)       // Estado activo por defecto (asumir que 1 = activo)
      }
    });

    // 5.  Enviar respuesta exitosa
    res.status(201).json({
      message: 'Cliente creado exitosamente',
      data: cliente
    });
    
  } catch (error) {
    //  Manejar errores
    console.error('Error creando cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

//  ACTUALIZAR CLIENTE EXISTENTE (UPDATE)
// PUT /api/clientes/:id
const updateCliente = async (req, res) => {
  try {
    // 1.  Obtener ID del cliente desde los parámetros de la URL
    const { id } = req.params;
    
    // 2.  Extraer nuevos datos del cuerpo de la petición
    const { codigo_cliente, descripcion, direccion, telefono } = req.body;

    // 3.  Actualizar cliente en la base de datos
    const cliente = await prisma.clientes.update({
      where: { id: BigInt(id) },  // Buscar por ID (convertir string a BigInt)
      data: {
        codigo_cliente,
        descripcion,
        direccion,
        telefono,
        updated_at: new Date()    // Actualizar timestamp de modificación
      }
    });

    // 4.  Enviar respuesta exitosa
    res.json({
      message: 'Cliente actualizado exitosamente',
      data: cliente
    });
    
  } catch (error) {
    //  Manejar errores (incluye error P2025 si el ID no existe)
    console.error('Error actualizando cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

//  ELIMINAR CLIENTE (DELETE)
// DELETE /api/clientes/:id
const deleteCliente = async (req, res) => {
  try {
    // 1. 📥 Obtener ID del cliente desde los parámetros de la URL
    const { id } = req.params;

    // 2. 🗑️ Eliminar cliente de la base de datos
    await prisma.clientes.delete({
      where: { id: BigInt(id) }  // Buscar por ID (convertir string a BigInt)
    });

    // 3. 📤 Enviar respuesta exitosa (sin datos, solo confirmación)
    res.json({ message: 'Cliente eliminado exitosamente' });
    
  } catch (error) {
    // 🚨 Manejar errores (incluye error P2025 si el ID no existe)
    console.error('Error eliminando cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 📤 Exportar todas las funciones para usar en las rutas
module.exports = {
  getClientes,    // GET /api/clientes
  createCliente,  // POST /api/clientes
  updateCliente,  // PUT /api/clientes/:id
  deleteCliente   // DELETE /api/clientes/:id
};