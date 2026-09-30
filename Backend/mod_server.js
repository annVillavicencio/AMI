const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
if (!code.includes("'/api/ventas'")) {
    code = code.replace("app.use('/api/inventario', require('./routes/inventario'));", "app.use('/api/inventario', require('./routes/inventario'));\napp.use('/api/ventas', require('./routes/ventas'));");
    fs.writeFileSync('server.js', code, 'utf8');
    console.log("Added ventas route to server.js");
} else {
    console.log("ventas route already in server.js");
}
