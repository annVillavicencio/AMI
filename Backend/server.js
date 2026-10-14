const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Rutas de API
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/compras', require('./routes/compras'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/costos', require('./routes/costos'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/recursosHumanos', require('./routes/recursosHumanos'));

// Servir frontend estático para Docker o ejecución directa
app.use(express.static(path.join(__dirname, '../Fronted')));

// Redirigir raíz a inventario
app.get('/', (req, res) => {
    res.redirect('/Pages/inventario.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(Servidor corriendo en puerto );
});
