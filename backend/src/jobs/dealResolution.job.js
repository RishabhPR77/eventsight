const cron=require("node-cron");
const {Organizer}=require("../models/organizer.model.js")
const {SponsorApplication}=require("../models/sponsorApplication.model.js")
const {eventCutoff}=require("../utility/eventDates.js")
const {notify}=require("../utility/notifier.js")

const DAY_MS=24*60*60*1000
const AUTO_CONFIRM_DAYS=7
const ABANDONED_DAYS=30

const notifyBoth=(deal,event,title,body)=>Promise.all([
    notify({user:event.organizer,type:"confirm",title,body,link:`/organizer/event/${event._id}`}),
    notify({user:deal.sponsor,type:"confirm",title,body,link:`/sponsor/event/${event._id}`})
])

// One side confirmed and the other went quiet: that silence can't hold up feedback forever
const autoConfirm=async()=>{
    const cutoff=new Date(Date.now()-AUTO_CONFIRM_DAYS*DAY_MS)
    const deals=await SponsorApplication.find({
        status:"accepted",
        isDeleted:false,
        $or:[
            {sponsorConfirmedAt:{$lte:cutoff},organizerConfirmedAt:null},
            {organizerConfirmedAt:{$lte:cutoff},sponsorConfirmedAt:null}
        ]
    }).populate("event","eventName organizer")

    for(const deal of deals){
        if(!deal.event) continue
        deal.sponsorConfirmedAt=deal.sponsorConfirmedAt||new Date()
        deal.organizerConfirmedAt=deal.organizerConfirmedAt||new Date()
        deal.autoConfirmed=true
        await deal.save()
        await notifyBoth(deal,deal.event,"Sponsorship confirmed automatically",`${deal.event.eventName}: feedback is now open`)
    }
}

// Nobody confirmed a month after the event, so the deal is closed instead of staying open
const closeAbandoned=async()=>{
    const events=await Organizer.find({date:{$lt:new Date(eventCutoff().getTime()-ABANDONED_DAYS*DAY_MS)}}).select("_id eventName organizer").lean()
    const eventById=new Map(events.map((event)=>[String(event._id),event]))

    const deals=await SponsorApplication.find({
        event:{$in:events.map((event)=>event._id)},
        status:"accepted",
        isDeleted:false,
        sponsorConfirmedAt:null,
        organizerConfirmedAt:null
    })

    for(const deal of deals){
        deal.status="cancelled"
        deal.cancelledBy="system"
        deal.cancelReason=`Neither side confirmed within ${ABANDONED_DAYS} days of the event`
        deal.cancelledAt=new Date()
        await deal.save()
        const event=eventById.get(String(deal.event))
        await notifyBoth(deal,event,"Sponsorship closed",`${event.eventName}: nobody confirmed it within ${ABANDONED_DAYS} days`)
    }
}

const resolveDeals=async()=>{
    try {
        await autoConfirm()
        await closeAbandoned()
    } catch (err) {
        console.error("error resolving deals",err)
    }
}

const startDealResolutionJob=()=>{
    resolveDeals();
    cron.schedule("0 * * * *",resolveDeals);
}

module.exports={startDealResolutionJob,resolveDeals}
