const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://127.0.0.1:27017/vamped';

const User = mongoose.model('User', new mongoose.Schema({
    nickname: String, email: String, password: { type: String },
    photo: String, location: { type: { type: String, default: 'Point' }, coordinates: [Number] }
}).index({ location: '2dsphere' }));

async function seed() {
    await mongoose.connect(MONGO_URI);
    const pass = await bcrypt.hash('123456', 10);
    const bots = [
        { n: 'Lilith', p: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=400' },
        { n: 'Dante', p: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=400' },
        { n: 'Mina', p: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400' },
        { n: 'Viktor', p: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400' },
        { n: 'Elena', p: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400' },
        { n: 'Sasha', p: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400' }
    ];

    for (let b of bots) {
        await User.create({
            nickname: b.n, email: `${b.n}@vamped.com`, password: pass, photo: b.p,
            location: { type: 'Point', coordinates: [-70.6483 + (Math.random()*0.1), -33.4569 + (Math.random()*0.1)] }
        });
    }
    console.log("🔥 SOMBRAS INYECTADAS");
    process.exit();
}
seed();