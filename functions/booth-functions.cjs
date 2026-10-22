const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { randomUUID } = require("node:crypto");
const { Buffer } = require("node:buffer");
const { FIRESTORE_DATABASE_ID } = require("./config");
const ADMIN_KEY = defineSecret("OCTOBER_EVENT_ADMIN_KEY");
const { EVENT_ID, LIMIT, FEE, BoothValidationError, validMobile, validate } = require("./booth-domain.cjs");
const db = () => getFirestore(undefined, FIRESTORE_DATABASE_ID);
const origins = ["https://badebabakharadi.com","https://www.badebabakharadi.com","https://babakharadi.com","https://www.babakharadi.com","https://badebabakharadi.github.io","http://localhost:5500","http://localhost:5501","http://localhost:5173","http://127.0.0.1:5500","http://127.0.0.1:5501","http://127.0.0.1:5173"];
function fail(message, code="invalid-argument"){ throw new HttpsError(code,message); }
function assertAdmin(data){if(!data?.accessKey || data.accessKey!==ADMIN_KEY.value()) fail("Unauthorized.", "permission-denied");}
function wrap(fn){return async request=>{try{return await fn(request)}catch(e){if(e instanceof HttpsError) throw e;if(e instanceof BoothValidationError) throw new HttpsError("invalid-argument",e.message);console.error("Booth registration error",e);throw new HttpsError("internal","Booth service failed. Please try again.");}}}
exports.boothLookup = onCall({cors:true},wrap(async request=>{
 const mobile=String(request.data?.mobile||"").replace(/\D/g,"").slice(-10);
 if(!validMobile(mobile)) fail("Enter a valid 10-digit mobile number.");
 const snap=await db().collection("boothRegistrations").where("eventId","==",EVENT_ID).where("mobile","==",mobile).limit(1).get();
 if(snap.empty) return {exists:false,available:await availableCount()};
 const d=snap.docs[0].data();
 return {exists:true,registration:{id:snap.docs[0].id,name:d.name,stallName:d.stallName,businessType:d.businessType,mobile:d.mobile,society:d.society,city:d.city,state:d.state,status:d.status,receiptUrl:d.receiptUrl||"",createdAt:d.createdAt?.toDate?.().toISOString()||null}};
}));
exports.boothSave = onCall({cors:true,timeoutSeconds:60,memory:"512MiB"},wrap(async request=>{
 const input=request.data||{};
 const data=validate(input,true);
 const col=db().collection("boothRegistrations");
 const buffer=Buffer.from(input.receiptBase64,"base64");
 if(buffer.length>1400000) fail("Receipt image must be smaller than 1.4 MB.");
 const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[input.receiptMime];
 const id=randomUUID();
 const path="booth-receipts/"+EVENT_ID+"/"+id+"."+ext;
 const token=randomUUID();
 const file=getStorage().bucket().file(path);
 await file.save(buffer,{resumable:false,metadata:{contentType:input.receiptMime,metadata:{firebaseStorageDownloadTokens:token}}});
 const receiptUrl="https://firebasestorage.googleapis.com/v0/b/"+getStorage().bucket().name+"/o/"+encodeURIComponent(path)+"?alt=media&token="+token;
 let registrationId;
 try {
  await db().runTransaction(async tx=>{
   const eventRef=db().collection("boothEvents").doc(EVENT_ID);
   const eventSnap=await tx.get(eventRef);
   const existingQuery=col.where("eventId","==",EVENT_ID).where("mobile","==",data.mobile).limit(1);
   const existingSnap=await tx.get(existingQuery);
   const existingDoc=existingSnap.empty?null:existingSnap.docs[0];
   const old=existingDoc?existingDoc.data():null;
   if(old?.disabled) fail("This registration is disabled. Please contact the event administrator.","failed-precondition");
   let activeCount;
   if(eventSnap.exists) activeCount=Number(eventSnap.data().activeCount||0);
   else {
    const activeSnap=await tx.get(col.where("eventId","==",EVENT_ID).where("disabled","==",false));
    activeCount=activeSnap.size;
   }
   if(!old && activeCount>=LIMIT) fail("All 20 booth registrations have been received. Registration is closed.","resource-exhausted");
   registrationId=existingDoc?existingDoc.id:randomUUID();
   const now=FieldValue.serverTimestamp();
   tx.set(col.doc(registrationId),{...data,eventId:EVENT_ID,fee:FEE,receiptUrl,receiptPath:path,receiptMime:input.receiptMime,status:"pending",disabled:false,createdAt:old?.createdAt||now,updatedAt:now,paymentVerified:false,verifiedAt:null,verifiedBy:null},{merge:true});
   tx.set(eventRef,{eventId:EVENT_ID,limit:LIMIT,fee:FEE,activeCount:old?activeCount:activeCount+1,updatedAt:now},{merge:true});
  });
 } catch(error) {
  await file.delete().catch(()=>{});
  throw error;
 }
 return {saved:true,registrationId,status:"pending",message:"Registration submitted. Booth is not confirmed until payment is verified by the administrator."};
}));
async function availableCount(){
 const eventRef=db().collection("boothEvents").doc(EVENT_ID);
 const eventSnap=await eventRef.get();
 if(eventSnap.exists) return Math.max(0,LIMIT-Number(eventSnap.data().activeCount||0));
 const snap=await db().collection("boothRegistrations").where("eventId","==",EVENT_ID).where("disabled","==",false).get();
 return Math.max(0,LIMIT-snap.size);
}
exports.boothAdminVerify = onCall({cors:origins,secrets:[ADMIN_KEY]},wrap(async request=>{assertAdmin(request.data);return {verified:true};}));
exports.boothAdminList = onCall({cors:origins,secrets:[ADMIN_KEY]},wrap(async request=>{
 assertAdmin(request.data);
 const snap=await db().collection("boothRegistrations").where("eventId","==",EVENT_ID).get();
 const registrations=snap.docs.map(doc=>({id:doc.id,...doc.data()})).sort((a,b)=>(a.createdAt?.toMillis?.()||0)-(b.createdAt?.toMillis?.()||0)).map(d=>({...d,receiptBase64:undefined,createdAt:d.createdAt?.toDate?.().toISOString()||null,updatedAt:d.updatedAt?.toDate?.().toISOString()||null}));
 return {registrations,limit:LIMIT,fee:FEE,activeCount:registrations.filter(r=>!r.disabled).length,available:Math.max(0,LIMIT-registrations.filter(r=>!r.disabled).length)};
}));
exports.boothAdminUpdate = onCall({cors:origins,secrets:[ADMIN_KEY]},wrap(async request=>{
 const data=request.data||{};assertAdmin(data);
 if(!["verify","disable","enable"].includes(data.action)||!data.registrationId) fail("Invalid admin action.");
 const ref=db().collection("boothRegistrations").doc(data.registrationId);const snap=await ref.get();if(!snap.exists||snap.data().eventId!==EVENT_ID) fail("Registration not found.","not-found");
 await db().runTransaction(async tx=>{
  const current=await tx.get(ref);
  if(!current.exists||current.data().eventId!==EVENT_ID) fail("Registration not found.","not-found");
  const eventRef=db().collection("boothEvents").doc(EVENT_ID);
  const eventSnap=await tx.get(eventRef);
  const currentData=current.data();
  let activeCount;
  if(eventSnap.exists) activeCount=Number(eventSnap.data().activeCount||0);
  else {
   const activeSnap=await tx.get(db().collection("boothRegistrations").where("eventId","==",EVENT_ID).where("disabled","==",false));
   activeCount=activeSnap.size;
  }
  if(data.action==="disable"&&!currentData.disabled) activeCount=Math.max(0,activeCount-1);
  if(data.action==="enable"&&currentData.disabled){
   if(activeCount>=LIMIT) fail("No booth capacity is available to re-enable this registration.","resource-exhausted");
   activeCount++;
  }
  const update=data.action==="verify"?{paymentVerified:true,status:"verified",verifiedAt:FieldValue.serverTimestamp(),verifiedBy:"admin"}:data.action==="disable"?{disabled:true,status:"disabled",disabledAt:FieldValue.serverTimestamp()}:{disabled:false,status:currentData.paymentVerified?"verified":"pending"};
  tx.update(ref,{...update,updatedAt:FieldValue.serverTimestamp()});
  tx.set(eventRef,{eventId:EVENT_ID,limit:LIMIT,fee:FEE,activeCount,updatedAt:FieldValue.serverTimestamp()},{merge:true});
 });
 return {updated:true,action:data.action};
}));
