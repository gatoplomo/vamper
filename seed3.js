const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dirOrigenSecundario = path.join(__dirname, 'bots3'); 
const dirDestino = path.join(__dirname, 'public', 'uploads', 'users'); 

if (!fs.existsSync(dirDestino)) {
    fs.mkdirSync(dirDestino, { recursive: true });
}

// ESQUEMA ACTUALIZADO: Incluye is_human
const User = mongoose.model('User', new mongoose.Schema({
    nickname: String,
    email: { type: String, unique: true },
    password: String,
    photo: String,
    status: String,
    description: String,
    public_description: String,
    age: Number,
    role: { type: String, default: 'client' }, 
    accountType: { type: String, default: 'bot' },
    is_human: { type: Boolean, default: false }, // <--- CAMPO DE SEGURIDAD PARA RADAR 2
    nradar: { type: Number, default: 2 }, 
    botConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
    }
}));

const procesarCarpetaRadar2 = async (directorio, hashedPass) => {
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

            const edadFinal = botJson.age || (Math.floor(Math.random() * 15) + 18);
            const descFinal = botJson.personality || "Entidad del Radar 2.";
            const publicDescFinal = botJson.public_description || descFinal;

            let estadoFinal;
            if (botJson.status_list && Array.isArray(botJson.status_list)) {
                estadoFinal = botJson.status_list[Math.floor(Math.random() * botJson.status_list.length)];
            } else {
                estadoFinal = botJson.status || "Frecuencia privada...";
            }

            const todasLasFotos = fs.readdirSync(rutaCarpetaBot);
            const nombreEsperado = `${nombreBot}_profile`.toLowerCase();
            const fotoPerfil = todasLasFotos.find(f => f.toLowerCase().startsWith(nombreEsperado));

            if (!fotoPerfil) continue;

            const extension = path.extname(fotoPerfil);
            const nuevoNombreArchivo = `bot_r2_${nombreBot.toLowerCase()}_${Date.now()}${extension}`;
            fs.copyFileSync(path.join(rutaCarpetaBot, fotoPerfil), path.join(dirDestino, nuevoNombreArchivo));

            await User.findOneAndUpdate(
                { nickname: nombreBot },
                {
                    nickname: nombreBot,
                    email: `bot2_${nombreBot.toLowerCase().replace(/\s/g, '')}@vamper.cl`,
                    password: hashedPass,
                    photo: `/uploads/users/${nuevoNombreArchivo}`, 
                    status: estadoFinal,
                    description: descFinal,
                    public_description: publicDescFinal,
                    age: edadFinal,
                    accountType: 'bot',
                    is_human: false, // <--- INYECCIÓN: Confirmado como no-humano
                    role: 'client',
                    nradar: 2, 
                    botConfig: botJson, 
                    location: {
                        type: 'Point',
                        coordinates: [-71.54 + (Math.random() * 0.08), -33.02 + (Math.random() * 0.08)]
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: false }
            );

            console.log(`📡 [RADAR 2] Sincronizado: ${nombreBot} (Sintético)`);
        } catch (err) {
            console.error(`❌ Error en ${nombreBot}:`, err.message);
        }
    }
};

const seedRadar2Only = async () => {
    try {
        await mongoose.connect('mongodb://3.137.140.95:27017/vamped');
        
        console.log("🧹 Limpiando registros antiguos del Radar 2 (bots3)...");
        // Limpiamos solo los bots para no borrar humanos reales en el radar 2
        await User.deleteMany({ nradar: 2, accountType: 'bot', is_human: false });

        const hashedPass = await bcrypt.hash('123456', 10);

        console.log("\n🔍 Iniciando carga de bots desde 'bots3'...");
        await procesarCarpetaRadar2(dirOrigenSecundario, hashedPass);

        console.log("\n🚀 Radar 2 actualizado y purificado.");
        process.exit(0);
    } catch (err) {
        console.error("🔥 Error fatal:", err);
        process.exit(1);
    }
};

seedRadar2Only();