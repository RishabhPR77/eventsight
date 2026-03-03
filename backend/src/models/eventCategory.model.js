        const mongoose=require("mongoose")

        const eventCategorySchema=new mongoose.Schema({
            name:{
                type:String,
                required:true,
                trim:true,
                lowercase:true,
                minlength:[2,"category name too short"]
            },
            isDeleted:{
                type:Boolean,
                default:false,
                index:true
            }
        },{timestamps:true})

        eventCategorySchema.index(
            {name:1,isDeleted:1},
            {unique:true}
        )

        const EventCategory=mongoose.model("EventCategory",eventCategorySchema)
        module.exports={EventCategory}
