const mongoose=require("mongoose")

const connectDb=async ()=>{
    try{
        await mongoose.connect(`${process.env.DATABASE_URI}`)
        console.log("mongodb connection successfully")
    }catch(err){
        console.error(err.message)
        process.exit(1)
    }
}

module.exports={connectDb}