// const express=require("express");
// const { verifyJwt } = require("../middleware/auth.middleware");
// const { authorizeRole } = require("../middleware/roleCheck");

// const sponsorRoute=express.Router();

// sponsorRoute.post("/profile")
// sponsorRoute.get("/profile")
// sponsorRoute.patch("/profile")
// sponsorRoute.delete("/profile")

// sponsorRoute.get("/events")
// sponsorRoute.get("/events/:id")
// sponsorRoute.post("/events/:id/apply")

// sponsorRoute.get("/sponsor/applications")
// sponsorRoute.post("/sponsor/applications/:id/negotiation")
// sponsorRoute.patch("/sponsor/applications/:id/withdraw")


// ########

//sponsor profile
// sponsorRoute.post("/profileCreate",verifyJwt,authorizeRole("sponsor"),createSponsorProfile);
// sponsorRoute.get("/profileFetch",verifyJwt,authorizeRole("sponsor"),getSponsorProfile);
// sponsorRoute.patch("/profileUpdate",verifyJwt,authorizeRole("sponsor"),updateSponsorProfile);
// sponsorRoute.delete("/profileDelete",verifyJwt,authorizeRole("sponsor"),deleteSponsorProfile);

// //event fetch
// sponsorRoute.get("/events",verifyJwt,authorizeRole("sponsor"),getAllEvents); //query
// sponsorRoute.get("/events/:id",verifyJwt,authorizeRole("sponsor"),getEventById);

// //predict
// sponsorRoute.post("/predict",verifyJwt,authorizeRole('sponsor'),sendData);
// sponsorRoute.get("/predict",verifyJwt,authorizeRole("sponsor"),getPrdeiction)


// //sponsor application
// sponsorRoute.post("/events/:id/apply")   //sponsor-event apply
// sponsorRoute.post("/application/:id/negotiation")  //negotiation
// sponsorRoute.patch("/applications/")



// sponsorRoute.get("/applications")



// module.exports={sponsorRoute}