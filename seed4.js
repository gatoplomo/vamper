require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dirOrigen = path.join(__dirname, 'bots4'); 
const dirDestino = path.join(__dirname, 'public', 'uploads', 'users'); 

const seedRadar2 = async () => {
    try {
        await mongoose.connect('mongodb://3.137.140.95:27017/vamped');
        const collection = mongoose.connection.db.collection('users');
        const carpetas = fs.readdirSync(dirOrigen).filter(f => fs.statSync(path.join(dirOrigen, f)).isDirectory());
        const hashedPass = await bcrypt.hash('123456', 10);

        console.log(`\n📡 ESCANEANDO CARPETA BOTS4...`);

        for (let i = 0; i < carpetas.length; i++) {
            const nombreCarpeta = carpetas[i];
            const rutaCarpeta = path.join(dirOrigen, nombreCarpeta);
            const archivos = fs.readdirSync(rutaCarpeta);

            // --- 1. CARGAR MENÚ (SIEMPRE SE LLAMA menu.json) ---
            let catalogoFinal = [];
            let horarioFinal = "No definido";
            const rutaMenu = path.join(rutaCarpeta, 'menu.json');

            if (fs.existsSync(rutaMenu)) {
                try {
                    const dataMenu = JSON.parse(fs.readFileSync(rutaMenu, 'utf8'));
                    catalogoFinal = dataMenu.catalogo || [];
                    horarioFinal = dataMenu.horario || "24/7";
                    console.log(`✅ [${nombreCarpeta}] Menú cargado: ${catalogoFinal.length} productos.`);
                } catch (e) {
                    console.error(`❌ Error de sintaxis en menu.json de ${nombreCarpeta}`);
                }
            }

            // --- 2. CARGAR IA (EL QUE LLEVA EL NOMBRE DE LA CARPETA) ---
            let botConfigFinal = {};
            const rutaIA = path.join(rutaCarpeta, `${nombreCarpeta}.json`);

            if (fs.existsSync(rutaIA)) {
                botConfigFinal = JSON.parse(fs.readFileSync(rutaIA, 'utf8'));
                console.log(`🧠 [${nombreCarpeta}] IA detectada.`);
            }

            // --- 3. IMAGEN ---
            const fotoFile = archivos.find(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
            let fotoPath = '';
            if (fotoFile) {
                const ext = path.extname(fotoFile);
                const nuevoNombre = `r2_${nombreCarpeta.replace(/\s+/g, '_').toLowerCase()}${ext}`;
                fs.copyFileSync(path.join(rutaCarpeta, fotoFile), path.join(dirDestino, nuevoNombre));
                fotoPath = `/uploads/users/${nuevoNombre}`;
            }

            // --- 4. INSERCIÓN ---
            const userDoc = {
                nickname: nombreCarpeta,
                email: `r2_${nombreCarpeta.toLowerCase().replace(/\s+/g, '')}@vamped.cl`,
                password: hashedPass,
                photo: fotoPath,
                role: 'staff',
                nradar: 2, 
                accountType: 'servicio', // Esto activa el botón de menú en el front
                botConfig: botConfigFinal,
                horario: horarioFinal,
                catalogo: catalogoFinal, // Aquí se guarda el array de productos
                status: 'Frecuencia Secundaria 📡',
                public_description: botConfigFinal.public_description || 'Servicio activo.',
                description: botConfigFinal.personality || 'Sin descripción.',
                lastSeen: new Date(),
                location: {
                    type: 'Point',
                    coordinates: [-71.54 + (Math.random() * 0.05), -33.02 + (Math.random() * 0.05)]
                }
            };

            await collection.deleteMany({ nickname: nombreCarpeta });
            await collection.insertOne(userDoc);
        }
        console.log(`\n🚀 PROCESO TERMINADO.`);
    } catch (e) { console.error(e); }
    finally { mongoose.disconnect(); process.exit(); }
};

seedRadar2();