const mongoose=require("mongoose")
const { asyncHandler } = require("../utility/AsyncHandler");
const {ApiError}=require("../utility/ApiError.js")
const {ApiResponse}=require("../utility/ApiResponse.js");
const { Organizer } = require("../models/organizer.model.js");
const { uploadOnCloudinary } = require("../utility/cloudinary.js");
const {EventCategory}=require("../models/eventCategory.model.js");



const eventCreate=asyncHandler(async(req,res)=>{
    const {
        eventName,
        eventCategory,
        eventDescription,
        location,
        capacity,
        date,
        ask,
        ticketPrice,
        marketingBudget,
        isIndoor,
        socialMediaAccount
    }=req.body;

     if(
        !eventName ||
        !eventCategory ||
        !eventDescription ||
        !location ||
        !capacity ||
        !date ||
        !ask ||
        !ticketPrice ||
        !marketingBudget ||
        isIndoor === undefined
    ){
        throw new ApiError(400,"All fields are required")
    }

    const existingEventCategory=await EventCategory.findById(eventCategory);

    if(!existingEventCategory){
        throw new ApiError(404,"Event Category not Found");
    }

    let thumbnailLocalFilePath;
    if(req.file){
        thumbnailLocalFilePath=req.file.path;
    }
    
    let uploadThumbnail;
    if(thumbnailLocalFilePath){
        uploadThumbnail=await uploadOnCloudinary(thumbnailLocalFilePath);

        if(!uploadThumbnail){
            throw new ApiError(500,"Error while uploading on cloudinary")
        }
    }
    

    const event=await Organizer.create({
        organizer:req.user._id,
        eventName,
        eventCategory,
        eventDescription,
        location,
        capacity,
        date,
        ask,
        ticketPrice,
        marketingBudget,
        isIndoor,
        socialMediaAccount,
        thumbnail: uploadThumbnail?.url || null
    })

    return res.status(201).json(
        new ApiResponse(201,
            event,
            "Event created Successfully"
        )
    );

})


const getOrganizerEvents = asyncHandler(async (req,res)=>{

    const page = parseInt(req.query.page) || 1
    const limit = Math.min(parseInt(req.query.limit) || 10,50)

    const skip = (page-1)*limit

    const filter = {
        organizer:req.user._id,
        isDeleted:false
    }

    if(req.query.type==="active"){
        filter.isExpired = false
    }

    if(req.query.type==="expired"){
        filter.isExpired = true
    }

    if(req.query.search){
        filter.eventName = {
            $regex:req.query.search,
            $options:"i"
        }
    }

    if(req.query.category){
        filter.eventCategory = req.query.category
    }

    if(req.query.location){
        filter.location = {
            $regex:req.query.location,
            $options:"i"
        }
    }

    const result = await Organizer.aggregate([

        {$match:filter},

        {
            $lookup:{
                from:"eventcategories",
                localField:"eventCategory",
                foreignField:"_id",
                as:"eventCategory"
            }
        },

        {
            $unwind:{
                path:"$eventCategory",
                preserveNullAndEmptyArrays:true
            }
        },

        {$sort:{createdAt:-1}},

        {
            $facet:{
                events:[
                    {$skip:skip},
                    {$limit:limit}
                ],
                totalCount:[
                    {$count:"count"}
                ]
            }
        }

    ])

    const events = result[0].events
    const total = result[0].totalCount[0]?.count || 0

    return res.status(200).json(

        new ApiResponse(
            200,
            {
                events,
                pagination:{
                    total,
                    page,
                    limit,
                    totalPages:Math.ceil(total/limit)
                }
            },
            "Events fetched successfully"
        )
    )

});

const getOrganizerEventsById=asyncHandler(async(req,res)=>{
    if(!mongoose.Types.ObjectId.isValid(req.params.eventId)){
        throw new ApiError(400,"Invalid event id")
    }

    const event=await Organizer.findOne({
        _id:req.params.eventId,
        organizer:req.user._id,
        isDeleted:false
    }).populate("eventCategory");

//     const event = await Organizer.aggregate([

//     {
//       $match: {
//         _id: new mongoose.Types.ObjectId(req.params.eventId),
//         organizer: req.user._id,
//         isDeleted: false
//       }
//     },

//     {
//       $lookup: {
//         from: "eventcategories",
//         localField: "eventCategory",
//         foreignField: "_id",
//         as: "eventCategory"
//       }
//     },

//     {
//       $unwind: {
//         path: "$eventCategory",
//         preserveNullAndEmptyArrays: true
//       }
//     }

//   ]);

//   if(!event.length){
//         throw new ApiError(404,"Event not found")
//     }

    if(!event){
        throw new ApiError(404,"Event not found")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            event,
            "Event fetched by id successfully"
        )
    )
})

const updateEvent = asyncHandler(async(req,res)=>{

    if(!mongoose.Types.ObjectId.isValid(req.params.eventId)){
        throw new ApiError(400,"Invalid event id")
    }

    const data = req.body

    if(!data || Object.keys(data).length === 0){
        throw new ApiError(400,"No data provided for update")
    }

    const allowedFields = [
        "eventName",
        "eventCategory",
        "eventDescription",
        "location",
        "capacity",
        "date",
        "ask",
        "ticketPrice",
        "marketingBudget",
        "isIndoor",
        "socialMediaAccount",
        "thumbnail"
    ]

    const updateData = {}

    for(const key of allowedFields){
        if(data[key] !== undefined){
            updateData[key] = data[key]
        }
    }

    if(Object.keys(updateData).length === 0){
        throw new ApiError(400,"No valid fields to update")
    }

    if(updateData.eventName){
        updateData.eventName = updateData.eventName.trim()
    }

    if(updateData.eventDescription){
        updateData.eventDescription = updateData.eventDescription.trim()
    }

    if(updateData.location){
        updateData.location = updateData.location.trim()
    }

    if(updateData.eventCategory){

        if(!mongoose.Types.ObjectId.isValid(updateData.eventCategory)){
            throw new ApiError(400,"Invalid event category id")
        }

        const categoryExists = await EventCategory.findById(updateData.eventCategory)

        if(!categoryExists){
            throw new ApiError(404,"Event category not found")
        }
    }

    if(updateData.date){
        const newDate = new Date(updateData.date)

        if(newDate <= new Date()){
            throw new ApiError(400,"Event date must be in future")
        }
    }

    const event = await Organizer.findOneAndUpdate(
        {
            _id:req.params.eventId,
            organizer:req.user._id,
            isDeleted:false,
            isExpired:false
        },
        {
            $set:updateData
        },
        {
            new:true,
            runValidators:true
        }
    )

    if(!event){
        throw new ApiError(404,"Event not found")
    }

    return res.status(200).json(
        new ApiResponse(200,event,"Event updated successfully")
    )

})

//updateThumbnail option should be
const deleteEvent = asyncHandler(async(req,res)=>{

    if(!mongoose.Types.ObjectId.isValid(req.params.eventId)){
        throw new ApiError(400,"Invalid event id")
    }

    const event = await Organizer.findOneAndUpdate(

        {
            _id:req.params.eventId,
            organizer:req.user._id,
            isDeleted:false
        },

        {isDeleted:true},

        {new:true}

    )

    if(!event){
        throw new ApiError(404,"Event not found")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            event,
            "Event deleted successfully"
        )
    )

})



module.exports={eventCreate,getOrganizerEvents,getOrganizerEventsById,updateEvent,deleteEvent}