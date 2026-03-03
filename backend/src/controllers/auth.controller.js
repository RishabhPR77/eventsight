const jwt=require("jsonwebtoken")
const { User } = require("../models/user.model.js");
const {ApiError}=require("../utility/ApiError.js")
const {ApiResponse}=require("../utility/ApiResponse.js")
const {asyncHandler}=require("../utility/AsyncHandler.js");
const { Otp } = require("../models/otp.model.js");
const { sendEmail } = require("../utility/sendEmail.js");

const generateOtp=()=>{
    const otp=Math.floor(100000+Math.random()*900000).toString();
    return otp;
}

const generateRefreshAccessToken=async (userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=await user.generateAccessToken()
        const refreshToken=await user.generateRefreshToken()
    
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken};
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refreshToken")
    }
}

const registerSponsor=asyncHandler(async(req,res)=>{
    const {username,email,password}=req.body;
    if(!username || !email || !password){
        throw new ApiError(400,"All Fields are required")
    }

    const alreadyExistUser=await User.findOne({$or:[{username},{email}]})
    if(alreadyExistUser){
        throw new ApiError(400,"User already exist")
    }

    const user=await User.create({
        username,
        email,
        password,
        role:"sponsor",
        isVerified:false
    })

    const createdUser=await User.findById(user._id).select("-refreshToken -password")

    const otp=generateOtp();
    await Otp.create({
        user:user._id,
        otp,
        expiresAt:new Date(Date.now()+1000*60*5)
    })

   try {
     await sendEmail(
         user.email,
         "Your Otp Code",
         `Your otp is ${otp}. It will expires in 5 minute`
     )
   } catch (error) {
        await User.findByIdAndDelete(user._id);
        await Otp.deleteOne({ user: user._id });
        throw new ApiError(500, "Failed to send OTP email");
   }

    return res.status(201).json(
        new ApiResponse(201,createdUser,"Sponsor user created successfully. please verify otp")
    )
})

const registerOrganizer=asyncHandler(async(req,res)=>{
    const {username,email,password}=req.body
    if(!username || !email || !password){
        throw new ApiError(400,"All Fields are required")
    }
    const alreadyExistUser=await User.findOne({$or:[{username},{email}]})
    if(alreadyExistUser){
        throw new ApiError(400,"User already exist")
    }

    const user=await User.create({
        username,
        email,
        password,
        role:"organizer",
        isVerified:false
    })

    const createdUser=await User.findById(user._id).select("-password -refreshToken")

    const otp=generateOtp();
    await Otp.create({
        user:user._id,
        otp,
        expiresAt:new Date(Date.now()+1000*60*5)
    })

   try {
     await sendEmail(
         user.email,
         "Your Otp Code",
         `Your otp is ${otp}. It will expires in 5 minute`
     )
   } catch (error) {
        await User.findByIdAndDelete(user._id);
        await Otp.deleteOne({ user: user._id });
        throw new ApiError(500, "Failed to send OTP email");
   }

    return res.status(201).json(
        new ApiResponse(201,
            createdUser,
            "Organizer User created successfully. please verify otp"
        )
    )
})

const verifyOtp=asyncHandler(async(req,res)=>{
    const {email,otp}=req.body;
    if(!email || !otp){
        throw new ApiError(400,"Email and OTP are required")
    }

    const user=await User.findOne({email})
    if(!user){
        throw new ApiError(400,"User not found")
    }

    if(user.isVerified){
        throw new ApiError(400,"user already verified")
    }

    const otpRecord=await Otp.findOne({user:user._id})
    if(!otpRecord){
        throw new ApiError(400,"OTP expired or not found")
    }

    if(otpRecord.otp!==otp){
        throw new ApiError(400,"Invalid OTP")
    }

    user.isVerified=true;
    await user.save();
    
    await Otp.deleteOne({user:user._id});

    return res.status(200).json(
        new ApiResponse(200,
            {},
            "Email verified successfully"
        )
    )
})

const login=asyncHandler(async(req,res)=>{
    const {username,password}=req.body;
    if(!username || !password){
        throw new ApiError(400,"All fields are required to Login")
    }
    const checkUser=await User.findOne({username}).select("+password")
    if(!checkUser){
        throw new ApiError(401,"Invalid credentials")
    }

    const comparePassword=await checkUser.comparePassword(password)
    if(!comparePassword){
        throw new ApiError(400,"Invalid credentials")
    }
    if(checkUser.isVerified===false){
        throw new ApiError(400,"Please verify your email first")
    }

    const {accessToken,refreshToken}=await generateRefreshAccessToken(checkUser._id);

    const loggedInUser=await User.findById(checkUser._id).select("-password -refreshToken")

    return res.status(200).cookie("accessToken",accessToken,{
        httpOnly:true,
        secure: process.env.NODE_ENV === "production",
        maxAge:1000*60*60*24*7,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    }).cookie("refreshToken",refreshToken,{
        httpOnly:true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge:1000*60*60*24*7
    }).json(
        new ApiResponse(200,
            {
                user:loggedInUser,
                accessToken
            },
            "User logged in Successfully"
        )
    )
})

const logout=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,{$unset:{refreshToken:1}},{new:true})
    const options={
        httpOnly:true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,
            {},
            "User logout successfully"
        )
    )
})

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const refreshToken=req.cookies.refreshToken || req.body.refreshToken;
    if(!refreshToken){
        throw new ApiError(401,"Unauthorized request")
    }
    let decoded;
    try{
        decoded=jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET)
    }catch(err){
        throw new ApiError(401,"Invalid refresh token")
    }

    const user=await User.findById(decoded?._id).select("-password")
    if(!user){
        throw new ApiError(401,"Invalid refresh Token")
    }

    if(refreshToken!==user?.refreshToken){
        throw new ApiError(401,"Refresh Token is Expired")
    }

    const {accessToken,refreshToken:newRefreshToken}=await generateRefreshAccessToken(user._id)

    const options={
        httpOnly:true,
        maxAge:1000*60*60*24*7,
        secure:process.env.NODE_ENV==="production",
        sameSite:process.env.NODE_ENV==="production"?"none":"lax"
    }

    return res.status(200).cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
        new ApiResponse(
            200,
            {"accessToken":accessToken},
            "Access Token refreshed successfully"
        )
    )

})

const changePassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword,confirmPassword}=req.body;
    if(!oldPassword || !newPassword || !confirmPassword){
        throw new ApiError(400,"All field is required")
    }
    if(newPassword!==confirmPassword){
        throw new ApiError(400,"Password mismatching")
    }

    if(oldPassword===newPassword){
        throw new ApiError(400,"New password should be different")
    }

    const user=await User.findById(req.user?._id).select("+password")

    if(!user){
        throw new ApiError(404,"user not found")
    }

    const comparedPassword=await user.comparePassword(oldPassword);
    if(!comparedPassword){
        throw new ApiError(400,"Old password is wrong")
    }

    user.password=newPassword;
    user.refreshToken=undefined;
    await user.save()

    const options={
        httpOnly:true,
        secure:process.env.NODE_ENV==="production",
        sameSite:process.env.NODE_ENV==="production"?"none":"lax"
    }
    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(
        new ApiResponse(200,
            {},
            "Password changed successfully"
        )
    )
    
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    const user=await User.findById(req.user._id).select("-refreshToken -password")
    if(!user){
        throw new ApiError(404,"User not found")
    }
    return res.status(200).json(
        new ApiResponse(200,
            {user},
            "Current user fetched successfully"
        )
    )
    
})

const resendVerificationOtp=asyncHandler(async(req,res)=>{
    const {email}=req.body;
    if(!email){
        throw new ApiError(400,"Email is required");
    }

    const user=await User.findOne({email});
    if(!user){
        throw new ApiError(404,"User not found")
    }

    if(user.isVerified){
        throw new ApiError(400,"User already verified");
    }

    await Otp.deleteMany({user:user._id});

    const otp=generateOtp();

    await Otp.create({
        user:user._id,
        otp,
        expiresAt:new Date(Date.now()+1000*60*5),

    })

    await sendEmail(
        user.email,
        'Resend OTP',
        `your otp code is ${otp}`
    );

    return res.status(200).json(
        new ApiResponse(200,{},"Otp sent Successfully")
    )


});

const forgetPassword=asyncHandler(async(req,res)=>{
    const {email}=req.body;
    if(!email){
        throw new ApiError(400,"email not provided")
    }

    const user=await User.findOne({email:email.toLowerCase()})
    if(!user){
        throw new ApiError(404,"User not found")
    }

    const otp=generateOtp();

    await Otp.deleteMany({user:user._id})
    await Otp.create({
        user:user._id,
        otp,
        expiresAt:new Date(Date.now()+1000*60*5)
    })

    try {
        await sendEmail(
            user.email,
            "Your Otp Code",
            `your otp code is ${otp}. it will expire in 5min`
        )
    } catch (error) {
        await Otp.deleteOne({user:user._id});
        throw new ApiError(500,"Failed to send OTP email")
    }

    res.status(200).json(
        new ApiResponse(200,
            {},
            "Password reset Otp sent successfully"
        )
    )
})

const resetPassword=asyncHandler(async(req,res)=>{
    const {email,otp,newPassword,confirmPassword}=req.body;
    if(!email ||!otp || !newPassword || !confirmPassword){
        throw new ApiError(400,"All fields are required")
    }
    const user=await User.findOne({email:email.toLowerCase()}).select("+password");
    if(!user){
        throw new ApiError(404,"user not found")
    }
    if(newPassword!==confirmPassword){
        throw new ApiError(400,"Password is mismatching")
    }

    const otpRecords=await Otp.findOne({user:user._id,expiresAt:{$gt:new Date()}})
    if(!otpRecords){
        throw new ApiError(400,"OTP expired or not found")
    }

    if(otpRecords.otp!==otp){
        throw new ApiError(400,"Invalid otp")
    }

    user.password=newPassword;
    user.refreshToken=undefined;
    await user.save();

    await otpRecords.deleteOne({user:user._id});

    const options={
        httpOnly:true,
        secure:process.env.NODE_ENV==="production",
        sameSite:process.env.NODE_ENV==="production"?"none":"lax"
    }
    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(
        new ApiResponse(200,
            {},
            "Password reset successfully"
        )
    )
})

const deleteAccount=asyncHandler(async(req,res)=>{
   

    const deleteUser=await User.findByIdAndDelete(req.user._id);
    //null=falsy
    if(!deleteUser){
        throw new ApiError(404,"User not found")
    }
    await Otp.deleteMany({user:req.user._id});
    
    const options={
        httpOnly:true,
        secure:process.env.NODE_ENV=="production",
        sameSite:process.env.NODE_ENV=="production"?"none":"lax"
    };
    res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},"Account deleted successfully")
    );

});

const updateProfile=asyncHandler(async(req,res)=>{
    const {username,email}=req.body;

    const user=await User.findById(req.user._id);
    if(!user){
        throw new ApiError(404,"User not found");
    }

    if(username){
        const existingUser=await User.findOne({username})
        if(existingUser && existingUser._id.toString()!==user._id.toString()){
            throw new ApiError(400,"Username already taken")
        }

        user.username=username.toLowerCase().trim();
    }

    if(email){
        const existingUser=await User.findOne({email})
        if(existingUser && existingUser._id.toString()!==user._id.toString()){
            throw new ApiError(400,"Email alredy in use")
        }

        user.email=email.toLowerCase().trim();
        user.isVerified=false;
    }

    await user.save();

    const updatedUser=await User.findById(user._id).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200,
            {user:updatedUser},
            "profile updated successfully"
        )
    )

    
});

module.exports={registerSponsor,
    registerOrganizer,
    login,
    logout,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    verifyOtp,
    forgetPassword,
    resetPassword,
    resendVerificationOtp,
    deleteAccount,
    updateProfile
}
