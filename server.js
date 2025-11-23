require('dotenv').config();     // 1. Carga variables de .env
const app = require('./src/app'); // 2. Importa la app de Express
const PORT = process.env.PORT || 3001; // 3. Define el puerto
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces (necesario para Docker)

app.listen(PORT, HOST, () => {        // 4. Inicia el servidor
  console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
});