// CONTROLADOR DE PORVEEDORS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar proveedores

//  Importaciones necesarias
const { PrismaClient } = require('../generated/prisma');     // ORM para base de datos
const { validationResult } = require('express-validator');   // Para manejar errores de validación

//  Crear instancia de Prisma
const prisma = new PrismaClient(); // ORM para base de datos

// OBTENER LISTA DE PORVEEDORS (READ)
// GET /api/proveedores - Con paginación y búsqueda
const getProveedores = async (req, res) => {
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
            id_estado: BigInt(1),  // Solo mostrar proveedores activas (no eliminadas)
            deleted_at: null,      // Solo registros NO eliminados (doble verificación)
            ...(search && {
                OR: [  // Buscar en cualquiera de estos campos
                    { codigo_proveedor: { contains: search } },  // Buscar en código
                ]
            })
        };

        // 4.  Ejecutar consultas en paralelo para optimizar rendimiento
        const [proveedores, total] = await Promise.all([
            // Obtener proveedores con paginación y filtros
            prisma.proveedores.findMany({
                where: whereCondition,
                skip: parseInt(skip),           // Saltar registros para paginación
                take: parseInt(limit),          // Limitar cantidad de resultados
                orderBy: { created_at: 'desc' }, // Ordenar por fecha de creación (más recientes primero)
                include: {
                    estados: true,

                }
            }),

            // Contar total de registros que coinciden con los filtros
            prisma.proveedores.count({ where: whereCondition })
        ]);



        // 5. Enviar respuesta con datos (el middleware se encarga de la serialización)
        res.json({
            data: proveedores,  // Array de proveedores - el middleware convertirá automáticamente BigInt y Date
            pagination: {
                page: parseInt(page),           // Página actual
                limit: parseInt(limit),         // Elementos por página
                total,                          // Total de registros
                pages: Math.ceil(total / limit) // Total de páginas
            }
        });

    } catch (error) {
        //  Manejar errores
        console.error('Error obteniendo proveedores:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  OBTENER PORVEEDOR POR ID (READ)
// GET /api/proveedores/:id
const getProveedorById = async (req, res) => {
    try {
        // 1.  Obtener ID de la proveedor desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Buscando proveedor con ID:', id);

        // 2. 🔍 Buscar proveedor específica en la base de datos (solo activas)
        const proveedor = await prisma.proveedores.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo proveedores activas
                deleted_at: null       // Solo registros NO eliminados
            },
            include: {
                estados: true,
            }
        });

        // 3. Verificar si la proveedor existe
        if (!proveedor) {
            return res.status(404).json({
                success: false,
                message: ' Proveedor no encontrado'
            });
        }

        // 4.  Enviar respuesta exitosa con los datos de la proveedor
        res.json({
            success: true,
            message: ' Proveedor encontrado',
            data: proveedor
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error obteniendo proveedor:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};

//  CREAR NUEVA PROVEEDOR (CREATE)
// POST /api/proveedores
const createProveedor = async (req, res) => {
    try {
        // 1.  Verificar que las validaciones pasaron
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // 2.  Extraer datos del cuerpo de la petición
        const { codigo_proveedor, categoria, descripcion, contacto, telefono, correo } = req.body;

        // 3.  Obtener ID del usuario autenticado desde el token JWT
        // req.user fue establecido por authMiddleware
        const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma

        // 4. Crear proveedor en la base de datos
        const proveedor = await prisma.proveedores.create({
            data: {
                codigo_proveedor,
                descripcion,
                categoria,
                contacto,
                telefono,
                correo,
                id_estado: BigInt(1),       // Estado activo por defecto (asumir que 1 = activo)  
                id_usuario: userId,        // Usuario que creó el registro
                created_at: new Date(),    // Timestamp de creación
                updated_at: new Date(),     // Timestamp de última actualización
            }
        });

        console.log(' Proveedor creada exitosamente:', proveedor.id);

        // 5.  Enviar respuesta exitosa
        res.status(201).json({
            success: true,
            message: ' Proveedor creada exitosamente',
            data: proveedor
        });

    } catch (error) {
        // Manejar errores
        console.error('Error creando proveedor:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ACTUALIZAR PROVEEDOR EXISTENTE (UPDATE)
// PUT /api/proveedores/:id
const updateProveedor = async (req, res) => {
    try {
        // 1.  Obtener ID de la proveedor desde los parámetros de la URL
        const { id } = req.params;

        // 2.  Extraer nuevos datos del cuerpo de la petición
        const { codigo_proveedor, categoria, descripcion, contacto, telefono,correo } = req.body;

        // 3.  Obtener ID del usuario autenticado desde el token JWT
        const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma

        // 4. 💾 Actualizar proveedor en la base de datos (solo si está activa)
        const proveedor = await prisma.proveedores.update({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1),  // Solo actualizar proveedores activas
                deleted_at: null       // Solo registros NO eliminados
            },
            data: {
                codigo_proveedor,
                descripcion,
                categoria,
                contacto,
                telefono,
                correo,
                updated_at: new Date()    // Actualizar timestamp de modificación
            }
        });

        // 4.  Enviar respuesta exitosa
        res.json({
            message: 'Proveedor actualizado exitosamente',
            data: proveedor
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error('Error actualizando proveedor:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//  ELIMINAR PROVEEDOR (SOFT DELETE)
// DELETE /api/proveedores/:id - Compatible con soft delete de Laravel
const deleteProveedor = async (req, res) => {
    try {
        // 1.  Obtener ID de la proveedor desde los parámetros de la URL
        const { id } = req.params;

        console.log(' Soft delete de proveedor con ID:', id);

        // 2.  Verificar que la proveedor existe y está activa
        const proveedorExistente = await prisma.proveedores.findUnique({
            where: {
                id: BigInt(id),
                id_estado: BigInt(1)  // Solo buscar proveedores activas
            }
        });

        if (!proveedorExistente) {
            return res.status(404).json({
                success: false,
                message: ' Proveedor no encontrada o ya está eliminada'
            });
        }

        // 3.  SOFT DELETE: Cambiar estado a inactivo y marcar deleted_at
        await prisma.proveedores.update({
            where: { id: BigInt(id) },
            data: {
                id_estado: BigInt(2),        // Cambiar estado a inactivo/eliminado
                deleted_at: new Date(),      // Marcar como eliminado con timestamp actual
                updated_at: new Date()       // Actualizar timestamp de modificación
            }
        });

        console.log('Proveedor marcada como eliminada (soft delete)');

        // 4.  Enviar respuesta exitosa
        res.json({
            success: true,
            message: ' Proveedor eliminada exitosamente'
        });

    } catch (error) {
        //  Manejar errores (incluye error P2025 si el ID no existe)
        console.error(' Error eliminando proveedor:', error);
        res.status(500).json({
            success: false,
            message: ' Error interno del servidor'
        });
    }
};



//  Exportar todas las funciones para usar en las rutas
module.exports = {
    getProveedores,    // GET /api/proveedores
    createProveedor,  // POST /api/proveedores
    updateProveedor,  // PUT /api/proveedores/:id
    deleteProveedor,  // DELETE /api/proveedores/:id
    getProveedorById  // GET /api/proveedores/:id
};