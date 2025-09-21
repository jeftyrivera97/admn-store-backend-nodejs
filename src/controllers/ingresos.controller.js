// CONTROLADOR DE INGRESOS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar ingresos

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient(); // ORM para base de datos

// OBTENER LISTA DE INGRESOS (READ)
// GET /api/ingresos - Con paginación y búsqueda
const getIngresos = async (req, res) => {
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
            id_estado: BigInt(1),  // Solo mostrar ingresos activas (no eliminadas)
            deleted_at: null,      // Solo registros NO eliminados (doble verificación)
            ...(search && {
                OR: [  // Buscar en cualquiera de estos campos
                    { codigo_ingreso: { contains: search } },  // Buscar en código
                ]
            })
        };

        // 4.  Ejecutar consultas en paralelo para optimizar rendimiento
        const [ingresos, total] = await Promise.all([
            // Obtener ingresos con paginación y filtros
            prisma.ingresos.findMany({
                where: whereCondition,
                skip: parseInt(skip),           // Saltar registros para paginación
                take: parseInt(limit),          // Limitar cantidad de resultados
                orderBy: { created_at: 'desc' }, // Ordenar por fecha de creación (más recientes primero)
                include: {
                    categorias_ingresos: true,
                    estados: true,
                }
            }),

            // Contar total de registros que coinciden con los filtros
            prisma.ingresos.count({ where: whereCondition })
        ]);



        // 5. Enviar respuesta con datos (el middleware se encarga de la serialización)
        res.json({
            data: ingresos,  // Array de ingresos - el middleware convertirá automáticamente BigInt y Date
            pagination: {
                page: parseInt(page),           // Página actual
                limit: parseInt(limit),         // Elementos por página
                total,                          // Total de registros
                pages: Math.ceil(total / limit) // Total de páginas
            }
        });

    } catch (error) {
        //  Manejar errores
        console.error('Error obteniendo ingresos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  OBTENER INGRESO POR ID (READ)
// GET /api/ingresos/:id
const getIngresoById = async (req, res) => {
    try {
        // 1.  Obtener ID de la ingreso desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Buscando ingreso con ID:', id);

        // 2. 🔍 Buscar ingreso específica en la base de datos (solo activas)
        const ingreso = await prisma.ingresos.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo ingresos activas
                deleted_at: null       // Solo registros NO eliminados
            },
            include: {
                categorias_ingresos: true,
                estados: true,
            }
        });

        // 3. Verificar si la ingreso existe
        if (!ingreso) {
            return res.status(404).json({
                success: false,
                message: ' Ingreso no encontrada'
            });
        }

        // 4.  Enviar respuesta exitosa con los datos de la ingreso
        res.json({
            success: true,
            message: ' Ingreso encontrada',
            data: ingreso
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error obteniendo ingreso:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};

//  CREAR NUEVA INGRESO (CREATE)
// POST /api/ingresos
const createIngreso = async (req, res) => {
    try {
        // 1.  Verificar que las validaciones pasaron
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // 2.  Extraer datos del cuerpo de la petición
        const { codigo_ingreso, fecha, descripcion, id_categoria, total } = req.body;

        // 3.  Obtener ID del usuario autenticado desde el token JWT
        // req.user fue establecido por authMiddleware
        const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma
      


        // 4. Crear ingreso en la base de datos
        const ingreso = await prisma.ingresos.create({
            data: {
                codigo_ingreso,
                fecha,
                descripcion,
                id_categoria,
                total,
                id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
                created_at: new Date(),    // Timestamp de creación
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });

        console.log(' Ingreso creada exitosamente:', ingreso.id);

        // 5.  Enviar respuesta exitosa
        res.status(201).json({
            success: true,
            message: ' Ingreso creada exitosamente',
            data: ingreso
        });

    } catch (error) {
        // Manejar errores
        console.error('Error creando ingreso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ACTUALIZAR INGRESO EXISTENTE (UPDATE)
// PUT /api/ingresos/:id
const updateIngreso = async (req, res) => {
    try {
        // 1.  Obtener ID de la ingreso desde los parámetros de la URL
        const { id } = req.params;

        // 2.  Extraer nuevos datos del cuerpo de la petición
        const { codigo_ingreso, fecha, descripcion, id_categoria, total } = req.body;

        // 3. Actualizar ingreso en la base de datos (solo si está activa)
        const ingreso = await prisma.ingresos.update({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo actualizar ingresos activas
                deleted_at: null       // Solo registros NO eliminados
            },
            data: {
                codigo_ingreso,
                fecha,
                descripcion,
                id_categoria,
                total,
                id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
                updated_at: new Date(),    // Timestamp de última actualización
            }
        });

        // 4.  Enviar respuesta exitosa
        res.json({
            message: 'Ingreso actualizado exitosamente',
            data: ingreso
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error('Error actualizando ingreso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ELIMINAR INGRESO (SOFT DELETE)
// DELETE /api/ingresos/:id - Compatible con soft delete de Laravel
const deleteIngreso = async (req, res) => {
    try {
        // 1.  Obtener ID de la ingreso desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Soft delete de ingreso con ID:', id);

        // 2.  Verificar que la ingreso existe y está activa
        const ingresoExistente = await prisma.ingresos.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1)  // Solo buscar ingresos activas
            }
        });

        if (!ingresoExistente) {
            return res.status(404).json({
                success: false,
                message: ' Ingreso no encontrada o ya está eliminada'
            });
        }

        // 3.  SOFT DELETE: Cambiar estado a inactivo y marcar deleted_at
        await prisma.ingresos.update({
            where: { id: BigInt(id) },
            data: {
                id_estado: BigInt(2),        // Cambiar estado a inactivo/eliminado
                deleted_at: new Date(),      // Marcar como eliminado con timestamp actual
                updated_at: new Date()       // Actualizar timestamp de modificación
            }
        });

        console.log('Ingreso marcada como eliminada (soft delete)');

        // 4.  Enviar respuesta exitosa
        res.json({
            success: true,
            message: ' Ingreso eliminada exitosamente'
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error eliminando ingreso:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};



//  Exportar todas las funciones para usar en las rutas
module.exports = {
    getIngresos,    // GET /api/ingresos
    createIngreso,  // POST /api/ingresos
    updateIngreso,  // PUT /api/ingresos/:id
    deleteIngreso,  // DELETE /api/ingresos/:id
    getIngresoById  // GET /api/ingresos/:id
};