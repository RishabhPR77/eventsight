const mongoose=require("mongoose")
const sponsorSchema=new mongoose.Schema({
    sponsor:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true,
        unique:true
    },
    brandName:{
        type:String,
        required:true,
        lowercase:true,
        trim:true
    },
    brandType:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"BrandType",
        required:true,
        index:true
    },
    description:{
        type:String,
        required:true,
        trim:true
    },
    isDeleted:{
        type:Boolean,
        default:false,
        index:true
    },
    logo:{
        type:String
    }
},{timestamps:true})


const Sponsor=mongoose.model("Sponsor",sponsorSchema)


module.exports={Sponsor}