// 🔐 CONTROLADOR DE AUTENTICACIÓN
// Contiene la lógica de negocio para registro y login de usuarios

// 📦 Importaciones necesarias
const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');                     // Para hashear passwords de forma segura
const jwt = require('jsonwebtoken');                    // Para generar tokens de autenticación
const { validationResult } = require('express-validator'); // Para manejar errores de validación

// 🗄️ Crear instancia de Prisma para conectar con la base de datos

//  FUNCIÓN PARA GENERAR TOKEN JWT
// Un token JWT permite autenticar al usuario sin mantener sesiones en el servidor
const generateToken = (userId) => {
  // Convertir BigInt a string porque JWT no puede serializar BigInt
  const userIdString = typeof userId === 'bigint' ? userId.toString() : userId;

  // Crear token con:
  // - Payload: { userId: "123" }
  // - Clave secreta: desde variable de entorno
  // - Expiración: definida en .env (ej: 7d = 7 días)
  return jwt.sign(
    { userId: userIdString },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

//  CONTROLADOR DE REGISTRO
// Crea una nueva cuenta de usuario
const register = async (req, res) => {
  try {
    // 1. Verificar que las validaciones pasaron
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Si hay errores de validación, devolver error 400 con detalles
      return res.status(400).json({ errors: errors.array() });
    }

    // 2.  Extraer datos del cuerpo de la petición
    const { email, password, name } = req.body;

    // 3.  Verificar si el usuario ya existe en la base de datos
    const existingUser = await prisma.users.findUnique({
      where: { email }  // Buscar por email único
    });

    // Si ya existe, devolver error
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // 4. Hashear la password para almacenarla de forma segura
    // bcrypt.hash(password, saltRounds) - 12 es un buen nivel de seguridad
    const hashedPassword = await bcrypt.hash(password, 12);

    // 5. 💾 Crear el usuario en la base de datos
    const user = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,  // Guardar password hasheada, NUNCA en texto plano
        name
      }
    });

    // 6.  Generar token JWT para autenticación automática
    const token = generateToken(user.id);

    // 7. Enviar respuesta exitosa con token y datos del usuario
    res.status(201).json({
      message: 'Usuario creado exitosamente',
      token,
      expiresIn: process.env.JWT_EXPIRES_IN,
      user: {
        id: user.id.toString(),  // Convertir BigInt a string
        email: user.email,
        name: user.name
        // NO enviar la password hasheada por seguridad
      }
    });

  } catch (error) {
    //  Manejar errores inesperados
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

//  CONTROLADOR DE LOGIN
// Autentica un usuario existente
const login = async (req, res) => {
  try {
    // 1.  Verificar que las validaciones pasaron
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // 2.  Extraer credenciales del cuerpo de la petición
    const { email, password } = req.body;

    // 3.  Buscar usuario en la base de datos por email
    const user = await prisma.users.findUnique({
      where: { email }
    });

    // Si no existe el usuario, devolver error genérico por seguridad
    // (No decimos específicamente que el email no existe para evitar ataques de enumeración)
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 4.  Verificar que la password sea correcta
    // bcrypt.compare() compara la password en texto plano con la hasheada
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // Si la password es incorrecta, devolver error genérico
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 5. Si las credenciales son correctas, generar token JWT
    const token = generateToken(user.id);

    const userRoles = await prisma.role_user.findFirst({
      where: { user_id: user.id },
      include: { roles: true } // Incluir detalles del rol
    });


    // 6.  Enviar respuesta exitosa con token y datos del usuario
    res.json({
      message: 'Login exitoso',
      token,
      expiresIn: process.env.JWT_EXPIRES_IN,
      user: {
        id: user.id.toString(),  // Convertir BigInt a string
        name: user.name,
        email: user.email,
        role: userRoles.role_id,
        // NO enviar la password por seguridad
      }
    });

  } catch (error) {
    //  Manejar errores inesperados
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

//  Exportar las funciones para usar en las rutas
module.exports = {
  register,
  login
};