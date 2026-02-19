const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// --- CONFIGURACIÓN DE RUTAS ---
const dirOrigen = path.join(__dirname, 'bots'); 
const dirDestino = path.join(__dirname, 'public', 'uploads', 'users'); 

if (!fs.existsSync(dirDestino)) {
    fs.mkdirSync(dirDestino, { recursive: true });
}

// Definimos el esquema aquí mismo para asegurar que tenga los campos nuevos
const User = mongoose.model('User', new mongoose.Schema({
    nickname: String,
    email: { type: String, unique: true },
    password: String,
    photo: String,
    status: String,
    description: String, // Campo para la personalidad de la IA
    age: Number,
    accountType: { type: String, default: 'persona' }, // El campo clave
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
    }
}));

const seedBotsConFotos = async () => {
    try {
        await mongoose.connect('mongodb://3.137.140.95:27017/vamped');
        console.log("✅ Conectado a BD.");

        const carpetasBots = fs.readdirSync(dirOrigen).filter(file => 
            fs.statSync(path.join(dirOrigen, file)).isDirectory()
        );

        const frases = ['¿Sale algo hoy? 🥂', 'Ganas de un café ☕', 'Playa? 🏖️', 'Aburrida, hablemos ✨', 'Busco algo real 🌸', '¿Me invitas a un trago? 🍷'];
        
        // Descripciones para que Groq sepa cómo actuar con cada una
        const descripciones = [
            'Soy una chica simpática de Viña, me gusta salir a caminar por la costa y conocer gente nueva.',
            'Amo el café y las buenas conversaciones. Busco a alguien con quien compartir momentos entretenidos.',
            'Directa y decidida. Me gusta la honestidad y busco pasar un buen rato sin tantas vueltas.',
            'Estudiante de la zona, me gusta la música y busco amigos o ver qué fluye.',
            'Me encanta bailar y salir de noche. Soy muy sociable y busco alguien que me siga el ritmo.'
        ];

        const hashedPass = await bcrypt.hash('123456', 10);

        console.log(`📂 Detectadas ${carpetasBots.length} carpetas de bots.`);

        for (let i = 0; i < carpetasBots.length; i++) {
            try {
                const nombreBot = carpetasBots[i];
                const rutaCarpetaBot = path.join(dirOrigen, nombreBot);

                const todasLasFotos = fs.readdirSync(rutaCarpetaBot);
                const nombreEsperado = `${nombreBot}_profile`.toLowerCase();

                const fotoPerfil = todasLasFotos.find(archivo => {
                    const nombreSinExt = path.parse(archivo).name.toLowerCase();
                    return nombreSinExt === nombreEsperado;
                });

                if (!fotoPerfil) {
                    console.warn(`⚠️ No se encontró la foto de perfil específica para [${nombreBot}]. Saltando...`);
                    continue;
                }

                const extension = path.extname(fotoPerfil);
                const nuevoNombreArchivo = `bot_${nombreBot.toLowerCase().replace(/\s/g, '_')}_${Date.now()}${extension}`;

                fs.copyFileSync(
                    path.join(rutaCarpetaBot, fotoPerfil),
                    path.join(dirDestino, nuevoNombreArchivo)
                );

                // INYECCIÓN EN BD CON CAMPOS DE BOT
                await User.create({
                    nickname: nombreBot,
                    email: `bot_${nombreBot.toLowerCase().replace(/\s/g, '')}${i}@ficticio.com`,
                    password: hashedPass,
                    photo: `/uploads/users/${nuevoNombreArchivo}`, 
                    status: frases[Math.floor(Math.random() * frases.length)],
                    description: descripciones[Math.floor(Math.random() * descripciones.length)],
                    age: Math.floor(Math.random() * (35 - 20 + 1)) + 20,
                    accountType: 'bot', // <--- AQUÍ ESTÁ LA MAGIA
                    location: {
                        type: 'Point',
                        coordinates: [-71.54 + (Math.random() * 0.05), -33.02 + (Math.random() * 0.05)]
                    }
                });

                console.log(`✨ [${i + 1}/${carpetasBots.length}] Bot ${nombreBot} registrada como TIPO BOT.`);
            } catch (innerErr) {
                console.error(`❌ Error procesando a ${carpetasBots[i]}:`, innerErr.message);
            }
        }

        console.log("\n🔥 ¡Bots cargadas exitosamente!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error fatal:", err);
        process.exit(1);
    }
};

seedBotsConFotos();