exports.rp=(req,values)=>{
    if((values.patient.length==0) && (values.staff.length==0)){
        return `<p>
        Welcome to your new account. Click
        <a href="/patient_registration.html">here</a> to get registered as a
        patient.
    </p>`
    }
    return ""
}