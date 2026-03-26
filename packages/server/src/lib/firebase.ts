import admin from "firebase-admin";
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}
export default admin;

/** Verify a Firebase ID token and return the decoded claims.
 *  Throws if the token is expired, revoked, or malformed.
 *  Java analogy: like calling FirebaseAuth.getInstance().verifyIdToken(token)
 */
export async function verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
  return admin.auth().verifyIdToken(token);
}
