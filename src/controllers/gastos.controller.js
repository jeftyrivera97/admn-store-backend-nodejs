// CONTROLADOR DE GASTOS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar gastos

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient(); // ORM para base de datos

// OBTENER LISTA DE GASTOS (READ)
// GET /api/gastos - Con paginación y búsqueda
const getGastos = async (req, res) => {
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
            id_estado: BigInt(1),  // Solo mostrar gastos activas (no eliminadas)
            deleted_at: null,      // Solo registros NO eliminados (doble verificación)
            ...(search && {
                OR: [  // Buscar en cualquiera de estos campos
                    { codigo_gasto: { contains: search } },  // Buscar en código
                ]
            })
        };

        // 4.  Ejecutar consultas en paralelo para optimizar rendimiento
        const [gastos, total] = await Promise.all([
            // Obtener gastos con paginación y filtros
            prisma.gastos.findMany({
                where: whereCondition,
                skip: parseInt(skip),           // Saltar registros para paginación
                take: parseInt(limit),          // Limitar cantidad de resultados
                orderBy: { created_at: 'desc' }, // Ordenar por fecha de creación (más recientes primero)
                include: {
                    categorias_gastos: true,
                    estados: true,
                }
            }),

            // Contar total de registros que coinciden con los filtros
            prisma.gastos.count({ where: whereCondition })
        ]);



        // 5. Enviar respuesta con datos (el middleware se encarga de la serialización)
        res.json({
            data: gastos,  // Array de gastos - el middleware convertirá automáticamente BigInt y Date
            pagination: {
                page: parseInt(page),           // Página actual
                limit: parseInt(limit),         // Elementos por página
                total,                          // Total de registros
                pages: Math.ceil(total / limit) // Total de páginas
            }
        });

    } catch (error) {
        //  Manejar errores
        console.error('Error obteniendo gastos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  OBTENER GASTO POR ID (READ)
// GET /api/gastos/:id
const getGastoById = async (req, res) => {
    try {
        // 1.  Obtener ID de la gasto desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Buscando gasto con ID:', id);

        // 2. 🔍 Buscar gasto específica en la base de datos (solo activas)
        const gasto = await prisma.gastos.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo gastos activas
                deleted_at: null       // Solo registros NO eliminados
            },
            include: {
                categorias_gastos: true,
                estados: true,
            }
        });

        // 3. Verificar si la gasto existe
        if (!gasto) {
            return res.status(404).json({
                success: false,
                message: ' Gasto no encontrada'
            });
        }

        // 4.  Enviar respuesta exitosa con los datos de la gasto
        res.json({
            success: true,
            message: ' Gasto encontrada',
            data: gasto
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error obteniendo gasto:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};

//  CREAR NUEVA GASTO (CREATE)
// POST /api/gastos
const createGasto = async (req, res) => {
    try {
        // 1.  Verificar que las validaciones pasaron
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // 2.  Extraer datos del cuerpo de la petición
        const { codigo_gasto, fecha, descripcion, id_categoria, total } = req.body;

        // 3.  Obtener ID del usuario autenticado desde el token JWT
        // req.user fue establecido por authMiddleware
        const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma



        // 4. Crear gasto en la base de datos
        const gasto = await prisma.gastos.create({
            data: {
                codigo_gasto,
                fecha,
                descripcion,
                id_categoria,
                total,
                id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
                id_usuario: userId,        // Usuario que creó el registro
                created_at: new Date(),    // Timestamp de creación
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });

        console.log(' Gasto creada exitosamente:', gasto.id);

        // 5.  Enviar respuesta exitosa
        res.status(201).json({
            success: true,
            message: ' Gasto creada exitosamente',
            data: gasto
        });

    } catch (error) {
        // Manejar errores
        console.error('Error creando gasto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ACTUALIZAR GASTO EXISTENTE (UPDATE)
// PUT /api/gastos/:id
const updateGasto = async (req, res) => {
    try {
        // 1.  Obtener ID de la gasto desde los parámetros de la URL
        const { id } = req.params;

        // 2.  Extraer nuevos datos del cuerpo de la petición
        const { codigo_gasto, fecha, descripcion, id_categoria, total } = req.body;

        // 3.  Obtener ID del usuario autenticado desde el token JWT
        const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma

        // 4. 💾 Actualizar gasto en la base de datos (solo si está activa)
        const gasto = await prisma.gastos.update({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo actualizar gastos activas
                deleted_at: null       // Solo registros NO eliminados
            },
            data: {
                codigo_gasto,
                fecha,
                descripcion,
                id_categoria,
                total,
                updated_at: new Date()    // Actualizar timestamp de modificación
            }
        });

        // 4.  Enviar respuesta exitosa
        res.json({
            message: 'Gasto actualizado exitosamente',
            data: gasto
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error('Error actualizando gasto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ELIMINAR GASTO (SOFT DELETE)
// DELETE /api/gastos/:id - Compatible con soft delete de Laravel
const deleteGasto = async (req, res) => {
    try {
        // 1.  Obtener ID de la gasto desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Soft delete de gasto con ID:', id);

        // 2.  Verificar que la gasto existe y está activa
        const gastoExistente = await prisma.gastos.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1)  // Solo buscar gastos activas
            }
        });

        if (!gastoExistente) {
            return res.status(404).json({
                success: false,
                message: ' Gasto no encontrada o ya está eliminada'
            });
        }

        // 3.  SOFT DELETE: Cambiar estado a inactivo y marcar deleted_at
        await prisma.gastos.update({
            where: { id: BigInt(id) },
            data: {
                id_estado: BigInt(2),        // Cambiar estado a inactivo/eliminado
                deleted_at: new Date(),      // Marcar como eliminado con timestamp actual
                updated_at: new Date()       // Actualizar timestamp de modificación
            }
        });

        console.log('Gasto marcada como eliminada (soft delete)');

        // 4.  Enviar respuesta exitosa
        res.json({
            success: true,
            message: ' Gasto eliminada exitosamente'
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error eliminando gasto:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};



//  Exportar todas las funciones para usar en las rutas
module.exports = {
    getGastos,    // GET /api/gastos
    createGasto,  // POST /api/gastos
    updateGasto,  // PUT /api/gastos/:id
    deleteGasto,  // DELETE /api/gastos/:id
    getGastoById  // GET /api/gastos/:id
};