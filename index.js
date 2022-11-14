//look into async/await. promises work fine but i personally prefer async/await and that's what im more familiar with (im not an expert)
require("dotenv").config();
const express = require("express");
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const Users = require('./models/Users');
const bcrypt = require('bcrypt');
const cookieParser = require("cookie-parser");
const {createTokens, validateToken} = require('./JWT');
const { v4: uuidv4 } = require('uuid');
//unused
const { current } = require("@reduxjs/toolkit");

//unused
const dbInfo = {
    username: process.env.user,
    password: process.env.password
}

//remove

// app.use(function(req, res, next){
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-Width, Content-Type, Accept");
//     next();
// });

//this is good- but make sure you understand what it's doing, since you can't always * the CORS
//this approach is perfect for this app, don't need to change- just CORS is a good thing to learn about
//if you already know how it works- great!
app.use(cors({
    origin: "*",
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

//Fix with env.local / GH secrets
mongoose.connect(`mongodb+srv://jdwyer6:hpYOr45SNY9s8jxq@cluster0.sv4ojpk.mongodb.net/time-tracker-data?retryWrites=true&w=majority`)

//lgtm
app.get("/getUsers", (req, res) => {
    Users.find({}, (err, result) => {
        if(err) {
            res.json(err);
        }else{
            res.json(result)
        }
    })
})


app.get('/user/:id', function(req, res){
    Users.findById(req.params.id)
    .then(userFound => {
        if(!userFound) { return res.status(404).end(); }
        return res.status(200).json(userFound)
    })
    .catch((err) => {
        if(err){
            res.status(400).json({error: err});
        }
        //what happens if no err? is that possible? if it's not possible then why have if()?
    })
})

//LGTM
app.post('/user/:id', function(req, res, next){
    const data = req.body.data;
    const currentlyClockedIn = req.body.currentlyClockedIn;
    Users.findById(req.params.id)
    .then(user => {
        if(user){
            user.clockedIn = currentlyClockedIn
            user.hours.push(data)
            user.save()
            .then(user => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(user)
            })
            .catch(err => next(err));
        }else{
            err = new Error(`Could not update the employee with id ${user.id}`);
            err.status = 404;
            return next(err);
        }
    })
    .catch((err) => {
        if(err){
            res.status(400).json({error: err});
        }
    })
})

app.put('/user/:id', function(req, res, next){
    const data = req.body.data;

    Users.findById(req.params.id)
    .then(user => {
        if(user){
            //add a one-line comment here? i personally always find splice stuff a little hard to read
            const update = {...user.hours.at(-1), ...data};
            user.hours.splice(-1, 1, update)
            user.clockedIn = false
            user.save()
            .then(user => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(user)
            })
            .catch(err => next(err));
        }else{
            err = new Error(`Could not update the employee with id ${user.id}`);
            err.status = 404;
            return next(err);
        }
    })
    .catch((err) => {
        if(err){
            res.status(400).json({error: err});
        }
    })
})

//remove

// app.post('/user/:id/:lastLoggedInfo', function(req, res, next){
//     Users.findById(req.params.id)
//     .then(user => {
//         user.lastLoggedInfo = req.params.lastLoggedInfo
//         user.save();
//         res.statusCode=200;
//         res.setHeader('Content-Type', 'application/json');
//         res.json(user)
//     })
//     .catch((err) => {
//         if(err){
//             res.status(400).json({error: err});
//         }
//     })
// })


app.post('/user/:id/:status', function(req, res, next){ //next unused
    Users.findById(req.params.id)
    .then(user => {
        //personally i like to make things match when possible. change status param to clockedIn? not essential.
        user.clockedIn = req.params.status
        user.save();
        res.statusCode=200;
        res.setHeader('Content-Type', 'application/json');
        res.json(user)
    })
    .catch((err) => {
        if(err){
            res.status(400).json({error: err});
        }
    })
})

app.post("/register", (req, res) => {
    // great opportunity for object destructuring
    // const {password, username, businessName, ...} = req.body
    const password = req.body.password;
    const username = req.body.username;
    const businessName = req.body.businessName;
    const businessId = req.body.businessId;
    const name = req.body.name;
    const admin = req.body.admin;
    const image = req.body.image;
    const clockedIn = false;
    const lastLoggedInfo = 0;
    const position = req.body.position;
    Users.collection.findOne({username: username})
    .then(userFound => {
        if(!userFound){
            bcrypt.hash(password, 10)
            .then((hash) => {
                const newUser = new Users({username, password: hash, businessName, businessId, name, admin, image, clockedIn, lastLoggedInfo, position});
                newUser.save({
                    username: username,
                    password: hash,
                    name: name,
                    businessName: businessName,
                    businessId: businessId,
                    admin: admin,
                    image: image,
                    clockedIn: clockedIn,
                    lastLoggedInfo: lastLoggedInfo,
                    position: position
                }).then(() => {
                    res.json("USER REGISTERED")
                })
            })
        }else{
            return next(err);
        }
    })
    .catch((err) => {
        if(err){
            res.status(400).json({error: err});
        }
    })
});

//here you have async (req, res) - why the switch?

app.post("/login", async (req, res, next) => { //next unused
    const {username, password} = req.body;
    try{
        const user = await Users.findOne({username: username})
        const dbPassword = user.password;
        bcrypt.compare(password, dbPassword).then((match) => {
            if(!match){
                res.status(400).json({error: "Oops...wrong username and password."})
                console.log('no password')
            }else{
                const accessToken = createTokens(user)
                res.statusCode = 200;
                res.cookie("access-token", accessToken,{
                    maxAge: 60*60*24*30*1000,
                })
                const tempUser = {...user._doc, password: ''}
                res.json(tempUser);
            }
        })
    }
    catch(err){
        console.log(err);
        res.status(400).send({message: 'Something went wrong'})
    }
        
})

//here you have async (req, res) - why the switch?

app.post("/addEmployee", async (req, res) => {
    const {userId, name, pin, img, work} = req.body;
    const employeeId = uuidv4();
    Users.findById(userId)
    .then(user => {
        if(user){
            user.employees.push({employeeId: employeeId, name: name, pin: pin, img: img, work: work})
            user.save()
            .then(user => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(user)
            })
            .catch(err => next(err));
        }else{
            err = new Error(`Could not update the employee with id ${employeeId}`);
            err.status = 404;
            return next(err);
        }
    })
    .catch((err) => {
        if(err){
            res.status(400).json({error: err});
        }
    })

})
//here you have function (req, res) - why the switch?
//is the idea that users have employees below them and these employees have ids? hence the nested search?
app.get('/employee/:id/:employeeId', function(req, res){
    Users.findById(req.params.id)
    .then(user => {
        const currentEmployee = user.employees.find(employee => employee.employeeId == req.params.employeeId)
        if(user){
            return res.json(currentEmployee)
        }
    })
    .catch((err) => {
        if(err){
            res.status(400).json({error: err});
        }
    })
})

//Delete Hours
app.delete('/:businessId/:employeeId', (req, res) => {
    const {idx} = req.body;
    Users.findById(req.params.businessId)
    .then(user => {
        const currentEmployee = user.employees.find(employee => employee.employeeId == req.params.employeeId)
        if(user){
            currentEmployee.work.splice(idx, 1);
            user.save()
            .then(user => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(user)
            })
            .catch(err => next(err));
        }else{
            err = new Error(`Could not update the employee`);
            err.status = 404;
            return next(err);
        }
        
    })
    .catch((err) => {
        if(err){
            res.status(400).json({error: err});
        }
    })
})
// is this to add hours? why does it go through a seperate endpoint endpoint than delete hours?

app.post('/updateEmployee/:id', function(req, res, next) {
    const {employeeId, info} = req.body;
    Users.findById(req.params.id)
    .then(user => {
        const currentEmployee = user.employees.find(employee => employee.employeeId == employeeId)
    
        if(user) {
            currentEmployee.work.push(info)
            user.save()
            .then(user => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(user)
            })
            .catch(err => next(err));
        }else{
            err = new Error(`Could not update the employee with id ${employeeId}`);
            err.status = 404;
            return next(err);
        }
    })
    .catch((err) => {
        if(err){
            res.status(400).json({error: err});
        }
    })
})

app.get("/profile", validateToken, (req, res) => {
    res.json("profile");
    // res.render('../src/pages/DemoPage.js', {status: 'good'})
})


app.listen(process.env.PORT || 3001, () => {
    console.log("Server is running on port 3001")
})