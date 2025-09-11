require('dotenv').config();     // 1. Carga variables de .env
const app = require('./src/app'); // 2. Importa la app de Express
const PORT = process.env.PORT || 3001; // 3. Define el puerto

app.listen(PORT, () => {        // 4. Inicia el servidor
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});