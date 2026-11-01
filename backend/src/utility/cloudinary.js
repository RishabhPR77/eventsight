const cloudinary=require("cloudinary").v2
const fs=require("fs")
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})


const uploadOnCloudinary=async(localFilePath,{resourceType="auto"}={})=>{
    try{
        if(!localFilePath){
            return null;
        }
        console.log(`[CLOUDINARY] Uploading file: ${localFilePath}`);
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:resourceType
        });
        console.log(`[CLOUDINARY] Upload successful: ${response.secure_url}`);
        
        if(fs.existsSync(localFilePath)){
            fs.unlinkSync(localFilePath);
            console.log(`[CLOUDINARY] Temp file deleted: ${localFilePath}`);
        }
        return response;
        
    }catch(err){
        console.error(`[CLOUDINARY] UPLOAD FAILED: ${err.message}`);
        if(fs.existsSync(localFilePath)){
            fs.unlinkSync(localFilePath);
            console.log(`[CLOUDINARY] Temp file deleted after failure: ${localFilePath}`);
        }   
        
        throw new Error(err?.message || "cloudinary upload failed");
    }
}

const ATTACHMENT_LINK_SECONDS=300

// Cloudinary blocks public PDF delivery on free accounts, so PDFs need a signed link
const signedDownloadUrl=(publicId)=>cloudinary.utils.private_download_url(publicId,"",{
    resource_type:"raw",
    type:"upload",
    expires_at:Math.floor(Date.now()/1000)+ATTACHMENT_LINK_SECONDS
})

module.exports={uploadOnCloudinary,signedDownloadUrl}