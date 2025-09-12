// CONTROLADOR DE VENTAS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar ventas

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient(); // ORM para base de datos

// OBTENER LISTA DE VENTAS (READ)
// GET /api/ventas - Con paginación y búsqueda
const getVentas = async (req, res) => {
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
            id_estado: BigInt(1),  // Solo mostrar ventas activas (no eliminadas)
            deleted_at: null,      // Solo registros NO eliminados (doble verificación)
            ...(search && {
                OR: [  // Buscar en cualquiera de estos campos
                    { codigo_venta: { contains: search } },  // Buscar en código
                ]
            })
        };

        // 4.  Ejecutar consultas en paralelo para optimizar rendimiento
        const [ventas, total] = await Promise.all([
            // Obtener ventas con paginación y filtros
            prisma.ventas.findMany({
                where: whereCondition,
                skip: parseInt(skip),           // Saltar registros para paginación
                take: parseInt(limit),          // Limitar cantidad de resultados
                orderBy: { created_at: 'desc' }, // Ordenar por fecha de creación (más recientes primero)
                include: {
                    cajas_movimientos: true,
                    estados: true,
                    comprobantes: true

                }
            }),

            // Contar total de registros que coinciden con los filtros
            prisma.ventas.count({ where: whereCondition })
        ]);



        // 5. Enviar respuesta con datos (el middleware se encarga de la serialización)
        res.json({
            data: ventas,  // Array de ventas - el middleware convertirá automáticamente BigInt y Date
            pagination: {
                page: parseInt(page),           // Página actual
                limit: parseInt(limit),         // Elementos por página
                total,                          // Total de registros
                pages: Math.ceil(total / limit) // Total de páginas
            }
        });

    } catch (error) {
        //  Manejar errores
        console.error('Error obteniendo ventas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  OBTENER VENTA POR ID (READ)
// GET /api/ventas/:id
const getVentaById = async (req, res) => {
    try {
        // 1.  Obtener ID de la venta desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Buscando venta con ID:', id);

        // 2. 🔍 Buscar venta específica en la base de datos (solo activas)
        const venta = await prisma.ventas.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo ventas activas
                deleted_at: null       // Solo registros NO eliminados
            },
            include: {
                cajas_movimientos: true,
                estados: true,
                comprobantes: true
            }
        });

        // 3. Verificar si la venta existe
        if (!venta) {
            return res.status(404).json({
                success: false,
                message: ' Venta no encontrada'
            });
        }

        // 4.  Enviar respuesta exitosa con los datos de la venta
        res.json({
            success: true,
            message: ' Venta encontrada',
            data: venta
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error obteniendo venta:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};

//  CREAR NUEVA VENTA (CREATE)
// POST /api/ventas
const createVenta = async (req, res) => {
    try {
        // 1.  Verificar que las validaciones pasaron
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // 2.  Extraer datos del cuerpo de la petición
        const { codigo_venta, fecha, descripcion, id_categoria, total } = req.body;

        // 3.  Obtener ID del usuario autenticado desde el token JWT
        // req.user fue establecido por authMiddleware
        const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma
        const id_estado_operacion = id_tipo_operacion == 1 ? BigInt(1) : BigInt(2); // Si es de contado (1) si es credito es 2


        // 4. Crear venta en la base de datos
        const venta = await prisma.ventas.create({
            data: {
                fecha,
                codigo_venta,
                total,
                id_movimiento,
                id_comprobante,
                id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
                created_at: new Date(),    // Timestamp de creación
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });

        console.log(' Venta creada exitosamente:', venta.id);

        // 5.  Enviar respuesta exitosa
        res.status(201).json({
            success: true,
            message: ' Venta creada exitosamente',
            data: venta
        });

    } catch (error) {
        // Manejar errores
        console.error('Error creando venta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ACTUALIZAR VENTA EXISTENTE (UPDATE)
// PUT /api/ventas/:id
const updateVenta = async (req, res) => {
    try {
        // 1.  Obtener ID de la venta desde los parámetros de la URL
        const { id } = req.params;

        // 2.  Extraer nuevos datos del cuerpo de la petición
        const { codigo_venta, fecha, descripcion, id_categoria, total } = req.body;

        // 3. Actualizar venta en la base de datos (solo si está activa)
        const venta = await prisma.ventas.update({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo actualizar ventas activas
                deleted_at: null       // Solo registros NO eliminados
            },
            data: {
                fecha,
                codigo_venta,
                total,
                id_movimiento,
                id_comprobante,
                id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });

        // 4.  Enviar respuesta exitosa
        res.json({
            message: 'Venta actualizado exitosamente',
            data: venta
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error('Error actualizando venta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ELIMINAR VENTA (SOFT DELETE)
// DELETE /api/ventas/:id - Compatible con soft delete de Laravel
const deleteVenta = async (req, res) => {
    try {
        // 1.  Obtener ID de la venta desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Soft delete de venta con ID:', id);

        // 2.  Verificar que la venta existe y está activa
        const ventaExistente = await prisma.ventas.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1)  // Solo buscar ventas activas
            }
        });

        if (!ventaExistente) {
            return res.status(404).json({
                success: false,
                message: ' Venta no encontrada o ya está eliminada'
            });
        }

        // 3.  SOFT DELETE: Cambiar estado a inactivo y marcar deleted_at
        await prisma.ventas.update({
            where: { id: BigInt(id) },
            data: {
                id_estado: BigInt(2),        // Cambiar estado a inactivo/eliminado
                deleted_at: new Date(),      // Marcar como eliminado con timestamp actual
                updated_at: new Date()       // Actualizar timestamp de modificación
            }
        });

        console.log('Venta marcada como eliminada (soft delete)');

        // 4.  Enviar respuesta exitosa
        res.json({
            success: true,
            message: ' Venta eliminada exitosamente'
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error eliminando venta:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};



//  Exportar todas las funciones para usar en las rutas
module.exports = {
    getVentas,    // GET /api/ventas
    createVenta,  // POST /api/ventas
    updateVenta,  // PUT /api/ventas/:id
    deleteVenta,  // DELETE /api/ventas/:id
    getVentaById  // GET /api/ventas/:id
};