const mongoose=require("mongoose")
const sponsorSchema=new mongoose.Schema({
    sponsor:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
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
    },
    brandKpi:{
        type:String,
        enum:["awareness","hybrid","leads","sales"],
        required:true,
        index:true
    },
    cityFocus:{
        type:String,
        enum:["all_mp","metro","tier2","pilgrimage"],
        required:true,
        index:true
    }

},{timestamps:true})


const Sponsor=mongoose.model("Sponsor",sponsorSchema)


module.exports={Sponsor}