require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// --- INTEGRACIÓN GROQ (Sustituye a Gemini) ---
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'vamped_dark_secret_2026';
const SUPER_USER_EMAIL = 'admin@vamped.cl'; 

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ msg: "No autorizado" });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) { res.status(401).json({ msg: "Sesión expirada" }); }
};

// --- MODELOS ---
const userSchema = new mongoose.Schema({
    nickname: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    photo: { type: String }, 
    status: { type: String, default: '' },
    age: { type: Number },
    gender: { type: String },
    preference: { type: String },
    accountType: { type: String, default: 'persona' }, 
    description: { type: String, default: '' },
    lastSeen: { type: Date, default: Date.now },
    location: { 
        type: { type: String, enum: ['Point'], default: 'Point' }, 
        coordinates: { type: [Number], default: [-71.54, -33.02] } 
    }
});
userSchema.index({ location: '2dsphere' });
const User = mongoose.model('User', userSchema);

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

async function getBotAIResponse(userMessage, botData) {
    try {
        // 1. Buscamos los servicios que tu script de Seed insertó
        // Limitamos a 10 para no saturar el prompt de la IA
        const serviciosDisponibles = await User.find({ accountType: 'servicio' })
            .select('nickname description status')
            .limit(10);

        // 2. Formateamos la lista de servicios para el "cerebro" de Groq
        const contextoServicios = serviciosDisponibles.map(s => 
            `* ${s.nickname.toUpperCase()}: ${s.description} | Estado: ${s.status}`
        ).join('\n');

        const chatCompletion = await groq.chat.completions.create({
            "messages": [
                {
                    "role": "system",
                    "content": `Eres ${botData.nickname}, una mujer chilena real de ${botData.age} años en la app Vamper. 
                    eres una asistente vamper .

                    DATOS QUE MANEJAS (Locales reales en la app):
                    ${contextoServicios || "No hay locales abiertos ahora, pero dile que tú conoces un radiotaxi: +56 9 1234 5678"}

                    REGLAS:
                    - Usa lenguaje informal: "po", "igual", "altiro", "pucha". Todo en minúsculas.
                    - Si te preguntan por comida, alcohol o servicios, dale la informacion si te piden una lista la das igual.
                    - Ejemplo: "oye si tení hambre el ${serviciosDisponibles[0]?.nickname || 'tío aceite'} salva caleta, dicen que está abierto".`
                },
                {
                    "role": "user",
                    "content": userMessage
                }
            ],
            "model": "llama-3.3-70b-versatile",
            "temperature": 0.85,
            "max_tokens": 150
        });

        return chatCompletion.choices[0]?.message?.content || "...";
    } catch (err) {
        console.error("Error Groq:", err);
        return "pucha, se me pegó el celu, hablemos en un ratito";
    }
}

// --- CONEXIÓN DB ---
mongoose.connect(process.env.MONGO_URI || 'mongodb://3.137.140.95:27017/vamped')
    .then(() => console.log('\x1b[32m🦇 VAMPED: DB Conectada con éxito (Groq Ready)\x1b[0m'))
    .catch(err => console.error('Error DB:', err));

// --- API ROUTES ---
app.post('/api/user/update', protect, async (req, res) => {
    try {
        const { status, nickname, description, photo } = req.body;
        const updates = { lastSeen: new Date() }; 
        if (status !== undefined) updates.status = status;
        if (nickname) updates.nickname = nickname;
        if (description !== undefined) updates.description = description;
        if (photo) updates.photo = photo;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id, 
            { $set: updates }, 
            { new: true }
        ).select('-password');
        
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ msg: "Error al actualizar perfil" });
    }
});

app.get('/api/messages/:userId', protect, async (req, res) => {
    try {
        const messages = await Message.find({
            $or: [
                { sender: req.user.id, recipient: req.params.userId },
                { sender: req.params.userId, recipient: req.user.id }
            ]
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) { res.status(500).json({ msg: "Error historial" }); }
});

app.get('/api/conversations', protect, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const conversations = await Message.aggregate([
            { $match: { $or: [{ sender: userId }, { recipient: userId }] } },
            { $sort: { timestamp: -1 } },
            { $group: { _id: { $cond: [{ $eq: ["$sender", userId] }, "$recipient", "$sender"] }, lastMessage: { $first: "$text" }, timestamp: { $first: "$timestamp" } } },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
            { $unwind: '$userInfo' },
            { $project: { 'userInfo.password': 0, 'userInfo.email': 0 } }
        ]);
        res.json(conversations);
    } catch (err) { res.status(500).json({ msg: "Error chats" }); }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { nickname, email, password, photo, age, gender, preference, accountType, description } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({
            nickname, email, password: hashedPassword, photo, age, gender, preference, 
            accountType: accountType || 'persona', description: description || '',
            location: { type: 'Point', coordinates: [-71.54, -33.02] }
        });
        await newUser.save();
        res.status(201).json({ msg: "Registrado" });
    } catch (err) { res.status(500).json({ msg: "Error registro" }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user._id }, JWT_SECRET);
            return res.json({ token, user: { id: user._id, nickname: user.nickname, photo: user.photo }, redirect: (email === SUPER_USER_EMAIL) ? '/radar2' : '/radar' });
        }
        res.status(400).json({ msg: "Credenciales incorrectas" });
    } catch (err) { res.status(500).json({ msg: "Error login" }); }
});

app.get('/api/user/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) { res.status(500).json({ msg: "Error perfil" }); }
});

app.get('/api/nearby', protect, async (req, res) => {
    try {
        let lng = parseFloat(req.query.lng) || -71.54;
        let lat = parseFloat(req.query.lat) || -33.02;
        const users = await User.find({ 
            location: { $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: 10000000 } }, 
            _id: { $ne: req.user.id } 
        }).limit(100);
        res.json(users);
    } catch (err) { res.status(500).json({ msg: "Error radar" }); }
});

// --- SOCKETS ---
io.on('connection', (socket) => {
    socket.on('join', (userId) => { if(userId) socket.join(userId.toString()); });
    
    socket.on('private_message', async (data) => {
        const { from, to, text } = data;
        try {
            if (!from || !to) return;
            const newMessage = new Message({ sender: from, recipient: to, text: text });
            await newMessage.save();
            
            io.to(to.toString()).emit('new_message', { from, to, text, timestamp: newMessage.timestamp });

            const recipientUser = await User.findById(to);
            if (recipientUser && (recipientUser.accountType === 'bot' || recipientUser.nickname === 'Alejandra')) {
                // Simulación de escritura breve
                setTimeout(async () => {
                    const aiResponse = await getBotAIResponse(text, recipientUser);
                    const aiMessage = new Message({ sender: to, recipient: from, text: aiResponse });
                    await aiMessage.save();
                    io.to(from.toString()).emit('new_message', { from: to, text: aiResponse, timestamp: aiMessage.timestamp });
                }, 1000); // Groq es tan rápido que 1 segundo parece más natural
            }
        } catch (e) { console.error(e); }
    });
});




// Ruta para obtener el catálogo de un servicio específico
app.get('/api/catalogo/:nickname', async (req, res) => {
    try {
        const { nickname } = req.params;

        // Buscamos al usuario en la colección 'users' de MongoDB
        // Usamos una expresión regular para que no sea sensible a mayúsculas/minúsculas
        const servicio = await mongoose.connection.db.collection('users').findOne({ 
            nickname: { $regex: new RegExp(`^${nickname}$`, 'i') },
            accountType: 'servicio' 
        });

        if (!servicio) {
            return res.status(404).json({ msg: "Servicio no encontrado" });
        }

        // Devolvemos solo la info necesaria para el catálogo
        res.json({
            servicio: servicio.nickname,
            horario: servicio.horario || "Horario no definido",
            telefono: servicio.telefono || "",
            catalogo: servicio.catalogo || []
        });

    } catch (err) {
        console.error("Error al obtener catálogo:", err);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
});


// --- RUTAS DE NAVEGACIÓN CORREGIDAS ---

// 1. Raíz: Siempre al login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 2. Ruta Radar: Ahora apunta al archivo correcto
app.get('/radar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'radar.html'));
});

// 3. Ruta Radar2 (Admin): Asegúrate de que este nombre también sea correcto
app.get('/radar2', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index2.html')); 
    // ^ Si este también se llama diferente (ej: radar2.html), cámbialo aquí.
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 VAMPED activo en puerto: ${PORT}`);
});