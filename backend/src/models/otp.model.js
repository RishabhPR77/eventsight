const mongoose=require("mongoose")

const otpSchema=new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true
    },
    otp:{
        type:String,
        required:true
    },
    expiresAt:{
        type:Date,
        required:true
    }
},{timestamps:true})

otpSchema.index(
    {expiresAt:1},{expireAfterSeconds:0}
)

const Otp=mongoose.model("Otp",otpSchema)
module.exports={Otp}