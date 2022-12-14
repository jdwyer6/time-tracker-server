const dotenv = require('dotenv');
const express = require("express");
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const Users = require('./models/Users');
const bcrypt = require('bcrypt');
const cookieParser = require("cookie-parser");
const {createTokens, validateToken} = require('./JWT');
const { v4: uuidv4 } = require('uuid');
const { current } = require("@reduxjs/toolkit");
var secondsToHours = require('date-fns/secondsToHours')


const dbInfo = {
    username: process.env.MONGO_USERNAME,
    password: process.env.MONGO_PASSWORD
}

app.use(cors({
    origin: "*",
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

mongoose.connect(`mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.sv4ojpk.mongodb.net/time-tracker-data?retryWrites=true&w=majority`)
console.log(process.env.MONGO_USERNAME, process.env.MONGO_PASSWORD);

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
    })
})

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

//Edit hours entry
app.put('/user/:id/:jobId', function(req, res, next){
    const data = req.body.data
    const jobId = req.params.jobId
    Users.findById(req.params.id)
    .then(user=>{
        const entry = user.hours.filter(entry => entry.jobId === jobId)[0]
        if(user){
            if(data.start){
                entry.startTime = data.start
                entry.start = data.startUnix
            }
            if(data.end){
                entry.endTime = data.end
                entry.end = data.endUnix
            }
            user.markModified('hours')
            user.save()
            .then(user =>{
                entry.hoursWorked = secondsToHours((entry.end - entry.start))
                user.markModified('hours')
                user.save()
                .then(user =>{
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(user)
                })
            })

        }else{
            err = new Error(`Could not update the employee with id${req.params.id}`)
            err.status = 404;
            return next(err)
        }
        
    })
    .catch((err)=>{
        if(err){
            console.log(err)
            res.status(400).json({error: err})
        }
    })
})

app.put('/update/:id', function(req, res, next){
    const data = req.body.data
    console.log(data)
    Users.findById(req.params.id)
    .then(user =>{
        if(user){
            if(data.name){
                user.name = data.name
            }
            if(data.position){
                user.position = data.position
            }
            if(data.wage){
                user.wage = data.wage
            }   
            if(data.admin){
                data.admin === 'on' ? user.admin = true : user.admin = false;
            }
            user.save()
            .then(user => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(user)
            })
        }else{
            console.log('error')
            err = new Error(`Could not update the employee with id${req.params.id}`)
            err.status = 404;
            return next(err)
        }
    })
    .catch((err)=>{
        if(err){
            console.log(err)
            res.status(400).json({error: err})
        }
    })
})

app.post('/user/:id/:status', function(req, res, next){
    Users.findById(req.params.id)
    .then(user => {
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

app.post("/login", async (req, res) => {
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
app.delete('/user/:id/:jobId', (req, res) => {
    const {jobId} = req.params.jobId;
    Users.findById(req.params.id)
    .then(user => {
        console.log(user)
        if(user){
            const idx = user.hours.findIndex(entry => entry.jobId === jobId)
            user.hours.splice(idx, 1)
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
})


app.listen(process.env.PORT || 3001, () => {
    console.log("Server is running on port 3001")
})