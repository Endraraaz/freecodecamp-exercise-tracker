const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')

const mongoose = require('mongoose')
var mongoDB = 'mongodb://localhost/mydb'
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false })
var db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB Connection error:'))


// Create Schema
const exerciseSchema = mongoose.Schema({
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: String
})

const userSchema = mongoose.Schema({
    username: { type: String, required: true },
    log: [exerciseSchema]
})

// Create Models
const NewUser = mongoose.model('NewUser', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(express.static('public'))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
})

// routes
app.post('/api/exercise/new-user', (req, res) => {
    const user = new NewUser({
        username: req.body.username
    })
    NewUser.findOne({ username: req.body.username })
        .exec()
        .then(doc => {
            if (doc) {
                console.log("data from find: ", doc)
                res.send("Username already taken")
            }
            else {
                // userStatus = ''
                user
                    .save()
                    .then(result => {
                        console.log(result)
                        res.status(200).json({
                            username: result.username,
                            _id: result._id
                        })
                    })
                    .catch(err => {
                        console.log(err)
                        res.status(500).json({
                            error: err
                        })
                    })
            }
        })
        .catch(err => {
            console.log(err)
        })
})

// add exercise
app.post('/api/exercise/add', (req, res) => {
    let dateinfo = req.body.date;
    if(req.body.date === ''){
        dateinfo = new Date().toISOString().substring(0, 10)
    }

    let newexercise = new Exercise({ 
        description: req.body.description, 
        duration: req.body.duration, 
        date: dateinfo 
    })

    NewUser.findByIdAndUpdate({_id: req.body.userId}, {$push: {log: newexercise}}, {new: true})
        .exec()
        .then(result => {
            let dateoutput = result.log[result.log.length-1].date
            // console.log("Date format: ",dateoutput)
            res.status(200).json({
                username: result.username,
                description: result.log[result.log.length-1].description,
                duration: result.log[result.log.length-1].duration,
                _id: result.id,
                date: new Date(dateoutput).toDateString()
            })
        })
        .catch(err => {
            console.log(err)
        })
})

// view all users 
app.get('/api/exercise/users', (req, res) => {
    NewUser.find()
        .exec()
        .then(docs => {
            res.status(200).json(docs)
        })
        .catch(err => {
            console.log(err)
        })
})

// delete user with Id
app.delete('/delete-user/:userId', (req, res) => {
    NewUser.deleteOne({_id: req.params.userId})
        .exec()
        .then(result => {
            res.status(200).json(result)
        })
        .catch(err => {
            res.status(500).json({
                error: err
            })
        })
})

// user log view using userId
app.get('/api/exercise/log', (req, res) => {
    const id = req.query.userId
    NewUser.findById(id)
        .exec()
        .then(ress => {
            let responseObject = ress
            if(req.query.from || req.query.to){
                let fromDate = new Date(0)
                let toDate = new Date()

                if(req.query.from){
                    fromDate = new Date(req.query.from)
                }
                if(req.query.to){
                    toDate = new Date(req.query.to)
                }

                fromDate = fromDate.getTime()
                toDate = toDate.getTime()

                responseObject.log = responseObject.log.filter((session) => {
                    let sessionDate = new Date(session.date).getTime()
                    return sessionDate >= fromDate && sessionDate <= toDate
                })
            }

            if(req.query.limit){
                responseObject.log = responseObject.log.slice(0, req.query.limit)
            }
            responseObject = responseObject.toJSON()
            responseObject['count'] = ress.log.length
            responseObject.log.forEach(element => {
                delete element['_id']
                element['date'] = new Date(element['date']).toDateString()
            })
            res.status(200).json(responseObject)
        })
        .catch(err => {
            console.log(err)
        })
})

// Not found middleware
// app.use((req, res, next) => {
//     return next({status: 404, message: 'not found'})
// })

// Error Handling middleware
// app.use((err, req, res, next) => {
//     let errCode, errMessage

//     if (err.errors){
//         // mongoose validation error
//         errCode = 400 // bad request
//         const keys = Object.keys(err.errors)
//         // report the first validation error
//         errMessage = err.errors[keys[0]].message
//     } else {
//         // generic or custom error
//         errCode = err.status || 500
//         errMessage = err.message || 'Internal Server Error'
//     }
//     res.status(errCode).type('txt')
//         .send(errMessage)
// })
app.use((req, res, next) => {
    const error = new Error('Not found')
    error.status = 404
    next(error)
})

app.use((error, req, res, next) => {
    res.status(error.status || 500)
    res.json({
        error: {
            message: error.message
        }
    })
})


// listener port
const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Server running on port ' + listener.address().port)
})