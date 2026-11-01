const mongoose=require("mongoose");
const { Conversation } = require("./conversation.model");

const messageSchema=new mongoose.Schema({
    conversationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Conversation'
    },
    senderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    senderRole:{
        type:String,
        enum:['organizer','sponsor']
    },
    // "deal" messages record offers and decisions in the conversation's timeline
    kind:{
        type:String,
        enum:['text','deal'],
        default:'text'
    },
    text:{
       type:String,
       trim:true,
       default:''
    },
    attachment:{
        url:{type:String},
        publicId:{type:String},
        name:{type:String},
        type:{type:String},
        size:{type:Number}
    },
    isRead:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    }

})

messageSchema.index({conversationId:1,createdAt:1})

const Message=mongoose.model('Message',messageSchema);
module.exports={Message}
