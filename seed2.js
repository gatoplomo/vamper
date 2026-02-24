require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// --- CONFIGURACIÓN ---
const dirOrigen = path.join(__dirname, 'bots4'); // OJO: Tu carpeta nueva
const dirDestino = path.join(__dirname, 'public', 'uploads', 'users'); 

if (!fs.existsSync(dirDestino)) fs.mkdirSync(dirDestino, { recursive: true });

const seedRadar2 = async () => {
    try {
        await mongoose.connect('mongodb://3.137.140.95:27017/vamped');
        const collection = mongoose.connection.db.collection('users');

        // Leer carpetas dentro de /bots4
        const carpetas = fs.readdirSync(dirOrigen).filter(f => fs.statSync(path.join(dirOrigen, f)).isDirectory());
        const hashedPass = await bcrypt.hash('123456', 10);

        console.log(`\n❄️  SINCRONIZANDO RADAR 2 (bots4): ${carpetas.length} detectados.\n`);

        for (let i = 0; i < carpetas.length; i++) {
            try {
                const nombreCarpeta = carpetas[i];
                const rutaCarpeta = path.join(dirOrigen, nombreCarpeta);
                
                // 1. CARGAR DATOS DEL MENÚ (menu.json)
                const rutaMenu = path.join(rutaCarpeta, 'menu.json');
                let infoMenu = { horario: "No definido", telefono: "", catalogo: [], serviceCategory: "otro" };

                if (fs.existsSync(rutaMenu)) {
                    const contenidoMenu = JSON.parse(fs.readFileSync(rutaMenu, 'utf8'));
                    infoMenu.horario = contenidoMenu.horario || "No definido";
                    infoMenu.telefono = contenidoMenu.telefono || "";
                    infoMenu.catalogo = contenidoMenu.catalogo || [];
                    infoMenu.serviceCategory = contenidoMenu.serviceCategory || "otro";
                }

                // 2. CARGAR PERSONALIDAD (Blanca Nieves.json)
                const rutaPersonalidad = path.join(rutaCarpeta, `${nombreCarpeta}.json`);
                let botConfig = { 
                    personality: "Habitante del radar secundario.", 
                    rules: ["Sé directo."], 
                    style: "Nocturno" 
                };

                if (fs.existsSync(rutaPersonalidad)) {
                    botConfig = JSON.parse(fs.readFileSync(rutaPersonalidad, 'utf8'));
                }

                // 3. PROCESAR FOTO
                const archivos = fs.readdirSync(rutaCarpeta);
                const normalizado = nombreCarpeta.toLowerCase().replace(/\s/g, '_');
                const fotoFile = archivos.find(f => 
                    (f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.webp')) 
                    && !f.includes('.json')
                );

                let fotoPath = '';
                if (fotoFile) {
                    const ext = path.extname(fotoFile);
                    const nuevoNombre = `r2_service_${normalizado}_${Date.now()}${ext}`;
                    fs.copyFileSync(path.join(rutaCarpeta, fotoFile), path.join(dirDestino, nuevoNombre));
                    fotoPath = `/uploads/users/${nuevoNombre}`;
                }

                // 4. CONSTRUCCIÓN DEL DOCUMENTO (Estructura espejo de tu Radar 1)
                const emailGenerado = `r2_${nombreCarpeta.toLowerCase().replace(/\s+/g, '')}_${i}@vamped.cl`;

                const nuevoServicio = {
                    nickname: nombreCarpeta,
                    email: emailGenerado,
                    password: hashedPass,
                    photo: fotoPath,
                    role: 'staff', 
                    
                    // DIFERENCIA CLAVE AQUÍ
                    nradar: 2, 
                    
                    accountType: 'servicio',
                    serviceCategory: infoMenu.serviceCategory,
                    botConfig: botConfig, 
                    public_description: botConfig.public_description || 'Servicio frecuencia secundaria.',
                    description: botConfig.personality || 'Disponible en el radar 2.',
                    status: 'Activa en las sombras 🌑',
                    horario: infoMenu.horario,
                    telefono: infoMenu.telefono,
                    catalogo: infoMenu.catalogo, // <--- Esto ahora sí se guardará
                    lastSeen: new Date(),
                    location: {
                        type: 'Point',
                        coordinates: [
                            parseFloat((-71.54 + (Math.random() * 0.08)).toFixed(6)),
                            parseFloat((-33.02 + (Math.random() * 0.08)).toFixed(6))
                        ]
                    }
                };

                // Limpiar y Guardar
                await collection.deleteMany({ nickname: nombreCarpeta });
                await collection.insertOne(nuevoServicio);
                console.log(`   ✅ [RADAR 2] "${nombreCarpeta}" sincronizado con menú.`);

            } catch (err) {
                console.error(`❌ Error en carpeta ${carpetas[i]}:`, err.message);
            }
        }
    } catch (err) {
        console.error("❌ ERROR CRÍTICO:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

seedRadar2();