const fs = require('fs');
const filepath = 'C:\\Nueva_Version_plus_sexo_AMI\\AMI\\Backend\\routes\\clientes.js';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace("query('SELECT * FROM Clientes')", "query(`SELECT c.*, o.NombreCanal as Origen FROM Clientes c LEFT JOIN OrigenesClientes o ON c.idOrigen = o.idOrigen`)");

fs.writeFileSync(filepath, content, 'utf8');
console.log('Modified routes/clientes.js');
