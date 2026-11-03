const {City}=require("../models/city.model.js")
const {EventCategory}=require("../models/eventCategory.model.js")
const {BrandType}=require("../models/sponserBrandTypes.model.js")

// The names the prediction model knows. Keep in step with src/lib/mlMappings.js
// in the frontend and with the lookups in ml-service/main.py.
const BRAND_TYPES=["Apparel","Automobile","Beauty/Personal Care","Beverage","Edtech","FMCG","Fintech","Local Retail","Real Estate","Telecom"]
const EVENT_CATEGORIES=["Business Conference","College Fest","Cricket Screening","Food Festival","Music Concert","Religious/Cultural","Sports Tournament","Standup Comedy","Tech Meetup"]
const CITIES=["Bhopal","Burhanpur","Chhindwara","Damoh","Dewas","Gwalior","Indore","Jabalpur","Katni","Khandwa","Khargone","Mandsaur","Morena","Narmadapuram","Neemuch","Ratlam","Rewa","Sagar","Satna","Sehore","Seoni","Shivpuri","Singrauli","Ujjain","Vidisha"]

// A new database starts with empty dropdowns, and nobody can sign up as a brand or
// publish an event until they're filled. Lists the admin has already touched are left alone.
const fillIfEmpty=async(Model,names)=>{
    if(await Model.estimatedDocumentCount()>0) return
    try {
        await Model.insertMany(names.map((name)=>({name})),{ordered:false})
        console.log(`Added ${names.length} default ${Model.collection.name}`)
    } catch (err) {
        // Two servers starting together can both try; the unique index keeps one copy
        if(err.code!==11000) throw err
    }
}

const ensureDefaultLists=()=>Promise.all([
    fillIfEmpty(BrandType,BRAND_TYPES),
    fillIfEmpty(EventCategory,EVENT_CATEGORIES),
    fillIfEmpty(City,CITIES)
])

module.exports={ensureDefaultLists}
