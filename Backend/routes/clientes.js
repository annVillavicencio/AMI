const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`SELECT c.*, o.NombreCanal as Origen FROM Clientes c LEFT JOIN OrigenesClientes o ON c.idOrigen = o.idOrigen`);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const pool = await getPool();
        const { Nombre, Apellido, Telefono, Correo, Cedula, FechaRegistro } = req.body;
        
        // Origen default = 1
        const insertQuery = `
            INSERT INTO Clientes (Nombre, Apellido, Telefono, Correo, Cedula, idOrigen, FechaRegistro) 
            VALUES (@Nombre, @Apellido, @Telefono, @Correo, @Cedula, 1, @FechaRegistro)
        `;
        
        await pool.request()
            .input('Nombre', sql.VarChar, Nombre)
            .input('Apellido', sql.VarChar, Apellido)
            .input('Telefono', sql.VarChar, Telefono)
            .input('Correo', sql.VarChar, Correo)
            .input('Cedula', sql.VarChar, Cedula)
            .input('FechaRegistro', sql.Date, FechaRegistro || new Date())
            .query(insertQuery);
            
        res.status(201).json({ message: 'Cliente agregado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const { Nombre, Apellido, Telefono, Correo, Cedula } = req.body;
        const { id } = req.params;
        
        const updateQuery = `
            UPDATE Clientes 
            SET Nombre = @Nombre, Apellido = @Apellido, Telefono = @Telefono, Correo = @Correo, Cedula = @Cedula
            WHERE IdClientes = @id
        `;
        
        await pool.request()
            .input('id', sql.Int, id)
            .input('Nombre', sql.VarChar, Nombre)
            .input('Apellido', sql.VarChar, Apellido)
            .input('Telefono', sql.VarChar, Telefono)
            .input('Correo', sql.VarChar, Correo)
            .input('Cedula', sql.VarChar, Cedula)
            .query(updateQuery);
            
        res.json({ message: 'Cliente actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const { id } = req.params;
        
        const deleteQuery = `DELETE FROM Clientes WHERE IdClientes = @id`;
        await pool.request()
            .input('id', sql.Int, id)
            .query(deleteQuery);
            
        res.json({ message: 'Cliente eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
