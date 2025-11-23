// CONTROLADOR DE COMPROBANTES
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar comprobantes/pedidos

//  Importaciones necesarias
const prisma = require('../utils/prisma');
const { validationResult } = require("express-validator"); // Para manejar errores de validación


// --- FUNCIONES AUXILIARES ---
const buildSearchFilter = (search) => {
  const baseFilter = { id_estado: BigInt(1), deleted_at: null };

  if (!search || !String(search).trim()) return baseFilter;

  const s = String(search).trim();
  const or = [
    { codigo_comprobante: { contains: s, mode: "insensitive" } },
    { descripcion: { contains: s, mode: "insensitive" } },
    {
      categorias_comprobantes: {
        is: { descripcion: { contains: s, mode: "insensitive" } },
      },
    },
  ];

  const num = Number(s);
  if (!isNaN(num) && num > 0) or.push({ total: num });

  return { ...baseFilter, OR: or };
};

const getDateRanges = (monthParam) => {
  const isYearMonth = (s) => /^\d{4}-\d{2}$/.test(s);
  let y, m;

  if (monthParam && isYearMonth(monthParam)) {
    [y, m] = monthParam.split("-").map(Number);
  } else {
    const now = new Date();
    y = now.getUTCFullYear();
    m = now.getUTCMonth() + 1;
  }

  return {
    year: y,
    month: m,
    monthRange: {
      gte: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0)),
      lt: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
    },
    prevMonthRange: {
      gte: new Date(Date.UTC(y, m - 2, 1, 0, 0, 0, 0)),
      lt: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0)),
    },
    yearRange: {
      gte: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
      lt: new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0, 0)),
    },
    prevYearRange: {
      gte: new Date(Date.UTC(y - 1, 0, 1, 0, 0, 0, 0)),
      lt: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
    },
  };
};

const getMonthlyTotals = async (baseFilter, yearRange, search) => {
  const spanishMonthNames = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  let monthlyRows;
  if (search && String(search).trim()) {
    const s = String(search).trim();
    const searchParam = `%${s}%`;
    const num = Number(s);

    if (!isNaN(num)) {
      monthlyRows = await prisma.$queryRaw`
        SELECT to_char(date_trunc('month', i.fecha), 'YYYY-MM') AS month, COALESCE(SUM(i.total),0) AS total
        FROM comprobantes i
        LEFT JOIN categorias_comprobantes c ON i.id_categoria = c.id
        WHERE i.fecha >= ${yearRange.gte} AND i.fecha < ${yearRange.lt}
          AND i.id_estado = ${BigInt(1)} AND i.deleted_at IS NULL
          AND (i.codigo_comprobante ILIKE ${searchParam} OR i.descripcion ILIKE ${searchParam} 
               OR c.descripcion ILIKE ${searchParam} OR i.total = ${num})
        GROUP BY 1 ORDER BY 1
      `;
    } else {
      monthlyRows = await prisma.$queryRaw`
        SELECT to_char(date_trunc('month', i.fecha), 'YYYY-MM') AS month, COALESCE(SUM(i.total),0) AS total
        FROM comprobantes i
        LEFT JOIN categorias_comprobantes c ON i.id_categoria = c.id
        WHERE i.fecha >= ${yearRange.gte} AND i.fecha < ${yearRange.lt}
          AND i.id_estado = ${BigInt(1)} AND i.deleted_at IS NULL
          AND (i.codigo_comprobante ILIKE ${searchParam} OR i.descripcion ILIKE ${searchParam} 
               OR c.descripcion ILIKE ${searchParam})
        GROUP BY 1 ORDER BY 1
      `;
    }
  } else {
    monthlyRows = await prisma.$queryRaw`
      SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS month, COALESCE(SUM(total),0) AS total
      FROM comprobantes
      WHERE fecha >= ${yearRange.gte} AND fecha < ${yearRange.lt}
        AND id_estado = ${BigInt(1)} AND deleted_at IS NULL
      GROUP BY 1 ORDER BY 1
    `;
  }

  const monthlyMap = new Map(
    (monthlyRows || []).map((r) => [String(r.month), Number(r.total)])
  );
  return Array.from({ length: 12 }).map((_, idx) => {
    const mm = String(idx + 1).padStart(2, "0");
    const key = `${yearRange.gte.getUTCFullYear()}-${mm}`;
    return {
      month: key,
      monthName: spanishMonthNames[idx],
      total: monthlyMap.get(key) || 0,
    };
  });
};

const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const processCategories = async (baseFilter, monthRange) => {
  const groupByCat = await prisma.comprobantes.groupBy({
    by: ["id_categoria"],
    where: { ...baseFilter, fecha: monthRange },
    _sum: { total: true },
  });

  const categoryIds = groupByCat.map((g) => g.id_categoria).filter(Boolean);
  const categories = categoryIds.length
    ? await prisma.categorias_comprobantes.findMany({
        where: { id: { in: categoryIds.map((id) => BigInt(id)) } },
        select: { id: true, descripcion: true, id_tipo: true },
      })
    : [];

  const categoryMap = new Map(
    categories.map((c) => [c.id.toString(), c.descripcion])
  );

  return { groupByCat, categories, categoryMap };
};

const processTipos = async (groupByCat, categories, totalMes) => {
  const totalsByTipoMap = new Map();

  for (const g of groupByCat) {
    const catId = g.id_categoria;
    if (!catId) continue;

    const cat = categories.find((c) => c.id.toString() === catId.toString());
    const tipoId = cat?.id_tipo?.toString() || "null";
    const sum = Number(g._sum?.total ?? 0);

    totalsByTipoMap.set(tipoId, (totalsByTipoMap.get(tipoId) || 0) + sum);
  }

  const tipoIds = Array.from(totalsByTipoMap.keys()).filter(
    (k) => k !== "null"
  );
  const tipos = tipoIds.length
    ? await prisma.tipos_comprobantes.findMany({
        where: { id: { in: tipoIds.map((id) => BigInt(id)) } },
        select: { id: true, descripcion: true },
      })
    : [];

  const tipoMap = new Map(tipos.map((t) => [t.id.toString(), t.descripcion]));

  return Array.from(totalsByTipoMap.entries()).map(([key, value]) => {
    const total = Number(value);
    const pct =
      totalMes === 0 ? 0 : Number(((total / totalMes) * 100).toFixed(2));
    return {
      id_tipo: key === "null" ? null : key,
      descripcion: key === "null" ? null : tipoMap.get(key) || null,
      total,
      percentage: pct,
    };
  });
};

// OBTENER LISTA DE COMPROBANTES (READ)
// GET /comprobantes?page=1&limit=50&search=ABC&month=2025-02
const getComprobantes = async (req, res) => {
  try {
    const {
      page = "1",
      limit = "50",
      search = "",
      month: monthParam = null,
    } = req.query;

    // Paginación
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    // Filtros y rangos de fechas
    const baseFilter = buildSearchFilter(search);
    const {
      year,
      month,
      monthRange,
      prevMonthRange,
      yearRange,
      prevYearRange,
    } = getDateRanges(monthParam);
    const whereList = { ...baseFilter, fecha: monthRange };

    // Consultas principales en paralelo
    const [comprobantes, allComprobantesDelMes, totalAgg, totals] = await Promise.all([
      // Comprobantes paginados
      prisma.comprobantes.findMany({
        where: whereList,
        skip,
        take: limitNum,
        orderBy: { created_at: "desc" },
        include: {
          categorias_comprobantes: true,
          estados: true,
          ventas: true,
          clientes: true,
          comprobantes_detalles: true,
          comprobantes_folios: true,
          tipos_operaciones: true,
          estados_comprobantes: true,
          comprobantes_pagos: true,
          users: true,
        },
      }),
      // TODOS los comprobantes del mes sin paginación
      prisma.comprobantes.findMany({
        where: whereList,
        orderBy: { created_at: "desc" },
        include: {
          categorias_comprobantes: true,
          estados: true,
          ventas: true,
          clientes: true,
          comprobantes_detalles: true,
          comprobantes_folios: true,
          tipos_operaciones: true,
          estados_comprobantes: true,
          comprobantes_pagos: true,
          users: true,
        },
      }),
      prisma.comprobantes.aggregate({
        where: whereList,
        _count: { _all: true },
      }),
      Promise.all([
        prisma.comprobantes.aggregate({
          where: { ...baseFilter, fecha: monthRange },
          _sum: { total: true },
        }),
        prisma.comprobantes.aggregate({
          where: { ...baseFilter, fecha: prevMonthRange },
          _sum: { total: true },
        }),
        prisma.comprobantes.aggregate({
          where: { ...baseFilter, fecha: yearRange },
          _sum: { total: true },
        }),
        prisma.comprobantes.aggregate({
          where: { ...baseFilter, fecha: prevYearRange },
          _sum: { total: true },
        }),
      ]),
    ]);

    const [aggMes, aggPrevMes, aggAnio, aggPrevYear] = totals;
    const total = Number(totalAgg?._count?._all ?? 0);
    const totalMes = Number(aggMes?._sum?.total ?? 0);
    const totalMesPrevio = Number(aggPrevMes?._sum?.total ?? 0);
    const totalAnio = Number(aggAnio?._sum?.total ?? 0);
    const totalYearPrev = Number(aggPrevYear?._sum?.total ?? 0);

    // Procesar datos en paralelo
    const [monthlyTotals, { groupByCat, categories, categoryMap }] =
      await Promise.all([
        getMonthlyTotals(baseFilter, yearRange, search),
        processCategories(baseFilter, monthRange),
      ]);

    const [totalsByTipo] = await Promise.all([
      processTipos(groupByCat, categories, totalMes),
    ]);

    const totalsByCategory = groupByCat.map((g) => ({
      id_categoria: g.id_categoria?.toString() || null,
      descripcion: g.id_categoria
        ? categoryMap.get(g.id_categoria.toString()) || null
        : null,
      total: Number(g._sum?.total ?? 0),
      percentage:
        totalMes === 0 ? 0 : Number(((g._sum?.total ?? 0) / totalMes) * 100),
    }));

    res.json({
      data: comprobantes,
      allMonthData: allComprobantesDelMes, // TODOS los comprobantes del mes sin paginación
      statistics: {
        totalRegistros: total,
        totalMonth: totalMes,
        totalMonthPrev: totalMesPrevio,
        totalYear: totalAnio,
        totalYearPrev: totalYearPrev,
        diferenciaMensual: totalMes - totalMesPrevio,
        diferenciaAnual: totalAnio - totalYearPrev,
        porcentajeCambioMensual: Number(
          calculatePercentageChange(totalMes, totalMesPrevio).toFixed(2)
        ),
        porcentajeCambioAnual: Number(
          calculatePercentageChange(totalAnio, totalYearPrev).toFixed(2)
        ),
        categorias: totalsByCategory,
        tipos: totalsByTipo,
        totalsMonths: monthlyTotals,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      meta: {
        month: `${year}-${String(month).padStart(2, "0")}`,
        prevMonth: (() => {
          const pm = new Date(prevMonthRange.gte);
          return `${pm.getUTCFullYear()}-${String(
            pm.getUTCMonth() + 1
          ).padStart(2, "0")}`;
        })(),
      },
    });
  } catch (error) {
    console.error("Error obteniendo comprobantes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

//  OBTENER COMPRA POR ID (READ)
// GET /api/comprobantes/:id
const getComprobanteById = async (req, res) => {
  try {
    // 1.  Obtener ID de la comprobante desde los parámetros de la URL
    const { id } = req.params;

    console.log(" Buscando comprobante con ID:", id);

    // 2. Buscar comprobante específica en la base de datos (solo activas)
    const comprobante = await prisma.comprobantes.findFirst({
      where: {
        id: BigInt(id),
        id_estado: BigInt(1), // Solo comprobantes activas
        deleted_at: null, // Solo registros NO eliminados
      },
      include: {
        categorias_comprobantes: true,
        clientes: true,
        comprobantes_detalles: true,
        comprobantes_folios: true,
        estados_comprobantes: true,
        estados: true,
        ventas: true,
        comprobantes_pagos: true,
        tipos_operaciones: true,
        users: true,
      },
    });

    // 3. Verificar si la comprobante existe
    if (!comprobante) {
      return res.status(404).json({
        success: false,
        message: " Comprobante no encontrado",
      });
    }

    // 4.  Enviar respuesta exitosa con los datos de la comprobante
    res.json({
      success: true,
      message: " Comprobante encontrado",
      data: comprobante,
    });
  } catch (error) {
    //  Manejar errores (incluye error P2025 si el ID no existe)
    console.error(" Error obteniendo comprobante:", error);
    res.status(500).json({
      success: false,
      message: " Error interno del servidor",
    });
  }
};

//  ACTUALIZAR COMPROBANTE EXISTENTE (UPDATE)
// PUT /api/comprobantes/:id
const updateComprobante = async (req, res) => {
  try {
    // 1.  Obtener ID del comprobante desde los parámetros de la URL
    const { id } = req.params;

    // 2.  Verificar que el comprobante existe y está activo
    const comprobanteExistente = await prisma.comprobantes.findFirst({
      where: {
        id: BigInt(id),
        id_estado: BigInt(1), // Solo comprobantes activos
        deleted_at: null, // Solo registros NO eliminados
      },
    });

    if (!comprobanteExistente) {
      return res.status(404).json({
        success: false,
        message: "Comprobante no encontrado o ya está eliminado",
      });
    }

    // 3.  Extraer nuevos datos del cuerpo de la petición
    const {
      codigo_comprobante,
      fecha,
      fecha_hora,
      fecha_vencimiento,
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
      id_tipo_operacion,
      id_estado_comprobante,
    } = req.body;

    // 4.  Calcular fecha de vencimiento si no viene en el body
    let calculatedFechaVencimiento = fecha_vencimiento;
    if (!calculatedFechaVencimiento && fecha) {
      const fechaDate = new Date(fecha);
      fechaDate.setDate(fechaDate.getDate() + 30); // Sumar 30 días
      calculatedFechaVencimiento = fechaDate;
    }

    // 5.  Preparar datos para actualizar (solo los campos que vienen en el body)
    const dataToUpdate = {
      updated_at: new Date(), // Siempre actualizar timestamp
    };

    // Solo actualizar campos que vengan en el body
    if (codigo_comprobante !== undefined) dataToUpdate.codigo_comprobante = codigo_comprobante;
    if (fecha !== undefined) dataToUpdate.fecha = new Date(fecha);
    if (fecha_hora !== undefined) dataToUpdate.fecha_hora = new Date(fecha_hora);
    if (calculatedFechaVencimiento !== undefined) dataToUpdate.fecha_vencimiento = new Date(calculatedFechaVencimiento);
    if (id_cliente !== undefined) dataToUpdate.id_cliente = id_cliente ? BigInt(id_cliente) : null;
    if (gravado15 !== undefined) dataToUpdate.gravado15 = gravado15 !== null ? parseFloat(gravado15) : null;
    if (gravado18 !== undefined) dataToUpdate.gravado18 = gravado18 !== null ? parseFloat(gravado18) : null;
    if (impuesto15 !== undefined) dataToUpdate.impuesto15 = impuesto15 !== null ? parseFloat(impuesto15) : null;
    if (impuesto18 !== undefined) dataToUpdate.impuesto18 = impuesto18 !== null ? parseFloat(impuesto18) : null;
    if (exento !== undefined) dataToUpdate.exento = exento !== null ? parseFloat(exento) : null;
    if (exonerado !== undefined) dataToUpdate.exonerado = exonerado !== null ? parseFloat(exonerado) : null;
    if (descuentos !== undefined) dataToUpdate.descuentos = descuentos !== null ? parseFloat(descuentos) : null;
    if (subtotal !== undefined) dataToUpdate.subtotal = subtotal !== null ? parseFloat(subtotal) : null;
    if (total !== undefined) dataToUpdate.total = total !== null ? parseFloat(total) : null;
    if (id_categoria !== undefined) dataToUpdate.id_categoria = id_categoria ? BigInt(id_categoria) : null;
    if (id_tipo_operacion !== undefined) dataToUpdate.id_tipo_operacion = id_tipo_operacion ? BigInt(id_tipo_operacion) : null;
    if (id_estado_comprobante !== undefined) dataToUpdate.id_estado_comprobante = id_estado_comprobante ? BigInt(id_estado_comprobante) : null;

    // Actualizar usuario si está disponible en req.user (del middleware de autenticación)
    if (req.user && req.user.id) {
      dataToUpdate.id_usuario = BigInt(req.user.id);
    }

    // 6.  Actualizar comprobante en la base de datos
    const comprobante = await prisma.comprobantes.update({
      where: {
        id: BigInt(id),
      },
      data: dataToUpdate,
      include: {
        categorias_comprobantes: true,
        clientes: true,
        estados_comprobantes: true,
        tipos_operaciones: true,
        users: true,
        ventas: true,
      },
    });

    // 7.  Actualizar la venta relacionada si existe
    // Buscar si hay una venta vinculada a este comprobante
    const ventaRelacionada = await prisma.ventas.findFirst({
      where: {
        id_comprobante: BigInt(id),
        deleted_at: null,
      },
    });

    if (ventaRelacionada) {
      // Preparar datos de la venta para actualizar
      const ventaDataToUpdate = {
        updated_at: new Date(),
      };

      // Actualizar codigo_venta si se actualizó codigo_comprobante
      if (codigo_comprobante !== undefined) {
        ventaDataToUpdate.codigo_venta = codigo_comprobante;
      }

      // Actualizar total si se actualizó el total del comprobante
      if (total !== undefined) {
        ventaDataToUpdate.total = total !== null ? parseFloat(total) : 0;
      }

      // Actualizar fecha si se actualizó fecha_hora
      if (fecha_hora !== undefined) {
        ventaDataToUpdate.fecha = new Date(fecha_hora);
      }

      // Actualizar usuario si está disponible
      if (req.user && req.user.id) {
        ventaDataToUpdate.id_usuario = BigInt(req.user.id);
      }

      // Actualizar la venta
      await prisma.ventas.update({
        where: {
          id: ventaRelacionada.id,
        },
        data: ventaDataToUpdate,
      });

      console.log(`✅ Venta ${ventaRelacionada.id} actualizada junto con el comprobante`);
    }

    // 8.  Enviar respuesta exitosa
    res.json({
      success: true,
      message: "Comprobante actualizado exitosamente",
      data: comprobante,
    });
  } catch (error) {
    //  Manejar errores
    console.error("Error actualizando comprobante:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

//  ELIMINAR COMPRA (SOFT DELETE)
// DELETE /api/comprobantes/:id - Compatible con soft delete de Laravel
const deleteComprobante = async (req, res) => {
  try {
    // 1.  Obtener ID de la comprobante desde los parámetros de la URL
    const { id } = req.params;

    console.log("🗑️ Soft delete de comprobante con ID:", id);

    // 2.  Verificar que la comprobante existe y está activa
    const comprobanteExistente = await prisma.comprobantes.findUnique({
      where: {
        id: BigInt(id),
        id_estado: BigInt(1), // Solo buscar comprobantes activas
      },
    });

    if (!comprobanteExistente) {
      return res.status(404).json({
        success: false,
        message: "❌ Comprobante no encontrada o ya está eliminada",
      });
    }

    // 3.  SOFT DELETE: Cambiar estado a inactivo y marcar deleted_at
    await prisma.comprobantes.update({
      where: { id: BigInt(id) },
      data: {
        id_estado: BigInt(2), // Cambiar estado a inactivo/eliminado
        deleted_at: new Date(), // Marcar como eliminado con timestamp actual
        updated_at: new Date(), // Actualizar timestamp de modificación
      },
    });

    console.log(" Comprobante marcada como eliminada (soft delete)");

    // 4.  Enviar respuesta exitosa
    res.json({
      success: true,
      message: " Comprobante eliminada exitosamente",
    });
  } catch (error) {
    // 🚨 Manejar errores (incluye error P2025 si el ID no existe)
    console.error(" Error eliminando comprobante:", error);
    res.status(500).json({
      success: false,
      message: " Error interno del servidor",
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
      id_venta,
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
        id_estado: BigInt(1), // Estado activo por defecto (asumir que 1 = activo)
        created_at: new Date(), // Timestamp de creación
        updated_at: new Date(), // Timestamp de última actualización
      },
    });

    console.log("Comprobante creado exitosamente:", comprobante.id);

    // 3.  Enviar respuesta exitosa
    res.status(201).json({
      success: true,
      message: "Comprobante creado exitosamente",
      data: comprobante,
    });
  } catch (error) {
    // Manejar errores
    console.error("Error creando comprobante:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

//  Exportar todas las funciones para usar en las rutas
module.exports = {
  getComprobantes, // GET /api/comprobantes
  createComprobante, // POST /api/comprobantes
  updateComprobante, // PUT /api/comprobantes/:id
  deleteComprobante, // DELETE /api/comprobantes/:id
  getComprobanteById, // GET /api/comprobantes/:id
};
