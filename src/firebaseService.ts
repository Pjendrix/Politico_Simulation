import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  limit, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

// Check connection on boot (Pillar 2: Connection test in background)
export async function testConnection() {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is currently offline; offline mode will persist caches.");
    }
  }
}

export const RATE_LIMIT_ERROR = "RATE_LIMITED";

/**
 * Checks and updates rate limit via standard setDoc under user-private subcollection pattern
 */
export async function checkAndUpdateRateLimit(userId: string, limitType: 'leaderboardSubmit' | 'dailySubmit'): Promise<void> {
  const path = `users/${userId}/rateLimits/${limitType}`;
  try {
    const rateLimitRef = doc(db, 'users', userId, 'rateLimits', limitType);
    await setDoc(rateLimitRef, { lastWriteAt: serverTimestamp() });
  } catch (error: any) {
    if (error && (error.code === 'permission-denied' || (error.message && error.message.includes('permission-denied')))) {
      throw new Error(RATE_LIMIT_ERROR);
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves current campaign slot to Firestore
 */
export async function saveCampaignToCloud(userId: string, saveObj: any): Promise<void> {
  const path = `users/${userId}/campaigns/active`;
  try {
    const docRef = doc(db, 'users', userId, 'campaigns', 'active');
    
    // Convert complex deeply-nested states to localized JSON strings to stay perfectly clean and dodge nesting limits.
    const payload = {
      userId,
      currentStage: saveObj.currentStage,
      gameVictory: saveObj.gameVictory || false,
      gameStateJson: JSON.stringify(saveObj.gameState),
      coalitionResultsJson: saveObj.coalitionResults ? JSON.stringify(saveObj.coalitionResults) : null,
      endingTyp: saveObj.endingTyp || null,
      encounteredEventIds: saveObj.encounteredEventIds || [],
      encounteredPodcastIds: saveObj.encounteredPodcastIds || [],
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Loads campaign slot from Firestore
 */
export async function loadCampaignFromCloud(userId: string): Promise<any | null> {
  const path = `users/${userId}/campaigns/active`;
  try {
    const docRef = doc(db, 'users', userId, 'campaigns', 'active');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    
    return {
      currentStage: data.currentStage,
      gameVictory: data.gameVictory,
      gameState: JSON.parse(data.gameStateJson),
      coalitionResults: data.coalitionResultsJson ? JSON.parse(data.coalitionResultsJson) : null,
      endingTyp: data.endingTyp,
      encounteredEventIds: data.encounteredEventIds || [],
      encounteredPodcastIds: data.encounteredPodcastIds || [],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Clears active campaign slot on Firestore
 */
export async function clearCampaignOnCloud(userId: string): Promise<void> {
  const path = `users/${userId}/campaigns/active`;
  try {
    const docRef = doc(db, 'users', userId, 'campaigns', 'active');
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Submits global score to the Firestore leaderboard
 */
export async function submitLeaderboardEntryToCloud(entry: any): Promise<void> {
  const path = `leaderboard/${entry.id}`;
  try {
    await checkAndUpdateRateLimit(entry.userId, 'leaderboardSubmit');
    
    const docRef = doc(db, 'leaderboard', entry.id);
    
    const payload = {
      userId: entry.userId,
      displayName: entry.displayName || 'Anonymní Politik',
      photoURL: entry.photoURL || '',
      partyZkratka: entry.partyZkratka,
      partyName: entry.partyName,
      partyBarva: entry.partyBarva,
      preference: entry.preference,
      initialPreference: entry.initialPreference,
      prefChange: entry.prefChange,
      seats: entry.seats,
      isGovernment: entry.isGovernment,
      endingTyp: entry.endingTyp || null,
      advisorName: entry.advisorName,
      date: entry.date,
      createdAt: serverTimestamp(),
    };
    
    await setDoc(docRef, payload);
  } catch (error) {
    if (error instanceof Error && error.message === RATE_LIMIT_ERROR) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches the top 10 submissions from global Firestore leaderboard ordered by preference growth (prefChange)
 */
export async function getGlobalLeaderboardFromCloud(): Promise<any[]> {
  const path = 'leaderboard';
  try {
    const leaderboardRef = collection(db, 'leaderboard');
    // Order by prefChange descending (high score is the biggest dynamic pref change) and limit to top 10
    const q = query(leaderboardRef, orderBy('prefChange', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);
    
    const list: any[] = [];
    querySnapshot.forEach((doc) => {
      const d = doc.data();
      list.push({
        id: doc.id,
        ...d,
        createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : null,
      });
    });
    
    // Extra guard sort logic to ensure absolute sorting correctness
    list.sort((a, b) => b.prefChange - a.prefChange);
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Submits daily challenge result to Firestore
 */
export async function submitDailyResultToCloud(date: string, entry: any): Promise<void> {
  const path = `dailyLeaderboard/${date}/entries/${entry.userId}`;
  try {
    await checkAndUpdateRateLimit(entry.userId, 'dailySubmit');
    
    const docRef = doc(db, 'dailyLeaderboard', date, 'entries', entry.userId);
    
    const payload = {
      userId: entry.userId,
      displayName: entry.displayName || 'Anonymní Kandidát',
      photoURL: entry.photoURL || '',
      partyZkratka: entry.partyZkratka,
      partyBarva: entry.partyBarva,
      poradceId: entry.poradceId,
      preference: entry.preference,
      initialPreference: entry.initialPreference,
      prefChange: entry.prefChange,
      seats: entry.seats,
      endingTyp: entry.endingTyp,
      date: entry.date,
      createdAt: serverTimestamp(),
    };
    
    await setDoc(docRef, payload);
  } catch (error) {
    if (error instanceof Error && error.message === RATE_LIMIT_ERROR) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches the top 20 submissions from daily Firestore leaderboard for a given date
 */
export async function getDailyLeaderboardFromCloud(date: string): Promise<any[]> {
  const path = `dailyLeaderboard/${date}/entries`;
  try {
    const entriesRef = collection(db, 'dailyLeaderboard', date, 'entries');
    const q = query(entriesRef, orderBy('prefChange', 'desc'), limit(20));
    const querySnapshot = await getDocs(q);
    
    const list: any[] = [];
    querySnapshot.forEach((doc) => {
      const d = doc.data();
      list.push({
        id: doc.id,
        ...d,
        createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : null,
      });
    });
    
    list.sort((a, b) => b.prefChange - a.prefChange);
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Fetches a single user's daily submission from Firestore
 */
export async function getUserDailyEntryFromCloud(date: string, userId: string): Promise<any | null> {
  const path = `dailyLeaderboard/${date}/entries/${userId}`;
  try {
    const docRef = doc(db, 'dailyLeaderboard', date, 'entries', userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return {
      id: docSnap.id,
      ...docSnap.data(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}
