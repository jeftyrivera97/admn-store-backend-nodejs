// CONTROLADOR DE COMPRAS
// Contiene la lógica CRUD (Create, Read, Update, Delete) para gestionar compras/pedidos

//  Importaciones necesarias
const prisma = require('../utils/prisma'); // Instancia singleton de Prisma
const { validationResult } = require("express-validator"); // Para manejar errores de validación

// --- FUNCIONES AUXILIARES ---
const buildSearchFilter = (search) => {
  const baseFilter = { id_estado: BigInt(1), deleted_at: null };

  if (!search || !String(search).trim()) return baseFilter;

  const s = String(search).trim();
  const or = [
    { codigo_compra: { contains: s, mode: "insensitive" } },
    // Removido 'descripcion' porque no existe en tabla compras
    {
      categorias_compras: {
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
        SELECT to_char(date_trunc('month', c.fecha), 'YYYY-MM') AS month, COALESCE(SUM(c.total),0) AS total
        FROM compras c
        LEFT JOIN categorias_compras cat ON c.id_categoria = cat.id
        WHERE c.fecha >= ${yearRange.gte} AND c.fecha < ${yearRange.lt}
          AND c.id_estado = ${BigInt(1)} AND c.deleted_at IS NULL
          AND (c.codigo_compra ILIKE ${searchParam} OR cat.descripcion ILIKE ${searchParam} OR c.total = ${num})
        GROUP BY 1 ORDER BY 1
      `;
    } else {
      monthlyRows = await prisma.$queryRaw`
        SELECT to_char(date_trunc('month', c.fecha), 'YYYY-MM') AS month, COALESCE(SUM(c.total),0) AS total
        FROM compras c
        LEFT JOIN categorias_compras cat ON c.id_categoria = cat.id
        WHERE c.fecha >= ${yearRange.gte} AND c.fecha < ${yearRange.lt}
          AND c.id_estado = ${BigInt(1)} AND c.deleted_at IS NULL
          AND (c.codigo_compra ILIKE ${searchParam} OR cat.descripcion ILIKE ${searchParam})
        GROUP BY 1 ORDER BY 1
      `;
    }
  } else {
    monthlyRows = await prisma.$queryRaw`
      SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS month, COALESCE(SUM(total),0) AS total
      FROM compras
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
  const groupByCat = await prisma.compras.groupBy({
    by: ["id_categoria"],
    where: { ...baseFilter, fecha: monthRange },
    _sum: { total: true },
  });

  const categoryIds = groupByCat.map((g) => g.id_categoria).filter(Boolean);
  const categories = categoryIds.length
    ? await prisma.categorias_compras.findMany({
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
    ? await prisma.tipos_compras.findMany({
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

// OBTENER LISTA DE COMPRAS (READ)
// GET /compras?page=1&limit=50&search=ABC&month=2025-02
const getCompras = async (req, res) => {
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
    const [compras, totalAgg, totals] = await Promise.all([
      prisma.compras.findMany({
        where: whereList,
        skip,
        take: limitNum,
        orderBy: { created_at: "desc" },
        include: {
          categorias_compras: true,
          estados: true,
          proveedores: true,
          tipos_operaciones: true,
          estados_operaciones: true,
        },
      }),
      prisma.compras.aggregate({ where: whereList, _count: { _all: true } }),
      Promise.all([
        prisma.compras.aggregate({
          where: { ...baseFilter, fecha: monthRange },
          _sum: { total: true },
        }),
        prisma.compras.aggregate({
          where: { ...baseFilter, fecha: prevMonthRange },
          _sum: { total: true },
        }),
        prisma.compras.aggregate({
          where: { ...baseFilter, fecha: yearRange },
          _sum: { total: true },
        }),
        prisma.compras.aggregate({
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
        totalMes === 0
          ? 0
          : Number(((g._sum?.total ?? 0) / totalMes) * 100).toFixed(2),
    }));

    res.json({
      data: compras,
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
    console.error("Error obteniendo compras:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

//  OBTENER COMPRA POR ID (READ)
// GET /api/compras/:id
const getCompraById = async (req, res) => {
  try {
    // 1.  Obtener ID de la compra desde los parámetros de la URL
    const { id } = req.params;

    console.log(" Buscando compra con ID:", id);

    // 2. Buscar compra específica en la base de datos (solo activas)
    const compra = await prisma.compras.findUnique({
      where: {
        id: BigInt(id),
        id_estado: BigInt(1), // Solo compras activas
        deleted_at: null, // Solo registros NO eliminados
      },
      include: {
        categorias_compras: true,
        proveedores: true,
        tipos_operaciones: true,
        estados_operaciones: true,
        compra_detalles: { include: { productos: true } }, // Incluir detalles y productos relacionados
      },
    });

    // 3. Verificar si la compra existe
    if (!compra) {
      return res.status(404).json({
        success: false,
        message: " Compra no encontrada",
      });
    }

    // 4.  Enviar respuesta exitosa con los datos de la compra
    res.json({
      success: true,
      message: " Compra encontrada",
      data: compra,
    });
  } catch (error) {
    //  Manejar errores (incluye error P2025 si el ID no existe)
    console.error(" Error obteniendo compra:", error);
    res.status(500).json({
      success: false,
      message: " Error interno del servidor",
    });
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
    const {
      codigo_compra,
      fecha,
      descripcion,
      id_categoria,
      id_proveedor,
      id_tipo_operacion,
      fecha_pago,
      gravado15,
      gravado18,
      impuesto15,
      impuesto18,
      exento,
      exonerado,
      total,
    } = req.body;

    console.log("Datos que vienen del front end:", req.body);

    // 3.  Obtener ID del usuario autenticado desde el token JWT
    // req.user fue establecido por authMiddleware
    const userId = BigInt(req.user.userId); // Convertir de string a BigInt para Prisma

    // Normalizar tipos para Prisma
    const id_categoriaBI = id_categoria ? BigInt(id_categoria) : null;
    const id_proveedorBI = id_proveedor ? BigInt(id_proveedor) : null;
    const id_tipo_operacionBI = id_tipo_operacion
      ? BigInt(id_tipo_operacion)
      : null;
    const gravado15Num =
      gravado15 !== undefined && gravado15 !== ""
        ? parseFloat(gravado15)
        : null;
    const gravado18Num =
      gravado18 !== undefined && gravado18 !== ""
        ? parseFloat(gravado18)
        : null;
    const impuesto15Num =
      impuesto15 !== undefined && impuesto15 !== ""
        ? parseFloat(impuesto15)
        : null;
    const impuesto18Num =
      impuesto18 !== undefined && impuesto18 !== ""
        ? parseFloat(impuesto18)
        : null;
    const exentoNum =
      exento !== undefined && exento !== "" ? parseFloat(exento) : null;
    const exoneradoNum =
      exonerado !== undefined && exonerado !== ""
        ? parseFloat(exonerado)
        : null;
    const totalNum =
      total !== undefined && total !== "" ? parseFloat(total) : null;

    // Determinar estado de operación en BigInt
    const id_estado_operacion = id_tipo_operacionBI === 1n ? 1n : 2n;

    const dscr = descripcion ? descripcion : "Compra de Productos";

    // 4. Crear compra en la base de datos
    const compra = await prisma.compras.create({
      data: {
        codigo_compra,
        fecha: fecha,
        descripcion: dscr,
        id_categoria: id_categoriaBI,
        id_proveedor: id_proveedorBI,
        id_tipo_operacion: id_tipo_operacionBI,
        id_estado_operacion,
        fecha_pago: fecha_pago ? fecha_pago : fecha, // Permitir null si no se proporciona
        gravado15: gravado15Num,
        gravado18: gravado18Num,
        impuesto15: impuesto15Num,
        impuesto18: impuesto18Num,
        exento: exentoNum,
        exonerado: exoneradoNum,
        total: totalNum,
        id_estado: BigInt(1),
        id_usuario: userId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log(" Compra creada exitosamente:", compra.id);

    // 5.  Enviar respuesta exitosa
    res.status(201).json({
      success: true,
      message: " Compra creada exitosamente",
      data: compra,
    });
  } catch (error) {
    // Manejar errores
    console.error("Error creando compra:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

//  CREAR DETALLE DE COMPRA (CREATE)
// POST /api/compras/:id/detalles
const createCompraDetalle = async (req, res) => {
  try {
    // 1.  Verificar que las validaciones pasaron
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // 2.  Obtener ID de la compra desde los parámetros de la URL
    const { id } = req.params;

    // 3.  Extraer datos del cuerpo de la petición
    const { items } = req.body;

    // 4.  Obtener ID del usuario autenticado desde el token JWT
    const userId = BigInt(req.user.userId);

    // 5. Crear detalles usando Promise.all para mejor manejo de errores
    const detallesCreados = await Promise.all(
      items.map(async (element, index) => {
        return await prisma.compra_detalles.create({
          data: {
            linea: index + 1, // Línea automática: 1, 2, 3, 4...
            id_compra: BigInt(id), // ID de la URL
            id_producto: BigInt(element.id_producto),
            cantidad: element.cantidad,
            costo: element.costo,
            total_linea: element.total_linea,
            id_estado: BigInt(1),
            id_usuario: userId,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      })
    );

    console.log("✅ Detalles de Compra creados exitosamente para compra:", id);

    // 6.  Enviar respuesta exitosa
    res.status(201).json({
      success: true,
      message: `✅ ${detallesCreados.length} detalles de compra creados exitosamente`,
      data: detallesCreados,
    });
  } catch (error) {
    console.error("Error creando detalle de Compra:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

//  ACTUALIZAR COMPRA EXISTENTE (UPDATE)
// PUT /api/compras/:id
const updateCompra = async (req, res) => {
  try {
    // 1.  Obtener ID de la compra desde los parámetros de la URL
    const { id } = req.params;

    // 2.  Extraer nuevos datos del cuerpo de la petición
    const {
      codigo_compra,
      descripcion,
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
    } = req.body;

    // 3.  Actualizar compra en la base de datos (solo si está activa)
    const compra = await prisma.compras.update({
      where: {
        id: BigInt(id),
        id_estado: BigInt(1), // Solo actualizar compras activas
        deleted_at: null, // Solo registros NO eliminados
      },
      data: {
        codigo_compra,
        descripcion,
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
        updated_at: new Date(), // Actualizar timestamp de modificación
      },
    });

    // 4.  Enviar respuesta exitosa
    res.json({
      message: "Compra actualizado exitosamente",
      data: compra,
    });
  } catch (error) {
    //  Manejar errores (incluye error P2025 si el ID no existe)
    console.error("Error actualizando compra:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

//  ELIMINAR COMPRA (SOFT DELETE)
// DELETE /api/compras/:id - Compatible con soft delete de Laravel
const deleteCompra = async (req, res) => {
  try {
    // 1.  Obtener ID de la compra desde los parámetros de la URL
    const { id } = req.params;

    console.log("🗑️ Soft delete de compra con ID:", id);

    // 2.  Verificar que la compra existe y está activa
    const compraExistente = await prisma.compras.findUnique({
      where: {
        id: BigInt(id),
        id_estado: BigInt(1), // Solo buscar compras activas
      },
    });

    if (!compraExistente) {
      return res.status(404).json({
        success: false,
        message: "❌ Compra no encontrada o ya está eliminada",
      });
    }

    // 3.  SOFT DELETE: Cambiar estado a inactivo y marcar deleted_at
    await prisma.compras.update({
      where: { id: BigInt(id) },
      data: {
        id_estado: BigInt(2), // Cambiar estado a inactivo/eliminado
        deleted_at: new Date(), // Marcar como eliminado con timestamp actual
        updated_at: new Date(), // Actualizar timestamp de modificación
      },
    });

    console.log(" Compra marcada como eliminada (soft delete)");

    // 4.  Enviar respuesta exitosa
    res.json({
      success: true,
      message: " Compra eliminada exitosamente",
    });
  } catch (error) {
    // 🚨 Manejar errores (incluye error P2025 si el ID no existe)
    console.error(" Error eliminando compra:", error);
    res.status(500).json({
      success: false,
      message: " Error interno del servidor",
    });
  }
};

//  Exportar todas las funciones para usar en las rutas
module.exports = {
  getCompras, // GET /api/compras
  createCompra, // POST /api/compras
  updateCompra, // PUT /api/compras/:id
  deleteCompra, // DELETE /api/compras/:id
  getCompraById, // GET /api/compras/:id
  createCompraDetalle, // POST /api/compras/detalles
};
