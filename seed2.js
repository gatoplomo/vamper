const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dirOrigen = path.join(__dirname, 'bots2'); 
const dirDestino = path.join(__dirname, 'public', 'uploads', 'users'); 

if (!fs.existsSync(dirDestino)) fs.mkdirSync(dirDestino, { recursive: true });

const seedIgualAlFrontend = async () => {
    try {
        await mongoose.connect('mongodb://3.137.140.95:27017/vamped');
        const collection = mongoose.connection.db.collection('users');

        const carpetas = fs.readdirSync(dirOrigen).filter(f => fs.statSync(path.join(dirOrigen, f)).isDirectory());
        const hashedPass = await bcrypt.hash('123456', 10);

        console.log(`🛠️ Sincronizando ${carpetas.length} servicios con sus CATÁLOGOS...`);

        for (let i = 0; i < carpetas.length; i++) {
            try {
                const nombre = carpetas[i];
                const rutaCarpeta = path.join(dirOrigen, nombre);
                const fotos = fs.readdirSync(rutaCarpeta);
                const normalizado = nombre.toLowerCase().replace(/\s/g, '_');
                
                const emailGenerado = `${nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '')}${i}@vamped.cl`;

                // --- NUEVO: LECTURA DEL JSON ---
                const rutaMenu = path.join(rutaCarpeta, 'menu.json');
                let infoExtra = {
                    horario: "No definido",
                    telefono: "",
                    catalogo: []
                };

                if (fs.existsSync(rutaMenu)) {
                    const contenido = JSON.parse(fs.readFileSync(rutaMenu, 'utf8'));
                    infoExtra.horario = contenido.horario || "No definido";
                    infoExtra.telefono = contenido.telefono || "";
                    infoExtra.catalogo = contenido.catalogo || [];
                    console.log(`   📦 [${nombre}] JSON cargado: ${infoExtra.catalogo.length} productos.`);
                } else {
                    console.log(`   ⚠️ [${nombre}] No tiene menu.json, se creará vacío.`);
                }

                // Borrar rastro anterior
                await collection.deleteMany({ nickname: nombre });

                // Procesar foto
                const fotoFile = fotos.find(f => f.toLowerCase().includes('profile')) || fotos[0];
                let fotoPath = '';
                if (fotoFile) {
                    const ext = path.extname(fotoFile);
                    const nuevoNombre = `service_${normalizado}_${Date.now()}${ext}`;
                    fs.copyFileSync(path.join(rutaCarpeta, fotoFile), path.join(dirDestino, nuevoNombre));
                    fotoPath = `/uploads/users/${nuevoNombre}`;
                }

                // ESTRUCTURA FINAL
                const nuevoDoc = {
                    nickname: nombre,
                    email: emailGenerado,
                    password: hashedPass,
                    photo: fotoPath,
                    accountType: 'servicio',
                    age: null,
                    gender: 'servicio',
                    preference: 'comercio',
                    description: 'Servicio profesional con catálogo disponible.',
                    status: '¡Abierto ahora! ⚡',
                    // --- AQUÍ SE INYECTA EL JSON ---
                    horario: infoExtra.horario,
                    telefono: infoExtra.telefono,
                    catalogo: infoExtra.catalogo,
                    // ------------------------------
                    lastSeen: new Date(),
                    location: {
                        type: 'Point',
                        coordinates: [
                            parseFloat((-71.54 + (Math.random() * 0.04)).toFixed(6)),
                            parseFloat((-33.02 + (Math.random() * 0.04)).toFixed(6))
                        ]
                    }
                };

                await collection.insertOne(nuevoDoc);
                console.log(`✅ CREADO: "${nombre}"`);

            } catch (err) {
                console.error(`❌ Error en ${carpetas[i]}:`, err.message);
            }
        }

        console.log("\n🚀 ¡Base de datos actualizada con catálogos!");
    } catch (err) {
        console.error("❌ Error Crítico:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

seedIgualAlFrontend();