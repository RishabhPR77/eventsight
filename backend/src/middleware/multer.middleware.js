const crypto=require("crypto")
const fs=require("fs")
const path=require("path")
const multer=require("multer")
const { ApiError }=require("../utility/ApiError")

const TEMP_DIR=path.join(__dirname,"../../public/temp")
fs.mkdirSync(TEMP_DIR,{recursive:true})

const EXTENSIONS={
    "image/jpeg":".jpg",
    "image/png":".png",
    "image/webp":".webp"
}

// The Content-Type comes from the client, so the file's first bytes are checked too
const hasImageSignature=(bytes)=>{
    const isJpeg=bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff
    const isPng=bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
    const isWebp=bytes.toString("latin1",0,4)==="RIFF" && bytes.toString("latin1",8,12)==="WEBP"
    return isJpeg || isPng || isWebp
}

const storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,TEMP_DIR)
    },
    filename:function(req,file,cb){
        cb(null,crypto.randomUUID()+EXTENSIONS[file.mimetype]);
    }
})

const fileFilter=(req,file,cb)=>{
    if(EXTENSIONS[file.mimetype]){
        cb(null,true);
    }else{
        cb(new ApiError(400,"Only JPG, PNG and WebP images are allowed"),false);
    }
}

const upload=multer({
    storage:storage,
    fileFilter:fileFilter,
    limits:{
        fileSize:1024*1024*5,
        files:1
    }
})

const checkImage=(req,res,next)=>{
    if(!req.file){
        return next();
    }

    // Removes the temp file on every path, including a failed request
    res.on("close",()=>fs.rm(req.file.path,{force:true},()=>{}))

    const bytes=Buffer.alloc(12)
    const fd=fs.openSync(req.file.path,"r")
    fs.readSync(fd,bytes,0,12,0)
    fs.closeSync(fd)

    if(!hasImageSignature(bytes)){
        return next(new ApiError(400,"Only JPG, PNG and WebP images are allowed"));
    }
    next();
}

const uploadImage=(fieldName)=>[upload.single(fieldName),checkImage]

module.exports={uploadImage}
