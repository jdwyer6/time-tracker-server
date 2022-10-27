const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    employeeId:{
        type: String
    },
    name: {
        type: String,
    },
    pin: {
        type: String,
        required: true
    },
    img: {
        data: Buffer,
        type: Array
    },
    work: {
        type: Array
    }
})

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    businessName: {
        type: String,
        required: true
    },
    employees: [EmployeeSchema]
},{
    timestamps: true
});

const UserModel = mongoose.model('users', UserSchema);

module.exports = UserModel;