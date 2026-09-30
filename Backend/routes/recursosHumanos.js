const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT e.IdEmpleado, e.CodigoEmpleado, e.NombreEmpleado, e.ApellidoEmpleado, e.Cedula, e.FechaIngreso, e.SalarioBase, e.EstadoEmpleado, c.NombreCargo, d.NombreDepartamento FROM Empleado e LEFT JOIN Cargo c ON e.IdCargo = c.IdCargo LEFT JOIN Departamento d ON e.idDepartamento = d.idDepartamento");
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error');
    }
});
module.exports = router;
