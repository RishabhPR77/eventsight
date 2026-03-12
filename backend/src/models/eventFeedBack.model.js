const mongoose=require("mongoose")

const eventFeedBackSchema=new mongoose.Schema({
    event:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Organizer",
        required:true,
        index:true
    },
    sponsor:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true
    },
    organizerReputation:{
        type:Number,
        default:0.55,
        min:0,
        max:1
    },
    lineupQuality:{
        type:Number,
        default:0.5,
        min:0,
        max:1
    },
    activationMaturity:{
        type:Number,
        default:0.5,
        min:0,
        max:1
    },
    isDeleted:{
        type:Boolean,
        default:false,
        index:true
    }

},{timestamps:true})

eventFeedBackSchema.index(
    {event:1,sponsor:1},
    {unique:true}
)

const EventFeedBack=mongoose.model("EventFeedBack",eventFeedBackSchema)
module.exports={EventFeedBack}

