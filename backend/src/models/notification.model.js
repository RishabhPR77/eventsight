const mongoose=require("mongoose")

const NOTIFICATION_TTL_SECONDS=60*60*24*60

const notificationSchema=new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    type:{
        type:String,
        enum:["message","offer","counter","accepted","rejected","withdrawn","confirm","feedback","event"],
        required:true
    },
    title:{
        type:String,
        required:true
    },
    body:{
        type:String
    },
    link:{
        type:String
    },
    // Set on chat notifications, so one conversation never stacks up in the bell
    conversation:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Conversation"
    },
    read:{
        type:Boolean,
        default:false
    }
},{timestamps:true})

notificationSchema.index({user:1,createdAt:-1})
notificationSchema.index({user:1,read:1})
notificationSchema.index({createdAt:1},{expireAfterSeconds:NOTIFICATION_TTL_SECONDS})

const Notification=mongoose.model("Notification",notificationSchema)
module.exports={Notification}
