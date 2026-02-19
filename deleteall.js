const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Definimos el esquema mínimo para que Mongoose reconozca la colección
    email: String 
});

const User = mongoose.model('User', userSchema);

const clearUsers = async () => {
    try {
        console.log("⏳ Conectando a MongoDB para limpieza...");
        // Usamos la misma URI de tu script anterior
        await mongoose.connect('mongodb://3.137.140.95:27017/vamped');
        console.log("✅ Conexión establecida.");

        // Contamos antes de borrar para informar al usuario
        const count = await User.countDocuments();
        
        if (count === 0) {
            console.log("ℹ️ La colección ya está vacía. Nada que borrar.");
        } else {
            console.log(`🧹 Borrando ${count} usuarios de la base de datos...`);
            
            // El objeto vacío {} indica que borre TODOS los documentos
            const result = await User.deleteMany({});
            
            console.log(`🔥 Éxito: Se eliminaron ${result.deletedCount} perfiles.`);
        }

        console.log("👋 Proceso finalizado.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error durante la limpieza:", error);
        process.exit(1);
    }
};

clearUsers();