import AdminSidebar from '../layouts/AdminSidebar';
import StaffSidebar from '../layouts/StaffSidebar';
import devAlcanzo    from '../assets/dev-alcanzo.jpg';
import devNueva      from '../assets/dev-nueva.jpg';
import devSarmiento  from '../assets/dev-sarmiento.jpg';


export default function About({ role }) {
  const Sidebar = role === 'admin' ? AdminSidebar : StaffSidebar;


  return (
    <div className="flex w-full h-full">
      <Sidebar activePage="about" />


      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6 shrink-0">About</h1>


        {/* Top row — two side-by-side containers */}
        <div className="flex gap-5 mb-6 shrink-0">
          <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm" style={{ minHeight: '280px' }}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">System Information</h2>
            </div>
            <div className="p-6 bg-gray-50 h-full text-gray-700 space-y-4 text-lg">
              <p><span className="font-bold text-gray-800">Application Name:</span> Vanilla Brew POS & SMS</p>
              <p><span className="font-bold text-gray-800">Current Version:</span> v1.0.0 (Release)</p>
              <p><span className="font-bold text-gray-800">Last Build Date:</span> June 2, 2026</p>
              <p><span className="font-bold text-gray-800">Database & Auth:</span> Firebase Firestore & Authentication</p>
              <p><span className="font-bold text-gray-800">Automated Messaging:</span> EmailJS Integration (OTP & Security Alerts)</p>
            </div>
          </div>


          <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm" style={{ minHeight: '280px' }}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">Company Information</h2>
            </div>
            <div className="p-6 bg-gray-50 h-full text-gray-700 space-y-4 text-lg">
              <p><span className="font-bold text-gray-800">Business Name:</span> VNL BREW CAFE</p>
              <p><span className="font-bold text-gray-800">Establishment Date:</span> July 2019</p>
              <p><span className="font-bold text-gray-800">Core Menu Offerings:</span> Milk tea, Hot/Cold Coffee, Fruit blends drinks, and Shawarma Meals</p>
            </div>
          </div>
        </div>


        {/* Bottom row — full-width container */}
        <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm min-h-0">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800">Contacts and Addresses</h2>
          </div>
          <div className="p-6 bg-gray-50 h-full text-gray-700 flex flex-col md:flex-row gap-8 text-lg">
            {/* Address Column */}
            <div className="flex-1 space-y-3">
              <h3 className="font-bold text-gray-900 text-xl border-b pb-2">Store Location</h3>
              <p className="font-medium text-gray-800">VNL Brew Cafe Principal Site</p>
              <p>110 1st Street, San Martin Subdivision,</p>
              <p>Angono, Rizal, Philippines</p>
            </div>


            {/* Developers Column */}
            <div className="flex-1 space-y-4">
              <h3 className="font-bold text-gray-900 text-xl border-b pb-2">Development Team</h3>
              <p className="text-base font-semibold text-gray-500 uppercase tracking-wider mb-1">3rd Year BSCS Students — TIP Quezon City</p>
             
              <div className="flex flex-col gap-5">
                {[
                  { photo: devAlcanzo,   name: 'Alcanzo, Renz A.',              email: 'qraalcanzo@tip.edu.ph'    },
                  { photo: devNueva,     name: 'Nueva, Carl Josef E.',           email: 'qcjenueva@tip.edu.ph'     },
                  { photo: devSarmiento, name: 'Sarmiento, Joaquín Reymond G.', email: 'qjrgsarmiento@tip.edu.ph' },
                ].map(({ photo, name, email }) => (
                  <div key={email} className="flex items-center gap-4">
                    <img
                      src={photo}
                      alt={name}
                      className="w-20 h-20 rounded-full object-cover shrink-0 border-2 border-gray-200 shadow-sm"
                    />
                    <div>
                      <p className="font-semibold text-gray-800 text-xl">{name}</p>
                      <p className="text-blue-600 underline text-lg">{email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>


            {/* Support Column */}
            <div className="flex-1 space-y-3">
              <h3 className="font-bold text-gray-900 text-xl border-b pb-2">Technical Support</h3>
              <p className="text-base leading-relaxed">
                For administrative account lockouts, data synchronization inquiries, 3-strike login system resets, or explicit technical bug reporting, reach out immediately via the institutional emails provided.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}



