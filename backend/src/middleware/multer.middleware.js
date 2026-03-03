const multer=require("multer")
const path=require("path")
const storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,"./public/temp")
    },
    filename:function(req,file,cb){
        // file.originalname
        const uniqueName=Date.now()+"-"+Math.round(Math.random()*1e9);
        cb(null,uniqueName+path.extname(file.originalname));
    }
})

const fileFilter=(req,file,cb)=>{
    if(file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")){
        cb(null,true);
    }else{
        cb(new Error("Only image and videos are allowed"),false);
    }
}

const upload=multer({
    storage:storage,
    fileFilter:fileFilter,
    limits:{
        fileSize:1024*1024*100
    }
})

module.exports={upload}
