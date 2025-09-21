// CONTROLADOR DE PLANILLAS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar planillas

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient(); // ORM para base de datos

// OBTENER LISTA DE PLANILLAS (READ)
// GET /api/planillas - Con paginación y búsqueda
const getPlanillas = async (req, res) => {
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
            id_estado: BigInt(1),  // Solo mostrar planillas activas (no eliminadas)
            deleted_at: null,      // Solo registros NO eliminados (doble verificación)
            ...(search && {
                OR: [  // Buscar en cualquiera de estos campos
                    { codigo_planilla: { contains: search } },  // Buscar en código
                ]
            })
        };

        // 4.  Ejecutar consultas en paralelo para optimizar rendimiento
        const [planillas, total] = await Promise.all([
            // Obtener planillas con paginación y filtros
            prisma.planillas.findMany({
                where: whereCondition,
                skip: parseInt(skip),           // Saltar registros para paginación
                take: parseInt(limit),          // Limitar cantidad de resultados
                orderBy: { created_at: 'desc' }, // Ordenar por fecha de creación (más recientes primero)
                include: {
                    categorias_planillas: true,
                    estados: true,
                    empleados: true,
                }
            }),

            // Contar total de registros que coinciden con los filtros
            prisma.planillas.count({ where: whereCondition })
        ]);



        // 5. Enviar respuesta con datos (el middleware se encarga de la serialización)
        res.json({
            data: planillas,  // Array de planillas - el middleware convertirá automáticamente BigInt y Date
            pagination: {
                page: parseInt(page),           // Página actual
                limit: parseInt(limit),         // Elementos por página
                total,                          // Total de registros
                pages: Math.ceil(total / limit) // Total de páginas
            }
        });

    } catch (error) {
        //  Manejar errores
        console.error('Error obteniendo planillas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  OBTENER PLANILLA POR ID (READ)
// GET /api/planillas/:id
const getPlanillaById = async (req, res) => {
    try {
        // 1.  Obtener ID de la planilla desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Buscando planilla con ID:', id);

        // 2. 🔍 Buscar planilla específica en la base de datos (solo activas)
        const planilla = await prisma.planillas.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo planillas activas
                deleted_at: null       // Solo registros NO eliminados
            },
             include: {
                    categorias_planillas: true,
                    estados: true,
                      empleados: true,
                }
        });

        // 3. Verificar si la planilla existe
        if (!planilla) {
            return res.status(404).json({
                success: false,
                message: ' Planilla no encontrada'
            });
        }

        // 4.  Enviar respuesta exitosa con los datos de la planilla
        res.json({
            success: true,
            message: ' Planilla encontrada',
            data: planilla
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error obteniendo planilla:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};

//  CREAR NUEVA PLANILLA (CREATE)
// POST /api/planillas
const createPlanilla = async (req, res) => {
    try {
        // 1.  Verificar que las validaciones pasaron
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // 2.  Extraer datos del cuerpo de la petición
        const { codigo_planilla,id_empleado, fecha, descripcion, id_categoria, total } = req.body;

        // 3.  Obtener ID del usuario autenticado desde el token JWT
        // req.user fue establecido por authMiddleware
        const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma
       
        // 4. Crear planilla en la base de datos
        const planilla = await prisma.planillas.create({
            data: {
                codigo_planilla, // Generar código único basado en timestamp
                fecha,
                descripcion,
                id_categoria,
                id_empleado,
                total,
                id_estado: BigInt(1), 
                id_usuario: userId,     // Estado activo por defecto (asumir que 1 = activo)  
                created_at: new Date(),    // Timestamp de creación
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });


        const gasto = await prisma.gastos.create({
            data: {
                codigo_gasto: planilla.codigo_planilla, // Usar mismo código que la planilla
                fecha,
                descripcion: `Pago de planilla: ${planilla.descripcion}`,
                id_categoria,
                total,
                id_estado: BigInt(1),
                id_usuario: userId,       // Estado activo por defecto (asumir que 1 = activo)  
                created_at: new Date(),    // Timestamp de creación
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });

        console.log(' Planilla creada exitosamente:', planilla.id);

        // 5.  Enviar respuesta exitosa
        res.status(201).json({
            success: true,
            message: ' Planilla creada exitosamente',
            data: planilla, gasto
        });

    } catch (error) {
        // Manejar errores
        console.error('Error creando planilla:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ACTUALIZAR PLANILLA EXISTENTE (UPDATE)
// PUT /api/planillas/:id
const updatePlanilla = async (req, res) => {
    try {
        // 1.  Obtener ID de la planilla desde los parámetros de la URL
        const { id } = req.params;

        // 2.  Extraer nuevos datos del cuerpo de la petición
        const { codigo_planilla, id_empleado, fecha, descripcion, id_categoria, total } = req.body;

          // 3.  Obtener ID del usuario autenticado desde el token JWT
        // req.user fue establecido por authMiddleware
        const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma

        // 3. Actualizar planilla en la base de datos (solo si está activa)
        const planilla = await prisma.planillas.update({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo actualizar planillas activas
                deleted_at: null       // Solo registros NO eliminados
            },
            data: {
                codigo_planilla,
                fecha,
                descripcion,
                id_categoria,
                id_empleado,
                total,
                id_usuario: userId,
                id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
                updated_at: new Date(),    // Timestamp de última actualización
            }
        });

        const gasto = await prisma.gastos.update({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo actualizar gastos activas
                deleted_at: null       // Solo registros NO eliminados
            },
            data: {
                codigo_gasto: planilla.codigo_planilla,
                fecha,
                descripcion: planilla.descripcion,
                id_categoria,
                total,
                id_estado: BigInt(1),
                id_usuario: userId,     // Estado activo por defecto (asumir que 1 = activo)
                updated_at: new Date(),    // Timestamp de última actualización
            }
        });

        // 4.  Enviar respuesta exitosa
        res.json({
            message: 'Planilla actualizado exitosamente',
            data: planilla
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error('Error actualizando planilla:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ELIMINAR PLANILLA (SOFT DELETE)
// DELETE /api/planillas/:id - Compatible con soft delete de Laravel
const deletePlanilla = async (req, res) => {
    try {
        // 1.  Obtener ID de la planilla desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Soft delete de planilla con ID:', id);

        // 2.  Verificar que la planilla existe y está activa
        const planillaExistente = await prisma.planillas.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1)  // Solo buscar planillas activas
            }
        });

        if (!planillaExistente) {
            return res.status(404).json({
                success: false,
                message: ' Planilla no encontrada o ya está eliminada'
            });
        }

        // 3.  SOFT DELETE: Cambiar estado a inactivo y marcar deleted_at
        await prisma.planillas.update({
            where: { id: BigInt(id) },
            data: {
                id_estado: BigInt(2),        // Cambiar estado a inactivo/eliminado
                deleted_at: new Date(),      // Marcar como eliminado con timestamp actual
                updated_at: new Date()       // Actualizar timestamp de modificación
            }
        });

        console.log('Planilla marcada como eliminada (soft delete)');

        // 4.  Enviar respuesta exitosa
        res.json({
            success: true,
            message: ' Planilla eliminada exitosamente'
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error eliminando planilla:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};



//  Exportar todas las funciones para usar en las rutas
module.exports = {
    getPlanillas,    // GET /api/planillas
    createPlanilla,  // POST /api/planillas
    updatePlanilla,  // PUT /api/planillas/:id
    deletePlanilla,  // DELETE /api/planillas/:id
    getPlanillaById  // GET /api/planillas/:id
};