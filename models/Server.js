const mongoose = require('mongoose');

const ServerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dockerId: { type: String, required: true, unique: true },
    status: { type: String, required: true }
});

module.exports = mongoose.model('Server', ServerSchema);
