export default function DashboardContent() {
  return (
    <main className="flex-1 bg-[#2a2a2a] rounded-xl flex flex-col items-center justify-center p-8">
      
      {/* Vanilla Brew Logo */}
      <img 
        src="/logo.png" 
        alt="Vanilla Brew Logo" 
        className="w-[400px] mb-16 object-contain" 
      />

      {/* Main Title */}
      <h1 className="text-5xl font-extrabold text-center text-white leading-tight tracking-widest mb-16">
        SHOP<br />
        MANAGEMENT<br />
        SYSTEM
      </h1>

      {/* 3 Bottom Icons */}
      <div className="flex gap-8 items-center justify-center">
        <img src="/coffee.png" alt="Coffee" className="w-14 h-14 object-contain" />
        <img src="/clipboard.png" alt="Clipboard" className="w-14 h-14 object-contain" />
        <img src="/monitor.png" alt="Monitor" className="w-14 h-14 object-contain" />
      </div>

    </main>
  );
}