require('dotenv').config();
const mongoose = require('mongoose');

// Configuración de red y DB
const DB_URI = process.env.MONGO_URI || 'mongodb://3.137.140.95:27017/vamped';

// RATIOS DE VISIBILIDAD
const RATIO_R1 = 0.9; // 90% Online (Servicios estables con breves relevos)
const RATIO_R2 = 0.4; // 40% Online (Bots persona volátiles)

// Definición del esquema
const userSchema = new mongoose.Schema({
    nickname: String,
    status: String,
    online: Boolean,
    accountType: String,
    nradar: Number,
    botConfig: mongoose.Schema.Types.Mixed,
    lastActive: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

const ejecutarDynamic3 = async () => {
    try {
        console.log("📡 [DYNAMIC 3] Conectando a la base de datos...");
        await mongoose.connect(DB_URI);
        
        console.log("🔍 Iniciando rotación inteligente (R1: 90% | R2: 40%)...");

        // Buscamos todo lo que pertenezca a los radares activos
        const entidades = await User.find({ 
            nradar: { $in: [1, 2] } 
        });
        
        console.log(`📊 Procesando ${entidades.length} perfiles en el radar.`);

        const operaciones = entidades.map(entidad => {
            // Protección para la cuenta de administración
            if (entidad.nickname === 'ADMIN') return null;

            let updateData = { lastActive: new Date() };
            const config = entidad.botConfig || {};
            
            // 1. Definir lista de estados según el radar (si no tiene una propia)
            const listaPorDefecto = entidad.nradar === 1 
                ? ["¡ABIERTO AHORA! ⚡", "VAMPER BOX LISTA 📦", "ESCOLTA EN CAMINO 🚗"] 
                : ["FRECUENCIA PRIVADA...", "ESCANEANDO R2...", "SOLO INVITADOS ❄️"];

            const listaEstados = config.status_list && config.status_list.length > 0 
                ? config.status_list 
                : listaPorDefecto;

            // 2. Lógica Diferenciada por Radar
            if (entidad.nradar === 1) {
                // --- RADAR 1: ALTA DISPONIBILIDAD (90%) ---
                const esVisibleR1 = Math.random() < RATIO_R1;
                updateData.online = esVisibleR1;
                
                if (esVisibleR1) {
                    updateData.status = listaEstados[Math.floor(Math.random() * listaEstados.length)];
                } else {
                    // Texto sutil para que el Radar 1 no parezca "muerto"
                    updateData.status = "SERVICIO EN RELEVO...";
                }
            } 
            else {
                // --- RADAR 2: VOLATILIDAD (40%) ---
                const esVisibleR2 = Math.random() < RATIO_R2;
                updateData.online = esVisibleR2;
                
                if (esVisibleR2) {
                    updateData.status = listaEstados[Math.floor(Math.random() * listaEstados.length)];
                } else {
                    updateData.status = "FUERA DE RANGO...";
                }
            }

            return User.findByIdAndUpdate(entidad._id, { $set: updateData });
        }).filter(op => op !== null);

        await Promise.all(operaciones);

        console.log(`✅ [PROCESO COMPLETADO EXIOTOSAMENTE]`);
        console.log(`🔹 Radar 1 sincronizado (90% online).`);
        console.log(`🔹 Radar 2 sincronizado (40% online).`);
        
        process.exit(0);
    } catch (err) {
        console.error("🔥 Error crítico en Dynamic 3:", err);
        process.exit(1);
    }
};

ejecutarDynamic3();