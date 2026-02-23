require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Configuración de rutas
const dirOrigen = path.join(__dirname, 'bots2'); 
const dirDestino = path.join(__dirname, 'public', 'uploads', 'users'); 

// Asegurar que la carpeta de destino existe
if (!fs.existsSync(dirDestino)) fs.mkdirSync(dirDestino, { recursive: true });

const seedServicios = async () => {
    try {
        // Conexión a la DB (usando tu IP actual)
        await mongoose.connect('mongodb://3.137.140.95:27017/vamped');
        const collection = mongoose.connection.db.collection('users');

        // Leer carpetas dentro de /bots2
        const carpetas = fs.readdirSync(dirOrigen).filter(f => fs.statSync(path.join(dirOrigen, f)).isDirectory());
        const hashedPass = await bcrypt.hash('123456', 10);

        console.log(`\n🛠️  INICIANDO SINCRONIZACIÓN: ${carpetas.length} servicios detectados.\n`);

        for (let i = 0; i < carpetas.length; i++) {
            try {
                const nombreCarpeta = carpetas[i];
                const rutaCarpeta = path.join(dirOrigen, nombreCarpeta);
                
                // --- 1. CARGAR DATOS DEL MENÚ (menu.json) ---
                const rutaMenu = path.join(rutaCarpeta, 'menu.json');
                let infoMenu = { horario: "No definido", telefono: "", catalogo: [], serviceCategory: "otro" };

                if (fs.existsSync(rutaMenu)) {
                    const contenidoMenu = JSON.parse(fs.readFileSync(rutaMenu, 'utf8'));
                    infoMenu.horario = contenidoMenu.horario || "No definido";
                    infoMenu.telefono = contenidoMenu.telefono || "";
                    infoMenu.catalogo = contenidoMenu.catalogo || [];
                    infoMenu.serviceCategory = contenidoMenu.serviceCategory || "otro";
                    console.log(`   📦 [${nombreCarpeta}] Menú cargado (${infoMenu.catalogo.length} ítems)`);
                }

                // --- 2. CARGAR PERSONALIDAD (NombreCarpeta.json) ---
                const rutaPersonalidad = path.join(rutaCarpeta, `${nombreCarpeta}.json`);
                let botConfig = { 
                    personality: "Servicio oficial VAMPER.", 
                    rules: ["Sé directo y profesional."], 
                    style: "Eficiente" 
                };

                if (fs.existsSync(rutaPersonalidad)) {
                    botConfig = JSON.parse(fs.readFileSync(rutaPersonalidad, 'utf8'));
                    console.log(`   🧠 [${nombreCarpeta}] Personalidad inyectada desde ${nombreCarpeta}.json`);
                } else {
                    console.log(`   ⚠️ [${nombreCarpeta}] No se halló ${nombreCarpeta}.json, usando config base.`);
                }

                // --- 3. PROCESAR FOTO DE PERFIL ---
                const archivos = fs.readdirSync(rutaCarpeta);
                const normalizado = nombreCarpeta.toLowerCase().replace(/\s/g, '_');
                
                // Buscar la primera imagen que no sea un JSON
                const fotoFile = archivos.find(f => 
                    (f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.webp')) 
                    && (f.toLowerCase().includes('profile') || !f.includes('.json'))
                );

                let fotoPath = '';
                if (fotoFile) {
                    const ext = path.extname(fotoFile);
                    const nuevoNombre = `service_${normalizado}_${Date.now()}${ext}`;
                    fs.copyFileSync(path.join(rutaCarpeta, fotoFile), path.join(dirDestino, nuevoNombre));
                    fotoPath = `/uploads/users/${nuevoNombre}`;
                }

                // --- 4. CONSTRUCCIÓN DEL DOCUMENTO ---
                const emailGenerado = `${nombreCarpeta.toLowerCase().replace(/\s+/g, '')}_${i}@vamped.cl`;

                const nuevoServicio = {
                    nickname: nombreCarpeta,
                    email: emailGenerado,
                    password: hashedPass,
                    photo: fotoPath,
                    accountType: 'servicio',
                    serviceCategory: infoMenu.serviceCategory, // 'comida', 'transporte', etc.
                    botConfig: botConfig, // La IA responderá con este cerebro
                    description: botConfig.personality || 'Servicio disponible en VAMPER.',
                    status: '¡Abierto ahora! ⚡',
                    horario: infoMenu.horario,
                    telefono: infoMenu.telefono,
                    catalogo: infoMenu.catalogo,
                    lastSeen: new Date(),
                    location: {
                        type: 'Point',
                        coordinates: [
                            parseFloat((-71.54 + (Math.random() * 0.04)).toFixed(6)),
                            parseFloat((-33.02 + (Math.random() * 0.04)).toFixed(6))
                        ]
                    }
                };

                // Limpiar anterior e insertar nuevo
                await collection.deleteMany({ nickname: nombreCarpeta });
                await collection.insertOne(nuevoServicio);
                console.log(`   ✅ FINALIZADO: "${nombreCarpeta}" sincronizado correctamente.\n`);

            } catch (err) {
                console.error(`❌ Error procesando carpeta ${carpetas[i]}:`, err.message);
            }
        }

        console.log("🚀 VAMPER: Todos los servicios han sido cargados con éxito.");
    } catch (err) {
        console.error("❌ ERROR CRÍTICO EN SEEDER:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

seedServicios();