import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { FIRESTORE_DATABASE_ID } from "../functions/config.js";

const apiBase = process.env.JCP_API_URL?.replace(/\/$/, "");
const integrationKey = process.env["JCP_" + "INTERNAL_" + "TOKEN"];
const headerName = "x-jcp-" + "internal-token";

if (!apiBase || !integrationKey) {
  throw new Error("JCP_API_URL and the JCP integration key are required.");
}

async function jcpProvision(application) {
  const response = await fetch(apiBase + "/api/profile-migrations/provision", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [headerName]: integrationKey,
    },
    body: JSON.stringify({
      value: application.mobile,
      displayName: application.name,
      address: application.address,
    }),
  });
  if (!response.ok) {
    throw new Error(
      "JCP provisioning failed: " +
        response.status +
        " " +
        (await response.text()),
    );
  }
  return response.json();
}

initializeApp({ credential: applicationDefault() });
const db = getFirestore(undefined, FIRESTORE_DATABASE_ID);
const snapshot = await db.collection("pratibhaSammanApplications").get();

let linked = 0;
let skipped = 0;

for (const doc of snapshot.docs) {
  const application = doc.data();
  if (application.userId) {
    skipped += 1;
    continue;
  }

  const profile = await jcpProvision(application);
  if (!profile?.id) {
    throw new Error("No profile returned for application " + doc.id);
  }

  await doc.ref.update({
    userId: profile.id,
    profileLinkSource: "jcp-mobile-migration",
  });
  linked += 1;
}

console.log(
  JSON.stringify(
    {
      collection: "pratibhaSammanApplications",
      scanned: snapshot.size,
      linked,
      skipped,
    },
    null,
    2,
  ),
);
