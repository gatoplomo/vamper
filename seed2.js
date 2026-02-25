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
        // Conexión a la DB
        await mongoose.connect('mongodb://3.137.140.95:27017/vamped');
        const collection = mongoose.connection.db.collection('users');

        // Leer carpetas dentro de /bots2
        const carpetas = fs.readdirSync(dirOrigen).filter(f => fs.statSync(path.join(dirOrigen, f)).isDirectory());
        const hashedPass = await bcrypt.hash('123456', 10);

        console.log(`\n🛠️  INICIANDO SINCRONIZACIÓN DE SERVICIOS: ${carpetas.length} detectados.\n`);

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
                }

                // --- 3. PROCESAR FOTO DE PERFIL ---
                const archivos = fs.readdirSync(rutaCarpeta);
                const normalizado = nombreCarpeta.toLowerCase().replace(/\s/g, '_');
                
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
                const emailGenerado = `${nombreCarpeta.toLowerCase().replace(/\s+/g, '')}_s${i}@vamped.cl`;

                const nuevoServicio = {
                    nickname: nombreCarpeta,
                    email: emailGenerado,
                    password: hashedPass,
                    photo: fotoPath,
                    role: 'staff', 
                    
                    // --- CONFIGURACIÓN DE IDENTIDAD ---
                    nradar: 1, 
                    is_human: false, // <--- INYECCIÓN DE SEGURIDAD: Identidad de Servicio (Sintético)
                    
                    accountType: 'servicio',
                    serviceCategory: infoMenu.serviceCategory,
                    botConfig: botConfig, 
                    public_description: botConfig.public_description || (botConfig.personality ? botConfig.personality.split('.')[0] + '.' : 'Servicio oficial VAMPER.'),
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
                console.log(`    ✅ [RADAR 1] SERVICIO: "${nombreCarpeta}" sincronizado como SINTÉTICO.\n`);

            } catch (err) {
                console.error(`❌ Error procesando carpeta ${carpetas[i]}:`, err.message);
            }
        }

        console.log("🚀 VAMPER: Servicios (Radar 1) purificados y marcados como no-humanos.");
    } catch (err) {
        console.error("❌ ERROR CRÍTICO EN SEEDER:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

seedServicios();