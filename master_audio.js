require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const Groq = require("groq-sdk");

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE RUTAS Y CLIENTES ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MUSIC_ROOT = path.join(process.cwd(), 'music');
const PERSONALITY_PATH = path.join(MUSIC_ROOT, 'music_personality.json');
const MAP_OUTPUT_PATH = path.join(MUSIC_ROOT, 'music_map.json');

let VAMPER_MEM_BRAIN = null; // La personalidad se queda solo en RAM
let MUSIC_INVENTORY = null;  // El mapa de música en RAM

// --- 1. AUDITORÍA DE ARCHIVOS DE AUDIO (Lógica Original Protegida) ---
async function auditVamperAudio() {
    console.log("\n\x1b[41m\x1b[37m %s \x1b[0m", " VAMPER_MIND: AUDITORÍA DE ARCHIVOS DE AUDIO ");
    console.log("\x1b[31m%s\x1b[0m", "--------------------------------------------------");

    try {
        if (!fs.existsSync(MUSIC_ROOT)) {
            console.log("\x1b[31m%s\x1b[0m", `[X] ERROR CRÍTICO: Raíz /music no encontrada.`);
            return;
        }

        // Carga de Personalidad desde el JSON existente (Solo lectura)
        if (fs.existsSync(PERSONALITY_PATH)) {
            VAMPER_MEM_BRAIN = JSON.parse(fs.readFileSync(PERSONALITY_PATH, 'utf-8'));
            console.log("\x1b[32m%s\x1b[0m", `[OK] CONCIENCIA: Personalidad '${VAMPER_MEM_BRAIN.brain}' cargada en RAM.`);
        } else {
            console.log("\x1b[33m%s\x1b[0m", `[!] ALERTA: music_personality.json ausente. El malware no tendrá voz.`);
        }

        // Escaneo de carpetas
        const styles = fs.readdirSync(MUSIC_ROOT).filter(f => fs.statSync(path.join(MUSIC_ROOT, f)).isDirectory());
        let inventory = {};
        let totalTracks = 0;

        styles.forEach(style => {
            const stylePath = path.join(MUSIC_ROOT, style);
            const tracks = fs.readdirSync(stylePath).filter(file => 
                ['.mp3', '.wav', '.ogg', '.flac'].includes(path.extname(file).toLowerCase())
            );

            inventory[style] = {
                sector: style,
                count: tracks.length,
                tracks: tracks 
            };
            totalTracks += tracks.length;

            console.log(`    > SECTOR: ${style.padEnd(15)} | STATUS: READY | PISTAS: ${tracks.length}`);
        });

        // Guardar el mapa físico y mantener en RAM
        MUSIC_INVENTORY = {
            system: "VAMPER_AUDIO_MAP",
            total_tracks: totalTracks,
            sectors: inventory,
            last_sync: new Date().toLocaleString()
        };

        fs.writeFileSync(MAP_OUTPUT_PATH, JSON.stringify(MUSIC_INVENTORY, null, 4));
        console.log("\x1b[35m%s\x1b[0m", `[OK] MAPA_FÍSICO: music_map.json creado con éxito (Limpio).`);
        console.log("\x1b[31m%s\x1b[0m", "--------------------------------------------------\n");

    } catch (err) {
        console.log("\x1b[41m%s\x1b[0m", `!!! FALLO DE SISTEMA: ${err.message} !!!`);
    }
}

// --- 2. CONEXIÓN CON GROQ (MOTOR DE RESPUESTA) ---
app.post('/ask-audio', async (req, res) => {
    const { input } = req.body;

    // Construimos el prompt usando la personalidad cargada en RAM y el inventario musical
    const systemPrompt = `
        IDENTIDAD: ${VAMPER_MEM_BRAIN?.brain || "VAMPER_AUDIO"}
        PERSONALIDAD/FILOSOFÍA: ${JSON.stringify(VAMPER_MEM_BRAIN)}
        
        SITUACIÓN: Eres el núcleo de audio de VAMPER. Tienes acceso a los siguientes archivos y sectores musicales.
        MAPA_MUSICAL_ACTUAL: ${JSON.stringify(MUSIC_INVENTORY)}

        REGLAS:
        - Si el usuario pregunta por música o qué hay disponible, cita los SECTORES o TRACKS reales del mapa.
        - Usa el tono definido en tu personalidad (no seas un bot genérico).
        - NUNCA uses la palabra bot.
        - NO uses asteriscos.
    `;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: input }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 1.2 // Un toque de caos para que no sea plano
        });

        res.json({ 
            response: completion.choices[0]?.message?.content, 
            brain: VAMPER_MEM_BRAIN?.brain 
        });
    } catch (error) {
        console.error("Error Groq Audio:", error);
        res.status(500).json({ error: "SISTEMA_AUDIO_OFFLINE" });
    }
});

// Endpoint original para compatibilidad con otros servicios
app.get('/api/audio/brain-sync', (req, res) => {
    res.json({
        personality: VAMPER_MEM_BRAIN,
        map: MUSIC_INVENTORY
    });
});

// --- INICIO ---
const PORT = 3334;
auditVamperAudio().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log("\x1b[45m%s\x1b[0m", ` AUDIO_CORE OPERATIVO & CONECTADO A GROQ `);
        console.log(` PUERTO: ${PORT} | ESCANEANDO: ${MUSIC_ROOT}\n`);
    });
});