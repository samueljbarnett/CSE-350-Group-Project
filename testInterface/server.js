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
const { render } = require('./template');
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



function objectifySQLResponse(ret){
    const columns = ret.getColumns()
    const rows = ret.fetchAll()
    const columnNames = []
    const new_rows = []

    for(let c=0;c<columns.length;c++){
        columnNames.push(columns[c].getColumnLabel())
    }

    for(let r=0;r<rows.length;r++){
        const obj={}

        for(let c=0;c<rows[r].length;c++){
            obj[columnNames[c]] = rows[r][c]
        }

        new_rows.push(obj)
    }

    return new_rows
}
async function SQLCall(call, values){
    let ret
    try {
        ret = await mysql_conn.sql(call)
            .bind(values).execute()
    } catch (error) {
        return false
    }
    return objectifySQLResponse(ret)
}

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

    const rows = objectifySQLResponse(ret)

    if(rows[0].valid){
        return {
            id: rows[0].user_id,
            name: rows[0].username
        }
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
            res.redirect("/dashboard.html")

        }else{
            // Failed authentication
            res.redirect(`/badlogin.html?redirect=%2Fdashboard.html`)
        }
        
    } catch (error) {
        console.error(error)
        res.status(500)
        res.end("500 - Internal server error");
    }
})

app.get("/dashboard.html", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.redirect('login.html?redirect=%2Fdashboard.html')
        return
    }

    const patient_rows = await SQLCall("SELECT * FROM `hospital_db`.`patient` WHERE `user_id` = ?", [auth.id])
    const staff_rows = await SQLCall("SELECT * FROM `hospital_db`.`staff` WHERE `user_id` = ?", [auth.id])

    let display_name=auth.name
    
    if(patient_rows.length!=0)
        {display_name = patient_rows[0].f_name}
    if(staff_rows.length!=0)
        {display_name = staff_rows[0].f_name}

    res.writeHead(200, {"content-type":"text/html"})
    res.end(render("dashboard.html", req, {
        "name": display_name,
        "auth": auth,
        "patient": patient_rows,
        "staff": staff_rows,
    }))
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