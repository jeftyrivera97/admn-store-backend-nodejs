// CONTROLADOR DE COMPRAS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar compras/pedidos

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient(); // ORM para base de datos

// OBTENER LISTA DE COMPRAS (READ)
// GET /api/compras - Con paginación y búsqueda
const getCompras = async (req, res) => {
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

    // 3.  Configurar filtros de búsqueda + solo mostrar activas (soft delete)
    const whereCondition = {
      id_estado: BigInt(1),  // Solo mostrar compras activas (no eliminadas)
      deleted_at: null,      // Solo registros NO eliminados (doble verificación)
      ...(search && {
        OR: [  // Buscar en cualquiera de estos campos
          { codigo_compra: { contains: search } },  // Buscar en código
        ]
      })
    };

    // 4.  Ejecutar consultas en paralelo para optimizar rendimiento
    const [compras, total] = await Promise.all([
      // Obtener compras con paginación y filtros
      prisma.compras.findMany({
        where: whereCondition,
        skip: parseInt(skip),           // Saltar registros para paginación
        take: parseInt(limit),          // Limitar cantidad de resultados
        orderBy: { created_at: 'desc' } // Ordenar por fecha de creación (más recientes primero)
      }),

      // Contar total de registros que coinciden con los filtros
      prisma.compras.count({ where: whereCondition })
    ]);



    // 5. Enviar respuesta con datos (el middleware se encarga de la serialización)
    res.json({
      data: compras,  // Array de compras - el middleware convertirá automáticamente BigInt y Date
      pagination: {
        page: parseInt(page),           // Página actual
        limit: parseInt(limit),         // Elementos por página
        total,                          // Total de registros
        pages: Math.ceil(total / limit) // Total de páginas
      }
    });

  } catch (error) {
    //  Manejar errores
    console.error('Error obteniendo compras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

//  CREAR NUEVA COMPRA (CREATE)
// POST /api/compras
const createCompra = async (req, res) => {
  try {
    // 1.  Verificar que las validaciones pasaron
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // 2.  Extraer datos del cuerpo de la petición
    const { codigo_compra, fecha, id_categoria, id_proveedor, id_tipo_operacion, fecha_pago, gravado15, gravado18, impuesto15, impuesto18, exento, exonerado, total } = req.body;

    // 3.  Obtener ID del usuario autenticado desde el token JWT
    // req.user fue establecido por authMiddleware
    const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma
    const id_estado_operacion = id_tipo_operacion == 1 ? BigInt(1) : BigInt(2); // Si es de contado (1) si es credito es 2


    // 4. Crear compra en la base de datos
    const compra = await prisma.compras.create({
      data: {
        codigo_compra,
        fecha,
        id_categoria,
        id_proveedor,
        id_tipo_operacion,
        id_estado_operacion,
        fecha_pago: fecha_pago || null,
        gravado15,
        gravado18,
        impuesto15,
        impuesto18,
        exento,
        exonerado,
        total,
        id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
        id_usuario: userId,        // Usuario que creó el registro
        created_at: new Date(),    // Timestamp de creación
        updated_at: new Date(),     // Timestamp de última actualización
      }
    });

    console.log(' Compra creada exitosamente:', compra.id);

    // 5.  Enviar respuesta exitosa
    res.status(201).json({
      success: true,
      message: ' Compra creada exitosamente',
      data: compra
    });

  } catch (error) {
    // Manejar errores
    console.error('Error creando compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

//  ACTUALIZAR COMPRA EXISTENTE (UPDATE)
// PUT /api/compras/:id
const updateCompra = async (req, res) => {
  try {
    // 1.  Obtener ID de la compra desde los parámetros de la URL
    const { id } = req.params;

    // 2.  Extraer nuevos datos del cuerpo de la petición
    const { codigo_compra, fecha_pago, id_categoria, id_proveedor, id_tipo_operacion, gravado15, gravado18, impuesto15, impuesto18, exento, exonerado, total } = req.body;

    // 3.  Actualizar compra en la base de datos (solo si está activa)
    const compra = await prisma.compras.update({
      where: { 
        id: BigInt(id),
        id_estado: BigInt(1),  // Solo actualizar compras activas
        deleted_at: null       // Solo registros NO eliminados
      },
      data: {
        codigo_compra,
        fecha_pago,
        id_categoria,
        id_proveedor,
        id_tipo_operacion,
        gravado15,
        gravado18,
        impuesto15,
        impuesto18,
        exento,
        exonerado,
        total,
        updated_at: new Date()    // Actualizar timestamp de modificación
      }
    });

    // 4.  Enviar respuesta exitosa
    res.json({
      message: 'Compra actualizado exitosamente',
      data: compra
    });

  } catch (error) {
    //  Manejar errores (incluye error P2025 si el ID no existe)
    console.error('Error actualizando compra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

//  ELIMINAR COMPRA (SOFT DELETE)
// DELETE /api/compras/:id - Compatible con soft delete de Laravel
const deleteCompra = async (req, res) => {
  try {
    // 1.  Obtener ID de la compra desde los parámetros de la URL
    const { id } = req.params;

    console.log('🗑️ Soft delete de compra con ID:', id);

    // 2.  Verificar que la compra existe y está activa
    const compraExistente = await prisma.compras.findUnique({
      where: { 
        id: BigInt(id),
        id_estado: BigInt(1)  // Solo buscar compras activas
      }
    });

    if (!compraExistente) {
      return res.status(404).json({
        success: false,
        message: '❌ Compra no encontrada o ya está eliminada'
      });
    }

    // 3.  SOFT DELETE: Cambiar estado a inactivo y marcar deleted_at
    await prisma.compras.update({
      where: { id: BigInt(id) },
      data: {
        id_estado: BigInt(2),        // Cambiar estado a inactivo/eliminado
        deleted_at: new Date(),      // Marcar como eliminado con timestamp actual
        updated_at: new Date()       // Actualizar timestamp de modificación
      }
    });

    console.log(' Compra marcada como eliminada (soft delete)');

    // 4.  Enviar respuesta exitosa
    res.json({
      success: true,
      message: ' Compra eliminada exitosamente'
    });

  } catch (error) {
    // 🚨 Manejar errores (incluye error P2025 si el ID no existe)
    console.error(' Error eliminando compra:', error);
    res.status(500).json({
      success: false,
      message: ' Error interno del servidor'
    });
  }
};

// 🔍 OBTENER COMPRA POR ID (READ)
// GET /api/compras/:id
const getCompraById = async (req, res) => {
  try {
    // 1.  Obtener ID de la compra desde los parámetros de la URL
    const { id } = req.params;

    console.log(' Buscando compra con ID:', id);

    // 2. Buscar compra específica en la base de datos (solo activas)
    const compra = await prisma.compras.findUnique({
      where: { 
        id: BigInt(id),
        id_estado: BigInt(1),  // Solo compras activas
        deleted_at: null       // Solo registros NO eliminados
      }
    });

    // 3. Verificar si la compra existe
    if (!compra) {
      return res.status(404).json({
        success: false,
        message: ' Compra no encontrada'
      });
    }

    // 4.  Enviar respuesta exitosa con los datos de la compra
    res.json({
      success: true,
      message: ' Compra encontrada',
      data: compra
    });

  } catch (error) {
    //  Manejar errores (incluye error P2025 si el ID no existe)
    console.error(' Error obteniendo compra:', error);
    res.status(500).json({
      success: false,
      message: ' Error interno del servidor'
    });
  }
};

//  Exportar todas las funciones para usar en las rutas
module.exports = {
  getCompras,    // GET /api/compras
  createCompra,  // POST /api/compras
  updateCompra,  // PUT /api/compras/:id
  deleteCompra,  // DELETE /api/compras/:id
  getCompraById  // GET /api/compras/:id
};