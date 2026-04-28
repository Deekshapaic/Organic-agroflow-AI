import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firestoreService = {
  // Generic collection listener
  subscribeToCollection: (collectionPath: string, callback: (data: any[]) => void) => {
    // If we're not yet authenticated, we'll wait for the auth state to settle
    // This helps avoid immediate "insufficient permissions" errors on first load
    const q = query(collection(db, collectionPath));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (error) => {
      // Small delay to check if it's just a transition issue
      if (!auth.currentUser) {
        console.warn(`Firestore subscription failed early (unauthenticated) for ${collectionPath}. This might be a transition state.`);
        return;
      }
      handleFirestoreError(error, OperationType.LIST, collectionPath);
    });
  },

  // Generic document listener
  subscribeToDoc: (collectionPath: string, docId: string, callback: (data: any) => void) => {
    return onSnapshot(doc(db, collectionPath, docId), (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `${collectionPath}/${docId}`);
    });
  },

  // Save/Update Document
  saveDoc: async (collectionPath: string, docId: string, data: any) => {
    try {
      await setDoc(doc(db, collectionPath, docId), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionPath}/${docId}`);
    }
  },

  // Add Document
  addDocument: async (collectionPath: string, data: any) => {
    try {
      const docRef = await addDoc(collection(db, collectionPath), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionPath);
    }
  },

  // Update Document
  updateDocument: async (collectionPath: string, docId: string, data: any) => {
    try {
      await setDoc(doc(db, collectionPath, docId), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionPath}/${docId}`);
    }
  },

  // Delete Document
  deleteDocument: async (collectionPath: string, docId: string) => {
    try {
      await deleteDoc(doc(db, collectionPath, docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionPath}/${docId}`);
    }
  },

  // Get specific document once
  getDocument: async (collectionPath: string, docId: string) => {
    try {
      const snapshot = await getDoc(doc(db, collectionPath, docId));
      return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${collectionPath}/${docId}`);
    }
  }
};
