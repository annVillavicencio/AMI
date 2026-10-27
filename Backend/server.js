const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { sql, getPool } = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// Rutas de API
// Ruta directa de autenticación (Login)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { correo, contrasena } = req.body;

        if (!correo || !contrasena) {
            return res.status(400).json({ error: 'Correo y contraseña requeridos' });
        }

        const pool = await getPool();
        const query = `
            SELECT 
                u.idUsuario,
                u.correo,
                u.EstadoUser,
                u.CodigoEmpleado,
                r.idRol,
                r.NombreRol,
                e.NombreEmpleado,
                e.ApellidoEmpleado
            FROM Usuarios u
            INNER JOIN rol r ON u.idRol = r.idRol
            LEFT JOIN Empleado e ON u.CodigoEmpleado = e.CodigoEmpleado
            WHERE u.correo = @correo AND u.contrasena = @contrasena
        `;

        const result = await pool.request()
            .input('correo', sql.VarChar, correo.trim())
            .input('contrasena', sql.VarChar, contrasena.trim())
            .query(query);

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        }

        const usuario = result.recordset[0];

        if (usuario.EstadoUser !== 'Activo') {
            return res.status(403).json({ error: 'Tu usuario se encuentra inactivo. Contacta al administrador.' });
        }

        // Consultar los permisos asignados a su rol
        const permisosResult = await pool.request()
            .input('idRol', sql.Int, usuario.idRol)
            .query('SELECT modulo, puedeVer, puedeAgregar, puedeEditar, puedeEliminar FROM Permisos WHERE idRol = @idRol');

        res.json({
            mensaje: 'Inicio de sesión exitoso',
            usuario: {
                id: usuario.idUsuario,
                correo: usuario.correo,
                nombre: usuario.NombreEmpleado ? `${usuario.NombreEmpleado} ${usuario.ApellidoEmpleado}` : usuario.correo,
                rol: usuario.NombreRol,
                idRol: usuario.idRol,
                permisos: permisosResult.recordset
            }
        });

    } catch (err) {
        console.error('Error en autenticación:', err);
        res.status(500).json({ error: 'Error interno del servidor: ' + err.message });
    }
});

app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/facturas', require('./routes/facturas'));
app.use('/api/compras', require('./routes/compras'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/costos', require('./routes/costos'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/recursosHumanos', require('./routes/recursosHumanos'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/finanzas', require('./routes/finanzas'));

// Servir frontend estático para Docker o ejecución directa
app.use(express.static(path.join(__dirname, '../Fronted')));

// Endpoint para refrescar permisos de un usuario
app.get('/api/auth/permisos/:idUsuario', async (req, res) => {
    try {
        const pool = await getPool();
        const userRes = await pool.request()
            .input('id', sql.Int, parseInt(req.params.idUsuario, 10))
            .query(`
                SELECT u.idUsuario, u.correo, u.EstadoUser, u.CodigoEmpleado, r.idRol, r.NombreRol,
                       e.NombreEmpleado, e.ApellidoEmpleado
                FROM Usuarios u
                INNER JOIN rol r ON u.idRol = r.idRol
                LEFT JOIN Empleado e ON u.CodigoEmpleado = e.CodigoEmpleado
                WHERE u.idUsuario = @id
            `);

        if (userRes.recordset.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const usuario = userRes.recordset[0];
        const permisosRes = await pool.request()
            .input('idRol', sql.Int, usuario.idRol)
            .query('SELECT modulo, puedeVer, puedeAgregar, puedeEditar, puedeEliminar FROM Permisos WHERE idRol = @idRol');

        res.json({
            id: usuario.idUsuario,
            correo: usuario.correo,
            nombre: usuario.NombreEmpleado ? `${usuario.NombreEmpleado} ${usuario.ApellidoEmpleado}` : usuario.correo,
            rol: usuario.NombreRol,
            idRol: usuario.idRol,
            permisos: permisosRes.recordset
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Redirigir raíz a Inicio (Dashboard)
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
