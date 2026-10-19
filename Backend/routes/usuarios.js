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

module.exports = router;
