const mongoose = require('mongoose');

// Define the User schema
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
});

// Define the Link schema
const LinkSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
    visits: {
        type: Number,
        default: 0,
    },
    lastVisited: {
        type: Date,
        default: Date.now,
    },
});

// Create models
const User = mongoose.model('User', UserSchema);
const Link = mongoose.model('Link', LinkSchema);

module.exports = { User, Link };
