const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        const Result = mongoose.model('Result', new mongoose.Schema({}, { strict: false }));
        const results = await Result.find({}).limit(5).lean();
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
