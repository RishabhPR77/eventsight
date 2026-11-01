const mongoose=require("mongoose")

const SAVED_FOR_SECONDS=60*60*24*7

// Each analysis uses limited Groq quota, so identical requests reuse the saved answer
const predictionSchema=new mongoose.Schema({
    sponsor:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    event:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Organizer",
        required:true
    },
    // A hash of everything sent to the model, so any change gets a fresh analysis
    inputsHash:{
        type:String,
        required:true
    },
    result:{
        type:mongoose.Schema.Types.Mixed,
        required:true
    }
},{timestamps:true})

predictionSchema.index({sponsor:1,event:1},{unique:true})
predictionSchema.index({updatedAt:1},{expireAfterSeconds:SAVED_FOR_SECONDS})

const Prediction=mongoose.model("Prediction",predictionSchema)
module.exports={Prediction}
