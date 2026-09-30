const { JSDOM } = require("jsdom");
const fs = require("fs");

const html = fs.readFileSync("C:/Nueva_Version_plus_sexo_AMI/AMI/Fronted/Pages/recursosHumanos.html", "utf8");
const js = fs.readFileSync("C:/Nueva_Version_plus_sexo_AMI/AMI/Fronted/JS/recursosHumanos.js", "utf8");

const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost:5500/AMI/Fronted/Pages/recursosHumanos.html" });
const window = dom.window;
window.fetch = async () => ({ json: async () => ([{IdEmpleado: 1}]) });

try {
    dom.window.eval(js);
    console.log("JS Executed. Dispatching DOMContentLoaded...");
    const event = dom.window.document.createEvent("Event");
    event.initEvent("DOMContentLoaded", true, true);
    dom.window.document.dispatchEvent(event);
    console.log("DOMContentLoaded fired.");
} catch (e) {
    console.error("DOM error:", e);
}

setTimeout(() => {
    console.log("End of simulation.");
    process.exit(0);
}, 1000);
