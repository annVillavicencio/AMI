const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// Listar todos los usuarios con su rol y datos de empleado
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                u.idUsuario,
                u.correo,
                u.contrasena,
                u.idRol,
                ISNULL(r.NombreRol, 'Sin Rol') AS NombreRol,
                ISNULL(u.EstadoUser, 'Activo') AS EstadoUser,
                u.fechaCreacion,
                u.CodigoEmpleado,
                ISNULL(e.NombreEmpleado, '') AS Nombre,
                ISNULL(e.ApellidoEmpleado, '') AS Apellido
            FROM Usuarios u
            LEFT JOIN rol r ON u.idRol = r.idRol
            LEFT JOIN Empleado e ON u.CodigoEmpleado = e.CodigoEmpleado
            ORDER BY u.idUsuario ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al listar usuarios:', err);
        res.status(500).json({ error: err.message });
    }
});

// Listar catálogo de roles
router.get('/roles', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT idRol, NombreRol, Descripcion FROM rol ORDER BY idRol ASC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Listar catálogo de empleados disponibles
router.get('/empleados', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT CodigoEmpleado, NombreEmpleado, ApellidoEmpleado 
            FROM Empleado 
            ORDER BY NombreEmpleado ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear nuevo usuario
router.post('/', async (req, res) => {
    try {
        const nombre = (req.body.nombre || req.body.Nombre || '').trim();
        const apellido = (req.body.apellido || req.body.Apellido || '').trim();
        const correo = (req.body.correo || req.body.Correo || '').trim();
        const contrasena = (req.body.contrasena || req.body.Contrasena || '').trim();
        const idRol = req.body.idRol || req.body.IdRol;
        const estado = req.body.estado || req.body.Estado || req.body.EstadoUser || 'Activo';
        let empCode = (req.body.codigoEmpleado || req.body.CodigoEmpleado || '').trim();

        if (!correo || !contrasena || !idRol) {
            return res.status(400).json({ error: 'Correo, contraseña y rol son obligatorios' });
        }

        const pool = await getPool();

        // Verificar si el correo ya existe
        const checkUser = await pool.request()
            .input('correo', sql.VarChar, correo)
            .query('SELECT idUsuario FROM Usuarios WHERE correo = @correo');

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ error: 'Ya existe un usuario registrado con este correo electrónico' });
        }

        // Si no se proporcionó código de empleado pero sí nombre/apellido, verificar si ya existe
        if (!empCode && (nombre || apellido)) {
            const empCheck = await pool.request()
                .input('nom', sql.VarChar, nombre)
                .input('ape', sql.VarChar, apellido)
                .query(`
                    SELECT TOP 1 CodigoEmpleado 
                    FROM Empleado 
                    WHERE LOWER(NombreEmpleado) = LOWER(@nom) AND LOWER(ApellidoEmpleado) = LOWER(@ape)
                `);

            if (empCheck.recordset.length > 0) {
                empCode = empCheck.recordset[0].CodigoEmpleado;
            } else {
                // Crear un nuevo registro en Empleado con todas las columnas obligatorias
                const countEmp = await pool.request().query('SELECT COUNT(*) AS total FROM Empleado');
                const nextNum = (countEmp.recordset[0].total || 0) + 1;
                empCode = `EMP${String(nextNum).padStart(3, '0')}`;
                const newIdEmp = String(Date.now()).slice(-8);
                const fakeCedula = `001-${String(Math.floor(100000 + Math.random() * 900000))}-${String(Math.floor(1000 + Math.random() * 9000))}U`;

                await pool.request()
                    .input('IdEmpleado', sql.VarChar, newIdEmp)
                    .input('CodigoEmpleado', sql.VarChar, empCode)
                    .input('NombreEmpleado', sql.VarChar, nombre || 'Usuario')
                    .input('ApellidoEmpleado', sql.VarChar, apellido || 'AMI')
                    .input('IdCargo', sql.Int, 1)
                    .input('idDepartamento', sql.Int, 1)
                    .input('SalarioBase', sql.Decimal(10, 2), 0.00)
                    .input('EstadoEmpleado', sql.VarChar, 'Activo')
                    .input('Cedula', sql.VarChar, fakeCedula)
                    .query(`
                        INSERT INTO Empleado (
                            IdEmpleado, CodigoEmpleado, NombreEmpleado, ApellidoEmpleado, 
                            IdCargo, idDepartamento, FechaIngreso, SalarioBase, EstadoEmpleado, Cedula
                        ) VALUES (
                            @IdEmpleado, @CodigoEmpleado, @NombreEmpleado, @ApellidoEmpleado,
                            @IdCargo, @idDepartamento, GETDATE(), @SalarioBase, @EstadoEmpleado, @Cedula
                        )
                    `);
            }
        }

        // Si aún no hay empCode, seleccionar uno disponible o asignar EMP001
        if (!empCode) {
            const fallbackEmp = await pool.request().query('SELECT TOP 1 CodigoEmpleado FROM Empleado ORDER BY CodigoEmpleado ASC');
            empCode = fallbackEmp.recordset.length > 0 ? fallbackEmp.recordset[0].CodigoEmpleado : 'EMP001';
        }

        const insertQuery = `
            INSERT INTO Usuarios (correo, contrasena, idRol, fechaCreacion, EstadoUser, CodigoEmpleado)
            VALUES (@correo, @contrasena, @idRol, GETDATE(), @EstadoUser, @CodigoEmpleado);
            SELECT SCOPE_IDENTITY() AS idUsuario;
        `;

        const insRes = await pool.request()
            .input('correo', sql.VarChar, correo)
            .input('contrasena', sql.VarChar, contrasena)
            .input('idRol', sql.Int, parseInt(idRol))
            .input('EstadoUser', sql.VarChar, estado)
            .input('CodigoEmpleado', sql.VarChar, empCode)
            .query(insertQuery);

        const newId = insRes.recordset[0]?.idUsuario;

        res.status(201).json({ 
            message: 'Usuario creado correctamente', 
            idUsuario: newId,
            codigoEmpleado: empCode 
        });
    } catch (err) {
        console.error('Error al crear usuario:', err);
        res.status(500).json({ error: err.message });
    }
});

// Actualizar usuario
router.put('/:id', async (req, res) => {
    try {
        const idUsuario = parseInt(req.params.id);
        const nombre = (req.body.nombre || req.body.Nombre || '').trim();
        const apellido = (req.body.apellido || req.body.Apellido || '').trim();
        const correo = (req.body.correo || req.body.Correo || '').trim();
        const contrasena = (req.body.contrasena || req.body.Contrasena || '').trim();
        const idRol = req.body.idRol || req.body.IdRol;
        const estado = req.body.estado || req.body.Estado || req.body.EstadoUser || 'Activo';
        const codigoEmpleado = (req.body.codigoEmpleado || req.body.CodigoEmpleado || '').trim();

        const pool = await getPool();

        // Obtener usuario actual
        const curUserRes = await pool.request()
            .input('idUsuario', sql.Int, idUsuario)
            .query('SELECT CodigoEmpleado, contrasena FROM Usuarios WHERE idUsuario = @idUsuario');

        if (curUserRes.recordset.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const curUser = curUserRes.recordset[0];
        const passToUse = contrasena ? contrasena : curUser.contrasena;
        const targetEmpCode = codigoEmpleado || curUser.CodigoEmpleado;

        const updateQuery = `
            UPDATE Usuarios SET
                correo = @correo,
                contrasena = @contrasena,
                idRol = @idRol,
                EstadoUser = @EstadoUser,
                CodigoEmpleado = @CodigoEmpleado
            WHERE idUsuario = @idUsuario
        `;

        await pool.request()
            .input('idUsuario', sql.Int, idUsuario)
            .input('correo', sql.VarChar, correo)
            .input('contrasena', sql.VarChar, passToUse)
            .input('idRol', sql.Int, parseInt(idRol))
            .input('EstadoUser', sql.VarChar, estado)
            .input('CodigoEmpleado', sql.VarChar, targetEmpCode)
            .query(updateQuery);

        // Actualizar nombres en Empleado si se proporcionaron y existe el empleado
        if (targetEmpCode && (nombre || apellido)) {
            await pool.request()
                .input('CodigoEmpleado', sql.VarChar, targetEmpCode)
                .input('NombreEmpleado', sql.VarChar, nombre)
                .input('ApellidoEmpleado', sql.VarChar, apellido)
                .query(`
                    UPDATE Empleado SET
                        NombreEmpleado = CASE WHEN @NombreEmpleado <> '' THEN @NombreEmpleado ELSE NombreEmpleado END,
                        ApellidoEmpleado = CASE WHEN @ApellidoEmpleado <> '' THEN @ApellidoEmpleado ELSE ApellidoEmpleado END
                    WHERE CodigoEmpleado = @CodigoEmpleado
                `);
        }

        res.json({ message: 'Usuario actualizado correctamente', idUsuario });
    } catch (err) {
        console.error('Error al actualizar usuario:', err);
        res.status(500).json({ error: err.message });
    }
});

// Eliminar usuario
router.delete('/:id', async (req, res) => {
    try {
        const idUsuario = parseInt(req.params.id);
        const pool = await getPool();

        await pool.request()
            .input('idUsuario', sql.Int, idUsuario)
            .query('DELETE FROM Usuarios WHERE idUsuario = @idUsuario');

        res.json({ message: 'Usuario eliminado correctamente', idUsuario });
    } catch (err) {
        console.error('Error al eliminar usuario:', err);
        res.status(500).json({ error: err.message });
    }
});


// -------------------------------------------------------------
// GET /api/usuarios/perfil/:id: Obtener información completa del perfil del usuario logueado
// -------------------------------------------------------------
router.get('/perfil/:id', async (req, res) => {
    try {
        const idUsuario = parseInt(req.params.id, 10);
        if (isNaN(idUsuario)) {
            return res.status(400).json({ error: 'ID de usuario inválido' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('idUsuario', sql.Int, idUsuario)
            .query(`
                SELECT 
                    u.idUsuario,
                    u.correo,
                    u.idRol,
                    ISNULL(r.NombreRol, 'Sin Rol') AS NombreRol,
                    ISNULL(u.EstadoUser, 'Activo') AS EstadoUser,
                    CONVERT(VARCHAR(10), u.fechaCreacion, 120) AS fechaCreacion,
                    u.CodigoEmpleado,
                    ISNULL(e.NombreEmpleado, '') AS NombreEmpleado,
                    ISNULL(e.ApellidoEmpleado, '') AS ApellidoEmpleado,
                    ISNULL(e.Cedula, 'N/D') AS Cedula,
                    CONVERT(VARCHAR(10), e.FechaIngreso, 120) AS FechaIngreso,
                    ISNULL(c.NombreCargo, 'Colaborador') AS NombreCargo,
                    ISNULL(d.NombreDepartamento, 'General') AS NombreDepartamento
                FROM Usuarios u
                LEFT JOIN rol r ON u.idRol = r.idRol
                LEFT JOIN Empleado e ON u.CodigoEmpleado = e.CodigoEmpleado
                LEFT JOIN Cargo c ON e.IdCargo = c.IdCargo
                LEFT JOIN Departamento d ON e.idDepartamento = d.idDepartamento
                WHERE u.idUsuario = @idUsuario
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = result.recordset[0];
        
        // Consultar los permisos del rol
        const permisosRes = await pool.request()
            .input('idRol', sql.Int, user.idRol)
            .query('SELECT modulo, puedeVer, puedeAgregar, puedeEditar, puedeEliminar FROM Permisos WHERE idRol = @idRol');
        user.permisos = permisosRes.recordset;

        res.json(user);
    } catch (err) {
        console.error('Error al obtener perfil:', err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------------------------------------------------
// PUT /api/usuarios/perfil/:id: Actualizar datos personales y/o contraseña del perfil
// -------------------------------------------------------------
router.put('/perfil/:id', async (req, res) => {
    try {
        const idUsuario = parseInt(req.params.id, 10);
        if (isNaN(idUsuario)) {
            return res.status(400).json({ error: 'ID de usuario inválido' });
        }

        const { nombre, apellido, correo, contrasenaActual, nuevaContrasena } = req.body;
        const pool = await getPool();

        // 1. Obtener datos actuales del usuario
        const curUserRes = await pool.request()
            .input('idUsuario', sql.Int, idUsuario)
            .query('SELECT idUsuario, contrasena, CodigoEmpleado, correo FROM Usuarios WHERE idUsuario = @idUsuario');

        if (curUserRes.recordset.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const curUser = curUserRes.recordset[0];

        // 2. Si se solicitó cambio de contraseña, validar contraseña actual
        let passwordToSet = curUser.contrasena;
        if (nuevaContrasena && nuevaContrasena.trim().length > 0) {
            if (!contrasenaActual || contrasenaActual.trim() !== curUser.contrasena.trim()) {
                return res.status(400).json({ error: 'La contraseña actual ingresada es incorrecta.' });
            }
            if (nuevaContrasena.trim().length < 4) {
                return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres.' });
            }
            passwordToSet = nuevaContrasena.trim();
        }

        const correoToSet = (correo && correo.trim()) ? correo.trim() : curUser.correo;

        // 3. Actualizar correo y contraseña en Usuarios
        await pool.request()
            .input('idUsuario', sql.Int, idUsuario)
            .input('correo', sql.VarChar, correoToSet)
            .input('contrasena', sql.VarChar, passwordToSet)
            .query(`
                UPDATE Usuarios 
                SET correo = @correo, contrasena = @contrasena 
                WHERE idUsuario = @idUsuario
            `);

        // 4. Si tiene Empleado vinculado y se enviaron nombres, actualizar Empleado
        let nombreCompletoFinal = correoToSet;
        if (curUser.CodigoEmpleado && (nombre || apellido)) {
            const nomTrim = (nombre || '').trim();
            const apeTrim = (apellido || '').trim();
            await pool.request()
                .input('CodigoEmpleado', sql.VarChar, curUser.CodigoEmpleado)
                .input('NombreEmpleado', sql.VarChar, nomTrim)
                .input('ApellidoEmpleado', sql.VarChar, apeTrim)
                .query(`
                    UPDATE Empleado SET
                        NombreEmpleado = CASE WHEN @NombreEmpleado <> '' THEN @NombreEmpleado ELSE NombreEmpleado END,
                        ApellidoEmpleado = CASE WHEN @ApellidoEmpleado <> '' THEN @ApellidoEmpleado ELSE ApellidoEmpleado END
                    WHERE CodigoEmpleado = @CodigoEmpleado
                `);
            nombreCompletoFinal = `${nomTrim} ${apeTrim}`.trim();
        }

        res.json({ 
            mensaje: 'Perfil actualizado con éxito',
            usuario: {
                id: idUsuario,
                correo: correoToSet,
                nombre: nombreCompletoFinal
            }
        });
    } catch (err) {
        console.error('Error al actualizar perfil:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

