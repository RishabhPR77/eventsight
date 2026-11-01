const express=require("express");
const { verifyJwt } = require("../middleware/auth.middleware.js");
const { authorizeRole } = require("../middleware/roleCheck.js");
const { uploadImage } = require("../middleware/multer.middleware.js");
const { eventCreate, getOrganizerEvents, getOrganizerEventsById, updateEvent, deleteEvent } = require("../controllers/organizer.controller.js");
const { getEventApplications, getOrganizerApplications, getOrganizerHistory, updateApplicationStatus, confirmAsOrganizer, counterAsOrganizer, cancelAsOrganizer } = require("../controllers/application.controller.js");
const { validateBody } = require("../middleware/validate.middleware.js");
const { cancelDealSchema, organizerConfirmSchema } = require("../validators/sponsorship.validators.js");

const organizerRoute=express.Router();

organizerRoute.post(
    "/events",
    verifyJwt,
    authorizeRole("organizer"),
    uploadImage("thumbnail"),
    eventCreate
) 

organizerRoute.get("/events",verifyJwt,authorizeRole("organizer"),getOrganizerEvents); 
organizerRoute.get("/events/:eventId",verifyJwt,authorizeRole("organizer"),getOrganizerEventsById);
organizerRoute.patch("/events/:eventId",verifyJwt,authorizeRole("organizer"),uploadImage("thumbnail"),updateEvent)
organizerRoute.delete("/events/:eventId",verifyJwt,authorizeRole("organizer"),deleteEvent)  //softDelete

// sponsorship applications
organizerRoute.get("/applications",verifyJwt,authorizeRole("organizer"),getOrganizerApplications);
organizerRoute.get("/history",verifyJwt,authorizeRole("organizer"),getOrganizerHistory);
organizerRoute.get("/events/:eventId/applications",verifyJwt,authorizeRole("organizer"),getEventApplications);
organizerRoute.patch("/events/:eventId/applications/:applicationId",verifyJwt,authorizeRole("organizer"),updateApplicationStatus);
organizerRoute.post("/events/:eventId/applications/:applicationId/counter",verifyJwt,authorizeRole("organizer"),counterAsOrganizer);
organizerRoute.post("/events/:eventId/applications/:applicationId/cancel",verifyJwt,authorizeRole("organizer"),validateBody(cancelDealSchema),cancelAsOrganizer);
organizerRoute.post("/events/:eventId/applications/:applicationId/confirm",verifyJwt,authorizeRole("organizer"),validateBody(organizerConfirmSchema),confirmAsOrganizer);






module.exports={organizerRoute};