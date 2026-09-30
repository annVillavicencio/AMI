const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const query = `
            SELECT 
                a.idAuto AS ID_Auto,
                m.NombreMarca AS Marca,
                mo.NombreModelo AS Modelo,
                a.Descripcion,
                a.Placa,
                a.Anio,
                a.Precio,
                a.Estado,
                a.CostoAdquisicion,
                a.FechaIngresoInventario
            FROM Auto a
            LEFT JOIN Modelos mo ON a.idModelo = mo.idModelo
            LEFT JOIN Marca m ON mo.idMarca = m.idMarca
        `;
        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const pool = await getPool();
        const { Marca, Modelo, Descripcion, Placa, Anio, Precio, CostoAdquisicion, FechaIngresoInventario, Estado } = req.body;
        
        let idMarcaResult = await pool.request()
            .input('Marca', sql.VarChar, Marca || 'Desconocida')
            .query('SELECT idMarca FROM Marca WHERE NombreMarca = @Marca');
        let idMarca;
        if (idMarcaResult.recordset.length === 0) {
            let newM = await pool.request()
                .input('Marca', sql.VarChar, Marca || 'Desconocida')
                .query('INSERT INTO Marca (NombreMarca) OUTPUT INSERTED.idMarca VALUES (@Marca)');
            idMarca = newM.recordset[0].idMarca;
        } else {
            idMarca = idMarcaResult.recordset[0].idMarca;
        }

        let idModResult = await pool.request()
            .input('idMarca', sql.Int, idMarca)
            .input('Modelo', sql.VarChar, Modelo || 'Desconocido')
            .query('SELECT idModelo FROM Modelos WHERE NombreModelo = @Modelo AND idMarca = @idMarca');
        let idModelo;
        if (idModResult.recordset.length === 0) {
            let newMod = await pool.request()
                .input('idMarca', sql.Int, idMarca)
                .input('Modelo', sql.VarChar, Modelo || 'Desconocido')
                .query('INSERT INTO Modelos (idMarca, NombreModelo) OUTPUT INSERTED.idModelo VALUES (@idMarca, @Modelo)');
            idModelo = newMod.recordset[0].idModelo;
        } else {
            idModelo = idModResult.recordset[0].idModelo;
        }

        const insertQuery = `
            INSERT INTO Auto (idModelo, Anio, CostoAdquisicion, FechaIngresoInventario, Estado, Placa, Precio, Descripcion)
            VALUES (@idModelo, @Anio, @CostoAdquisicion, @FechaIngresoInventario, @Estado, @Placa, @Precio, @Descripcion)
        `;
        
        await pool.request()
            .input('idModelo', sql.Int, idModelo)
            .input('Anio', sql.Int, parseInt(Anio))
            .input('CostoAdquisicion', sql.Decimal(10,2), parseFloat(CostoAdquisicion))
            .input('FechaIngresoInventario', sql.Date, FechaIngresoInventario)
            .input('Estado', sql.VarChar, Estado)
            .input('Placa', sql.VarChar, Placa)
            .input('Precio', sql.Decimal(18,0), parseFloat(Precio))
            .input('Descripcion', sql.VarChar, Descripcion)
            .query(insertQuery);
            
        res.status(201).json({ message: 'Auto agregado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const idAuto = req.params.id;
        const { Marca, Modelo, Descripcion, Placa, Anio, Precio, CostoAdquisicion, FechaIngresoInventario, Estado } = req.body;

        let idMarcaResult = await pool.request()
            .input('Marca', sql.VarChar, Marca || 'Desconocida')
            .query('SELECT idMarca FROM Marca WHERE NombreMarca = @Marca');
        let idMarca;
        if (idMarcaResult.recordset.length === 0) {
            let newM = await pool.request().input('Marca', sql.VarChar, Marca || 'Desconocida').query('INSERT INTO Marca (NombreMarca) OUTPUT INSERTED.idMarca VALUES (@Marca)');
            idMarca = newM.recordset[0].idMarca;
        } else {
            idMarca = idMarcaResult.recordset[0].idMarca;
        }

        let idModResult = await pool.request()
            .input('idMarca', sql.Int, idMarca)
            .input('Modelo', sql.VarChar, Modelo || 'Desconocido')
            .query('SELECT idModelo FROM Modelos WHERE NombreModelo = @Modelo AND idMarca = @idMarca');
        let idModelo;
        if (idModResult.recordset.length === 0) {
            let newMod = await pool.request().input('idMarca', sql.Int, idMarca).input('Modelo', sql.VarChar, Modelo || 'Desconocido').query('INSERT INTO Modelos (idMarca, NombreModelo) OUTPUT INSERTED.idModelo VALUES (@idMarca, @Modelo)');
            idModelo = newMod.recordset[0].idModelo;
        } else {
            idModelo = idModResult.recordset[0].idModelo;
        }

        const updateQuery = `
            UPDATE Auto SET
                idModelo = @idModelo,
                Anio = @Anio,
                CostoAdquisicion = @CostoAdquisicion,
                FechaIngresoInventario = @FechaIngresoInventario,
                Estado = @Estado,
                Placa = @Placa,
                Precio = @Precio,
                Descripcion = @Descripcion
            WHERE idAuto = @idAuto
        `;

        await pool.request()
            .input('idAuto', sql.Int, idAuto)
            .input('idModelo', sql.Int, idModelo)
            .input('Anio', sql.Int, parseInt(Anio))
            .input('CostoAdquisicion', sql.Decimal(10,2), parseFloat(CostoAdquisicion))
            .input('FechaIngresoInventario', sql.Date, FechaIngresoInventario)
            .input('Estado', sql.VarChar, Estado)
            .input('Placa', sql.VarChar, Placa)
            .input('Precio', sql.Decimal(18,0), parseFloat(Precio))
            .input('Descripcion', sql.VarChar, Descripcion)
            .query(updateQuery);

        res.status(200).json({ message: 'Auto actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const idAuto = req.params.id;
        
        await pool.request()
            .input('idAuto', sql.Int, idAuto)
            .query('DELETE FROM Auto WHERE idAuto = @idAuto');
            
        res.status(200).json({ message: 'Auto eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
