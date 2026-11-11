// Configure mysql connection
const mysqlx = require('@mysql/xdevapi');
const sql_config = {
    "host":"172.17.0.2",
    "port":33060,
    "user": "hospital_webapp",
    "password":"q>}0)k%guOJaVw<rNNOo",
    "schema": "hospital_db",
};

let mysql_conn


// Express configuration
const express = require('express');
const { multipartMiddleware } = require('./multipart');
const app = express()
const port = 3000

// Parse cookies on all paths
app.use((req, res, next)=>{
    if(!req.headers.cookie){
        req.cookies = {}
        next();
        return
    }
    
    const cookiesArr = req.headers.cookie.split(";")
    const cookies = {}
    
    for(let i=0;i<cookiesArr.length;i++){
        const cookie = cookiesArr[i].split("=")
        const name = cookie.shift()
        cookies[name] = cookie.join("=")
    }

    req.cookies = cookies

    next()
})

// Serve files directly from the public directory
app.use(express.static('public'));




async function checkLogin(req){
    if(!req.cookies.login_token){ return false }

    let token

    try{ token = JSON.parse(decodeURIComponent(req.cookies.login_token)) }
    catch{ return false }

    if(!token){return false}

    if((!token.value) || (!token.user)){
        return false
    }

    let ret

    try {
        ret = await mysql_conn.sql("CALL `hospital_db`.AuthenticateToken(?, ?)")
            .bind(
                token.user,
                token.value
            ).execute()
    } catch (error) {
        return false
    }

    const rows = ret.fetchAll()
    console.log(rows)

    if(rows[0][0] == "1"){
        return true
    }
    return false
}


// Authentication api endpoint
app.post('/api/auth', multipartMiddleware);
app.post('/api/auth', async (req, res) =>{
    // Validate form inputs
    if(!req.body){
        res.end("No arguments supplied")
        return
    }
    if(!req.body.user){
        res.end("No user supplied")
        return
    }
    if(!req.body.pass){
        res.end("No password supplied")
        return
    }

    const textDecoder = new TextDecoder()
    let redirect = "%2F"
    if(req.body.redirect){
        redirect = textDecoder.decode(req.body.redirect.data)
        if(redirect == ""){redirect = "%2F"}
    }
    const user = textDecoder.decode(req.body.user.data)
    const pass = textDecoder.decode(req.body.pass.data)
    
    try {
        // Create a prepared query
        const ret = await mysql_conn.sql("CALL `hospital_db`.MakeAuthToken(?, ?)")
            .bind(
                user,
                pass
            ).execute()
    
        // Get the returned rows
        const rows = ret.fetchAll()
        
        // Do thing with rows
        if(rows[0][0] != null){
            // Successful authentication
            res.cookie("login_token", JSON.stringify({
                "value":rows[0][0],
                "user":user
            }))
            res.redirect(decodeURIComponent(redirect))

        }else{
            // Failed authentication
            res.redirect(`/badlogin.html?redirect=${redirect}`)
        }
        
    } catch (error) {
        console.error(error)
        res.status(500)
        res.end("500 - Internal server error");
    }
})

// Authentication api endpoint
app.post('/api/create_user', multipartMiddleware);
app.post('/api/create_user', async (req, res) =>{
    // Validate form inputs
    if(!req.body){
        res.end("No arguments supplied")
        return
    }
    if(!req.body.user){
        res.end("No user supplied")
        return
    }
    if(!req.body.pass){
        res.end("No password supplied")
        return
    }

    const textDecoder = new TextDecoder()
    let redirect = "%2F"
    if(req.body.redirect){
        redirect = textDecoder.decode(req.body.redirect.data)
        if(redirect == ""){redirect = "%2F"}
    }
    const user = textDecoder.decode(req.body.user.data)
    const pass = textDecoder.decode(req.body.pass.data)
    
    let ret

    try {
        // Create a prepared query
        ret = await mysql_conn.sql("CALL `hospital_db`.CreateUser(?, ?)")
            .bind(
                user,
                pass
            ).execute()
    } catch (error) {
        res.redirect("/badcreateaccount.html")
        return
    }

    
    try {
        // Create a prepared query
        const ret = await mysql_conn.sql("CALL `hospital_db`.MakeAuthToken(?, ?)")
            .bind(
                user,
                pass
            ).execute()
    
        // Get the returned rows
        const rows = ret.fetchAll()
        
        // Do thing with rows
        if(rows[0][0] != null){
            // Successful authentication
            res.cookie("login_token", JSON.stringify({
                "value":rows[0][0],
                "user":user
            }))
            res.redirect("/newaccount.html")

        }else{
            // Failed authentication
            res.redirect(`/badlogin.html?redirect=%2Fnewaccount.html`)
        }
        
    } catch (error) {
        console.error(error)
        res.status(500)
        res.end("500 - Internal server error");
    }
})


// Create a connection to the database
console.log("Connecting to database...")
mysqlx.getSession(sql_config).then(async (conn)=>{
    mysql_conn = conn
    
    console.log("Established connection to the database.")

    await mysql_conn.sql("set role `hospital_webapp_role`;").execute()
    
    // Start listening
    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })
}, (err)=>{
    console.log("Failed to establish connection to the database.", err)
})