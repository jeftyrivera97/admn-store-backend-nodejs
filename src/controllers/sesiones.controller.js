// CONTROLADOR DE CAJAS SESIONES
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar cajas sesiones

//  Importaciones necesarias
const prisma = require('../utils/prisma');
const { validationResult } = require('express-validator');   // Para manejar errores de validación


// OBTENER LISTA DE CAJAS SESIONES (READ)
// GET /api/sesiones - Con paginación y búsqueda
const getSesiones = async (req, res) => {
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
            id_estado: BigInt(1),  // Solo mostrar cajas sesiones activas (no eliminadas)
            deleted_at: null,      // Solo registros NO eliminados (doble verificación)
            ...(search && {
                OR: [  // Buscar en cualquiera de estos campos
                    { codigo_sesion: { contains: search } },  // Buscar en código
                ]
            })
        };

        // 4.  Ejecutar consultas en paralelo para optimizar rendimiento
        const [sesiones, total] = await Promise.all([
            // Obtener cajas sesiones con paginación y filtros
            prisma.cajas_sesiones.findMany({
                where: whereCondition,
                skip: parseInt(skip),           // Saltar registros para paginación
                take: parseInt(limit),          // Limitar cantidad de resultados
                orderBy: { created_at: 'desc' }, // Ordenar por fecha de creación (más recientes primero)
                include: {
                    cajas_movimientos: true,
                    cajas: true,
                    estados: true,
                    users_cajas_sesiones_id_usuarioTousers: true,
                    users_cajas_sesiones_id_usuario_auditorTousers: true,
                }
            }),

            // Contar total de registros que coinciden con los filtros
            prisma.cajas_sesiones.count({ where: whereCondition })
        ]);



        // 5. Enviar respuesta con datos (el middleware se encarga de la serialización)
        res.json({
            data: sesiones,  // Array de sesiones - el middleware convertirá automáticamente BigInt y Date
            pagination: {
                page: parseInt(page),           // Página actual
                limit: parseInt(limit),         // Elementos por página
                total,                          // Total de registros
                pages: Math.ceil(total / limit) // Total de páginas
            }
        });

    } catch (error) {
        //  Manejar errores
        console.error('Error obteniendo sesiones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  OBTENER SESION POR ID (READ)
// GET /api/sesiones/:id
const getSesionById = async (req, res) => {
    try {
        // 1.  Obtener ID de la sesión desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Buscando sesión con ID:', id);

        // 2. 🔍 Buscar sesión específica en la base de datos (solo activas)
        const sesion = await prisma.cajas_sesiones.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo sesiones activas
                deleted_at: null       // Solo registros NO eliminados
            },
            include: {
                cajas_movimientos: true,
                cajas: true,
                estados: true,
                users_cajas_sesiones_id_usuarioTousers: true,
                users_cajas_sesiones_id_usuario_auditorTousers: true,
            }
        });

        // 3. Verificar si la sesion existe
        if (!sesion) {
            return res.status(404).json({
                success: false,
                message: ' Venta no encontrada'
            });
        }

        // 4.  Enviar respuesta exitosa con los datos de la sesion
        res.json({
            success: true,
            message: ' Sesión encontrada',
            data: sesion
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error obteniendo sesion:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};



//  ACTUALIZAR SESION EXISTENTE (UPDATE)
// PUT /api/sesiones/:id
const updateSesion = async (req, res) => {
    try {
        // 1.  Obtener ID de la sesion desde los parámetros de la URL
        const { id } = req.params;

        // 2.  Extraer nuevos datos del cuerpo de la petición
        const { id_caja,
            caja_efectivo_inicial,
            caja_efectivo_final,
            diferencia,
            fecha_apertura,
            fecha_cierre,
            venta_efectivo,
            venta_tarjeta,
            venta_transferencia,
            venta_pago_link,
            venta_cheque,
            venta_credito,
            total_contado,
            id_estado_sesion, } = req.body;

        // 3. Actualizar sesion en la base de datos (solo si está activa)
        const sesion = await prisma.cajas_sesiones.update({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo actualizar sesiones activas
                deleted_at: null       // Solo registros NO eliminados
            },
            data: {
                id_caja,
                caja_efectivo_inicial,
                caja_efectivo_final,
                diferencia,
                fecha_apertura,
                fecha_cierre,
                venta_efectivo,
                venta_tarjeta,
                venta_transferencia,
                venta_pago_link,
                venta_cheque,
                venta_credito,
                total_contado,
                id_estado_sesion,
                id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });

        // 4.  Enviar respuesta exitosa
        res.json({
            message: 'Sesion actualizada exitosamente',
            data: sesion
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error('Error actualizando sesion:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ELIMINAR SESION (SOFT DELETE)
// DELETE /api/sesiones/:id - Compatible con soft delete de Laravel
const deleteSesion = async (req, res) => {
    try {
        // 1.  Obtener ID de la sesion desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Soft delete de sesion con ID:', id);

        // 2.  Verificar que la sesion existe y está activa
        const sesionExistente = await prisma.cajas_sesiones.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1)  // Solo buscar sesiones activas
            }
        });

        if (!sesionExistente) {
            return res.status(404).json({
                success: false,
                message: ' Sesion no encontrada o ya está eliminada'
            });
        }

        // 3.  SOFT DELETE: Cambiar estado a inactivo y marcar deleted_at
        await prisma.cajas_sesiones.update({
            where: { id: BigInt(id) },
            data: {
                id_estado: BigInt(2),        // Cambiar estado a inactivo/eliminado
                deleted_at: new Date(),      // Marcar como eliminado con timestamp actual
                updated_at: new Date()       // Actualizar timestamp de modificación
            }
        });

        console.log('Sesion marcada como eliminada (soft delete)');

        // 4.  Enviar respuesta exitosa
        res.json({
            success: true,
            message: ' Sesion eliminada exitosamente'
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error eliminando sesion:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};



//  Exportar todas las funciones para usar en las rutas
module.exports = {
    getSesiones,    // GET /api/sesiones
    updateSesion,  // PUT /api/sesiones/:id
    deleteSesion,  // DELETE /api/sesiones/:id
    getSesionById  // GET /api/sesiones/:id
};