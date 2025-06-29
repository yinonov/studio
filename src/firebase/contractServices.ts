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
    getDoc,
    deleteDoc
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import type { StoredContractData, Template } from '@/types';

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


export const createDraftContract = async (
    userId: string, 
    template: Pick<Template, 'id' | 'title'>, 
    initialData: Record<string, any>
): Promise<string | null> => {
    if (!userId || !template) {
        console.error("User ID and template are required to create a draft contract.");
        return null;
    }
    try {
        const parties = [
            { name: initialData.party1Name || '', email: initialData.party1Email || ''},
            { name: initialData.party2Name || '', email: initialData.party2Name ? (initialData.party2Email || '') : ''} 
        ].filter(p => p.name && p.email); // Only include parties with both name and email

        const contractTitle = initialData.contractTitle || template.title || 'חוזה ללא כותרת';

        const docRef = await addDoc(collection(db, "contracts"), {
            ownerId: userId,
            templateId: template.id,
            title: contractTitle,
            status: "draft",
            formData: initialData,
            parties: parties,
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

export const deleteContractById = async (contractId: string): Promise<void> => {
    if (!contractId) {
        console.error("Contract ID is required to delete a contract.");
        throw new Error("Contract ID is required.");
    }
    const contractRef = doc(db, "contracts", contractId);
    try {
        await deleteDoc(contractRef);
    } catch (error) {
        console.error(`Error deleting contract ${contractId}:`, error);
        throw error; // Re-throw to be handled by the caller
    }
};

export const generateContractPdf = async (contractId: string): Promise<{ success: boolean; pdfUrl?: string }> => {
    if (!contractId) {
        console.error("Contract ID is required to generate a PDF.");
        throw new Error("Contract ID is required.");
    }
    try {
        const functions = getFunctions();
        const generatePdfForSigning = httpsCallable(functions, 'generatePdfForSigning');
        const result = await generatePdfForSigning({ contractId });
        return result.data as { success: boolean; pdfUrl?: string };
    } catch (error) {
        console.error(`Error calling generatePdfForSigning for contract ${contractId}:`, error);
        throw error;
    }
};

export const initiateSigningSession = async (contractId: string): Promise<{ success: boolean; signUrl?: string }> => {
    if (!contractId) {
        console.error("Contract ID is required to initiate a signing session.");
        throw new Error("Contract ID is required.");
    }
    try {
        const functions = getFunctions();
        const initiateDropboxSignSession = httpsCallable(functions, 'initiateDropboxSignSession');
        const result = await initiateDropboxSignSession({ contractId });
        return result.data as { success: boolean; signUrl?: string };
    } catch (error) {
        console.error(`Error calling initiateDropboxSignSession for contract ${contractId}:`, error);
        throw error;
    }
};
