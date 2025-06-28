
'use server';

import { suggestLineItem } from '@/ai/flows/suggest-line-item';
import type { SuggestLineItemInput, SuggestLineItemOutput } from '@/ai/flows/suggest-line-item';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';


export async function suggestLineItemAction(
  input: SuggestLineItemInput
): Promise<SuggestLineItemOutput> {
  // Add any server-side validation or logic here
  return await suggestLineItem(input);
}


export async function getEmailForIdentifier(
  identifier: string
): Promise<{ email: string | null }> {
  // If the identifier looks like an email, assume it is one.
  if (identifier.includes('@')) {
    return { email: identifier };
  }

  // If not an email, assume it's a username and query Firestore.
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', identifier), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`No user found with username: ${identifier}`);
      return { email: null };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    return { email: userData.email || null };

  } catch (error) {
    console.error("Error fetching email for username:", error);
    return { email: null };
  }
}
