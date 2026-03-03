const jwt=require("jsonwebtoken")
const {User}=require("../models/user.model.js")
const { asyncHandler } = require("../utility/AsyncHandler.js")
const { ApiError } = require("../utility/ApiError.js")

const verifyJwt=asyncHandler(async(req,res,next)=>{
    const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
    //req.heders.authorization
    if(!token){
        throw new ApiError(401,"Unauthorized request")
    }
    let decoded;
    try {
        decoded=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(401,"Invalid or Expired Token")
    }
    
    const user=await User.findById(decoded._id).select("-password -refreshToken")
    if(!user){
        throw new ApiError(401,"Invalid Access Token")
    }
    
    req.user=user;
    next();
})

module.exports={verifyJwt}