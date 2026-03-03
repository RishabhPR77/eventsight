const mongoose=require("mongoose")

const brandTypesSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true,
        lowercase:true,
        index:true,
        unique:true
    }
},{timestamps:true})

const BrandType=mongoose.model("BrandType",brandTypesSchema)

module.exports={BrandType}