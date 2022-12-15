const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    admin: {
        type: Boolean,
    },
    name: {
        type: String,
        required: true
    },
    businessName: {
        type: String
    },
    businessId: {
        type: String,
        required: true
    },
    demo: {
        type: Boolean,
    },
    image: {
        type: String
    },
    hours: {
        type: Array
    },
    clockedIn: {
        type: Boolean
    },
    lastLoggedInfo: {
        type: Number
    },
    position: {
        type: String
    }
},{
    timestamps: true
});

const UserModel = mongoose.model('users', UserSchema);

module.exports = UserModel;