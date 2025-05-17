// import WhatsAppSession from "../Models/WhatsAppSession.js";
// import baileys from "baileys";
// const { proto, initAuthCreds, BufferJSON } = baileys;

// // Helper to ensure keys are in the correct format (Buffer or Uint8Array)
// const fixBufferKeys = (obj) => {
//   if (typeof obj !== "object" || obj === null) return obj;
//   if (Array.isArray(obj)) return obj.map(fixBufferKeys);

//   const newObj = {};
//   for (const key in obj) {
//     if (Object.prototype.hasOwnProperty.call(obj, key)) {
//       let value = obj[key];
//       if (
//         value &&
//         typeof value === "object" &&
//         value.type === "Buffer" &&
//         Array.isArray(value.data)
//       ) {
//         newObj[key] = Buffer.from(value.data);
//       } else {
//         newObj[key] = fixBufferKeys(value);
//       }
//     }
//   }
//   return newObj;
// };

// export async function getBaileysAuthStore(sessionId = "mySession") {
//   let creds;
//   let keys = {};

//   const sessionData = await WhatsAppSession.findOne({ sessionId });

//   if (sessionData) {
//     // Deserialize the credentials and keys
//     // The console.logs can be removed later if everything works
//     if (baileys.proto && baileys.proto.Message) {
//       // console.log("Inspecting baileys.proto.Message keys:", Object.keys(baileys.proto.Message));
//     } else {
//       // console.log("baileys.proto or baileys.proto.Message is undefined");
//       // if (baileys.proto) {
//       //   console.log("Inspecting baileys.proto keys:", Object.keys(baileys.proto));
//       // }
//     }

//     // Correctly revive the creds object from the stored JSON
//     creds = JSON.parse(
//       JSON.stringify(sessionData.creds),
//       baileys.BufferJSON.reviver
//     );

//     keys = fixBufferKeys(
//       JSON.parse(JSON.stringify(sessionData.keys), BufferJSON.reviver)
//     );
//   } else {
//     creds = initAuthCreds(); // Initialize with empty creds if no session found
//     keys = {}; // Initialize empty keys
//   }

//   const saveCreds = async () => {
//     try {
//       // Serialize the credentials and keys before saving
//       const serializedCreds = JSON.parse(
//         JSON.stringify(creds, BufferJSON.replacer)
//       );
//       const serializedKeys = JSON.parse(
//         JSON.stringify(keys, BufferJSON.replacer)
//       );

//       await WhatsAppSession.findOneAndUpdate(
//         { sessionId },
//         { creds: serializedCreds, keys: serializedKeys },
//         { upsert: true, new: true }
//       );
//     } catch (e) {
//       console.error("Failed to save creds/keys to DB", e);
//     }
//   };

//   return {
//     state: {
//       creds,
//       keys: {
//         get: (type, ids) => {
//           const data = {};
//           for (const id of ids) {
//             const value = keys[type]?.[id];
//             if (value) {
//               data[id] = value;
//             }
//           }
//           return data;
//         },
//         set: (newData) => {
//           for (const type in newData) {
//             keys[type] = keys[type] || {};
//             Object.assign(keys[type], newData[type]);
//           }
//           saveCreds();
//         },
//       },
//     },
//     saveCreds,
//   };
// }
