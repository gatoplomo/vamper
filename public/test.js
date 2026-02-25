const http = require('http');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function preguntar() {
    rl.question('\x1b[36m Tú > \x1b[0m', (input) => {
        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'salir') {
            rl.close();
            return;
        }

        const data = JSON.stringify({ input: input });

        const options = {
            hostname: 'localhost',
            port: 3334,
            path: '/ask-audio',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    console.log(`\n\x1b[35m[${parsed.brain || 'VAMPER'}]\x1b[0m: ${parsed.response}\n`);
                } catch (e) {
                    console.log('\x1b[31m[!] Error en la respuesta del servidor\x1b[0m');
                }
                preguntar(); // Volver a preguntar
            });
        });

        req.on('error', (error) => {
            console.error('\x1b[41m[X] ERROR: Asegúrate de que el servidor en el puerto 3334 esté corriendo\x1b[0m');
            preguntar();
        });

        req.write(data);
        req.end();
    });
}

console.log("\x1b[45m VAMPER_AUDIO_TERMINAL: CONEXIÓN INICIADA \x1b[0m");
console.log("Escribe 'salir' para terminar.\n");
preguntar();