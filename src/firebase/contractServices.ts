
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    onSnapshot, 
    doc, 
    setDoc, 
    addDoc, 
    serverTimestamp, 
    type Timestamp,
    getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StoredContractData } from '@/types';

export const fetchContractsForUser = (
    userId: string, 
    callback: (contracts: StoredContractData[]) => void,
    onError: (error: Error) => void
) => {
    if (!userId) {
        onError(new Error("User ID is required to fetch contracts."));
        return () => {}; // Return an empty unsubscribe function
    }
    
    const q = query(collection(db, "contracts"), where("ownerId", "==", userId));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const contractsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as StoredContractData));
        callback(contractsData);
    }, (error) => {
        console.error("Error fetching contracts: ", error);
        onError(error);
    });

    return unsubscribe; // Return the unsubscribe function for cleanup
};


export const createDraftContract = async (userId: string, template: { id: string; title: string }): Promise<string | null> => {
    if (!userId || !template) {
        console.error("User ID and template are required to create a draft contract.");
        return null;
    }
    try {
        const docRef = await addDoc(collection(db, "contracts"), {
            ownerId: userId,
            templateId: template.id,
            title: template.title,
            status: "draft",
            formData: {},
            parties: [],
            createdAt: serverTimestamp() as Timestamp,
            lastUpdatedAt: serverTimestamp() as Timestamp,
        });
        return docRef.id;
    } catch (e) {
        console.error("Error creating draft contract: ", e);
        throw e; // Re-throw to be handled by caller
    }
};

export const updateContractData = async (contractId: string, dataToUpdate: Partial<StoredContractData>) => {
    if (!contractId) {
        console.error("Contract ID is required to update data.");
        return;
    }
    const contractRef = doc(db, "contracts", contractId);
    try {
        await setDoc(contractRef, { 
            ...dataToUpdate, 
            lastUpdatedAt: serverTimestamp() as Timestamp 
        }, { merge: true });
    } catch (error) {
        console.error(`Error updating contract ${contractId}:`, error);
        throw error;
    }
};

export const fetchContractById = async (contractId: string): Promise<StoredContractData | null> => {
    if (!contractId) return null;
    try {
        const contractRef = doc(db, "contracts", contractId);
        const docSnap = await getDoc(contractRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as StoredContractData;
        }
        console.warn(`Contract with id ${contractId} not found.`);
        return null;
    } catch (error) {
        console.error("Error fetching contract by ID:", error);
        throw error;
    }
};
