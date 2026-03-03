const cloudinary=require("cloudinary").v2
const fs=require("fs")
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})


const uploadOnCloudinary=async(localFilePath)=>{
    try{
        if(!localFilePath){
            return null;
        }
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        });
        if(fs.existsSync(localFilePath)){
            fs.unlinkSync(localFilePath);
        }
        return response;
        
    }catch(err){
        if(fs.existsSync(localFilePath)){
            fs.unlinkSync(localFilePath);
        }   
        
        throw new Error(err?.message || "cloudinary upload failed");
    }
}

module.exports={uploadOnCloudinary}