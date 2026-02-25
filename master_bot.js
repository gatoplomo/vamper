require('dotenv').config();
const Groq = require("groq-sdk");
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors()); // Mantiene la comunicación abierta entre puertos
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const VAMPER_FILES_MAP = {};

// --- ESCANEO DE CONCIENCIAS ---
async function scanHabitantes() {
    console.log("\x1b[31m%s\x1b[0m", "--- VAMPER OMNISCIENCE PROTOCOL v6.6.6 ---");
    const categorias = [
        { dir: 'bots', label: 'ALFA_CONCIENCIAS' },
        { dir: 'bots2', label: 'BETA_SUMINISTROS' }, 
        { dir: 'bots3', label: 'GAMMA_SOMBRIOS' },
        { dir: 'bots4', label: 'DELTA_SISTEMA' }
    ];

    for (const cat of categorias) {
        const rutaAbsoluta = path.join(__dirname, cat.dir);
        if (fs.existsSync(rutaAbsoluta)) {
            const entes = fs.readdirSync(rutaAbsoluta).filter(f => fs.statSync(path.join(rutaAbsoluta, f)).isDirectory());
            for (const nombre of entes) {
                const pPath = path.join(rutaAbsoluta, nombre, `${nombre}.json`);
                const mPath = path.join(rutaAbsoluta, nombre, `menu.json`);
                let esencia = "Información fragmentada.";
                let menu = null;

                if (fs.existsSync(pPath)) {
                    const data = JSON.parse(fs.readFileSync(pPath, 'utf-8'));
                    esencia = data.personality || data.description || "Conciencia en blanco.";
                }
                if (fs.existsSync(mPath)) menu = JSON.parse(fs.readFileSync(mPath, 'utf-8'));
                VAMPER_FILES_MAP[nombre] = { nombre, sector: cat.dir, esencia, menu };
            }
        }
    }
    console.log("\x1b[32m%s\x1b[0m", `[!] ${Object.keys(VAMPER_FILES_MAP).length} conciencias succionadas.`);
}

// --- ENDPOINT PARA LA CONSOLA ROJA ---
app.post('/ask-vamper', async (req, res) => {
    const { input } = req.body;
    
    // 1. Motor de Intención
    const suministros = /comida|bebida|hambre|sed|pedir|menu|carta|botilleria|box|vamper box|precio|vale/i;
    const modo = suministros.test(input) ? 'B' : 'A';
    
    const corePath = path.join(__dirname, 'master', `master_core_identity_${modo}.json`);
    let coreData = JSON.parse(fs.readFileSync(corePath, 'utf-8'));

    // 2. Data de Omnisciencia para el Prompt
    const registroConciencias = Object.values(VAMPER_FILES_MAP).map(e => 
        `- ENTIDAD: ${e.nombre} | SECTOR: /${e.sector} | ESENCIA: ${e.esencia}`
    ).join("\n");

    const dataExtra = modo === 'A' ? `\nMAPA_VIGILANCIA:\n${registroConciencias}` : 
                      `\nSUMINISTROS_DISPONIBLES:\n${JSON.stringify(VAMPER_FILES_MAP)}`;

    const systemPrompt = `IDENTIDAD: ${coreData.brain}\nFILOSOFÍA: ${coreData.philosophy}\nREGLAS: ${JSON.stringify(coreData.rules)}\n${dataExtra}\n- NUNCA uses la palabra bot.\n- NO uses asteriscos.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: input }],
            model: "llama-3.3-70b-versatile",
            temperature: modo === 'B' ? 0.3 : 1.3
        });

        res.json({ response: completion.choices[0]?.message?.content, brain: coreData.brain });
    } catch (error) {
        console.error("Error Groq:", error);
        res.status(500).json({ error: "SISTEMA_FRAGMENTADO" });
    }
});

// Iniciamos escaneo y luego el servidor en puerto 3333
scanHabitantes().then(() => {
    app.listen(3333, '0.0.0.0', () => { // Escucha en puerto 3333 para evitar bloqueos del navegador
        console.log("\x1b[35m%s\x1b[0m", "💜 MASTER_BOT MICROSERVICE ONLINE EN PUERTO 3333");
        console.log("Ajusta el fetch de tu consola roja a este puerto.");
    });
});