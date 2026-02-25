const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dirOrigenPrincipal = path.join(__dirname, 'bots'); 
const dirDestino = path.join(__dirname, 'public', 'uploads', 'users'); 

if (!fs.existsSync(dirDestino)) {
    fs.mkdirSync(dirDestino, { recursive: true });
}

// 1. ESQUEMA SINCRONIZADO: Ahora el Seed "sabe" qué es is_human
const User = mongoose.model('User', new mongoose.Schema({
    nickname: String,
    email: { type: String, unique: true },
    password: String,
    photo: String,
    status: String,
    description: String,
    public_description: String,
    age: Number,
    role: { type: String, enum: ['staff', 'client'], default: 'staff' },
    nradar: { type: Number, default: 1 }, 
    accountType: { type: String, default: 'bot' },
    
    // CAMPO CRÍTICO: Definido aquí para poder manipularlo
    is_human: { type: Boolean, default: false }, 
    
    botConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
    }
}));

const procesarCarpeta = async (directorio, hashedPass) => {
    if (!fs.existsSync(directorio)) {
        console.warn(`⚠️ Directorio ausente: ${directorio}`);
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

            const descFinal = botJson.personality || "Entidad del sistema Vamper.";
            const publicDescFinal = botJson.public_description || "ACCESO RESTRINGIDO: PERSONAL DE VAMPER.";

            const todasLasFotos = fs.readdirSync(rutaCarpetaBot);
            const fotoPerfil = todasLasFotos.find(f => f.toLowerCase().includes('profile'));

            if (!fotoPerfil) {
                console.log(`⏩ Saltando ${nombreBot}: Perfil incompleto.`);
                continue;
            }

            const extension = path.extname(fotoPerfil);
            const nuevoNombreArchivo = `staff_core_${nombreBot.toLowerCase()}_${Date.now()}${extension}`;
            fs.copyFileSync(path.join(rutaCarpetaBot, fotoPerfil), path.join(dirDestino, nuevoNombreArchivo));

            // 2. INYECCIÓN EXPLÍCITA: Forzamos is_human en false
            await User.findOneAndUpdate(
                { nickname: nombreBot },
                {
                    nickname: nombreBot,
                    email: `admin_${nombreBot.toLowerCase().replace(/\s/g, '')}@vamper.cl`,
                    password: hashedPass,
                    photo: `/uploads/users/${nuevoNombreArchivo}`, 
                    status: botJson.status || "MONITOREANDO...",
                    description: descFinal, 
                    public_description: publicDescFinal, 
                    age: botJson.age || 0,
                    role: 'staff',
                    nradar: 1,
                    accountType: 'bot',
                    
                    is_human: false, // <--- Aquí matamos el 'true' por defecto
                    
                    botConfig: botJson, 
                    location: {
                        type: 'Point',
                        coordinates: [-71.21, -32.84]
                    }
                },
                { upsert: true, new: true }
            );

            console.log(`🛡️  [STAFF INYECTADO]: ${nombreBot} (Sintético)`);
        } catch (err) {
            console.error(`🔥 Falla en núcleo ${nombreBot}:`, err.message);
        }
    }
};

const seedStaffConCuidado = async () => {
    try {
        await mongoose.connect('mongodb://3.137.140.95:27017/vamped');
        const hashedPass = await bcrypt.hash('clave_maestra_vamper', 10);

        console.log("🌑 Sincronizando Mentes Maestras (STAFF)...");
        await procesarCarpeta(dirOrigenPrincipal, hashedPass);

        console.log("✅ Staff Vamper en línea. Identidades sintéticas validadas.");
        process.exit(0);
    } catch (err) {
        console.error("💀 Colapso de sistema:", err);
        process.exit(1);
    }
};

seedStaffConCuidado();