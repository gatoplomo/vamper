const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dirOrigen = path.join(__dirname, 'bots'); 
const dirDestino = path.join(__dirname, 'public', 'uploads', 'users'); 

if (!fs.existsSync(dirDestino)) {
    fs.mkdirSync(dirDestino, { recursive: true });
}

// Modelo de Usuario
const User = mongoose.model('User', new mongoose.Schema({
    nickname: String,
    email: { type: String, unique: true },
    password: String,
    photo: String,
    status: String,
    description: String,
    age: Number,
    accountType: { type: String, default: 'persona' },
    botConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
    }
}));

const seedBotsConFotos = async () => {
    try {
        await mongoose.connect('mongodb://3.137.140.95:27017/vamped');
        console.log("✅ Conectado a BD VAMPER.");

        const carpetasBots = fs.readdirSync(dirOrigen).filter(file => 
            fs.statSync(path.join(dirOrigen, file)).isDirectory()
        );

        const frasesGenericas = ['¿Sale algo hoy? 🥂', 'Ganas de un café ☕', 'Hablemos ✨'];
        const hashedPass = await bcrypt.hash('123456', 10);

        for (let i = 0; i < carpetasBots.length; i++) {
            try {
                const nombreBot = carpetasBots[i];
                const rutaCarpetaBot = path.join(dirOrigen, nombreBot);
                const rutaJson = path.join(rutaCarpetaBot, `${nombreBot}.json`);
                
                let botJson = {};
                if (fs.existsSync(rutaJson)) {
                    botJson = JSON.parse(fs.readFileSync(rutaJson, 'utf-8'));
                }

                // --- LÓGICA DE PRIORIDAD ---
                // Si el JSON tiene el campo, lo usamos. Si no, va el fallback.
                const edadFinal = botJson.age || (Math.floor(Math.random() * 10) + 20);
                const descFinal = botJson.personality || "Parte del ecosistema Vamper.";
                
                // Si es Moderador, le ponemos un estado serio si el JSON no trae uno
                let estadoFinal = botJson.status || frasesGenericas[Math.floor(Math.random() * frasesGenericas.length)];
                if (nombreBot.toLowerCase().includes('moderador') && !botJson.status) {
                    estadoFinal = "Vigilando la sala. Sin juegos.";
                }

                // Procesar Foto
                const todasLasFotos = fs.readdirSync(rutaCarpetaBot);
                const nombreEsperado = `${nombreBot}_profile`.toLowerCase();
                const fotoPerfil = todasLasFotos.find(f => f.toLowerCase().startsWith(nombreEsperado));

                if (!fotoPerfil) continue;

                const extension = path.extname(fotoPerfil);
                const nuevoNombreArchivo = `bot_${nombreBot.toLowerCase()}_${Date.now()}${extension}`;
                fs.copyFileSync(path.join(rutaCarpetaBot, fotoPerfil), path.join(dirDestino, nuevoNombreArchivo));

                // Upsert en la base de datos
                await User.findOneAndUpdate(
                    { nickname: nombreBot },
                    {
                        nickname: nombreBot,
                        email: `bot_${nombreBot.toLowerCase().replace(/\s/g, '')}${i}@vamper.cl`,
                        password: hashedPass,
                        photo: `/uploads/users/${nuevoNombreArchivo}`, 
                        status: estadoFinal,
                        description: descFinal,
                        age: edadFinal,
                        accountType: 'bot',
                        botConfig: botJson, 
                        location: {
                            type: 'Point',
                            coordinates: [-71.54 + (Math.random() * 0.05), -33.02 + (Math.random() * 0.05)]
                        }
                    },
                    { upsert: true, new: true }
                );

                console.log(`✨ [${nombreBot}] Sincronizado correctamente.`);
            } catch (err) {
                console.error(`❌ Error en ${carpetasBots[i]}:`, err.message);
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedBotsConFotos();