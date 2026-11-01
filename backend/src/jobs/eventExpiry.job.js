const cron=require("node-cron");
const {Organizer}=require("../models/organizer.model.js")
const {SponsorApplication}=require("../models/sponsorApplication.model.js")
const {eventCutoff}=require("../utility/eventDates.js")
const {notify}=require("../utility/notifier.js")

// Both sides need to confirm before feedback opens, so tell them when that's possible
const askForConfirmation=async(events)=>{
    const deals=await SponsorApplication.find({
        event:{$in:events.map((event)=>event._id)},
        status:"accepted"
    }).select("event sponsor").lean();

    const eventById=new Map(events.map((event)=>[String(event._id),event]));

    await Promise.all(deals.flatMap((deal)=>{
        const event=eventById.get(String(deal.event));
        const title="Event finished. Please confirm the sponsorship";
        return [
            notify({user:event.organizer,type:"event",title,body:event.eventName,link:`/organizer/event/${event._id}`}),
            notify({user:deal.sponsor,type:"event",title,body:event.eventName,link:`/sponsor/event/${event._id}`})
        ];
    }));
}

const expireEvents=async()=>{
   try {
     const finished=await Organizer.find({date:{$lt:eventCutoff()},isExpired:false}).select("_id eventName organizer").lean();
     if(!finished.length) return;

     await Organizer.updateMany(
         {_id:{$in:finished.map((event)=>event._id)}},
         {$set:{
             status:"completed",
             isExpired:true
         }}
     );
     await askForConfirmation(finished);
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
