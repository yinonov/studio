
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
  deleteDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getClientDb, getClientFunctions } from "@/lib/firebase";
import type { StoredContractData, Template } from "@/types";

export const fetchContractsForUser = (
  userId: string,
  callback: (contracts: StoredContractData[]) => void,
  onError: (error: Error) => void
) => {
  if (!userId) {
    onError(new Error("User ID is required to fetch contracts."));
    return () => {}; // Return an empty unsubscribe function
  }
  const db = getClientDb();
  const q = query(collection(db, "contracts"), where("ownerId", "==", userId));

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const contractsData = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as StoredContractData)
      );
      callback(contractsData);
    },
    (error) => {
      console.error("Error fetching contracts: ", error);
      onError(error);
    }
  );

  return unsubscribe; // Return the unsubscribe function for cleanup
};

export const createDraftContract = async (
  userId: string,
  template: Pick<Template, "id" | "title">,
  initialData: Record<string, any>
): Promise<string | null> => {
  if (!userId || !template) {
    console.error(
      "User ID and template are required to create a draft contract."
    );
    return null;
  }
  try {
    const db = getClientDb();
    const parties = [
      {
        name: initialData.party1Name || "",
        email: initialData.party1Email || "",
      },
      {
        name: initialData.party2Name || "",
        email: initialData.party2Name ? initialData.party2Email || "" : "",
      },
    ].filter((p) => p.name && p.email); // Only include parties with both name and email

    const contractTitle =
      initialData.contractTitle || template.title || "חוזה ללא כותרת";

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

export const updateContractData = async (
  contractId: string,
  dataToUpdate: Partial<StoredContractData>
) => {
  if (!contractId) {
    console.error("Contract ID is required to update data.");
    return;
  }
  const db = getClientDb();
  const contractRef = doc(db, "contracts", contractId);
  try {
    await setDoc(
      contractRef,
      {
        ...dataToUpdate,
        lastUpdatedAt: serverTimestamp() as Timestamp,
      },
      { merge: true }
    );
  } catch (error) {
    console.error(`Error updating contract ${contractId}:`, error);
    throw error;
  }
};

export const fetchContractById = async (
  contractId: string
): Promise<StoredContractData | null> => {
  if (!contractId) return null;
  try {
    const db = getClientDb();
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
  const db = getClientDb();
  const contractRef = doc(db, "contracts", contractId);
  try {
    await deleteDoc(contractRef);
  } catch (error) {
    console.error(`Error deleting contract ${contractId}:`, error);
    throw error; // Re-throw to be handled by the caller
  }
};

export const prepareContractForSigning = async (
  contractId: string
): Promise<{ success: boolean; signUrl?: string }> => {
  if (!contractId) {
    console.error("Contract ID is required to prepare contract for signing.");
    throw new Error("Contract ID is required.");
  }
  try {
    const functions = getClientFunctions();
    // The callable function name must match the exported function name in functions/src/index.ts
    const callableFunction = httpsCallable(
      functions,
      "prepareContractForSigning"
    );
    const result = await callableFunction({ contractId }); // The data sent must be an object
    return result.data as { success: boolean; signUrl?: string };
  } catch (error) {
    console.error(
      `Error calling prepareContractForSigning for contract ${contractId}:`,
      error
    );
    throw error;
  }
};
