// Load configuration
const {parseConf}=require("./parseConf.js")
const VARS=parseConf("./.conf",{
    "sql_port":{
        "type":"int",
        "default":'33060'
    },
    "sql_host":{
        "type":"string",
        "default":'localhost'
    },
    "sql_user":{
        "type":"string",
        "default":'hospital_webapp'
    },
    "sql_pass":{
        "type":"string",
    },
})


// Configure mysql connection
const mysqlx = require('@mysql/xdevapi');
const sql_config = {
    "host":VARS.sql_host,
    "port":VARS.sql_port,
    "user":VARS.sql_user,
    "password":VARS.sql_pass,
    "schema": "hospital_db",
};

let mysql_conn

// Express configuration
const express = require('express');
const { multipartMiddleware } = require('./multipart');
const { render } = require('./template');
const app = express()
const port = 3000
let server


// Serve files directly from the public directory
app.use(express.static('public'));

// Parse cookies on the rest of the paths
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

// Parse the query string
app.set("query parser", (str)=>{
    if(typeof str != "string"){return {}}

    const params = new URLSearchParams(str)
    const obj = {}

    for (const [key, value] of params) {
        obj[key] = value
    }

    return obj
})


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

// Patient registration api endpoint
app.post('/api/patient_register', multipartMiddleware);
app.post('/api/patient_register', async (req, res) =>{
    // Ensure the user is logged in
    const auth = await checkLogin(req)
    if(!auth){
        res.redirect('login.html?redirect=%2Fpatient_registration.html')
        return
    }

    // Validate form inputs
    if(!req.body){
        res.end("No arguments supplied")
        return
    }
    if(!req.body.f_name){
        res.end("No f_name supplied")
        return
    }
    if(!req.body.m_name){
        res.end("No m_name supplied")
        return
    }
    if(!req.body.l_name){
        res.end("No l_name supplied")
        return
    }

    const textDecoder = new TextDecoder()
    
    const f_name = textDecoder.decode(req.body.f_name.data)
    const m_name = textDecoder.decode(req.body.m_name.data)
    const l_name = textDecoder.decode(req.body.l_name.data)
    
    let ret

    try {
        // Create a prepared query
        ret = await mysql_conn.sql("CALL `hospital_db`.CreatePatient(?, ?, ?, ?)")
            .bind(
                auth.id,
                f_name,
                m_name,
                l_name
            ).execute()
    } catch (error) {
        // Assuming the only failure is when the patient already exists, or
        // isn't logged in, we don't really have to do anything.
    }
    
    res.redirect("/dashboard.html?view=patient")
})


app.get("/dashboard.html", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.redirect('login.html?redirect=%2Fdashboard.html')
        return
    }

    // Get information about the logged in user
    const patient_rows = await SQLCall("SELECT * FROM `hospital_db`.`patient` WHERE `user_id` = ?", [auth.id])
    const staff_rows = await SQLCall("SELECT * FROM `hospital_db`.`staff` WHERE `user_id` = ?", [auth.id])

    // Get the view requested by the user
    let req_view = req.query.view

    // Use default view if view outside of allowed values
    if(!(["patient", "staff"].includes(req_view))){
        if(staff_rows.length!=0 ){
            req_view = "staff"
        }else{
            req_view = "patient"
        }
    }

    // If the user does not have permission to the view, select patient
    if(staff_rows.length==0){
        req_view = "patient"
    }

    // Setup the display name
    let display_name=auth.name
    if(staff_rows.length!=0 && req_view=="staff"){
        display_name = staff_rows[0].f_name
    }
    if(patient_rows.length!=0 && req_view=="patient"){
        display_name = patient_rows[0].f_name
    }

    // Render and send a response
    res.writeHead(200, {"content-type":"text/html"})
    switch(req_view){
        case "patient":
            res.end(render("patient-dashboard.html", req, {
                "name": display_name,
                "auth": auth,
                "patient": patient_rows,
                "staff": staff_rows,
                "view": req_view
            }))
            break
        case "staff":
            res.end(render("staff-dashboard.html", req, {
                "name": display_name,
                "auth": auth,
                "patient": patient_rows,
                "staff": staff_rows,
                "view": req_view
            }))
            break
    }
})


app.get("/asset-manager.html", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.redirect('login.html?redirect=%2Fstaff-manager.html')
        return
    }

    // Get information about the logged in user
    const inAssetGroup = await SQLCall("CALL InAssetGroup(?)", [auth.id])
    
    if(!inAssetGroup[0].granted) {
        res.redirect("/bad-permissions.html")
        return
    }

    res.writeHead(200, {"content-type":"text/html"})
    res.end(render("asset-manager.html", req, auth))
})


app.get("/staff-manager.html", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.redirect('login.html?redirect=%2Fstaff-manager.html')
        return
    }

    // Get information about the logged in user
    const inAdminGroup = await SQLCall("CALL InAdminGroup(?)", [auth.id])

    if(!inAdminGroup[0].granted) {
        res.redirect("/bad-permissions.html")
        return
    }

    res.writeHead(200, {"content-type":"text/html"})
    res.end(render("staff-manager.html", req, auth))
})

app.post("/api/add_staff_member", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('401 - Unauthorized')
        return
    }

    // Get information about the logged in user
    const inAdminGroup = await SQLCall("CALL InAdminGroup(?)", [auth.id])

    if(!inAdminGroup[0].granted) {
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('403 - Forbidden')
        return
    }

    if(!req.query.id){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Missing ID')
        return
    }
    if(!req.query.f_name){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Missing first name')
        return
    }
    if(!req.query.m_name){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Missing middle name')
        return
    }
    if(!req.query.l_name){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Missing last name')
        return
    }

    const id = await SQLCall("CALL `hospital_db`.GetUserId(?);",[req.query.id])
    
    if(id[0] == undefined){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Invalid ID')
        return
    }

    const ret = await SQLCall("CALL `hospital_db`.CreateStaff(?, ?, ?, ?, ?);",[
        auth.id,
        id[0].user_id,
        req.query.f_name,
        req.query.m_name,
        req.query.l_name
    ])

    if(ret == false){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Staff already exists')
        return
    }

    try{
        res.writeHead(200, {"content-type":"application/json"})
        res.end(JSON.stringify(ret[0]))
    }catch{
        res.writeHead(500, {"content-type":"text/plain"})
        res.end('500 - Internal Error')
    }
})


app.get("/api/read_staff_members", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('401 - Unauthorized')
        return
    }

    const ret = await SQLCall("CALL `hospital_db`.ReadStaffMembers(?);", [auth.id])

    if(!ret) {
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('403 - Forbidden')
        return
    }

    try{
        res.writeHead(200, {"content-type":"application/json"})
        res.end(JSON.stringify(ret))
    }catch{
        res.writeHead(500, {"content-type":"text/plain"})
        res.end('500 - Internal Error')
    }
})
app.get("/api/add_admin_group", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('401 - Unauthorized')
        return
    }

    if(!req.query.id){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Missing ID')
        return
    }

    const ret = await SQLCall("CALL `hospital_db`.AddAdminGroup(?, ?);",
        [auth.id, req.query.id])

    if(!ret) {
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('403 - Forbidden')
        return
    }

    try{
        res.writeHead(200, {"content-type":"application/json"})
        res.end(JSON.stringify(ret))
    }catch{
        res.writeHead(500, {"content-type":"text/plain"})
        res.end('500 - Internal Error')
    }
})
app.get("/api/remove_admin_group", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('401 - Unauthorized')
        return
    }

    if(!req.query.id){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Missing ID')
        return
    }

    const ret = await SQLCall("CALL `hospital_db`.RemoveAdminGroup(?, ?);",
        [auth.id, req.query.id])

    if(!ret) {
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('403 - Forbidden')
        return
    }

    try{
        res.writeHead(200, {"content-type":"application/json"})
        res.end(JSON.stringify(ret))
    }catch{
        res.writeHead(500, {"content-type":"text/plain"})
        res.end('500 - Internal Error')
    }
})
app.get("/api/add_asset_group", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('401 - Unauthorized')
        return
    }

    if(!req.query.id){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Missing ID')
        return
    }

    const ret = await SQLCall("CALL `hospital_db`.AddAssetGroup(?, ?);",
        [auth.id, req.query.id])

    if(!ret) {
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('403 - Forbidden')
        return
    }

    try{
        res.writeHead(200, {"content-type":"application/json"})
        res.end(JSON.stringify(ret))
    }catch{
        res.writeHead(500, {"content-type":"text/plain"})
        res.end('500 - Internal Error')
    }
})
app.get("/api/remove_asset_group", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('401 - Unauthorized')
        return
    }

    if(!req.query.id){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Missing ID')
        return
    }

    const ret = await SQLCall("CALL `hospital_db`.RemoveAssetGroup(?, ?);",
        [auth.id, req.query.id])

    if(!ret) {
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('403 - Forbidden')
        return
    }

    try{
        res.writeHead(200, {"content-type":"application/json"})
        res.end(JSON.stringify(ret))
    }catch{
        res.writeHead(500, {"content-type":"text/plain"})
        res.end('500 - Internal Error')
    }
})
app.get("/api/add_front_group", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('401 - Unauthorized')
        return
    }

    if(!req.query.id){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Missing ID')
        return
    }

    const ret = await SQLCall("CALL `hospital_db`.AddFrontDeskGroup(?, ?);",
        [auth.id, req.query.id])

    if(!ret) {
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('403 - Forbidden')
        return
    }

    try{
        res.writeHead(200, {"content-type":"application/json"})
        res.end(JSON.stringify(ret))
    }catch{
        res.writeHead(500, {"content-type":"text/plain"})
        res.end('500 - Internal Error')
    }
})
app.get("/api/remove_front_group", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('401 - Unauthorized')
        return
    }

    if(!req.query.id){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Missing ID')
        return
    }

    const ret = await SQLCall("CALL `hospital_db`.RemoveFrontDeskGroup(?, ?);",
        [auth.id, req.query.id])

    if(!ret) {
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('403 - Forbidden')
        return
    }

    try{
        res.writeHead(200, {"content-type":"application/json"})
        res.end(JSON.stringify(ret))
    }catch{
        res.writeHead(500, {"content-type":"text/plain"})
        res.end('500 - Internal Error')
    }
})
app.get("/api/add_pharmtech_group", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('401 - Unauthorized')
        return
    }

    if(!req.query.id){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Missing ID')
        return
    }

    const ret = await SQLCall("CALL `hospital_db`.AddPharmTechGroup(?, ?);",
        [auth.id, req.query.id])

    if(!ret) {
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('403 - Forbidden')
        return
    }

    try{
        res.writeHead(200, {"content-type":"application/json"})
        res.end(JSON.stringify(ret))
    }catch{
        res.writeHead(500, {"content-type":"text/plain"})
        res.end('500 - Internal Error')
    }
})
app.get("/api/remove_pharmtech_group", async (req,res)=>{
    const auth = await checkLogin(req)

    // Ensure the user is logged in
    if(!auth){
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('401 - Unauthorized')
        return
    }

    if(!req.query.id){
        res.writeHead(400, {"content-type":"text/plain"})
        res.end('400 - Missing ID')
        return
    }

    const ret = await SQLCall("CALL `hospital_db`.RemovePharmTechGroup(?, ?);",
        [auth.id, req.query.id])

    if(!ret) {
        res.writeHead(403, {"content-type":"text/plain"})
        res.end('403 - Forbidden')
        return
    }

    try{
        res.writeHead(200, {"content-type":"application/json"})
        res.end(JSON.stringify(ret))
    }catch{
        res.writeHead(500, {"content-type":"text/plain"})
        res.end('500 - Internal Error')
    }
})

// Create a connection to the database
console.log("Connecting to database...")
mysqlx.getSession(sql_config).then(async (conn)=>{
    mysql_conn = conn
    
    console.log("Established connection to the database.")

    await mysql_conn.sql("set role `hospital_webapp_role`;").execute()
    
    // Start listening
    server = app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })
}, (err)=>{
    console.log("Failed to establish connection to the database.", err)
})

process.on('SIGTERM', () => {
    debug('SIGTERM signal received: closing HTTP server');
    server.close(() => {
          debug('HTTP server closed');
    });
});