// CONTROLADOR DE COMPROBANTES
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar comprobantes/pedidos

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient(); // ORM para base de datos

// OBTENER LISTA DE COMPROBANTES (READ)
// GET /api/comprobantes - Con paginación y búsqueda
const getComprobantes = async (req, res) => {
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
            id_estado: BigInt(1),  // Solo mostrar comprobantes activas (no eliminadas)
            deleted_at: null,      // Solo registros NO eliminados (doble verificación)
            ...(search && {
                OR: [  // Buscar en cualquiera de estos campos
                    { codigo_comprobante: { contains: search } },  // Buscar en código
                ]
            })
        };

        // 4.  Ejecutar consultas en paralelo para optimizar rendimiento
        const [comprobantes, total] = await Promise.all([
            // Obtener comprobantes con paginación y filtros
            prisma.comprobantes.findMany({
                where: whereCondition,
                skip: parseInt(skip),           // Saltar registros para paginación
                take: parseInt(limit),          // Limitar cantidad de resultados
                orderBy: { created_at: 'desc' }, // Ordenar por fecha de creación (más recientes primero)
                include: {
                    categorias_comprobantes: true,
                    clientes: true,
                    comprobantes_detalles: true,
                    comprobantes_folios: true,
                    estados_comprobantes: true,
                    tipos_comprobantes: true,
                    estados: true,
                    ventas: true,
                    comprobantes_pagos: true,
                }
            }),

            // Contar total de registros que coinciden con los filtros
            prisma.comprobantes.count({ where: whereCondition })
        ]);



        // 5. Enviar respuesta con datos (el middleware se encarga de la serialización)
        res.json({
            data: comprobantes,  // Array de comprobantes - el middleware convertirá automáticamente BigInt y Date
            pagination: {
                page: parseInt(page),           // Página actual
                limit: parseInt(limit),         // Elementos por página
                total,                          // Total de registros
                pages: Math.ceil(total / limit) // Total de páginas
            }
        });

    } catch (error) {
        //  Manejar errores
        console.error('Error obteniendo comprobantes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  OBTENER COMPRA POR ID (READ)
// GET /api/comprobantes/:id
const getComprobanteById = async (req, res) => {
    try {
        // 1.  Obtener ID de la comprobante desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Buscando comprobante con ID:', id);

        // 2. Buscar comprobante específica en la base de datos (solo activas)
        const comprobante = await prisma.comprobantes.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo comprobantes activas
                deleted_at: null       // Solo registros NO eliminados
            },
            include: {
                categorias_comprobantes: true,
                clientes: true,
                comprobantes_detalles: true,
                comprobantes_folios: true,
                estados_comprobantes: true,
                tipos_comprobantes: true,
                estados: true,
                ventas: true,
                comprobantes_pagos: true,
            }
        });

        // 3. Verificar si la comprobante existe
        if (!comprobante) {
            return res.status(404).json({
                success: false,
                message: ' Comprobante no encontrado'
            });
        }

        // 4.  Enviar respuesta exitosa con los datos de la comprobante
        res.json({
            success: true,
            message: ' Comprobante encontrado',
            data: comprobante
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error obteniendo comprobante:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};




//  ACTUALIZAR COMPRA EXISTENTE (UPDATE)
// PUT /api/comprobantes/:id
const updateComprobante = async (req, res) => {
    try {
        // 1.  Obtener ID de la comprobante desde los parámetros de la URL
        const { id } = req.params;

        // 2.  Extraer nuevos datos del cuerpo de la petición
        const { codigo_comprobante,
            fecha,
            fecha_hora,
            id_cliente,
            gravado15,
            gravado18,
            impuesto15,
            impuesto18,
            exento,
            exonerado,
            descuentos,
            subtotal,
            total,
            id_categoria,
            id_tipo_comprobante,
        } = req.body;
        // Actualizar timestamp de modificación } = req.body;

        // 3.  Actualizar comprobante en la base de datos (solo si está activa)
        const comprobante = await prisma.comprobantes.update({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo actualizar comprobantes activas
                deleted_at: null       // Solo registros NO eliminados
            },
            data: {
                codigo_comprobante,
                fecha,
                fecha_hora,
                fecha_vencimiento: fecha + 30, // Ejemplo: fecha de vencimiento 30 días después de la fecha
                id_cliente,
                gravado15,
                gravado18,
                impuesto15,
                impuesto18,
                exento,
                exonerado,
                descuentos,
                subtotal,
                total,
                id_categoria,
                id_tipo_comprobante,
                id_estado_comprobante: BigInt(3), // Mantener como activo
                id_estado: BigInt(1), // Mantener como activo
                updated_at: new Date()    // Actualizar timestamp de modificación
            }
        });

        // 4.  Enviar respuesta exitosa
        res.json({
            message: 'Comprobante actualizado exitosamente',
            data: comprobante
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error('Error actualizando comprobante:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ELIMINAR COMPRA (SOFT DELETE)
// DELETE /api/comprobantes/:id - Compatible con soft delete de Laravel
const deleteComprobante = async (req, res) => {
    try {
        // 1.  Obtener ID de la comprobante desde los parámetros de la URL
        const { id } = req.params;

        console.log('🗑️ Soft delete de comprobante con ID:', id);

        // 2.  Verificar que la comprobante existe y está activa
        const comprobanteExistente = await prisma.comprobantes.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1)  // Solo buscar comprobantes activas
            }
        });

        if (!comprobanteExistente) {
            return res.status(404).json({
                success: false,
                message: '❌ Comprobante no encontrada o ya está eliminada'
            });
        }

        // 3.  SOFT DELETE: Cambiar estado a inactivo y marcar deleted_at
        await prisma.comprobantes.update({
            where: { id: BigInt(id) },
            data: {
                id_estado: BigInt(2),        // Cambiar estado a inactivo/eliminado
                deleted_at: new Date(),      // Marcar como eliminado con timestamp actual
                updated_at: new Date()       // Actualizar timestamp de modificación
            }
        });

        console.log(' Comprobante marcada como eliminada (soft delete)');

        // 4.  Enviar respuesta exitosa
        res.json({
            success: true,
            message: ' Comprobante eliminada exitosamente'
        });

    } catch (error) {
        // 🚨 Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error eliminando comprobante:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};



//  CREAR COMPROBANTE (CREATE)
// POST /api/comprobantes
const createComprobante = async (req, res) => {
    try {
        // 1.  Extraer datos del cuerpo de la petición
        const { 
            fecha, 
            codigo_comprobante, 
            descripcion, 
            id_categoria, 
            id_cliente, 
            id_tipo, 
            total,
            id_venta 
        } = req.body;

        // 2. Crear comprobante en la base de datos
        const comprobante = await prisma.comprobantes.create({
            data: {
                fecha,
                codigo_comprobante,
                descripcion,
                id_categoria,
                id_cliente,
                id_tipo,
                total,
                id_venta,
                id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
                created_at: new Date(),    // Timestamp de creación
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });

        console.log('Comprobante creado exitosamente:', comprobante.id);

        // 3.  Enviar respuesta exitosa
        res.status(201).json({
            success: true,
            message: 'Comprobante creado exitosamente',
            data: comprobante
        });

    } catch (error) {
        // Manejar errores
        console.error('Error creando comprobante:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  Exportar todas las funciones para usar en las rutas
module.exports = {
    getComprobantes,      // GET /api/comprobantes
    createComprobante,    // POST /api/comprobantes
    updateComprobante,    // PUT /api/comprobantes/:id
    deleteComprobante,    // DELETE /api/comprobantes/:id
    getComprobanteById    // GET /api/comprobantes/:id
};