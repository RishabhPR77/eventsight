const cron=require("node-cron");
const {Organizer}=require("../models/organizer.model.js")
const {eventCutoff}=require("../utility/eventDates.js")

const expireEvents=async()=>{
   try {
     await Organizer.updateMany(
         {date:{$lt:eventCutoff()},isExpired:false},
         {$set:{
             status:"completed",
             isExpired:true
         }}
     );
   } catch (err) {
        console.error("error updating expired event",err);
   }
}

const startEventExpiryJob=()=>{
    // Free hosting sleeps when idle, so catch up on boot before the schedule resumes
    expireEvents();
    cron.schedule("* * * * *",expireEvents);
}

module.exports={startEventExpiryJob}
