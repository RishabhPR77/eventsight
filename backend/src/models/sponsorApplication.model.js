const mongoose=require("mongoose")

const sponsorApplicationSchema=new mongoose.Schema({
    sponsor:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true
    },
    event:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Organizer",
        required:true,
        index:true
    },
    negotiations:[
        {
            from:{
                type:String,
                enum:["organizer","sponsor"],
                required:true
            },
            amount:{
                type:Number,
                required:true,
                min:0
            },
            message:{
                type:String,
                trim:true
            },
            createdAt:{
                type:Date,
                default:Date.now
            }
        }
    ],
    finalAmount:{
        type:Number,
        min:0
    },
    status:{
        type:String,
        enum:["pending","negotiating","accepted","rejected","withdrawn"],
        default:"pending",
        index:true
    },
    isDeleted:{
        type:Boolean,
        default:false,
        index:true
    }
},{timestamps:true})


sponsorApplicationSchema.index(
    {sponsor:1,event:1},
    {unique:true}
)


const SponsorApplication=mongoose.model("SponsorApplication",sponsorApplicationSchema)
module.exports={SponsorApplication}