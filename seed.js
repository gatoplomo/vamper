const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dirOrigenPrincipal = path.join(__dirname, 'bots'); 
const dirDestino = path.join(__dirname, 'public', 'uploads', 'users'); 

if (!fs.existsSync(dirDestino)) {
    fs.mkdirSync(dirDestino, { recursive: true });
}

// CORRECCIÓN 1: El esquema debe conocer 'nradar' para no filtrarlo
const User = mongoose.model('User', new mongoose.Schema({
    nickname: String,
    email: { type: String, unique: true },
    password: String,
    photo: String,
    status: String,
    description: String,
    public_description: String,
    age: Number,
    role: { type: String, enum: ['staff', 'client'], default: 'client' },
    nradar: { type: Number, default: 2 }, // <--- CAMPO AGREGADO
    accountType: { type: String, default: 'bot' },
    botConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
    }
}));

const procesarCarpeta = async (directorio, defaultRole, hashedPass) => {
    if (!fs.existsSync(directorio)) {
        console.warn(`⚠️ El directorio ${directorio} no existe.`);
        return;
    }

    const carpetasBots = fs.readdirSync(directorio).filter(file => 
        fs.statSync(path.join(directorio, file)).isDirectory()
    );

    for (let nombreBot of carpetasBots) {
        try {
            const rutaCarpetaBot = path.join(directorio, nombreBot);
            const rutaJson = path.join(rutaCarpetaBot, `${nombreBot}.json`);
            
            let botJson = {};
            if (fs.existsSync(rutaJson)) {
                botJson = JSON.parse(fs.readFileSync(rutaJson, 'utf-8'));
            }

            const rolFinal = botJson.role || defaultRole;
            const edadFinal = botJson.age || (Math.floor(Math.random() * 10) + 20);
            const descFinal = botJson.personality || "Un fragmento del legado.";

            let estadoFinal;
            if (botJson.status_list && Array.isArray(botJson.status_list)) {
                estadoFinal = botJson.status_list[Math.floor(Math.random() * botJson.status_list.length)];
            } else {
                estadoFinal = botJson.status || "Sincronizando...";
            }

            const todasLasFotos = fs.readdirSync(rutaCarpetaBot);
            const nombreEsperado = `${nombreBot}_profile`.toLowerCase();
            const fotoPerfil = todasLasFotos.find(f => f.toLowerCase().startsWith(nombreEsperado));

            if (!fotoPerfil) {
                console.log(`⏩ Saltando ${nombreBot}: No se encontró foto de perfil.`);
                continue;
            }

            const extension = path.extname(fotoPerfil);
            const nuevoNombreArchivo = `bot_staff_${nombreBot.toLowerCase()}_${Date.now()}${extension}`;
            fs.copyFileSync(path.join(rutaCarpetaBot, fotoPerfil), path.join(dirDestino, nuevoNombreArchivo));

            // CORRECCIÓN 2: Inyectar nradar explícitamente en el update
            await User.findOneAndUpdate(
                { nickname: nombreBot },
                {
                    nickname: nombreBot,
                    email: `bot_${nombreBot.toLowerCase().replace(/\s/g, '')}@vamper.cl`,
                    password: hashedPass,
                    photo: `/uploads/users/${nuevoNombreArchivo}`, 
                    status: estadoFinal,
                    description: descFinal,
                    public_description: descFinal,
                    age: edadFinal,
                    role: rolFinal,
                    nradar: 1, // <--- FORZADO A RADAR 1
                    accountType: 'bot',
                    botConfig: botJson, 
                    location: {
                        type: 'Point',
                        coordinates: [-71.54 + (Math.random() * 0.05), -33.02 + (Math.random() * 0.05)]
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: false } 
            );

            console.log(`✨ [RADAR 1] Sincronizado: ${nombreBot}`);
        } catch (err) {
            console.error(`❌ Error en ${nombreBot}:`, err.message);
        }
    }
};

const seedBotsConFotos = async () => {
    try {
        await mongoose.connect('mongodb://3.137.140.95:27017/vamped');
        const hashedPass = await bcrypt.hash('123456', 10);

        console.log("🔍 Iniciando sincronización de carpeta 'bots' (STAFF -> RADAR 1)...");
        await procesarCarpeta(dirOrigenPrincipal, 'staff', hashedPass);

        console.log("🚀 Ecosistema Vamper (Staff) en línea con Radar 1.");
        process.exit(0);
    } catch (err) {
        console.error("🔥 Error crítico:", err);
        process.exit(1);
    }
};

seedBotsConFotos();