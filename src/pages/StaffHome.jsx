import StaffSidebar from '../layouts/StaffSidebar';

export default function StaffHome() {
  return (
    <div className="flex w-full h-full gap-6">
      <StaffSidebar />
      <main className="flex-1 bg-[#2a2a2a] rounded-xl flex flex-col items-center justify-center text-white relative overflow-hidden">
        <img src="/logo.png" alt="Vanilla Brew Logo" className="w-[450px] object-contain mb-10" />
        <h1 className="text-white text-5xl font-bold text-center leading-tight tracking-wider mb-8">
          SHOP<br />MANAGEMENT<br />SYSTEM
        </h1>
        <div className="flex gap-8">
          <img src="/coffee.png" alt="Coffee" className="w-10 h-10 object-contain" />
          <img src="/clipboard.png" alt="Clipboard" className="w-10 h-10 object-contain" />
          <img src="/monitor.png" alt="Monitor" className="w-10 h-10 object-contain" />
        </div>
      </main>
    </div>
  );
}