import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { dailyPrefix } from './idFormats';

const pad2 = (value) => String(value).padStart(2, '0');
const pad3 = (value) => String(value).padStart(3, '0');

export const formatTransactionDate = (date = new Date()) => {
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
};

export const generateTransactionKey = async (prefix) => {
  const prefixKey = dailyPrefix(prefix);

  const snapshot = await getDocs(collection(db, 'transactions'));
  const existingCount = snapshot.docs.filter((docItem) => docItem.id.startsWith(prefixKey)).length;
  return `${prefixKey}${pad3(existingCount + 1)}`;
};

export const saveTransaction = async (prefix, transactionData) => {
  const transactionId = await generateTransactionKey(prefix);
  const transactionRef = doc(db, 'transactions', transactionId);
  await setDoc(transactionRef, {
    transNo: transactionId,
    ...transactionData,
    createdAt: new Date(),
  });
  return transactionId;
};
