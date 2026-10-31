const mongoose=require('mongoose')

const conversationSchema=new mongoose.Schema({
    organizerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    sponsorId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    eventId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Organizer'
    },
    lastMessage:{
        type:String
    },
    updatedAt:{
        type:Date,
        default:Date.now
    }
})

conversationSchema.index({organizerId:1,sponsorId:1,eventId:1},{unique:true})
conversationSchema.index({eventId:1,updatedAt:-1})

const Conversation=mongoose.model('Conversation',conversationSchema);

module.exports={Conversation}