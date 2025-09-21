// CONTROLADOR DE EMPLEADOS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar empleados

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient(); // ORM para base de datos

// OBTENER LISTA DE EMPLEADOS (READ)
// GET /api/empleados - Con paginación y búsqueda
const getEmpleados = async (req, res) => {
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
            id_estado: BigInt(1),  // Solo mostrar empleados activas (no eliminadas)
            deleted_at: null,      // Solo registros NO eliminados (doble verificación)
            ...(search && {
                OR: [  // Buscar en cualquiera de estos campos
                    { codigo_empleado: { contains: search } },  // Buscar en código
                ]
            })
        };

        // 4.  Ejecutar consultas en paralelo para optimizar rendimiento
        const [empleados, total] = await Promise.all([
            // Obtener empleados con paginación y filtros
            prisma.empleados.findMany({
                where: whereCondition,
                skip: parseInt(skip),           // Saltar registros para paginación
                take: parseInt(limit),          // Limitar cantidad de resultados
                orderBy: { created_at: 'desc' }, // Ordenar por fecha de creación (más recientes primero)
                include: {
                    categorias_empleados: true,
                    areas_empleados: true,
                    estados: true,
                }
            }),

            // Contar total de registros que coinciden con los filtros
            prisma.empleados.count({ where: whereCondition })
        ]);



        // 5. Enviar respuesta con datos (el middleware se encarga de la serialización)
        res.json({
            data: empleados,  // Array de empleados - el middleware convertirá automáticamente BigInt y Date
            pagination: {
                page: parseInt(page),           // Página actual
                limit: parseInt(limit),         // Elementos por página
                total,                          // Total de registros
                pages: Math.ceil(total / limit) // Total de páginas
            }
        });

    } catch (error) {
        //  Manejar errores
        console.error('Error obteniendo empleados:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  OBTENER EMPLEADO POR ID (READ)
// GET /api/empleados/:id
const getEmpleadoById = async (req, res) => {
    try {
        // 1.  Obtener ID de la empleado desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Buscando empleado con ID:', id);

        // 2. 🔍 Buscar empleado específica en la base de datos (solo activas)
        const empleado = await prisma.empleados.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo empleados activas
                deleted_at: null       // Solo registros NO eliminados
            },
            include: {
                categorias_empleados: true,
                areas_empleados: true,
                estados: true,
            }
        });

        // 3. Verificar si la empleado existe
        if (!empleado) {
            return res.status(404).json({
                success: false,
                message: ' Empleado no encontrada'
            });
        }

        // 4.  Enviar respuesta exitosa con los datos de la empleado
        res.json({
            success: true,
            message: ' Empleado encontrada',
            data: empleado
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error obteniendo empleado:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};

//  CREAR NUEVA EMPLEADO (CREATE)
// POST /api/empleados
const createEmpleado = async (req, res) => {
    try {
        // 1.  Verificar que las validaciones pasaron
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // 2.  Extraer datos del cuerpo de la petición
        const { codigo_empleado,
            nombre,
            apellido,
            id_categoria,
            id_area,
            telefono } = req.body;

        // 3.  Obtener ID del usuario autenticado desde el token JWT
        // req.user fue establecido por authMiddleware
        const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma

        // 4. Crear empleado en la base de datos
        const empleado = await prisma.empleados.create({
            data: {
                codigo_empleado,
                nombre,
                apellido,
                id_categoria,
                id_area,
                telefono,
                id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
                id_usuario: userId,        // Usuario que creó el registro
                created_at: new Date(),    // Timestamp de creación
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });

        console.log(' Empleado creada exitosamente:', empleado.id);

        // 5.  Enviar respuesta exitosa
        res.status(201).json({
            success: true,
            message: ' Empleado creada exitosamente',
            data: empleado
        });

    } catch (error) {
        // Manejar errores
        console.error('Error creando empleado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ACTUALIZAR EMPLEADO EXISTENTE (UPDATE)
// PUT /api/empleados/:id
const updateEmpleado = async (req, res) => {
    try {
        // 1.  Obtener ID de la empleado desde los parámetros de la URL
        const { id } = req.params;

        // 2.  Extraer nuevos datos del cuerpo de la petición
        const { codigo_empleado,
            nombre,
            apellido,
            id_categoria,
            id_area,
            telefono, } = req.body;

        // 3.  Obtener ID del usuario autenticado desde el token JWT
        const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma

        // 4. 💾 Actualizar empleado en la base de datos (solo si está activa)
        const empleado = await prisma.empleados.update({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo actualizar empleados activas
                deleted_at: null       // Solo registros NO eliminados
            },
            data: {
                codigo_empleado,
                nombre,
                apellido,
                id_categoria,
                id_area,
                telefono,
                id_usuario: userId,        // Usuario que creó el registro
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });

        // 4.  Enviar respuesta exitosa
        res.json({
            message: 'Empleado actualizado exitosamente',
            data: empleado
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error('Error actualizando empleado:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ELIMINAR EMPLEADO (SOFT DELETE)
// DELETE /api/empleados/:id - Compatible con soft delete de Laravel
const deleteEmpleado = async (req, res) => {
    try {
        // 1.  Obtener ID de la empleado desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Soft delete de empleado con ID:', id);

        // 2.  Verificar que la empleado existe y está activa
        const empleadoExistente = await prisma.empleados.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1)  // Solo buscar empleados activas
            }
        });

        if (!empleadoExistente) {
            return res.status(404).json({
                success: false,
                message: ' Empleado no encontrada o ya está eliminada'
            });
        }

        // 3.  SOFT DELETE: Cambiar estado a inactivo y marcar deleted_at
        await prisma.empleados.update({
            where: { id: BigInt(id) },
            data: {
                id_estado: BigInt(2),        // Cambiar estado a inactivo/eliminado
                deleted_at: new Date(),      // Marcar como eliminado con timestamp actual
                updated_at: new Date()       // Actualizar timestamp de modificación
            }
        });

        console.log('Empleado marcada como eliminada (soft delete)');

        // 4.  Enviar respuesta exitosa
        res.json({
            success: true,
            message: ' Empleado eliminada exitosamente'
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error eliminando empleado:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};



//  Exportar todas las funciones para usar en las rutas
module.exports = {
    getEmpleados,    // GET /api/empleados
    createEmpleado,  // POST /api/empleados
    updateEmpleado,  // PUT /api/empleados/:id
    deleteEmpleado,  // DELETE /api/empleados/:id
    getEmpleadoById  // GET /api/empleados/:id
};