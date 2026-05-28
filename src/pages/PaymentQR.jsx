import { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import {
  doc, getDoc, setDoc, collection, addDoc, serverTimestamp
} from 'firebase/firestore';
import AdminSidebar from '../layouts/AdminSidebar';
import { Upload, QrCode } from 'lucide-react';

export default function PaymentQR() {
  const [currentQr, setCurrentQr] = useState('');
  const [qrPreview, setQrPreview] = useState('');
  const [qrFile, setQrFile] = useState(null);
  const [qrMsg, setQrMsg] = useState({ text: '', ok: false });
  const [qrSaving, setQrSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'paymentQR')).then(snap => {
      if (snap.exists()) setCurrentQr(snap.data().imageBase64 || '');
    });
  }, []);

  const logAudit = async (action, details) => {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDoc(doc(db, 'users', user.uid));
    const userData = snap.exists() ? snap.data() : {};
    await addDoc(collection(db, 'auditlog'), {
      action,
      performedBy: user.email,
      userId: user.uid,
      userName: userData.name || '',
      role: 'admin',
      details,
      timestamp: serverTimestamp(),
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setQrMsg({ text: 'Please select an image file.', ok: false });
      return;
    }
    setQrFile(file);
    setQrMsg({ text: '', ok: false });
    const reader = new FileReader();
    reader.onload = ev => setQrPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!qrFile) return setQrMsg({ text: 'Please select an image first.', ok: false });
    setQrSaving(true);
    try {
      const reader = new FileReader();
      reader.onload = async ev => {
        try {
          const base64 = ev.target.result;
          const user = auth.currentUser;
          await setDoc(doc(db, 'settings', 'paymentQR'), {
            imageBase64: base64,
            updatedAt: serverTimestamp(),
            updatedBy: user?.email || '',
          });
          await logAudit('Update Payment QR', 'Payment QR code image updated.');
          setCurrentQr(base64);
          setQrPreview('');
          setQrFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setQrMsg({ text: 'QR code saved successfully.', ok: true });
        } catch {
          setQrMsg({ text: 'Failed to save QR code.', ok: false });
        } finally {
          setQrSaving(false);
        }
      };
      reader.readAsDataURL(qrFile);
    } catch {
      setQrMsg({ text: 'Failed to read image file.', ok: false });
      setQrSaving(false);
    }
  };

  const handleCancel = () => {
    setQrPreview('');
    setQrFile(null);
    setQrMsg({ text: '', ok: false });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex w-full h-full">
      <AdminSidebar activePage="payment-qr" />

      <main className="flex-1 bg-white overflow-y-auto flex flex-col p-8 gap-5">
        <h1 className="text-3xl font-bold text-gray-900 shrink-0">Payment QR Code</h1>

        <div className="border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">E-Wallet QR Code</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              This QR code is displayed at the POS for customer e-wallet payments. Replace it here if the current one expires or becomes invalid.
            </p>
          </div>

          <div className="p-6 flex gap-10 items-start">
            {/* Current QR */}
            <div className="flex flex-col gap-2 shrink-0">
              <p className="text-sm font-medium text-gray-600">Current QR Code</p>
              <div className="w-52 h-52 border border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                {currentQr ? (
                  <img src={currentQr} alt="Payment QR" className="w-full h-full object-contain p-3" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <QrCode size={52} />
                    <span className="text-xs text-center">No QR code set</span>
                  </div>
                )}
              </div>
            </div>

            {/* Upload new */}
            <div className="flex flex-col gap-4 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600">Upload New QR Code</p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-teal-400 hover:bg-teal-50/40 transition-colors"
              >
                {qrPreview ? (
                  <img src={qrPreview} alt="Preview" className="h-36 object-contain rounded-lg" />
                ) : (
                  <>
                    <Upload size={32} className="text-gray-400" />
                    <p className="text-sm text-gray-500 font-medium">Click to select an image</p>
                    <p className="text-xs text-gray-400">PNG, JPG, or WEBP</p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {qrMsg.text && (
                <p className={`text-sm font-medium ${qrMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {qrMsg.text}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={!qrFile || qrSaving}
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {qrSaving ? 'Saving...' : 'Save QR Code'}
                </button>
                {qrPreview && (
                  <button
                    onClick={handleCancel}
                    className="px-5 py-2 border border-gray-300 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
