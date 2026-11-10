/**
 * A function for parsing multipart form data
 * @function parseForm
 * @author Samuel Barnett
 * @version 1.2.0
*/

/** Changes:
 * Added allowDuplicates option to return multiple values of the same name
 */

/**
 * Parses multipart form data
 * @param {object} headers The header object from a http request
 * @param {ArrayLike} data Byte array of the http request body
 * @param {Boolean} allowDuplicates Return an array of entries if there are
 *                  multiple values with the same name
 * @returns {object} An object containing objects for all of the form values.
 * Each value will have:
 * - data:[Uint8Array] The raw data of the input
 * - headers:[object] The raw headers for each part
 * - attributes:[object] The parsed value of the part's content-disposition header
 */
function parseForm(headers,data,allowDuplicates=false){
    if(!Object.keys(headers).includes("content-type")){return {}}
    if(!headers["content-type"].match(/^multipart\/form-data; boundary=/i)){return {}}
    
    const encoder=new TextEncoder()
    const decoder=new TextDecoder()

    const separator=encoder.encode("--"+headers["content-type"].slice(30))
    let sections=[]
    let last=[]

    for(i=separator.length;i<data.length;i++){
        let newSection=true
        for(x=0;x<separator.length;x++){
            if(data[i+x]!=data[x]){
                newSection=false
                break
            }
        }

        if(newSection){
            let section=last.slice(2,last.length-2)
            
            let headers={}
            let lastHeader=[]
            
            let x=0
            for(;x<section.length;x++){
                if( section[x  ]==13&&
                    section[x+1]==10
                ){
                    let header=decoder.decode(Uint8Array.from(lastHeader))
                    header=header.split(":")
                    headers[header.shift().trim().toLowerCase()]=header.join(":").trim()
                    lastHeader=[]
                    x+=2
                }

                if( section[x-2]==13&&
                    section[x-1]==10&&
                    section[x  ]==13&&
                    section[x+1]==10
                ){x+=2;break}
            
                lastHeader.push(section[x])
            }

            sections.push({
                headers:headers,
                data:Uint8Array.from(section.slice(x))
            })
            
            last=[]
            i+=separator.length
        }

        last.push(data[i])
    }


    let parsedData={}

    for(let i=0;i<sections.length;i++){
        if(!"content-disposition" in sections[i].headers){continue}
        
        let split=sections[i].headers["content-disposition"].split(";")
        if(split.shift().trim().toLowerCase()!="form-data"){continue}
        
        let attributes={}

        for(a=0;a<split.length;a++){
            let attrib=split[a].split("=")
            let k=attrib.shift().trim().toLowerCase()
            let v=attrib.join("=")
            if(k[0]=='"' && k[k.length-1]=='"')
                {k=k.slice(1,k.length-1)}
            if(v[0]=='"' && v[v.length-1]=='"')
                {v=v.slice(1,v.length-1)}
            attributes[k]=v
        }

        if(!"name" in attributes){continue}
        
        sections[i].attributes=attributes
        if(allowDuplicates && (attributes["name"] in parsedData)){
            
            if(!Array.isArray(parsedData[attributes["name"]])){
                parsedData[attributes["name"]]=[parsedData[attributes["name"]]]
            }

            parsedData[attributes["name"]].push(sections[i])

        }else{
            parsedData[attributes["name"]]=sections[i]
        }
    }
    
    return parsedData
};exports.parseForm=parseForm


function multipartMiddleware(req, res, next){
    const data=[]
    req.on("data", (c)=>{
        data.push(...c)
    })

    req.on("end", ()=>{
        const parsed = parseForm(req.headers, data)
        if(Object.keys(parsed).length != 0){
            req.body = parsed
        }
        next()
    })
};exports.multipartMiddleware = multipartMiddleware